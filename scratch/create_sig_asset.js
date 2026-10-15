const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const brandingDir = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir_media\\branding';
  if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

  const svgSignature = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 140" width="450" height="140">
      <path d="M 40 90 Q 70 30 110 50 T 150 75 Q 180 20 220 60 T 280 85 Q 320 30 360 65 Q 400 95 420 55" 
            fill="none" stroke="#047857" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 75 70 C 95 40 130 35 150 70 C 165 95 185 95 210 75" 
            fill="none" stroke="#065F46" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 180 80 Q 230 45 270 70 Q 310 95 350 65 Q 390 40 415 80" 
            fill="none" stroke="#059669" stroke-width="3.2" stroke-linecap="round" />
      <path d="M 60 105 C 150 115 280 112 410 102" 
            fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;

  const targetPath = path.join(brandingDir, 'official_signature_ceo.webp');
  await sharp(Buffer.from(svgSignature))
    .webp({ quality: 90 })
    .toFile(targetPath);
  console.log('Generated official signature webp at:', targetPath);
  process.exit(0);
})();
