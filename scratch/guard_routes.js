const fs = require('fs');
let code = fs.readFileSync('./routes/admin.js', 'utf8');

const replacements = [
  // Projects
  ["router.get('/projects', async", "router.get('/projects', requirePermission('projects'), async"],
  ["router.get('/projects/:id', async", "router.get('/projects/:id', requirePermission('projects'), async"],
  ["router.post('/projects', async", "router.post('/projects', requirePermission('projects'), async"],
  ["router.put('/projects/:id', async", "router.put('/projects/:id', requirePermission('projects'), async"],
  ["router.put('/projects/:id/status', async", "router.put('/projects/:id/status', requirePermission('projects'), async"],
  ["router.delete('/projects/:id', async", "router.delete('/projects/:id', requirePermission('projects'), async"],
  // Articles
  ["router.get('/articles', async", "router.get('/articles', requirePermission('articles'), async"],
  ["router.post('/articles', async", "router.post('/articles', requirePermission('articles'), async"],
  ["router.put('/articles/:id', async", "router.put('/articles/:id', requirePermission('articles'), async"],
  ["router.delete('/articles/:id', async", "router.delete('/articles/:id', requirePermission('articles'), async"],
  ["router.get('/articles/:id', async", "router.get('/articles/:id', requirePermission('articles'), async"],
  // Settings & impact stats
  ["router.get('/impact-stats', async", "router.get('/impact-stats', requirePermission('settings'), async"],
  ["router.put('/impact-stats/:id', async", "router.put('/impact-stats/:id', requirePermission('settings'), async"],
  ["router.get('/settings', async", "router.get('/settings', requirePermission('settings'), async"],
  ["router.post('/settings', async", "router.post('/settings', requirePermission('settings'), async"],
  // Submissions
  ["router.get('/contact-submissions', async", "router.get('/contact-submissions', requirePermission('submissions'), async"],
  ["router.put('/contact-submissions/:id/status', async", "router.put('/contact-submissions/:id/status', requirePermission('submissions'), async"],
  ["router.get('/contact-submissions/:id', async", "router.get('/contact-submissions/:id', requirePermission('submissions'), async"],
  // Applications
  ["router.get('/assistance-applications', async", "router.get('/assistance-applications', requirePermission('applications'), async"],
  ["router.put('/assistance-applications/:id', async", "router.put('/assistance-applications/:id', requirePermission('applications'), async"],
  ["router.put('/assistance-applications/:id/status', async", "router.put('/assistance-applications/:id/status', requirePermission('applications'), async"],
  ["router.post('/assistance-applications', async", "router.post('/assistance-applications', requirePermission('applications'), async"],
  ["router.get('/assistance-applications/:id', async", "router.get('/assistance-applications/:id', requirePermission('applications'), async"],
  // Donations
  ["router.get('/donations', async", "router.get('/donations', requirePermission('donations'), async"],
  ["router.put('/donations/:id', async", "router.put('/donations/:id', requirePermission('donations'), async"],
  ["router.put('/donations/:id/status', async", "router.put('/donations/:id/status', requirePermission('donations'), async"],
  ["router.post('/donations', async", "router.post('/donations', requirePermission('donations'), async"],
  ["router.delete('/donations/:id', async", "router.delete('/donations/:id', requirePermission('donations'), async"],
  ["router.get('/donations/:id', async", "router.get('/donations/:id', requirePermission('donations'), async"],
  // Branding
  ["router.get('/branding-assets', async", "router.get('/branding-assets', requirePermission('settings'), async"],
  ["router.post('/branding-assets/names', async", "router.post('/branding-assets/names', requirePermission('settings'), async"],
  ["router.post('/branding-assets/logo', upload.single('logo')", "router.post('/branding-assets/logo', requirePermission('settings'), upload.single('logo')"],
  ["router.post('/branding-assets/flag', upload.single('flag')", "router.post('/branding-assets/flag', requirePermission('settings'), upload.single('flag')"],
  ["router.get('/branding-assets/stamps', async", "router.get('/branding-assets/stamps', requirePermission('settings'), async"],
  ["router.post('/branding-assets/stamps', upload.single('stamp')", "router.post('/branding-assets/stamps', requirePermission('settings'), upload.single('stamp')"],
  ["router.put('/branding-assets/stamps/:id/default', async", "router.put('/branding-assets/stamps/:id/default', requirePermission('settings'), async"],
  ["router.delete('/branding-assets/stamps/:id', async", "router.delete('/branding-assets/stamps/:id', requirePermission('settings'), async"],
  // Accounts
  ["router.get('/accounts/summary', async", "router.get('/accounts/summary', requirePermission('accounts'), async"],
  ["router.get('/accounts/transactions', async", "router.get('/accounts/transactions', requirePermission('accounts'), async"],
  ["router.post('/accounts/donations', async", "router.post('/accounts/donations', requirePermission('accounts'), async"],
  ["router.put('/accounts/donations/:id/confirm', async", "router.put('/accounts/donations/:id/confirm', requirePermission('accounts'), async"],
  ["router.put('/accounts/donations/:id/refund', async", "router.put('/accounts/donations/:id/refund', requirePermission('accounts'), async"]
];

let matched = 0;
for (const [target, repl] of replacements) {
  if (code.includes(target)) {
    code = code.replace(target, repl);
    matched++;
  } else {
    console.log('NOT MATCHED:', target);
  }
}
console.log('Matched and replaced:', matched, 'of', replacements.length);
fs.writeFileSync('./routes/admin.js', code, 'utf8');
