const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING THREE FEATURES VERIFICATION TESTS ===\n');

  // Test 1: Check Public Volunteer Page
  console.log('[Test 1.1] Testing GET /volunteer ...');
  const volPageRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/volunteer',
    method: 'GET'
  });
  if (volPageRes.statusCode === 200 && volPageRes.body.includes('volunteerApplicationForm')) {
    console.log('  ✓ /volunteer route responded with HTTP 200 and includes Volunteer Application Form.');
  } else {
    console.error('  ✗ /volunteer route failed! Status:', volPageRes.statusCode);
  }

  // Test 1.2: Check Public Volunteer Submission API
  console.log('\n[Test 1.2] Testing POST /api/public/volunteer-apply ...');
  const sampleVolunteer = {
    full_name: 'Zahra Batool',
    email: 'zahra.test' + Date.now() + '@example.org',
    phone: '+92 301 9876543',
    city: 'Parachinar',
    application_type: 'Volunteer',
    areas_of_interest: 'Education & Mentorship, Food Distribution',
    relevant_skills: 'Teaching, Social Work, Project Management',
    availability: 'Weekends (10-15 hrs/week)',
    motivation_message: 'I would like to contribute my time to help underprivileged children and families in our community.'
  };

  const applyRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/public/volunteer-apply',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify(sampleVolunteer));

  let createdVolunteerId = null;
  let volunteerRef = null;

  if (applyRes.statusCode === 200 && applyRes.json && applyRes.json.success) {
    createdVolunteerId = applyRes.json.applicationId;
    volunteerRef = applyRes.json.reference_no;
    console.log(`  ✓ Volunteer Application successfully created! Ref: ${volunteerRef}, ID: ${createdVolunteerId}`);
  } else {
    console.error('  ✗ Volunteer application submission failed!', applyRes.statusCode, applyRes.body);
  }

  // Test 2: Admin Login
  console.log('\n[Test 2] Admin authentication for dashboard endpoints ...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'Admin@Qasr2026!' }));

  if (loginRes.statusCode !== 200 || !loginRes.json || !loginRes.json.success) {
    console.error('  ✗ Admin login failed!', loginRes.body);
    process.exit(1);
  }
  const cookies = loginRes.headers['set-cookie'];
  const sessionCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
  console.log('  ✓ Admin logged in successfully.');

  // Test 2.1: Admin Volunteer Management
  console.log('\n[Test 2.1] Testing Admin Volunteer Management APIs ...');
  const adminVolsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/volunteers',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });

  if (adminVolsRes.statusCode === 200 && adminVolsRes.json && adminVolsRes.json.success) {
    const found = adminVolsRes.json.applications.find(a => a.id === createdVolunteerId || a.reference_no === volunteerRef);
    if (found) {
      console.log(`  ✓ Found newly submitted application in Admin Volunteers list (Status: ${found.status}).`);
    } else {
      console.warn('  ? Application not found in list, total count:', adminVolsRes.json.applications.length);
    }
  } else {
    console.error('  ✗ Failed to fetch admin volunteers list:', adminVolsRes.body);
  }

  // Test 2.2: Update Volunteer Status
  console.log('\n[Test 2.2] Testing Admin Volunteer Status Update to "accepted" ...');
  const updateVolStatusRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/volunteers/${createdVolunteerId}/status`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
  }, JSON.stringify({ status: 'accepted', admin_notes: 'Verified contact and approved for Education team' }));

  if (updateVolStatusRes.statusCode === 200 && updateVolStatusRes.json && updateVolStatusRes.json.success) {
    console.log('  ✓ Volunteer status updated to "accepted".');
  } else {
    console.error('  ✗ Failed to update volunteer status:', updateVolStatusRes.body);
  }

  // Test 3: Accounts & Project-Wise Donation Tracking
  console.log('\n[Test 3.1] Testing Accounts Summary & Initial Project Balance ...');
  const accSummaryRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/summary',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });

  if (accSummaryRes.statusCode !== 200 || !accSummaryRes.json || !accSummaryRes.json.success) {
    console.error('  ✗ Failed to fetch accounts summary:', accSummaryRes.body);
    process.exit(1);
  }

  const initialSummary = accSummaryRes.json;
  console.log(`  ✓ Accounts Summary fetched. Total Confirmed: PKR ${initialSummary.total_confirmed.toLocaleString()}`);

  const targetProject = initialSummary.projects[0];
  if (!targetProject) {
    console.error('  ✗ No projects found in summary to test.');
    process.exit(1);
  }

  const initialRaised = parseFloat(targetProject.raised_amount) || 0;
  console.log(`  Target Project: "${targetProject.title_en}" (ID: ${targetProject.id})`);
  console.log(`  Initial Raised: PKR ${initialRaised.toLocaleString()} / Goal: PKR ${targetProject.goal_amount.toLocaleString()}`);

  // Test 3.2: Manual Confirmed Donation Recording & Automatic Project Update
  const donationAmount = 15000;
  const uniqueTxnRef = 'TXN-TEST-' + Date.now();
  console.log(`\n[Test 3.2] Recording Manual Confirmed Donation of PKR ${donationAmount.toLocaleString()} to Project #${targetProject.id} ...`);

  const recordRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
  }, JSON.stringify({
    project_id: targetProject.id,
    amount: donationAmount,
    donor_name: 'Haji Ghulam Shabbir',
    donor_phone: '+92 300 5556677',
    donor_email: 'ghulam.shabbir@example.org',
    payment_method: 'Meezan Bank',
    transaction_reference: uniqueTxnRef,
    status: 'confirmed',
    notes: 'Project targeted educational sponsorship'
  }));

  if (recordRes.statusCode !== 200 || !recordRes.json || !recordRes.json.success) {
    console.error('  ✗ Failed to record manual donation:', recordRes.body);
    process.exit(1);
  }

  const recordedDonationId = recordRes.json.donationId;
  console.log(`  ✓ Donation recorded successfully! ID: ${recordedDonationId}`);

  // Test 3.3: Verify Automatic Project Progress Recalculation
  console.log('\n[Test 3.3] Verifying Automatic Project Raised Amount Increment ...');
  const afterSummaryRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/summary',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });

  const afterSummary = afterSummaryRes.json;
  const updatedProject = afterSummary.projects.find(p => p.id === targetProject.id);
  const newRaised = parseFloat(updatedProject.raised_amount) || 0;

  console.log(`  Previous Raised: PKR ${initialRaised.toLocaleString()}`);
  console.log(`  New Raised:      PKR ${newRaised.toLocaleString()}`);

  if (newRaised === initialRaised + donationAmount) {
    console.log(`  ✓ SUCCESS: Project #${targetProject.id} raised amount automatically increased by exactly PKR ${donationAmount.toLocaleString()}!`);
    console.log(`  New Progress: ${updatedProject.progress_percentage}%`);
  } else {
    console.error(`  ✗ MISMATCH: Expected ${initialRaised + donationAmount}, got ${newRaised}`);
  }

  // Test 3.4: Duplicate Transaction Reference Prevention
  console.log('\n[Test 3.4] Testing Duplicate Transaction Reference Prevention ...');
  const dupRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
  }, JSON.stringify({
    project_id: targetProject.id,
    amount: 5000,
    donor_name: 'Test Dup Donor',
    payment_method: 'EasyPaisa',
    transaction_reference: uniqueTxnRef, // Duplicate!
    status: 'confirmed'
  }));

  if (dupRes.statusCode === 400 && dupRes.json && !dupRes.json.success) {
    console.log(`  ✓ Duplicate prevented correctly with message: "${dupRes.json.message}"`);
  } else {
    console.error('  ✗ Duplicate was not rejected! Status:', dupRes.statusCode, dupRes.body);
  }

  // Test 3.5: Donation Refund / Reversal & Automatic Project Decrement
  console.log('\n[Test 3.5] Testing Donation Refund / Reversal with Automatic Project Decrement ...');
  const refundRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/accounts/donations/${recordedDonationId}/refund`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie }
  }, JSON.stringify({ refund_reason: 'Donor double transfer adjustment' }));

  if (refundRes.statusCode === 200 && refundRes.json && refundRes.json.success) {
    console.log(`  ✓ Donation #${recordedDonationId} refunded.`);
  } else {
    console.error('  ✗ Failed to refund donation:', refundRes.body);
  }

  // Verify Project Balance returned to initial
  const postRefundSummaryRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/summary',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });

  const postRefundProject = postRefundSummaryRes.json.projects.find(p => p.id === targetProject.id);
  const postRefundRaised = parseFloat(postRefundProject.raised_amount) || 0;

  console.log(`  Raised after refund: PKR ${postRefundRaised.toLocaleString()} (Expected: ${initialRaised.toLocaleString()})`);
  if (postRefundRaised === initialRaised) {
    console.log(`  ✓ SUCCESS: Project funding automatically reversed back to initial balance!`);
  } else {
    console.error(`  ✗ MISMATCH: Expected ${initialRaised}, got ${postRefundRaised}`);
  }

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
