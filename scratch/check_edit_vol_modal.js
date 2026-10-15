const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const start = html.indexOf('id="modalEditVolunteer"');
const end = html.indexOf('<!-- 10.', start);
console.log(html.slice(start, end !== -1 ? end : start + 3000));
