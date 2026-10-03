// Icônes de l'appli : la barre chargée de Fonte (disques rouge, bleu, jaune, vert) sur fond encre
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const path = require("path");
const bar = (k) => {
  // k : échelle autour du centre (zone sûre des icônes adaptatives)
  const P = [["#C8322F", 34, 220], ["#2457A6", 30, 184], ["#E0AE1C", 27, 150], ["#2F8A4E", 24, 118]];
  let s = `<rect x="58" y="245" width="396" height="22" rx="11" fill="#C9CFD6"/><rect x="224" y="228" width="12" height="56" rx="4" fill="#9AA3AD"/><rect x="276" y="228" width="12" height="56" rx="4" fill="#9AA3AD"/>`;
  let off = 44;
  for (const [c, w, h] of P) { const y = 256 - h / 2; s += `<rect x="${256 + off}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}"/><rect x="${256 - off - w}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c}"/>`; off += w + 6; }
  return `<g transform="translate(256 256) scale(${k}) translate(-256 -256)">${s}</g>`;
};
const svg = (round, k) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="${round ? 112 : 0}" fill="#18202A"/>${bar(k)}</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  const out = [["icon-512.png", 512, true, 1], ["icon-192.png", 192, true, 1], ["icon-32.png", 32, true, 1.06], ["icon-maskable-512.png", 512, false, 0.74], ["apple-touch-icon.png", 180, false, 0.9]];
  for (const [name, size, round, k] of out) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(round, k).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, "icons", name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close();
  console.log("icônes ok");
})();
