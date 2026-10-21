// Planlama motoru ve MRP — örnek veriyle (gerçek veri gerekmez)
const path = require('path'); const { loadFile, ROOT, realData, t } = require('./helpers');

function checkSchedule(A, label) {
  const R = A.compute(), S = A.S;
  t.ok(R.jobs.length > 0, `${label}: plan iş üretiyor (${R.jobs.length} iş)`);
  let overlap = 0, nan = 0;
  for (const m of S.machines) { let prev = null; for (const s of R.lanes[m.code] || []) { if (!s.startDT) continue; if (prev && s.startDT < prev - 1000) overlap++; prev = s.end; if (isNaN(s.startDT) || isNaN(s.end)) nan++; } }
  t.ok(overlap === 0, `${label}: aynı makinede saat çakışması yok`);
  t.ok(nan === 0, `${label}: başlangıç/bitiş saatleri geçerli`);
  const busy = {}; let clash = 0;
  for (const m of S.machines) for (const s of R.lanes[m.code] || []) { if (!s.startDT) continue; const k = String(s.mold.code); for (const [a, b, mc] of busy[k] || []) if (mc !== m.code && s.startDT < b - 1000 && s.end > a + 1000) clash++; (busy[k] = busy[k] || []).push([s.startDT, s.end, m.code]); }
  t.ok(clash === 0, `${label}: aynı kalıp aynı anda iki makinede değil`);
  t.ok(R.mrp.rows.every(r => [r.gross, r.net, r.order].every(Number.isFinite)), `${label}: MRP satırlarında sayısal hata yok`);
  return R;
}

t.group('1 · Planlama motoru ve MRP (örnek veri)');
const A = loadFile(path.join(ROOT, 'index.html'));
checkSchedule(A, 'örnek veri');
const R0 = A.compute(); const part = R0.jobs[0].part, mc = R0.jobs[0].machine;
A.S.machines.find(m => m.code === mc).rPart = part; A.S.machines.find(m => m.code === mc).rRemain = 10;
const R1 = A.compute(); const first = R1.lanes[mc][0];
t.ok(first.running && first.need === 10, 'makinede çalışan iş plana başta sabitleniyor');
A.S.machines.find(m => m.code === mc).rPart = '';

const B = loadFile(path.join(ROOT, 'index.html'));
if (realData(B)) { t.group('1b · Planlama motoru ve MRP (gerçek veri)'); checkSchedule(B, 'gerçek veri'); }
