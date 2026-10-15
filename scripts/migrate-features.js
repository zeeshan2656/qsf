require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'qasreshabbir';

  console.log(`[Migration] Connecting to MySQL at ${host}:${port}/${dbName}...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    // 1. Create volunteer_applications table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS volunteer_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_no VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(191) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        city VARCHAR(100) NOT NULL,
        application_type ENUM('volunteer', 'internship') DEFAULT 'volunteer',
        areas_of_interest TEXT,
        relevant_skills TEXT,
        availability VARCHAR(100) DEFAULT 'flexible',
        motivation_message TEXT NOT NULL,
        status ENUM('pending', 'under_review', 'accepted', 'rejected') DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by INT NULL,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vol_status (status),
        INDEX idx_vol_type (application_type),
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Migration] Table `volunteer_applications` verified/created.');

    // 2. Modify donations table status to allow confirmed, verified, pending, failed, refunded, rejected
    await conn.query(`
      ALTER TABLE donations 
      MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending';
    `);
    console.log('[Migration] Table `donations.status` modified to VARCHAR(50).');

    // Add confirmed_at and payment_channel/notes column if missing
    const [cols] = await conn.query('DESCRIBE donations');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('confirmed_at')) {
      await conn.query('ALTER TABLE donations ADD COLUMN confirmed_at TIMESTAMP NULL AFTER status;');
      console.log('[Migration] Added `confirmed_at` to donations.');
    }

    // 3. Seed initial realistic volunteer applications if empty
    const [[{ volCount }]] = await conn.query('SELECT COUNT(*) as volCount FROM volunteer_applications');
    if (volCount === 0) {
      await conn.query(`
        INSERT INTO volunteer_applications 
        (reference_no, full_name, email, phone, city, application_type, areas_of_interest, relevant_skills, availability, motivation_message, status, admin_notes)
        VALUES 
        ('VOL-2026-1001', 'Syed Zain Ul Abideen', 'zain.abideen@gmail.com', '0300-4567891', 'Lahore', 'volunteer', 'Orphan Education & Tutoring, IT & Social Media', 'BSc Computer Science, Math & English tutor for school students', 'weekends', 'I want to dedicate my weekends to teaching orphan students in Lahore and helping them build computer literacy.', 'accepted', 'Assigned to Lahore Sunday Academy tutoring batch.'),
        ('VOL-2026-1002', 'Fatima Zahra', 'fatima.zahra99@hotmail.com', '0321-9876543', 'Multan', 'internship', 'Medical & Healthcare Camps, Community Welfare', 'Final year MBBS student, experienced in community primary health screening', 'weekdays', 'Seeking a 2-month summer internship to coordinate free medical and eye screening camps for underprivileged families.', 'under_review', 'Contacted applicant for university NOC document.'),
        ('VOL-2026-1003', 'Muhammad Bilal Raza', 'bilal.raza.uet@gmail.com', '0333-1234567', 'Rawalpindi', 'volunteer', 'Ration & Food Distribution, Fund-raising & Outreach', 'Logistics planning, warehouse coordination, volunteer team management', 'flexible', 'Inspired by the transparent welfare work of Qasr-e-Shabbir Foundation. Ready to help in Ramazan ration distribution.', 'pending', NULL)
      `);
      console.log('[Migration] Seeded 3 sample volunteer applications.');
    }

    console.log('[Migration] Migration completed successfully.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err);
    await conn.end();
    process.exit(1);
  }
}

runMigration();
