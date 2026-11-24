const db = require('../config/db');

async function migrate() {
  const cols = [
    { name: 'cutout_photo_url', def: 'VARCHAR(512) NULL AFTER profile_photo_url' },
    { name: 'memorial_card_url', def: 'VARCHAR(512) NULL AFTER cutout_photo_url' },
    { name: 'cover_template', def: "VARCHAR(64) NOT NULL DEFAULT 'splatter_mountain' AFTER memorial_card_url" },
    { name: 'memorial_cover_url', def: 'VARCHAR(512) NULL AFTER cover_template' },
    { name: 'memorial_cover_url_ur', def: 'VARCHAR(512) NULL AFTER memorial_cover_url' },
    { name: 'cover_portrait_pos', def: "VARCHAR(32) NOT NULL DEFAULT 'center' AFTER memorial_cover_url_ur" }
  ];

  for (const c of cols) {
    const [ex] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'martyrs' AND COLUMN_NAME = ?`,
      [c.name]
    );
    if (!ex.length) {
      await db.query(`ALTER TABLE \`martyrs\` ADD COLUMN \`${c.name}\` ${c.def}`);
      console.log(`[Migration] Added column ${c.name} to martyrs`);
    } else {
      console.log(`[Migration] Column ${c.name} already exists`);
    }
  }
}

migrate().then(() => {
  console.log('[Migration] Done');
  process.exit(0);
}).catch(err => {
  console.error('[Migration Error]', err);
  process.exit(1);
});
