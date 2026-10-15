const db = require('../config/db');

async function seedDashboard() {
  console.log('Seeding rich dummy data for dashboard...');

  // 1. Seed Assistance Applications
  const apps = [
    {
      tracking_number: 'QASR-APP-2026-001',
      applicant_name: 'Hamza Ali (Age 11)',
      guardian_name: 'Fatima Bibi (Mother/Widow)',
      cnic_or_bform: '35201-1928374-5',
      phone: '0301-4455667',
      alt_phone: '0321-9988776',
      city: 'Lahore',
      address: 'House 42, St 5, Kot Lakhpat, Lahore',
      assistance_type: 'education',
      family_members_count: 4,
      monthly_income: 18000.00,
      details: 'Father passed away in 2024. Student is in 6th grade at Allied School. Unable to pay monthly tuition fee and exam dues.',
      status: 'approved',
      notes: 'School fee slip verified. Approved PKR 4,000/month stipend.'
    },
    {
      tracking_number: 'QASR-APP-2026-002',
      applicant_name: 'Zainab Bibi (Age 9)',
      guardian_name: 'Maryam Khatoon (Grandmother)',
      cnic_or_bform: '36302-8877665-2',
      phone: '0304-7766554',
      alt_phone: '',
      city: 'Multan',
      address: 'Mohallah Eidgah, Near Qasim Bagh, Multan',
      assistance_type: 'education',
      family_members_count: 3,
      monthly_income: 12000.00,
      details: 'Both parents deceased. Living with elderly grandmother. Needs support for uniform, books, and monthly school tuition.',
      status: 'under_review',
      notes: 'Field worker visited on Oct 10; awaiting school verification stamp.'
    },
    {
      tracking_number: 'QASR-APP-2026-003',
      applicant_name: 'Muhammad Bilal (Age 14)',
      guardian_name: 'Aisha Parveen (Mother)',
      cnic_or_bform: '37405-5544332-1',
      phone: '0333-5566778',
      alt_phone: '0315-1122334',
      city: 'Rawalpindi',
      address: 'Dhok Ratta, Street 12, Rawalpindi',
      assistance_type: 'ration',
      family_members_count: 5,
      monthly_income: 15000.00,
      details: 'Orphan family of 5 with no primary earner. Requesting monthly flour, oil, pulses and essentials ration basket.',
      status: 'approved',
      notes: 'Monthly ration package token #R-108 issued.'
    },
    {
      tracking_number: 'QASR-APP-2026-004',
      applicant_name: 'Usman Tariq (Age 16)',
      guardian_name: 'Bushra Begum (Aunt/Guardian)',
      cnic_or_bform: '42101-7788990-3',
      phone: '0321-4433221',
      alt_phone: '',
      city: 'Karachi',
      address: 'Sector 5-E, New Karachi',
      assistance_type: 'education',
      family_members_count: 3,
      monthly_income: 22000.00,
      details: 'Deserving student scored 88% in Matric. Needs assistance for college intermediate admission and science lab fees.',
      status: 'pending',
      notes: 'Application received online. Needs document review.'
    },
    {
      tracking_number: 'QASR-APP-2026-005',
      applicant_name: 'Hassan Raza (Age 8)',
      guardian_name: 'Kaneez Fatima (Mother)',
      cnic_or_bform: '33100-2233445-7',
      phone: '0300-6677889',
      alt_phone: '0345-8899001',
      city: 'Faisalabad',
      address: 'Samundri Road, Chak 224-RB, Faisalabad',
      assistance_type: 'medical',
      family_members_count: 6,
      monthly_income: 14000.00,
      details: 'Young orphan boy diagnosed with acute chronic asthma requiring regular medication and nebulizer equipment support.',
      status: 'approved',
      notes: 'Approved hospital pharmacy voucher at Allied Hospital.'
    },
    {
      tracking_number: 'QASR-APP-2026-006',
      applicant_name: 'Areeba Noor (Age 12)',
      guardian_name: 'Salma Bibi (Mother)',
      cnic_or_bform: '54400-3322110-4',
      phone: '0312-7788991',
      alt_phone: '',
      city: 'Quetta',
      address: 'Brewery Road, Western Bypass, Quetta',
      assistance_type: 'financial',
      family_members_count: 4,
      monthly_income: 16000.00,
      details: 'Widowed mother facing house rent eviction and winter heating crisis in Quetta. Requesting urgent financial aid.',
      status: 'under_review',
      notes: 'Local community representative contacted for verification.'
    }
  ];

  for (const a of apps) {
    await db.query(`
      INSERT INTO assistance_applications (
        tracking_number, applicant_name, guardian_name, cnic_or_bform,
        phone, alt_phone, city, address, assistance_type, family_members_count,
        monthly_income, details, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [
      a.tracking_number, a.applicant_name, a.guardian_name, a.cnic_or_bform,
      a.phone, a.alt_phone, a.city, a.address, a.assistance_type, a.family_members_count,
      a.monthly_income, a.details, a.status, a.notes
    ]);
  }
  console.log(`Inserted ${apps.length} assistance applications.`);

  // 2. Seed Donations
  const [projects] = await db.query('SELECT id, title_en FROM projects LIMIT 4');
  const p1 = projects[0] ? projects[0].id : null;
  const p2 = projects[1] ? projects[1].id : null;
  const p3 = projects[2] ? projects[2].id : null;
  const p4 = projects[3] ? projects[3].id : null;

  const donations = [
    {
      donor_name: 'Tariq Mahmood',
      donor_email: 'tariq.m@example.com',
      donor_phone: '0300-1234567',
      amount: 50000.00,
      currency: 'PKR',
      payment_method: 'Bank Transfer (Meezan Bank)',
      transaction_reference: 'MZN-TXN-882910',
      project_id: p1,
      notes: 'Dedicated for Orphan Education Tuition Program (Annual)',
      status: 'verified'
    },
    {
      donor_name: 'Ayesha Siddiqui',
      donor_email: 'ayesha.s@example.com',
      donor_phone: '0321-9876543',
      amount: 25000.00,
      currency: 'PKR',
      payment_method: 'Bank Transfer (HBL)',
      transaction_reference: 'HBL-9928172',
      project_id: p3,
      notes: 'Monthly food ration packages for 5 deserving widow families',
      status: 'verified'
    },
    {
      donor_name: 'Imran Khan Lodhi',
      donor_email: 'imran.khan@example.com',
      donor_phone: '0333-5551234',
      amount: 100000.00,
      currency: 'PKR',
      payment_method: 'Bank Transfer (Meezan Bank)',
      transaction_reference: 'MZN-4471920',
      project_id: p1,
      notes: 'Zakat contribution for school uniform, books, and fee scholarships',
      status: 'verified'
    },
    {
      donor_name: 'Bilal Ahmed',
      donor_email: 'bilal.a@example.com',
      donor_phone: '0345-7778899',
      amount: 15000.00,
      currency: 'PKR',
      payment_method: 'JazzCash',
      transaction_reference: 'JC-88291029',
      project_id: p4,
      notes: 'Contribution towards solar clean water filtration plant',
      status: 'verified'
    },
    {
      donor_name: 'Farhan Qureshi',
      donor_email: 'farhan.q@example.com',
      donor_phone: '0312-3334455',
      amount: 30000.00,
      currency: 'PKR',
      payment_method: 'EasyPaisa',
      transaction_reference: 'EP-55910283',
      project_id: p2,
      notes: 'Medical relief and prescription medicines for poor patients',
      status: 'pending'
    },
    {
      donor_name: 'Dr. Noman Malik',
      donor_email: 'dr.noman@example.com',
      donor_phone: '0302-6667788',
      amount: 75000.00,
      currency: 'PKR',
      payment_method: 'Bank Transfer (Bank Alfalah)',
      transaction_reference: 'BAFL-3391028',
      project_id: p1,
      notes: 'General donation for education welfare fund',
      status: 'verified'
    }
  ];

  for (const d of donations) {
    await db.query(`
      INSERT INTO donations (
        donor_name, donor_email, donor_phone, amount, currency,
        payment_method, transaction_reference, project_id, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      d.donor_name, d.donor_email, d.donor_phone, d.amount, d.currency,
      d.payment_method, d.transaction_reference, d.project_id, d.notes, d.status
    ]);
  }
  console.log(`Inserted ${donations.length} donation records.`);

  // 3. Seed Contact Submissions
  const contacts = [
    {
      name: 'Zahid Hussain',
      email: 'zahid.h@example.com',
      phone: '0300-8889900',
      subject: 'Volunteer for School Book Distribution',
      message: 'Assalam-o-Alaikum, I am a senior high school teacher in Lahore and would like to offer volunteer support during the upcoming school bag and textbook distribution drive.',
      status: 'unread'
    },
    {
      name: 'Samina Kausar',
      email: 'samina.k@example.com',
      phone: '0322-4445566',
      subject: 'Tax Exemption Receipt for Donation',
      message: 'Greetings, I recently transferred PKR 25,000 via online banking. Kindly share the official foundation stamp tax receipt for corporate CSR reporting.',
      status: 'read'
    },
    {
      name: 'Kashif Mehmood',
      email: 'kashif.m@example.com',
      phone: '0334-1112233',
      subject: 'Orphan Student Sponsorship Inquiry',
      message: 'I want to commit to monthly recurring sponsorship of two orphan girls in primary school. Please guide me through the automated direct debit or standing order process.',
      status: 'replied'
    },
    {
      name: 'Dr. Asim Farooq',
      email: 'dr.asim@example.com',
      phone: '0313-9990011',
      subject: 'Free Medical Camp Collaboration in Faisalabad',
      message: 'Our clinical team of 5 doctors would love to conduct a free pediatric health screening camp in partnership with Qasr-e-Shabbir Foundation for underprivileged children.',
      status: 'unread'
    }
  ];

  for (const c of contacts) {
    await db.query(`
      INSERT INTO contact_submissions (
        name, email, phone, subject, message, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      c.name, c.email, c.phone, c.subject, c.message, c.status
    ]);
  }
  console.log(`Inserted ${contacts.length} contact submissions.`);

  console.log('✅ Dashboard dummy data seeded successfully!');
  process.exit(0);
}

seedDashboard().catch(e => {
  console.error(e);
  process.exit(1);
});
