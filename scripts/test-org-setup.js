require('dotenv').config();
const db = require('../config/db');

async function testOrgSetup() {
  console.log('========================================================');
  console.log('   FOUNDATION MANAGEMENT SYSTEM - ORG SETUP TEST SUITE  ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. TEST DEPARTMENTS
    console.log('1. Testing Departments Setup & Seed Data...');
    const [depts] = await db.query('SELECT * FROM departments ORDER BY id ASC');
    assert(depts.length >= 8, `Seeded departments count: ${depts.length} (Expected >= 8)`);
    const deptCodes = depts.map(d => d.code);
    assert(deptCodes.includes('ADMIN') && deptCodes.includes('RELIEF') && deptCodes.includes('FINANCE') && deptCodes.includes('HEALTHCARE'), 
      'Core departments (ADMIN, RELIEF, FINANCE, HEALTHCARE) are present');

    // Test Create Department
    const testDeptCode = `TEST_DEPT_${Date.now()}`;
    const [resAddDept] = await db.query(`
      INSERT INTO departments (name_en, name_ur, code, description, is_active, sort_order)
      VALUES (?, ?, ?, ?, 1, 99)
    `, ['Test Department', 'ٹیسٹ شعبہ', testDeptCode, 'Automated Test Description']);
    const testDeptId = resAddDept.insertId;
    assert(testDeptId > 0, `Created test department with ID: ${testDeptId}`);

    // Test Update Department
    await db.query(`
      UPDATE departments SET name_en = ?, description = ? WHERE id = ?
    `, ['Test Department Updated', 'Updated Description', testDeptId]);
    const [[updatedDept]] = await db.query('SELECT * FROM departments WHERE id = ?', [testDeptId]);
    assert(updatedDept && updatedDept.name_en === 'Test Department Updated', 'Updated department verified');

    // Test Delete Department
    await db.query('DELETE FROM departments WHERE id = ?', [testDeptId]);
    const [deletedDeptCheck] = await db.query('SELECT * FROM departments WHERE id = ?', [testDeptId]);
    assert(deletedDeptCheck.length === 0, 'Deleted test department verified');

    // 2. TEST USER ROLES
    console.log('\n2. Testing User Roles Setup & Seed Data...');
    const [roles] = await db.query('SELECT * FROM user_roles ORDER BY id ASC');
    assert(roles.length >= 8, `Seeded user roles count: ${roles.length} (Expected >= 8)`);
    const roleKeys = roles.map(r => r.role_key);
    assert(roleKeys.includes('superadmin') && roleKeys.includes('admin') && roleKeys.includes('manager') && roleKeys.includes('staff'),
      'Core user roles (superadmin, admin, manager, staff) are present');

    // Test Create Custom Role
    const testRoleKey = `role_${Date.now()}`;
    const [resAddRole] = await db.query(`
      INSERT INTO user_roles (role_key, name_en, name_ur, description, is_system, is_active)
      VALUES (?, ?, ?, ?, 0, 1)
    `, [testRoleKey, 'Test Custom Role', 'ٹیسٹ کسٹم رول', 'Test role description']);
    const testRoleId = resAddRole.insertId;
    assert(testRoleId > 0, `Created test role with ID: ${testRoleId}`);

    // Test Update Role
    await db.query('UPDATE user_roles SET name_en = ? WHERE id = ?', ['Test Custom Role Updated', testRoleId]);
    const [[updatedRole]] = await db.query('SELECT * FROM user_roles WHERE id = ?', [testRoleId]);
    assert(updatedRole && updatedRole.name_en === 'Test Custom Role Updated', 'Updated role verified');

    // Test Delete Custom Role
    await db.query('DELETE FROM user_roles WHERE id = ?', [testRoleId]);
    const [deletedRoleCheck] = await db.query('SELECT * FROM user_roles WHERE id = ?', [testRoleId]);
    assert(deletedRoleCheck.length === 0, 'Deleted test role verified');

    // 3. TEST DESIGNATIONS
    console.log('\n3. Testing Designations Setup & Seed Data...');
    const [desigs] = await db.query('SELECT * FROM designations ORDER BY id ASC');
    assert(desigs.length >= 12, `Seeded designations count: ${desigs.length} (Expected >= 12)`);

    // Test Create Designation
    const [resAddDesig] = await db.query(`
      INSERT INTO designations (name_en, name_ur, department_id, description, is_active, sort_order)
      VALUES (?, ?, ?, ?, 1, 99)
    `, ['Test Designation', 'ٹیسٹ عہدہ', depts[0].id, 'Test designation description']);
    const testDesigId = resAddDesig.insertId;
    assert(testDesigId > 0, `Created test designation with ID: ${testDesigId}`);

    // Test Update Designation
    await db.query('UPDATE designations SET name_en = ? WHERE id = ?', ['Test Designation Updated', testDesigId]);
    const [[updatedDesig]] = await db.query('SELECT * FROM designations WHERE id = ?', [testDesigId]);
    assert(updatedDesig && updatedDesig.name_en === 'Test Designation Updated', 'Updated designation verified');

    // Test Delete Designation
    await db.query('DELETE FROM designations WHERE id = ?', [testDesigId]);
    const [deletedDesigCheck] = await db.query('SELECT * FROM designations WHERE id = ?', [testDesigId]);
    assert(deletedDesigCheck.length === 0, 'Deleted test designation verified');

    // 4. TEST PROJECT CATEGORIES
    console.log('\n4. Testing Project Categories...');
    const [cats] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    const catSlugs = cats.map(c => c.slug);
    const catNames = cats.map(c => c.name_en.toLowerCase());
    assert(catSlugs.includes('flood-relief') || catNames.some(n => n.includes('flood')), 'Flood Relief category present');
    assert(catSlugs.includes('orphan-education') || catNames.some(n => n.includes('education')), 'Education category present');
    assert(catSlugs.includes('school-fees-healthcare') || catNames.some(n => n.includes('health')), 'Healthcare category present');
    assert(catSlugs.includes('food-ration-support') || catNames.some(n => n.includes('food')), 'Food Support category present');
    assert(catSlugs.includes('clean-water') || catNames.some(n => n.includes('water')), 'Clean Water category present');

    // Test Create Project Category
    const testCatSlug = `test-category-${Date.now()}`;
    const [resAddCat] = await db.query(`
      INSERT INTO categories (name_en, name_ur, slug, description_en, icon, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, 1, 99)
    `, ['Emergency Winter Relief', 'ہنگامی موسم سرما کی امداد', testCatSlug, 'Warm blankets, clothing & shelter kits', 'fas fa-snowflake']);
    const testCatId = resAddCat.insertId;
    assert(testCatId > 0, `Created test project category with ID: ${testCatId}`);

    // Test Update Category
    await db.query('UPDATE categories SET name_en = ? WHERE id = ?', ['Emergency Winter Relief Updated', testCatId]);
    const [[updatedCat]] = await db.query('SELECT * FROM categories WHERE id = ?', [testCatId]);
    assert(updatedCat && updatedCat.name_en === 'Emergency Winter Relief Updated', 'Updated category verified');

    // Test Delete Category
    await db.query('DELETE FROM categories WHERE id = ?', [testCatId]);
    const [deletedCatCheck] = await db.query('SELECT * FROM categories WHERE id = ?', [testCatId]);
    assert(deletedCatCheck.length === 0, 'Deleted test category verified');

    // 5. TEST DYNAMIC ASSIGNMENT FOR STAFF / EMPLOYEES
    console.log('\n5. Testing Dynamic Staff Assignment & Identity Card Data...');
    const targetDept = depts[0];
    const targetRole = roles.find(r => r.role_key === 'staff') || roles[0];
    const targetDesig = desigs[0];

    const testUsername = `teststaff_${Date.now()}`;
    const [resAddUser] = await db.query(`
      INSERT INTO users (
        username, email, password_hash, full_name, role,
        department_id, role_id, designation_id, designation,
        phone, is_active, permissions
      ) VALUES (?, ?, 'dummy_hash', ?, ?, ?, ?, ?, ?, ?, 1, '["projects"]')
    `, [
      testUsername,
      `${testUsername}@qasreshabbir.org`,
      'Test Staff Officer',
      targetRole.role_key,
      targetDept.id,
      targetRole.id,
      targetDesig.id,
      targetDesig.name_en,
      '+92 300 1234567'
    ]);
    const testUserId = resAddUser.insertId;
    assert(testUserId > 0, `Created test staff user with ID: ${testUserId}`);

    // Verify User Query Join
    const [userJoinRows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.role, u.department_id, u.role_id, u.designation_id,
             d.name_en as department_name_en, ur.name_en as role_name_en, des.name_en as designation_name_en
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles ur ON u.role_id = ur.id
      LEFT JOIN designations des ON u.designation_id = des.id
      WHERE u.id = ?
    `, [testUserId]);

    assert(userJoinRows.length === 1, 'User join query returned exactly 1 record');
    const uRow = userJoinRows[0];
    assert(uRow.department_name_en === targetDept.name_en, `Department joined correctly: ${uRow.department_name_en}`);
    assert(uRow.role_name_en === targetRole.name_en, `Role joined correctly: ${uRow.role_name_en}`);
    assert(uRow.designation_name_en === targetDesig.name_en, `Designation joined correctly: ${uRow.designation_name_en}`);

    // Test Update Staff Assignment
    const newDept = depts[1] || depts[0];
    await db.query(`
      UPDATE users SET department_id = ?, designation = ? WHERE id = ?
    `, [newDept.id, 'Senior Operations Lead', testUserId]);
    const [[updatedStaff]] = await db.query('SELECT department_id, designation FROM users WHERE id = ?', [testUserId]);
    assert(updatedStaff.department_id === newDept.id && updatedStaff.designation === 'Senior Operations Lead', 'Staff assignment update persistently saved in DB');

    // Clean up test user
    await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    assert(true, 'Test staff user cleaned up');

    // 6. TEST DYNAMIC ASSIGNMENT FOR VOLUNTEERS
    console.log('\n6. Testing Dynamic Volunteer Assignment & Identity Card Data...');
    const volRefNo = `VOL-TEST-${Date.now().toString().slice(-6)}`;
    const [resAddVol] = await db.query(`
      INSERT INTO volunteer_applications (
        reference_no, full_name, email, phone, city,
        application_type, department_id, role_id, designation_id,
        role, designation, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')
    `, [
      volRefNo,
      'Test Volunteer Candidate',
      `vol_${Date.now()}@test.org`,
      '+92 333 9876543',
      'Karachi',
      'volunteer',
      targetDept.id,
      targetRole.id,
      targetDesig.id,
      'Volunteer',
      targetDesig.name_en
    ]);
    const testVolId = resAddVol.insertId;
    assert(testVolId > 0, `Created test volunteer with ID: ${testVolId}`);

    // Verify Volunteer Query Join
    const [volJoinRows] = await db.query(`
      SELECT v.id, v.reference_no, v.full_name, v.department_id, v.role_id, v.designation_id,
             d.name_en as department_name_en, ur.name_en as role_name_en, des.name_en as designation_name_en
      FROM volunteer_applications v
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN user_roles ur ON v.role_id = ur.id
      LEFT JOIN designations des ON v.designation_id = des.id
      WHERE v.id = ?
    `, [testVolId]);

    assert(volJoinRows.length === 1, 'Volunteer join query returned exactly 1 record');
    const vRow = volJoinRows[0];
    assert(vRow.department_name_en === targetDept.name_en, `Volunteer Department joined correctly: ${vRow.department_name_en}`);
    assert(vRow.role_name_en === targetRole.name_en, `Volunteer Role joined correctly: ${vRow.role_name_en}`);
    assert(vRow.designation_name_en === targetDesig.name_en, `Volunteer Designation joined correctly: ${vRow.designation_name_en}`);

    // Test Update Volunteer Assignment
    await db.query(`
      UPDATE volunteer_applications SET department_id = ?, designation = ? WHERE id = ?
    `, [newDept.id, 'Senior Field Relief Lead', testVolId]);
    const [[updatedVol]] = await db.query('SELECT department_id, designation FROM volunteer_applications WHERE id = ?', [testVolId]);
    assert(updatedVol.department_id === newDept.id && updatedVol.designation === 'Senior Field Relief Lead', 'Volunteer assignment update persistently saved in DB');

    // Clean up test volunteer
    await db.query('DELETE FROM volunteer_applications WHERE id = ?', [testVolId]);
    assert(true, 'Test volunteer cleaned up');

    // 7. TEST PROJECT CATEGORY ASSIGNMENT
    console.log('\n7. Testing Welfare Project Category Dynamic Assignment...');
    const catId = cats[0].id;
    const testProjectSlug = `test-project-${Date.now()}`;
    const [resAddProj] = await db.query(`
      INSERT INTO projects (
        title_en, title_ur, slug, category_id, goal_amount, raised_amount,
        short_desc_en, short_desc_ur, status
      ) VALUES (?, ?, ?, ?, 1000000, 0, 'Test short desc en', 'ٹیسٹ تفصیل', 'active')
    `, ['Test Welfare Initiative', 'ٹیسٹ فلاحی منصوبہ', testProjectSlug, catId]);
    const testProjId = resAddProj.insertId;
    assert(testProjId > 0, `Created test welfare project with ID: ${testProjId}`);

    const [projJoinRows] = await db.query(`
      SELECT p.id, p.title_en, p.category_id, c.name_en as category_name_en, c.slug as category_slug
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [testProjId]);
    assert(projJoinRows.length === 1, 'Project query returned 1 record');
    assert(projJoinRows[0].category_name_en === cats[0].name_en, `Project joined to category: ${projJoinRows[0].category_name_en}`);

    // Clean up test project
    await db.query('DELETE FROM projects WHERE id = ?', [testProjId]);
    assert(true, 'Test project cleaned up');

    console.log('\n========================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}

testOrgSetup();
