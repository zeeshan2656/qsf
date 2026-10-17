const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');

const criticalHeaderCss = `
  <!-- Inlined Critical Header CSS (Guarantees zero header disturbance) -->
  <style id="critical-header-css">
    .announcement-bar{background:#000!important;color:#fff!important;min-height:40px;display:flex;align-items:center;position:relative;z-index:105;border-bottom:1px solid rgba(255,255,255,.12);overflow:hidden}
    .announcement-container{width:100%;display:flex;align-items:center;padding:0 clamp(12px,3vw,36px);gap:14px}
    .announcement-badge{display:inline-flex;align-items:center;gap:7px;background:#b91c1c;color:#fff;font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:4px;white-space:nowrap;flex-shrink:0}
    .announcement-ticker-track{flex:1;overflow:hidden;white-space:nowrap;position:relative;display:flex;align-items:center}
    .announcement-marquee-content{display:inline-flex;align-items:center;gap:48px;white-space:nowrap;will-change:transform}
    .announcement-marquee-content.marquee-ltr{animation:scroll-ltr 32s linear infinite}
    .announcement-marquee-content.marquee-rtl{animation:scroll-rtl 32s linear infinite}
    @keyframes scroll-ltr{0%{transform:translateX(-50%)}to{transform:translateX(0)}}
    @keyframes scroll-rtl{0%{transform:translateX(0)}to{transform:translateX(-50%)}}
    .announcement-item-link{color:#fff!important;text-decoration:none;font-size:.9rem;font-weight:600;display:inline-flex;align-items:center;gap:8px}
    .announcement-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:auto}
    .announcement-lang-toggle{display:flex;align-items:center;background:rgba(255,255,255,.15);border-radius:20px;padding:2px 4px}
    .announcement-lang-toggle .lang-btn{color:#e2e8f0;font-size:.74rem;padding:3px 8px;border-radius:14px;background:transparent;border:none;cursor:pointer}
    .announcement-lang-toggle .lang-btn.active{background:#b91c1c;color:#fff}
    .header-dual-menu-wrap{display:block;width:100%;background:transparent;position:relative;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,.12)}
    .header-dual-container{position:relative;width:100%}
    .nav-row-red{background:#b91c1c!important;min-height:48px;height:48px;display:flex;align-items:center;justify-content:space-between;position:relative;width:100%;border-bottom:1.5px solid rgba(255,255,255,.22)}
    .nav-row-blue{background:#1d4ed8!important;min-height:48px;height:48px;display:flex;align-items:center;justify-content:space-between;position:relative;width:100%}
    .nav-slot,.nav-slot-left,.nav-slot-right{flex:1;display:flex;align-items:center;height:100%;min-width:0}
    .nav-slot-left{justify-content:flex-end;padding-right:68px;padding-left:24px}
    .nav-slot-right{justify-content:flex-start;padding-left:68px;padding-right:24px}
    body.urdu .nav-slot-left{justify-content:flex-start;padding-left:68px;padding-right:24px}
    body.urdu .nav-slot-right{justify-content:flex-end;padding-right:68px;padding-left:24px}
    .nav-center-emblem-wrap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;pointer-events:auto;display:flex;align-items:center;justify-content:center;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
    .nav-emblem-link{display:block;text-decoration:none;border-radius:50%}
    .nav-emblem-circle{width:96px;height:96px;border-radius:50%;background:#fff!important;border:3.5px solid #fff;box-shadow:0 4px 20px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:4px;overflow:hidden;position:relative}
    .nav-emblem-img{width:100%;height:100%;object-fit:contain;display:block;border-radius:50%}
    .nav-inline-group{display:inline-flex;align-items:center;gap:14px;list-style:none;margin:0;padding:0;flex-wrap:nowrap}
    .nav-inline-link{color:#fff!important;font-family:"Outfit",sans-serif;font-size:clamp(.88rem,1.1vw,1.02rem);font-weight:700;padding:7px 14px;border-radius:6px;text-decoration:none!important;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    .nav-inline-link:hover{background:rgba(255,255,255,.2)}
    body.urdu .nav-inline-link{font-family:"Noto Nastaliq Urdu",Tahoma,sans-serif;font-size:1.05rem}
    .mobile-site-header{display:none!important;align-items:center;justify-content:space-between;height:72px;padding:0 16px;background:#fff;border-bottom:1px solid #eef2f6;width:100%}
    .mobile-nav-drawer{position:fixed;top:0;right:-320px;width:300px;max-width:85vw;height:100vh;background:#fff;z-index:10000;display:flex;flex-direction:column;transition:right .3s ease;overflow-y:auto}
    body.urdu .mobile-nav-drawer{right:auto;left:-320px}
    .mobile-nav-drawer.open{right:0}
    body.urdu .mobile-nav-drawer.open{left:0}
    .mobile-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;opacity:0;visibility:hidden;transition:all .3s ease}
    .mobile-drawer-backdrop.active{opacity:1;visibility:visible}
    @media(max-width:900px){.header-dual-menu-wrap{display:none!important}.mobile-site-header{display:flex!important}}
  </style>`;

const htmlFiles = [
  'index.html',
  'projects.html',
  'project-detail.html',
  'news.html',
  'news-detail.html',
  'donate.html',
  'apply.html',
  'volunteer.html',
  'contact.html'
];

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Insert critical header CSS if not present
  if (!content.includes('id="critical-header-css"') && !content.includes('id="critical-css"')) {
    content = content.replace(/(<link[^>]+style\.css[^>]*>)/i, `${criticalHeaderCss}\n  $1`);
  }

  // 2. Update CSS versions
  content = content.replace(/\/css\/style\.css(\?v=[^"']*)?/g, '/css/style.css?v=20261018_v1');
  content = content.replace(/\/css\/rtl\.css(\?v=[^"']*)?/g, '/css/rtl.css?v=20261018_v1');

  // 3. Update JS versions
  content = content.replace(/\/js\/translations\.js(\?v=[^"']*)?/g, '/js/translations.js?v=20261018_v1');
  content = content.replace(/\/js\/main\.js(\?v=[^"']*)?/g, '/js/main.js?v=20261018_v1');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[Patched] ${file}`);
}

console.log('All HTML pages successfully patched with critical header CSS and fresh asset query parameters.');
