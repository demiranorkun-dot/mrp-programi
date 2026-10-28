// Derleme: src/ parçalarından üretilen index.html, depodaki index.html ile birebir aynı mı?
const fs = require('fs'), path = require('path');
const { ROOT, t } = require('./helpers');
const { build } = require('../scripts/build');

t.group('0 · Derleme (src/ → index.html)');
let html = null;
try { html = build(); t.ok(true, 'src/ parçaları hatasız birleşiyor'); }
catch (e) { t.ok(false, 'src/ parçaları hatasız birleşiyor', e.message); }
if (html != null) {
  const cur = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  t.ok(cur === html, 'index.html güncel (src/ değiştiyse `node scripts/build.js` çalıştırın)');
  t.ok(/<script>\n\(function\(\)\{\n"use strict";/.test(html) && html.trimEnd().endsWith('})();\n</script>'), 'betik tek IIFE olarak açılıp kapanıyor');
  t.ok(!html.includes('@dahil:'), 'üretilen dosyada işlenmemiş @dahil işareti yok');
}
