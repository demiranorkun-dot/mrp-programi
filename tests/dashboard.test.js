// Yönetim paneli analiz modülleri (Dash). Fikstürler yalnızca testte kullanılır, uygulamaya eklenmez.
const path = require('path'); const { loadFile, ROOT, realData, t } = require('./helpers');

function suite(A, label) {
  const S = A.S, R = A.compute(), D = A.Dash, t0 = A.iso(new Date()), F = D.parseF({}), pp = D.partProducts(S, R);
  const O = D.orders(S, F, t0), sum = S.orders.reduce((a, o) => a + (+o.qty || 0), 0);
  t.ok(O.qty === sum && O.lines === S.orders.length, `${label}: sipariş toplamı = kayıtların toplamı (${O.qty})`);
  t.ok(O.buckets.reduce((a, b) => a + b.qty, 0) === O.qty, `${label}: termin kovalarının toplamı = toplam`);
  const p = S.orders[0].product, byP = S.orders.filter(o => o.product === p).reduce((a, o) => a + (+o.qty || 0), 0);
  t.ok(D.orders(S, D.parseF({ product: p }), t0).qty === byP, `${label}: ürün filtresi`);
  const grp = String(p).split('-')[0] + '-';
  t.ok(D.orders(S, D.parseF({ product: grp }), t0).qty === S.orders.filter(o => String(o.product).startsWith(grp)).reduce((a, o) => a + (+o.qty || 0), 0), `${label}: grup filtresi (${grp})`);

  const P0 = D.production(S, F, pp), E0 = D.oee(S, P0.recs);
  if (!(S.production || []).length) t.ok(P0.T.scrapRate === null && E0.OEE === null, `${label}: üretim kaydı yokken fire/OEE null (uydurulmuyor)`);

  const MP = D.machinePlan(S, R, F, pp, t0);
  t.ok(MP.every(m => t.near(m.load, (R.lanes[m.code] || []).filter(s => s.startDT).reduce((a, s) => a + s.hrs, 0), 1e-9)), `${label}: plan yükü = takvim saatleri`);
  let daily = 0; const last = R.days[R.days.length - 1];
  for (let d = A.parseISO(t0); d <= last; d.setDate(d.getDate() + 1)) { const x = A.iso(d); daily += D.machinePlan(S, R, D.parseF({ from: x, to: x }), pp, t0).reduce((a, m) => a + m.load, 0); }
  const tot = MP.reduce((a, m) => a + m.load, 0); t.ok(t.near(daily, tot, 0.005), `${label}: günlük dilimlerin toplamı = toplam yük`);

  const ST = D.stock(R, F); t.ok(ST.every(r => t.near(r.fGross, r.gross)), `${label}: kritik stok dönem ihtiyacı = MRP brüt`);
  const C = D.cost(S, R); const priced = (S.materials || []).some(m => m.price !== '' && m.price != null);
  if (!priced) t.ok(C.products.every(p => p.total === null), `${label}: fiyat yokken maliyet uydurulmuyor`);
  const G = D.gaps(S, R); t.ok(G.length > 0 && G.every(g => ['bad', 'warn', 'info', 'ok'].includes(g.sev)), `${label}: veri eksikleri raporu üretiliyor`);
}

t.group('2 · Yönetim paneli (örnek veri)');
const A = loadFile(path.join(ROOT, 'index.html')); suite(A, 'örnek veri');

t.group('3 · OEE ve maliyet formülleri (test fikstürü)');
{ const S = A.S, D = A.Dash, k = S.molds.find(x => +x.cav > 0 && +x.cycle > 0);
  const fx = [{ date: A.iso(new Date()), machine: S.machines[0].code, part: k.part, good: 900, scrap: 100, runH: 16, downH: 4 }];
  const E = D.oee(S, fx), P = (1000 * k.cycle / k.cav / 3600) / 16;
  t.ok(t.near(E.A, 0.8) && t.near(E.Q, 0.9) && t.near(E.P, P) && t.near(E.OEE, 0.72 * P), 'OEE = K × P × Ka');
  const E2 = D.oee(S, [...fx, { ...fx[0], downH: '' }]); t.ok(E2.A === null && E2.why.length > 0, 'boş duruş süresi → K null, sebep raporlanıyor');
  const R = A.compute(); const job = R.jobs.find(j => !j.members && j.machine && !j.running);
  if (job) { const mold = S.molds.find(x => x.part === job.part), saved = JSON.stringify(S);
    // test fikstürü: tek parçalı bir test mamulü
    S.bom.push({ id: 'tb', product: 'TEST-MAMUL', part: job.part, cat: 'Yarı mamul', qty: 1 });
    S.orders.push({ id: 'to', no: 'TEST', product: 'TEST-MAMUL', qty: 100, due: A.iso(new Date(Date.now() + 20 * 864e5)), extra: 0 });
    S.materials = [{ code: mold.mat, price: 40 }]; mold.partG = 50; mold.runnerG = 10; mold.mbCode = ''; mold.mb = 0;
    const R1 = A.compute(), mc = R1.jobs.find(j => j.part === job.part).machine, m = S.machines.find(x => x.code === mc); m.hourCost = 600;
    const R2 = A.compute(), c = D.cost(S, R2).products.find(x => x.code === 'TEST-MAMUL');
    const exp = (50 + 10 / mold.cav) / 1000 * 40 + mold.cycle / mold.cav / 3600 / m.eff * 600;
    t.ok(c && t.near(c.unit, exp, 1e-9) && t.near(c.total, c.unit * R2.prod[c.code].qty), `standart maliyet = gramaj × fiyat + çevrim × saat maliyeti (${c && c.code})`, c && JSON.stringify(c));
    A.S = JSON.parse(saved); } else t.ok(false, 'maliyet testi için uygun iş bulunamadı'); }

const B = loadFile(path.join(ROOT, 'index.html'));
if (realData(B)) { t.group('2b · Yönetim paneli (gerçek veri)'); suite(B, 'gerçek veri'); }
