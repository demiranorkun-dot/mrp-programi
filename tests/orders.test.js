// Sipariş bazında plan: aynı mamulün uzak terminli siparişleri ayrı iş olur (test fikstürü, gerçek veri yok)
const path = require('path'); const { loadFile, ROOT, t } = require('./helpers');

t.group('5 · Sipariş bazında plan');
const fresh = () => { const A = loadFile(path.join(ROOT, 'index.html')); return A; };
const day = (A, n) => A.iso(new Date(Date.now() + n * 864e5));
// test fikstürü: tek kalıplı bir test mamulü, iki sipariş
function fixture(A, d1, d2, extra = {}) {
  const S = A.S, mold = S.molds.find(k => !(S.family || {})[String(k.code)]);
  S.orders = [
    { id: 't1', no: 'T-1', product: 'TEST-MAMUL', qty: 1000, due: day(A, d1), extra: 0, ...extra.o1 },
    { id: 't2', no: 'T-2', product: 'TEST-MAMUL', qty: 2000, due: day(A, d2), extra: 0, ...extra.o2 }];
  S.bom = [{ id: 'tb', product: 'TEST-MAMUL', part: mold.part, cat: 'Yarı mamul', qty: 1 }];
  return mold.part;
}
const jobsOf = (R, part) => R.jobs.filter(j => j.part === part);
const sum = js => js.reduce((a, j) => a + j.need, 0);

{ const A = fresh(), part = fixture(A, 10, 40); const R = A.compute(), js = jobsOf(R, part);
  t.ok(js.length === 2, 'uzak terminli iki sipariş → iki ayrı iş', js.length);
  t.ok(js.length === 2 && js[0].due === day(A, 10) && js[1].due === day(A, 40), 'her iş kendi siparişinin terminini taşıyor');
  t.ok(js.length === 2 && js[0].orders.join() === 'T-1' && js[1].orders.join() === 'T-2', 'iş hangi siparişe ait biliniyor (sipariş no)');
  t.ok(js[0].key === part && js[1].key === part + '@' + day(A, 40), 'ilk iş eski anahtarı korur (elle düzenlemeler bozulmaz)');
  t.ok(t.near(sum(js), 3000), 'toplam ihtiyaç değişmiyor', sum(js)); }

{ const A = fresh(), part = fixture(A, 10, 14); const js = jobsOf(A.compute(), part);
  t.ok(js.length === 1 && t.near(js[0].need, 3000) && js[0].due === day(A, 10), 'terminleri 7 gün içindeki siparişler tek işte toplanır'); }

{ const A = fresh(), part = fixture(A, 10, 40); A.S.settings.batchDays = 0; const js = jobsOf(A.compute(), part);
  t.ok(js.length === 1 && t.near(js[0].need, 3000), 'birleştirme penceresi 0 → parçanın tüm ihtiyacı tek iş (eski davranış)'); }

{ const A = fresh(), part = fixture(A, 10, 40, { o1: { stock: 1500 }, o2: { stock: 1500 } }); const js = jobsOf(A.compute(), part);
  t.ok(js.length === 1 && t.near(js[0].need, 1500) && js[0].due === day(A, 40), 'eldeki stok önce en erken terminli siparişten düşülür', js.map(j => j.need + '@' + j.due).join()); }

{ const A = fresh(), part = fixture(A, 10, 40); const R = A.compute(), js = jobsOf(R, part);
  const s1 = R.lanes[js[0].machine].find(s => s.job === js[0]), s2 = R.lanes[js[1].machine].find(s => s.job === js[1]);
  t.ok(s1 && s2 && s1.startDT <= s2.startDT, 'erken terminli iş önce başlıyor'); }

{ const A = fresh(), part = fixture(A, 10, 40); const R = A.compute(), js = jobsOf(R, part);
  t.ok(js.length === 2 && js[0].machine === js[1].machine, 'aynı kalıbın partileri aynı makineye yönleniyor (kalıp taşınmaz)', js.map(j => j.machine).join());
  const lane = R.lanes[js[0].machine], i2 = lane.findIndex(s => s.job === js[1]);
  if (i2 > 0 && lane[i2 - 1].job === js[0]) t.ok(lane[i2].coA == null, 'aynı kalıp art arda gelirse kalıp değişim süresi eklenmiyor');
  else t.ok(true, 'aynı kalıp art arda değil (arada başka iş var), kalıp değişimi normal'); }
