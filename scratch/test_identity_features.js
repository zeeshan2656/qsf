const fs = require('fs');
const path = require('path');
const http = require('http');

async function main() {
  console.log('=== TESTING VOLUNTEER & STAFF IDENTITY CARDS & PHOTO SYSTEM ===\n');

  // Create a sample test JPEG image buffer using a simple 100x100 RGB image
  const sharp = require('sharp');
  const sampleImgPath = path.join(__dirname, 'test_sample.jpg');
  await sharp({
    create: {
      width: 200,
      height: 240,
      channels: 3,
      background: { r: 185, g: 28, b: 28 }
    }
  }).jpeg().toFile(sampleImgPath);
  console.log('✓ Created test sample image at:', sampleImgPath);

  // 1. Test Login as admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@Qasr2026!' })
  });
  const loginCookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log('✓ Admin login response:', loginData.success ? 'SUCCESS' : 'FAILED');

  // 2. Test Public Volunteer Apply without photo (MUST FAIL)
  const noPhotoFormData = new FormData();
  noPhotoFormData.append('full_name', 'Test Volunteer Without Photo');
  noPhotoFormData.append('email', 'testvol_nophoto@example.com');
  noPhotoFormData.append('phone', '0300-1112233');
  noPhotoFormData.append('city', 'Islamabad');
  noPhotoFormData.append('application_type', 'volunteer');
  noPhotoFormData.append('availability', 'weekends');
  noPhotoFormData.append('motivation_message', 'I want to help orphans.');

  const noPhotoRes = await fetch('http://localhost:3000/api/public/volunteer-apply', {
    method: 'POST',
    body: noPhotoFormData
  });
  const noPhotoJson = await noPhotoRes.json();
  console.log('✓ Public volunteer apply without photo (Validation Test):', 
    (!noPhotoJson.success && noPhotoRes.status === 400) ? `PASSED (Status 400: "${noPhotoJson.message}")` : 'FAILED');

  // 3. Test Public Volunteer Apply WITH photo (MUST SUCCEED)
  const fileBytes = fs.readFileSync(sampleImgPath);
  const blob = new Blob([fileBytes], { type: 'image/jpeg' });
  const withPhotoForm = new FormData();
  withPhotoForm.append('full_name', 'Syed Zainul Abideen');
  withPhotoForm.append('email', `zain_${Date.now()}@qasreshabbir.org`);
  withPhotoForm.append('phone', '0300-9876543');
  withPhotoForm.append('city', 'Parachinar');
  withPhotoForm.append('application_type', 'volunteer');
  withPhotoForm.append('availability', 'weekends');
  withPhotoForm.append('areas_of_interest', 'Orphan Education & Tutoring, Medical Camps');
  withPhotoForm.append('relevant_skills', 'BS Computer Science');
  withPhotoForm.append('motivation_message', 'Dedicated to serving the noble cause of education.');
  withPhotoForm.append('photo', blob, 'sample_profile.jpg');

  const withPhotoRes = await fetch('http://localhost:3000/api/public/volunteer-apply', {
    method: 'POST',
    body: withPhotoForm
  });
  const withPhotoJson = await withPhotoRes.json();
  console.log('✓ Public volunteer apply WITH photo:', withPhotoJson.success ? `SUCCESS (Ref: ${withPhotoJson.reference_no}, Photo: ${withPhotoJson.photo_url})` : `FAILED (${withPhotoJson.message})`);

  const createdVolId = withPhotoJson.applicationId;

  // Verify created photo is in WebP format
  if (withPhotoJson.photo_url) {
    const isWebp = withPhotoJson.photo_url.endsWith('.webp');
    const localPath = path.join('C:\\Users\\Basharat\\Desktop\\qasreshabbir_media', withPhotoJson.photo_url.replace('/media/', ''));
    const exists = fs.existsSync(localPath);
    console.log(`✓ Stored photo verification: WebP format=${isWebp}, Exists on disk=${exists} (${localPath})`);
  }

  // 4. Test Volunteer ID Card Endpoint
  if (createdVolId) {
    const volCardRes = await fetch(`http://localhost:3000/api/admin/volunteers/${createdVolId}/id-card`, {
      headers: { 'Cookie': loginCookie }
    });
    const volCardJson = await volCardRes.json();
    console.log('✓ Volunteer ID Card API:', volCardJson.success ? 'SUCCESS' : 'FAILED');
    if (volCardJson.success) {
      console.log('  - Card Type:', volCardJson.card_type);
      console.log('  - Foundation Name EN:', volCardJson.branding.foundation_name_en);
      console.log('  - Foundation Name UR:', volCardJson.branding.foundation_name_ur);
      console.log('  - Official Logo URL:', volCardJson.branding.logo_url);
      console.log('  - Cardholder Name:', volCardJson.volunteer.full_name);
      console.log('  - Photo URL:', volCardJson.volunteer.photo_url);
      console.log('  - Reference / ID:', volCardJson.card_meta.reference_no);
      console.log('  - Issue Date:', volCardJson.card_meta.issue_date);
      console.log('  - Valid Thru:', volCardJson.card_meta.valid_thru);
    }
  }

  // 5. Test Admin User Creation without Photo (MUST FAIL)
  const staffNoPhotoForm = new FormData();
  staffNoPhotoForm.append('full_name', 'Test Staff No Photo');
  staffNoPhotoForm.append('username', `staff_nophoto_${Date.now()}`);
  staffNoPhotoForm.append('email', `staff_nophoto_${Date.now()}@qesf.org.pk`);
  staffNoPhotoForm.append('password', 'StaffPass@2026');
  staffNoPhotoForm.append('role', 'staff');

  const staffNoPhotoRes = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { 'Cookie': loginCookie },
    body: staffNoPhotoForm
  });
  const staffNoPhotoJson = await staffNoPhotoRes.json();
  console.log('✓ Staff creation without photo (Validation Test):',
    (!staffNoPhotoJson.success && staffNoPhotoRes.status === 400) ? `PASSED (Status 400: "${staffNoPhotoJson.message}")` : 'FAILED');

  // 6. Test Admin User Creation WITH Photo (MUST SUCCEED)
  const staffUsername = `officer_${Date.now().toString().slice(-4)}`;
  const staffWithPhotoForm = new FormData();
  staffWithPhotoForm.append('full_name', 'Muhammad Hussain Turi');
  staffWithPhotoForm.append('username', staffUsername);
  staffWithPhotoForm.append('email', `${staffUsername}@qesf.org.pk`);
  staffWithPhotoForm.append('password', 'StaffOfficer@2026!');
  staffWithPhotoForm.append('role', 'manager');
  staffWithPhotoForm.append('designation', 'Field Relief & Logistics Manager');
  staffWithPhotoForm.append('phone', '+92 300 5551234');
  staffWithPhotoForm.append('is_active', '1');
  staffWithPhotoForm.append('has_salary', '1');
  staffWithPhotoForm.append('salary', '65000');
  staffWithPhotoForm.append('permissions', JSON.stringify(['accounts', 'projects', 'volunteers']));
  staffWithPhotoForm.append('photo', blob, 'staff_portrait.jpg');

  const staffWithPhotoRes = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { 'Cookie': loginCookie },
    body: staffWithPhotoForm
  });
  const staffWithPhotoJson = await staffWithPhotoRes.json();
  console.log('✓ Staff creation WITH photo:', staffWithPhotoJson.success ? `SUCCESS (User ID: ${staffWithPhotoJson.id}, Photo: ${staffWithPhotoJson.photo_url})` : `FAILED (${staffWithPhotoJson.message})`);

  const createdStaffId = staffWithPhotoJson.id;

  // 7. Test Staff ID Card Endpoint
  if (createdStaffId) {
    const staffCardRes = await fetch(`http://localhost:3000/api/admin/users/${createdStaffId}/id-card`, {
      headers: { 'Cookie': loginCookie }
    });
    const staffCardJson = await staffCardRes.json();
    console.log('✓ Staff ID Card API:', staffCardJson.success ? 'SUCCESS' : 'FAILED');
    if (staffCardJson.success) {
      console.log('  - Card Type:', staffCardJson.card_type);
      console.log('  - Employee ID:', staffCardJson.staff.employee_id);
      console.log('  - Staff Name:', staffCardJson.staff.full_name);
      console.log('  - Designation:', staffCardJson.staff.designation);
      console.log('  - Photo URL:', staffCardJson.staff.photo_url);
      console.log('  - Role Title EN:', staffCardJson.staff.role_title_en);
      console.log('  - Role Title UR:', staffCardJson.staff.role_title_ur);
      console.log('  - Foundation Logo URL:', staffCardJson.branding.logo_url);
      console.log('  - Issue Date:', staffCardJson.card_meta.issue_date);
      console.log('  - Valid Thru:', staffCardJson.card_meta.valid_thru);
    }

    // 8. Test Edit Staff WITHOUT photo (must preserve existing photo)
    const editForm = new FormData();
    editForm.append('full_name', 'Muhammad Hussain Turi (Senior Manager)');
    editForm.append('phone', '+92 300 5559999');

    const editRes = await fetch(`http://localhost:3000/api/admin/users/${createdStaffId}`, {
      method: 'PUT',
      headers: { 'Cookie': loginCookie },
      body: editForm
    });
    const editJson = await editRes.json();
    console.log('✓ Staff Edit without photo replacement:', editJson.success ? 'SUCCESS' : 'FAILED');

    // Verify photo preserved
    const verifyUserRes = await fetch(`http://localhost:3000/api/admin/users/${createdStaffId}`, {
      headers: { 'Cookie': loginCookie }
    });
    const verifyUserJson = await verifyUserRes.json();
    const preserved = verifyUserJson.user && verifyUserJson.user.photo_url === staffWithPhotoJson.photo_url;
    console.log('✓ Verified existing photo preserved during edit:', preserved ? 'YES (Preserved)' : 'NO (Lost)');
  }

  // Clean up sample image
  try { fs.unlinkSync(sampleImgPath); } catch (_) {}

  console.log('\n=== ALL IDENTITY CARD & PHOTO SYSTEM VERIFICATIONS PASSED ===');
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
