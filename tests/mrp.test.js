// Reçete patlatma: yarı mamul stok düşümü, termin önceliği, emniyet stoğu, döngü ve derin reçete.
// Tüm senaryolar küçük ve elle hesaplanabilir; gerçek veri kullanılmaz.
const path = require('path'), { execSync } = require('child_process');
const { loadApp, loadFile, ROOT, t } = require('./helpers');

const FILE = path.join(ROOT, 'index.html');
// 1 makine, 1 kalıp = 100 adet/saat, 10 g/adet PP, yarı mamul otomatik eşleştirme kapalı
function base(A = loadFile(FILE)) {
  const st = A.S.settings;
  A.S = { settings: { ...st, start: '2026-11-02', useStock: true, autoBom: false, exclude: '' },
    machines: [{ code: 'M1', ton: 200, shifts: 3, hours: 8, eff: 1, robot: 'Var' }],
    molds: [], bom: [], orders: [], materials: [], production: [], overrides: {}, family: {} };
  return A;
}
const mold = (code, part, o = {}) => ({ code, part, cav: 1, cycle: 36, partG: 10, runnerG: 0, mat: 'PP', machines: ['M1'], ...o });
const semi = (code, stock, safety = 0) => ({ code, mtype: 'Yarı mamul', stock, safety });
const line = (product, part, qty, o = {}) => ({ product, part, qty, cat: 'Yarı mamul', ...o });
const buyLine = (product, part, qty, o = {}) => ({ product, part, qty, cat: 'Bağlantı elemanı', type: 'Satınalma', unit: 'adet', ...o });
const needOf = (R, part) => { const j = R.jobs.find(j => j.part === part); return j ? j.need : 0; };
const gross = (R, code) => { const r = R.mrp.rows.find(r => r.code === code); return r ? r.gross : 0; };
const near = (a, b) => Math.abs(a - b) < 1e-6;

t.group('5 · Yarı mamul stoğu reçete patlatmada düşülür');
{ // X → 2×Y (kalıplı), Y → 3×V (satınalma). Sipariş 100 X → brüt Y 200; Y stoğu 150 → net 50.
  const A = base(); A.S.molds = [mold('K1', 'Y')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 2), buyLine('Y', 'V', 3)]; A.S.materials = [semi('Y', 150)];
  const R = A.compute();
  t.ok(near(needOf(R, 'Y'), 50), 'Y işi = 200 − 150 = 50', needOf(R, 'Y'));
  t.ok(near(gross(R, 'V'), 150), 'alt kalem V, net Y üzerinden: 50 × 3 = 150', gross(R, 'V'));
  t.ok(near(gross(R, 'PP'), 0.5), 'hammadde net Y üzerinden: 50 × 10 g = 0,5 kg', gross(R, 'PP'));
  const u = (R.semiUsed || []).find(x => x.code === 'Y');
  t.ok(u && near(u.used, 150) && near(u.gross, 200), 'kullanılan yarı mamul stoğu raporlanıyor (150 / 200)', JSON.stringify(u));
}
{ // Stok ihtiyacın tamamını karşılıyor → iş yok, alt kalem yok
  const A = base(); A.S.molds = [mold('K1', 'Y')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 2), buyLine('Y', 'V', 3)]; A.S.materials = [semi('Y', 500)];
  const R = A.compute();
  t.ok(!R.jobs.some(j => j.part === 'Y'), 'stok 500 ≥ ihtiyaç 200 → Y için iş açılmaz');
  t.ok(near(gross(R, 'V'), 0), 'stoktan karşılanan Y için V ihtiyacı doğmaz', gross(R, 'V'));
}
{ // Emniyet stoğu korunur: stok 150, emniyet 100 → kullanılabilir 50 → net 150
  const A = base(); A.S.molds = [mold('K1', 'Y')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 2)]; A.S.materials = [semi('Y', 150, 100)];
  const R = A.compute();
  t.ok(near(needOf(R, 'Y'), 150), 'emniyet stoğu düşülmez: 200 − (150 − 100) = 150', needOf(R, 'Y'));
}
{ // Fire netten sonra uygulanır: X → 1×Y fire %10, Y stoğu 50 → brüt 110, net 60
  const A = base(); A.S.molds = [mold('K1', 'Y')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 1, { scrap: 0.1 })]; A.S.materials = [semi('Y', 50)];
  t.ok(near(needOf(A.compute(), 'Y'), 60), 'fire dahil brüt 110 − stok 50 = 60', needOf(A.compute(), 'Y'));
}
{ // Ara seviyede stok: X → 1×Y → 2×Z (Z kalıplı). Y kalıpsız ara mamul, stoğu 40 → net Y 60 → Z 120
  const A = base(); A.S.molds = [mold('K2', 'Z')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 1), line('Y', 'Z', 2)]; A.S.materials = [semi('Y', 40)];
  t.ok(near(needOf(A.compute(), 'Z'), 120), 'ara seviye stoğu alt seviyeye yansır: (100 − 40) × 2 = 120', needOf(A.compute(), 'Z'));
}

