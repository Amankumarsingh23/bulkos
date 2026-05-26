import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Gold "B" on cream background — rounded square icon
function makeSvg(size) {
  const r = Math.round(size * 0.18); // corner radius
  const fontSize = Math.round(size * 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#C9A96E"/>
  <text
    x="50%"
    y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-weight="700"
    font-size="${fontSize}"
    fill="#FDF6EC"
    letter-spacing="-2"
  >B</text>
</svg>`;
}

for (const size of [192, 512]) {
  await sharp(Buffer.from(makeSvg(size)))
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`  icon-${size}.png`);
}

// Apple touch icon (180x180, no rounded corners — iOS clips it)
await sharp(Buffer.from(makeSvg(180).replace(/rx="\d+" ry="\d+"/, 'rx="0" ry="0"')))
  .png()
  .toFile("public/apple-touch-icon.png");
console.log("  apple-touch-icon.png");

console.log("Icons generated.");
