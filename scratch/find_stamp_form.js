const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const idx = html.indexOf('stampUploadForm');
console.log('stampUploadForm at index:', idx);
if (idx !== -1) {
  console.log(html.slice(idx - 200, idx + 800));
}
