const db = require('../config/db');

async function migratePages() {
  console.log('[Migration] Creating `pages` table if not exists...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title_en VARCHAR(255) NOT NULL,
      title_ur VARCHAR(255) DEFAULT '',
      slug VARCHAR(150) NOT NULL UNIQUE,
      page_type VARCHAR(50) DEFAULT 'core',
      target_url VARCHAR(255) NOT NULL,
      meta_description_en TEXT,
      meta_description_ur TEXT,
      content_en LONGTEXT,
      content_ur LONGTEXT,
      banner_image_url VARCHAR(255) DEFAULT '',
      is_published TINYINT(1) DEFAULT 1,
      menu_id INT DEFAULT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pages_slug (slug),
      INDEX idx_pages_published (is_published),
      INDEX idx_pages_menu (menu_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('[Migration] Table `pages` created or already exists.');

  const corePages = [
    {
      title_en: 'Home',
      title_ur: 'ہوم',
      slug: 'home',
      page_type: 'core',
      target_url: '/',
      meta_description_en: 'Official website of Qasr-e-Shabbir Foundation - Dedicated to educational, healthcare, and humanitarian services.',
      meta_description_ur: 'قصرِ شبیر فاؤنڈیشن کی سرکاری ویب سائٹ - تعلیم، صحت اور فلاحی خدمات کے لیے کوشاں۔',
      menu_id: 1,
      sort_order: 1,
      is_published: 1
    },
    {
      title_en: 'About Us',
      title_ur: 'ہمارے بارے میں',
      slug: 'about',
      page_type: 'core',
      target_url: '/about',
      meta_description_en: 'Learn about our journey, vision, and mission of serving humanity with transparency and integrity.',
      meta_description_ur: 'انسانیت کی خدمت کے ہمارے مشن، وژن اور سفر کے بارے میں جانیے۔',
      menu_id: 1,
      sort_order: 2,
      is_published: 1
    },
    {
      title_en: 'Welfare Projects',
      title_ur: 'فلاحی منصوبے',
      slug: 'projects',
      page_type: 'core',
      target_url: '/projects',
      meta_description_en: 'Explore our ongoing welfare projects including education sponsorship, clean drinking water, and food rations.',
      meta_description_ur: 'ہمارے جاری فلاحی منصوبے جیسے یتیموں کی کفالت، صاف پانی اور راشن پیکج۔',
      menu_id: 2,
      sort_order: 1,
      is_published: 1
    },
    {
      title_en: 'News & Updates',
      title_ur: 'خبریں اور اعلانات',
      slug: 'news',
      page_type: 'core',
      target_url: '/news',
      meta_description_en: 'Stay informed with recent developments, community reports, and progress updates from the foundation.',
      meta_description_ur: 'فاؤنڈیشن کی حالیہ سرگرمیوں، رپورٹس اور اعلانات سے باخبر رہیں۔',
      menu_id: 2,
      sort_order: 2,
      is_published: 1
    },
    {
      title_en: 'Apply for Assistance',
      title_ur: 'مدد کی درخواست',
      slug: 'apply',
      page_type: 'core',
      target_url: '/apply',
      meta_description_en: 'Submit an online request for educational support, medical aid, or emergency assistance.',
      meta_description_ur: 'تعلیمی معاونت، علاج معالجہ یا ہنگامی امداد کے لیے آن لائن درخواست جمع کروائیں۔',
      menu_id: 3,
      sort_order: 1,
      is_published: 1
    },
    {
      title_en: 'Become a Volunteer',
      title_ur: 'رضاکار بنیں',
      slug: 'volunteer',
      page_type: 'core',
      target_url: '/volunteer',
      meta_description_en: 'Join our dedicated volunteer network and make a tangible difference in the lives of underprivileged families.',
      meta_description_ur: 'ہماری رضاکار ٹیم میں شامل ہوں اور مستحقین کی زندگی میں مثبت تبدیلی لائیں۔',
      menu_id: 3,
      sort_order: 2,
      is_published: 1
    },
    {
      title_en: 'Donate Now',
      title_ur: 'عطیہ دیں',
      slug: 'donate',
      page_type: 'core',
      target_url: '/donate',
      meta_description_en: 'Support our humanitarian causes through verified Islamic bank transfer or instant mobile wallets.',
      meta_description_ur: 'اسلامک بینک ٹرانسفر یا موبائل والٹ کے ذریعے فلاحی کاموں میں اپنا حصہ ڈالیں۔',
      menu_id: 4,
      sort_order: 1,
      is_published: 1
    },
    {
      title_en: 'Contact Us',
      title_ur: 'رابطہ کریں',
      slug: 'contact',
      page_type: 'core',
      target_url: '/contact',
      meta_description_en: 'Get in touch with our administrative offices, helpline, or send a direct inquiry.',
      meta_description_ur: 'ہمارے دفاتر سے رابطہ کریں، ہیلپ لائن پر کال کریں یا براہ راست پیغام بھیجیں۔',
      menu_id: 4,
      sort_order: 2,
      is_published: 1
    }
  ];

  for (const page of corePages) {
    const [existing] = await db.query('SELECT id FROM pages WHERE slug = ?', [page.slug]);
    if (existing.length === 0) {
      await db.query(`
        INSERT INTO pages (title_en, title_ur, slug, page_type, target_url, meta_description_en, meta_description_ur, menu_id, sort_order, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        page.title_en,
        page.title_ur,
        page.slug,
        page.page_type,
        page.target_url,
        page.meta_description_en,
        page.meta_description_ur,
        page.menu_id,
        page.sort_order,
        page.is_published
      ]);
      console.log(`[Migration] Seeded page: ${page.title_en} (${page.target_url})`);
    } else {
      console.log(`[Migration] Page already exists: ${page.title_en}`);
    }
  }

  console.log('[Migration] All core pages verified.');
  process.exit(0);
}

migratePages().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
