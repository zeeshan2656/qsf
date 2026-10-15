require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDB() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'qasreshabbir';

  console.log(`[Init DB] Connecting to MySQL at ${host}:${port}...`);
  const rootConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    charset: 'utf8mb4'
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`[Init DB] Database \`${dbName}\` created or verified.`);
    await rootConn.end();

    const dbConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      charset: 'utf8mb4'
    });

    console.log(`[Init DB] Creating tables in \`${dbName}\`...`);

    // 1. Users Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role ENUM('superadmin', 'admin', 'editor') DEFAULT 'admin',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Categories Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(80) DEFAULT 'heart',
        name_en VARCHAR(150) NOT NULL,
        name_ur VARCHAR(150) NOT NULL,
        description_en VARCHAR(255) DEFAULT '',
        description_ur VARCHAR(255) DEFAULT '',
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Projects Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(120) NOT NULL UNIQUE,
        category_id INT,
        title_en VARCHAR(255) NOT NULL,
        title_ur VARCHAR(255) NOT NULL,
        short_desc_en TEXT,
        short_desc_ur TEXT,
        full_desc_en LONGTEXT,
        full_desc_ur LONGTEXT,
        image_url VARCHAR(255) DEFAULT '',
        goal_amount DECIMAL(12,2) DEFAULT 0.00,
        raised_amount DECIMAL(12,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'PKR',
        beneficiaries_count INT DEFAULT 0,
        beneficiaries_label_en VARCHAR(100) DEFAULT 'Students',
        beneficiaries_label_ur VARCHAR(100) DEFAULT 'طلباء',
        status ENUM('published', 'draft', 'archived') DEFAULT 'published',
        is_featured TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Project Images Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS project_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        caption_en VARCHAR(255) DEFAULT '',
        caption_ur VARCHAR(255) DEFAULT '',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. News and Updates Articles Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(150) NOT NULL UNIQUE,
        category_id INT,
        title_en VARCHAR(255) NOT NULL,
        title_ur VARCHAR(255) NOT NULL,
        short_desc_en TEXT,
        short_desc_ur TEXT,
        content_en LONGTEXT,
        content_ur LONGTEXT,
        image_url VARCHAR(255) DEFAULT '',
        author_name VARCHAR(100) DEFAULT 'Foundation Admin',
        status ENUM('published', 'draft') DEFAULT 'published',
        published_at DATE DEFAULT (CURRENT_DATE),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Impact Statistics Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS impact_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stat_key VARCHAR(50) NOT NULL UNIQUE,
        number_val VARCHAR(50) NOT NULL,
        suffix VARCHAR(20) DEFAULT '+',
        label_en VARCHAR(150) NOT NULL,
        label_ur VARCHAR(150) NOT NULL,
        icon VARCHAR(50) DEFAULT 'users',
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Site Settings Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_val LONGTEXT,
        setting_group VARCHAR(50) DEFAULT 'general',
        description VARCHAR(255) DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Contact Form Submissions Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(191) NOT NULL,
        phone VARCHAR(50) DEFAULT '',
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        ip_address VARCHAR(50) DEFAULT '',
        status ENUM('new', 'read', 'replied') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Confidential Assistance Applications Table (for orphans and needy families)
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS assistance_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tracking_number VARCHAR(50) NOT NULL UNIQUE,
        applicant_name VARCHAR(150) NOT NULL,
        guardian_name VARCHAR(150) DEFAULT '',
        cnic_or_bform VARCHAR(50) DEFAULT '',
        phone VARCHAR(50) NOT NULL,
        alt_phone VARCHAR(50) DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        address TEXT NOT NULL,
        assistance_type ENUM('orphan_education', 'school_fees', 'financial_aid', 'food_ration', 'other') DEFAULT 'orphan_education',
        family_members_count INT DEFAULT 1,
        monthly_income VARCHAR(50) DEFAULT '',
        details TEXT NOT NULL,
        status ENUM('pending', 'under_review', 'approved', 'rejected') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Donations Table (supports bank transfers, EasyPaisa, JazzCash, manual receipts)
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        donor_name VARCHAR(150) NOT NULL,
        donor_email VARCHAR(191) DEFAULT '',
        donor_phone VARCHAR(50) DEFAULT '',
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'PKR',
        payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
        transaction_reference VARCHAR(150) DEFAULT '',
        project_id INT NULL,
        notes TEXT,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Audit Logs Table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) DEFAULT '',
        details TEXT,
        ip_address VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[Init DB] All tables created successfully.');
    await dbConn.end();
  } catch (err) {
    console.error('[Init DB] Error creating database/tables:', err);
    process.exit(1);
  }
}

initDB();