t.group('6 · Ortak parçada stok termini erken olana önce düşülür');
{ // P1 (termin 10.11) ve P2 (termin 20.11) 100'er adet Y kullanıyor; Y stoğu 120.
  const A = base(); A.S.molds = [mold('K1', 'Y')];
  A.S.orders = [{ no: 2, product: 'P2', qty: 100, due: '2026-11-20' }, { no: 1, product: 'P1', qty: 100, due: '2026-11-10' }];
  A.S.bom = [line('P1', 'Y', 1), line('P2', 'Y', 1)]; A.S.materials = [semi('Y', 120)];
  const R = A.compute(), j = R.jobs.find(j => j.part === 'Y');
  t.ok(j && near(j.need, 80), 'toplam net Y = 200 − 120 = 80', j && j.need);
  t.ok(j && j.due === '2026-11-20', 'kalan ihtiyacın termini geç olan P2 (20.11)', j && j.due);
  t.ok(j && j.products.length === 1 && j.products[0] === 'P2', 'net ihtiyaç yalnızca P2 için', j && JSON.stringify(j.products));
  t.ok(near((R.buy.Y || {}).need || 0, 0), 'kalıplı Y satınalma listesine düşmez', JSON.stringify(R.buy.Y));
}

t.group('7 · Reçete döngüsü ve derin reçete');
{ // X → Y → X döngüsü: şişirilmiş miktar üretilmez, döngü raporlanır; ilgisiz Z etkilenmez
  const A = base(); A.S.molds = [mold('K1', 'Y'), mold('K3', 'W')];
  A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }, { no: 2, product: 'Z', qty: 30, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 1), line('Y', 'X', 1), line('Z', 'W', 1)];
  let R = null; try { R = A.compute(); } catch (e) { t.ok(false, 'döngüde hesap durmaz', e.message); }
  if (R) {
    t.ok(!R.jobs.some(j => j.part === 'Y'), 'döngülü X için iş açılmaz (eskiden Y = 400 çıkıyordu)', JSON.stringify(R.jobs.map(j => [j.part, j.need])));
    const c = (R.bomCycles || []).find(c => c.product === 'X');
    t.ok(c && c.path.join('>') === 'X>Y>X', 'döngü yoluyla raporlanır: X > Y > X', JSON.stringify(R.bomCycles));
    t.ok(near(needOf(R, 'W'), 30), 'döngüsüz Z normal planlanır (W = 30)', needOf(R, 'W'));
  }
}
{ // 9 seviyeli reçete: L0 → L1 → … → L8 (kalıplı). Eski 6 seviye sınırında sessizce kayboluyordu.
  const A = base(); A.S.molds = [mold('K8', 'L8')]; A.S.orders = [{ no: 1, product: 'L0', qty: 10, due: '2026-11-20' }];
  A.S.bom = [...Array(8)].map((_, i) => line('L' + i, 'L' + (i + 1), 1));
  t.ok(near(needOf(A.compute(), 'L8'), 10), '9 seviyede en alt parça planlanır (L8 = 10)', needOf(A.compute(), 'L8'));
}

