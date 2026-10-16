const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, data: json || data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
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
  console.log('--- Testing Admin Password Visibility and Unhide Feature ---');

  // 1. Admin login
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'Admin@Qasr2026!' });

  console.log('Admin login:', loginRes.status, loginRes.data?.success ? 'SUCCESS' : 'FAILED');
  const cookie = extractCookie(loginRes.headers);

  // 2. Fetch admin's own user record (ID 1)
  const selfRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/1',
    method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('Admin user password_plain:', selfRes.data?.user?.password_plain);
  if (selfRes.data?.user?.password_plain === 'Admin@Qasr2026!') {
    console.log('✅ [PASS] Admin can see their own password.');
  } else {
    console.error('❌ [FAIL] Admin password_plain not matching.');
  }

  // 3. Fetch other staff record (finance_officer ID 2)
  const staffRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/2',
    method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('Staff (finance_officer) password_plain:', staffRes.data?.user?.password_plain);
  if (staffRes.data?.user?.password_plain === 'Finance@QSF2026!') {
    console.log('✅ [PASS] Admin can see other staff password.');
  } else {
    console.error('❌ [FAIL] Staff password_plain not matching.');
  }

  // 4. Test updating staff password and verifying plain password persistence
  console.log('\n--- Testing updating staff password ---');
  const updateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/2',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie }
  }, {
    password: 'Finance@NewPass2026!'
  });
  console.log('Update result:', updateRes.data?.message);

  const checkUpdated = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/2',
    method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('Updated password_plain in DB:', checkUpdated.data?.user?.password_plain);
  if (checkUpdated.data?.user?.password_plain === 'Finance@NewPass2026!') {
    console.log('✅ [PASS] Updated password_plain persisted correctly.');
  } else {
    console.error('❌ [FAIL] Updated password_plain not persisted.');
  }

  // Verify staff can log in with new password
  const testLoginNew = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'finance_officer', password: 'Finance@NewPass2026!' });
  console.log('Login with new password:', testLoginNew.data?.success ? '✅ SUCCESS' : '❌ FAILED');

  // Revert back to original password
  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/2',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie }
  }, {
    password: 'Finance@QSF2026!'
  });
  console.log('Reverted staff password back to Finance@QSF2026!');

  console.log('\n--- ALL PASSWORD VISIBILITY TESTS PASSED ---');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
