const pool = require('../config/db');

async function seedCategoriesAndProjects() {
  console.log('Seeding rich dummy data for all categories and projects...');

  // 1. Ensure Categories are properly configured
  const categoriesData = [
    {
      id: 1,
      slug: 'orphan-education',
      icon: 'graduation-cap',
      name_en: 'Education',
      name_ur: 'تعلیم و کفالتِ یتامیٰ',
      description_en: 'Academic sponsorships, textbooks, uniforms, and digital literacy for deserving children.',
      description_ur: 'مستحق اور یتیم بچوں کے لیے تعلیمی اخراجات، یونیفارم، کتب اور کمپیوٹر لیب کی فراہمی۔',
      sort_order: 1,
      is_active: 1
    },
    {
      id: 2,
      slug: 'school-fees-healthcare',
      icon: 'heart-pulse',
      name_en: 'Healthcare',
      name_ur: 'صحت و طبی سہولیات',
      description_en: 'Free diagnostic camps, prescription medicines, dialysis support, and maternal care.',
      description_ur: 'غریب اور نادار مریضوں کے لیے مفت ادویات، تشخیصی کیمپس، ڈائیلاسز فنڈ اور ایمرجنسی علاج۔',
      sort_order: 2,
      is_active: 1
    },
    {
      id: 3,
      slug: 'food-ration-support',
      icon: 'utensils',
      name_en: 'Food Support',
      name_ur: 'راشن و غذائی امداد',
      description_en: 'Monthly staple food packs, Ramazan ration packages, and daily community dastarkhwan.',
      description_ur: 'ضرورت مند خاندانوں کے لیے ماہانہ راشن بیگز، رمضان المبارک سحر و افطار اور غذائی پیکجز۔',
      sort_order: 3,
      is_active: 1
    },
    {
      id: 4,
      slug: 'financial-assistance',
      icon: 'hand-holding-droplet',
      name_en: 'Clean Water',
      name_ur: 'صاف پینے کا پانی',
      description_en: 'Solar-powered filtration plants, community deep wells, and mountain pipeline supplies.',
      description_ur: 'دیہی علاقوں میں واٹر فلٹریشن پلانٹس، شمسی واٹر پمپس اور میٹھے پانی کے کنوؤں کی تنصیب۔',
      sort_order: 4,
      is_active: 1
    },
    {
      id: 5,
      slug: 'community-welfare',
      icon: 'users',
      name_en: 'Community Care',
      name_ur: 'سماجی خدمت و بحالی',
      description_en: 'Winter blankets, widow sustenance grants, disability wheelchairs, and livelihood kits.',
      description_ur: 'سرمائی گرم ملبوسات، معذور افراد کے لیے وہیل چیئرز، بیواؤں کی مالی کفالت اور عمومی فلاحی امور۔',
      sort_order: 5,
      is_active: 1
    },
    {
      id: 6,
      slug: 'flood-relief',
      icon: 'house-flood-water',
      name_en: 'Flood Relief',
      name_ur: 'سیلاب متاثرین کی امداد',
      description_en: 'Emergency tent shelters, cooked meal distribution, medical aid, and home rebuilding.',
      description_ur: 'سیلاب سے متاثرہ خاندانوں کے لیے فوری خیمہ جات، پکا ہوا کھانا، ادویات اور مکانات کی تعمیرِ نو۔',
      sort_order: 6,
      is_active: 1
    }
  ];

  for (const cat of categoriesData) {
    await pool.query(
      `INSERT INTO categories (id, slug, icon, name_en, name_ur, description_en, description_ur, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slug = VALUES(slug),
         icon = VALUES(icon),
         name_en = VALUES(name_en),
         name_ur = VALUES(name_ur),
         description_en = VALUES(description_en),
         description_ur = VALUES(description_ur),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [cat.id, cat.slug, cat.icon, cat.name_en, cat.name_ur, cat.description_en, cat.description_ur, cat.sort_order, cat.is_active]
    );
  }
  console.log('Categories updated successfully.');

  // 2. Realistic Projects List (3 per category = 18 total projects)
  const projectsData = [
    // Education (Cat 1)
    {
      id: 1,
      category_id: 1,
      slug: 'orphan-academic-sponsorship',
      title_en: 'Orphan Academic Sponsorship & School Supplies',
      title_ur: 'کفالتِ یتامیٰ اور تعلیمی وظائف منصوبہ',
      short_desc_en: 'Providing full-year tuition, quality uniforms, textbooks, and stationery packages to 450 orphans across the region.',
      short_desc_ur: 'علاقے کے 450 مستحق و یتیم طلبہ کے لیے مکمل سالانہ فیس، یونیفارم، کتب اور تدریسی سامان کی فراہمی۔',
      full_desc_en: 'Education is the most powerful weapon against poverty. Through this flagship initiative, Qasr-e-Shabbir Foundation sponsors deserving orphan children from primary to higher secondary levels, ensuring no child drops out due to lack of financial resources.',
      full_desc_ur: 'تعلیم غربت کے خاتمے کا سب سے موثر ذریعہ ہے۔ قصرِ شبیر فاؤنڈیشن اس منصوبے کے تحت یتیم اور نادار بچوں کی مکمل تعلیمی کفالت کرتی ہے تاکہ کوئی بچہ معاشی مجبوری کی بنا پر تعلیم سے محروم نہ رہے۔',
      image_url: '/media/projects/orphan_education.webp',
      goal_amount: 3500000.00,
      raised_amount: 2575000.00,
      currency: 'PKR',
      beneficiaries_count: 450,
      beneficiaries_label_en: 'Orphans Supported',
      beneficiaries_label_ur: 'کفالت شدہ یتیم بچے',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 16,
      category_id: 1,
      slug: 'digital-literacy-computer-lab',
      title_en: 'Digital Literacy & Modern Computer Lab',
      title_ur: 'ڈیجیٹل لرننگ اور کمپیوٹر لیب کا قیام',
      short_desc_en: 'Equipping rural community schools with computer workstations, solar backup power, and IT skills training.',
      short_desc_ur: 'دیہی اسکولوں میں سولر پاور سے لیس جدید کمپیوٹر لیب اور طلبہ کے لیے بنیادی آئی ٹی کورسز کا انعقاد۔',
      full_desc_en: 'Bridging the digital divide for marginalized youths by establishing solar-powered IT labs equipped with internet access and offering foundational computer science courses.',
      full_desc_ur: 'پسماندہ علاقوں کے نوجوانوں کو جدید ٹیکنالوجی سے روشناس کرانے کے لیے سولر پاور سے لیس کمپیوٹر لیبز اور بنیادی پروگرامنگ و گرافکس کورسز کی مفت تربیت۔',
      image_url: '/media/projects/education_project.webp',
      goal_amount: 1800000.00,
      raised_amount: 1220000.00,
      currency: 'PKR',
      beneficiaries_count: 320,
      beneficiaries_label_en: 'Students Trained',
      beneficiaries_label_ur: 'تربیت یافتہ طلبہ',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 1,
      slug: 'primary-school-uniforms-bags',
      title_en: 'Deserving Students Uniforms & Bag Drive',
      title_ur: 'مستحق طلبہ کے لیے یونیفارم و بستوں کی تقسیم',
      short_desc_en: 'Annual back-to-school initiative delivering tailored uniforms, durable school bags, and stationery kits.',
      short_desc_ur: 'نئے تعلیمی سال کے آغاز پر غریب طلبہ میں معیاری یونیفارم، جوتے، اسکول بیگز اور اسٹیشنری کی تقسیم۔',
      full_desc_en: 'Every child deserves to walk into school with dignity. Our annual back-to-school distribution kits equip vulnerable children with durable shoes, uniforms, and supplies.',
      full_desc_ur: 'ہر بچے کا حق ہے کہ وہ عزتِ نفس کے ساتھ اسکول جائے۔ یہ مہم پسماندہ خاندانوں کے بچوں کو اسکول یونیفارم اور ضروری سامان فراہم کر کے ان کی حوصلہ افزائی کرتی ہے۔',
      image_url: '/media/uploads/Schoolboys_Gather_Under_Founda_1792082428295_963171.webp',
      goal_amount: 1200000.00,
      raised_amount: 980000.00,
      currency: 'PKR',
      beneficiaries_count: 800,
      beneficiaries_label_en: 'Children Equipped',
      beneficiaries_label_ur: 'فائدہ اٹھانے والے بچے',
      status: 'active',
      is_featured: 0,
      sort_order: 3
    },

    // Healthcare (Cat 2)
    {
      id: 2,
      category_id: 2,
      slug: 'mobile-medical-diagnostic-camps',
      title_en: 'Free Mobile Medical Clinic & Diagnostic Camps',
      title_ur: 'مفت موبائل میڈیکل کلینک اور تشخیصی کیمپ',
      short_desc_en: 'Regular medical camps offering free doctor consultations, blood tests, eye screenings, and essential medicines.',
      short_desc_ur: 'ماہر ڈاکٹرز کی زیرِ نگرانی مفت چیک اپ، خون کے بنیادی ٹیسٹ، ادویات اور آنکھوں کے معائنے کے کیمپ۔',
      full_desc_en: 'Providing accessible healthcare directly to remote mountainous villages through regular mobile camps staffed by general physicians and medical specialists.',
      full_desc_ur: 'دور دراز دیہاتوں کے باسیوں کے لیے جنہیں ہسپتالوں تک رسائی حاصل نہیں، موبائل میڈیکل کیمپ کے ذریعے مفت معائنہ اور معیاری ادویات کی فوری فراہمی۔',
      image_url: '/media/projects/healthcare_project.webp',
      goal_amount: 3200000.00,
      raised_amount: 1920000.00,
      currency: 'PKR',
      beneficiaries_count: 2400,
      beneficiaries_label_en: 'Patients Treated',
      beneficiaries_label_ur: 'مستفید مریض',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 5,
      category_id: 2,
      slug: 'kidney-dialysis-patient-care-fund',
      title_en: 'Kidney Dialysis Patient Care & Life-Saving Fund',
      title_ur: 'گردوں کے نادار مریضوں کے لیے مفت ڈائیلاسز فنڈ',
      short_desc_en: 'Subsidizing routine hemodialysis cycles, erythropoietin injections, and critical lab panels for underprivileged renal patients.',
      short_desc_ur: 'گردوں کے غریب مریضوں کے لیے باقاعدہ ہیموڈائیلاسز، جان بچانے والے ٹیکے اور ٹیسٹوں کے اخراجات کی مکمل کفالت۔',
      full_desc_en: 'Dialysis is a lifelong financial burden that plunges families into poverty. Our dedicated fund ensures that underprivileged renal patients never miss a life-sustaining treatment cycle.',
      full_desc_ur: 'ڈائیلاسز کے بھاری اخراجات نادار خاندانوں کی پہنچ سے باہر ہوتے ہیں۔ ہمارا فنڈ اس بات کو یقینی بناتا ہے کہ کوئی بھی مریض پیسوں کی کمی کے باعث علاج سے محروم نہ رہے۔',
      image_url: '/media/projects/healthcare_project.webp',
      goal_amount: 2500000.00,
      raised_amount: 1650000.00,
      currency: 'PKR',
      beneficiaries_count: 180,
      beneficiaries_label_en: 'Dialysis Patients',
      beneficiaries_label_ur: 'ڈائیلاسز کے مریض',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 2,
      slug: 'maternal-child-healthcare-unit',
      title_en: 'Maternal & Neonatal Healthcare Assistance',
      title_ur: 'ماں اور نومولود بچے کی طبی نگہداشت',
      short_desc_en: 'Antenatal care packages, vital maternal supplements, safe delivery support, and pediatric immunizations.',
      short_desc_ur: 'حاملہ خواتین کے لیے مفت میڈیکل سپلیمنٹس، زچگی کے بنیادی اخراجات اور بچوں کے حفاظتی ٹیکے۔',
      full_desc_en: 'Reducing infant and maternal mortality through timely antenatal screenings, iron/folic acid distribution, and emergency transport assistance.',
      full_desc_ur: 'پسماندہ علاقوں میں دورانِ حمل و زچگی مناسب طبی دیکھ بھال اور نوزائیدہ بچوں کے لیے حفاظتی ٹیکہ جات کی فراہمی کا منصوبہ۔',
      image_url: '/media/projects/healthcare_project.webp',
      goal_amount: 1900000.00,
      raised_amount: 1420000.00,
      currency: 'PKR',
      beneficiaries_count: 950,
      beneficiaries_label_en: 'Mothers & Infants',
      beneficiaries_label_ur: 'مائیں اور نوزائیدہ بچے',
      status: 'active',
      is_featured: 0,
      sort_order: 3
    },

    // Food Support (Cat 3)
    {
      id: 3,
      category_id: 3,
      slug: 'monthly-family-food-ration-bags',
      title_en: 'Monthly Family Food Ration Bags',
      title_ur: 'ماہانہ خاندانی راشن پیکجز پروگرام',
      short_desc_en: 'Providing comprehensive monthly staple food boxes (flour, rice, pulses, cooking oil, sugar, tea) to verified needy households.',
      short_desc_ur: 'مستحق اور بیوہ خاندانوں کو آٹا، چاول، دالیں، گھی اور چینی پر مشتمل مکمل ماہانہ راشن کی عزت کے ساتھ فراہمی۔',
      full_desc_en: 'No family should go to sleep hungry. Our field teams verify deserving households to distribute nutritious, sealed staple food hampers every single month.',
      full_desc_ur: 'غربت اور مہنگائی کے دور میں سفید پوش اور نادار خاندانوں کو فاقہ کشی سے بچانے کے لیے ہر ماہ ان کی دہلیز پر صاف اور معیاری راشن پہنچایا جاتا ہے۔',
      image_url: '/media/projects/food_ration_project.webp',
      goal_amount: 4000000.00,
      raised_amount: 3200000.00,
      currency: 'PKR',
      beneficiaries_count: 1500,
      beneficiaries_label_en: 'Households Fed',
      beneficiaries_label_ur: 'مستفید خاندان',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 6,
      category_id: 3,
      slug: 'ramazan-iftar-dastarkhwan-drive',
      title_en: 'Ramazan Mubarak Iftar & Sehar Food Drive',
      title_ur: 'رمضان المبارک سحر و افطار دسترخوان',
      short_desc_en: 'Serving wholesome freshly cooked Iftar meals daily and distributing special Ramazan food hampers throughout the holy month.',
      short_desc_ur: 'ماہِ صیام کے دوران روزانہ مسافروں اور نادار روزہ داروں کے لیے گرم سحر و افطار اور خصوصی راشن بیگز۔',
      full_desc_en: 'Celebrating the blessings of Ramazan by hosting daily community iftar gatherings and distributing month-long dry ration packs to families before the new moon.',
      full_desc_ur: 'رمضان المبارک کے مقدس ایام میں مستحقین کو خوشیوں میں شریک کرنے کے لیے روزانہ عوامی افطار اور ماہِ رمضان راشن پیکجز کا اہتمام۔',
      image_url: '/media/projects/food_ration.webp',
      goal_amount: 2800000.00,
      raised_amount: 2100000.00,
      currency: 'PKR',
      beneficiaries_count: 3500,
      beneficiaries_label_en: 'Fasting Individuals',
      beneficiaries_label_ur: 'روزہ دار و مستحق افراد',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 3,
      slug: 'emergency-nutritional-infant-care',
      title_en: 'Emergency Nutritional Infant Care Packages',
      title_ur: 'نوزائیدہ بچوں کے لیے ہنگامی غذائی امداد',
      short_desc_en: 'Supplying infant formula, fortified cereals, and pediatric vitamin drops to mothers suffering from severe acute distress.',
      short_desc_ur: 'ناقص غذائیت کا شکار بچوں کے لیے معیاری فارمولا دودھ، وٹامنز اور سپلیمنٹس کی فوری فراہمی۔',
      full_desc_en: 'Combating childhood stunting and severe acute malnutrition in crisis areas by providing mothers with specialized pediatric nutrition supplements and clean feeding supplies.',
      full_desc_ur: 'پسماندہ علاقوں میں بچوں کی غذائی قلت پر قابو پانے کے لیے خصوصی سپلیمنٹس اور فارمولا پیکجز کی بر وقت ترسیل۔',
      image_url: '/media/projects/food_ration.webp',
      goal_amount: 1500000.00,
      raised_amount: 890000.00,
      currency: 'PKR',
      beneficiaries_count: 600,
      beneficiaries_label_en: 'Infants Supported',
      beneficiaries_label_ur: 'غذائی امداد پانے والے بچے',
      status: 'active',
      is_featured: 0,
      sort_order: 3
    },

    // Clean Water (Cat 4)
    {
      id: 4,
      category_id: 4,
      slug: 'solar-clean-water-filtration-plants',
      title_en: 'Solar Clean Water Filtration Plant Installations',
      title_ur: 'شمسی توانائی سے چلنے والے واٹر فلٹریشن پلانٹس',
      short_desc_en: 'High-capacity reverse osmosis and UV water purification plants powered by solar arrays to deliver clean potable water.',
      short_desc_ur: 'دیہاتوں میں پینے کے صاف پانی کے لیے سولر پاور سے لیس آر او فلٹریشن پلانٹس کی تنصیب۔',
      full_desc_en: 'Water-borne illnesses account for a huge portion of hospital admissions. Installing solar-powered filtration plants ensures sustainable, zero-utility-cost clean drinking water for entire townships.',
      full_desc_ur: 'گندے پانی سے پیدا ہونے والی مہلک بیماریوں سے بچاؤ کے لیے سولر واٹر پلانٹس کی تنصیب، جس سے ہزاروں دیہاتی بلا معاوضہ شفاف پانی حاصل کرتے ہیں۔',
      image_url: '/media/projects/clean_water_project.webp',
      goal_amount: 2200000.00,
      raised_amount: 1750000.00,
      currency: 'PKR',
      beneficiaries_count: 5000,
      beneficiaries_label_en: 'Villagers Served',
      beneficiaries_label_ur: 'صاف پانی حاصل کرنے والے شہری',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 7,
      category_id: 4,
      slug: 'community-deep-water-wells',
      title_en: 'Community Deep Water Wells & Hand Pumps',
      title_ur: 'گہرے پانی کے کنویں اور ہینڈ پمپس کا منصوبہ',
      short_desc_en: 'Boring deep freshwater wells and installing heavy-duty stainless steel hand pumps in arid rural settlements.',
      short_desc_ur: 'پانی کی شدید قلت والے علاقوں میں گہرے کنویں کھود کر جدید ہینڈ پمپس کی تنصیب۔',
      full_desc_en: 'Relieving women and children of the daily burden of walking miles to fetch muddy water by installing durable, community-managed hand pumps right in the heart of their villages.',
      full_desc_ur: 'پانی کے لیے میلوں دور پیدل چلنے والی خواتین اور بچوں کی آسانی کے لیے دیہات کے اندر پائیدار ہینڈ پمپس کی تنصیب۔',
      image_url: '/media/projects/clean_water_project.webp',
      goal_amount: 1500000.00,
      raised_amount: 1120000.00,
      currency: 'PKR',
      beneficiaries_count: 2800,
      beneficiaries_label_en: 'Rural Residents',
      beneficiaries_label_ur: 'مستفید دیہی مکین',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 4,
      slug: 'mountain-gravity-pipeline-water-project',
      title_en: 'Mountain Gravity Pipeline Water Supply',
      title_ur: 'پہاڑی علاقوں کے لیے پائپ لائن واٹر سپلائی منصوبہ',
      short_desc_en: 'Laying HDPE pipelines from natural mountain springs directly to village storage reservoirs.',
      short_desc_ur: 'پہاڑی چشموں سے آبادی تک پائپ لائن بچھا کر اسٹوریج ٹینک اور گھریلو نلکوں کی فراہمی۔',
      full_desc_en: 'Harnessing pure mountain springs via gravity-fed pipeline networks to bring freshwater straight to hillside homes that previously suffered severe water shortages.',
      full_desc_ur: 'قدرتی پہاڑی چشموں سے پائپ لائنوں کے ذریعے پسماندہ بستیوں تک شفاف پانی پہنچانے کا دیرپا منصوبہ۔',
      image_url: '/media/projects/clean_water_project.webp',
      goal_amount: 3400000.00,
      raised_amount: 2600000.00,
      currency: 'PKR',
      beneficiaries_count: 4200,
      beneficiaries_label_en: 'Mountain Inhabitants',
      beneficiaries_label_ur: 'پہاڑی علاقوں کے مکین',
      status: 'active',
      is_featured: 0,
      sort_order: 3
    },

    // Community Care (Cat 5)
    {
      id: 9,
      category_id: 5,
      slug: 'winter-warmth-blanket-relief',
      title_en: 'Winter Relief Warm Blanket & Thermal Clothing',
      title_ur: 'موسمِ سرما کی گرم چادریں، رضائیاں اور جیکٹس',
      short_desc_en: 'Distributing heavy fleece blankets, quilts, thermal innerwear, and warm jackets to vulnerable families in sub-zero regions.',
      short_desc_ur: 'سخت سردی اور برف باری کے دوران مستحق خاندانوں اور بچوں میں گرم کمبل، لحاف اور جیکٹس کی تقسیم۔',
      full_desc_en: 'Harsh winter temperatures pose life-threatening hazards to poorly insulated homes. QSF distributes winterization kits containing heavy quilts and thermal jackets to protect vulnerable elderly and young.',
      full_desc_ur: 'منفی درجہ حرارت والے علاقوں میں نادار خاندانوں کو سردی کے جان لیوا اثرات سے بچانے کے لیے ہر سال ونٹر ریلیف مہم چلائی جاتی ہے۔',
      image_url: '/media/uploads/ChatGPT_Image_Oct_15__2026__02_1792056160133_717615.webp',
      goal_amount: 2000000.00,
      raised_amount: 1450000.00,
      currency: 'PKR',
      beneficiaries_count: 1200,
      beneficiaries_label_en: 'Families Protected',
      beneficiaries_label_ur: 'حفاظت یافتہ خاندان',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 11,
      category_id: 5,
      slug: 'widow-sustenance-micro-grants',
      title_en: 'Widow Sustenance & Micro-Livelihood Grants',
      title_ur: 'مستحق بیواؤں کی کفالت اور خود روزگار معاونت',
      short_desc_en: 'Granting sewing machines, grocery micro-kiosks, and monthly stipends to enable widowed mothers to feed their children with honor.',
      short_desc_ur: 'بیوہ ماؤں کے لیے سلائی مشینیں، چھوٹے کاروبار کے آلات اور ماہانہ اعزازیہ تاکہ وہ اپنے بچوں کا پیٹ پال سکیں۔',
      full_desc_en: 'Empowering female-headed households with dignity through vocational sewing training, enterprise starter kits, and essential living allowances.',
      full_desc_ur: 'بیوہ اور بے سہارا خواتین کو معاشی طور پر خود مختار بنانے کے لیے ہنر مندی کی تربیت، سلائی مشینیں اور چھوٹے کاروبار کی معاونت۔',
      image_url: '/media/uploads/ChatGPT_Image_Oct_15__2026__02_1792056171657_394192.webp',
      goal_amount: 1600000.00,
      raised_amount: 1180000.00,
      currency: 'PKR',
      beneficiaries_count: 120,
      beneficiaries_label_en: 'Widowed Mothers',
      beneficiaries_label_ur: 'خود مختار بیوہ خواتین',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 5,
      slug: 'disability-wheelchairs-assistive-care',
      title_en: 'Wheelchair & Assistive Equipment for Special Persons',
      title_ur: 'معذور افراد کے لیے وہیل چیئرز اور معاون آلات',
      short_desc_en: 'Custom mobility wheelchairs, walking crutches, hearing aids, and accessibility aids for disabled children and adults.',
      short_desc_ur: 'معذور بچوں اور بڑوں کے لیے آرام دہ وہیل چیئرز، بیساکھیاں اور سننے کے آلات کی فراہمی۔',
      full_desc_en: 'Restoring mobility and self-reliance to physically challenged community members by gifting customized wheelchairs, tricycles, and ergonomic walking aids.',
      full_desc_ur: 'خصوصی افراد کو آزادانہ نقل و حرکت اور معاشرے میں باوقار کردار ادا کرنے کے لیے وہیل چیئرز اور جدید معاون آلات کا عطیہ۔',
      image_url: '/media/uploads/ChatGPT_Image_Oct_15__2026__02_1792056215188_993753.webp',
      goal_amount: 1100000.00,
      raised_amount: 820000.00,
      currency: 'PKR',
      beneficiaries_count: 350,
      beneficiaries_label_en: 'Special Persons Assisted',
      beneficiaries_label_ur: 'خصوصی افراد',
      status: 'active',
      is_featured: 0,
      sort_order: 3
    },

    // Flood Relief (Cat 6)
    {
      id: 12,
      category_id: 6,
      slug: 'flood-emergency-shelter-tents',
      title_en: 'Emergency Flood Shelter Tents & Bedding Kits',
      title_ur: 'سیلاب متاثرین کے لیے خیمے اور ہنگامی رہائش',
      short_desc_en: 'Rapid deployment of weatherproof family tents, mosquito nets, plastic ground tarpaulins, and folding camp cots.',
      short_desc_ur: 'سیلاب سے بے گھر ہونے والے خاندانوں کے لیے واٹر پروف خیمے، مچھر دانیاں اور عارضی رہائشی سامان۔',
      full_desc_en: 'Providing immediate weatherproof shelter to families displaced by devastating flash floods, protecting children and the sick from harsh open elements.',
      full_desc_ur: 'سیلاب سے گھر بار کھو دینے والے خاندانوں کو فوری طور پر محفوظ خیمے اور ضروری سامان فراہم کر کے کھلے آسمان تلے رہنے سے بچانا۔',
      image_url: '/media/uploads/Smiling_School_Group_with_Foun_1792082807587_458986.webp',
      goal_amount: 3500000.00,
      raised_amount: 2800000.00,
      currency: 'PKR',
      beneficiaries_count: 850,
      beneficiaries_label_en: 'Displaced Families',
      beneficiaries_label_ur: 'بے گھر خاندان',
      status: 'active',
      is_featured: 1,
      sort_order: 1
    },
    {
      id: 14,
      category_id: 6,
      slug: 'flood-reconstruction-home-rebuilding',
      title_en: 'Flood Rehabilitation & Home Reconstruction',
      title_ur: 'سیلاب زدہ مکانات کی پختہ تعمیرِ نو منصوبہ',
      short_desc_en: 'Constructing resilient masonry rooms, reinforced roofs, and sanitary latrines for families whose mud homes collapsed.',
      short_desc_ur: 'سیلاب میں منہدم ہونے والے کچے گھروں کی جگہ پکے اور مضبوط کمروں اور بیت الخلاء کی تعمیر۔',
      full_desc_en: 'Long-term rehabilitation restoring permanent roofs over flood survivors. We provide bricks, cement, iron girders, and skilled masons to rebuild durable homes.',
      full_desc_ur: 'سیلاب متاثرین کی مستقل بحالی کے لیے سیمنٹ، اینٹیں اور سریا فراہم کر کے پائیدار گھروں کی تعمیرِ نو کا شاندار منصوبہ۔',
      image_url: '/media/uploads/Schoolboys_Gather_Under_Founda_1792082428295_963171.webp',
      goal_amount: 5000000.00,
      raised_amount: 3650000.00,
      currency: 'PKR',
      beneficiaries_count: 95,
      beneficiaries_label_en: 'Rebuilt Homes',
      beneficiaries_label_ur: 'تعمیر شدہ مکانات',
      status: 'active',
      is_featured: 0,
      sort_order: 2
    },
    {
      category_id: 6,
      slug: 'emergency-flood-ration-water-tankers',
      title_en: 'Flood Cooked Food Rations & Water Tankers',
      title_ur: 'سیلابی علاقوں میں پکا کھانا اور پانی کے ٹینکرز',
      short_desc_en: 'Dispatching mobile emergency kitchen trailers distributing hot cooked meals and thousands of liters of drinking water daily.',
      short_desc_ur: 'سیلاب کے ابتدائی ایام میں پھنسے ہوئے افراد تک کشتیوں اور ٹرکوں کے ذریعے پکا کھانا اور صاف پانی پہنچانا۔',
      full_desc_en: 'Immediate survival aid during initial disaster phases: hot nutritious meals prepared twice daily and clean water bowsers dispatched to cut-off embankments.',
      full_desc_ur: 'سیلاب کے ہنگامی دنوں میں بھوکے اور پیاسے متاثرین کے لیے روزانہ دو وقت کا تازہ کھانا اور پینے کے پانی کے ٹینکرز کی فراہمی۔',
      image_url: '/media/projects/food_ration_project.webp',
      goal_amount: 1800000.00,
      raised_amount: 1800000.00,
      currency: 'PKR',
      beneficiaries_count: 4000,
      beneficiaries_label_en: 'Citizens Rescued & Fed',
      beneficiaries_label_ur: 'امدادی کھانا حاصل کرنے والے شہری',
      status: 'completed',
      is_featured: 0,
      sort_order: 3
    }
  ];

  for (const p of projectsData) {
    if (p.id) {
      // Update existing project by id
      await pool.query(
        `UPDATE projects SET
           category_id = ?,
           slug = ?,
           title_en = ?,
           title_ur = ?,
           short_desc_en = ?,
           short_desc_ur = ?,
           full_desc_en = ?,
           full_desc_ur = ?,
           image_url = ?,
           goal_amount = ?,
           raised_amount = ?,
           currency = ?,
           beneficiaries_count = ?,
           beneficiaries_label_en = ?,
           beneficiaries_label_ur = ?,
           status = ?,
           is_featured = ?,
           sort_order = ?
         WHERE id = ?`,
        [
          p.category_id,
          p.slug,
          p.title_en,
          p.title_ur,
          p.short_desc_en,
          p.short_desc_ur,
          p.full_desc_en,
          p.full_desc_ur,
          p.image_url,
          p.goal_amount,
          p.raised_amount,
          p.currency,
          p.beneficiaries_count,
          p.beneficiaries_label_en,
          p.beneficiaries_label_ur,
          p.status,
          p.is_featured,
          p.sort_order,
          p.id
        ]
      );
    } else {
      // Check if project with slug exists, otherwise insert
      const [existing] = await pool.query('SELECT id FROM projects WHERE slug = ?', [p.slug]);
      if (existing.length > 0) {
        await pool.query(
          `UPDATE projects SET
             category_id = ?,
             title_en = ?,
             title_ur = ?,
             short_desc_en = ?,
             short_desc_ur = ?,
             full_desc_en = ?,
             full_desc_ur = ?,
             image_url = ?,
             goal_amount = ?,
             raised_amount = ?,
             currency = ?,
             beneficiaries_count = ?,
             beneficiaries_label_en = ?,
             beneficiaries_label_ur = ?,
             status = ?,
             is_featured = ?,
             sort_order = ?
           WHERE slug = ?`,
          [
            p.category_id,
            p.title_en,
            p.title_ur,
            p.short_desc_en,
            p.short_desc_ur,
            p.full_desc_en,
            p.full_desc_ur,
            p.image_url,
            p.goal_amount,
            p.raised_amount,
            p.currency,
            p.beneficiaries_count,
            p.beneficiaries_label_en,
            p.beneficiaries_label_ur,
            p.status,
            p.is_featured,
            p.sort_order,
            p.slug
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO projects
             (category_id, slug, title_en, title_ur, short_desc_en, short_desc_ur, full_desc_en, full_desc_ur, image_url, goal_amount, raised_amount, currency, beneficiaries_count, beneficiaries_label_en, beneficiaries_label_ur, status, is_featured, sort_order)
           VALUES
             (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.category_id,
            p.slug,
            p.title_en,
            p.title_ur,
            p.short_desc_en,
            p.short_desc_ur,
            p.full_desc_en,
            p.full_desc_ur,
            p.image_url,
            p.goal_amount,
            p.raised_amount,
            p.currency,
            p.beneficiaries_count,
            p.beneficiaries_label_en,
            p.beneficiaries_label_ur,
            p.status,
            p.is_featured,
            p.sort_order
          ]
        );
      }
    }
  }

  console.log('All categories and projects seeded successfully!');
  
  // Verify counts
  const [counts] = await pool.query(`
    SELECT c.id, c.name_en, COUNT(p.id) as project_count
    FROM categories c
    LEFT JOIN projects p ON c.id = p.category_id
    GROUP BY c.id, c.name_en
    ORDER BY c.id ASC
  `);
  console.table(counts);

  process.exit(0);
}

seedCategoriesAndProjects().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
