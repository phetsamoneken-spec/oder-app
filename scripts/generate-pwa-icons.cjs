// Generates clean flat-design LBC Order / Beerlao app icons.
// Source of truth: public/assets/aistudio/lbc_order_flat_icon_1024.png
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'public/assets/aistudio/lbc_order_flat_icon_1024.png');
if (!fs.existsSync(SOURCE)) { console.error('Missing flat icon source:', SOURCE); process.exit(1); }
const dirs = ['icons', 'public/icons'];
for (const dir of dirs) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
const jobs = [
  [512, 'icon-512.png', false], [192, 'icon-192.png', false],
  [512, 'icon-512-maskable.png', true], [192, 'icon-192-maskable.png', true],
  [512, 'maskable-512.png', true], [180, 'apple-touch-icon.png', false],
  [64, 'favicon.png', false], [32, 'favicon-32x32.png', false], [16, 'favicon-16x16.png', false]
];
for (const [size, name, maskable] of jobs) {
  const resized = path.join('/tmp', `lbc-flat-layer-${size}.png`);
  const output = path.join('/tmp', `lbc-flat-${size}-${name.replace(/[^a-z0-9]/gi, '-')}.png`);
  execSync(`convert "${SOURCE}" -resize ${size}x${size} PNG32:"${resized}"`);
  if (maskable) {
    execSync(`convert -size ${size}x${size} xc:'#FFC400' "${resized}" -gravity center -compose over -composite PNG32:"${output}"`);
  } else {
    fs.copyFileSync(resized, output);
  }
  for (const dir of dirs) fs.copyFileSync(output, path.join(ROOT, dir, name));
}
execSync(`convert "${path.join(ROOT, 'public/icons/favicon-32x32.png')}" "${path.join(ROOT, 'public/icons/favicon-16x16.png')}" "${path.join(ROOT, 'public/favicon.ico')}"`);
fs.copyFileSync(path.join(ROOT, 'public/icons/favicon-32x32.png'), path.join(ROOT, 'favicon-32x32.png'));
fs.copyFileSync(path.join(ROOT, 'public/favicon.ico'), path.join(ROOT, 'favicon.ico'));
console.log('Flat LBC Order icons generated.');
