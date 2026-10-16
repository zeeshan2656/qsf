const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const base = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir_media';

async function inspect(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      await inspect(p);
    } else if (f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg')) {
      const stat = fs.statSync(p);
      try {
        const m = await sharp(p).metadata();
        console.log(path.relative(base, p).padEnd(65), (stat.size / 1024).toFixed(1).padStart(8) + ' KB', `${m.width}x${m.height}`);
      } catch (e) {}
    }
  }
}

inspect(base).catch(e => console.error(e));
