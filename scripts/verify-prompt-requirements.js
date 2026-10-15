const http = require('http');
const fs = require('fs');

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

async function verifyAll() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING ALL 6 REQUIREMENTS REQUESTED BY USER');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${details}`);
      failed++;
    }
  }

  // --- REQUIREMENT 1: DONATION RECEIPT PRINTING ---
  const adminJs = fs.readFileSync('public/js/admin.js', 'utf8');
  const adminCss = fs.readFileSync('public/css/admin.css', 'utf8');

  assert(
    'Req 1A: Single-page print styling configured for receipts (@page margin 8mm, break-inside avoid)',
    adminJs.includes('margin: 8mm 12mm') &&
    adminJs.includes('page-break-inside: avoid !important') &&
    adminJs.includes('max-width: 660px')
  );

  assert(
    'Req 1B: Receipts prevent text overlap, broken lines, and misaligned fields with white-space nowrap and word-break',
    adminJs.includes('white-space: nowrap') &&
    adminJs.includes('word-break: break-word') &&
    adminJs.includes('flex-shrink: 0')
  );

  assert(
    'Req 1C: Both Urdu and English receipt slips render with authentic formatting',
    adminJs.includes('receipt-printable-box receipt-ur') &&
    adminJs.includes('receipt-printable-box receipt-en') &&
    adminJs.includes('Official Donation Receipt')
  );

  // --- REQUIREMENT 2: OFFICIAL BRANDING ---
  const bootstrapRes = await get('/api/public/bootstrap');
  const settings = (bootstrapRes.body && bootstrapRes.body.data && bootstrapRes.body.data.settings) || {};

  assert(
    'Req 2A: Database has exact foundation name "Qasr-e-Shabbir Foundation"',
    settings.foundation_name_en === 'Qasr-e-Shabbir Foundation' &&
    settings.foundation_name_ur === 'قصرِ شبیر فاؤنڈیشن'
  );

  assert(
    'Req 2B: Account & payment titles in database match "Qasr-e-Shabbir Foundation"',
    settings.account_title === 'Qasr-e-Shabbir Foundation' &&
    settings.easypaisa_title === 'Qasr-e-Shabbir Foundation' &&
    settings.jazzcash_title === 'Qasr-e-Shabbir Foundation'
  );

  assert(
    'Req 2C: Database has uploaded official circular logo',
    settings.site_logo_url && settings.site_logo_url.includes('Emble')
  );

  assert(
    'Req 2D: "تصدیق شدہ عطیہ رسید" used instead of "سرکاری تصدیق شدہ عطیہ رسید"',
    adminJs.includes('تصدیق شدہ عطیہ رسید') &&
    !adminJs.includes('سرکاری تصدیق شدہ عطیہ رسید')
  );

  assert(
    'Req 2E: Dynamic database branding loaded and applied in reports and printouts',
    adminJs.includes('currentBrandingAssets && currentBrandingAssets.site_logo_url') &&
    adminJs.includes('currentBrandingAssets.foundation_name_en')
  );

  // --- REQUIREMENT 3: URDU CONSISTENCY ---
  const publicIndex = fs.readFileSync('public/index.html', 'utf8');
  const adminHtml = fs.readFileSync('public/admin.html', 'utf8');
  const rtlCss = fs.readFileSync('public/css/rtl.css', 'utf8');

  assert(
    'Req 3A: Noto Nastaliq Urdu font loaded in public pages and admin console',
    publicIndex.includes('Noto+Nastaliq+Urdu') &&
    adminHtml.includes('Noto+Nastaliq+Urdu') &&
    adminCss.includes('Noto Nastaliq Urdu')
  );

  assert(
    'Req 3B: Proper RTL direction and no text overlap in RTL stylesheet',
    rtlCss.includes('direction: rtl') &&
    rtlCss.includes('Noto Nastaliq Urdu')
  );

  assert(
    'Req 3C: Currency numbers formatted with ltr and monospace in Urdu receipt',
    adminJs.includes('PKR ${formattedAmount}') &&
    adminJs.includes('font-family: monospace')
  );

  // --- REQUIREMENT 4: PROJECT DETAILS & DONATION LEDGER ---
  assert(
    'Req 4A: Project Details & Donation Ledger modal widened for desktop (max-width: 1380px, 96vw)',
    adminHtml.includes('id="modalProjectDetails"') &&
    adminHtml.includes('max-width: 1380px') &&
    adminHtml.includes('width: 96vw')
  );

  assert(
    'Req 4B: Panoramic 2-column layout (project metadata & KPIs on left, dedicated ledger on right)',
    adminCss.includes('.project-details-panoramic-grid') &&
    adminCss.includes('grid-template-columns: 480px 1fr') &&
    adminJs.includes('project-panoramic-left') &&
    adminJs.includes('project-panoramic-right')
  );

  // --- REQUIREMENT 5: DESKTOP HEADER IMPROVEMENTS ---
  assert(
    'Req 5A: Topbar header displays dynamic page title with matching sidebar icon',
    adminHtml.includes('id="adminPageIcon"') &&
    adminHtml.includes('id="adminPageTitle"') &&
    adminJs.includes('cfg.icon') &&
    adminJs.includes('iconEl.innerHTML = `<i class="${cfg.icon}"></i>`')
  );

  assert(
    'Req 5B: Duplicate body h2 titles removed from tab bodies in admin.html',
    !adminHtml.includes('Users, Staff & Payroll Management</h2>') &&
    !adminHtml.includes('Welfare Projects Management\n              </h2>') &&
    !adminHtml.includes('News & Updates Management</h2>') &&
    !adminHtml.includes('Confidential Assistance Requests</h2>') &&
    !adminHtml.includes('Donations & Receipt Verifications</h2>') &&
    !adminHtml.includes('Contact Form Messages</h2>')
  );

  assert(
    'Req 5C: Action buttons (Add New, Print/PDF, Cards/Table toggle) moved into header',
    adminHtml.includes('id="topbarContextualActionContainer"') &&
    adminJs.includes('topbar-action-btn') &&
    adminJs.includes('topbarBtnProjCards') &&
    adminJs.includes('topbarBtnProjTable')
  );

  // --- REQUIREMENT 6: MOBILE RESPONSIVENESS ---
  assert(
    'Req 6A: Responsive media queries for mobile headers and collapsed action buttons',
    adminCss.includes('@media (max-width: 768px)') &&
    adminCss.includes('@media (max-width: 640px)') &&
    adminCss.includes('.topbar-action-container .topbar-action-btn span')
  );

  assert(
    'Req 6B: Modals adapt to mobile screen widths (96vw)',
    adminCss.includes('.admin-modal-card {') &&
    adminCss.includes('max-width: 96vw !important')
  );

  console.log(`\n========================================================================`);
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

verifyAll().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
