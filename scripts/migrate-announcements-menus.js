require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'qasreshabbir';

  console.log(`[Migration] Connecting to MySQL database ${dbName}...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    // 1. Create announcements table
    console.log('[Migration] Creating `announcements` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content_en TEXT NOT NULL,
        content_ur TEXT DEFAULT NULL,
        link_url VARCHAR(255) DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active_sort (is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create header_menus table
    console.log('[Migration] Creating `header_menus` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS header_menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_key VARCHAR(50) NOT NULL UNIQUE,
        title_en VARCHAR(150) NOT NULL,
        title_ur VARCHAR(150) DEFAULT NULL,
        row_num TINYINT NOT NULL DEFAULT 1,
        col_side VARCHAR(10) NOT NULL DEFAULT 'left',
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active_order (is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create header_menu_items table
    console.log('[Migration] Creating `header_menu_items` table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS header_menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_id INT NOT NULL,
        title_en VARCHAR(150) NOT NULL,
        title_ur VARCHAR(150) DEFAULT NULL,
        page_url VARCHAR(255) NOT NULL,
        open_new_tab TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES header_menus(id) ON DELETE CASCADE,
        INDEX idx_menu_active (menu_id, is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed initial Announcement if table is empty
    const [[{ annCount }]] = await conn.query('SELECT COUNT(*) as annCount FROM announcements');
    if (annCount === 0) {
      console.log('[Migration] Seeding initial announcement...');
      await conn.query(`
        INSERT INTO announcements (content_en, content_ur, link_url, is_active, sort_order)
        VALUES 
        ('Welcome to Qasr-e-Shabbir Foundation - Dedicated to educational sponsorship of orphaned children and monthly welfare for vulnerable families in Pakistan.',
         'قصرِ شبیر فاؤنڈیشن میں خوش آمدید - یتیم بچوں کی تعلیمی کفالت، ماہانہ راشن اور مستحق خاندانوں کی فلاح و بہبود کے لیے کوشاں۔',
         '/about', 1, 1);
      `);
    }

    // 5. Seed initial Header Menus matching reference design if empty
    const [[{ menuCount }]] = await conn.query('SELECT COUNT(*) as menuCount FROM header_menus');
    if (menuCount === 0) {
      console.log('[Migration] Seeding initial header menus (Menu 1, Menu 2, Menu 3, Menu 4)...');
      
      // Menu 1 (Row 1 Left - Red)
      const [res1] = await conn.query(`
        INSERT INTO header_menus (menu_key, title_en, title_ur, row_num, col_side, is_active, sort_order)
        VALUES ('menu_1', 'This our menu 1', 'ہمارا مینو ۱', 1, 'left', 1, 1);
      `);
      const menu1Id = res1.insertId;

      // Menu 2 (Row 1 Right - Red)
      const [res2] = await conn.query(`
        INSERT INTO header_menus (menu_key, title_en, title_ur, row_num, col_side, is_active, sort_order)
        VALUES ('menu_2', 'This our menu 2', 'ہمارا مینو ۲', 1, 'right', 1, 2);
      `);
      const menu2Id = res2.insertId;

      // Menu 3 (Row 2 Left - Blue)
      const [res3] = await conn.query(`
        INSERT INTO header_menus (menu_key, title_en, title_ur, row_num, col_side, is_active, sort_order)
        VALUES ('menu_3', 'This our menu 3', 'ہمارا مینو ۳', 2, 'left', 1, 3);
      `);
      const menu3Id = res3.insertId;

      // Menu 4 (Row 2 Right - Blue)
      const [res4] = await conn.query(`
        INSERT INTO header_menus (menu_key, title_en, title_ur, row_num, col_side, is_active, sort_order)
        VALUES ('menu_4', 'This our menu 4', 'ہمارا مینو ۴', 2, 'right', 1, 4);
      `);
      const menu4Id = res4.insertId;

      // Seed items for Menu 1
      await conn.query(`
        INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, is_active, sort_order)
        VALUES 
        (${menu1Id}, 'Home', 'ہوم', '/', 1, 1),
        (${menu1Id}, 'About Us', 'ہمارے بارے میں', '/about', 1, 2);
      `);

      // Seed items for Menu 2
      await conn.query(`
        INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, is_active, sort_order)
        VALUES 
        (${menu2Id}, 'Welfare Projects', 'فلاحی منصوبے', '/projects', 1, 1),
        (${menu2Id}, 'News & Updates', 'خبریں اور اعلانات', '/news', 1, 2);
      `);

      // Seed items for Menu 3
      await conn.query(`
        INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, is_active, sort_order)
        VALUES 
        (${menu3Id}, 'Apply for Assistance', 'مدد کی درخواست', '/apply', 1, 1),
        (${menu3Id}, 'Become a Volunteer', 'رضاکار بنیں', '/volunteer', 1, 2);
      `);

      // Seed items for Menu 4
      await conn.query(`
        INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, is_active, sort_order)
        VALUES 
        (${menu4Id}, 'Donate Now', 'عطیہ دیں', '/donate', 1, 1),
        (${menu4Id}, 'Contact Us', 'رابطہ کریں', '/contact', 1, 2);
      `);

      console.log('[Migration] Successfully seeded 4 menus and 8 assigned page links.');
    }

    console.log('[Migration] Database migration completed successfully.');
  } catch (err) {
    console.error('[Migration Error]', err);
    throw err;
  } finally {
    await conn.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
