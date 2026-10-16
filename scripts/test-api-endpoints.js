const http = require('http');

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

async function run() {
  console.log('Testing Admin Login...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'admin',
    password: 'Admin@Qasr2026!'
  });

  console.log('Login Status:', loginRes.status, 'Success:', loginRes.data?.success);

  const authHeaders = {
    'Cookie': cookies,
    'Content-Type': 'application/json'
  };

  // Test Departments
  const deptRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/departments', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/departments:', deptRes.status, 'Count:', deptRes.data?.departments?.length);

  // Test Roles
  const rolesRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/roles', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/roles:', rolesRes.status, 'Count:', rolesRes.data?.roles?.length);

  // Test Designations
  const desigRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/designations', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/designations:', desigRes.status, 'Count:', desigRes.data?.designations?.length);

  // Test Categories
  const catRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/categories', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/categories:', catRes.status, 'Count:', catRes.data?.categories?.length);

  // Test Users (with joined department, role, designation)
  const usersRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/users', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/users:', usersRes.status, 'Count:', usersRes.data?.users?.length);
  if (usersRes.data?.users?.length > 0) {
    const u = usersRes.data.users[0];
    console.log('First User:', u.username, 'Dept:', u.department_name_en, 'Role:', u.role_name_en, 'Desig:', u.designation_name_en);
  }

  // Test Volunteers (with joined department, role, designation)
  const volsRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/volunteers', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/volunteers:', volsRes.status, 'Count:', volsRes.data?.volunteers?.length);
  if (volsRes.data?.volunteers?.length > 0) {
    const v = volsRes.data.volunteers[0];
    console.log('First Volunteer:', v.full_name, 'Dept:', v.department_name_en, 'Role:', v.role_name_en, 'Desig:', v.designation_name_en);
  }

  // Test ID Card for User 1
  const idCardRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/users/1/id-card', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/users/1/id-card:', idCardRes.status, 'Card Type:', idCardRes.data?.card_type);
  if (idCardRes.data?.staff) {
    console.log('Staff ID Card:', idCardRes.data.staff.full_name, 'Dept:', idCardRes.data.staff.department_name_en, 'Role:', idCardRes.data.staff.role_name_en);
  }

  // Test ID Card for Volunteer 1
  const volIdCardRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/volunteers/1/id-card', method: 'GET',
    headers: authHeaders
  });
  console.log('GET /api/admin/volunteers/1/id-card:', volIdCardRes.status, 'Card Type:', volIdCardRes.data?.card_type);
  if (volIdCardRes.data?.volunteer) {
    console.log('Volunteer ID Card:', volIdCardRes.data.volunteer.full_name, 'Dept:', volIdCardRes.data.volunteer.department_name_en, 'Role:', volIdCardRes.data.volunteer.role_name_en);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