t.group('8 · Yarı mamul kartı yokken sonuç değişmez (main ile karşılaştırma)');
{
  let old = null;
  try { old = execSync('git show main:index.html', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 50e6 }); } catch (e) {}
  if (!old) console.log('  (main dalı bulunamadı, atlandı)');
  else {
    // Kalıplı ve alt kalemli parça, ortak bileşen, fire, satınalma ve iki mamul bir arada
    const fill = A => { base(A); A.S.molds = [mold('K1', 'Y'), mold('K2', 'Z', { cav: 2 }), mold('K3', 'W')];
      A.S.orders = [{ no: 1, product: 'X', qty: 120, due: '2026-11-12', extra: 0.05 }, { no: 2, product: 'U', qty: 80, due: '2026-11-18', stock: 10 }];
      A.S.bom = [line('X', 'Y', 2), line('Y', 'Z', 1, { scrap: 0.03 }), buyLine('Y', 'V', 4), line('U', 'Z', 3), line('U', 'W', 1), buyLine('U', 'V', 2)];
      A.S.materials = [{ code: 'PP', mtype: 'Hammadde', stock: 1, safety: 0, lead: 5 }]; return A; };
    const sig = R => JSON.stringify({ jobs: R.jobs.map(j => [j.part, j.machine, +j.need.toFixed(6), j.due, j.endIso, j.products.slice().sort()]).sort(),
      mrp: R.mrp.rows.map(r => [r.code, +r.gross.toFixed(6), +r.order.toFixed(6), r.status, r.short]) });
    const a = sig(fill(loadApp(old)).compute()), b = sig(fill(loadFile(FILE)).compute());
    t.ok(a === b, 'çok seviyeli örnekte plan ve MRP eski sürümle birebir aynı', a === b ? '' : `\n    eski: ${a}\n    yeni: ${b}`);
  }
}
{ // Rastgele (sabit tohumlu) 120 reçete: yarı mamul kartı yokken eski ve yeni motor birebir aynı sonucu vermeli
  let old = null;
  try { old = execSync('git show main:index.html', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 50e6 }); } catch (e) {}
  if (old) {
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)];
    const sig = R => JSON.stringify({ j: R.jobs.map(j => [j.part, j.machine, +j.need.toFixed(6), j.due, j.endIso, j.products]),
      m: R.mrp.rows.map(r => [r.code, r.unit, +r.gross.toFixed(6), +r.order.toFixed(6), r.status, r.short, r.items.map(i => [i.date, +i.qty.toFixed(6)])]) });
    let diff = 0, first = '';
    for (let c = 0; c < 120; c++) {
      const it = [...Array(10)].map((_, i) => 'P' + i);
      const molds = it.filter(() => rnd() < .5).map((p, i) => mold('K' + i, p, { cav: 1 + Math.floor(rnd() * 3), cycle: 20 + Math.floor(rnd() * 30), partG: 5 + rnd() * 20, runnerG: rnd() * 5, mat: pick(['PP', 'ABS']), machines: ['M1', 'M2'].filter(() => rnd() < .8) }));
      const bom = [];
      for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) if (rnd() < .18) bom.push(line(it[i], it[j], 1 + Math.floor(rnd() * 3), { scrap: rnd() < .3 ? 0.05 : 0 }));
      for (let i = 0; i < 10; i++) if (rnd() < .3) bom.push(buyLine(it[i], 'B' + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 4), { cat: 'Ambalaj', unit: pick(['adet', 'gr']) }));
      const orders = [0, 1, 2, 3].filter(() => rnd() < .7).map(i => ({ no: i, product: it[i], qty: 50 + Math.floor(rnd() * 500), due: '2026-11-' + (10 + Math.floor(rnd() * 15)), stock: rnd() < .3 ? 20 : '' }));
      const fill = A => { base(A); Object.assign(A.S, { machines: [{ code: 'M1', ton: 200, shifts: 3, hours: 8, eff: .9, robot: 'Var' }, { code: 'M2', ton: 300, shifts: 2, hours: 8, eff: 1, robot: 'Yok' }],
        molds: JSON.parse(JSON.stringify(molds)), bom: JSON.parse(JSON.stringify(bom)), orders: JSON.parse(JSON.stringify(orders)),
        materials: [{ code: 'PP', mtype: 'Hammadde', stock: 3, safety: 1, lead: 4, moq: 10 }, { code: 'B1', mtype: 'Ambalaj', stock: 100, incoming: 50, incomingDate: '2026-11-08', lead: 3 }] }); return A; };
      const a = sig(fill(loadApp(old)).compute()), b = sig(fill(loadFile(FILE)).compute());
      if (a !== b) { diff++; if (!first) first = `durum ${c}\n    eski: ${a}\n    yeni: ${b}`; }
    }
    t.ok(diff === 0, '120 rastgele reçetede plan ve MRP eski sürümle birebir aynı', `${diff} farklı · ${first}`);
  }
}
{ // Döngü, yönetim panelindeki veri eksikleri raporunda da görünür
  const A = base(); A.S.molds = [mold('K1', 'Y')]; A.S.orders = [{ no: 1, product: 'X', qty: 100, due: '2026-11-20' }];
  A.S.bom = [line('X', 'Y', 1), line('Y', 'X', 1)];
  const g = A.Dash.gaps(A.S, A.compute()).find(g => g.title === 'Ürün ağacında döngü');
  t.ok(g && g.sev === 'bad' && g.detail.includes('X › Y › X'), 'döngü veri eksikleri raporunda "bad" olarak listeleniyor', JSON.stringify(g));
}
