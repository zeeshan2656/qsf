const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

console.log(`[HTML Optimization] Processing ${htmlFiles.length} HTML files...`);

const FAVICON_MARKUP = `<link rel="icon" type="image/webp" href="/media/branding/favicon-64.webp">
  <link rel="alternate icon" type="image/png" href="/media/branding/favicon-32.png">`;

let totalModified = 0;

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Optimize favicon: replace any existing favicon link with lightweight webp/png
  content = content.replace(/<link\s+rel=["']icon["'][^>]*>/i, FAVICON_MARKUP);
  content = content.replace(/<link\s+rel=["']shortcut icon["'][^>]*>/i, '');

  // 2. Add defer to script tags if missing
  content = content.replace(/<script\s+src="\/js\/translations\.js"(?!\s+defer)><\/script>/g, '<script src="/js/translations.js" defer></script>');
  content = content.replace(/<script\s+src="\/js\/main\.js"(?!\s+defer)><\/script>/g, '<script src="/js/main.js" defer></script>');
  content = content.replace(/<script\s+src="\/js\/admin\.js"(?!\s+defer)><\/script>/g, '<script src="/js/admin.js" defer></script>');

  // 3. Prioritize above-the-fold brand logos with fetchpriority="high" and decoding="async"
  content = content.replace(
    /(<img[^>]*class="[^"]*header-logo-img[^"]*"[^>]*)(?!\bfetchpriority\b)/g,
    '$1 fetchpriority="high" decoding="async"'
  );
  content = content.replace(
    /(<img[^>]*class="[^"]*admin-login-logo[^"]*"[^>]*)(?!\bfetchpriority\b)/g,
    '$1 fetchpriority="high" decoding="async"'
  );

  // 4. Update static asset image paths in HTML from PNG/JPG to WebP
  content = content.replace(/\/media\/branding\/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589\.png/g, '/media/branding/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp');
  content = content.replace(/\/media\/branding\/flag_english_hero\.png/g, '/media/branding/flag_english_hero.webp');
  content = content.replace(/\/media\/branding\/flag_urdu_hero\.png/g, '/media/branding/flag_urdu_hero.webp');
  content = content.replace(/\/media\/hero\/hero_boy_studying\.jpg/g, '/media/hero/hero_boy_studying.webp');
  content = content.replace(/\/media\/hero\/difference_banner_en\.png/g, '/media/hero/difference_banner_en.webp');
  content = content.replace(/\/media\/hero\/difference_banner_ur\.png/g, '/media/hero/difference_banner_ur.webp');
  content = content.replace(/\/media\/hero\/hero_banner_en\.png/g, '/media/hero/hero_banner_en.webp');
  content = content.replace(/\/media\/hero\/hero_banner_ur\.png/g, '/media/hero/hero_banner_ur.webp');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    console.log(`[HTML Optimization] ✓ Optimized ${file}`);
  }
}

console.log(`[HTML Optimization] Successfully optimized ${totalModified} of ${htmlFiles.length} files.`);
