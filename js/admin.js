  // ── Auth ─────────────────────────────────────────────────────
  const ADMIN_TOKEN_KEY = 'rr_admin_token';
  let adminToken  = localStorage.getItem(ADMIN_TOKEN_KEY);
  let allOwners   = [];
  let activeOwner = null;

  if (adminToken) showDashboard();

  document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Logging in…';

    try {
      const res  = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: document.getElementById('adminUser').value.trim().toLowerCase(),
            password: document.getElementById('adminPass').value
          })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Wrong password.');
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem('rr_admin_name', data.name || 'Admin');
      adminToken = data.token;
      showDashboard();
    } catch (e) {
      err.textContent = e.message;
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Login';
    }
  });

  function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display   = 'block';
    // Show admin name in header
    const adminName = localStorage.getItem('rr_admin_name') || 'Admin';
    document.title = `${adminName} — Admin Panel`;
    const subEl = document.querySelector('#dashboard header .logo-sub');
    if (subEl) subEl.textContent = `Logged in as ${adminName}`;
    loadOwners();
  }

  function adminLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem('rr_admin_name');
    location.reload();
  }

  // ── Load owners ──────────────────────────────────────────────
  async function loadOwners() {
    document.getElementById('ownersBody').innerHTML = '<tr class="empty-row"><td colspan="6">Loading…</td></tr>';
    try {
      const res  = await fetch('/api/owners', { headers: { Authorization: `Bearer ${adminToken}` } });
      if (res.status === 401) { adminLogout(); return; }
      const data = await res.json();
      allOwners  = data.owners || [];
      renderStats();
      renderTable(allOwners);
    } catch {
      document.getElementById('ownersBody').innerHTML = '<tr class="empty-row"><td colspan="6">Failed to load. Refresh to retry.</td></tr>';
    }
  }

  function renderStats() {
    const total    = allOwners.length;
    const verified = allOwners.filter(o => o.verified === true).length;
    const pending  = allOwners.filter(o => o.verified !== true).length;
    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statVerified').textContent = verified;
    document.getElementById('statPending').textContent  = pending;
  }

  const DOC_LABELS = { govt_id: 'Govt ID', ownership_doc: 'Ownership Doc', tax_bill: 'Tax Bill', utility_bill: 'Utility Bill' };

  function renderTable(owners) {
    const tbody = document.getElementById('ownersBody');
    if (!owners.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No owners found.</td></tr>';
      return;
    }
    tbody.innerHTML = owners.map(o => {
      const docCount  = (o.documents || []).length;
      const badgeCls  = o.verified === true ? 'badge-verified' : 'badge-pending';
      const badgeTxt  = o.verified === true ? '✓ Verified' : '⏳ Pending';
      return `
        <tr>
          <td><strong>${o.house_id}</strong></td>
          <td>${o.name}</td>
          <td>${o.phone || '—'}</td>
          <td><span class="doc-count">${docCount} / 4 uploaded</span></td>
          <td><span class="badge ${badgeCls}">${badgeTxt}</span></td>
          <td><div class="actions">
            <button class="btn btn-sm btn-outline" onclick="openOwner('${o.id}')">View</button>
          </div></td>
        </tr>`;
    }).join('');
  }

  function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!q) { renderTable(allOwners); return; }
    renderTable(allOwners.filter(o =>
      o.name.toLowerCase().includes(q) || o.house_id.toLowerCase().includes(q)
    ));
  }

  // ── Owner modal ──────────────────────────────────────────────
  function openOwner(id) {
    activeOwner = allOwners.find(o => o.id === id);
    if (!activeOwner) return;

    document.getElementById('modalTitle').textContent = `${activeOwner.name} — ${activeOwner.house_id}`;
    document.getElementById('verifyNotes').value = '';

    const grid = document.getElementById('ownerInfoGrid');
    grid.innerHTML = [
      ['House ID',  activeOwner.house_id],
      ['Name',      activeOwner.name],
      ['Phone',     activeOwner.phone || '—'],
      ['Status',    activeOwner.verified ? '✓ Verified' : 'Pending Review'],
      ['Joined',    new Date(activeOwner.created_at).toLocaleDateString('en-IN')],
      ['Verified On', activeOwner.verified_at ? new Date(activeOwner.verified_at).toLocaleDateString('en-IN') : '—']
    ].map(([l, v]) => `<div class="info-field"><label>${l}</label><span>${v}</span></div>`).join('');

    renderModalDocs();
    document.getElementById('ownerModal').style.display = 'flex';
  }

  function closeModal(e) {
    if (e.target === document.getElementById('ownerModal')) closeModalDirect();
  }
  function closeModalDirect() {
    document.getElementById('ownerModal').style.display = 'none';
    activeOwner = null;
  }

  // ── Verify / Reject ──────────────────────────────────────────
  async function verifyOwner(action) {
    if (!activeOwner) return;
    const notes  = document.getElementById('verifyNotes').value.trim();
    const btnA   = document.getElementById('btnApprove');
    const btnR   = document.getElementById('btnReject');
    btnA.disabled = btnR.disabled = true;

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ owner_id: activeOwner.id, action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      closeModalDirect();
      await loadOwners();
    } catch (e) {
      alert(e.message);
      btnA.disabled = btnR.disabled = false;
    }
  }

  // ── Download individual document ────────────────────────────
  async function downloadDoc(docId, btn) {
    if (!activeOwner) return;
    const doc = (activeOwner.documents || []).find(d => d.id === docId);
    if (!doc || !doc.file_url) return;

    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';

    try {
      const res = await fetch(doc.file_url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const ext      = (doc.file_name.split('.').pop() || 'pdf').toLowerCase();
      const safeName = `${activeOwner.house_id}_${activeOwner.name.replace(/\s+/g, '_')}.${ext}`;
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }

  // ── Render document list inside owner modal ──────────────────
  function renderModalDocs() {
    const docs     = activeOwner ? (activeOwner.documents || []) : [];
    const docsList = document.getElementById('docsList');
    if (!docs.length) {
      docsList.innerHTML = '<p style="color:#999;font-size:13px;">No documents uploaded yet.</p>';
      return;
    }
    docsList.innerHTML = docs.map(d => `
      <div class="doc-row" id="docrow-${d.id}">
        <div class="doc-row-left">
          <div class="doc-row-name">${DOC_LABELS[d.doc_type] || d.doc_type}</div>
          <div class="doc-row-file">📎 ${d.file_name}${d.review_notes ? `<span style="color:var(--red);"> — ${d.review_notes}</span>` : ''}</div>
        </div>
        <div class="doc-row-right" style="flex-wrap:wrap;gap:5px;">
          <span class="badge ${d.status === 'approved' ? 'badge-verified' : d.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}">
            ${d.status}
          </span>
          ${d.file_url ? `<a href="${d.file_url}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none;">View</a>` : ''}
          ${d.file_url ? `<button class="btn btn-sm btn-blue" onclick="downloadDoc('${d.id}', this)">⬇ Download</button>` : ''}
          <button class="btn btn-sm btn-approve" style="padding:5px 10px;" title="Approve this document" onclick="verifyDoc('${d.id}', 'approved')">✓</button>
          <button class="btn btn-sm btn-reject-doc" style="padding:5px 10px;" title="Reject this document" onclick="verifyDoc('${d.id}', 'rejected')">✗</button>
        </div>
      </div>`).join('');
  }

  // ── Verify individual document ────────────────────────────────
  async function verifyDoc(docId, action) {
    if (!activeOwner) return;
    const doc   = (activeOwner.documents || []).find(d => d.id === docId);
    if (!doc) return;
    const notes = document.getElementById('verifyNotes').value.trim();

    try {
      const res  = await fetch('/api/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ doc_id: docId, action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');

      // Update local state and re-render docs list immediately
      doc.status = action;
      if (notes) doc.review_notes = notes;
      renderModalDocs();

      // Refresh the owners table in background
      loadOwners();
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Tab switching ────────────────────────────────────────────
  function switchTab(tab) {
    document.getElementById('ownersSection').style.display = tab === 'owners' ? '' : 'none';
    document.getElementById('billsSection').style.display  = tab === 'bills'  ? '' : 'none';
    document.getElementById('tabOwners').classList.toggle('active', tab === 'owners');
    document.getElementById('tabBills').classList.toggle('active',  tab === 'bills');
    if (tab === 'bills') loadBills();
  }

  // ── Bills & Claims ───────────────────────────────────────────
  let allBills = [];

  async function loadBills() {
    document.getElementById('billsBody').innerHTML = '<tr class="empty-row"><td colspan="8">Loading…</td></tr>';
    try {
      const res  = await fetch('/api/admin-bills', { headers: { Authorization: `Bearer ${adminToken}` } });
      if (res.status === 401) { adminLogout(); return; }
      const data = await res.json();
      allBills   = data.bills || [];

      const pending = allBills.filter(b => b.status === 'pending').length;
      document.getElementById('statBillsPending').textContent = pending;
      const badge = document.getElementById('pendingBillsBadge');
      badge.textContent    = pending;
      badge.style.display  = pending > 0 ? 'inline-block' : 'none';

      renderBillsTable(allBills);
    } catch {
      document.getElementById('billsBody').innerHTML = '<tr class="empty-row"><td colspan="8">Failed to load. Refresh to retry.</td></tr>';
    }
  }

  function filterBills() {
    const q = document.getElementById('billSearchInput').value.toLowerCase().trim();
    if (!q) { renderBillsTable(allBills); return; }
    renderBillsTable(allBills.filter(b =>
      (b.owners?.name || '').toLowerCase().includes(q) ||
      (b.owners?.house_id || '').toLowerCase().includes(q) ||
      b.bill_type.toLowerCase().includes(q)
    ));
  }

  const BILL_TYPE_LABELS = { electricity: '⚡ Electricity', gas: '🔥 Gas', water: '💧 Water', other: '📋 Other' };

  function renderBillsTable(bills) {
    const tbody = document.getElementById('billsBody');
    if (!bills.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No bill claims found.</td></tr>';
      return;
    }
    tbody.innerHTML = bills.map(b => {
      const owner      = b.owners || {};
      const badgeCls   = b.status === 'approved' ? 'badge-verified' : b.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
      const badgeTxt   = b.status === 'approved' ? '✓ Approved' : b.status === 'rejected' ? '✗ Rejected' : '⏳ Pending';
      let monthLabel   = b.bill_month || '—';
      try { monthLabel = new Date(b.bill_month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); } catch (_) {}
      const amount     = b.claim_amount != null ? `₹${Number(b.claim_amount).toLocaleString('en-IN')}` : '—';
      const submitted  = new Date(b.created_at).toLocaleDateString('en-IN');
      return `
        <tr>
          <td>${owner.name || '—'}</td>
          <td><strong>${owner.house_id || '—'}</strong></td>
          <td>${BILL_TYPE_LABELS[b.bill_type] || b.bill_type}</td>
          <td>${monthLabel}</td>
          <td>${amount}</td>
          <td>
            <span class="badge ${badgeCls}">${badgeTxt}</span>
            ${b.notes ? `<div style="font-size:11px;color:#666;margin-top:2px;">${b.notes}</div>` : ''}
          </td>
          <td style="font-size:12px;color:var(--text-muted);">${submitted}</td>
          <td>
            <div class="actions" style="flex-wrap:wrap;gap:4px;">
              ${b.file_url ? `<a href="${b.file_url}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none;">View</a>` : ''}
              ${b.file_url ? `<button class="btn btn-sm btn-blue" onclick="downloadBill('${b.id}', this)">⬇</button>` : ''}
              ${b.status !== 'approved'  ? `<button class="btn btn-sm btn-approve"    onclick="approveBill('${b.id}', 'approved')">✓</button>` : ''}
              ${b.status !== 'rejected'  ? `<button class="btn btn-sm btn-reject-doc" onclick="approveBill('${b.id}', 'rejected')">✗</button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  async function approveBill(billId, action) {
    let notes = '';
    if (action === 'rejected') {
      notes = prompt('Rejection notes (optional, shown to owner):') || '';
    }
    try {
      const res  = await fetch('/api/approve-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ bill_id: billId, action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      await loadBills();
    } catch (err) {
      alert(err.message);
    }
  }

  async function downloadBill(billId, btn) {
    const bill = allBills.find(b => b.id === billId);
    if (!bill?.file_url) return;
    const owner    = bill.owners || {};
    const origText = btn.textContent;
    btn.disabled   = true;
    btn.textContent = '…';
    try {
      const res  = await fetch(bill.file_url);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const ext  = (bill.file_name.split('.').pop() || 'pdf').toLowerCase();
      let monthSlug = bill.bill_month || 'unknown';
      const name = `${owner.house_id || 'OWNER'}_${(owner.name || 'Name').replace(/\s+/g, '_')}_${bill.bill_type}_${monthSlug}.${ext}`;
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      btn.disabled    = false;
      btn.textContent = origText;
    }
  }

  // ── Export CSV ───────────────────────────────────────────────
  function exportCSV() {
    if (!allOwners.length) return;
    const rows = [['House ID', 'Name', 'Phone', 'Documents Uploaded', 'Verified', 'Verified On']];
    allOwners.forEach(o => rows.push([
      o.house_id, o.name, o.phone || '',
      (o.documents || []).length,
      o.verified ? 'Yes' : 'No',
      o.verified_at ? new Date(o.verified_at).toLocaleDateString('en-IN') : ''
    ]));
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'raghav-realty-owners.csv'; a.click();
    URL.revokeObjectURL(url);
  }
