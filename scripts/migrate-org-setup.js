require('dotenv').config();
const db = require('../config/db');

async function migrateOrgSetup() {
  console.log('=== Starting Organization Setup Database Migration ===');

  try {
    // 1. Create departments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(150) NOT NULL,
        name_ur VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Verified table: departments');

    // 2. Create user_roles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_key VARCHAR(50) NOT NULL UNIQUE,
        name_en VARCHAR(150) NOT NULL,
        name_ur VARCHAR(150) NOT NULL,
        description TEXT,
        is_system TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Verified table: user_roles');

    // 3. Create designations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS designations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(150) NOT NULL,
        name_ur VARCHAR(150) NOT NULL,
        department_id INT NULL,
        description TEXT,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Verified table: designations');

    // 4. Alter users table to add department_id, role_id, designation_id if missing
    const [userCols] = await db.query('DESCRIBE users');
    const userColNames = userCols.map(c => c.Field);

    if (!userColNames.includes('department_id')) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN department_id INT NULL AFTER role,
        ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      `);
      console.log('✓ Added users.department_id');
    }

    if (!userColNames.includes('role_id')) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN role_id INT NULL AFTER department_id,
        ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE SET NULL
      `);
      console.log('✓ Added users.role_id');
    }

    if (!userColNames.includes('designation_id')) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN designation_id INT NULL AFTER designation_ur,
        ADD CONSTRAINT fk_users_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL
      `);
      console.log('✓ Added users.designation_id');
    }

    // 5. Alter volunteer_applications table to add department_id, role_id, role, designation_id if missing
    const [volCols] = await db.query('DESCRIBE volunteer_applications');
    const volColNames = volCols.map(c => c.Field);

    if (!volColNames.includes('department_id')) {
      await db.query(`
        ALTER TABLE volunteer_applications 
        ADD COLUMN department_id INT NULL AFTER city,
        ADD CONSTRAINT fk_vol_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      `);
      console.log('✓ Added volunteer_applications.department_id');
    }

    if (!volColNames.includes('role_id')) {
      await db.query(`
        ALTER TABLE volunteer_applications 
        ADD COLUMN role_id INT NULL AFTER department_id,
        ADD CONSTRAINT fk_vol_role FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE SET NULL
      `);
      console.log('✓ Added volunteer_applications.role_id');
    }

    if (!volColNames.includes('role')) {
      await db.query(`
        ALTER TABLE volunteer_applications 
        ADD COLUMN role VARCHAR(50) DEFAULT 'volunteer' AFTER role_id
      `);
      console.log('✓ Added volunteer_applications.role');
    }

    if (!volColNames.includes('designation_id')) {
      await db.query(`
        ALTER TABLE volunteer_applications 
        ADD COLUMN designation_id INT NULL AFTER designation_ur,
        ADD CONSTRAINT fk_vol_designation FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL
      `);
      console.log('✓ Added volunteer_applications.designation_id');
    }

    // 6. Seed default departments
    const initialDepartments = [
      {
        code: 'RELIEF',
        name_en: 'Disaster Management & Flood Relief',
        name_ur: 'شعبہ آفات و سیلاب ریلیف',
        description: 'Emergency response, disaster mitigation, flood rescue, ration distributions, and rehabilitation across Pakistan.',
        sort_order: 1
      },
      {
        code: 'EDUCATION',
        name_en: 'Education & Orphan Sponsorship',
        name_ur: 'شعبہ تعلیم و کفالتِ یتامیٰ',
        description: 'Orphan educational support, school fee sponsorships, textbook drives, and literacy programs.',
        sort_order: 2
      },
      {
        code: 'HEALTHCARE',
        name_en: 'Healthcare & Medical Assistance',
        name_ur: 'شعبہ صحت و طبی سہولیات',
        description: 'Free medical camps, patient prescription support, ambulance services, and emergency healthcare.',
        sort_order: 3
      },
      {
        code: 'FOOD',
        name_en: 'Food Security & Ration Support',
        name_ur: 'شعبہ راشن و غذائی امداد',
        description: 'Monthly ration bags, community dastarkhwan, and nutritional aid for destitute families.',
        sort_order: 4
      },
      {
        code: 'WATER',
        name_en: 'Clean Drinking Water Projects',
        name_ur: 'شعبہ صاف پانی و سینیٹیشن',
        description: 'Installation of community water filtration plants, tube-wells, and water supply in drought-hit regions.',
        sort_order: 5
      },
      {
        code: 'FINANCE',
        name_en: 'Accounts & Financial Management',
        name_ur: 'شعبہ اکاؤنٹس و مالیاتی انتظام',
        description: 'Official bookkeeping, donor receipt auditing, transparent ledger accounting, and treasury management.',
        sort_order: 6
      },
      {
        code: 'ADMIN',
        name_en: 'General Administration & Operations',
        name_ur: 'شعبہ عمومی انتظامیہ و آپریشنز',
        description: 'Central foundation governance, executive secretarial management, legal compliance, and human resources.',
        sort_order: 7
      },
      {
        code: 'VOLUNTEER',
        name_en: 'Volunteer Network & Community Outreach',
        name_ur: 'شعبہ رضاکار و فیلڈ رابطہ عامہ',
        description: 'Youth volunteer engagement, university partnerships, student internships, and community ambassador teams.',
        sort_order: 8
      }
    ];

    for (const d of initialDepartments) {
      await db.query(`
        INSERT INTO departments (code, name_en, name_ur, description, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          name_en = VALUES(name_en),
          name_ur = VALUES(name_ur),
          description = VALUES(description),
          sort_order = VALUES(sort_order);
      `, [d.code, d.name_en, d.name_ur, d.description, d.sort_order]);
    }
    console.log('✓ Seeded/verified initial departments');

    // 7. Seed default user roles
    const initialRoles = [
      {
        role_key: 'superadmin',
        name_en: 'Super Administrator',
        name_ur: 'سپر ایڈمنسٹریٹر',
        description: 'Full unconstrained system authority, user management, and executive organizational governance.',
        is_system: 1
      },
      {
        role_key: 'admin',
        name_en: 'Administrative Officer',
        name_ur: 'ایڈمنسٹریٹو آفیسر',
        description: 'General system administration, projects management, news updates, and application handling.',
        is_system: 1
      },
      {
        role_key: 'manager',
        name_en: 'Operations & Program Manager',
        name_ur: 'پروگرام و آپریشنز مینیجر',
        description: 'Oversees on-ground field execution, project timelines, volunteer coordination, and logistics.',
        is_system: 1
      },
      {
        role_key: 'accountant',
        name_en: 'Accounts & Finance Officer',
        name_ur: 'اکاؤنٹس و فنانس آفیسر',
        description: 'Manages donations, bank verifications, payment ledger records, and official audit receipts.',
        is_system: 1
      },
      {
        role_key: 'staff',
        name_en: 'Field Staff / Welfare Officer',
        name_ur: 'فیلڈ ویلفیئر آفیسر',
        description: 'Direct community field representative conducting on-site surveys and aid distributions.',
        is_system: 1
      },
      {
        role_key: 'coordinator',
        name_en: 'Relief & Project Coordinator',
        name_ur: 'ریلیف و پروجیکٹ کوآرڈینیٹر',
        description: 'Coordinates specialized welfare projects, volunteer teams, and regional relief drives.',
        is_system: 0
      },
      {
        role_key: 'volunteer',
        name_en: 'Honorary Volunteer',
        name_ur: 'اعزازی فلاحی رضاکار',
        description: 'Passionate community volunteer dedicating time and skills for humanitarian assistance.',
        is_system: 0
      },
      {
        role_key: 'intern',
        name_en: 'Academic Intern',
        name_ur: 'طالب علم انٹرن',
        description: 'Student intern undergoing institutional training and community research fellowship.',
        is_system: 0
      }
    ];

    for (const r of initialRoles) {
      await db.query(`
        INSERT INTO user_roles (role_key, name_en, name_ur, description, is_system, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          name_en = VALUES(name_en),
          name_ur = VALUES(name_ur),
          description = VALUES(description),
          is_system = VALUES(is_system);
      `, [r.role_key, r.name_en, r.name_ur, r.description, r.is_system]);
    }
    console.log('✓ Seeded/verified initial user roles');

    // 8. Seed default designations (linked to departments)
    const [deptRows] = await db.query('SELECT id, code FROM departments');
    const deptMap = {};
    deptRows.forEach(d => { deptMap[d.code] = d.id; });

    const initialDesignations = [
      {
        name_en: 'Executive Director & Chief Patron',
        name_ur: 'ایگزیکٹو ڈائریکٹر و سرپرستِ اعلیٰ',
        dept_code: 'ADMIN',
        description: 'Highest executive patron overseeing strategic vision and ethical governance.',
        sort_order: 1
      },
      {
        name_en: 'Founder & CEO',
        name_ur: 'بانی و چیف ایگزیکٹو',
        dept_code: 'ADMIN',
        description: 'Principal visionary directing foundation operations, partnerships, and executive council.',
        sort_order: 2
      },
      {
        name_en: 'Chief Finance Officer',
        name_ur: 'چیف فنانس آفیسر',
        dept_code: 'FINANCE',
        description: 'Head of treasury, accounting controls, bank compliance, and financial integrity.',
        sort_order: 3
      },
      {
        name_en: 'Senior Welfare Program Director',
        name_ur: 'سینئر ویلفیئر پروگرام ڈائریکٹر',
        dept_code: 'ADMIN',
        description: 'Leads national welfare initiatives, beneficiary vetting, and strategic drives.',
        sort_order: 4
      },
      {
        name_en: 'Field Relief & Logistics Manager',
        name_ur: 'فیلڈ ریلیف و لاجسٹکس مینیجر',
        dept_code: 'RELIEF',
        description: 'Directs rapid emergency responses, warehousing, procurement, and transport in disaster areas.',
        sort_order: 5
      },
      {
        name_en: 'Senior Relief Coordinator',
        name_ur: 'سینئر کوآرڈینیٹر امدادی فلاحی امور',
        dept_code: 'RELIEF',
        description: 'Coordinates ground distribution points, volunteer teams, and relief registration.',
        sort_order: 6
      },
      {
        name_en: 'Healthcare Program Coordinator',
        name_ur: 'کوآرڈینیٹر شعبہ صحت و طبی کیمپ',
        dept_code: 'HEALTHCARE',
        description: 'Organizes mobile clinics, doctor panels, diagnostic testing, and medical rations.',
        sort_order: 7
      },
      {
        name_en: 'Education Welfare Officer',
        name_ur: 'آفیسر فلاحی تعلیمی امور',
        dept_code: 'EDUCATION',
        description: 'Oversees student scholarships, school fee verifications, and educational counseling.',
        sort_order: 8
      },
      {
        name_en: 'Honorary Community Ambassador',
        name_ur: 'اعزازی سفیرِ خدمتِ خلق',
        dept_code: 'VOLUNTEER',
        description: 'Community spokesperson and volunteer champion advocating foundation causes.',
        sort_order: 9
      },
      {
        name_en: 'Volunteer Field Coordinator',
        name_ur: 'رضاکار فیلڈ کوآرڈینیٹر',
        dept_code: 'VOLUNTEER',
        description: 'Coordinates volunteer teams during relief operations and food distributions.',
        sort_order: 10
      },
      {
        name_en: 'Clean Water Project Lead',
        name_ur: 'پروجیکٹ لیڈ واٹر سپلائی و فلٹریشن',
        dept_code: 'WATER',
        description: 'Supervises water filtration installation, deep well drilling, and water quality tests.',
        sort_order: 11
      },
      {
        name_en: 'Food Security Officer',
        name_ur: 'آفیسر راشن و غذائی کفالت',
        dept_code: 'FOOD',
        description: 'Manages ration package packaging, quality assurance, and beneficiary distributions.',
        sort_order: 12
      }
    ];

    for (const des of initialDesignations) {
      const deptId = deptMap[des.dept_code] || null;
      const [existingDes] = await db.query('SELECT id FROM designations WHERE name_en = ? LIMIT 1', [des.name_en]);
      if (existingDes.length === 0) {
        await db.query(`
          INSERT INTO designations (name_en, name_ur, department_id, description, sort_order, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `, [des.name_en, des.name_ur, deptId, des.description, des.sort_order]);
      } else {
        await db.query(`
          UPDATE designations 
          SET name_ur = ?, department_id = COALESCE(department_id, ?), description = ?, sort_order = ?
          WHERE id = ?
        `, [des.name_ur, deptId, des.description, des.sort_order, existingDes[0].id]);
      }
    }
    console.log('✓ Seeded/verified initial designations');

    // 9. Ensure required project categories exist in categories table:
    // Flood Relief, Education, Healthcare, Food Support, Clean Water (and keep Community Care)
    const requiredCategories = [
      {
        slug: 'flood-relief',
        icon: 'house-flood-water',
        name_en: 'Flood Relief',
        name_ur: 'سیلاب متاثرین کی امداد',
        description_en: 'Emergency flood rescue, tent shelters, hot cooked meals, and rebuilding flooded rural homes.',
        description_ur: 'سیلاب سے متاثرہ خاندانوں کے لیے خیمہ جات، پکا ہوا کھانا اور گھروں کی بحالی۔',
        sort_order: 1
      },
      {
        slug: 'orphan-education',
        icon: 'graduation-cap',
        name_en: 'Education',
        name_ur: 'تعلیم و کفالتِ یتامیٰ',
        description_en: 'Comprehensive academic sponsorships, school uniforms, books, and tuition for deserving children.',
        description_ur: 'مستحق اور یتیم بچوں کے لیے تعلیمی اخراجات، یونیفارم اور کتب کی فراہمی۔',
        sort_order: 2
      },
      {
        slug: 'school-fees-healthcare',
        icon: 'heart-pulse',
        name_en: 'Healthcare',
        name_ur: 'صحت و طبی سہولیات',
        description_en: 'Free medical diagnostics, prescription medications, dialysis funds, and mobile eye clinics.',
        description_ur: 'غریب اور نادار مریضوں کے لیے مفت ادویات، ٹیسٹ اور ایمرجنسی طبی امداد۔',
        sort_order: 3
      },
      {
        slug: 'food-ration-support',
        icon: 'utensils',
        name_en: 'Food Support',
        name_ur: 'راشن و غذائی امداد',
        description_en: 'Monthly staple food rations, Ramazan ration packages, and daily community meals.',
        description_ur: 'ضرورت مند خاندانوں کے لیے ماہانہ راشن بیگز اور رمضان المبارک کے غذائی پیکجز۔',
        sort_order: 4
      },
      {
        slug: 'clean-water',
        icon: 'hand-holding-droplet',
        name_en: 'Clean Water',
        name_ur: 'صاف پینے کا پانی',
        description_en: 'Installation of reverse osmosis filtration plants, water wells, and solar-powered hand pumps.',
        description_ur: 'دیہی علاقوں میں واٹر فلٹریشن پلانٹس، شمسی واٹر پمپس اور میٹھے پانی کے کنوؤں کی تنصیب۔',
        sort_order: 5
      },
      {
        slug: 'community-welfare',
        icon: 'users',
        name_en: 'Community Care',
        name_ur: 'سماجی خدمت و بحالی',
        description_en: 'Winter warm clothing, disability wheel-chairs, widow sustenance, and social assistance.',
        description_ur: 'سرمائی کپڑے، معذور افراد کے لیے وہیل چیئرز، بیواؤں کی مالی کفالت اور عمومی فلاحی امور۔',
        sort_order: 6
      }
    ];

    for (const c of requiredCategories) {
      const [existingCat] = await db.query('SELECT id, slug FROM categories WHERE slug = ? OR name_en = ? LIMIT 1', [c.slug, c.name_en]);
      if (existingCat.length === 0) {
        await db.query(`
          INSERT INTO categories (slug, icon, name_en, name_ur, description_en, description_ur, sort_order, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [c.slug, c.icon, c.name_en, c.name_ur, c.description_en, c.description_ur, c.sort_order]);
        console.log(`✓ Inserted category: ${c.name_en}`);
      } else {
        await db.query(`
          UPDATE categories 
          SET name_en = ?, name_ur = ?, icon = ?, description_en = ?, description_ur = ?, sort_order = ?, is_active = 1
          WHERE id = ?
        `, [c.name_en, c.name_ur, c.icon, c.description_en, c.description_ur, c.sort_order, existingCat[0].id]);
        console.log(`✓ Updated category: ${c.name_en} (ID: ${existingCat[0].id})`);
      }
    }

    // 10. Backfill existing users with department_id, role_id, designation_id
    const [rolesRows] = await db.query('SELECT id, role_key FROM user_roles');
    const roleKeyMap = {};
    rolesRows.forEach(r => { roleKeyMap[r.role_key] = r.id; });

    const [allDesRows] = await db.query('SELECT id, name_en, department_id FROM designations');
    const desNameMap = {};
    allDesRows.forEach(des => { desNameMap[des.name_en.toLowerCase()] = des; });

    const [allUsers] = await db.query('SELECT id, username, role, designation, department_id, role_id, designation_id FROM users');
    for (const u of allUsers) {
      let deptId = u.department_id;
      let rId = u.role_id || roleKeyMap[u.role] || null;
      let dId = u.designation_id;

      if (!deptId || !dId) {
        const desKey = (u.designation || '').toLowerCase().trim();
        let matchedDes = null;
        for (const [k, obj] of Object.entries(desNameMap)) {
          if (desKey.includes(k) || k.includes(desKey)) {
            matchedDes = obj;
            break;
          }
        }
        if (matchedDes) {
          dId = dId || matchedDes.id;
          deptId = deptId || matchedDes.department_id;
        } else if (u.role === 'accountant') {
          deptId = deptId || deptMap['FINANCE'];
        } else if (u.role === 'superadmin' || u.role === 'admin') {
          deptId = deptId || deptMap['ADMIN'];
        } else {
          deptId = deptId || deptMap['RELIEF'];
        }
      }

      await db.query(`
        UPDATE users 
        SET department_id = ?, role_id = ?, designation_id = ?
        WHERE id = ?
      `, [deptId, rId, dId, u.id]);
    }
    console.log(`✓ Backfilled ${allUsers.length} user(s) with dynamic department, role, and designation links.`);

    // 11. Backfill existing volunteer_applications
    const [allVols] = await db.query('SELECT id, application_type, areas_of_interest, department_id, role_id, designation_id FROM volunteer_applications');
    const defaultVolRoleId = roleKeyMap['volunteer'] || null;
    const defaultInternRoleId = roleKeyMap['intern'] || null;

    for (const v of allVols) {
      let deptId = v.department_id;
      let rId = v.role_id;
      let dId = v.designation_id;
      let roleKey = (v.application_type === 'internship') ? 'intern' : 'volunteer';

      if (!rId) {
        rId = (roleKey === 'intern') ? defaultInternRoleId : defaultVolRoleId;
      }

      if (!deptId) {
        const interest = (v.areas_of_interest || '').toLowerCase();
        if (interest.includes('medical') || interest.includes('health')) {
          deptId = deptMap['HEALTHCARE'];
        } else if (interest.includes('education') || interest.includes('tutor')) {
          deptId = deptMap['EDUCATION'];
        } else if (interest.includes('ration') || interest.includes('food')) {
          deptId = deptMap['FOOD'];
        } else {
          deptId = deptMap['VOLUNTEER'] || deptMap['RELIEF'];
        }
      }

      await db.query(`
        UPDATE volunteer_applications 
        SET department_id = ?, role_id = ?, role = ?, designation_id = ?
        WHERE id = ?
      `, [deptId, rId, roleKey, dId, v.id]);
    }
    console.log(`✓ Backfilled ${allVols.length} volunteer application(s) with dynamic assignments.`);

    console.log('=== Organization Setup Migration Completed Successfully ===');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateOrgSetup();
