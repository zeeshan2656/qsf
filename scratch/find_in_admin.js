const fs = require('fs');

const searchTerms = [
  'loadBrandingAssets',
  'stampFileInput',
  'loadVolunteers',
  'renderVolunteersList',
  'openVolunteerDetailModal',
  'openAddVolunteerModal',
  'loadUsers',
  'renderUsersList',
  'openAddUserModal',
  'renderIdCardCards',
  'openIdCardModal'
];

const content = fs.readFileSync('public/js/admin.js', 'utf8');
const lines = content.split('\n');

searchTerms.forEach(term => {
  console.log(`=== Matches for: ${term} ===`);
  lines.forEach((line, idx) => {
    if (line.includes(term)) {
      console.log(`Line ${idx + 1}: ${line.trim().slice(0, 100)}`);
    }
  });
});
