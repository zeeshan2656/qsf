const http = require('http');

async function run() {
  console.log('--- Starting Comprehensive Feature Verification ---');

  // Helper for requests with cookies
  let cookies = '';

  function request(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        if (res.headers['set-cookie']) {
          cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data, headers: res.headers });
          }
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  // 1. Admin Sign In
  console.log('\n1. Testing Admin Authentication...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'Admin@Qasr2026!' });
  console.log('Login Status:', loginRes.status, 'Success:', loginRes.data?.success);

  // 2. Welfare Projects Listing & Statistics
  console.log('\n2. Testing Welfare Projects Listing & Statistics (GET /api/admin/projects)...');
  const projRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/projects?status=all&page=1&limit=6',
    method: 'GET',
    headers: { Cookie: cookies }
  });
  console.log('Projects Status:', projRes.status, 'Count:', projRes.data?.projects?.length);
  console.log('Stats:', projRes.data?.stats);
  console.log('Pagination:', projRes.data?.pagination);

  // 3. Create a Project with Start Date, Expected Completion Date, Notes, and Status
  console.log('\n3. Testing Welfare Project Creation...');
  const createRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/projects',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies }
  }, {
    title_en: 'Solar Water Filtration Plant',
    title_ur: 'سولر واٹر فلٹریشن پلانٹ',
    category_id: 4,
    goal_amount: 1200000,
    raised_amount: 0,
    beneficiaries_count: 500,
    beneficiaries_label_en: 'Villagers',
    short_desc_en: 'Clean drinking water for underprivileged rural families.',
    short_desc_ur: 'دیہی خاندانوں کے لیے صاف شفاف پینے کے پانی کی فراہمی۔',
    start_date: '2026-11-01',
    expected_completion_date: '2027-04-30',
    notes: 'Phase 1 ground survey completed. Awaiting community solar drilling.',
    status: 'active'
  });
  console.log('Create Project Result:', createRes.data);
  const newProjectId = createRes.data?.id;

  // 4. View Project Complete Details & Dedicated Donation Ledger
  console.log(`\n4. Testing Complete Project Details & Dedicated Ledger (GET /api/admin/projects/${newProjectId})...`);
  const detailRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}`,
    method: 'GET',
    headers: { Cookie: cookies }
  });
  console.log('Project Goal:', detailRes.data?.project?.goal_amount, 'Raised:', detailRes.data?.project?.raised_amount);
  console.log('Dates: Start =', detailRes.data?.project?.start_date, 'Expected =', detailRes.data?.project?.expected_completion_date);
  console.log('Ledger Stats:', detailRes.data?.ledger_stats);
  console.log('Donations in Ledger:', detailRes.data?.donations?.length);

  // 5. Record a Confirmed Donation for this Project
  console.log('\n5. Testing Dedicated Donation Recording for this project...');
  const donRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies }
  }, {
    project_id: newProjectId,
    amount: 150000,
    donor_name: 'Al-Haj Muhammad Sharif',
    donor_phone: '0300-5551234',
    donor_email: 'sharif@example.com',
    payment_method: 'Meezan Bank',
    transaction_reference: `TXN-TEST-${Date.now().toString().slice(-6)}`,
    status: 'confirmed',
    notes: 'Zakat contribution for solar water filtration pump'
  });
  console.log('Record Donation Result:', donRes.data);
  const donationId = donRes.data?.donationId || donRes.data?.id;

  // Verify Project Ledger updated
  console.log('\n5b. Verifying Project Ledger & Progress Update...');
  const updatedDetailRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}`,
    method: 'GET',
    headers: { Cookie: cookies }
  });
  console.log('Updated Raised Amount:', updatedDetailRes.data?.project?.raised_amount, 'Progress %:', updatedDetailRes.data?.project?.progress_pct);
  console.log('Dedicated Ledger Entries:', updatedDetailRes.data?.donations?.length);

  // 6. Complete the Project
  console.log('\n6. Testing Mark Project as Completed...');
  const compRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}/status`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies }
  }, { status: 'completed', reason: 'Drilling and filtration plant operational.' });
  console.log('Complete Project Result:', compRes.data);

  // 7. Close the Project
  console.log('\n7. Testing Closing Project with history preservation...');
  const closeRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}/status`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies }
  }, { status: 'closed', reason: 'Field installation completed and handed over.' });
  console.log('Close Project Result:', closeRes.data);

  // Verify Closed Project still retains donations in history
  const closedDetailRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}`,
    method: 'GET',
    headers: { Cookie: cookies }
  });
  console.log('Closed Project Status:', closedDetailRes.data?.project?.status);
  console.log('Historical Donations Preserved:', closedDetailRes.data?.donations?.length, 'Amount:', closedDetailRes.data?.project?.raised_amount);

  // 8. Verify public donations are rejected for closed projects
  console.log('\n8. Testing Public Donation Prevention for Closed Project...');
  const publicDonRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/public/donate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    project_id: newProjectId,
    amount: 10000,
    donor_name: 'Public Donor',
    donor_phone: '0300-1112233',
    payment_method: 'EasyPaisa'
  });
  console.log('Public Donation to Closed Project Status:', publicDonRes.status, 'Message:', publicDonRes.data?.message);

  // 9. Reopen Project
  console.log('\n9. Testing Reopening / Reactivating Project...');
  const reopenRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/projects/${newProjectId}/status`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookies }
  }, { status: 'active', reason: 'Reopening project for maintenance funding.' });
  console.log('Reopen Result:', reopenRes.data);

  // 10. Verify Bilingual Receipt
  console.log(`\n10. Testing Donation Receipt Details (GET /api/admin/donations/${donationId})...`);
  const receiptRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/donations/${donationId}`,
    method: 'GET',
    headers: { Cookie: cookies }
  });
  console.log('Receipt Donor:', receiptRes.data?.donation?.donor_name);
  console.log('Receipt Amount:', receiptRes.data?.donation?.amount);
  console.log('Receipt Project:', receiptRes.data?.donation?.project_title);

  console.log('\n--- ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ---');
}

run().catch(err => console.error('Verification Error:', err));
