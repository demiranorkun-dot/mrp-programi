// Tüm testleri çalıştırır: node tests/run.js
const fs = require('fs'), path = require('path'); const { t } = require('./helpers');
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  try { require(path.join(__dirname, f)); } catch (e) { t.ok(false, `${f} çalışırken hata`, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
const { pass, fail } = t.summary(); console.log(`\n${pass} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
