const db = require('../config/db');

(async () => {
  try {
    console.log('Running database migrations...');

    // 1. Create official_signatures table
    await db.query(`
      CREATE TABLE IF NOT EXISTS official_signatures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        designation VARCHAR(150) DEFAULT NULL,
        designation_ur VARCHAR(150) DEFAULT NULL,
        signature_url VARCHAR(255) NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        uploaded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Checked/Created official_signatures table.');

    // 2. Add designation_ur and signature_id to users if not present
    const [userCols] = await db.query('DESCRIBE users');
    const userColNames = userCols.map(c => c.Field);
    
    if (!userColNames.includes('designation_ur')) {
      await db.query('ALTER TABLE users ADD COLUMN designation_ur VARCHAR(150) NULL AFTER designation');
      console.log('Added designation_ur column to users table.');
    }
    if (!userColNames.includes('signature_id')) {
      await db.query('ALTER TABLE users ADD COLUMN signature_id INT NULL AFTER designation_ur');
      console.log('Added signature_id column to users table.');
    }

    // 3. Add designation, designation_ur, and signature_id to volunteer_applications if not present
    const [volCols] = await db.query('DESCRIBE volunteer_applications');
    const volColNames = volCols.map(c => c.Field);

    if (!volColNames.includes('designation')) {
      await db.query('ALTER TABLE volunteer_applications ADD COLUMN designation VARCHAR(150) NULL AFTER application_type');
      console.log('Added designation column to volunteer_applications table.');
    }
    if (!volColNames.includes('designation_ur')) {
      await db.query('ALTER TABLE volunteer_applications ADD COLUMN designation_ur VARCHAR(150) NULL AFTER designation');
      console.log('Added designation_ur column to volunteer_applications table.');
    }
    if (!volColNames.includes('signature_id')) {
      await db.query('ALTER TABLE volunteer_applications ADD COLUMN signature_id INT NULL AFTER designation_ur');
      console.log('Added signature_id column to volunteer_applications table.');
    }

    // 4. Update finance_officer permissions to purely financial ['accounts', 'donations']
    await db.query(
      `UPDATE users SET permissions = '["accounts","donations"]' WHERE username = 'finance_officer'`
    );
    console.log('Updated finance_officer permissions to accounts and donations only.');

    // 5. Check if default official signature exists
    const [sigs] = await db.query('SELECT COUNT(*) as cnt FROM official_signatures');
    if (sigs[0].cnt === 0) {
      await db.query(`
        INSERT INTO official_signatures (name, designation, designation_ur, signature_url, is_default, uploaded_by)
        VALUES (?, ?, ?, ?, 1, 1)
      `, [
        'Dr. Ghulam Shabbir',
        'Founder & Chief Executive Officer',
        'بانی و چیف ایگزیکٹو آفیسر',
        '/media/branding/official_signature_ceo.webp'
      ]);
      console.log('Seeded default official signature for CEO.');
    }

    console.log('All migrations executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
