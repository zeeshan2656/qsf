const fs = require('fs');

const files = fs.readdirSync('public').filter(f => f.endsWith('.html') && f !== 'admin.html');
const fontSnippet = `  <!-- Google Fonts: Inter, Outfit & Noto Nastaliq Urdu -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet">
`;

files.forEach(f => {
  let content = fs.readFileSync('public/' + f, 'utf8');
  if (!content.includes('Noto+Nastaliq+Urdu')) {
    if (content.includes('<!-- Favicon -->')) {
      content = content.replace('<!-- Favicon -->', fontSnippet + '  <!-- Favicon -->');
    } else if (content.includes('<link rel="icon"')) {
      content = content.replace('<link rel="icon"', fontSnippet + '  <link rel="icon"');
    } else if (content.includes('</head>')) {
      content = content.replace('</head>', fontSnippet + '</head>');
    }
    fs.writeFileSync('public/' + f, content, 'utf8');
    console.log('Updated font links in public/' + f);
  }
});
