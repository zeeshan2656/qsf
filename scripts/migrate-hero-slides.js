const db = require('../config/db');

async function migrateHeroSlides() {
  console.log('[Migration] Creating hero_slides table if not exists...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title_en VARCHAR(255) NULL,
      title_ur VARCHAR(255) NULL,
      eyebrow_en VARCHAR(255) NULL,
      eyebrow_ur VARCHAR(255) NULL,
      subtitle_en VARCHAR(255) NULL,
      subtitle_ur VARCHAR(255) NULL,
      description_en TEXT NULL,
      description_ur TEXT NULL,
      btn1_text_en VARCHAR(100) NULL,
      btn1_text_ur VARCHAR(100) NULL,
      btn1_link VARCHAR(255) NULL,
      btn2_text_en VARCHAR(100) NULL,
      btn2_text_ur VARCHAR(100) NULL,
      btn2_link VARCHAR(255) NULL,
      image_url VARCHAR(255) NOT NULL,
      image_mobile_url VARCHAR(255) NULL,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [existing] = await db.query('SELECT COUNT(*) as cnt FROM hero_slides');
  if (existing[0].cnt === 0) {
    console.log('[Migration] Seeding initial hero slides...');

    const defaultSlides = [
      {
        title_en: 'Qasr-e-Shabir Foundation',
        title_ur: 'قصرِ شبیر فاؤنڈیشن',
        eyebrow_en: 'WELCOME TO OFFICIAL',
        eyebrow_ur: 'خوش آمدید',
        subtitle_en: 'Empowering Communities, Transforming Lives',
        subtitle_ur: 'روشن مستقبل اور خود مختار معاشرے کی تعمیر',
        description_en: 'Providing quality education to orphan children, urgent medical treatment, clean drinking water, and monthly ration packs to deserving families.',
        description_ur: 'یتیم بچوں کی معیاری تعلیم، مفت علاج، صاف پانی اور راشن پیکجز کی باوقار فراہمی۔',
        btn1_text_en: 'Support Our Cause',
        btn1_text_ur: 'تعاون و عطیہ کریں',
        btn1_link: '/donate',
        btn2_text_en: 'Explore Welfare Projects',
        btn2_text_ur: 'منصوبہ جات دیکھیں',
        btn2_link: '/projects',
        image_url: '/media/branding/Smiling_School_Group_with_Foun_1792082807587_458986.webp',
        image_mobile_url: '/media/uploads/hero_bg_mobile.webp',
        is_active: 1,
        sort_order: 1
      },
      {
        title_en: 'Food Ration & Family Sustenance',
        title_ur: 'ماہانہ راشن و اشیائے خورونوش کی باوقار فراہمی',
        eyebrow_en: 'HUMANITARIAN RELIEF',
        eyebrow_ur: 'امدادی سرگرمیاں',
        subtitle_en: 'No Deserving Family Should Sleep Hungry',
        subtitle_ur: 'کوئی مستحق خاندان بھوکا نہ سوئے',
        description_en: 'Delivering monthly food parcels, flour, oil, and dry rations to widows, orphans, and destitute families across vulnerable communities.',
        description_ur: 'بیواؤں، یتیموں اور محتاج خاندانوں کو ہر ماہ باوقار طریقے سے ضروری غذائی راشن پیکٹس کی گھروں تک ترسیل۔',
        btn1_text_en: 'Sponsor a Ration Pack',
        btn1_text_ur: 'راشن پیکج سپانسر کریں',
        btn1_link: '/donate',
        btn2_text_en: 'Learn More',
        btn2_text_ur: 'مزید جانیں',
        btn2_link: '/about',
        image_url: '/media/projects/food_ration.webp',
        image_mobile_url: null,
        is_active: 1,
        sort_order: 2
      },
      {
        title_en: null,
        title_ur: null,
        eyebrow_en: null,
        eyebrow_ur: null,
        subtitle_en: null,
        subtitle_ur: null,
        description_en: null,
        description_ur: null,
        btn1_text_en: null,
        btn1_text_ur: null,
        btn1_link: null,
        btn2_text_en: null,
        btn2_text_ur: null,
        btn2_link: null,
        image_url: '/media/branding/hero_bg.jpg',
        image_mobile_url: null,
        is_active: 1,
        sort_order: 3
      },
      {
        title_en: 'Educational Sponsorship For Orphan Children',
        title_ur: 'یتیم بچوں کے لیے مفت معیاری تعلیم کی کفالت',
        eyebrow_en: 'ORPHAN EMPOWERMENT',
        eyebrow_ur: 'کفالتِ یتامیٰ',
        subtitle_en: 'Giving Every Child The Opportunity To Shine',
        subtitle_ur: 'تعلیم سے روشن مستقبل کی ضمانت',
        description_en: 'Full academic sponsorships, course books, school uniforms, and dedicated mentorship for promising orphan students.',
        description_ur: 'یتیم بچوں کی سکول فیس، یونیفارم، کتب اور تدریسی رہنمائی کی مکمل کفالت۔',
        btn1_text_en: 'Become a Sponsor',
        btn1_text_ur: 'کفیل بنیں',
        btn1_link: '/volunteer',
        btn2_text_en: 'Apply for Support',
        btn2_text_ur: 'درخواست دیں',
        btn2_link: '/apply',
        image_url: '/media/projects/orphan_education.webp',
        image_mobile_url: null,
        is_active: 1,
        sort_order: 4
      }
    ];

    for (const slide of defaultSlides) {
      await db.query(`
        INSERT INTO hero_slides 
        (title_en, title_ur, eyebrow_en, eyebrow_ur, subtitle_en, subtitle_ur, description_en, description_ur, btn1_text_en, btn1_text_ur, btn1_link, btn2_text_en, btn2_text_ur, btn2_link, image_url, image_mobile_url, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        slide.title_en, slide.title_ur, slide.eyebrow_en, slide.eyebrow_ur, slide.subtitle_en, slide.subtitle_ur,
        slide.description_en, slide.description_ur, slide.btn1_text_en, slide.btn1_text_ur, slide.btn1_link,
        slide.btn2_text_en, slide.btn2_text_ur, slide.btn2_link, slide.image_url, slide.image_mobile_url,
        slide.is_active, slide.sort_order
      ]);
    }
    console.log('[Migration] 4 hero slides successfully seeded.');
  } else {
    console.log(`[Migration] hero_slides table already has ${existing[0].cnt} slides.`);
  }

  process.exit(0);
}

migrateHeroSlides().catch(err => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
