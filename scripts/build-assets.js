const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  console.log('[Build] Starting production asset minification with esbuild...');
  const distDir = path.resolve(__dirname, '../public/dist');
  const distCss = path.join(distDir, 'css');
  const distJs = path.join(distDir, 'js');

  fs.mkdirSync(distCss, { recursive: true });
  fs.mkdirSync(distJs, { recursive: true });

  const cssFiles = [
    { in: path.resolve(__dirname, '../public/css/style.css'), out: path.join(distCss, 'style.min.css') },
    { in: path.resolve(__dirname, '../public/css/rtl.css'), out: path.join(distCss, 'rtl.min.css') },
    { in: path.resolve(__dirname, '../public/css/admin.css'), out: path.join(distCss, 'admin.min.css') }
  ];

  const jsFiles = [
    { in: path.resolve(__dirname, '../public/js/translations.js'), out: path.join(distJs, 'translations.min.js') },
    { in: path.resolve(__dirname, '../public/js/main.js'), out: path.join(distJs, 'main.min.js') },
    { in: path.resolve(__dirname, '../public/js/admin.js'), out: path.join(distJs, 'admin.min.js') }
  ];

  let totalRawBytes = 0;
  let totalMinBytes = 0;

  // Minify CSS
  for (const item of cssFiles) {
    if (fs.existsSync(item.in)) {
      const raw = fs.readFileSync(item.in);
      totalRawBytes += raw.length;
      await esbuild.build({
        entryPoints: [item.in],
        outfile: item.out,
        minify: true,
        legalComments: 'none',
        logLevel: 'warning'
      });
      const min = fs.readFileSync(item.out);
      totalMinBytes += min.length;
      const pct = (((raw.length - min.length) / raw.length) * 100).toFixed(1);
      console.log(`[CSS] ${path.basename(item.in)}: ${(raw.length / 1024).toFixed(1)} KB -> ${(min.length / 1024).toFixed(1)} KB (-${pct}%)`);
    }
  }

  // Minify JS
  for (const item of jsFiles) {
    if (fs.existsSync(item.in)) {
      const raw = fs.readFileSync(item.in);
      totalRawBytes += raw.length;
      await esbuild.build({
        entryPoints: [item.in],
        outfile: item.out,
        minify: true,
        charset: 'utf8',
        target: ['es2020'],
        legalComments: 'none',
        logLevel: 'warning'
      });
      const min = fs.readFileSync(item.out);
      totalMinBytes += min.length;
      const pct = (((raw.length - min.length) / raw.length) * 100).toFixed(1);
      console.log(`[JS]  ${path.basename(item.in)}: ${(raw.length / 1024).toFixed(1)} KB -> ${(min.length / 1024).toFixed(1)} KB (-${pct}%)`);
    }
  }

  // Ensure lightweight branding assets exist in public/images/branding as well
  const mediaBranding = path.resolve(__dirname, '../../qasreshabbir_media/branding');
  const publicBranding = path.resolve(__dirname, '../public/images/branding');
  fs.mkdirSync(publicBranding, { recursive: true });

  const filesToCopy = ['favicon-64.webp', 'favicon-32.png', 'logo-web.webp', 'flag-web.webp'];
  for (const f of filesToCopy) {
    const src = path.join(mediaBranding, f);
    const dest = path.join(publicBranding, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  const overallPct = (((totalRawBytes - totalMinBytes) / totalRawBytes) * 100).toFixed(1);
  console.log(`[Build] Total raw asset size: ${(totalRawBytes / 1024).toFixed(1)} KB`);
  console.log(`[Build] Total minified size:  ${(totalMinBytes / 1024).toFixed(1)} KB (-${overallPct}%)`);
  console.log(`[Build] Production build complete. Files saved in public/dist/`);
}

build().catch(err => {
  console.error('[Build Error]', err);
  process.exit(1);
});
