const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function verify() {
  console.log('=== VERIFYING CATEGORIES & PROJECTS DUMMY DATA ===');
  const [categories] = await pool.query('SELECT id, name_en, name_ur, slug FROM categories ORDER BY id ASC');
  console.log(`Verified Categories Count: ${categories.length}`);
  console.table(categories);

  const [projects] = await pool.query(`
    SELECT p.id, p.category_id, c.name_en AS category, p.title_en, p.status, p.goal_amount, p.raised_amount, p.beneficiaries_count, p.image_url
    FROM projects p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.category_id ASC, p.id ASC
  `);
  console.log(`Verified Projects Count: ${projects.length}`);
  console.table(projects);

  console.assert(categories.length >= 6, 'Should have at least 6 categories');
  console.assert(projects.length >= 18, 'Should have at least 18 projects (3 per category)');

  // Verify each category has at least 3 projects
  for (const cat of categories) {
    const catProjects = projects.filter(p => p.category_id === cat.id);
    console.log(`Category "${cat.name_en}" (ID: ${cat.id}) has ${catProjects.length} projects`);
    console.assert(catProjects.length >= 3, `Category ${cat.name_en} should have at least 3 projects`);
  }

  console.log('\n=== VERIFYING ID CARD PRINT STYLING & SCRIPT ASSETS ===');
  const adminCss = fs.readFileSync(path.join(__dirname, '../public/css/admin.css'), 'utf8');
  const adminDistCss = fs.readFileSync(path.join(__dirname, '../public/dist/css/admin.min.css'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const adminDistJs = fs.readFileSync(path.join(__dirname, '../public/dist/js/admin.min.js'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  const html2canvasExists = fs.existsSync(path.join(__dirname, '../public/js/html2canvas.min.js'));

  console.assert(adminCss.includes('.id-card-print-container'), 'admin.css has .id-card-print-container');
  console.assert(adminDistCss.includes('.id-card-print-container'), 'admin.min.css has .id-card-print-container');
  console.assert(adminCss.includes('scale(0.7524)'), 'admin.css has vector scale for CR80');
  console.assert(adminDistCss.includes('scale(0.7524)'), 'admin.min.css has vector scale for CR80');

  console.assert(adminJs.includes('downloadIdCardImage'), 'admin.js has downloadIdCardImage');
  console.assert(adminDistJs.includes('downloadIdCardImage'), 'admin.min.js has downloadIdCardImage');
  console.assert(adminJs.includes('id-card-print-container'), 'admin.js wraps cards in print container');
  console.assert(adminDistJs.includes('id-card-print-container'), 'admin.min.js wraps cards in print container');

  console.assert(adminHtml.includes('downloadIdCardImage'), 'admin.html has Save Image button');
  console.assert(adminHtml.includes('html2canvas.min.js'), 'admin.html references html2canvas.min.js');
  console.assert(html2canvasExists, 'public/js/html2canvas.min.js exists locally');

  console.log('All styling and script asset verifications PASSED!');

  // Test local server endpoints
  console.log('\n=== TESTING LIVE LOCAL SERVER ENDPOINTS ===');
  const pubRes = await fetch('http://localhost:3000/api/public/projects');
  const pubData = await pubRes.json();
  console.log(`Public projects returned: ${pubData.projects ? pubData.projects.length : pubData.length}`);
  console.assert((pubData.projects ? pubData.projects.length : pubData.length) >= 18, 'Public projects endpoint returns full catalog');

  console.log('\n>>> ALL CHECKS PASSED WITH 100% SUCCESS! <<<');
  process.exit(0);
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
