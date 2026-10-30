// Geriye uyumluluk: plan ve MRP sonuçları main dalındaki sürümle aynı mı?
const path = require('path'), { execSync } = require('child_process');
const { loadApp, loadFile, ROOT, realData, t } = require('./helpers');

let base = null;
try { base = execSync('git show main:index.html', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 50e6 }); } catch (e) {}
t.group('4 · Geriye uyumluluk (main ile karşılaştırma)');
if (!base) { console.log('  (main dalı bulunamadı, atlandı)'); }
else {
  const sig = R => JSON.stringify({ jobs: R.jobs.map(j => [j.part, j.machine, Math.round(j.need), j.endIso]).sort(), mrp: R.mrp.rows.map(r => [r.code, Math.round(r.gross), Math.round(r.order), r.status]) });
  const pair = () => [loadApp(base), loadFile(path.join(ROOT, 'index.html'))];
  // Bilinçli davranış değişiklikleri burada kapatılır, böylece geri kalan her şey main ile birebir karşılaştırılır.
  // batchDays=0: sipariş bazında iş ayırma kapalı (main'deki parça başına tek iş davranışı)
  // usePrio=false: sipariş önceliği sıralamaya katılmaz (main'de öncelik kullanılmıyordu)
  const legacy = A => { A.S.settings.batchDays = 0; A.S.settings.usePrio = false; return A; };
  let [o, n] = pair(); legacy(n); t.ok(sig(o.compute()) === sig(n.compute()), 'örnek veri: eski davranış ayarlarıyla plan ve MRP birebir aynı');
  [o, n] = pair(); if (realData(o) && realData(n)) { legacy(n); t.ok(sig(o.compute()) === sig(n.compute()), 'gerçek veri: eski davranış ayarlarıyla plan ve MRP birebir aynı'); }
}
