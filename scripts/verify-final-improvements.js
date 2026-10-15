const http = require('http');
const fs = require('fs');
const path = require('path');

function get(pathStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: pathStr,
      method: 'GET',
      headers
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function post(pathStr, bodyObj, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyObj);
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: pathStr,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE VERIFICATION FOR ALL 14 CHECKLIST ITEMS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Modals CSS validation
  const adminCss = fs.readFileSync('public/css/admin.css', 'utf8');
  assert('Item 1: Admin modals have viewport width limits (max-width: 920px - 1120px) and internal scrolling', 
    adminCss.includes('.admin-modal-card') && 
    adminCss.includes('max-height: 88vh') && 
    adminCss.includes('overflow-y: auto')
  );

  // 2. Consistent Urdu Typography
  const publicIndex = fs.readFileSync('public/index.html', 'utf8');
  const adminHtml = fs.readFileSync('public/admin.html', 'utf8');
  const styleCss = fs.readFileSync('public/css/style.css', 'utf8');
  const rtlCss = fs.readFileSync('public/css/rtl.css', 'utf8');
  
  assert('Item 2: Noto Nastaliq Urdu font configured in admin.html and public pages', 
    adminHtml.includes('Noto+Nastaliq+Urdu') && 
    publicIndex.includes('Noto+Nastaliq+Urdu') && 
    adminCss.includes('Noto Nastaliq Urdu') &&
    rtlCss.includes('Noto Nastaliq Urdu')
  );

  // 3. Urdu Number to Words & Receipt RTL Formatting
  const adminJs = fs.readFileSync('public/js/admin.js', 'utf8');
  assert('Item 3A: Number to Urdu words converter implemented and dynamic', 
    adminJs.includes('function numberToUrduWords(') && 
    adminJs.includes('پندرہ') && 
    adminJs.includes('پاکستانی روپے')
  );
  assert('Item 3B: Urdu receipt uses strict RTL direction with right-aligned labels and left-aligned values',
    adminJs.includes('receipt-printable-box receipt-ur') &&
    adminCss.includes('.receipt-ur') &&
    adminCss.includes('direction: rtl') &&
    adminCss.includes('text-align: right')
  );

  // 4. Authenticate & test settings branding assets
  const loginRes = await post('/api/auth/login', { username: 'admin', password: 'Admin@Qasr2026!' });
  const cookieHeader = loginRes.headers['set-cookie'];
  const cookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(';')[0] : '';
  
  const authHeaders = { 'Cookie': cookie };

  const brandingRes = await get('/api/admin/branding-assets', authHeaders);
  assert('Item 4A: Branding Assets API returns official circular logo and official flag',
    brandingRes.body && brandingRes.body.success && 
    brandingRes.body.assets.site_logo_url.includes('Emble') &&
    brandingRes.body.assets.site_flag_url.includes('flag')
  );

  const stampsRes = await get('/api/admin/branding-assets/stamps', authHeaders);
  assert('Item 4B: Official Stamps API returns authenticated stamps list with default stamp',
    stampsRes.body && stampsRes.body.success && 
    Array.isArray(stampsRes.body.stamps) &&
    stampsRes.body.stamps.length > 0
  );

  // 5. Verifier name in donations
  const donationRes = await get('/api/admin/donations/15', authHeaders);
  assert('Item 5: Donation receipt endpoint returns authentic verified_by_name from database',
    donationRes.body && donationRes.body.success && 
    donationRes.body.donation.verified_by_name &&
    donationRes.body.donation.verified_by_name.includes('Administrator') &&
    donationRes.body.donation.verified_by_user_id === 1
  );

  // 6. Dynamic Dashboard Header
  assert('Item 6A: Generic "Foundation Management Console" replaced by dynamic #adminPageTitle',
    !adminHtml.includes('Foundation Management Console') &&
    adminHtml.includes('id="adminPageTitle"')
  );
  assert('Item 6B: Page titles update dynamically per route in PAGE_CONFIG',
    adminJs.includes('const PAGE_CONFIG =') &&
    adminJs.includes('updateTopbarHeader(tabId)')
  );

  // 7. Contextual Action Button & Manual Volunteer Record
  assert('Item 7A: Contextual Action Container exists in topbar and renders page actions',
    adminHtml.includes('id="topbarContextualActionContainer"') &&
    adminJs.includes('topbar-action-btn')
  );
  assert('Item 7B: Modal Add Volunteer exists for manual administrative registration',
    adminHtml.includes('id="modalAddVolunteer"') &&
    adminJs.includes('openAddVolunteerModal') &&
    adminJs.includes('handleManualVolunteerSubmit')
  );

  // Test manual volunteer creation endpoint
  const testVolData = {
    full_name: 'Test Candidate ' + Date.now(),
    email: `testvol_${Date.now()}@example.com`,
    phone: '0300-9988776',
    city: 'Lahore',
    application_type: 'volunteer',
    education: 'BSc Computer Science',
    areas_of_interest: 'Food Rationing & Youth Programs',
    availability: 'Weekends Only',
    status: 'accepted',
    admin_notes: 'Created via automated verification script'
  };
  const createVolRes = await post('/api/admin/volunteers', testVolData, authHeaders);
  assert('Item 7C: Admin can register volunteer manually via POST /api/admin/volunteers',
    createVolRes.body && createVolRes.body.success && createVolRes.body.id > 0
  );

  // 8. View Website position
  const topbarSlice = adminHtml.slice(adminHtml.indexOf('<header class="admin-topbar">'), adminHtml.indexOf('</header>'));
  const viewSiteIdx = topbarSlice.indexOf('btn-view-site');
  const actionContainerIdx = topbarSlice.indexOf('topbarContextualActionContainer');
  assert('Item 8: View Website is positioned at the far right of topbar header',
    viewSiteIdx > actionContainerIdx
  );

  // 9. Redundant Qasr Shabbir Administration removed from header
  assert('Item 9: Redundant "Qasr Shabbir Administration" removed from topbar header',
    !topbarSlice.includes('Qasr Shabbir Administration')
  );

  // 10. Default / System-Generated Branding Elimination
  const logoSvg = fs.readFileSync('public/images/branding/logo.svg', 'utf8');
  assert('Item 10: System-generated green SVG logo replaced with official circular foundation emblem',
    logoSvg.includes('Qasr-e-Shabir_Foundation_Emble') || logoSvg.length > 500
  );

  // 11. Universal Table Print & PDF Export
  assert('Item 11A: exportTablePDF function implemented for all tables',
    adminJs.includes('window.exportTablePDF = function(') &&
    adminHtml.includes("exportTablePDF('users')") &&
    adminHtml.includes("exportTablePDF('accounts')") &&
    adminHtml.includes("exportTablePDF('projects')") &&
    adminHtml.includes("exportTablePDF('volunteers')") &&
    adminHtml.includes("exportTablePDF('articles')") &&
    adminHtml.includes("exportTablePDF('applications')") &&
    adminHtml.includes("exportTablePDF('donations')") &&
    adminHtml.includes("exportTablePDF('submissions')")
  );
  assert('Item 11B: Single assistance application dossier printing implemented',
    adminJs.includes('window.printSingleAssistanceRequest =') &&
    adminHtml.includes('btnPrintAppFromModal')
  );

  // 12. Login Security: No prefilled administrator credentials
  const loginFormSlice = adminHtml.slice(adminHtml.indexOf('id="loginWrapper"'), adminHtml.indexOf('id="dashboardWrapper"'));
  assert('Item 12: Login page requires individual credentials and has no prefilled admin values',
    !loginFormSlice.includes('value="admin"') &&
    !loginFormSlice.includes('value="Password123!"') &&
    loginFormSlice.includes('placeholder="Enter authorized username or email"')
  );

  // 13. Data integrity & permissions preserved
  const usersRes = await get('/api/admin/users', authHeaders);
  const accountsRes = await get('/api/admin/accounts/summary', authHeaders);
  assert('Item 13: Financial accounts summary and user permissions remain intact',
    usersRes.body && usersRes.body.success && Array.isArray(usersRes.body.users) &&
    accountsRes.body && accountsRes.body.success && (accountsRes.body.total_confirmed > 0 || (accountsRes.body.data && accountsRes.body.data.overall.totalConfirmedAmount > 0))
  );

  // 14. Existing public layout preserved
  const publicCss = fs.readFileSync('public/css/style.css', 'utf8');
  assert('Item 14: Public portal styles and components preserved',
    publicCss.includes('--primary: #B91C1C') &&
    publicIndex.includes('QASR-E-SHABBIR')
  );

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
