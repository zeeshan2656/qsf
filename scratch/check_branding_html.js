const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const idx = html.indexOf('id="tab-settings-branding"');
const nextTab = html.indexOf('id="tab-settings-layout"');
console.log('Branding tab length:', nextTab - idx);
console.log(html.slice(idx, nextTab));
