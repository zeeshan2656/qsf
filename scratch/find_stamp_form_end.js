const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
console.log(html.slice(25500, 27500));
