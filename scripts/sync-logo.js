const fs = require('fs');
const path = require('path');
const db = require('../config/db');
require('dotenv').config();

const mediaDir = process.env.MEDIA_DIR || 'C:\\Users\\Basharat\\Desktop\\qasreshabbir_media';

async function syncLogo() {
  try {
    const [rows] = await db.query("SELECT setting_val FROM site_settings WHERE setting_key = 'site_logo_url'");
    if (rows.length && rows[0].setting_val) {
      const filename = path.basename(rows[0].setting_val);
      const src = path.join(mediaDir, 'branding', filename);
      const dest = path.join(mediaDir, 'branding', 'logo.svg');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('Synchronized uploaded logo to default logo.svg');
      }
    }
    const [flagRows] = await db.query("SELECT setting_val FROM site_settings WHERE setting_key = 'site_flag_url'");
    if (flagRows.length && flagRows[0].setting_val) {
      const filename = path.basename(flagRows[0].setting_val);
      const src = path.join(mediaDir, 'branding', filename);
      const dest = path.join(mediaDir, 'branding', 'flag.svg');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('Synchronized uploaded flag to default flag.svg');
      }
    }
  } catch (err) {
    console.error('Error syncing:', err);
  } finally {
    process.exit(0);
  }
}

syncLogo();
