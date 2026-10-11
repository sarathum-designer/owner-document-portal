// Single entry point for the bill-claim and document-review routes.
// The Vercel Hobby plan allows at most 12 serverless functions per deployment,
// so these five handlers share one function. vercel.json rewrites the original
// URLs (e.g. /api/admin-bills) to /api/records?op=admin-bills, so the frontend
// keeps calling the same paths.
const handlers = {
  'admin-bills':  require('./_admin-bills'),
  'my-bills':     require('./_my-bills'),
  'approve-bill': require('./_approve-bill'),
  'confirm-bill': require('./_confirm-bill'),
  'verify-doc':   require('./_verify-doc'),
};

module.exports = (req, res) => {
  const handler = handlers[req.query.op];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};
