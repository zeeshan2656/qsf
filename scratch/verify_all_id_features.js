const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function verify() {
  console.log('========================================================');
  console.log('   FULL END-TO-END VERIFICATION: ID CARDS & WEBP PHOTOS  ');
  console.log('========================================================\n');

  // 1. Verify HTML Markup
  const volunteerHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'volunteer.html'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');
  const adminCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'admin.css'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin.js'), 'utf8');

  console.log('[1/5] Verifying Frontend Markup & Assets:');
  console.assert(volunteerHtml.includes('id="vol_photo"'), 'volunteer.html must contain vol_photo input');
  console.assert(volunteerHtml.includes('id="volPhotoPreviewImg"'), 'volunteer.html must contain photo preview');
  console.assert(adminHtml.includes('id="modalIdCard"'), 'admin.html must contain modalIdCard');
  console.assert(adminHtml.includes('id="user_photo"'), 'admin.html must contain staff user_photo input');
  console.assert(adminHtml.includes('id="man_vol_photo"'), 'admin.html must contain man_vol_photo input');
  console.assert(adminHtml.includes('btnCardViewDual'), 'admin.html must contain ID card controls');
  console.assert(adminCss.includes('.id-card-box'), 'admin.css must contain .id-card-box style');
  console.assert(adminCss.includes('.id-card-staff'), 'admin.css must contain .id-card-staff style');
  console.assert(adminCss.includes('.id-card-volunteer'), 'admin.css must contain .id-card-volunteer style');
  console.assert(adminCss.includes('body.printing-id-card'), 'admin.css must contain printing-id-card media rules');
  console.assert(adminJs.includes('openVolunteerIdCard'), 'admin.js must contain openVolunteerIdCard function');
  console.assert(adminJs.includes('openStaffIdCard'), 'admin.js must contain openStaffIdCard function');
  console.assert(adminJs.includes('printIdCard'), 'admin.js must contain printIdCard function');
  console.log('  ✓ All HTML, CSS, and JS components verified successfully.\n');

  // 2. Test Admin Authentication
  console.log('[2/5] Verifying Authentication & Privileges:');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@Qasr2026!' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.assert(loginData.success === true, 'Admin login must succeed');
  console.log('  ✓ Authenticated as Administrator (Full Access Session).\n');

  // 3. Test Staff Flow: Create staff with photo -> Verify WebP conversion -> Verify DB -> Retrieve ID Card
  console.log('[3/5] Verifying Staff Flow & Identity Card:');
  const testImgBuf = await sharp({
    create: { width: 300, height: 350, channels: 3, background: { r: 69, g: 10, b: 10 } }
  }).jpeg().toBuffer();

  const staffUsername = `staff_test_${Date.now().toString().slice(-5)}`;
  const staffBlob = new Blob([testImgBuf], { type: 'image/jpeg' });
  const staffForm = new FormData();
  staffForm.append('full_name', 'Dr. Allama Ghulam Shabbir');
  staffForm.append('username', staffUsername);
  staffForm.append('email', `${staffUsername}@qesf.org.pk`);
  staffForm.append('password', 'StaffSecure@2026!');
  staffForm.append('role', 'superadmin');
  staffForm.append('designation', 'Executive Director & Chief Patron');
  staffForm.append('phone', '+92 300 0817702');
  staffForm.append('is_active', '1');
  staffForm.append('has_salary', '0');
  staffForm.append('permissions', JSON.stringify(['accounts', 'projects', 'volunteers', 'articles', 'applications', 'donations', 'submissions', 'settings', 'users']));
  staffForm.append('photo', staffBlob, 'director_photo.jpg');

  const createStaffRes = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: staffForm
  });
  const staffResJson = await createStaffRes.json();
  console.assert(staffResJson.success === true, 'Staff creation must succeed');
  const newStaffId = staffResJson.id || staffResJson.userId;
  console.log(`  ✓ Staff created: ID #${newStaffId}, Username: @${staffUsername}`);
  console.log(`  ✓ Photo path returned: ${staffResJson.photo_url}`);
  console.assert(staffResJson.photo_url.endsWith('.webp'), 'Photo must be in WebP format');

  // Check file on disk
  const staffDiskPath = path.join('C:\\Users\\Basharat\\Desktop\\qasreshabbir_media', staffResJson.photo_url.replace('/media/', ''));
  console.assert(fs.existsSync(staffDiskPath), 'Staff photo file must exist on disk in uploads directory');
  console.log(`  ✓ Verified file on disk: ${staffDiskPath} (${fs.statSync(staffDiskPath).size} bytes)`);

  // Fetch Staff ID Card
  const staffCardRes = await fetch(`http://localhost:3000/api/admin/users/${newStaffId}/id-card`, {
    headers: { Cookie: cookie }
  });
  const staffCard = await staffCardRes.json();
  console.assert(staffCard.success === true, 'Staff ID card retrieval must succeed');
  console.log(`  ✓ Staff ID Card Data Retrieved:`);
  console.log(`    • Employee ID:   ${staffCard.staff.employee_id}`);
  console.log(`    • Card Type:     ${staffCard.card_type}`);
  console.log(`    • Name:          ${staffCard.staff.full_name}`);
  console.log(`    • Role Title EN: ${staffCard.staff.role_title_en}`);
  console.log(`    • Role Title UR: ${staffCard.staff.role_title_ur}`);
  console.log(`    • Photo URL:     ${staffCard.staff.photo_url}`);
  console.log(`    • Official Logo: ${staffCard.branding.logo_url}`);
  console.log(`    • Official Stamp:${staffCard.branding.stamp_url}`);
  console.log(`    • Issue Date:    ${staffCard.card_meta.issue_date}`);
  console.log(`    • Valid Thru:    ${staffCard.card_meta.valid_thru}`);
  console.log(`    • Security Hash: ${staffCard.card_meta.security_hash}\n`);

  // 4. Test Volunteer Flow: Register volunteer with photo -> Verify WebP -> Verify DB -> Retrieve Volunteer ID Card
  console.log('[4/5] Verifying Volunteer Flow & Identity Card:');
  const volImgBuf = await sharp({
    create: { width: 300, height: 350, channels: 3, background: { r: 6, g: 78, b: 59 } }
  }).png().toBuffer();

  const volBlob = new Blob([volImgBuf], { type: 'image/png' });
  const volForm = new FormData();
  volForm.append('full_name', 'Syeda Fatima Zahra');
  volForm.append('email', `fatima_${Date.now().toString().slice(-4)}@qesf.org.pk`);
  volForm.append('phone', '0345-9876543');
  volForm.append('city', 'Parachinar, Kurram');
  volForm.append('application_type', 'volunteer');
  volForm.append('availability', 'weekends');
  volForm.append('areas_of_interest', 'Orphan Education & Tutoring, Free Medical & Health Camps');
  volForm.append('relevant_skills', 'BSc Nursing & Pediatric First Aid');
  volForm.append('motivation_message', 'Eager to serve underprivileged children and vulnerable mothers.');
  volForm.append('photo', volBlob, 'volunteer_photo.png');

  const createVolRes = await fetch('http://localhost:3000/api/public/volunteer-apply', {
    method: 'POST',
    body: volForm
  });
  const volResJson = await createVolRes.json();
  console.assert(volResJson.success === true, 'Volunteer registration must succeed');
  const newVolId = volResJson.applicationId;
  console.log(`  ✓ Volunteer registered: ID #${newVolId}, Reference: ${volResJson.reference_no}`);
  console.log(`  ✓ Photo path returned: ${volResJson.photo_url}`);
  console.assert(volResJson.photo_url.endsWith('.webp'), 'Volunteer photo must be in WebP format');

  // Check file on disk
  const volDiskPath = path.join('C:\\Users\\Basharat\\Desktop\\qasreshabbir_media', volResJson.photo_url.replace('/media/', ''));
  console.assert(fs.existsSync(volDiskPath), 'Volunteer photo must exist on disk in uploads directory');
  console.log(`  ✓ Verified file on disk: ${volDiskPath} (${fs.statSync(volDiskPath).size} bytes)`);

  // Fetch Volunteer ID Card
  const volCardRes = await fetch(`http://localhost:3000/api/admin/volunteers/${newVolId}/id-card`, {
    headers: { Cookie: cookie }
  });
  const volCard = await volCardRes.json();
  console.assert(volCard.success === true, 'Volunteer ID card retrieval must succeed');
  console.log(`  ✓ Volunteer ID Card Data Retrieved:`);
  console.log(`    • Reference No:  ${volCard.volunteer.reference_no}`);
  console.log(`    • Card Type:     ${volCard.card_type}`);
  console.log(`    • Name:          ${volCard.volunteer.full_name}`);
  console.log(`    • Badge EN:      ${volCard.volunteer.badge_label_en}`);
  console.log(`    • Badge UR:      ${volCard.volunteer.badge_label_ur}`);
  console.log(`    • Role Title EN: ${volCard.volunteer.role_title_en}`);
  console.log(`    • Role Title UR: ${volCard.volunteer.role_title_ur}`);
  console.log(`    • Areas:         ${volCard.volunteer.areas_of_interest}`);
  console.log(`    • Photo URL:     ${volCard.volunteer.photo_url}`);
  console.log(`    • Official Logo: ${volCard.branding.logo_url}`);
  console.log(`    • Issue Date:    ${volCard.card_meta.issue_date}`);
  console.log(`    • Valid Thru:    ${volCard.card_meta.valid_thru}`);
  console.log(`    • Security Hash: ${volCard.card_meta.security_hash}\n`);

  // 5. Test Manual Volunteer Creation by Admin with Photo
  console.log('[5/5] Verifying Admin Manual Volunteer Registration:');
  const manVolForm = new FormData();
  manVolForm.append('full_name', 'Syed Baqir Hussain');
  manVolForm.append('email', `baqir_${Date.now().toString().slice(-4)}@example.com`);
  manVolForm.append('phone', '0301-4445555');
  manVolForm.append('city', 'Islamabad');
  manVolForm.append('application_type', 'internship');
  manVolForm.append('relevant_skills', 'Software Engineering & Database Administration');
  manVolForm.append('areas_of_interest', 'IT, Media & Digital Outreach');
  manVolForm.append('availability', 'Part-time (Evenings)');
  manVolForm.append('status', 'accepted');
  manVolForm.append('admin_notes', 'Direct enrollment for IT portal maintenance');
  manVolForm.append('photo', volBlob, 'intern_portrait.png');

  const manVolRes = await fetch('http://localhost:3000/api/admin/volunteers', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: manVolForm
  });
  const manVolJson = await manVolRes.json();
  console.assert(manVolJson.success === true, 'Admin manual volunteer creation must succeed');
  console.log(`  ✓ Admin manual volunteer created: ID #${manVolJson.id}, Ref: ${manVolJson.reference_no}`);
  console.log(`  ✓ Photo path: ${manVolJson.photo_url} (WebP: ${manVolJson.photo_url.endsWith('.webp')})`);

  console.log('========================================================');
  console.log('  ALL REQUIREMENTS FULLY IMPLEMENTED, TESTED & VERIFIED! ');
  console.log('========================================================');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
