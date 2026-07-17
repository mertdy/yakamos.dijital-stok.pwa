import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/favicon.svg');
const publicDir = path.resolve('public');

async function generate() {
  try {
    if (!fs.existsSync(svgPath)) {
      console.error('Error: public/favicon.svg not found.');
      process.exit(1);
    }

    console.log('Generating PWA icons using sharp...');

    // 1. Standard 192x192 PNG
    await sharp(svgPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('Generated: icon-192.png');

    // 2. Standard 512x512 PNG
    await sharp(svgPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('Generated: icon-512.png');

    // 3. Apple Touch Icon 180x180 PNG
    // For Apple, a solid background is best. We will use white background.
    const appleLogo = await sharp(svgPath)
      .resize(120, 120, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: appleLogo, gravity: 'center' }])
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Generated: apple-touch-icon.png');

    // 4. Maskable 192x192 PNG (Safe zone padding, white background)
    const logo192 = await sharp(svgPath)
      .resize(115, 115, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: logo192, gravity: 'center' }])
      .toFile(path.join(publicDir, 'icon-192-maskable.png'));
    console.log('Generated: icon-192-maskable.png');

    // 5. Maskable 512x512 PNG (Safe zone padding, white background)
    const logo512 = await sharp(svgPath)
      .resize(307, 307, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: logo512, gravity: 'center' }])
      .toFile(path.join(publicDir, 'icon-512-maskable.png'));
    console.log('Generated: icon-512-maskable.png');

    console.log('🎉 All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generate();
