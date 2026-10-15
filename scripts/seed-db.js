require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedDB() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'qasreshabbir';

  console.log(`[Seed DB] Connecting to MySQL database \`${dbName}\`...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    // 1. Seed Admin User
    const [existingUsers] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existingUsers.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@Qasr2026!', salt);
      await conn.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, ['admin', 'admin@qasreshabbir.org', hashedPassword, 'Qasr-e-Shabbir Administrator', 'superadmin']);
      console.log('[Seed DB] Admin user created (username: admin, pass: Admin@Qasr2026!)');
    }

    // 2. Seed Categories
    const categories = [
      {
        slug: 'orphan-education',
        icon: 'graduation-cap',
        name_en: 'Education',
        name_ur: 'تعلیم',
        desc_en: 'For a Brighter Future',
        desc_ur: 'روشن مستقبل کے لیے',
        sort: 1
      },
      {
        slug: 'school-fees-healthcare',
        icon: 'heartbeat',
        name_en: 'Healthcare',
        name_ur: 'صحت',
        desc_en: 'For Healthy Lives',
        desc_ur: 'بہتر زندگی کے لیے',
        sort: 2
      },
      {
        slug: 'food-ration-support',
        icon: 'utensils',
        name_en: 'Food Support',
        name_ur: 'غذائی امداد',
        desc_en: 'For Needy Families',
        desc_ur: 'ضرورت مند خاندانوں کے لیے',
        sort: 3
      },
      {
        slug: 'financial-assistance',
        icon: 'hands-helping',
        name_en: 'Clean Water',
        name_ur: 'صاف پانی',
        desc_en: 'For Better Tomorrow',
        desc_ur: 'بہتر مستقبل کے لیے',
        sort: 4
      },
      {
        slug: 'community-welfare',
        icon: 'users',
        name_en: 'Community Care',
        name_ur: 'سماجی خدمت',
        desc_en: 'For Stronger Society',
        desc_ur: 'مضبوط معاشرے کے لیے',
        sort: 5
      }
    ];

    for (const cat of categories) {
      await conn.query(`
        INSERT INTO categories (slug, icon, name_en, name_ur, description_en, description_ur, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          icon = VALUES(icon),
          name_en = VALUES(name_en),
          name_ur = VALUES(name_ur),
          description_en = VALUES(description_en),
          description_ur = VALUES(description_ur),
          sort_order = VALUES(sort_order)
      `, [cat.slug, cat.icon, cat.name_en, cat.name_ur, cat.desc_en, cat.desc_ur, cat.sort]);
    }
    console.log('[Seed DB] Welfare Categories seeded.');

    // 3. Seed Projects
    const projects = [
      {
        slug: 'orphan-education-support',
        category_slug: 'orphan-education',
        title_en: 'Education Support',
        title_ur: 'تعلیمی امداد',
        short_desc_en: 'Providing quality education and scholarships for underprivileged children.',
        short_desc_ur: 'معذور اور مستحق یتیم بچوں کے لیے معیاری تعلیم اور وظائف کی باقاعدہ فراہمی۔',
        full_desc_en: 'Education is the fundamental right of every child. Through our Orphan Education Support program, Qasr-e-Shabbir Foundation sponsors complete academic expenses for orphaned boys and girls across Pakistan. This includes school registration, monthly tuition fees, official syllabus textbooks, notebooks, school bags, and winter/summer school uniforms. Our mission ensures that no child drops out of school due to lack of financial guardianship.',
        full_desc_ur: 'تعلیم ہر بچے کا بنیادی حق ہے۔ قصرِ شبیر فاؤنڈیشن کے یتیم بچوں کے تعلیمی منصوبے کے تحت پاکستان بھر میں یتیم بچوں کے تمام تر تعلیمی اخراجات بشمول اسکول فیس، کتابیں، کاپیاں، یونیفارم اور اسکول بیگز کا بندوبست کیا جاتا ہے تاکہ کوئی بھی بچہ وسائل کی کمی کی وجہ سے تعلیم کے زیور سے محروم نہ رہے۔',
        image_url: '/media/projects/orphan_education.jpg',
        goal_amount: 3500000,
        raised_amount: 2560000,
        currency: 'PKR',
        beneficiaries_count: 126,
        beneficiaries_label_en: 'Students',
        beneficiaries_label_ur: 'طلباء',
        status: 'published',
        is_featured: 1,
        sort_order: 1
      },
      {
        slug: 'school-fee-healthcare-assistance',
        category_slug: 'school-fees-healthcare',
        title_en: 'Healthcare Assistance',
        title_ur: 'طبی و اسکول فیس معاونت',
        short_desc_en: 'Free medical camps and healthcare facilities for remote areas and school children.',
        short_desc_ur: 'دور دراز علاقوں میں مفت میڈیکل کیمپ اور مستحق بچوں کے لیے طبی و تعلیمی سہولیات۔',
        full_desc_en: 'Maintaining healthy bodies and focused minds is essential for young learners. We provide primary health screening, eye checkups, emergency medical relief, and school fee continuity grants to deserving students whose families face acute medical hardships.',
        full_desc_ur: 'صحت مند جسم اور روشن ذہن بچوں کی کامیابی کے لیے ناگزیر ہیں۔ ہم دیہی اور پسماندہ بستیوں میں بچوں کے طبی معائنے، فری کیمپس، دوائیوں کی فراہمی اور غریب خاندانوں کے بچوں کے تعلیمی اخراجات کی بروقت ادائیگی کرتے ہیں۔',
        image_url: '/media/projects/healthcare_project.png',
        goal_amount: 3200000,
        raised_amount: 1920000,
        currency: 'PKR',
        beneficiaries_count: 226,
        beneficiaries_label_en: 'Beneficiaries',
        beneficiaries_label_ur: 'مستفیدین',
        status: 'published',
        is_featured: 1,
        sort_order: 2
      },
      {
        slug: 'food-and-ration-program',
        category_slug: 'food-ration-support',
        title_en: 'Food & Ration Program',
        title_ur: 'غذائی امداد و راشن پروگرام',
        short_desc_en: 'Distributing comprehensive ration packs and monthly staples to families in need.',
        short_desc_ur: 'ضرورت مند اور نادار خاندانوں میں عزتِ نفس کے ساتھ ماہانہ راشن کی منصفانہ تقسیم۔',
        full_desc_en: 'Our monthly food and ration distribution supports widows, daily-wage laborers, and orphan families. Each standard ration pack is carefully assembled to last a family for a month, including 20kg premium wheat flour (Aata), 5kg Basmati rice, cooking oil, lentils (Daal), sugar, tea, and dry rations.',
        full_desc_ur: 'ہماری ماہانہ راشن مہم کے تحت بیواؤں، یتیموں اور دیہاڑی دار محنت کشوں کے گھرانوں کو باعزت طریقے سے ایک ماہ کا راشن فراہم کیا جاتا ہے جس میں 20 کلو آٹا، باسمتی چاول، گھی، دالیں اور چینی شامل ہیں۔',
        image_url: '/media/projects/food_ration.jpg',
        goal_amount: 4000000,
        raised_amount: 3200000,
        currency: 'PKR',
        beneficiaries_count: 1260,
        beneficiaries_label_en: 'Families',
        beneficiaries_label_ur: 'خاندان',
        status: 'published',
        is_featured: 1,
        sort_order: 3
      },
      {
        slug: 'community-welfare-clean-water',
        category_slug: 'financial-assistance',
        title_en: 'Clean Water Initiative',
        title_ur: 'صاف پانی کا منصوبہ',
        short_desc_en: 'Installing clean water hand-pumps and welfare projects in underprivileged rural areas.',
        short_desc_ur: 'پسماندہ دیہی علاقوں میں پینے کے صاف پانی کے ہینڈ پمپ اور فلاحی منصوبوں کی تنصیب۔',
        full_desc_en: 'Access to safe drinking water and foundational community infrastructure transforms entire villages. Qasr-e-Shabbir Foundation installs reliable deep-water hand pumps and filtration setups in remote regions of Pakistan to prevent water-borne illnesses among children.',
        full_desc_ur: 'پینے کا صاف پانی ہر انسان کی بنیادی ضرورت ہے۔ قصرِ شبیر فاؤنڈیشن دیہی و پسماندہ علاقوں میں واٹر پمپس اور فلٹریشن منصوبے قائم کرتی ہے تاکہ بچے اور خاندان بیماریوں سے محفوظ رہیں۔',
        image_url: '/media/projects/clean_water_project.png',
        goal_amount: 1000000,
        raised_amount: 750000,
        currency: 'PKR',
        beneficiaries_count: 380,
        beneficiaries_label_en: 'Villages & Localities',
        beneficiaries_label_ur: 'دیہی علاقے',
        status: 'published',
        is_featured: 1,
        sort_order: 4
      }
    ];

    for (const proj of projects) {
      const [catRow] = await conn.query('SELECT id FROM categories WHERE slug = ?', [proj.category_slug]);
      const categoryId = catRow.length > 0 ? catRow[0].id : null;

      await conn.query(`
        INSERT INTO projects (
          slug, category_id, title_en, title_ur, short_desc_en, short_desc_ur,
          full_desc_en, full_desc_ur, image_url, goal_amount, raised_amount,
          currency, beneficiaries_count, beneficiaries_label_en, beneficiaries_label_ur,
          status, is_featured, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          title_en = VALUES(title_en),
          title_ur = VALUES(title_ur),
          short_desc_en = VALUES(short_desc_en),
          short_desc_ur = VALUES(short_desc_ur),
          full_desc_en = VALUES(full_desc_en),
          full_desc_ur = VALUES(full_desc_ur),
          image_url = VALUES(image_url),
          goal_amount = VALUES(goal_amount),
          raised_amount = VALUES(raised_amount),
          beneficiaries_count = VALUES(beneficiaries_count),
          beneficiaries_label_en = VALUES(beneficiaries_label_en),
          beneficiaries_label_ur = VALUES(beneficiaries_label_ur),
          sort_order = VALUES(sort_order)
      `, [
        proj.slug, categoryId, proj.title_en, proj.title_ur, proj.short_desc_en, proj.short_desc_ur,
        proj.full_desc_en, proj.full_desc_ur, proj.image_url, proj.goal_amount, proj.raised_amount,
        proj.currency, proj.beneficiaries_count, proj.beneficiaries_label_en, proj.beneficiaries_label_ur,
        proj.status, proj.is_featured, proj.sort_order
      ]);
    }
    console.log('[Seed DB] Featured Projects seeded.');

    // 4. Seed News & Updates
    const news = [
      {
        slug: 'new-school-building-inaugurated-in-rural-area',
        category_slug: 'orphan-education',
        title_en: 'New School Building Inaugurated in Rural Area',
        title_ur: 'نئے اسکول کی عمارت کا باضابطہ افتتاح',
        short_desc_en: 'A new school building has been inaugurated in a remote village of Chak No. 12.',
        short_desc_ur: 'چک نمبر 12 کے پسماندہ دیہی علاقے میں نئے اسکول کی عمارت کا افتتاح کر دیا گیا۔',
        content_en: 'With the grace of Almighty and generous donor support, Qasr-e-Shabbir Foundation has inaugurated a dedicated school building. It features four well-ventilated classrooms, clean drinking water facilities, and dedicated study desks for 150 local students including 45 orphans.',
        content_ur: 'اللہ تعالیٰ کے فضل و کرم اور مخیر حضرات کے تعاون سے قصرِ شبیر فاؤنڈیشن نے نئے اسکول کی عمارت کا افتتاح کیا جس میں 45 یتیم طلباء سمیت 150 بچوں کے لیے باقاعدہ تعلیمی نشستوں اور جدید کلاس رومز کا اہتمام کیا گیا ہے۔',
        image_url: '/media/news/news_1.png',
        published_at: '2026-11-16'
      },
      {
        slug: 'free-medical-camp-successfully-concluded',
        category_slug: 'school-fees-healthcare',
        title_en: 'Free Medical Camp Successfully Concluded',
        title_ur: 'مفت میڈیکل کیمپ کا کامیاب اختتام',
        short_desc_en: 'Our recent free medical camp provided healthcare to over 500 people.',
        short_desc_ur: 'حالیہ فری میڈیکل کیمپ میں 500 سے زائد نادار مریضوں کو مفت طبی سہولیات فراہم کی گئیں۔',
        content_en: 'A dedicated team of doctors and healthcare volunteers examined over 500 patients in the rural sector. Free prescription medicines, pediatric examinations, and basic diagnostic tests were distributed free of charge.',
        content_ur: 'ڈاکٹروں اور رضاکاروں کی ٹیم نے 500 سے زائد مریضوں کا معائنہ کیا اور مفت ادویات تقسیم کیں۔ خصوصاً معصوم بچوں کے عمومی صحت اور غذائی کمی کا علاج تجویز کیا گیا۔',
        image_url: '/media/news/news_2.png',
        published_at: '2026-10-28'
      },
      {
        slug: 'ration-distribution-for-flood-victims',
        category_slug: 'food-ration-support',
        title_en: 'Ration Distribution for Vulnerable Families',
        title_ur: 'مستحق متاثرین کے لیے راشن کی تقسیم',
        short_desc_en: 'We distributed food packages among flood-affected families in Sukkur & rural areas.',
        short_desc_ur: 'سیلاب متاثرین اور مستحق خاندانوں میں ضروری راشن کے تھیلے تقسیم کیے گئے۔',
        content_en: 'Over 300 emergency food relief hampers were directly handed over to heads of deserving families. Each pack contains a month worth of staple dry rations.',
        content_ur: 'قصرِ شبیر فاؤنڈیشن کی ٹیم نے فیلڈ میں پہنچ کر ضرورت مند گھرانوں کو ایک ماہ کے غذائی راشن پر مشتمل پیکٹس حوالے کیے۔',
        image_url: '/media/news/news_3.png',
        published_at: '2026-10-15'
      }
    ];

    for (const item of news) {
      const [catRow] = await conn.query('SELECT id FROM categories WHERE slug = ?', [item.category_slug]);
      const categoryId = catRow.length > 0 ? catRow[0].id : null;

      await conn.query(`
        INSERT INTO articles (
          slug, category_id, title_en, title_ur, short_desc_en, short_desc_ur,
          content_en, content_ur, image_url, published_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
        ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          title_en = VALUES(title_en),
          title_ur = VALUES(title_ur),
          short_desc_en = VALUES(short_desc_en),
          short_desc_ur = VALUES(short_desc_ur),
          content_en = VALUES(content_en),
          content_ur = VALUES(content_ur),
          image_url = VALUES(image_url),
          published_at = VALUES(published_at)
      `, [
        item.slug, categoryId, item.title_en, item.title_ur, item.short_desc_en,
        item.short_desc_ur, item.content_en, item.content_ur, item.image_url, item.published_at
      ]);
    }
    console.log('[Seed DB] News & Articles seeded.');

    // 5. Seed Impact Statistics
    const impactStats = [
      {
        stat_key: 'people_helped',
        number_val: '2,450',
        suffix: '+',
        label_en: 'People Helped',
        label_ur: 'مستفید افراد',
        icon: 'users',
        sort: 1
      },
      {
        stat_key: 'projects_completed',
        number_val: '15',
        suffix: '+',
        label_en: 'Projects Completed',
        label_ur: 'مکمل منصوبے',
        icon: 'check-circle',
        sort: 2
      },
      {
        stat_key: 'years_service',
        number_val: '8',
        suffix: '',
        label_en: 'Years of Service',
        label_ur: 'سال خدمت',
        icon: 'shield-alt',
        sort: 3
      },
      {
        stat_key: 'students_supported',
        number_val: '480',
        suffix: '+',
        label_en: 'Orphan Students Enrolled',
        label_ur: 'زیرِ کفالت یتیم طلباء',
        icon: 'user-graduate',
        sort: 4
      }
    ];

    for (const stat of impactStats) {
      await conn.query(`
        INSERT INTO impact_stats (stat_key, number_val, suffix, label_en, label_ur, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          number_val = VALUES(number_val),
          suffix = VALUES(suffix),
          label_en = VALUES(label_en),
          label_ur = VALUES(label_ur),
          icon = VALUES(icon),
          sort_order = VALUES(sort_order)
      `, [stat.stat_key, stat.number_val, stat.suffix, stat.label_en, stat.label_ur, stat.icon, stat.sort]);
    }
    console.log('[Seed DB] Impact Statistics seeded.');

    // 6. Seed Site Settings
    const settings = [
      { key: 'foundation_name_en', val: 'QASR-E-SHABBIR FOUNDATION', group: 'branding' },
      { key: 'foundation_name_ur', val: 'قصرِ شبیر فاؤنڈیشن', group: 'branding' },
      { key: 'tagline_en', val: 'Together for a Brighter Tomorrow', group: 'branding' },
      { key: 'tagline_ur', val: 'ایک بہتر کل کے لیے ساتھ', group: 'branding' },
      { key: 'hero_eyebrow_en', val: 'WELCOME TO', group: 'hero' },
      { key: 'hero_eyebrow_ur', val: 'خوش آمدید', group: 'hero' },
      { key: 'hero_heading_en', val: 'Every Child Deserves a Brighter Future', group: 'hero' },
      { key: 'hero_heading_ur', val: 'ہر بچے کا روشن مستقبل ہمارا خواب ہے', group: 'hero' },
      { key: 'hero_desc_en', val: 'We support orphaned children and underprivileged families through education, healthcare, food assistance, and financial help. Because every child deserves a chance to dream.', group: 'hero' },
      { key: 'hero_desc_ur', val: 'ہم یتیم بچوں اور ضرورت مند خاندانوں کی تعلیم، صحت، غذائی امداد اور مالی مدد کے ذریعے ان کی مدد کرتے ہیں۔ کیونکہ ہر بچے کا حق ہے کہ وہ اپنے خواب پورے کرے۔', group: 'hero' },
      
      // Make a Difference Banner settings
      { key: 'diff_badge_en', val: 'MAKE A DIFFERENCE', group: 'difference' },
      { key: 'diff_badge_ur', val: 'آپ کی سخاوت', group: 'difference' },
      { key: 'diff_heading_en', val: 'Your Generosity Brings Real Change', group: 'difference' },
      { key: 'diff_heading_ur', val: 'بہتر مستقبل بناتی ہے', group: 'difference' },
      { key: 'diff_text_en', val: 'Join hands with us and help create a better future for those who need it most.', group: 'difference' },
      { key: 'diff_text_ur', val: 'ہمارے ساتھ شامل ہوں اور ان لوگوں کے لیے بہتر کل کی تعمیر میں مدد کریں جنہیں اس کی سب سے زیادہ ضرورت ہے۔', group: 'difference' },

      // Official Contact Details
      { key: 'contact_phone', val: '+92 300 1234567', group: 'contact' },
      { key: 'contact_email', val: 'info@qasreshabbir.org', group: 'contact' },
      { key: 'contact_address_en', val: 'Qasr-e-Shabbir Welfare Complex, G.T. Road, Pakistan', group: 'contact' },
      { key: 'contact_address_ur', val: 'قصرِ شبیر ویلفیئر کمپلیکس، جی ٹی روڈ، پاکستان', group: 'contact' },

      // Official Donation Bank Accounts (Configurable via Admin)
      { key: 'bank_name', val: 'Meezan Bank Limited (Islamic Banking)', group: 'donation' },
      { key: 'account_title', val: 'Qasr-e-Shabbir Foundation', group: 'donation' },
      { key: 'account_number', val: '01020304050607', group: 'donation' },
      { key: 'iban_number', val: 'PK64MEZN0001020304050607', group: 'donation' },
      { key: 'branch_code', val: '0102 (Lahore Main Branch)', group: 'donation' },
      { key: 'easypaisa_number', val: '0300-1234567', group: 'donation' },
      { key: 'easypaisa_title', val: 'Qasr-e-Shabbir Foundation', group: 'donation' },
      { key: 'jazzcash_number', val: '0321-7654321', group: 'donation' },
      { key: 'jazzcash_title', val: 'Qasr-e-Shabbir Foundation', group: 'donation' },

      // Social Links
      { key: 'social_facebook', val: 'https://facebook.com/qasreshabbir', group: 'social' },
      { key: 'social_twitter', val: 'https://twitter.com/qasreshabbir', group: 'social' },
      { key: 'social_instagram', val: 'https://instagram.com/qasreshabbir', group: 'social' },
      { key: 'social_youtube', val: 'https://youtube.com/@qasreshabbir', group: 'social' },
      { key: 'social_linkedin', val: 'https://linkedin.com/company/qasreshabbir', group: 'social' }
    ];

    for (const s of settings) {
      await conn.query(`
        INSERT INTO site_settings (setting_key, setting_val, setting_group)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          setting_val = VALUES(setting_val),
          setting_group = VALUES(setting_group)
      `, [s.key, s.val, s.group]);
    }
    console.log('[Seed DB] Site Settings seeded.');

    console.log('[Seed DB] Successfully seeded entire database!');
    await conn.end();
  } catch (err) {
    console.error('[Seed DB] Error seeding database:', err);
    process.exit(1);
  }
}

seedDB();
