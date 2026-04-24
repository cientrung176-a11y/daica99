/**
 * Tạo icon.png (512x512) từ icon.svg cho Electron window icon.
 * Chạy: node scripts/gen-icon.cjs
 * Yêu cầu: npm install sharp (hoặc dùng sharp đã có)
 */
const path = require('path');
const fs = require('fs');

async function run() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
    const outPath = path.join(__dirname, '..', 'public', 'icon.png');

    await sharp(fs.readFileSync(svgPath))
      .resize(512, 512)
      .png()
      .toFile(outPath);

    console.log('✅ Đã tạo public/icon.png (512x512)');
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    console.log('➡  Cài sharp: npm install sharp --save-dev');
    console.log('➡  Hoặc dùng tool online: https://svgtopng.com để tạo icon.png');
  }
}

run();
