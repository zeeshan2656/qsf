const http = require('http');

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

function extractCookie(headers) {
  const sc = headers['set-cookie'];
  if (!sc) return '';
  return sc.map(c => c.split(';')[0]).join('; ');
}

async function run() {
  console.log('====================================================');
  console.log('QASR-E-SHABBIR FOUNDATION - VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. TEST FINANCE OFFICER LOGIN & STRICT RBAC PERMISSIONS
  console.log('--- 1. Testing Finance Officer Login & RBAC Permissions ---');
  const finLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'finance_officer', password: 'Finance@QSF2026!' });

  assert(finLoginRes.statusCode === 200 && finLoginRes.data.success, 'Finance officer login succeeded');
  const finCookie = extractCookie(finLoginRes.headers);
  const finUser = finLoginRes.data.user;
  assert(finUser && finUser.role === 'accountant', 'Finance officer role is accountant');
  
  let finPerms = finUser.permissions;
  if (typeof finPerms === 'string') try { finPerms = JSON.parse(finPerms); } catch(e) {}
  assert(Array.isArray(finPerms) && finPerms.includes('accounts') && finPerms.includes('donations') && !finPerms.includes('users'), 'Finance officer permissions restricted strictly to accounts & donations');

  // Check Finance Officer allowed endpoints (200 OK)
  const finDonationsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/donations',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finDonationsRes.statusCode === 200, `Finance officer allowed access to donations (Status: ${finDonationsRes.statusCode})`);

  const finAccountsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/accounts/summary',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finAccountsRes.statusCode === 200, `Finance officer allowed access to accounts summary (Status: ${finAccountsRes.statusCode})`);

  // Check Finance Officer forbidden endpoints (403 Forbidden)
  const finOverviewRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finOverviewRes.statusCode === 403, `Finance officer blocked from /overview with 403 (Status: ${finOverviewRes.statusCode})`);

  const finUsersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finUsersRes.statusCode === 403, `Finance officer blocked from /users with 403 (Status: ${finUsersRes.statusCode})`);

  const finVolRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/volunteers',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finVolRes.statusCode === 403, `Finance officer blocked from /volunteers with 403 (Status: ${finVolRes.statusCode})`);

  const finSettingsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/settings',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finSettingsRes.statusCode === 403, `Finance officer blocked from /settings with 403 (Status: ${finSettingsRes.statusCode})`);

  const finBrandingRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/branding-assets',
    method: 'GET',
    headers: { 'Cookie': finCookie }
  });
  assert(finBrandingRes.statusCode === 403, `Finance officer blocked from /branding-assets with 403 (Status: ${finBrandingRes.statusCode})`);

  // 2. TEST SUPERADMIN LOGIN & FULL ACCESS
  console.log('\n--- 2. Testing Superadmin Login & Full Access ---');
  const adminLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'Admin@Qasr2026!' });

  assert(adminLoginRes.statusCode === 200 && adminLoginRes.data.success, 'Admin login succeeded');
  const adminCookie = extractCookie(adminLoginRes.headers);

  const adminOverviewRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(adminOverviewRes.statusCode === 200, 'Admin has full access to overview');

  const adminUsersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(adminUsersRes.statusCode === 200, 'Admin has full access to users');

  // 3. TEST OFFICIAL SIGNATURES ENDPOINTS
  console.log('\n--- 3. Testing Official Signatures Endpoints ---');
  const sigListRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/branding-assets/signatures',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(sigListRes.statusCode === 200 && Array.isArray(sigListRes.data.signatures), 'Official signatures list retrieved');
  const signatures = sigListRes.data.signatures;
  console.log(`Found ${signatures.length} official signatures.`);
  const defaultSig = signatures.find(s => s.is_default === 1);
  assert(Boolean(defaultSig), `Default official signature found: ${defaultSig?.name} (${defaultSig?.designation})`);

  // 4. TEST VOLUNTEER EDITING & PERSISTENCE
  console.log('\n--- 4. Testing Volunteer Editing & Dynamic Designations ---');
  const volListRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/volunteers',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(volListRes.statusCode === 200 && Array.isArray(volListRes.data.applications), 'Volunteers list retrieved');
  const testVol = volListRes.data.applications[0];
  assert(Boolean(testVol), `Test volunteer candidate found: ID ${testVol?.id} (${testVol?.full_name})`);

  if (testVol) {
    // Update volunteer details via PUT
    const updatePayload = {
      full_name: testVol.full_name,
      email: testVol.email,
      phone: testVol.phone,
      city: testVol.city,
      application_type: testVol.application_type,
      relevant_skills: testVol.relevant_skills || 'Disaster Relief Coordination',
      areas_of_interest: testVol.areas_of_interest || 'Emergency Food Rations',
      availability: 'Full-time',
      status: 'accepted',
      admin_notes: 'Promoted to Senior Field Volunteer by Executive Committee',
      designation: 'Senior Relief Coordinator',
      designation_ur: 'سینئر کوآرڈینیٹر امدادی فلاحی امور',
      signature_id: defaultSig ? defaultSig.id : null
    };

    const updateVolRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/volunteers/${testVol.id}`,
      method: 'PUT',
      headers: {
        'Cookie': adminCookie,
        'Content-Type': 'application/json'
      }
    }, updatePayload);

    assert(updateVolRes.statusCode === 200 && updateVolRes.data.success, 'Volunteer updated successfully via PUT /api/admin/volunteers/:id');

    // Verify persisted details via GET
    const getVolRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/volunteers/${testVol.id}`,
      method: 'GET',
      headers: { 'Cookie': adminCookie }
    });
    const updatedVol = getVolRes.data.application;
    assert(updatedVol.designation === 'Senior Relief Coordinator', `Volunteer English designation persisted: "${updatedVol.designation}"`);
    assert(updatedVol.designation_ur === 'سینئر کوآرڈینیٹر امدادی فلاحی امور', `Volunteer Urdu designation persisted: "${updatedVol.designation_ur}"`);
    assert(Number(updatedVol.signature_id) === Number(defaultSig?.id), `Volunteer assigned signature ID persisted: ${updatedVol.signature_id}`);

    // 5. TEST VOLUNTEER ID CARD API RESPONSE
    console.log('\n--- 5. Testing Volunteer ID Card Dynamic Content & Signature ---');
    const volIdCardRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/volunteers/${testVol.id}/id-card`,
      method: 'GET',
      headers: { 'Cookie': adminCookie }
    });

    assert(volIdCardRes.statusCode === 200 && volIdCardRes.data.success, 'Volunteer ID card generated successfully');
    const cardData = volIdCardRes.data;
    assert(Boolean(cardData.branding.tagline_en), `ID card header tagline (EN): "${cardData.branding.tagline_en}"`);
    assert(Boolean(cardData.branding.tagline_ur), `ID card header tagline (UR): "${cardData.branding.tagline_ur}"`);
    assert(cardData.volunteer.designation === 'Senior Relief Coordinator', `Volunteer ID card dynamic designation (EN): "${cardData.volunteer.designation}"`);
    assert(cardData.volunteer.designation_ur === 'سینئر کوآرڈینیٹر امدادی فلاحی امور', `Volunteer ID card dynamic designation (UR): "${cardData.volunteer.designation_ur}"`);
    assert(Boolean(cardData.signature && cardData.signature.signature_url), `Assigned official signature included: ${cardData.signature?.name} (${cardData.signature?.signature_url})`);
  }

  // 6. TEST STAFF ID CARD API RESPONSE
  console.log('\n--- 6. Testing Staff / Employee ID Card Dynamic Content & Signature ---');
  const staffIdCardRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/1/id-card',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });

  assert(staffIdCardRes.statusCode === 200 && staffIdCardRes.data.success, 'Staff ID card generated successfully');
  const staffCardData = staffIdCardRes.data;
  assert(Boolean(staffCardData.branding.tagline_en), `Staff ID card header tagline (EN): "${staffCardData.branding.tagline_en}"`);
  assert(Boolean(staffCardData.branding.tagline_ur), `Staff ID card header tagline (UR): "${staffCardData.branding.tagline_ur}"`);
  assert(Boolean(staffCardData.staff.designation), `Staff ID card dynamic designation (EN): "${staffCardData.staff.designation}"`);
  assert(Boolean(staffCardData.staff.designation_ur), `Staff ID card dynamic designation (UR): "${staffCardData.staff.designation_ur}"`);
  assert(Boolean(staffCardData.signature && staffCardData.signature.signature_url), `Staff ID card assigned official signature: ${staffCardData.signature?.name} (${staffCardData.signature?.signature_url})`);

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
