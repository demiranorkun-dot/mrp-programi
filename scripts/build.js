// src/ altındaki parçalardan tek dosyalık index.html üretir (paket kurulumu gerekmez).
// Kullanım:
//   node scripts/build.js          → index.html'i yeniden yazar
//   node scripts/build.js --check  → index.html güncel değilse hata verir (dosyaya dokunmaz)
//
// src/index.html şablondur; içindeki her `<!-- @dahil: yol -->` satırı, src/ altındaki o dosyanın
// içeriğiyle birebir değiştirilir. JS parçaları tek bir IIFE'nin ardışık bölümleridir: tek başlarına
// geçerli JS değildir, yalnızca şablondaki sırayla birleştiğinde çalışırlar.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'index.html');
const MARK = /^<!-- @dahil: (.+?) -->$/;

function build() {
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  if (!tpl.endsWith('\n')) throw new Error('src/index.html satır sonuyla bitmeli');
  const used = new Set();
  const out = tpl.slice(0, -1).split('\n').map(line => {
    const m = line.match(MARK); if (!m) return line + '\n';
    const rel = m[1], file = path.join(SRC, rel);
    if (!file.startsWith(SRC + path.sep)) throw new Error('src/ dışına çıkan yol: ' + rel);
    if (used.has(rel)) throw new Error('aynı parça iki kez eklenmiş: ' + rel);
    used.add(rel);
    const txt = fs.readFileSync(file, 'utf8');
    if (txt && !txt.endsWith('\n')) throw new Error(`src/${rel} satır sonuyla bitmeli`);
    return txt;
  }).join('');
  // Şablonda unutulmuş parça kalmasın
  const all = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : all.push(path.relative(SRC, p).split(path.sep).join('/')); } })(SRC);
  const orphan = all.filter(f => f !== 'index.html' && !used.has(f));
  if (orphan.length) throw new Error('şablona eklenmemiş parça: ' + orphan.join(', '));
  return out;
}

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== html) { console.log('✗ index.html güncel değil — önce `node scripts/build.js` çalıştırın.'); process.exit(1); }
    console.log('✓ index.html src/ ile güncel.');
  } else {
    fs.writeFileSync(OUT, html);
    console.log(`✓ index.html üretildi (${(html.length / 1024).toFixed(0)} KB).`);
  }
}
module.exports = { build };
