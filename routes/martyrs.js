/**
 * QSF Martyrs (شہداء) Management & Historical Memorial Archive API (2007–2026)
 * Normalized MySQL Schema (Non-Destructive Migrations):
 *  - martyr_locations (Hierarchical Country -> Province -> District -> Tehsil -> Town/Village/Area + Aliases & Data Source)
 *  - martyr_wars (+ Parent Conflict Hierarchy, Category, Casualties/Injuries, Ceasefire, Verification Status & Audit)
 *  - martyr_war_locations (Many-to-Many Affected Locations per War)
 *  - martyr_war_images (War Historical Gallery)
 *  - martyrs (+ Separate Residential, Birth & Martyrdom Locations, Religious Community with Source, Demo Flag & Audit)
 *  - martyr_war_links (Primary + Additional War/Incident associations without duplicating martyr profiles)
 *  - martyr_photos (Ordered Memorial Photo Gallery)
 *  - martyr_family_members (Permission-Protected Private Family Contacts)
 *  - martyr_source_references (Structured Source Citations for Wars, Martyrs & Locations)
 *  - martyr_import_batches (Import Audit Trail)
 *  - martyr_activity_logs (Full Audit History for Martyrs, Wars & Locations)
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const cache = require('../config/cache');
const { requirePermission } = require('../middleware/auth');
const { upload, optimizeUploadedImage } = require('../middleware/upload');
const kurramSeed = require('../config/kurramLocationsSeed');
const kurramHistoricalSeed = require('../config/kurramHistoricalSeed');

function generateRecordSlug(primaryText, fallbackText, idOrCode = '') {
  const base = String(primaryText || fallbackText || 'record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const sfx = String(idOrCode || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return [base || 'record', sfx].filter(Boolean).join('-').slice(0, 220);
}

let schemaReady = false;
let schemaInitPromise = null;

async function ensureColumn(tableName, columnName, columnDefSql) {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  if (!cols.length) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefSql}`);
  }
}

async function ensureIndex(tableName, indexName, indexSql) {
  const [idx] = await db.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  if (!idx.length) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` ${indexSql}`);
  }
}

async function upsertSeedLocation(conn, data) {
  const {
    name_en, name_ur = null, alt_names = null, location_type, parent_id = null,
    country = null, province = null, district = null, district_ur = null, tehsil = null, tehsil_ur = null,
    latitude = null, longitude = null, maps_url = null,
    data_source = 'Official Geographical Directory', verification_status = 'verified'
  } = data;

  const [existing] = parent_id == null
    ? await conn.query(
        'SELECT id, name_ur, alt_names, data_source, tehsil_ur, district_ur FROM martyr_locations WHERE LOWER(name_en) = LOWER(?) AND parent_id IS NULL LIMIT 1',
        [name_en]
      )
    : await conn.query(
        'SELECT id, name_ur, alt_names, data_source, tehsil_ur, district_ur FROM martyr_locations WHERE LOWER(name_en) = LOWER(?) AND parent_id = ? LIMIT 1',
        [name_en, parent_id]
      );

  if (existing.length) {
    const row = existing[0];
    if ((!row.name_ur && name_ur) || (!row.alt_names && alt_names) || (!row.data_source && data_source) || (!row.tehsil_ur && tehsil_ur) || (!row.district_ur && district_ur)) {
      await conn.query(
        'UPDATE martyr_locations SET name_ur = COALESCE(name_ur, ?), alt_names = COALESCE(alt_names, ?), data_source = COALESCE(data_source, ?), tehsil_ur = COALESCE(tehsil_ur, ?), district_ur = COALESCE(district_ur, ?) WHERE id = ?',
        [name_ur, alt_names, data_source, tehsil_ur, district_ur, row.id]
      );
    }
    return { id: row.id, inserted: false };
  }

  const [res] = await conn.query(`
    INSERT INTO martyr_locations (
      name_en, name_ur, alt_names, location_type, parent_id,
      country, province, district, district_ur, tehsil, tehsil_ur,
      latitude, longitude, maps_url, data_source, verification_status, is_active,
      import_batch_id, imported_at, created_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), 'QSF Geographical Seed')
  `, [
    name_en, name_ur, alt_names, location_type, parent_id,
    country, province, district, district_ur, tehsil, tehsil_ur,
    latitude, longitude, maps_url, data_source, verification_status,
    kurramHistoricalSeed.importBatchId
  ]);
  return { id: res.insertId, inserted: true };
}

async function seedKurramLocations() {
  const conn = await db.pool.getConnection();
  let added = 0;
  try {
    const h = kurramSeed.hierarchy;
    const cRes = await upsertSeedLocation(conn, { ...h.country, country: h.country.name_en });
    if (cRes.inserted) added++;

    const pRes = await upsertSeedLocation(conn, {
      ...h.province,
      parent_id: cRes.id,
      country: h.country.name_en,
      province: h.province.name_en
    });
    if (pRes.inserted) added++;

    for (const d of h.districts) {
      const dRes = await upsertSeedLocation(conn, {
        name_en: d.name_en,
        name_ur: d.name_ur,
        alt_names: d.alt_names || null,
        location_type: 'District',
        parent_id: pRes.id,
        country: h.country.name_en,
        province: h.province.name_en,
        district: d.name_en,
        district_ur: d.name_ur || null,
        latitude: d.latitude || null,
        longitude: d.longitude || null,
        maps_url: d.maps_url || null,
        data_source: d.data_source || 'PBS Census & KP Government',
        verification_status: d.verification_status || 'verified'
      });
      if (dRes.inserted) added++;

      for (const t of (d.tehsils || [])) {
        const tRes = await upsertSeedLocation(conn, {
          name_en: t.name_en,
          name_ur: t.name_ur,
          alt_names: t.alt_names || null,
          location_type: 'Tehsil',
          parent_id: dRes.id,
          country: h.country.name_en,
          province: h.province.name_en,
          district: d.name_en,
          district_ur: d.name_ur || null,
          tehsil: t.name_en,
          tehsil_ur: t.name_ur || null,
          latitude: t.latitude || null,
          longitude: t.longitude || null,
          maps_url: t.maps_url || null,
          data_source: t.data_source || 'PBS Census & KP Urban Policy Unit',
          verification_status: t.verification_status || 'verified'
        });
        if (tRes.inserted) added++;

        for (const s of (t.settlements || [])) {
          const mapsLink = s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name_en}, ${t.name_en}, ${d.name_en}, Pakistan`)}`;
          const sRes = await upsertSeedLocation(conn, {
            name_en: s.name_en,
            name_ur: s.name_ur || null,
            alt_names: s.alt_names || null,
            location_type: s.location_type || 'Village',
            parent_id: tRes.id,
            country: h.country.name_en,
            province: h.province.name_en,
            district: d.name_en,
            district_ur: d.name_ur || null,
            tehsil: t.name_en,
            tehsil_ur: t.name_ur || null,
            latitude: s.latitude || null,
            longitude: s.longitude || null,
            maps_url: mapsLink,
            data_source: s.data_source || 'Kurram Geographical Directory',
            verification_status: s.verification_status || 'verified'
          });
          if (sRes.inserted) added++;
        }
      }
    }
    return added;
  } finally {
    conn.release();
  }
}

async function seedKurramHistoricalArchive(actor = null) {
  const conn = await db.pool.getConnection();
  let warsAdded = 0;
  let martyrsAdded = 0;
  try {
    const batchId = kurramHistoricalSeed.importBatchId;
    const importerName = (actor && actor.name) || kurramHistoricalSeed.importedByName;
    const importerId = (actor && actor.id) || null;

    const [allLocs] = await conn.query('SELECT id, name_en, tehsil, district, province, country, location_type FROM martyr_locations WHERE is_active = 1');
    const findLoc = (name, tehsil = null) => {
      if (!name) return null;
      const n = String(name).toLowerCase().trim();
      if (tehsil) {
        const t = String(tehsil).toLowerCase().trim();
        const exact = allLocs.find(l => String(l.name_en).toLowerCase() === n && String(l.tehsil || '').toLowerCase() === t);
        if (exact) return exact;
      }
      return allLocs.find(l => String(l.name_en).toLowerCase() === n) || null;
    };

    const warIdByRef = new Map();

    // Pass 1: Upsert Wars / Conflicts
    for (const c of kurramHistoricalSeed.conflicts) {
      const [existing] = await conn.query(
        'SELECT id, slug, name_ur FROM martyr_wars WHERE reference_code = ? AND is_deleted = 0 LIMIT 1',
        [c.reference_code]
      );

      let warId;
      const primaryLoc = findLoc(c.primary_location_name, c.tehsil);

      if (existing.length) {
        warId = existing[0].id;
        await conn.query(`
          UPDATE martyr_wars SET
            slug = COALESCE(slug, ?),
            name_ur = COALESCE(name_ur, ?),
            location_ur = COALESCE(location_ur, ?),
            short_description_ur = COALESCE(short_description_ur, ?),
            reason_cause_ur = COALESCE(reason_cause_ur, ?),
            historical_background_ur = COALESCE(historical_background_ur, ?),
            detailed_article_ur = COALESCE(detailed_article_ur, ?),
            reported_casualties_ur = COALESCE(reported_casualties_ur, ?),
            ceasefire_info_ur = COALESCE(ceasefire_info_ur, ?)
          WHERE id = ?
        `, [
          c.slug || generateRecordSlug(c.name, c.reference_code, warId),
          c.name_ur || null,
          c.location_ur || null,
          c.short_description_ur || null,
          c.reason_cause_ur || null,
          c.historical_background_ur || null,
          c.detailed_article_ur || null,
          c.reported_casualties_ur || null,
          c.ceasefire_info_ur || null,
          warId
        ]);
      } else {
        const [ins] = await conn.query(`
          INSERT INTO martyr_wars (
            slug, name, name_ur, reference_code, category, location, location_ur, country, province, district, tehsil, primary_location_id,
            start_date, end_date, short_description, short_description_ur, reason_cause, reason_cause_ur, reason_source,
            historical_background, historical_background_ur, detailed_article, detailed_article_ur, background_dir,
            reported_casualties, reported_casualties_ur, reported_injuries, casualty_status, casualty_notes, ceasefire_info, ceasefire_info_ur,
            verification_status, is_demo, import_batch_id, imported_at, imported_by_name,
            status, created_by, created_by_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ltr', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), ?, ?, ?, ?)
        `, [
          c.slug || generateRecordSlug(c.name, c.reference_code),
          c.name,
          c.name_ur || null,
          c.reference_code,
          c.category,
          c.primary_location_name || c.tehsil,
          c.location_ur || null,
          c.country || 'Pakistan',
          c.province || 'Khyber Pakhtunkhwa',
          c.district || 'Kurram District',
          c.tehsil || null,
          primaryLoc ? primaryLoc.id : null,
          c.start_date || null,
          c.end_date || null,
          c.short_description || null,
          c.short_description_ur || null,
          c.reason_cause || null,
          c.reason_cause_ur || null,
          c.reason_source || null,
          c.historical_background || null,
          c.historical_background_ur || null,
          c.detailed_article || null,
          c.detailed_article_ur || null,
          c.reported_casualties || null,
          c.reported_casualties_ur || null,
          c.reported_injuries || null,
          c.casualty_status || 'confirmed',
          c.casualty_notes || null,
          c.ceasefire_info || null,
          c.ceasefire_info_ur || null,
          c.verification_status || 'verified',
          batchId,
          importerName,
          c.status || 'completed',
          importerId,
          importerName
        ]);
        warId = ins.insertId;
        warsAdded++;

        // Affected Locations
        if (primaryLoc) {
          await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, 1)', [warId, primaryLoc.id]);
        }
        for (const locName of (c.affected_location_names || [])) {
          const al = findLoc(locName);
          if (al) {
            await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, ?)', [warId, al.id, primaryLoc && al.id === primaryLoc.id ? 1 : 0]);
          }
        }

        // Source References
        for (const src of (c.sources || [])) {
          await conn.query(`
            INSERT INTO martyr_source_references (
              entity_type, entity_id, source_title, source_url, publisher,
              publication_date, incident_date, reported_casualties, casualty_status, source_notes
            ) VALUES ('war', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            warId,
            src.source_title,
            src.source_url || null,
            src.publisher || null,
            src.publication_date || null,
            src.incident_date || null,
            src.reported_casualties || null,
            src.casualty_status || 'confirmed',
            src.source_notes || null
          ]);
        }

        await logActivity(conn, {
          entityType: 'war',
          entityId: warId,
          action: 'imported',
          actor: { id: importerId, name: importerName, role: 'archival_import' },
          summary: `Imported verified historical conflict record "${c.name}" (${c.reference_code})`
        });
      }
      warIdByRef.set(c.reference_code, warId);
    }

    // Pass 2: Link parent_war_id for child episodes/incidents
    for (const c of kurramHistoricalSeed.conflicts) {
      if (c.parent_ref && warIdByRef.has(c.reference_code) && warIdByRef.has(c.parent_ref)) {
        await conn.query(
          'UPDATE martyr_wars SET parent_war_id = ? WHERE id = ? AND parent_war_id IS NULL',
          [warIdByRef.get(c.parent_ref), warIdByRef.get(c.reference_code)]
        );
      }
    }

    // Pass 3: Upsert Real Source-Verified Martyr Profiles
    for (const m of kurramHistoricalSeed.martyrs) {
      const primaryWarId = warIdByRef.get(m.primary_war_ref);
      if (!primaryWarId) continue;

      const [existingM] = await conn.query(
        'SELECT id, slug, full_name_ur FROM martyrs WHERE LOWER(full_name) = LOWER(?) AND date_of_martyrdom = ? AND is_deleted = 0 LIMIT 1',
        [m.full_name, m.date_of_martyrdom]
      );
      if (existingM.length) {
        const exId = existingM[0].id;
        await conn.query(`
          UPDATE martyrs SET
            slug = COALESCE(slug, ?),
            full_name_ur = COALESCE(full_name_ur, ?),
            father_name_ur = COALESCE(father_name_ur, ?),
            city_ur = COALESCE(city_ur, ?),
            place_of_martyrdom_ur = COALESCE(place_of_martyrdom_ur, ?),
            biography_ur = COALESCE(biography_ur, ?)
          WHERE id = ?
        `, [
          m.slug ? `${m.slug}-${exId}` : generateRecordSlug(m.full_name, m.home_village_name, exId),
          m.full_name_ur || null,
          m.father_name_ur || null,
          m.home_village_name_ur || null,
          m.martyrdom_village_name_ur || null,
          m.biography_ur || null,
          exId
        ]);
        continue;
      }

      const homeLoc = findLoc(m.home_village_name, m.home_tehsil);
      const marLoc = findLoc(m.martyrdom_village_name, m.martyrdom_tehsil);

      const [insM] = await conn.query(`
        INSERT INTO martyrs (
          slug, full_name, full_name_ur, father_name, father_name_ur, gender, date_of_birth, date_of_martyrdom, age_at_death,
          place_of_martyrdom, place_of_martyrdom_ur, martyrdom_location_id, country, martyrdom_province, martyrdom_district, martyrdom_tehsil,
          city, city_ur, residence_location_id, residence_tehsil, district, province_state, country_of_residence,
          primary_war_id, biography_html, biography_ur, biography_dir,
          religious_community, community_source_note, verification_status, is_demo,
          import_batch_id, imported_at, imported_by_name,
          status, show_father_name_public, show_home_location_public, created_by, created_by_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ltr', ?, ?, ?, 0, ?, NOW(), ?, 'published', 1, 1, ?, ?)
      `, [
        m.slug || generateRecordSlug(m.full_name, m.home_village_name),
        m.full_name,
        m.full_name_ur || null,
        m.father_name || null,
        m.father_name_ur || null,
        m.gender || 'male',
        m.date_of_birth || null,
        m.date_of_martyrdom || null,
        m.age_at_death || null,
        m.martyrdom_village_name || null,
        m.martyrdom_village_name_ur || null,
        marLoc ? marLoc.id : null,
        (marLoc && marLoc.country) || 'Pakistan',
        (marLoc && marLoc.province) || 'Khyber Pakhtunkhwa',
        (marLoc && marLoc.district) || 'Kurram District',
        m.martyrdom_tehsil || (marLoc && marLoc.tehsil) || null,
        m.home_village_name || null,
        m.home_village_name_ur || null,
        homeLoc ? homeLoc.id : null,
        m.home_tehsil || (homeLoc && homeLoc.tehsil) || null,
        (homeLoc && homeLoc.district) || 'Kurram District',
        (homeLoc && homeLoc.province) || 'Khyber Pakhtunkhwa',
        (homeLoc && homeLoc.country) || 'Pakistan',
        primaryWarId,
        m.biography_html || null,
        m.biography_ur || null,
        m.religious_community || 'Not Specified',
        m.community_source_note || null,
        m.verification_status || 'verified',
        batchId,
        importerName,
        importerId,
        importerName
      ]);

      const martyrId = insM.insertId;
      await conn.query('UPDATE martyrs SET slug = ? WHERE id = ?', [
        m.slug ? `${m.slug}-${martyrId}` : generateRecordSlug(m.full_name, m.home_village_name, martyrId),
        martyrId
      ]);
      martyrsAdded++;

      await conn.query('INSERT IGNORE INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 1)', [martyrId, primaryWarId]);
      for (const extraRef of (m.additional_war_refs || [])) {
        const extraWid = warIdByRef.get(extraRef);
        if (extraWid && extraWid !== primaryWarId) {
          await conn.query('INSERT IGNORE INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 0)', [martyrId, extraWid]);
        }
      }

      if (m.source) {
        await conn.query(`
          INSERT INTO martyr_source_references (
            entity_type, entity_id, source_title, source_url, publisher,
            publication_date, incident_date, reported_casualties, casualty_status, source_notes
          ) VALUES ('martyr', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          martyrId,
          m.source.source_title,
          m.source.source_url || null,
          m.source.publisher || null,
          m.source.publication_date || null,
          m.source.incident_date || null,
          m.source.reported_casualties || null,
          m.source.casualty_status || 'confirmed',
          m.source.source_notes || null
        ]);
      }

      await logActivity(conn, {
        entityType: 'martyr',
        entityId: martyrId,
        action: 'imported',
        actor: { id: importerId, name: importerName, role: 'archival_import' },
        summary: `Imported source-verified martyr profile "${m.full_name}" (${m.source ? m.source.publisher : 'Public Record'})`
      });
    }

    if (warsAdded > 0 || martyrsAdded > 0) {
      await conn.query(`
        INSERT INTO martyr_import_batches (batch_code, imported_by, imported_by_name, locations_added, wars_added, martyrs_added, notes)
        VALUES (?, ?, ?, 0, ?, ?, 'Verified Kurram Historical Archive Import (2007–2026)')
      `, [batchId, importerId, importerName, warsAdded, martyrsAdded]);
    }

    return { warsAdded, martyrsAdded };
  } finally {
    conn.release();
  }
}

async function ensureMartyrsSchema() {
  if (schemaReady) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    // 1. Hierarchical Geographical Locations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(180) NOT NULL,
        name_ur VARCHAR(180) NULL,
        location_type ENUM('Country','Province','District','Tehsil','Town','Village','Area','Locality') NOT NULL DEFAULT 'Village',
        parent_id INT NULL,
        country VARCHAR(120) NULL,
        province VARCHAR(120) NULL,
        district VARCHAR(120) NULL,
        tehsil VARCHAR(120) NULL,
        latitude DECIMAL(10,7) NULL,
        longitude DECIMAL(10,7) NULL,
        maps_url VARCHAR(512) NULL,
        verification_status ENUM('verified','needs_review','unverified') NOT NULL DEFAULT 'needs_review',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT NULL,
        created_by_name VARCHAR(180) NULL,
        updated_by INT NULL,
        updated_by_name VARCHAR(180) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ml_parent (parent_id),
        INDEX idx_ml_type (location_type, is_active),
        INDEX idx_ml_geo (country, province, district, tehsil),
        INDEX idx_ml_name (name_en),
        CONSTRAINT fk_ml_parent FOREIGN KEY (parent_id) REFERENCES martyr_locations(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await ensureColumn('martyr_locations', 'alt_names', "alt_names VARCHAR(255) NULL AFTER name_ur");
    await ensureColumn('martyr_locations', 'district_ur', "district_ur VARCHAR(180) NULL AFTER district");
    await ensureColumn('martyr_locations', 'tehsil_ur', "tehsil_ur VARCHAR(180) NULL AFTER tehsil");
    await ensureColumn('martyr_locations', 'data_source', "data_source VARCHAR(255) NULL AFTER maps_url");
    await ensureColumn('martyr_locations', 'source_notes', "source_notes TEXT NULL AFTER data_source");
    await ensureColumn('martyr_locations', 'import_batch_id', "import_batch_id VARCHAR(80) NULL AFTER is_active");
    await ensureColumn('martyr_locations', 'imported_at', "imported_at DATETIME NULL AFTER import_batch_id");

    // 2. Wars Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_wars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        reference_code VARCHAR(80) NULL,
        location VARCHAR(255) NULL,
        country VARCHAR(120) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        short_description TEXT NULL,
        historical_background LONGTEXT NULL,
        background_dir ENUM('ltr', 'rtl', 'auto') NOT NULL DEFAULT 'auto',
        cover_image_url VARCHAR(512) NULL,
        status ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mw_status (status, is_deleted),
        INDEX idx_mw_country (country),
        INDEX idx_mw_ref (reference_code),
        INDEX idx_mw_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await ensureColumn('martyr_wars', 'slug', "slug VARCHAR(255) NULL AFTER id");
    await ensureColumn('martyr_wars', 'parent_war_id', "parent_war_id INT NULL AFTER slug");
    await ensureColumn('martyr_wars', 'name_ur', "name_ur VARCHAR(255) NULL AFTER name");
    await ensureColumn('martyr_wars', 'category', "category VARCHAR(100) NULL AFTER reference_code");
    await ensureColumn('martyr_wars', 'location_ur', "location_ur VARCHAR(255) NULL AFTER location");
    await ensureColumn('martyr_wars', 'province', "province VARCHAR(120) NULL AFTER country");
    await ensureColumn('martyr_wars', 'district', "district VARCHAR(120) NULL AFTER province");
    await ensureColumn('martyr_wars', 'tehsil', "tehsil VARCHAR(120) NULL AFTER district");
    await ensureColumn('martyr_wars', 'primary_location_id', "primary_location_id INT NULL AFTER tehsil");
    await ensureColumn('martyr_wars', 'short_description_ur', "short_description_ur TEXT NULL AFTER short_description");
    await ensureColumn('martyr_wars', 'reason_cause', "reason_cause TEXT NULL AFTER short_description_ur");
    await ensureColumn('martyr_wars', 'reason_cause_ur', "reason_cause_ur TEXT NULL AFTER reason_cause");
    await ensureColumn('martyr_wars', 'reason_source', "reason_source VARCHAR(255) NULL AFTER reason_cause_ur");
    await ensureColumn('martyr_wars', 'historical_background_ur', "historical_background_ur LONGTEXT NULL AFTER historical_background");
    await ensureColumn('martyr_wars', 'detailed_article', "detailed_article LONGTEXT NULL AFTER historical_background_ur");
    await ensureColumn('martyr_wars', 'detailed_article_ur', "detailed_article_ur LONGTEXT NULL AFTER detailed_article");
    await ensureColumn('martyr_wars', 'reported_casualties', "reported_casualties VARCHAR(180) NULL AFTER detailed_article_ur");
    await ensureColumn('martyr_wars', 'reported_casualties_ur', "reported_casualties_ur VARCHAR(180) NULL AFTER reported_casualties");
    await ensureColumn('martyr_wars', 'reported_injuries', "reported_injuries VARCHAR(180) NULL AFTER reported_casualties_ur");
    await ensureColumn('martyr_wars', 'casualty_status', "casualty_status ENUM('confirmed','provisional','disputed','unverified') NOT NULL DEFAULT 'confirmed' AFTER reported_injuries");
    await ensureColumn('martyr_wars', 'casualty_notes', "casualty_notes TEXT NULL AFTER casualty_status");
    await ensureColumn('martyr_wars', 'ceasefire_info', "ceasefire_info TEXT NULL AFTER casualty_notes");
    await ensureColumn('martyr_wars', 'ceasefire_info_ur', "ceasefire_info_ur TEXT NULL AFTER ceasefire_info");
    await ensureColumn('martyr_wars', 'verification_status', "verification_status ENUM('verified','needs_review','unverified') NOT NULL DEFAULT 'verified' AFTER status");
    await ensureColumn('martyr_wars', 'is_demo', "is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_status");
    await ensureColumn('martyr_wars', 'import_batch_id', "import_batch_id VARCHAR(80) NULL AFTER is_demo");
    await ensureColumn('martyr_wars', 'imported_at', "imported_at DATETIME NULL AFTER import_batch_id");
    await ensureColumn('martyr_wars', 'imported_by_name', "imported_by_name VARCHAR(180) NULL AFTER imported_at");
    await ensureColumn('martyr_wars', 'created_by_name', "created_by_name VARCHAR(180) NULL AFTER created_by");
    await ensureColumn('martyr_wars', 'updated_by', "updated_by INT NULL AFTER created_by_name");
    await ensureColumn('martyr_wars', 'updated_by_name', "updated_by_name VARCHAR(180) NULL AFTER updated_by");
    await ensureColumn('martyr_wars', 'last_updated_at', "last_updated_at DATETIME NULL AFTER updated_by_name");
    await ensureIndex('martyr_wars', 'idx_mw_primary_loc', '(primary_location_id)');
    await ensureIndex('martyr_wars', 'idx_mw_parent', '(parent_war_id)');
    await ensureIndex('martyr_wars', 'idx_mw_slug', '(slug)');

    // 3. War Affected Locations
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_war_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        war_id INT NOT NULL,
        location_id INT NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_mwloc_pair (war_id, location_id),
        INDEX idx_mwloc_loc (location_id),
        CONSTRAINT fk_mwloc_war FOREIGN KEY (war_id) REFERENCES martyr_wars(id) ON DELETE CASCADE,
        CONSTRAINT fk_mwloc_loc FOREIGN KEY (location_id) REFERENCES martyr_locations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. War Gallery Images
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_war_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        war_id INT NOT NULL,
        image_url VARCHAR(512) NOT NULL,
        caption VARCHAR(255) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mwi_war (war_id, sort_order),
        CONSTRAINT fk_mwi_war FOREIGN KEY (war_id) REFERENCES martyr_wars(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Martyrs Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyrs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        profile_photo_url VARCHAR(512) NULL,
        father_name VARCHAR(255) NULL,
        mother_name VARCHAR(255) NULL,
        gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male',
        date_of_birth DATE NULL,
        date_of_martyrdom DATE NULL,
        age_at_death INT NULL,
        place_of_birth VARCHAR(255) NULL,
        place_of_martyrdom VARCHAR(255) NULL,
        country VARCHAR(120) NULL,
        residential_address TEXT NULL,
        city VARCHAR(120) NULL,
        district VARCHAR(120) NULL,
        province_state VARCHAR(120) NULL,
        country_of_residence VARCHAR(120) NULL,
        primary_war_id INT NOT NULL,
        biography_html LONGTEXT NULL,
        biography_dir ENUM('ltr', 'rtl', 'auto') NOT NULL DEFAULT 'auto',
        status ENUM('published', 'draft', 'archived') NOT NULL DEFAULT 'published',
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_m_name (full_name),
        INDEX idx_m_father (father_name),
        INDEX idx_m_war (primary_war_id),
        INDEX idx_m_country (country),
        INDEX idx_m_city (city),
        INDEX idx_m_dom (date_of_martyrdom),
        INDEX idx_m_status (status, is_deleted),
        CONSTRAINT fk_m_primary_war FOREIGN KEY (primary_war_id) REFERENCES martyr_wars(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await ensureColumn('martyrs', 'slug', "slug VARCHAR(255) NULL AFTER id");
    await ensureColumn('martyrs', 'full_name_ur', "full_name_ur VARCHAR(255) NULL AFTER full_name");
    await ensureColumn('martyrs', 'father_name_ur', "father_name_ur VARCHAR(255) NULL AFTER father_name");
    await ensureColumn('martyrs', 'mother_name_ur', "mother_name_ur VARCHAR(255) NULL AFTER mother_name");
    await ensureColumn('martyrs', 'place_of_birth_ur', "place_of_birth_ur VARCHAR(255) NULL AFTER place_of_birth");
    await ensureColumn('martyrs', 'place_of_martyrdom_ur', "place_of_martyrdom_ur VARCHAR(255) NULL AFTER place_of_martyrdom");
    await ensureColumn('martyrs', 'city_ur', "city_ur VARCHAR(180) NULL AFTER city");
    await ensureColumn('martyrs', 'biography_ur', "biography_ur LONGTEXT NULL AFTER biography_html");
    await ensureColumn('martyrs', 'residence_location_id', "residence_location_id INT NULL AFTER country_of_residence");
    await ensureColumn('martyrs', 'residence_tehsil', "residence_tehsil VARCHAR(120) NULL AFTER district");
    await ensureColumn('martyrs', 'birth_location_id', "birth_location_id INT NULL AFTER place_of_birth_ur");
    await ensureColumn('martyrs', 'martyrdom_location_id', "martyrdom_location_id INT NULL AFTER place_of_martyrdom_ur");
    await ensureColumn('martyrs', 'martyrdom_province', "martyrdom_province VARCHAR(120) NULL AFTER country");
    await ensureColumn('martyrs', 'martyrdom_district', "martyrdom_district VARCHAR(120) NULL AFTER martyrdom_province");
    await ensureColumn('martyrs', 'martyrdom_tehsil', "martyrdom_tehsil VARCHAR(120) NULL AFTER martyrdom_district");
    await ensureColumn('martyrs', 'religious_community', "religious_community VARCHAR(160) NULL AFTER biography_dir");
    await ensureColumn('martyrs', 'community_source_note', "community_source_note VARCHAR(300) NULL AFTER religious_community");
    await ensureColumn('martyrs', 'show_father_name_public', "show_father_name_public TINYINT(1) NOT NULL DEFAULT 1 AFTER status");
    await ensureColumn('martyrs', 'show_home_location_public', "show_home_location_public TINYINT(1) NOT NULL DEFAULT 1 AFTER show_father_name_public");
    await ensureColumn('martyrs', 'verification_status', "verification_status ENUM('verified','needs_review','unverified') NOT NULL DEFAULT 'verified' AFTER show_home_location_public");
    await ensureColumn('martyrs', 'is_demo', "is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_status");
    await ensureColumn('martyrs', 'import_batch_id', "import_batch_id VARCHAR(80) NULL AFTER is_demo");
    await ensureColumn('martyrs', 'imported_at', "imported_at DATETIME NULL AFTER import_batch_id");
    await ensureColumn('martyrs', 'imported_by_name', "imported_by_name VARCHAR(180) NULL AFTER imported_at");
    await ensureColumn('martyrs', 'created_by_name', "created_by_name VARCHAR(180) NULL AFTER created_by");
    await ensureColumn('martyrs', 'updated_by', "updated_by INT NULL AFTER created_by_name");
    await ensureColumn('martyrs', 'updated_by_name', "updated_by_name VARCHAR(180) NULL AFTER updated_by");
    await ensureColumn('martyrs', 'last_updated_at', "last_updated_at DATETIME NULL AFTER updated_by_name");

    await ensureIndex('martyrs', 'idx_m_res_loc', '(residence_location_id)');
    await ensureIndex('martyrs', 'idx_m_mar_loc', '(martyrdom_location_id)');
    await ensureIndex('martyrs', 'idx_m_res_tehsil', '(residence_tehsil)');
    await ensureIndex('martyrs', 'idx_m_mar_tehsil', '(martyrdom_tehsil)');
    await ensureIndex('martyrs', 'idx_m_demo', '(is_demo)');
    await ensureIndex('martyrs', 'idx_m_slug', '(slug)');

    // 6. Martyr War Links
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_war_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        martyr_id INT NOT NULL,
        war_id INT NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_mwl_pair (martyr_id, war_id),
        INDEX idx_mwl_war (war_id),
        CONSTRAINT fk_mwl_martyr FOREIGN KEY (martyr_id) REFERENCES martyrs(id) ON DELETE CASCADE,
        CONSTRAINT fk_mwl_war FOREIGN KEY (war_id) REFERENCES martyr_wars(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Martyr Photos
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        martyr_id INT NOT NULL,
        image_url VARCHAR(512) NOT NULL,
        caption VARCHAR(500) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mp_martyr (martyr_id, sort_order),
        CONSTRAINT fk_mp_martyr FOREIGN KEY (martyr_id) REFERENCES martyrs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Martyr Family Members
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_family_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        martyr_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        relationship ENUM('Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister', 'Other') NOT NULL DEFAULT 'Other',
        contact_number VARCHAR(80) NULL,
        email VARCHAR(160) NULL,
        residential_address TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mfm_martyr (martyr_id),
        CONSTRAINT fk_mfm_martyr FOREIGN KEY (martyr_id) REFERENCES martyrs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Structured Source References Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_source_references (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type ENUM('war', 'martyr', 'location') NOT NULL,
        entity_id INT NOT NULL,
        source_title VARCHAR(300) NOT NULL,
        source_url VARCHAR(600) NULL,
        publisher VARCHAR(180) NULL,
        publication_date DATE NULL,
        incident_date DATE NULL,
        reported_casualties VARCHAR(180) NULL,
        casualty_status ENUM('confirmed', 'provisional', 'disputed', 'unverified') NOT NULL DEFAULT 'confirmed',
        source_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msr_entity (entity_type, entity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Import Audit Trail Batches Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_import_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_code VARCHAR(80) NOT NULL,
        imported_by INT NULL,
        imported_by_name VARCHAR(180) NULL,
        locations_added INT NOT NULL DEFAULT 0,
        wars_added INT NOT NULL DEFAULT 0,
        martyrs_added INT NOT NULL DEFAULT 0,
        notes VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mib_code (batch_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Activity History Logs
    await db.query(`
      CREATE TABLE IF NOT EXISTS martyr_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type ENUM('martyr', 'war', 'location') NOT NULL,
        entity_id INT NOT NULL,
        action VARCHAR(64) NOT NULL,
        actor_id INT NULL,
        actor_name VARCHAR(180) NULL,
        actor_role VARCHAR(60) NULL,
        summary VARCHAR(500) NOT NULL,
        details_json TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mal_entity (entity_type, entity_id, created_at),
        INDEX idx_mal_actor (actor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed comprehensive Kurram geographical directory + 2007-2026 verified historical archive idempotently
    await seedKurramLocations();
    await seedKurramHistoricalArchive();

    // Ensure any custom martyrs or wars without slugs get deterministic slugs
    const [unsluggedMartyrs] = await db.query('SELECT id, full_name, full_name_ur, city FROM martyrs WHERE slug IS NULL OR slug = ""');
    for (const um of unsluggedMartyrs) {
      await db.query('UPDATE martyrs SET slug = ? WHERE id = ?', [
        generateRecordSlug(um.full_name, um.city || 'martyr', um.id),
        um.id
      ]);
    }
    const [unsluggedWars] = await db.query('SELECT id, name, reference_code FROM martyr_wars WHERE slug IS NULL OR slug = ""');
    for (const uw of unsluggedWars) {
      await db.query('UPDATE martyr_wars SET slug = ? WHERE id = ?', [
        generateRecordSlug(uw.name, uw.reference_code || 'war', uw.id),
        uw.id
      ]);
    }

    // Ensure the public Landing Page navigation menu item "Martyrs" / "شہداءِ ملت" points to /martyrs
    try {
      const [menuRows] = await db.query(
        "SELECT id FROM header_menus WHERE LOWER(title_en) IN ('martyrs', 'martyers') OR link_url = '/martyrs' ORDER BY id ASC LIMIT 1"
      );
      if (menuRows.length) {
        await db.query(
          "UPDATE header_menus SET title_en = 'Martyrs', title_ur = 'شہداءِ ملت', link_url = '/martyrs', is_active = 1 WHERE id = ?",
          [menuRows[0].id]
        );
      } else {
        await db.query(
          "INSERT INTO header_menus (menu_key, title_en, title_ur, link_url, row_num, col_side, is_active, sort_order) VALUES ('martyrs', 'Martyrs', 'شہداءِ ملت', '/martyrs', 1, 'left', 1, 5)"
        );
      }
      if (cache && typeof cache.del === 'function') {
        cache.del('public:bootstrap');
      }
    } catch (menuErr) {
      console.warn('[Martyrs Public Menu Sync Warning]', menuErr.message);
    }

    schemaReady = true;
  })().catch(err => {
    schemaInitPromise = null;
    throw err;
  });

  return schemaInitPromise;
}

// =========================================================================
// HELPERS
// =========================================================================
function getUserPermissions(user) {
  if (!user) return [];
  if (Array.isArray(user.permissions)) return user.permissions;
  if (typeof user.permissions === 'string') {
    try { return JSON.parse(user.permissions); } catch (_) { return user.permissions.split(',').map(s => s.trim()); }
  }
  return [];
}

function isFullAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'admin' || user.is_super_admin === 1 || user.is_admin === 1;
}

function canAccessFamilyContacts(user) {
  if (!user) return false;
  if (isFullAdmin(user)) return true;
  const perms = getUserPermissions(user);
  return perms.includes('martyrs_family');
}

function getActor(req) {
  const u = (req && req.session && req.session.user) || {};
  return {
    id: u.id || null,
    name: cleanStr(u.full_name || u.username || 'Administrator', 180) || 'Administrator',
    role: cleanStr(u.role || 'staff', 60) || 'staff'
  };
}

async function logActivity(executor, { entityType, entityId, action, actor, summary, details = null }) {
  try {
    await executor.query(`
      INSERT INTO martyr_activity_logs (entity_type, entity_id, action, actor_id, actor_name, actor_role, summary, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entityType,
      entityId,
      cleanStr(action, 64) || 'updated',
      actor ? actor.id : null,
      actor ? actor.name : null,
      actor ? actor.role : null,
      cleanStr(summary, 500) || action,
      details ? JSON.stringify(details) : null
    ]);
  } catch (err) {
    console.warn('[Martyrs Activity Log Warning]', err.message);
  }
}

async function lookupLocationById(executor, id) {
  const locId = parseInt(id, 10);
  if (!locId) return null;
  const [rows] = await executor.query(
    'SELECT id, name_en, name_ur, alt_names, location_type, parent_id, country, province, district, district_ur, tehsil, tehsil_ur, data_source, verification_status FROM martyr_locations WHERE id = ? LIMIT 1',
    [locId]
  );
  return rows.length ? rows[0] : null;
}

function cleanStr(val, maxLen = 255) {
  if (val == null) return null;
  const s = String(val).trim();
  return s ? s.slice(0, maxLen) : null;
}

function cleanCoord(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function cleanDate(val) {
  if (!val) return null;
  const s = String(val).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function formatDbDate(val) {
  if (!val) return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function sanitizeRichHtml(raw) {
  if (!raw) return '';
  let html = String(raw);
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript\s*:/gi, '');
  return html.trim();
}

function computeAgeAtDeath(dob, dom, providedAge) {
  if (dob && dom) {
    const b = new Date(dob + 'T00:00:00Z');
    const d = new Date(dom + 'T00:00:00Z');
    if (!Number.isNaN(b.getTime()) && !Number.isNaN(d.getTime()) && d >= b) {
      let age = d.getUTCFullYear() - b.getUTCFullYear();
      const mDiff = d.getUTCMonth() - b.getUTCMonth();
      if (mDiff < 0 || (mDiff === 0 && d.getUTCDate() < b.getUTCDate())) age--;
      return Math.max(0, Math.min(140, age));
    }
  }
  if (providedAge != null && providedAge !== '') {
    const n = parseInt(providedAge, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 140) return n;
  }
  return null;
}

function computeWarDuration(startDate, endDate, status) {
  const startStr = formatDbDate(startDate);
  const endStr = formatDbDate(endDate);
  if (!startStr) return 'Dates not specified';
  const s = new Date(startStr + 'T00:00:00Z');
  if (Number.isNaN(s.getTime())) return 'Dates not specified';
  const isOngoing = !endStr && status === 'active';
  const e = endStr ? new Date(endStr + 'T00:00:00Z') : new Date();
  if (Number.isNaN(e.getTime()) || e < s) return isOngoing ? 'Ongoing' : '1 day';

  const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  let label;
  if (diffDays >= 365) {
    const yrs = Math.floor(diffDays / 365);
    const remMonths = Math.floor((diffDays % 365) / 30);
    label = remMonths > 0 ? `${yrs} yr${yrs > 1 ? 's' : ''}, ${remMonths} mo${remMonths > 1 ? 's' : ''}` : `${yrs} year${yrs > 1 ? 's' : ''}`;
  } else if (diffDays >= 30) {
    const mos = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    label = remDays > 0 ? `${mos} mo${mos > 1 ? 's' : ''}, ${remDays} day${remDays > 1 ? 's' : ''}` : `${mos} month${mos > 1 ? 's' : ''}`;
  } else {
    label = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  return isOngoing ? `${label} (Ongoing)` : label;
}

const VALID_RELATIONS = new Set(['Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister', 'Other']);
const VALID_LOC_TYPES = new Set(['Country', 'Province', 'District', 'Tehsil', 'Town', 'Village', 'Area', 'Locality']);
const VALID_CASUALTY_STATUS = new Set(['confirmed', 'provisional', 'disputed', 'unverified']);

async function syncSourceReferences(executor, entityType, entityId, sourcesArray) {
  if (!Array.isArray(sourcesArray)) return;
  await executor.query('DELETE FROM martyr_source_references WHERE entity_type = ? AND entity_id = ?', [entityType, entityId]);
  for (const s of sourcesArray) {
    const title = cleanStr(s && (s.source_title || s.publisher || s.source_url), 300);
    if (!title) continue;
    const cStatus = VALID_CASUALTY_STATUS.has(s.casualty_status) ? s.casualty_status : 'confirmed';
    await executor.query(`
      INSERT INTO martyr_source_references (
        entity_type, entity_id, source_title, source_url, publisher,
        publication_date, incident_date, reported_casualties, casualty_status, source_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entityType,
      entityId,
      title,
      cleanStr(s.source_url, 600),
      cleanStr(s.publisher, 180),
      cleanDate(s.publication_date),
      cleanDate(s.incident_date),
      cleanStr(s.reported_casualties, 180),
      cStatus,
      cleanStr(s.source_notes, 2000)
    ]);
  }
}

// Require 'martyrs' module permission on all endpoints
router.use(requirePermission('martyrs'));

// =========================================================================
// IMAGE UPLOAD (OPTIMIZED WEBP INTO /media/martyrs OR /media/wars)
// =========================================================================
router.post('/upload-image', (req, res) => {
  const folder = req.query.folder === 'wars' ? 'wars' : 'martyrs';
  req.query.folder = folder;
  upload.single('image')(req, res, async err => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Image upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }
    try {
      await optimizeUploadedImage(req.file, { maxWidth: 1400 });
      return res.json({ success: true, url: req.file.publicUrl, filename: req.file.filename });
    } catch (_) {
      return res.json({ success: true, url: req.file.publicUrl, filename: req.file.filename });
    }
  });
});

// =========================================================================
// ACCESS / SUMMARY META + HISTORICAL IMPORT & DEMO DATA MANAGEMENT
// =========================================================================
router.get('/summary', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const [[warCounts]] = await db.query(`
      SELECT
        COUNT(*) AS total_wars,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_wars,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_wars,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_wars
      FROM martyr_wars
      WHERE is_deleted = 0
    `);
    const [[martyrCounts]] = await db.query(`
      SELECT
        COUNT(*) AS total_martyrs,
        SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_martyrs
      FROM martyrs
      WHERE is_deleted = 0 AND status != 'archived'
    `);
    const [[locCounts]] = await db.query(`
      SELECT COUNT(*) AS total_locations
      FROM martyr_locations
      WHERE is_active = 1 AND location_type IN ('Town','Village','Area','Locality')
    `);
    return res.json({
      success: true,
      can_manage_family: canAccessFamilyContacts(req.session.user),
      is_full_admin: isFullAdmin(req.session.user),
      stats: {
        total_wars: Number(warCounts.total_wars) || 0,
        active_wars: Number(warCounts.active_wars) || 0,
        completed_wars: Number(warCounts.completed_wars) || 0,
        archived_wars: Number(warCounts.archived_wars) || 0,
        total_martyrs: Number(martyrCounts.total_martyrs) || 0,
        demo_martyrs: Number(martyrCounts.demo_martyrs) || 0,
        total_locations: Number(locCounts.total_locations) || 0
      }
    });
  } catch (err) {
    console.error('[Martyrs Summary Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load martyrs archive summary.' });
  }
});

router.get('/import-preview', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const [batches] = await db.query('SELECT * FROM martyr_import_batches ORDER BY created_at DESC LIMIT 10');
    const [[locCount]] = await db.query('SELECT COUNT(*) AS cnt FROM martyr_locations WHERE is_active = 1');
    const [[warCount]] = await db.query('SELECT COUNT(*) AS cnt FROM martyr_wars WHERE is_deleted = 0');
    const [[martyrCount]] = await db.query('SELECT COUNT(*) AS cnt FROM martyrs WHERE is_deleted = 0 AND is_demo = 0');
    const [[demoCount]] = await db.query('SELECT COUNT(*) AS cnt FROM martyrs WHERE is_deleted = 0 AND is_demo = 1');
    const [[sourceCount]] = await db.query('SELECT COUNT(*) AS cnt FROM martyr_source_references');

    return res.json({
      success: true,
      seed_summary: {
        batch_id: kurramHistoricalSeed.importBatchId,
        available_conflicts: kurramHistoricalSeed.conflicts.length,
        available_verified_martyrs: kurramHistoricalSeed.martyrs.length
      },
      database_status: {
        active_locations: Number(locCount.cnt) || 0,
        active_wars: Number(warCount.cnt) || 0,
        verified_martyrs: Number(martyrCount.cnt) || 0,
        demo_martyrs: Number(demoCount.cnt) || 0,
        attached_sources: Number(sourceCount.cnt) || 0
      },
      recent_batches: batches
    });
  } catch (err) {
    console.error('[Martyrs Import Preview Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load import audit preview.' });
  }
});

router.post('/import-historical', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const actor = getActor(req);
    const locsAdded = await seedKurramLocations();
    const { warsAdded, martyrsAdded } = await seedKurramHistoricalArchive(actor);
    return res.json({
      success: true,
      locations_added: locsAdded,
      wars_added: warsAdded,
      martyrs_added: martyrsAdded,
      message: `Historical sync completed (${locsAdded} new locations, ${warsAdded} new conflicts, ${martyrsAdded} new martyr profiles added; existing records preserved).`
    });
  } catch (err) {
    console.error('[Martyrs Historical Import Error]', err);
    return res.status(500).json({ success: false, message: 'Historical import failed.' });
  }
});

router.post('/demo-seed', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const actor = getActor(req);
    const [wars] = await db.query('SELECT id, name FROM martyr_wars WHERE is_deleted = 0 ORDER BY id ASC LIMIT 1');
    if (!wars.length) return res.status(400).json({ success: false, message: 'Create or import at least one war first.' });
    const [locs] = await db.query("SELECT id, name_en, tehsil FROM martyr_locations WHERE name_en IN ('Jalandhar', 'Sameer') AND is_active = 1");
    const jLoc = locs.find(l => l.name_en === 'Jalandhar') || locs[0];
    const sLoc = locs.find(l => l.name_en === 'Sameer') || locs[0];

    const demoEntries = [
      {
        full_name: '[DEMO DATA – NOT A REAL HISTORICAL PERSON] Sample Profile A (Jalandhar)',
        father_name: 'Demo Parent Record',
        city: jLoc ? jLoc.name_en : 'Jalandhar',
        res_loc_id: jLoc ? jLoc.id : null,
        tehsil: (jLoc && jLoc.tehsil) || 'Upper Kurram'
      },
      {
        full_name: '[DEMO DATA – NOT A REAL HISTORICAL PERSON] Sample Profile B (Sameer)',
        father_name: 'Demo Parent Record',
        city: sLoc ? sLoc.name_en : 'Sameer',
        res_loc_id: sLoc ? sLoc.id : null,
        tehsil: (sLoc && sLoc.tehsil) || 'Upper Kurram'
      }
    ];

    let created = 0;
    for (const d of demoEntries) {
      const [exists] = await db.query('SELECT id FROM martyrs WHERE full_name = ? AND is_deleted = 0 LIMIT 1', [d.full_name]);
      if (exists.length) continue;
      const [ins] = await db.query(`
        INSERT INTO martyrs (
          full_name, father_name, gender, date_of_martyrdom,
          place_of_martyrdom, martyrdom_location_id, country, martyrdom_province, martyrdom_district, martyrdom_tehsil,
          city, residence_location_id, residence_tehsil, district, province_state, country_of_residence,
          primary_war_id, biography_html, biography_dir,
          religious_community, verification_status, is_demo, status, created_by, created_by_name
        ) VALUES (?, ?, 'male', '2025-01-01', ?, ?, 'Pakistan', 'Khyber Pakhtunkhwa', 'Kurram District', ?, ?, ?, ?, 'Kurram District', 'Khyber Pakhtunkhwa', 'Pakistan', ?, '<p><strong>DEMO DATA – NOT A REAL HISTORICAL PERSON.</strong> Created solely to test UI layout and village filtering. Click "Remove Demo Data" at any time to purge all demo profiles.</p>', 'ltr', 'Not Specified (Demo Record)', 'unverified', 1, 'published', ?, ?)
      `, [
        d.full_name, d.father_name,
        d.city, d.res_loc_id, d.tehsil,
        d.city, d.res_loc_id, d.tehsil,
        wars[0].id, actor.id, actor.name
      ]);
      await db.query('INSERT IGNORE INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 1)', [ins.insertId, wars[0].id]);
      created++;
    }

    return res.json({
      success: true,
      created,
      message: created > 0 ? `Added ${created} clearly labeled DEMO record(s).` : 'Demo records are already present.'
    });
  } catch (err) {
    console.error('[Martyrs Demo Seed Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create demo records.' });
  }
});

router.delete('/demo-data', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const [demoMartyrs] = await db.query('SELECT id FROM martyrs WHERE is_demo = 1');
    const ids = demoMartyrs.map(r => r.id);
    if (ids.length) {
      await db.query("DELETE FROM martyr_activity_logs WHERE entity_type = 'martyr' AND entity_id IN (?)", [ids]);
      await db.query("DELETE FROM martyr_source_references WHERE entity_type = 'martyr' AND entity_id IN (?)", [ids]);
      await db.query('DELETE FROM martyrs WHERE id IN (?)', [ids]);
    }
    await db.query('DELETE FROM martyr_wars WHERE is_demo = 1');
    return res.json({
      success: true,
      removed_count: ids.length,
      message: `Removed ${ids.length} demo profile(s). All real historical records remain intact.`
    });
  } catch (err) {
    console.error('[Martyrs Remove Demo Data Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to remove demo data.' });
  }
});

// =========================================================================
// GEOGRAPHICAL LOCATIONS HIERARCHY & LIVE COUNT AGGREGATION API
// =========================================================================
router.get('/locations', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const where = [];
    const params = [];

    if (req.query.include_inactive !== '1') {
      where.push('is_active = 1');
    }
    if (req.query.type) {
      const types = String(req.query.type).split(',').map(s => s.trim()).filter(s => VALID_LOC_TYPES.has(s));
      if (types.length) {
        where.push(`location_type IN (${types.map(() => '?').join(',')})`);
        params.push(...types);
      }
    }
    if (req.query.country) { where.push('country = ?'); params.push(String(req.query.country).trim()); }
    if (req.query.province) { where.push('province = ?'); params.push(String(req.query.province).trim()); }
    if (req.query.district) { where.push('district = ?'); params.push(String(req.query.district).trim()); }
    if (req.query.tehsil) { where.push('tehsil = ?'); params.push(String(req.query.tehsil).trim()); }
    if (req.query.parent_id) { where.push('parent_id = ?'); params.push(parseInt(req.query.parent_id, 10) || 0); }
    if (req.query.search) {
      const lk = `%${String(req.query.search).trim()}%`;
      where.push('(name_en LIKE ? OR name_ur LIKE ? OR alt_names LIKE ? OR tehsil LIKE ? OR district LIKE ?)');
      params.push(lk, lk, lk, lk, lk);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [locations] = await db.query(`
      SELECT id, name_en, name_ur, alt_names, location_type, parent_id, country, province, district, district_ur, tehsil, tehsil_ur,
             latitude, longitude, maps_url, data_source, verification_status, is_active, created_by_name, updated_by_name
      FROM martyr_locations
      ${whereSql}
      ORDER BY FIELD(location_type, 'Country','Province','District','Tehsil','Town','Village','Area','Locality'), name_en ASC
    `, params);

    return res.json({ success: true, locations });
  } catch (err) {
    console.error('[Martyrs Locations GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load locations.' });
  }
});

router.get('/locations/tree', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const scope = ['residential', 'martyrdom', 'either'].includes(req.query.location_scope) ? req.query.location_scope : 'residential';
    const warId = parseInt(req.query.war_id, 10) || 0;

    const [allLocs] = await db.query(`
      SELECT id, name_en, name_ur, alt_names, location_type, parent_id, country, province, district, district_ur, tehsil, tehsil_ur,
             latitude, longitude, maps_url, data_source, verification_status
      FROM martyr_locations
      WHERE is_active = 1
      ORDER BY
        CASE WHEN name_en = 'Kurram District' THEN 0 ELSE 1 END,
        FIELD(name_en, 'Upper Kurram', 'Lower Kurram', 'Central Kurram'),
        FIELD(location_type, 'Country','Province','District','Tehsil','Town','Village','Area','Locality'),
        name_en ASC
    `);

    const mWhere = ["m.is_deleted = 0", "m.status != 'archived'"];
    const mParams = [];
    if (warId > 0) {
      mWhere.push('EXISTS (SELECT 1 FROM martyr_war_links mwl WHERE mwl.martyr_id = m.id AND mwl.war_id = ?)');
      mParams.push(warId);
    }
    const [martyrRows] = await db.query(`
      SELECT
        m.id,
        m.residence_location_id, m.country_of_residence, m.province_state, m.district AS res_district, m.residence_tehsil, m.city AS res_city,
        m.martyrdom_location_id, m.country AS mar_country, m.martyrdom_province, m.martyrdom_district, m.martyrdom_tehsil, m.place_of_martyrdom
      FROM martyrs m
      WHERE ${mWhere.join(' AND ')}
    `, mParams);

    const nodeMap = new Map();
    const martyrSets = new Map();
    for (const loc of allLocs) {
      nodeMap.set(loc.id, { ...loc, martyr_count: 0, children: [] });
      martyrSets.set(loc.id, new Set());
    }

    const addMartyrUpChain = (locId, martyrId) => {
      let curr = locId;
      const seen = new Set();
      while (curr && nodeMap.has(curr) && !seen.has(curr)) {
        seen.add(curr);
        martyrSets.get(curr).add(martyrId);
        curr = nodeMap.get(curr).parent_id;
      }
    };

    const byNormNameAndTehsil = new Map();
    const byNormName = new Map();
    const byNormTehsil = new Map();
    const byNormDistrict = new Map();
    for (const loc of allLocs) {
      const n = String(loc.name_en || '').toLowerCase().trim();
      if (['Town', 'Village', 'Area', 'Locality'].includes(loc.location_type)) {
        const t = String(loc.tehsil || '').toLowerCase().trim();
        byNormNameAndTehsil.set(`${n}|${t}`, loc.id);
        if (!byNormName.has(n)) byNormName.set(n, loc.id);
      } else if (loc.location_type === 'Tehsil') {
        byNormTehsil.set(n, loc.id);
      } else if (loc.location_type === 'District') {
        byNormDistrict.set(n, loc.id);
      }
    }

    const resolveFallbackLocId = (locId, villageText, tehsilText, districtText) => {
      if (locId && nodeMap.has(locId)) return locId;
      const vn = String(villageText || '').toLowerCase().trim();
      const tn = String(tehsilText || '').toLowerCase().trim();
      const dn = String(districtText || '').toLowerCase().trim();
      if (vn && tn && byNormNameAndTehsil.has(`${vn}|${tn}`)) return byNormNameAndTehsil.get(`${vn}|${tn}`);
      if (vn && byNormName.has(vn)) return byNormName.get(vn);
      if (tn && byNormTehsil.has(tn)) return byNormTehsil.get(tn);
      if (dn && byNormDistrict.has(dn)) return byNormDistrict.get(dn);
      return null;
    };

    for (const m of martyrRows) {
      if (scope === 'residential' || scope === 'either') {
        const rId = resolveFallbackLocId(m.residence_location_id, m.res_city, m.residence_tehsil, m.res_district);
        if (rId) addMartyrUpChain(rId, m.id);
      }
      if (scope === 'martyrdom' || scope === 'either') {
        const pId = resolveFallbackLocId(m.martyrdom_location_id, m.place_of_martyrdom, m.martyrdom_tehsil, m.martyrdom_district);
        if (pId) addMartyrUpChain(pId, m.id);
      }
    }

    const roots = [];
    for (const loc of allLocs) {
      const node = nodeMap.get(loc.id);
      node.martyr_count = martyrSets.get(loc.id).size;
      if (loc.parent_id && nodeMap.has(loc.parent_id)) {
        nodeMap.get(loc.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return res.json({
      success: true,
      location_scope: scope,
      total_active_martyrs: martyrRows.length,
      tree: roots
    });
  } catch (err) {
    console.error('[Martyrs Locations Tree Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load locations hierarchy.' });
  }
});

router.post('/locations', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const b = req.body || {};
    const nameEn = cleanStr(b.name_en, 180);
    if (!nameEn) return res.status(400).json({ success: false, message: 'Location Name (English) is required.' });

    const locType = VALID_LOC_TYPES.has(b.location_type) ? b.location_type : 'Village';
    const parentId = parseInt(b.parent_id, 10) || null;
    const parentLoc = parentId ? await lookupLocationById(db, parentId) : null;
    if (parentId && !parentLoc) {
      return res.status(400).json({ success: false, message: 'Selected parent location does not exist.' });
    }

    const [dup] = parentId == null
      ? await db.query('SELECT id, name_en FROM martyr_locations WHERE LOWER(name_en) = LOWER(?) AND parent_id IS NULL LIMIT 1', [nameEn])
      : await db.query('SELECT id, name_en FROM martyr_locations WHERE LOWER(name_en) = LOWER(?) AND parent_id = ? LIMIT 1', [nameEn, parentId]);
    if (dup.length) {
      return res.status(409).json({
        success: false,
        message: `Location "${nameEn}" already exists under this parent region.`
      });
    }

    const country = cleanStr(b.country, 120) || (parentLoc && parentLoc.country) || (locType === 'Country' ? nameEn : 'Pakistan');
    const province = cleanStr(b.province, 120) || (parentLoc && parentLoc.province) || (locType === 'Province' ? nameEn : null);
    const district = cleanStr(b.district, 120) || (parentLoc && parentLoc.district) || (locType === 'District' ? nameEn : null);
    const districtUr = cleanStr(b.district_ur, 180) || (parentLoc && (parentLoc.district_ur || (parentLoc.location_type === 'District' ? parentLoc.name_ur : null))) || null;
    const tehsil = cleanStr(b.tehsil, 120) || (parentLoc && parentLoc.tehsil) || (locType === 'Tehsil' ? nameEn : null);
    const tehsilUr = cleanStr(b.tehsil_ur, 180) || (parentLoc && (parentLoc.tehsil_ur || (parentLoc.location_type === 'Tehsil' ? parentLoc.name_ur : null))) || null;

    const adminUser = isFullAdmin(req.session.user);
    const requestedVerif = ['verified', 'needs_review', 'unverified'].includes(b.verification_status) ? b.verification_status : (adminUser ? 'verified' : 'needs_review');
    const verificationStatus = adminUser ? requestedVerif : 'needs_review';
    const actor = getActor(req);

    const [ins] = await db.query(`
      INSERT INTO martyr_locations (
        name_en, name_ur, alt_names, location_type, parent_id,
        country, province, district, district_ur, tehsil, tehsil_ur,
        latitude, longitude, maps_url, data_source, verification_status, is_active,
        created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      nameEn,
      cleanStr(b.name_ur, 180),
      cleanStr(b.alt_names, 255),
      locType,
      parentId,
      country,
      province,
      district,
      districtUr,
      tehsil,
      tehsilUr,
      cleanCoord(b.latitude),
      cleanCoord(b.longitude),
      cleanStr(b.maps_url, 512),
      cleanStr(b.data_source, 255) || `Added by ${actor.name}`,
      verificationStatus,
      actor.id,
      actor.name
    ]);

    const newId = ins.insertId;
    await logActivity(db, {
      entityType: 'location',
      entityId: newId,
      action: 'created',
      actor,
      summary: `Added location "${nameEn}" (${locType}${tehsil ? ` · ${tehsil}` : ''}${district ? `, ${district}` : ''})`,
      details: { name_en: nameEn, alt_names: cleanStr(b.alt_names, 255), location_type: locType, parent_id: parentId, verification_status: verificationStatus }
    });

    const createdLoc = await lookupLocationById(db, newId);
    return res.status(201).json({
      success: true,
      id: newId,
      location: createdLoc,
      message: `Location "${nameEn}" added successfully.`
    });
  } catch (err) {
    console.error('[Martyrs Location POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to add location.' });
  }
});

router.put('/locations/:id', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const locId = parseInt(req.params.id, 10);
    if (!locId) return res.status(400).json({ success: false, message: 'Invalid location ID.' });

    const existing = await lookupLocationById(db, locId);
    if (!existing) return res.status(404).json({ success: false, message: 'Location not found.' });

    const b = req.body || {};
    const nameEn = cleanStr(b.name_en, 180) || existing.name_en;
    const locType = VALID_LOC_TYPES.has(b.location_type) ? b.location_type : existing.location_type;
    const adminUser = isFullAdmin(req.session.user);
    const verificationStatus = adminUser && ['verified', 'needs_review', 'unverified'].includes(b.verification_status)
      ? b.verification_status
      : existing.verification_status;
    const isActive = b.is_active === undefined ? 1 : (b.is_active ? 1 : 0);
    const actor = getActor(req);

    await db.query(`
      UPDATE martyr_locations SET
        name_en = ?, name_ur = ?, alt_names = ?, tehsil_ur = COALESCE(?, tehsil_ur), district_ur = COALESCE(?, district_ur), location_type = ?,
        latitude = ?, longitude = ?, maps_url = ?, data_source = ?,
        verification_status = ?, is_active = ?,
        updated_by = ?, updated_by_name = ?
      WHERE id = ?
    `, [
      nameEn,
      cleanStr(b.name_ur, 180),
      cleanStr(b.alt_names, 255),
      cleanStr(b.tehsil_ur, 180),
      cleanStr(b.district_ur, 180),
      locType,
      cleanCoord(b.latitude),
      cleanCoord(b.longitude),
      cleanStr(b.maps_url, 512),
      cleanStr(b.data_source, 255) || existing.data_source,
      verificationStatus,
      isActive,
      actor.id,
      actor.name,
      locId
    ]);

    await logActivity(db, {
      entityType: 'location',
      entityId: locId,
      action: 'updated',
      actor,
      summary: `Updated location "${nameEn}"`,
      details: { verification_status: verificationStatus, is_active: isActive }
    });

    return res.json({ success: true, id: locId, message: `Location "${nameEn}" updated.` });
  } catch (err) {
    console.error('[Martyrs Location PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
});

// =========================================================================
// WARS MANAGEMENT ENDPOINTS (PARENT-CHILD HIERARCHY, SOURCES, CASUALTIES & COUNTS)
// =========================================================================
router.get('/wars', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').toLowerCase();
    const country = String(req.query.country || '').trim();
    const category = String(req.query.category || '').trim();

    const where = ['w.is_deleted = 0'];
    const params = [];
    if (search) {
      where.push('(w.name LIKE ? OR w.reference_code LIKE ? OR w.location LIKE ? OR w.district LIKE ? OR w.tehsil LIKE ? OR w.country LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like);
    }
    if (['active', 'completed', 'archived'].includes(status)) {
      where.push('w.status = ?');
      params.push(status);
    } else if (status === 'non_archived') {
      where.push("w.status != 'archived'");
    }
    if (country) {
      where.push('w.country = ?');
      params.push(country);
    }
    if (category) {
      where.push('w.category = ?');
      params.push(category);
    }

    const [rows] = await db.query(`
      SELECT
        w.*,
        pw.name AS parent_war_name,
        pw.reference_code AS parent_war_code,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.status != 'archived' THEN m.id END) AS total_martyrs,
        (SELECT COUNT(*) FROM martyr_source_references msr WHERE msr.entity_type = 'war' AND msr.entity_id = w.id) AS source_count
      FROM martyr_wars w
      LEFT JOIN martyr_wars pw ON pw.id = w.parent_war_id
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = w.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE ${where.join(' AND ')}
      GROUP BY w.id
      ORDER BY FIELD(w.status, 'active', 'completed', 'archived'), COALESCE(w.start_date, w.created_at) DESC, w.id DESC
    `, params);

    const warIds = rows.map(r => r.id);
    const affectedMap = new Map();
    if (warIds.length) {
      const [locRows] = await db.query(`
        SELECT mwl.war_id, mwl.is_primary, l.id, l.name_en, l.name_ur, l.location_type, l.tehsil, l.district
        FROM martyr_war_locations mwl
        INNER JOIN martyr_locations l ON l.id = mwl.location_id
        WHERE mwl.war_id IN (?)
        ORDER BY mwl.is_primary DESC, l.name_en ASC
      `, [warIds]);
      for (const lr of locRows) {
        if (!affectedMap.has(lr.war_id)) affectedMap.set(lr.war_id, []);
        affectedMap.get(lr.war_id).push(lr);
      }
    }

    const wars = rows.map(w => ({
      ...w,
      start_date: formatDbDate(w.start_date),
      end_date: formatDbDate(w.end_date),
      total_martyrs: Number(w.total_martyrs) || 0,
      source_count: Number(w.source_count) || 0,
      duration_label: computeWarDuration(w.start_date, w.end_date, w.status),
      affected_locations: affectedMap.get(w.id) || []
    }));

    const [countryRows] = await db.query(
      "SELECT DISTINCT country FROM martyr_wars WHERE is_deleted = 0 AND country IS NOT NULL AND country != '' ORDER BY country ASC"
    );

    return res.json({
      success: true,
      wars,
      countries: countryRows.map(r => r.country)
    });
  } catch (err) {
    console.error('[Martyrs Wars GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load wars list.' });
  }
});

router.get('/wars/:id', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const warId = parseInt(req.params.id, 10);
    if (!warId) return res.status(400).json({ success: false, message: 'Invalid war ID.' });

    const [rows] = await db.query(`
      SELECT
        w.*,
        pw.name AS parent_war_name,
        pw.reference_code AS parent_war_code,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.status != 'archived' THEN m.id END) AS total_martyrs
      FROM martyr_wars w
      LEFT JOIN martyr_wars pw ON pw.id = w.parent_war_id
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = w.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE w.id = ? AND w.is_deleted = 0
      GROUP BY w.id
    `, [warId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'War / Conflict record not found.' });
    }

    const war = {
      ...rows[0],
      start_date: formatDbDate(rows[0].start_date),
      end_date: formatDbDate(rows[0].end_date),
      total_martyrs: Number(rows[0].total_martyrs) || 0,
      duration_label: computeWarDuration(rows[0].start_date, rows[0].end_date, rows[0].status)
    };

    // Child conflict episodes / incidents belonging to this parent war
    const [childEpisodes] = await db.query(`
      SELECT
        cw.id, cw.name, cw.reference_code, cw.category, cw.location, cw.tehsil, cw.start_date, cw.end_date,
        cw.reported_casualties, cw.casualty_status, cw.status,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.status != 'archived' THEN m.id END) AS total_martyrs
      FROM martyr_wars cw
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = cw.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE cw.parent_war_id = ? AND cw.is_deleted = 0
      GROUP BY cw.id
      ORDER BY COALESCE(cw.start_date, cw.created_at) ASC
    `, [warId]);

    const [images] = await db.query(
      'SELECT id, image_url, caption, sort_order FROM martyr_war_images WHERE war_id = ? ORDER BY sort_order ASC, id ASC',
      [warId]
    );

    const [sources] = await db.query(
      'SELECT * FROM martyr_source_references WHERE entity_type = ? AND entity_id = ? ORDER BY publication_date DESC, id ASC',
      ['war', warId]
    );

    const [affectedLocations] = await db.query(`
      SELECT
        l.id, l.name_en, l.name_ur, l.alt_names, l.location_type, l.country, l.province, l.district, l.tehsil,
        mwl.is_primary,
        COUNT(DISTINCT CASE
          WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.status != 'archived'
           AND (
             m.residence_location_id = l.id
             OR m.martyrdom_location_id = l.id
             OR (l.location_type = 'Tehsil' AND (m.residence_tehsil = l.name_en OR m.martyrdom_tehsil = l.name_en))
             OR (l.location_type = 'District' AND (m.district = l.name_en OR m.martyrdom_district = l.name_en))
           )
          THEN m.id END) AS martyr_count
      FROM martyr_war_locations mwl
      INNER JOIN martyr_locations l ON l.id = mwl.location_id
      LEFT JOIN martyr_war_links wl ON wl.war_id = mwl.war_id
      LEFT JOIN martyrs m ON m.id = wl.martyr_id
      WHERE mwl.war_id = ?
      GROUP BY l.id, mwl.is_primary
      ORDER BY mwl.is_primary DESC, l.name_en ASC
    `, [warId]);

    const [martyrs] = await db.query(`
      SELECT
        m.id, m.full_name, m.profile_photo_url, m.father_name, m.gender, m.date_of_birth,
        m.date_of_martyrdom, m.age_at_death, m.place_of_martyrdom, m.city, m.district, m.residence_tehsil, m.country,
        m.primary_war_id, m.status, m.is_demo, m.verification_status, m.created_by_name, mwl.is_primary,
        pw.name AS primary_war_name,
        rl.name_en AS residence_location_name,
        ml.name_en AS martyrdom_location_name
      FROM martyr_war_links mwl
      INNER JOIN martyrs m ON m.id = mwl.martyr_id
      LEFT JOIN martyr_wars pw ON pw.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE mwl.war_id = ? AND m.is_deleted = 0 AND m.status != 'archived'
      ORDER BY COALESCE(m.date_of_martyrdom, m.created_at) DESC, m.full_name ASC
    `, [warId]);

    const [activityLogs] = await db.query(`
      SELECT id, action, actor_id, actor_name, actor_role, summary, details_json, created_at
      FROM martyr_activity_logs
      WHERE entity_type = 'war' AND entity_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 40
    `, [warId]);

    return res.json({
      success: true,
      war,
      child_episodes: childEpisodes.map(ce => ({
        ...ce,
        start_date: formatDbDate(ce.start_date),
        end_date: formatDbDate(ce.end_date),
        total_martyrs: Number(ce.total_martyrs) || 0
      })),
      images,
      sources: sources.map(s => ({
        ...s,
        publication_date: formatDbDate(s.publication_date),
        incident_date: formatDbDate(s.incident_date)
      })),
      affected_locations: affectedLocations.map(al => ({
        ...al,
        is_primary: Boolean(al.is_primary),
        martyr_count: Number(al.martyr_count) || 0
      })),
      martyrs: martyrs.map(m => ({
        ...m,
        date_of_birth: formatDbDate(m.date_of_birth),
        date_of_martyrdom: formatDbDate(m.date_of_martyrdom)
      })),
      activity_logs: activityLogs
    });
  } catch (err) {
    console.error('[Martyrs War Detail GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load war detail.' });
  }
});

router.post('/wars', async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await ensureMartyrsSchema();
    const b = req.body || {};
    const nameEn = cleanStr(b.name, 255);
    const nameUr = cleanStr(b.name_ur, 255);
    const name = nameEn || nameUr;
    if (!name) return res.status(400).json({ success: false, message: 'War / Conflict Name (English or Urdu) is required.' });

    const status = ['active', 'completed', 'archived'].includes(b.status) ? b.status : 'active';
    const bgDir = ['ltr', 'rtl', 'auto'].includes(b.background_dir) ? b.background_dir : 'auto';
    const casualtyStatus = VALID_CASUALTY_STATUS.has(b.casualty_status) ? b.casualty_status : 'confirmed';
    const verifStatus = ['verified', 'needs_review', 'unverified'].includes(b.verification_status) ? b.verification_status : 'verified';
    const parentWarId = parseInt(b.parent_war_id, 10) || null;
    const startDate = cleanDate(b.start_date);
    const endDate = cleanDate(b.end_date);
    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ success: false, message: 'End Date cannot be earlier than Start Date.' });
    }

    const primaryLocId = parseInt(b.primary_location_id, 10) || null;
    const primaryLoc = primaryLocId ? await lookupLocationById(conn, primaryLocId) : null;
    const locationText = cleanStr(b.location, 255) || (primaryLoc ? primaryLoc.name_en : null);
    const locationUrText = cleanStr(b.location_ur, 255) || (primaryLoc ? primaryLoc.name_ur : null);
    const country = cleanStr(b.country, 120) || (primaryLoc ? primaryLoc.country : null);
    const province = cleanStr(b.province, 120) || (primaryLoc ? primaryLoc.province : null);
    const district = cleanStr(b.district, 120) || (primaryLoc ? primaryLoc.district : null);
    const tehsil = cleanStr(b.tehsil, 120) || (primaryLoc ? primaryLoc.tehsil : null);
    const actor = getActor(req);

    await conn.beginTransaction();
    const [result] = await conn.query(`
      INSERT INTO martyr_wars (
        parent_war_id, name, name_ur, reference_code, category, location, location_ur, country, province, district, tehsil, primary_location_id,
        start_date, end_date, short_description, short_description_ur, reason_cause, reason_cause_ur, reason_source,
        historical_background, historical_background_ur, detailed_article, detailed_article_ur,
        reported_casualties, reported_casualties_ur, reported_injuries, casualty_status, casualty_notes, ceasefire_info, ceasefire_info_ur,
        background_dir, cover_image_url, status, verification_status,
        created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parentWarId,
      name,
      nameUr,
      cleanStr(b.reference_code, 80),
      cleanStr(b.category, 100),
      locationText,
      locationUrText,
      country,
      province,
      district,
      tehsil,
      primaryLoc ? primaryLoc.id : null,
      startDate,
      endDate,
      cleanStr(b.short_description, 4000),
      cleanStr(b.short_description_ur, 4000),
      sanitizeRichHtml(b.reason_cause),
      sanitizeRichHtml(b.reason_cause_ur),
      cleanStr(b.reason_source, 255),
      sanitizeRichHtml(b.historical_background),
      sanitizeRichHtml(b.historical_background_ur),
      sanitizeRichHtml(b.detailed_article),
      sanitizeRichHtml(b.detailed_article_ur),
      cleanStr(b.reported_casualties, 180),
      cleanStr(b.reported_casualties_ur, 180),
      cleanStr(b.reported_injuries, 180),
      casualtyStatus,
      cleanStr(b.casualty_notes, 2000),
      cleanStr(b.ceasefire_info, 2000),
      cleanStr(b.ceasefire_info_ur, 2000),
      bgDir,
      cleanStr(b.cover_image_url, 512),
      status,
      verifStatus,
      actor.id,
      actor.name
    ]);

    const warId = result.insertId;
    const warSlug = generateRecordSlug(nameEn || locationText || 'war', cleanStr(b.reference_code, 80), warId);
    await conn.query('UPDATE martyr_wars SET slug = ? WHERE id = ?', [warSlug, warId]);

    const affectedIds = Array.isArray(b.affected_location_ids)
      ? b.affected_location_ids.map(x => parseInt(x, 10)).filter(x => x > 0)
      : [];
    if (primaryLoc) {
      await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, 1)', [warId, primaryLoc.id]);
    }
    for (const lid of Array.from(new Set(affectedIds))) {
      if (primaryLoc && lid === primaryLoc.id) continue;
      await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, 0)', [warId, lid]);
    }

    const extraImages = Array.isArray(b.images) ? b.images : [];
    for (let i = 0; i < extraImages.length; i++) {
      const img = extraImages[i];
      const url = cleanStr(img && img.image_url, 512);
      if (!url) continue;
      await conn.query(
        'INSERT INTO martyr_war_images (war_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)',
        [warId, url, cleanStr(img.caption, 255), i]
      );
    }

    if (Array.isArray(b.sources)) {
      await syncSourceReferences(conn, 'war', warId, b.sources);
    }

    await logActivity(conn, {
      entityType: 'war',
      entityId: warId,
      action: 'created',
      actor,
      summary: `Created war/incident record "${name}"`,
      details: { category: cleanStr(b.category, 100), location: locationText, affected_count: affectedIds.length + (primaryLoc ? 1 : 0) }
    });

    await conn.commit();
    return res.status(201).json({
      success: true,
      id: warId,
      war: { id: warId, name, reference_code: cleanStr(b.reference_code, 80), location: locationText, country, district, tehsil, status, total_martyrs: 0 },
      message: `War "${name}" created successfully.`
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('[Martyrs War POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create war record.' });
  } finally {
    conn.release();
  }
});

router.put('/wars/:id', async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await ensureMartyrsSchema();
    const warId = parseInt(req.params.id, 10);
    if (!warId) return res.status(400).json({ success: false, message: 'Invalid war ID.' });

    const b = req.body || {};
    const nameEn = cleanStr(b.name, 255);
    const nameUr = cleanStr(b.name_ur, 255);
    const name = nameEn || nameUr;
    if (!name) return res.status(400).json({ success: false, message: 'War / Conflict Name (English or Urdu) is required.' });

    const status = ['active', 'completed', 'archived'].includes(b.status) ? b.status : 'active';
    const bgDir = ['ltr', 'rtl', 'auto'].includes(b.background_dir) ? b.background_dir : 'auto';
    const casualtyStatus = VALID_CASUALTY_STATUS.has(b.casualty_status) ? b.casualty_status : 'confirmed';
    const verifStatus = ['verified', 'needs_review', 'unverified'].includes(b.verification_status) ? b.verification_status : 'verified';
    const parentWarId = parseInt(b.parent_war_id, 10) || null;
    const startDate = cleanDate(b.start_date);
    const endDate = cleanDate(b.end_date);
    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ success: false, message: 'End Date cannot be earlier than Start Date.' });
    }

    const primaryLocId = parseInt(b.primary_location_id, 10) || null;
    const primaryLoc = primaryLocId ? await lookupLocationById(conn, primaryLocId) : null;
    const locationText = cleanStr(b.location, 255) || (primaryLoc ? primaryLoc.name_en : null);
    const locationUrText = cleanStr(b.location_ur, 255) || (primaryLoc ? primaryLoc.name_ur : null);
    const country = cleanStr(b.country, 120) || (primaryLoc ? primaryLoc.country : null);
    const province = cleanStr(b.province, 120) || (primaryLoc ? primaryLoc.province : null);
    const district = cleanStr(b.district, 120) || (primaryLoc ? primaryLoc.district : null);
    const tehsil = cleanStr(b.tehsil, 120) || (primaryLoc ? primaryLoc.tehsil : null);
    const actor = getActor(req);

    await conn.beginTransaction();
    await conn.query(`
      UPDATE martyr_wars SET
        parent_war_id = ?, name = ?, name_ur = ?, reference_code = ?, category = ?, location = ?, location_ur = ?, country = ?, province = ?, district = ?, tehsil = ?, primary_location_id = ?,
        start_date = ?, end_date = ?, short_description = ?, short_description_ur = ?, reason_cause = ?, reason_cause_ur = ?, reason_source = ?,
        historical_background = ?, historical_background_ur = ?, detailed_article = ?, detailed_article_ur = ?,
        reported_casualties = ?, reported_casualties_ur = ?, reported_injuries = ?, casualty_status = ?, casualty_notes = ?, ceasefire_info = ?, ceasefire_info_ur = ?,
        background_dir = ?, cover_image_url = ?, status = ?, verification_status = ?,
        updated_by = ?, updated_by_name = ?, last_updated_at = NOW()
      WHERE id = ? AND is_deleted = 0
    `, [
      parentWarId === warId ? null : parentWarId,
      name,
      nameUr,
      cleanStr(b.reference_code, 80),
      cleanStr(b.category, 100),
      locationText,
      locationUrText,
      country,
      province,
      district,
      tehsil,
      primaryLoc ? primaryLoc.id : null,
      startDate,
      endDate,
      cleanStr(b.short_description, 4000),
      cleanStr(b.short_description_ur, 4000),
      sanitizeRichHtml(b.reason_cause),
      sanitizeRichHtml(b.reason_cause_ur),
      cleanStr(b.reason_source, 255),
      sanitizeRichHtml(b.historical_background),
      sanitizeRichHtml(b.historical_background_ur),
      sanitizeRichHtml(b.detailed_article),
      sanitizeRichHtml(b.detailed_article_ur),
      cleanStr(b.reported_casualties, 180),
      cleanStr(b.reported_casualties_ur, 180),
      cleanStr(b.reported_injuries, 180),
      casualtyStatus,
      cleanStr(b.casualty_notes, 2000),
      cleanStr(b.ceasefire_info, 2000),
      cleanStr(b.ceasefire_info_ur, 2000),
      bgDir,
      cleanStr(b.cover_image_url, 512),
      status,
      verifStatus,
      actor.id,
      actor.name,
      warId
    ]);

    if (Array.isArray(b.affected_location_ids) || b.primary_location_id !== undefined) {
      await conn.query('DELETE FROM martyr_war_locations WHERE war_id = ?', [warId]);
      const affectedIds = Array.isArray(b.affected_location_ids)
        ? b.affected_location_ids.map(x => parseInt(x, 10)).filter(x => x > 0)
        : [];
      if (primaryLoc) {
        await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, 1)', [warId, primaryLoc.id]);
      }
      for (const lid of Array.from(new Set(affectedIds))) {
        if (primaryLoc && lid === primaryLoc.id) continue;
        await conn.query('INSERT IGNORE INTO martyr_war_locations (war_id, location_id, is_primary) VALUES (?, ?, 0)', [warId, lid]);
      }
    }

    if (Array.isArray(b.images)) {
      await conn.query('DELETE FROM martyr_war_images WHERE war_id = ?', [warId]);
      for (let i = 0; i < b.images.length; i++) {
        const img = b.images[i];
        const url = cleanStr(img && img.image_url, 512);
        if (!url) continue;
        await conn.query(
          'INSERT INTO martyr_war_images (war_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)',
          [warId, url, cleanStr(img.caption, 255), i]
        );
      }
    }

    if (Array.isArray(b.sources)) {
      await syncSourceReferences(conn, 'war', warId, b.sources);
    }

    await logActivity(conn, {
      entityType: 'war',
      entityId: warId,
      action: 'updated',
      actor,
      summary: `Updated war/incident record "${name}"`
    });

    await conn.commit();
    return res.json({ success: true, id: warId, message: `War "${name}" updated successfully.` });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('[Martyrs War PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update war record.' });
  } finally {
    conn.release();
  }
});

router.patch('/wars/:id/status', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const warId = parseInt(req.params.id, 10);
    const status = req.body && req.body.status;
    if (!warId || !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid war ID or status.' });
    }
    const actor = getActor(req);
    await db.query(
      'UPDATE martyr_wars SET status = ?, updated_by = ?, updated_by_name = ?, last_updated_at = NOW() WHERE id = ? AND is_deleted = 0',
      [status, actor.id, actor.name, warId]
    );
    await logActivity(db, {
      entityType: 'war',
      entityId: warId,
      action: status === 'archived' ? 'archived' : 'updated',
      actor,
      summary: `Changed war status to ${status}`
    });
    return res.json({ success: true, message: `War status updated to ${status}.` });
  } catch (err) {
    console.error('[Martyrs War Status Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update war status.' });
  }
});

router.delete('/wars/:id', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const warId = parseInt(req.params.id, 10);
    if (!warId) return res.status(400).json({ success: false, message: 'Invalid war ID.' });

    const permanent = req.query.permanent === 'true';
    const [[linked]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM martyrs WHERE primary_war_id = ? AND is_deleted = 0',
      [warId]
    );

    if (permanent) {
      if (!isFullAdmin(req.session.user)) {
        return res.status(403).json({ success: false, message: 'Only administrators can permanently delete historical records.' });
      }
      if (Number(linked.cnt) > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot permanently delete this war because ${linked.cnt} martyr profile(s) are linked to it. Reassign them or archive the war instead.`
        });
      }
      await db.query("DELETE FROM martyr_source_references WHERE entity_type = 'war' AND entity_id = ?", [warId]);
      await db.query('DELETE FROM martyr_wars WHERE id = ?', [warId]);
      return res.json({ success: true, message: 'War permanently deleted.' });
    }

    const actor = getActor(req);
    await db.query("UPDATE martyr_wars SET status = 'archived', updated_by = ?, updated_by_name = ?, last_updated_at = NOW() WHERE id = ?", [actor.id, actor.name, warId]);
    await logActivity(db, { entityType: 'war', entityId: warId, action: 'archived', actor, summary: 'Archived war record' });
    return res.json({ success: true, message: 'War archived safely to preserve historical links.' });
  } catch (err) {
    console.error('[Martyrs War DELETE Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to archive/delete war.' });
  }
});

// =========================================================================
// MARTYRS DIRECTORY, DUPLICATE CHECK, PROFILE, CRUD & AUDIT HISTORY
// =========================================================================
router.get('/check-duplicate', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const fullName = String(req.query.full_name || '').trim();
    const fatherName = String(req.query.father_name || '').trim();
    const dom = cleanDate(req.query.date_of_martyrdom);
    const excludeId = parseInt(req.query.exclude_id, 10) || 0;

    if (fullName.length < 2) return res.json({ success: true, matches: [] });

    const conditions = ['m.is_deleted = 0', 'm.id != ?'];
    const params = [excludeId];

    const matchClauses = ['LOWER(TRIM(m.full_name)) = LOWER(?)'];
    params.push(fullName);

    if (fatherName.length >= 2) {
      matchClauses.push('(LOWER(m.full_name) LIKE LOWER(?) AND LOWER(m.father_name) LIKE LOWER(?))');
      params.push(`%${fullName}%`, `%${fatherName}%`);
    }
    if (dom) {
      matchClauses.push('(LOWER(m.full_name) LIKE LOWER(?) AND m.date_of_martyrdom = ?)');
      params.push(`%${fullName}%`, dom);
    }

    conditions.push(`(${matchClauses.join(' OR ')})`);

    const [matches] = await db.query(`
      SELECT m.id, m.full_name, m.father_name, m.date_of_martyrdom, m.place_of_martyrdom, m.profile_photo_url, w.name AS war_name
      FROM martyrs m
      LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 6
    `, params);

    return res.json({
      success: true,
      matches: matches.map(m => ({ ...m, date_of_martyrdom: formatDbDate(m.date_of_martyrdom) }))
    });
  } catch (err) {
    console.error('[Martyrs Duplicate Check Error]', err);
    return res.status(500).json({ success: false, message: 'Duplicate check failed.' });
  }
});

router.get('/duplicates', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const [groups] = await db.query(`
      SELECT
        LOWER(TRIM(full_name)) AS norm_name,
        LOWER(TRIM(COALESCE(father_name, ''))) AS norm_father,
        COUNT(*) AS dup_count,
        GROUP_CONCAT(id ORDER BY id ASC) AS ids
      FROM martyrs
      WHERE is_deleted = 0 AND status != 'archived'
      GROUP BY norm_name, norm_father
      HAVING dup_count > 1
      ORDER BY dup_count DESC
      LIMIT 30
    `);

    const allIds = [];
    groups.forEach(g => {
      String(g.ids || '').split(',').forEach(id => {
        const n = parseInt(id, 10);
        if (n) allIds.push(n);
      });
    });

    let records = [];
    if (allIds.length) {
      const [rows] = await db.query(`
        SELECT m.id, m.full_name, m.father_name, m.date_of_birth, m.date_of_martyrdom, m.place_of_martyrdom, m.profile_photo_url, w.name AS war_name
        FROM martyrs m
        LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
        WHERE m.id IN (?)
        ORDER BY m.full_name ASC, m.id ASC
      `, [allIds]);
      records = rows.map(r => ({
        ...r,
        date_of_birth: formatDbDate(r.date_of_birth),
        date_of_martyrdom: formatDbDate(r.date_of_martyrdom)
      }));
    }

    return res.json({ success: true, duplicate_groups: groups.length, records });
  } catch (err) {
    console.error('[Martyrs Duplicates List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to scan duplicates.' });
  }
});

router.get('/list', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const search = String(req.query.search || '').trim();
    const fatherSearch = String(req.query.father_name || '').trim();
    const warId = parseInt(req.query.war_id, 10) || 0;
    const country = String(req.query.country || '').trim();
    const province = String(req.query.province || '').trim();
    const district = String(req.query.district || '').trim();
    const tehsil = String(req.query.tehsil || '').trim();
    const locationId = parseInt(req.query.location_id, 10) || 0;
    const locationScope = ['residential', 'martyrdom', 'either'].includes(req.query.location_scope) ? req.query.location_scope : 'residential';
    const locationText = String(req.query.location || '').trim();
    const exactDate = cleanDate(req.query.date_of_martyrdom);
    const dateFrom = cleanDate(req.query.date_from);
    const dateTo = cleanDate(req.query.date_to);
    const status = String(req.query.status || 'active').toLowerCase();
    const demoFilter = String(req.query.demo_filter || 'all').toLowerCase();
    const sort = String(req.query.sort || 'recent');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(48, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    const where = ['m.is_deleted = 0'];
    const params = [];

    if (status === 'archived') {
      where.push("m.status = 'archived'");
    } else if (status === 'all') {
      // include all non-deleted
    } else {
      where.push("m.status != 'archived'");
    }

    if (demoFilter === 'real_only') {
      where.push('m.is_demo = 0');
    } else if (demoFilter === 'demo_only') {
      where.push('m.is_demo = 1');
    }

    if (search) {
      where.push('(m.full_name LIKE ? OR m.full_name_ur LIKE ? OR m.father_name LIKE ? OR m.father_name_ur LIKE ? OR m.place_of_martyrdom LIKE ? OR m.place_of_martyrdom_ur LIKE ? OR m.city LIKE ? OR m.city_ur LIKE ?)');
      const lk = `%${search}%`;
      params.push(lk, lk, lk, lk, lk, lk, lk, lk);
    }
    if (fatherSearch) {
      where.push('(m.father_name LIKE ? OR m.father_name_ur LIKE ?)');
      params.push(`%${fatherSearch}%`, `%${fatherSearch}%`);
    }
    if (warId > 0) {
      // Match martyrs directly linked to this war OR linked to child conflict episodes of this parent war!
      where.push(`EXISTS (
        SELECT 1 FROM martyr_war_links mwl
        INNER JOIN martyr_wars mw ON mw.id = mwl.war_id
        WHERE mwl.martyr_id = m.id AND (mwl.war_id = ? OR mw.parent_war_id = ?)
      )`);
      params.push(warId, warId);
    }

    if (locationId > 0) {
      const targetLoc = await lookupLocationById(db, locationId);
      if (targetLoc) {
        const [allLocs] = await db.query('SELECT id, parent_id, name_en, location_type FROM martyr_locations WHERE is_active = 1');
        const childrenByParent = new Map();
        for (const l of allLocs) {
          if (!childrenByParent.has(l.parent_id)) childrenByParent.set(l.parent_id, []);
          childrenByParent.get(l.parent_id).push(l);
        }
        const descendantIds = [targetLoc.id];
        const queue = [targetLoc.id];
        while (queue.length) {
          const cid = queue.shift();
          for (const ch of (childrenByParent.get(cid) || [])) {
            descendantIds.push(ch.id);
            queue.push(ch.id);
          }
        }

        const placeholders = descendantIds.map(() => '?').join(',');
        const scopeClauses = [];
        if (locationScope === 'residential' || locationScope === 'either') {
          const resSub = [`m.residence_location_id IN (${placeholders})`];
          params.push(...descendantIds);
          if (targetLoc.location_type === 'Tehsil') { resSub.push('m.residence_tehsil = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'District') { resSub.push('m.district = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Province') { resSub.push('m.province_state = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Country') { resSub.push('m.country_of_residence = ?'); params.push(targetLoc.name_en); }
          else { resSub.push('(m.residence_location_id IS NULL AND LOWER(m.city) = LOWER(?))'); params.push(targetLoc.name_en); }
          scopeClauses.push(`(${resSub.join(' OR ')})`);
        }
        if (locationScope === 'martyrdom' || locationScope === 'either') {
          const marSub = [`m.martyrdom_location_id IN (${placeholders})`];
          params.push(...descendantIds);
          if (targetLoc.location_type === 'Tehsil') { marSub.push('m.martyrdom_tehsil = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'District') { marSub.push('m.martyrdom_district = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Province') { marSub.push('m.martyrdom_province = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Country') { marSub.push('m.country = ?'); params.push(targetLoc.name_en); }
          else { marSub.push('(m.martyrdom_location_id IS NULL AND LOWER(m.place_of_martyrdom) = LOWER(?))'); params.push(targetLoc.name_en); }
          scopeClauses.push(`(${marSub.join(' OR ')})`);
        }
        where.push(`(${scopeClauses.join(' OR ')})`);
      }
    }

    if (country) {
      if (locationScope === 'residential') { where.push('m.country_of_residence = ?'); params.push(country); }
      else if (locationScope === 'martyrdom') { where.push('m.country = ?'); params.push(country); }
      else { where.push('(m.country = ? OR m.country_of_residence = ?)'); params.push(country, country); }
    }
    if (province) {
      if (locationScope === 'residential') { where.push('m.province_state = ?'); params.push(province); }
      else if (locationScope === 'martyrdom') { where.push('m.martyrdom_province = ?'); params.push(province); }
      else { where.push('(m.province_state = ? OR m.martyrdom_province = ?)'); params.push(province, province); }
    }
    if (district) {
      if (locationScope === 'residential') { where.push('m.district = ?'); params.push(district); }
      else if (locationScope === 'martyrdom') { where.push('m.martyrdom_district = ?'); params.push(district); }
      else { where.push('(m.district = ? OR m.martyrdom_district = ?)'); params.push(district, district); }
    }
    if (tehsil) {
      if (locationScope === 'residential') { where.push('m.residence_tehsil = ?'); params.push(tehsil); }
      else if (locationScope === 'martyrdom') { where.push('m.martyrdom_tehsil = ?'); params.push(tehsil); }
      else { where.push('(m.residence_tehsil = ? OR m.martyrdom_tehsil = ?)'); params.push(tehsil, tehsil); }
    }
    if (locationText) {
      const lk = `%${locationText}%`;
      if (locationScope === 'residential') {
        where.push('(m.city LIKE ? OR m.residence_tehsil LIKE ? OR m.district LIKE ? OR rl.name_en LIKE ? OR rl.alt_names LIKE ? OR rl.name_ur LIKE ?)');
        params.push(lk, lk, lk, lk, lk, lk);
      } else if (locationScope === 'martyrdom') {
        where.push('(m.place_of_martyrdom LIKE ? OR m.martyrdom_tehsil LIKE ? OR m.martyrdom_district LIKE ? OR ml.name_en LIKE ? OR ml.alt_names LIKE ? OR ml.name_ur LIKE ?)');
        params.push(lk, lk, lk, lk, lk, lk);
      } else {
        where.push('(m.city LIKE ? OR m.district LIKE ? OR m.place_of_martyrdom LIKE ? OR rl.name_en LIKE ? OR rl.alt_names LIKE ? OR ml.name_en LIKE ? OR ml.alt_names LIKE ?)');
        params.push(lk, lk, lk, lk, lk, lk, lk);
      }
    }

    if (exactDate) {
      where.push('m.date_of_martyrdom = ?');
      params.push(exactDate);
    } else {
      if (dateFrom) { where.push('m.date_of_martyrdom >= ?'); params.push(dateFrom); }
      if (dateTo) { where.push('m.date_of_martyrdom <= ?'); params.push(dateTo); }
    }

    let orderSql = 'COALESCE(m.date_of_martyrdom, "0000-01-01") DESC, m.id DESC';
    if (sort === 'recent') orderSql = 'm.created_at DESC, m.id DESC';
    else if (sort === 'name_asc') orderSql = 'm.full_name ASC, m.id ASC';
    else if (sort === 'name_desc') orderSql = 'm.full_name DESC, m.id DESC';
    else if (sort === 'martyrdom_desc') orderSql = 'COALESCE(m.date_of_martyrdom, "0000-01-01") DESC, m.id DESC';
    else if (sort === 'martyrdom_asc') orderSql = 'COALESCE(m.date_of_martyrdom, "9999-12-31") ASC, m.id ASC';

    const whereSql = where.join(' AND ');
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM martyrs m
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE ${whereSql}
    `, params);

    const [rows] = await db.query(`
      SELECT
        m.id, m.slug, m.full_name, m.full_name_ur, m.profile_photo_url, m.father_name, m.father_name_ur, m.gender,
        m.date_of_birth, m.date_of_martyrdom, m.age_at_death,
        m.place_of_martyrdom, m.place_of_martyrdom_ur, m.martyrdom_location_id, m.martyrdom_tehsil, m.martyrdom_district, m.country,
        m.city, m.city_ur, m.residence_location_id, m.residence_tehsil, m.district, m.province_state, m.country_of_residence,
        m.primary_war_id, m.biography_html, m.biography_ur, m.status, m.show_father_name_public, m.show_home_location_public,
        m.verification_status, m.is_demo, m.religious_community,
        m.created_by_name, m.updated_by_name, m.created_at, m.last_updated_at,
        w.name AS primary_war_name, w.name_ur AS primary_war_name_ur, w.location AS primary_war_location, w.location_ur AS primary_war_location_ur,
        rl.name_en AS residence_location_name, rl.name_ur AS residence_location_name_ur,
        ml.name_en AS martyrdom_location_name, ml.name_ur AS martyrdom_location_name_ur,
        (SELECT COUNT(*) FROM martyr_photos mp WHERE mp.martyr_id = m.id) AS photo_count,
        (SELECT COUNT(*) FROM martyr_source_references msr WHERE msr.entity_type = 'martyr' AND msr.entity_id = m.id) AS source_count
      FROM martyrs m
      LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countryFacets] = await db.query(`
      SELECT DISTINCT country FROM (
        SELECT country FROM martyr_locations WHERE is_active = 1 AND country IS NOT NULL AND country != ''
        UNION
        SELECT country FROM martyrs WHERE is_deleted = 0 AND country IS NOT NULL AND country != ''
        UNION
        SELECT country_of_residence AS country FROM martyrs WHERE is_deleted = 0 AND country_of_residence IS NOT NULL AND country_of_residence != ''
      ) c ORDER BY country ASC
    `);

    const [districtFacets] = await db.query(`
      SELECT DISTINCT district FROM (
        SELECT district FROM martyr_locations WHERE is_active = 1 AND district IS NOT NULL AND district != ''
        UNION
        SELECT district FROM martyrs WHERE is_deleted = 0 AND district IS NOT NULL AND district != ''
        UNION
        SELECT martyrdom_district AS district FROM martyrs WHERE is_deleted = 0 AND martyrdom_district IS NOT NULL AND martyrdom_district != ''
      ) d ORDER BY district ASC
    `);

    const [tehsilFacets] = await db.query(`
      SELECT DISTINCT tehsil FROM (
        SELECT tehsil FROM martyr_locations WHERE is_active = 1 AND tehsil IS NOT NULL AND tehsil != ''
        UNION
        SELECT residence_tehsil AS tehsil FROM martyrs WHERE is_deleted = 0 AND residence_tehsil IS NOT NULL AND residence_tehsil != ''
        UNION
        SELECT martyrdom_tehsil AS tehsil FROM martyrs WHERE is_deleted = 0 AND martyrdom_tehsil IS NOT NULL AND martyrdom_tehsil != ''
      ) t ORDER BY FIELD(tehsil, 'Upper Kurram', 'Lower Kurram', 'Central Kurram'), tehsil ASC
    `);

    return res.json({
      success: true,
      martyrs: rows.map(m => ({
        ...m,
        is_demo: Boolean(m.is_demo),
        source_count: Number(m.source_count) || 0,
        date_of_birth: formatDbDate(m.date_of_birth),
        date_of_martyrdom: formatDbDate(m.date_of_martyrdom)
      })),
      pagination: {
        total: Number(total) || 0,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil((Number(total) || 0) / limit))
      },
      facets: {
        countries: countryFacets.map(r => r.country),
        districts: districtFacets.map(r => r.district),
        tehsils: tehsilFacets.map(r => r.tehsil)
      }
    });
  } catch (err) {
    console.error('[Martyrs List GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load martyrs directory.' });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const martyrId = parseInt(req.params.id, 10);
    if (!martyrId) return res.status(400).json({ success: false, message: 'Invalid martyr ID.' });

    const [rows] = await db.query(`
      SELECT
        m.*,
        w.name AS primary_war_name,
        rl.name_en AS residence_location_name, rl.name_ur AS residence_location_name_ur, rl.alt_names AS residence_loc_alt, rl.tehsil AS residence_loc_tehsil, rl.district AS residence_loc_district,
        bl.name_en AS birth_location_name, bl.name_ur AS birth_location_name_ur,
        ml.name_en AS martyrdom_location_name, ml.name_ur AS martyrdom_location_name_ur, ml.alt_names AS martyrdom_loc_alt, ml.tehsil AS martyrdom_loc_tehsil, ml.district AS martyrdom_loc_district,
        cu.full_name AS joined_creator_name,
        uu.full_name AS joined_updater_name
      FROM martyrs m
      LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations bl ON bl.id = m.birth_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      LEFT JOIN users cu ON cu.id = m.created_by
      LEFT JOIN users uu ON uu.id = m.updated_by
      WHERE m.id = ? AND m.is_deleted = 0
    `, [martyrId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Martyr profile not found.' });
    }

    const r0 = rows[0];
    const martyr = {
      ...r0,
      is_demo: Boolean(r0.is_demo),
      date_of_birth: formatDbDate(r0.date_of_birth),
      date_of_martyrdom: formatDbDate(r0.date_of_martyrdom),
      created_by_name: r0.created_by_name || r0.joined_creator_name || null,
      updated_by_name: r0.updated_by_name || r0.joined_updater_name || null
    };

    const [wars] = await db.query(`
      SELECT w.id, w.name, w.reference_code, w.category, w.location, w.district, w.tehsil, w.country, w.start_date, w.end_date, w.status, w.cover_image_url,
             mwl.is_primary, mwl.notes
      FROM martyr_war_links mwl
      INNER JOIN martyr_wars w ON w.id = mwl.war_id
      WHERE mwl.martyr_id = ? AND w.is_deleted = 0
      ORDER BY mwl.is_primary DESC, w.start_date DESC
    `, [martyrId]);

    const warsWithDuration = wars.map(w => ({
      ...w,
      start_date: formatDbDate(w.start_date),
      end_date: formatDbDate(w.end_date),
      is_primary: Boolean(w.is_primary),
      duration_label: computeWarDuration(w.start_date, w.end_date, w.status)
    }));

    const [photos] = await db.query(
      'SELECT id, image_url, caption, sort_order FROM martyr_photos WHERE martyr_id = ? ORDER BY sort_order ASC, id ASC',
      [martyrId]
    );

    const [sources] = await db.query(
      'SELECT * FROM martyr_source_references WHERE entity_type = ? AND entity_id = ? ORDER BY publication_date DESC, id ASC',
      ['martyr', martyrId]
    );

    const allowFamily = canAccessFamilyContacts(req.session.user);
    let familyMembers = [];
    if (allowFamily) {
      const [famRows] = await db.query(
        'SELECT id, full_name, relationship, contact_number, email, residential_address, notes FROM martyr_family_members WHERE martyr_id = ? ORDER BY id ASC',
        [martyrId]
      );
      familyMembers = famRows;
    }

    const [activityLogs] = await db.query(`
      SELECT id, action, actor_id, actor_name, actor_role, summary, details_json, created_at
      FROM martyr_activity_logs
      WHERE entity_type = 'martyr' AND entity_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `, [martyrId]);

    return res.json({
      success: true,
      martyr,
      wars: warsWithDuration,
      photos,
      sources: sources.map(s => ({
        ...s,
        publication_date: formatDbDate(s.publication_date),
        incident_date: formatDbDate(s.incident_date)
      })),
      family_members: familyMembers,
      can_view_family: allowFamily,
      activity_logs: activityLogs
    });
  } catch (err) {
    console.error('[Martyr Profile GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load martyr profile.' });
  }
});

router.post('/profile', async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await ensureMartyrsSchema();
    const b = req.body || {};
    const fullNameEn = cleanStr(b.full_name, 255);
    const fullNameUr = cleanStr(b.full_name_ur, 255);
    const fullName = fullNameEn || fullNameUr;
    const primaryWarId = parseInt(b.primary_war_id, 10);

    if (!fullName) return res.status(400).json({ success: false, message: 'Full Name (English or Urdu) is required.' });
    if (!primaryWarId) return res.status(400).json({ success: false, message: 'Please select an associated War / Conflict.' });

    const [warCheck] = await conn.query('SELECT id, name FROM martyr_wars WHERE id = ? AND is_deleted = 0', [primaryWarId]);
    if (!warCheck.length) return res.status(400).json({ success: false, message: 'Selected War / Conflict does not exist.' });

    const dob = cleanDate(b.date_of_birth);
    const dom = cleanDate(b.date_of_martyrdom);
    if (dob && dom && dom < dob) {
      return res.status(400).json({ success: false, message: 'Date of Martyrdom cannot be earlier than Date of Birth.' });
    }

    const resLoc = await lookupLocationById(conn, b.residence_location_id);
    const birthLoc = await lookupLocationById(conn, b.birth_location_id);
    const marLoc = await lookupLocationById(conn, b.martyrdom_location_id);

    const placeOfBirth = cleanStr(b.place_of_birth, 255) || (birthLoc ? birthLoc.name_en : null);
    const placeOfBirthUr = cleanStr(b.place_of_birth_ur, 255) || (birthLoc ? birthLoc.name_ur : null);
    const placeOfMartyrdom = cleanStr(b.place_of_martyrdom, 255) || (marLoc ? marLoc.name_en : null);
    const placeOfMartyrdomUr = cleanStr(b.place_of_martyrdom_ur, 255) || (marLoc ? marLoc.name_ur : null);
    const marCountry = cleanStr(b.country, 120) || (marLoc ? marLoc.country : null);
    const marProvince = cleanStr(b.martyrdom_province, 120) || (marLoc ? marLoc.province : null);
    const marDistrict = cleanStr(b.martyrdom_district, 120) || (marLoc ? marLoc.district : null);
    const marTehsil = cleanStr(b.martyrdom_tehsil, 120) || (marLoc ? marLoc.tehsil : null);

    const resCity = cleanStr(b.city, 120) || (resLoc ? resLoc.name_en : null);
    const resCityUr = cleanStr(b.city_ur, 180) || (resLoc ? resLoc.name_ur : null);
    const resTehsil = cleanStr(b.residence_tehsil, 120) || (resLoc ? resLoc.tehsil : null);
    const resDistrict = cleanStr(b.district, 120) || (resLoc ? resLoc.district : null);
    const resProvince = cleanStr(b.province_state, 120) || (resLoc ? resLoc.province : null);
    const resCountry = cleanStr(b.country_of_residence, 120) || (resLoc ? resLoc.country : null);

    const ageAtDeath = computeAgeAtDeath(dob, dom, b.age_at_death);
    const gender = ['male', 'female', 'other'].includes(b.gender) ? b.gender : 'male';
    const bioDir = ['ltr', 'rtl', 'auto'].includes(b.biography_dir) ? b.biography_dir : 'auto';
    const status = ['published', 'draft', 'archived'].includes(b.status) ? b.status : 'published';
    const verifStatus = ['verified', 'needs_review', 'unverified'].includes(b.verification_status) ? b.verification_status : 'verified';
    const showFatherPublic = b.show_father_name_public === undefined ? 1 : (b.show_father_name_public ? 1 : 0);
    const showHomePublic = b.show_home_location_public === undefined ? 1 : (b.show_home_location_public ? 1 : 0);
    const isDemo = b.is_demo ? 1 : 0;
    const actor = getActor(req);

    await conn.beginTransaction();
    const [result] = await conn.query(`
      INSERT INTO martyrs (
        full_name, full_name_ur, profile_photo_url, father_name, father_name_ur, mother_name, mother_name_ur, gender,
        date_of_birth, date_of_martyrdom, age_at_death,
        place_of_birth, place_of_birth_ur, birth_location_id,
        place_of_martyrdom, place_of_martyrdom_ur, martyrdom_location_id, country, martyrdom_province, martyrdom_district, martyrdom_tehsil,
        residential_address, city, city_ur, district, residence_tehsil, province_state, country_of_residence, residence_location_id,
        primary_war_id, biography_html, biography_ur, biography_dir,
        religious_community, community_source_note, status, show_father_name_public, show_home_location_public, verification_status, is_demo,
        created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fullName,
      fullNameUr,
      cleanStr(b.profile_photo_url, 512),
      cleanStr(b.father_name, 255),
      cleanStr(b.father_name_ur, 255),
      cleanStr(b.mother_name, 255),
      cleanStr(b.mother_name_ur, 255),
      gender,
      dob,
      dom,
      ageAtDeath,
      placeOfBirth,
      placeOfBirthUr,
      birthLoc ? birthLoc.id : null,
      placeOfMartyrdom,
      placeOfMartyrdomUr,
      marLoc ? marLoc.id : null,
      marCountry,
      marProvince,
      marDistrict,
      marTehsil,
      cleanStr(b.residential_address, 2000),
      resCity,
      resCityUr,
      resDistrict,
      resTehsil,
      resProvince,
      resCountry,
      resLoc ? resLoc.id : null,
      primaryWarId,
      sanitizeRichHtml(b.biography_html),
      sanitizeRichHtml(b.biography_ur),
      bioDir,
      cleanStr(b.religious_community, 160) || 'Not Specified',
      cleanStr(b.community_source_note, 300),
      status,
      showFatherPublic,
      showHomePublic,
      verifStatus,
      isDemo,
      actor.id,
      actor.name
    ]);

    const martyrId = result.insertId;
    const martyrSlug = generateRecordSlug(fullNameEn || resCity || 'martyr', resCity, martyrId);
    await conn.query('UPDATE martyrs SET slug = ? WHERE id = ?', [martyrSlug, martyrId]);

    const extraWarIds = Array.isArray(b.additional_war_ids) ? b.additional_war_ids.map(x => parseInt(x, 10)).filter(x => x > 0 && x !== primaryWarId) : [];
    const uniqueExtraWars = Array.from(new Set(extraWarIds));
    await conn.query('INSERT INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 1)', [martyrId, primaryWarId]);
    for (const wid of uniqueExtraWars) {
      await conn.query('INSERT IGNORE INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 0)', [martyrId, wid]);
    }

    const photos = Array.isArray(b.photos) ? b.photos : [];
    let photoSaved = 0;
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const url = cleanStr(p && p.image_url, 512);
      if (!url) continue;
      await conn.query(
        'INSERT INTO martyr_photos (martyr_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)',
        [martyrId, url, cleanStr(p.caption, 500), i]
      );
      photoSaved++;
    }

    if (Array.isArray(b.sources)) {
      await syncSourceReferences(conn, 'martyr', martyrId, b.sources);
    }

    let familySaved = 0;
    if (canAccessFamilyContacts(req.session.user) && Array.isArray(b.family_members)) {
      for (const fm of b.family_members) {
        const fName = cleanStr(fm && fm.full_name, 255);
        if (!fName) continue;
        const rel = VALID_RELATIONS.has(fm.relationship) ? fm.relationship : 'Other';
        await conn.query(`
          INSERT INTO martyr_family_members (martyr_id, full_name, relationship, contact_number, email, residential_address, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          martyrId, fName, rel,
          cleanStr(fm.contact_number, 80),
          cleanStr(fm.email, 160),
          cleanStr(fm.residential_address, 2000),
          cleanStr(fm.notes, 2000)
        ]);
        familySaved++;
      }
    }

    await logActivity(conn, {
      entityType: 'martyr',
      entityId: martyrId,
      action: 'created',
      actor,
      summary: `Created martyr profile "${fullName}" (War: ${warCheck[0].name})`,
      details: {
        primary_war: warCheck[0].name,
        residence: resCity || null,
        place_of_martyrdom: placeOfMartyrdom || null,
        photos_added: photoSaved,
        family_contacts_added: familySaved
      }
    });

    await conn.commit();
    return res.status(201).json({
      success: true,
      id: martyrId,
      message: `Martyr profile for "${fullName}" saved successfully.`
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('[Martyr Profile POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create martyr profile.' });
  } finally {
    conn.release();
  }
});

router.put('/profile/:id', async (req, res) => {
  const conn = await db.pool.getConnection();
  try {
    await ensureMartyrsSchema();
    const martyrId = parseInt(req.params.id, 10);
    if (!martyrId) return res.status(400).json({ success: false, message: 'Invalid martyr ID.' });

    const [prevRows] = await conn.query('SELECT * FROM martyrs WHERE id = ? AND is_deleted = 0', [martyrId]);
    if (!prevRows.length) return res.status(404).json({ success: false, message: 'Martyr profile not found.' });
    const prev = prevRows[0];

    const b = req.body || {};
    const fullNameEn = cleanStr(b.full_name, 255);
    const fullNameUr = cleanStr(b.full_name_ur, 255);
    const fullName = fullNameEn || fullNameUr;
    const primaryWarId = parseInt(b.primary_war_id, 10);
    if (!fullName) return res.status(400).json({ success: false, message: 'Full Name (English or Urdu) is required.' });
    if (!primaryWarId) return res.status(400).json({ success: false, message: 'Please select an associated War / Conflict.' });

    const [warCheck] = await conn.query('SELECT id, name FROM martyr_wars WHERE id = ? AND is_deleted = 0', [primaryWarId]);
    if (!warCheck.length) return res.status(400).json({ success: false, message: 'Selected War / Conflict does not exist.' });

    const dob = cleanDate(b.date_of_birth);
    const dom = cleanDate(b.date_of_martyrdom);
    if (dob && dom && dom < dob) {
      return res.status(400).json({ success: false, message: 'Date of Martyrdom cannot be earlier than Date of Birth.' });
    }

    const resLoc = await lookupLocationById(conn, b.residence_location_id);
    const birthLoc = await lookupLocationById(conn, b.birth_location_id);
    const marLoc = await lookupLocationById(conn, b.martyrdom_location_id);

    const placeOfBirth = cleanStr(b.place_of_birth, 255) || (birthLoc ? birthLoc.name_en : null);
    const placeOfBirthUr = cleanStr(b.place_of_birth_ur, 255) || (birthLoc ? birthLoc.name_ur : null);
    const placeOfMartyrdom = cleanStr(b.place_of_martyrdom, 255) || (marLoc ? marLoc.name_en : null);
    const placeOfMartyrdomUr = cleanStr(b.place_of_martyrdom_ur, 255) || (marLoc ? marLoc.name_ur : null);
    const marCountry = cleanStr(b.country, 120) || (marLoc ? marLoc.country : null);
    const marProvince = cleanStr(b.martyrdom_province, 120) || (marLoc ? marLoc.province : null);
    const marDistrict = cleanStr(b.martyrdom_district, 120) || (marLoc ? marLoc.district : null);
    const marTehsil = cleanStr(b.martyrdom_tehsil, 120) || (marLoc ? marLoc.tehsil : null);

    const resCity = cleanStr(b.city, 120) || (resLoc ? resLoc.name_en : null);
    const resCityUr = cleanStr(b.city_ur, 180) || (resLoc ? resLoc.name_ur : null);
    const resTehsil = cleanStr(b.residence_tehsil, 120) || (resLoc ? resLoc.tehsil : null);
    const resDistrict = cleanStr(b.district, 120) || (resLoc ? resLoc.district : null);
    const resProvince = cleanStr(b.province_state, 120) || (resLoc ? resLoc.province : null);
    const resCountry = cleanStr(b.country_of_residence, 120) || (resLoc ? resLoc.country : null);

    const ageAtDeath = computeAgeAtDeath(dob, dom, b.age_at_death);
    const gender = ['male', 'female', 'other'].includes(b.gender) ? b.gender : 'male';
    const bioDir = ['ltr', 'rtl', 'auto'].includes(b.biography_dir) ? b.biography_dir : 'auto';
    const status = ['published', 'draft', 'archived'].includes(b.status) ? b.status : 'published';
    const verifStatus = ['verified', 'needs_review', 'unverified'].includes(b.verification_status) ? b.verification_status : (prev.verification_status || 'verified');
    const showFatherPublic = b.show_father_name_public === undefined ? (prev.show_father_name_public ?? 1) : (b.show_father_name_public ? 1 : 0);
    const showHomePublic = b.show_home_location_public === undefined ? (prev.show_home_location_public ?? 1) : (b.show_home_location_public ? 1 : 0);
    const isDemo = b.is_demo === undefined ? prev.is_demo : (b.is_demo ? 1 : 0);
    const actor = getActor(req);

    const [prevPhotos] = await conn.query('SELECT image_url FROM martyr_photos WHERE martyr_id = ?', [martyrId]);
    const prevPhotoSet = new Set(prevPhotos.map(p => p.image_url));
    const [[prevFamCountRow]] = await conn.query('SELECT COUNT(*) AS cnt FROM martyr_family_members WHERE martyr_id = ?', [martyrId]);

    await conn.beginTransaction();
    await conn.query(`
      UPDATE martyrs SET
        full_name = ?, full_name_ur = ?, profile_photo_url = ?, father_name = ?, father_name_ur = ?, mother_name = ?, mother_name_ur = ?, gender = ?,
        date_of_birth = ?, date_of_martyrdom = ?, age_at_death = ?,
        place_of_birth = ?, place_of_birth_ur = ?, birth_location_id = ?,
        place_of_martyrdom = ?, place_of_martyrdom_ur = ?, martyrdom_location_id = ?, country = ?, martyrdom_province = ?, martyrdom_district = ?, martyrdom_tehsil = ?,
        residential_address = ?, city = ?, city_ur = ?, district = ?, residence_tehsil = ?, province_state = ?, country_of_residence = ?, residence_location_id = ?,
        primary_war_id = ?, biography_html = ?, biography_ur = ?, biography_dir = ?,
        religious_community = ?, community_source_note = ?, status = ?, show_father_name_public = ?, show_home_location_public = ?, verification_status = ?, is_demo = ?,
        updated_by = ?, updated_by_name = ?, last_updated_at = NOW()
      WHERE id = ? AND is_deleted = 0
    `, [
      fullName,
      fullNameUr,
      cleanStr(b.profile_photo_url, 512),
      cleanStr(b.father_name, 255),
      cleanStr(b.father_name_ur, 255),
      cleanStr(b.mother_name, 255),
      cleanStr(b.mother_name_ur, 255),
      gender,
      dob,
      dom,
      ageAtDeath,
      placeOfBirth,
      placeOfBirthUr,
      birthLoc ? birthLoc.id : null,
      placeOfMartyrdom,
      placeOfMartyrdomUr,
      marLoc ? marLoc.id : null,
      marCountry,
      marProvince,
      marDistrict,
      marTehsil,
      cleanStr(b.residential_address, 2000),
      resCity,
      resCityUr,
      resDistrict,
      resTehsil,
      resProvince,
      resCountry,
      resLoc ? resLoc.id : null,
      primaryWarId,
      sanitizeRichHtml(b.biography_html),
      sanitizeRichHtml(b.biography_ur),
      bioDir,
      cleanStr(b.religious_community, 160) || prev.religious_community || 'Not Specified',
      cleanStr(b.community_source_note, 300) !== null ? cleanStr(b.community_source_note, 300) : prev.community_source_note,
      status,
      showFatherPublic,
      showHomePublic,
      verifStatus,
      isDemo,
      actor.id,
      actor.name,
      martyrId
    ]);

    const extraWarIds = Array.isArray(b.additional_war_ids) ? b.additional_war_ids.map(x => parseInt(x, 10)).filter(x => x > 0 && x !== primaryWarId) : [];
    const uniqueExtraWars = Array.from(new Set(extraWarIds));
    await conn.query('DELETE FROM martyr_war_links WHERE martyr_id = ?', [martyrId]);
    await conn.query('INSERT INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 1)', [martyrId, primaryWarId]);
    for (const wid of uniqueExtraWars) {
      await conn.query('INSERT IGNORE INTO martyr_war_links (martyr_id, war_id, is_primary) VALUES (?, ?, 0)', [martyrId, wid]);
    }

    let photosAdded = 0;
    let photosRemoved = 0;
    if (Array.isArray(b.photos)) {
      const nextUrls = new Set();
      await conn.query('DELETE FROM martyr_photos WHERE martyr_id = ?', [martyrId]);
      for (let i = 0; i < b.photos.length; i++) {
        const p = b.photos[i];
        const url = cleanStr(p && p.image_url, 512);
        if (!url) continue;
        nextUrls.add(url);
        if (!prevPhotoSet.has(url)) photosAdded++;
        await conn.query(
          'INSERT INTO martyr_photos (martyr_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)',
          [martyrId, url, cleanStr(p.caption, 500), i]
        );
      }
      for (const oldUrl of prevPhotoSet) {
        if (!nextUrls.has(oldUrl)) photosRemoved++;
      }
    }

    if (Array.isArray(b.sources)) {
      await syncSourceReferences(conn, 'martyr', martyrId, b.sources);
    }

    let familyUpdated = false;
    if (canAccessFamilyContacts(req.session.user) && Array.isArray(b.family_members)) {
      await conn.query('DELETE FROM martyr_family_members WHERE martyr_id = ?', [martyrId]);
      let nextFamCount = 0;
      for (const fm of b.family_members) {
        const fName = cleanStr(fm && fm.full_name, 255);
        if (!fName) continue;
        const rel = VALID_RELATIONS.has(fm.relationship) ? fm.relationship : 'Other';
        await conn.query(`
          INSERT INTO martyr_family_members (martyr_id, full_name, relationship, contact_number, email, residential_address, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          martyrId, fName, rel,
          cleanStr(fm.contact_number, 80),
          cleanStr(fm.email, 160),
          cleanStr(fm.residential_address, 2000),
          cleanStr(fm.notes, 2000)
        ]);
        nextFamCount++;
      }
      if (nextFamCount !== Number(prevFamCountRow.cnt) || nextFamCount > 0) {
        familyUpdated = true;
      }
    }

    let loggedSpecific = false;
    if (Number(prev.primary_war_id) !== primaryWarId) {
      await logActivity(conn, {
        entityType: 'martyr', entityId: martyrId, action: 'war_changed', actor,
        summary: `Changed associated war to "${warCheck[0].name}"`,
        details: { previous_war_id: prev.primary_war_id, new_war_id: primaryWarId, new_war_name: warCheck[0].name }
      });
      loggedSpecific = true;
    }

    const resChanged = Number(prev.residence_location_id || 0) !== Number(resLoc ? resLoc.id : 0)
      || (prev.city || '') !== (resCity || '');
    const marChanged = Number(prev.martyrdom_location_id || 0) !== Number(marLoc ? marLoc.id : 0)
      || (prev.place_of_martyrdom || '') !== (placeOfMartyrdom || '');
    if (resChanged || marChanged) {
      await logActivity(conn, {
        entityType: 'martyr', entityId: martyrId, action: 'location_changed', actor,
        summary: `Updated geographical location (${resChanged ? `Residence: ${resCity || '—'}` : ''}${resChanged && marChanged ? '; ' : ''}${marChanged ? `Martyrdom: ${placeOfMartyrdom || '—'}` : ''})`
      });
      loggedSpecific = true;
    }

    if (photosAdded > 0) {
      await logActivity(conn, {
        entityType: 'martyr', entityId: martyrId, action: 'photo_added', actor,
        summary: `Added ${photosAdded} photograph${photosAdded > 1 ? 's' : ''} to gallery`
      });
      loggedSpecific = true;
    }
    if (photosRemoved > 0) {
      await logActivity(conn, {
        entityType: 'martyr', entityId: martyrId, action: 'photo_removed', actor,
        summary: `Removed ${photosRemoved} photograph${photosRemoved > 1 ? 's' : ''} from gallery`
      });
      loggedSpecific = true;
    }
    if (familyUpdated) {
      await logActivity(conn, {
        entityType: 'martyr', entityId: martyrId, action: 'family_updated', actor,
        summary: 'Updated confidential family contact information'
      });
      loggedSpecific = true;
    }

    await logActivity(conn, {
      entityType: 'martyr', entityId: martyrId, action: 'updated', actor,
      summary: loggedSpecific ? `Updated martyr profile "${fullName}"` : `Edited profile details & biography for "${fullName}"`
    });

    await conn.commit();
    return res.json({
      success: true,
      id: martyrId,
      message: `Martyr profile for "${fullName}" updated successfully.`
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('[Martyr Profile PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update martyr profile.' });
  } finally {
    conn.release();
  }
});

router.patch('/profile/:id/archive', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const martyrId = parseInt(req.params.id, 10);
    if (!martyrId) return res.status(400).json({ success: false, message: 'Invalid martyr ID.' });
    const restore = Boolean(req.body && req.body.restore);
    const nextStatus = restore ? 'published' : 'archived';
    const actor = getActor(req);
    await db.query(
      'UPDATE martyrs SET status = ?, updated_by = ?, updated_by_name = ?, last_updated_at = NOW() WHERE id = ? AND is_deleted = 0',
      [nextStatus, actor.id, actor.name, martyrId]
    );
    await logActivity(db, {
      entityType: 'martyr', entityId: martyrId,
      action: restore ? 'restored' : 'archived', actor,
      summary: restore ? 'Restored martyr profile to active archive' : 'Archived martyr profile'
    });
    return res.json({
      success: true,
      status: nextStatus,
      message: restore ? 'Martyr profile restored to archive.' : 'Martyr profile archived.'
    });
  } catch (err) {
    console.error('[Martyr Archive Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update archive status.' });
  }
});

router.delete('/profile/:id', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const martyrId = parseInt(req.params.id, 10);
    if (!martyrId) return res.status(400).json({ success: false, message: 'Invalid martyr ID.' });
    const permanent = req.query.permanent === 'true';

    if (permanent) {
      if (!isFullAdmin(req.session.user)) {
        return res.status(403).json({ success: false, message: 'Only administrators can permanently delete martyr records.' });
      }
      await db.query("DELETE FROM martyr_source_references WHERE entity_type = 'martyr' AND entity_id = ?", [martyrId]);
      await db.query('DELETE FROM martyrs WHERE id = ?', [martyrId]);
      return res.json({ success: true, message: 'Martyr profile permanently deleted.' });
    }

    const actor = getActor(req);
    await db.query("UPDATE martyrs SET status = 'archived', is_deleted = 1, updated_by = ?, updated_by_name = ?, last_updated_at = NOW() WHERE id = ?", [actor.id, actor.name, martyrId]);
    await logActivity(db, { entityType: 'martyr', entityId: martyrId, action: 'archived', actor, summary: 'Soft-deleted / archived martyr profile' });
    return res.json({ success: true, message: 'Martyr profile archived/soft-deleted safely.' });
  } catch (err) {
    console.error('[Martyr Profile DELETE Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete martyr profile.' });
  }
});

// =========================================================================
// PUBLIC READ-ONLY MARTYRS MEMORIAL ARCHIVE ROUTER (/api/public/martyrs/*)
// Strict Privacy Policy:
//  - Read-only GET endpoints only
//  - Exposes ONLY published, non-deleted, non-demo records (status = 'published', is_deleted = 0, is_demo = 0)
//  - NEVER exposes private family contacts (martyr_family_members), complete residential street addresses,
//    user IDs, created_by / updated_by audit fields, import batch metadata, or activity logs.
// =========================================================================
const publicMartyrsRouter = express.Router();

const TEHSIL_UR_MAP = {
  'Upper Kurram': 'اپر کرم',
  'Lower Kurram': 'لوئر کرم',
  'Central Kurram': 'سینٹرل کرم',
  'Tall (Thall) Tehsil': 'تحصیل ٹل',
  'Hangu Tehsil': 'تحصیل ہنگو',
  'Kohat Tehsil': 'تحصیل کوہاٹ'
};

const DISTRICT_UR_MAP = {
  'Kurram District': 'ضلع کرم',
  'Hangu District': 'ضلع ہنگو',
  'Kohat District': 'ضلع کوہاٹ'
};

const PROVINCE_UR_MAP = {
  'Khyber Pakhtunkhwa': 'خیبر پختونخوا'
};

const COUNTRY_UR_MAP = {
  'Pakistan': 'پاکستان'
};

function sanitizePublicMartyrRow(m) {
  const showFather = m.show_father_name_public === undefined || Number(m.show_father_name_public) !== 0;
  const showHome = m.show_home_location_public === undefined || Number(m.show_home_location_public) !== 0;

  return {
    id: m.id,
    slug: m.slug || `martyr-${m.id}`,
    full_name: m.full_name,
    full_name_ur: m.full_name_ur || null,
    profile_photo_url: m.profile_photo_url || null,
    father_name: showFather ? (m.father_name || null) : null,
    father_name_ur: showFather ? (m.father_name_ur || null) : null,
    gender: m.gender || 'male',
    date_of_birth: formatDbDate(m.date_of_birth),
    date_of_martyrdom: formatDbDate(m.date_of_martyrdom),
    age_at_death: m.age_at_death != null ? Number(m.age_at_death) : null,
    place_of_birth: showHome ? (m.place_of_birth || m.birth_location_name || null) : null,
    place_of_birth_ur: showHome ? (m.place_of_birth_ur || m.birth_location_name_ur || null) : null,
    place_of_martyrdom: m.place_of_martyrdom || m.martyrdom_location_name || null,
    place_of_martyrdom_ur: m.place_of_martyrdom_ur || m.martyrdom_location_name_ur || null,
    martyrdom_location_id: m.martyrdom_location_id || null,
    martyrdom_location_name: m.martyrdom_location_name || m.place_of_martyrdom || null,
    martyrdom_location_name_ur: m.martyrdom_location_name_ur || m.place_of_martyrdom_ur || null,
    martyrdom_tehsil: m.martyrdom_tehsil || null,
    martyrdom_tehsil_ur: m.martyrdom_tehsil_ur || TEHSIL_UR_MAP[m.martyrdom_tehsil] || null,
    martyrdom_district: m.martyrdom_district || null,
    martyrdom_district_ur: m.martyrdom_district_ur || DISTRICT_UR_MAP[m.martyrdom_district] || null,
    country: m.country || 'Pakistan',
    country_ur: COUNTRY_UR_MAP[m.country || 'Pakistan'] || m.country || null,
    city: showHome ? (m.city || m.residence_location_name || null) : null,
    city_ur: showHome ? (m.city_ur || m.residence_location_name_ur || null) : null,
    residence_location_id: showHome ? (m.residence_location_id || null) : null,
    residence_location_name: showHome ? (m.residence_location_name || m.city || null) : null,
    residence_location_name_ur: showHome ? (m.residence_location_name_ur || m.city_ur || null) : null,
    residence_tehsil: showHome ? (m.residence_tehsil || null) : null,
    residence_tehsil_ur: showHome ? (m.residence_tehsil_ur || TEHSIL_UR_MAP[m.residence_tehsil] || null) : null,
    district: showHome ? (m.district || null) : null,
    district_ur: showHome ? (m.district_ur || DISTRICT_UR_MAP[m.district] || null) : null,
    province_state: showHome ? (m.province_state || null) : null,
    province_state_ur: showHome ? (PROVINCE_UR_MAP[m.province_state] || m.province_state || null) : null,
    primary_war_id: m.primary_war_id,
    primary_war_slug: m.primary_war_slug || (m.primary_war_id ? `war-${m.primary_war_id}` : null),
    primary_war_name: m.primary_war_name || null,
    primary_war_name_ur: m.primary_war_name_ur || null,
    photo_count: Number(m.photo_count) || 0,
    source_count: Number(m.source_count) || 0
  };
}

publicMartyrsRouter.get('/bootstrap', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const scope = ['residential', 'martyrdom', 'either'].includes(req.query.location_scope) ? req.query.location_scope : 'residential';
    const warId = parseInt(req.query.war_id, 10) || 0;

    const [[warCounts]] = await db.query(
      "SELECT COUNT(*) AS total_wars FROM martyr_wars WHERE is_deleted = 0 AND is_demo = 0 AND status != 'archived'"
    );
    const [[martyrCounts]] = await db.query(
      "SELECT COUNT(*) AS total_martyrs FROM martyrs WHERE is_deleted = 0 AND is_demo = 0 AND status = 'published'"
    );
    const [[locCounts]] = await db.query(
      'SELECT COUNT(*) AS total_locations FROM martyr_locations WHERE is_active = 1'
    );

    const [warRows] = await db.query(`
      SELECT
        w.id, w.slug, w.parent_war_id, w.name, w.name_ur, w.reference_code, w.category,
        w.location, w.location_ur, w.country, w.province, w.district, w.tehsil,
        w.start_date, w.end_date, w.short_description, w.short_description_ur,
        w.reported_casualties, w.reported_casualties_ur, w.reported_injuries, w.casualty_status,
        w.cover_image_url, w.status,
        pw.name AS parent_war_name, pw.name_ur AS parent_war_name_ur, pw.slug AS parent_war_slug,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published' THEN m.id END) AS total_martyrs,
        (SELECT COUNT(*) FROM martyr_source_references msr WHERE msr.entity_type = 'war' AND msr.entity_id = w.id) AS source_count
      FROM martyr_wars w
      LEFT JOIN martyr_wars pw ON pw.id = w.parent_war_id
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = w.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE w.is_deleted = 0 AND w.is_demo = 0 AND w.status != 'archived'
      GROUP BY w.id
      ORDER BY COALESCE(w.start_date, w.created_at) DESC, w.id DESC
    `);

    const [allLocs] = await db.query(`
      SELECT id, name_en, name_ur, alt_names, location_type, parent_id, country, province, district, district_ur, tehsil, tehsil_ur
      FROM martyr_locations
      WHERE is_active = 1
      ORDER BY
        CASE WHEN name_en = 'Kurram District' THEN 0 ELSE 1 END,
        FIELD(name_en, 'Upper Kurram', 'Lower Kurram', 'Central Kurram'),
        FIELD(location_type, 'Country','Province','District','Tehsil','Town','Village','Area','Locality'),
        name_en ASC
    `);

    const mWhere = ["m.is_deleted = 0", "m.is_demo = 0", "m.status = 'published'"];
    const mParams = [];
    if (warId > 0) {
      mWhere.push(`EXISTS (
        SELECT 1 FROM martyr_war_links mwl
        INNER JOIN martyr_wars mw ON mw.id = mwl.war_id
        WHERE mwl.martyr_id = m.id AND (mwl.war_id = ? OR mw.parent_war_id = ?)
      )`);
      mParams.push(warId, warId);
    }

    const [martyrRows] = await db.query(`
      SELECT
        m.id, m.show_home_location_public,
        m.residence_location_id, m.country_of_residence, m.province_state, m.district AS res_district, m.residence_tehsil, m.city AS res_city,
        m.martyrdom_location_id, m.country AS mar_country, m.martyrdom_province, m.martyrdom_district, m.martyrdom_tehsil, m.place_of_martyrdom
      FROM martyrs m
      WHERE ${mWhere.join(' AND ')}
    `, mParams);

    const nodeMap = new Map();
    const martyrSets = new Map();
    for (const loc of allLocs) {
      nodeMap.set(loc.id, {
        id: loc.id,
        name_en: loc.name_en,
        name_ur: loc.name_ur || loc.name_en,
        alt_names: loc.alt_names || null,
        location_type: loc.location_type,
        parent_id: loc.parent_id,
        country: loc.country,
        province: loc.province,
        district: loc.district,
        district_ur: loc.district_ur || DISTRICT_UR_MAP[loc.district] || null,
        tehsil: loc.tehsil,
        tehsil_ur: loc.tehsil_ur || TEHSIL_UR_MAP[loc.tehsil] || null,
        martyr_count: 0,
        children: []
      });
      martyrSets.set(loc.id, new Set());
    }

    const addMartyrUpChain = (locId, martyrId) => {
      let curr = locId;
      const seen = new Set();
      while (curr && nodeMap.has(curr) && !seen.has(curr)) {
        seen.add(curr);
        martyrSets.get(curr).add(martyrId);
        curr = nodeMap.get(curr).parent_id;
      }
    };

    const byNormNameAndTehsil = new Map();
    const byNormName = new Map();
    const byNormTehsil = new Map();
    const byNormDistrict = new Map();
    for (const loc of allLocs) {
      const n = String(loc.name_en || '').toLowerCase().trim();
      if (['Town', 'Village', 'Area', 'Locality'].includes(loc.location_type)) {
        const t = String(loc.tehsil || '').toLowerCase().trim();
        byNormNameAndTehsil.set(`${n}|${t}`, loc.id);
        if (!byNormName.has(n)) byNormName.set(n, loc.id);
      } else if (loc.location_type === 'Tehsil') {
        byNormTehsil.set(n, loc.id);
      } else if (loc.location_type === 'District') {
        byNormDistrict.set(n, loc.id);
      }
    }

    const resolveFallbackLocId = (locId, villageText, tehsilText, districtText) => {
      if (locId && nodeMap.has(locId)) return locId;
      const vn = String(villageText || '').toLowerCase().trim();
      const tn = String(tehsilText || '').toLowerCase().trim();
      const dn = String(districtText || '').toLowerCase().trim();
      if (vn && tn && byNormNameAndTehsil.has(`${vn}|${tn}`)) return byNormNameAndTehsil.get(`${vn}|${tn}`);
      if (vn && byNormName.has(vn)) return byNormName.get(vn);
      if (tn && byNormTehsil.has(tn)) return byNormTehsil.get(tn);
      if (dn && byNormDistrict.has(dn)) return byNormDistrict.get(dn);
      return null;
    };

    for (const m of martyrRows) {
      const showHome = m.show_home_location_public === undefined || Number(m.show_home_location_public) !== 0;
      if ((scope === 'residential' || scope === 'either') && showHome) {
        const rId = resolveFallbackLocId(m.residence_location_id, m.res_city, m.residence_tehsil, m.res_district);
        if (rId) addMartyrUpChain(rId, m.id);
      }
      if (scope === 'martyrdom' || scope === 'either') {
        const pId = resolveFallbackLocId(m.martyrdom_location_id, m.place_of_martyrdom, m.martyrdom_tehsil, m.martyrdom_district);
        if (pId) addMartyrUpChain(pId, m.id);
      }
    }

    const roots = [];
    for (const loc of allLocs) {
      const node = nodeMap.get(loc.id);
      node.martyr_count = martyrSets.get(loc.id).size;
      if (loc.parent_id && nodeMap.has(loc.parent_id)) {
        nodeMap.get(loc.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return res.json({
      success: true,
      summary: {
        total_wars: Number(warCounts.total_wars) || 0,
        total_martyrs: Number(martyrCounts.total_martyrs) || 0,
        total_locations: Number(locCounts.total_locations) || 0
      },
      wars: warRows.map(w => ({
        ...w,
        slug: w.slug || `war-${w.id}`,
        start_date: formatDbDate(w.start_date),
        end_date: formatDbDate(w.end_date),
        total_martyrs: Number(w.total_martyrs) || 0,
        source_count: Number(w.source_count) || 0,
        duration_label: computeWarDuration(w.start_date, w.end_date, w.status)
      })),
      location_scope: scope,
      total_active_martyrs: martyrRows.length,
      location_tree: roots
    });
  } catch (err) {
    console.error('[Public Martyrs Bootstrap Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load public martyrs archive.' });
  }
});

publicMartyrsRouter.get('/list', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const search = String(req.query.search || '').trim();
    const warId = parseInt(req.query.war_id, 10) || 0;
    const district = String(req.query.district || '').trim();
    const tehsil = String(req.query.tehsil || '').trim();
    const locationId = parseInt(req.query.location_id, 10) || 0;
    const locationScope = ['residential', 'martyrdom', 'either'].includes(req.query.location_scope) ? req.query.location_scope : 'residential';
    const dateFrom = cleanDate(req.query.date_from);
    const dateTo = cleanDate(req.query.date_to);
    const sort = String(req.query.sort || 'martyrdom_desc');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(48, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    // Strictly public records only
    const where = ["m.is_deleted = 0", "m.is_demo = 0", "m.status = 'published'"];
    const params = [];

    if (search) {
      where.push(`(
        m.full_name LIKE ? OR m.full_name_ur LIKE ?
        OR (m.show_father_name_public != 0 AND (m.father_name LIKE ? OR m.father_name_ur LIKE ?))
        OR m.place_of_martyrdom LIKE ? OR m.place_of_martyrdom_ur LIKE ?
        OR (m.show_home_location_public != 0 AND (m.city LIKE ? OR m.city_ur LIKE ?))
        OR rl.name_en LIKE ? OR rl.name_ur LIKE ? OR rl.alt_names LIKE ?
        OR ml.name_en LIKE ? OR ml.name_ur LIKE ? OR ml.alt_names LIKE ?
      )`);
      const lk = `%${search}%`;
      params.push(lk, lk, lk, lk, lk, lk, lk, lk, lk, lk, lk, lk, lk, lk);
    }

    if (warId > 0) {
      where.push(`EXISTS (
        SELECT 1 FROM martyr_war_links mwl
        INNER JOIN martyr_wars mw ON mw.id = mwl.war_id
        WHERE mwl.martyr_id = m.id AND (mwl.war_id = ? OR mw.parent_war_id = ?)
      )`);
      params.push(warId, warId);
    }

    if (locationId > 0) {
      const targetLoc = await lookupLocationById(db, locationId);
      if (targetLoc) {
        const [allLocs] = await db.query('SELECT id, parent_id, name_en, location_type FROM martyr_locations WHERE is_active = 1');
        const childrenByParent = new Map();
        for (const l of allLocs) {
          if (!childrenByParent.has(l.parent_id)) childrenByParent.set(l.parent_id, []);
          childrenByParent.get(l.parent_id).push(l);
        }
        const descendantIds = [targetLoc.id];
        const queue = [targetLoc.id];
        while (queue.length) {
          const cid = queue.shift();
          for (const ch of (childrenByParent.get(cid) || [])) {
            descendantIds.push(ch.id);
            queue.push(ch.id);
          }
        }

        const placeholders = descendantIds.map(() => '?').join(',');
        const scopeClauses = [];
        if (locationScope === 'residential' || locationScope === 'either') {
          const resSub = [`m.residence_location_id IN (${placeholders})`];
          params.push(...descendantIds);
          if (targetLoc.location_type === 'Tehsil') { resSub.push('m.residence_tehsil = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'District') { resSub.push('m.district = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Province') { resSub.push('m.province_state = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Country') { resSub.push('m.country_of_residence = ?'); params.push(targetLoc.name_en); }
          else { resSub.push('(m.residence_location_id IS NULL AND LOWER(m.city) = LOWER(?))'); params.push(targetLoc.name_en); }
          scopeClauses.push(`(m.show_home_location_public != 0 AND (${resSub.join(' OR ')}))`);
        }
        if (locationScope === 'martyrdom' || locationScope === 'either') {
          const marSub = [`m.martyrdom_location_id IN (${placeholders})`];
          params.push(...descendantIds);
          if (targetLoc.location_type === 'Tehsil') { marSub.push('m.martyrdom_tehsil = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'District') { marSub.push('m.martyrdom_district = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Province') { marSub.push('m.martyrdom_province = ?'); params.push(targetLoc.name_en); }
          else if (targetLoc.location_type === 'Country') { marSub.push('m.country = ?'); params.push(targetLoc.name_en); }
          else { marSub.push('(m.martyrdom_location_id IS NULL AND LOWER(m.place_of_martyrdom) = LOWER(?))'); params.push(targetLoc.name_en); }
          scopeClauses.push(`(${marSub.join(' OR ')})`);
        }
        where.push(`(${scopeClauses.join(' OR ')})`);
      }
    }

    if (district) {
      if (locationScope === 'residential') { where.push('(m.show_home_location_public != 0 AND m.district = ?)'); params.push(district); }
      else if (locationScope === 'martyrdom') { where.push('m.martyrdom_district = ?'); params.push(district); }
      else { where.push('((m.show_home_location_public != 0 AND m.district = ?) OR m.martyrdom_district = ?)'); params.push(district, district); }
    }
    if (tehsil) {
      if (locationScope === 'residential') { where.push('(m.show_home_location_public != 0 AND m.residence_tehsil = ?)'); params.push(tehsil); }
      else if (locationScope === 'martyrdom') { where.push('m.martyrdom_tehsil = ?'); params.push(tehsil); }
      else { where.push('((m.show_home_location_public != 0 AND m.residence_tehsil = ?) OR m.martyrdom_tehsil = ?)'); params.push(tehsil, tehsil); }
    }

    if (dateFrom) { where.push('m.date_of_martyrdom >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('m.date_of_martyrdom <= ?'); params.push(dateTo); }

    let orderSql = 'COALESCE(m.date_of_martyrdom, "0000-01-01") DESC, m.id DESC';
    if (sort === 'recent') orderSql = 'm.created_at DESC, m.id DESC';
    else if (sort === 'name_asc') orderSql = 'm.full_name ASC, m.id ASC';
    else if (sort === 'name_desc') orderSql = 'm.full_name DESC, m.id DESC';
    else if (sort === 'martyrdom_desc') orderSql = 'COALESCE(m.date_of_martyrdom, "0000-01-01") DESC, m.id DESC';
    else if (sort === 'martyrdom_asc') orderSql = 'COALESCE(m.date_of_martyrdom, "9999-12-31") ASC, m.id ASC';

    const whereSql = where.join(' AND ');
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM martyrs m
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE ${whereSql}
    `, params);

    const [rows] = await db.query(`
      SELECT
        m.id, m.slug, m.full_name, m.full_name_ur, m.profile_photo_url,
        m.father_name, m.father_name_ur, m.gender,
        m.date_of_birth, m.date_of_martyrdom, m.age_at_death,
        m.place_of_martyrdom, m.place_of_martyrdom_ur, m.martyrdom_location_id, m.martyrdom_tehsil, m.martyrdom_district, m.country,
        m.city, m.city_ur, m.residence_location_id, m.residence_tehsil, m.district, m.province_state, m.country_of_residence,
        m.primary_war_id, m.show_father_name_public, m.show_home_location_public,
        w.name AS primary_war_name, w.name_ur AS primary_war_name_ur, w.slug AS primary_war_slug,
        rl.name_en AS residence_location_name, rl.name_ur AS residence_location_name_ur, rl.tehsil_ur AS residence_tehsil_ur, rl.district_ur AS district_ur,
        ml.name_en AS martyrdom_location_name, ml.name_ur AS martyrdom_location_name_ur, ml.tehsil_ur AS martyrdom_tehsil_ur, ml.district_ur AS martyrdom_district_ur,
        (SELECT COUNT(*) FROM martyr_photos mp WHERE mp.martyr_id = m.id) AS photo_count,
        (SELECT COUNT(*) FROM martyr_source_references msr WHERE msr.entity_type = 'martyr' AND msr.entity_id = m.id) AS source_count
      FROM martyrs m
      LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return res.json({
      success: true,
      martyrs: rows.map(sanitizePublicMartyrRow),
      pagination: {
        total: Number(total) || 0,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil((Number(total) || 0) / limit))
      }
    });
  } catch (err) {
    console.error('[Public Martyrs List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load public martyrs directory.' });
  }
});

publicMartyrsRouter.get('/profile/:slugOrId', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const raw = String(req.params.slugOrId || '').trim();
    if (!raw) return res.status(400).json({ success: false, message: 'Invalid martyr profile identifier.' });
    const numericId = /^\d+$/.test(raw) ? parseInt(raw, 10) : (parseInt((raw.match(/-(\d+)$/) || [])[1], 10) || 0);

    const [rows] = await db.query(`
      SELECT
        m.id, m.slug, m.full_name, m.full_name_ur, m.profile_photo_url,
        m.father_name, m.father_name_ur, m.gender,
        m.date_of_birth, m.date_of_martyrdom, m.age_at_death,
        m.place_of_birth, m.place_of_birth_ur, m.birth_location_id,
        m.place_of_martyrdom, m.place_of_martyrdom_ur, m.martyrdom_location_id,
        m.country, m.martyrdom_province, m.martyrdom_district, m.martyrdom_tehsil,
        m.city, m.city_ur, m.district, m.residence_tehsil, m.province_state, m.country_of_residence, m.residence_location_id,
        m.primary_war_id, m.biography_html, m.biography_ur, m.biography_dir,
        m.show_father_name_public, m.show_home_location_public,
        w.name AS primary_war_name, w.name_ur AS primary_war_name_ur, w.slug AS primary_war_slug,
        rl.name_en AS residence_location_name, rl.name_ur AS residence_location_name_ur, rl.tehsil_ur AS residence_tehsil_ur, rl.district_ur AS district_ur,
        bl.name_en AS birth_location_name, bl.name_ur AS birth_location_name_ur,
        ml.name_en AS martyrdom_location_name, ml.name_ur AS martyrdom_location_name_ur, ml.tehsil_ur AS martyrdom_tehsil_ur, ml.district_ur AS martyrdom_district_ur
      FROM martyrs m
      LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations bl ON bl.id = m.birth_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE (m.slug = ? OR m.id = ?)
        AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published'
      ORDER BY CASE WHEN m.slug = ? THEN 0 ELSE 1 END
      LIMIT 1
    `, [raw, numericId, raw]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Public martyr profile not found.' });
    }

    const r0 = rows[0];
    const basePublic = sanitizePublicMartyrRow(r0);
    const martyr = {
      ...basePublic,
      biography_html: r0.biography_html || null,
      biography_ur: r0.biography_ur || null,
      biography_dir: r0.biography_dir || 'auto'
    };

    const [wars] = await db.query(`
      SELECT
        w.id, w.slug, w.name, w.name_ur, w.reference_code, w.category,
        w.location, w.location_ur, w.district, w.tehsil, w.country,
        w.start_date, w.end_date, w.status, w.cover_image_url,
        mwl.is_primary
      FROM martyr_war_links mwl
      INNER JOIN martyr_wars w ON w.id = mwl.war_id
      WHERE mwl.martyr_id = ? AND w.is_deleted = 0 AND w.is_demo = 0 AND w.status != 'archived'
      ORDER BY mwl.is_primary DESC, w.start_date DESC
    `, [r0.id]);

    const [photos] = await db.query(
      'SELECT id, image_url, caption, sort_order FROM martyr_photos WHERE martyr_id = ? ORDER BY sort_order ASC, id ASC',
      [r0.id]
    );

    const [sources] = await db.query(
      `SELECT id, source_title, source_url, publisher, publication_date, incident_date, reported_casualties, casualty_status, source_notes
       FROM martyr_source_references
       WHERE entity_type = 'martyr' AND entity_id = ?
       ORDER BY publication_date DESC, id ASC`,
      [r0.id]
    );

    return res.json({
      success: true,
      martyr,
      wars: wars.map(w => ({
        ...w,
        slug: w.slug || `war-${w.id}`,
        tehsil_ur: TEHSIL_UR_MAP[w.tehsil] || null,
        district_ur: DISTRICT_UR_MAP[w.district] || null,
        start_date: formatDbDate(w.start_date),
        end_date: formatDbDate(w.end_date),
        is_primary: Boolean(w.is_primary),
        duration_label: computeWarDuration(w.start_date, w.end_date, w.status)
      })),
      photos,
      sources: sources.map(s => ({
        ...s,
        publication_date: formatDbDate(s.publication_date),
        incident_date: formatDbDate(s.incident_date)
      }))
    });
  } catch (err) {
    console.error('[Public Martyr Profile Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load public martyr profile.' });
  }
});

publicMartyrsRouter.get('/wars/:slugOrId', async (req, res) => {
  try {
    await ensureMartyrsSchema();
    const raw = String(req.params.slugOrId || '').trim();
    if (!raw) return res.status(400).json({ success: false, message: 'Invalid war identifier.' });
    const numericId = /^\d+$/.test(raw) ? parseInt(raw, 10) : (parseInt((raw.match(/-(\d+)$/) || [])[1], 10) || 0);

    const [rows] = await db.query(`
      SELECT
        w.id, w.slug, w.parent_war_id, w.name, w.name_ur, w.reference_code, w.category,
        w.location, w.location_ur, w.country, w.province, w.district, w.tehsil,
        w.start_date, w.end_date,
        w.short_description, w.short_description_ur,
        w.reason_cause, w.reason_cause_ur, w.reason_source,
        w.historical_background, w.historical_background_ur,
        w.detailed_article, w.detailed_article_ur, w.background_dir,
        w.reported_casualties, w.reported_casualties_ur, w.reported_injuries, w.casualty_status, w.casualty_notes,
        w.ceasefire_info, w.ceasefire_info_ur, w.cover_image_url, w.status,
        pw.name AS parent_war_name, pw.name_ur AS parent_war_name_ur, pw.slug AS parent_war_slug,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published' THEN m.id END) AS total_martyrs
      FROM martyr_wars w
      LEFT JOIN martyr_wars pw ON pw.id = w.parent_war_id
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = w.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE (w.slug = ? OR w.id = ? OR w.reference_code = ?)
        AND w.is_deleted = 0 AND w.is_demo = 0 AND w.status != 'archived'
      GROUP BY w.id
      LIMIT 1
    `, [raw, numericId, raw]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Public war / conflict record not found.' });
    }

    const r0 = rows[0];
    const warId = r0.id;
    const war = {
      ...r0,
      slug: r0.slug || `war-${r0.id}`,
      tehsil_ur: TEHSIL_UR_MAP[r0.tehsil] || null,
      district_ur: DISTRICT_UR_MAP[r0.district] || null,
      start_date: formatDbDate(r0.start_date),
      end_date: formatDbDate(r0.end_date),
      total_martyrs: Number(r0.total_martyrs) || 0,
      duration_label: computeWarDuration(r0.start_date, r0.end_date, r0.status)
    };

    const [childEpisodes] = await db.query(`
      SELECT
        cw.id, cw.slug, cw.name, cw.name_ur, cw.reference_code, cw.category,
        cw.location, cw.location_ur, cw.tehsil, cw.start_date, cw.end_date,
        cw.reported_casualties, cw.reported_casualties_ur, cw.casualty_status, cw.status,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published' THEN m.id END) AS total_martyrs
      FROM martyr_wars cw
      LEFT JOIN martyr_war_links mwl ON mwl.war_id = cw.id
      LEFT JOIN martyrs m ON m.id = mwl.martyr_id
      WHERE cw.parent_war_id = ? AND cw.is_deleted = 0 AND cw.is_demo = 0 AND cw.status != 'archived'
      GROUP BY cw.id
      ORDER BY COALESCE(cw.start_date, cw.created_at) ASC
    `, [warId]);

    const [images] = await db.query(
      'SELECT id, image_url, caption, sort_order FROM martyr_war_images WHERE war_id = ? ORDER BY sort_order ASC, id ASC',
      [warId]
    );

    const [sources] = await db.query(
      `SELECT id, source_title, source_url, publisher, publication_date, incident_date, reported_casualties, casualty_status, source_notes
       FROM martyr_source_references
       WHERE entity_type = 'war' AND entity_id = ?
       ORDER BY publication_date DESC, id ASC`,
      [warId]
    );

    const [affectedLocations] = await db.query(`
      SELECT
        l.id, l.name_en, l.name_ur, l.alt_names, l.location_type, l.country, l.province, l.district, l.district_ur, l.tehsil, l.tehsil_ur,
        mwl.is_primary,
        COUNT(DISTINCT CASE
          WHEN m.id IS NOT NULL AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published'
           AND (
             (m.show_home_location_public != 0 AND m.residence_location_id = l.id)
             OR m.martyrdom_location_id = l.id
             OR (l.location_type = 'Tehsil' AND ((m.show_home_location_public != 0 AND m.residence_tehsil = l.name_en) OR m.martyrdom_tehsil = l.name_en))
             OR (l.location_type = 'District' AND ((m.show_home_location_public != 0 AND m.district = l.name_en) OR m.martyrdom_district = l.name_en))
           )
          THEN m.id END) AS martyr_count
      FROM martyr_war_locations mwl
      INNER JOIN martyr_locations l ON l.id = mwl.location_id
      LEFT JOIN martyr_war_links wl ON wl.war_id = mwl.war_id
      LEFT JOIN martyrs m ON m.id = wl.martyr_id
      WHERE mwl.war_id = ?
      GROUP BY l.id, mwl.is_primary
      ORDER BY mwl.is_primary DESC, l.name_en ASC
    `, [warId]);

    const [martyrs] = await db.query(`
      SELECT
        m.id, m.slug, m.full_name, m.full_name_ur, m.profile_photo_url,
        m.father_name, m.father_name_ur, m.gender, m.date_of_birth,
        m.date_of_martyrdom, m.age_at_death, m.place_of_martyrdom, m.place_of_martyrdom_ur,
        m.city, m.city_ur, m.district, m.residence_tehsil, m.martyrdom_tehsil, m.martyrdom_district, m.country,
        m.primary_war_id, m.show_father_name_public, m.show_home_location_public,
        pw.name AS primary_war_name, pw.name_ur AS primary_war_name_ur, pw.slug AS primary_war_slug,
        rl.name_en AS residence_location_name, rl.name_ur AS residence_location_name_ur, rl.tehsil_ur AS residence_tehsil_ur,
        ml.name_en AS martyrdom_location_name, ml.name_ur AS martyrdom_location_name_ur, ml.tehsil_ur AS martyrdom_tehsil_ur,
        (SELECT COUNT(*) FROM martyr_source_references msr WHERE msr.entity_type = 'martyr' AND msr.entity_id = m.id) AS source_count
      FROM martyr_war_links mwl
      INNER JOIN martyrs m ON m.id = mwl.martyr_id
      LEFT JOIN martyr_wars pw ON pw.id = m.primary_war_id
      LEFT JOIN martyr_locations rl ON rl.id = m.residence_location_id
      LEFT JOIN martyr_locations ml ON ml.id = m.martyrdom_location_id
      WHERE mwl.war_id = ? AND m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published'
      ORDER BY COALESCE(m.date_of_martyrdom, m.created_at) DESC, m.full_name ASC
    `, [warId]);

    return res.json({
      success: true,
      war,
      child_episodes: childEpisodes.map(ce => ({
        ...ce,
        slug: ce.slug || `war-${ce.id}`,
        start_date: formatDbDate(ce.start_date),
        end_date: formatDbDate(ce.end_date),
        total_martyrs: Number(ce.total_martyrs) || 0
      })),
      images,
      sources: sources.map(s => ({
        ...s,
        publication_date: formatDbDate(s.publication_date),
        incident_date: formatDbDate(s.incident_date)
      })),
      affected_locations: affectedLocations.map(al => ({
        ...al,
        name_ur: al.name_ur || al.name_en,
        tehsil_ur: al.tehsil_ur || TEHSIL_UR_MAP[al.tehsil] || null,
        is_primary: Boolean(al.is_primary),
        martyr_count: Number(al.martyr_count) || 0
      })),
      martyrs: martyrs.map(sanitizePublicMartyrRow)
    });
  } catch (err) {
    console.error('[Public War Detail Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load public war detail.' });
  }
});

module.exports = router;
module.exports.ensureMartyrsSchema = ensureMartyrsSchema;
module.exports.publicMartyrsRouter = publicMartyrsRouter;
