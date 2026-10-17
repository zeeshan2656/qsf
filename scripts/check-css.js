const fs = require('fs');

function checkCss(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let depth = 0;
  let inString = false;
  let strChar = '';
  let inComment = false;
  let line = 1;
  const errors = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\n') line++;

    if (inComment) {
      if (ch === '*' && content[i+1] === '/') {
        inComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === strChar) inString = false;
      continue;
    }

    if (ch === '/' && content[i+1] === '*') {
      inComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      strChar = ch;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth < 0) {
        errors.push(`Extra closing brace at line ${line}`);
        depth = 0;
      }
    }
  }

  if (depth > 0) {
    errors.push(`Unclosed opening brace! Depth remaining: ${depth}`);
  }

  console.log(`[${filePath}] Depth remaining: ${depth}, Errors: ${errors.length ? JSON.stringify(errors) : 'None (Balanced)'}`);
}

checkCss('public/css/style.css');
checkCss('public/dist/css/style.min.css');
