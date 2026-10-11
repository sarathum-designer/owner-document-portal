    // ── Language ──────────────────────────────────────────────────
    let loginLang = localStorage.getItem('rr_lang') || 'en';
    const LOGIN_STRINGS = {
      en: {
        logoSub:   'Owner Verification Portal · Nalanda',
        cardTitle: 'Owner Login',
        cardSub:   'Enter your House ID and password to access your verification portal.',
        labelHouseId:  'House ID',
        phHouseId:     'e.g. NAL-001',
        labelPassword: 'Password',
        phPassword:    'Enter your password',
        loginBtn:      'Login to Portal',
        loggingIn:     'Logging in…',
        adminLink:     'Raghav Realty staff?',
        adminLinkBtn:  'Admin Panel →',
        errFill:   'Please fill in all fields.',
        errLogin:  'Login failed. Check your credentials.',
      },
      mr: {
        logoSub:   'मालक पडताळणी पोर्टल · नालंदा',
        cardTitle: 'मालक लॉगिन',
        cardSub:   'तुमच्या पडताळणी पोर्टलमध्ये प्रवेश करण्यासाठी हाऊस आयडी आणि पासवर्ड प्रविष्ट करा.',
        labelHouseId:  'हाऊस आयडी',
        phHouseId:     'उदा. NAL-001',
        labelPassword: 'पासवर्ड',
        phPassword:    'तुमचा पासवर्ड प्रविष्ट करा',
        loginBtn:      'पोर्टलमध्ये प्रवेश करा',
        loggingIn:     'लॉगिन होत आहे…',
        adminLink:     'राघव रियल्टी कर्मचारी?',
        adminLinkBtn:  'प्रशासक पॅनेल →',
        errFill:  'कृपया सर्व फील्ड भरा.',
        errLogin: 'लॉगिन अयशस्वी. तुमचे क्रेडेंशियल तपासा.',
      }
    };
    function tl(key) { return (LOGIN_STRINGS[loginLang] || LOGIN_STRINGS.en)[key] ?? LOGIN_STRINGS.en[key] ?? key; }
    function toggleLoginLang() {
      loginLang = loginLang === 'en' ? 'mr' : 'en';
      localStorage.setItem('rr_lang', loginLang);
      applyLoginLang();
    }
    function applyLoginLang() {
      document.getElementById('loginLangBtn').textContent  = loginLang === 'en' ? 'मराठी' : 'English';
      document.getElementById('loginLogoSub').textContent  = tl('logoSub');
      document.getElementById('loginTitle').textContent    = tl('cardTitle');
      document.getElementById('loginSub').textContent      = tl('cardSub');
      document.getElementById('labelHouseId').textContent  = tl('labelHouseId');
      document.getElementById('houseId').placeholder       = tl('phHouseId');
      document.getElementById('labelPassword').textContent = tl('labelPassword');
      document.getElementById('password').placeholder      = tl('phPassword');
      const btn = document.getElementById('loginBtn');
      if (btn && !btn.disabled) btn.textContent = tl('loginBtn');
      document.getElementById('adminLinkDiv').innerHTML =
        `${tl('adminLink')} <a href="admin.html">${tl('adminLinkBtn')}</a>`;
    }
    applyLoginLang();

    if (localStorage.getItem('rr_token')) window.location.href = 'customer.html';

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn    = document.getElementById('loginBtn');
      const errBox = document.getElementById('errorBox');
      errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = tl('loggingIn');

      const houseId  = document.getElementById('houseId').value.trim().toUpperCase();
      const password = document.getElementById('password').value;

      if (!houseId || !password) {
        errBox.textContent = tl('errFill');
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = tl('loginBtn');
        return;
      }

      try {
        const res  = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ house_id: houseId, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || tl('errLogin'));
        localStorage.setItem('rr_token', data.token);
        localStorage.setItem('rr_owner', JSON.stringify(data.owner));
        window.location.href = 'customer.html';
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = tl('loginBtn');
      }
    });
  
