// Takvim: fabrika tatilleri ve makine duruşları (test fikstürü, gerçek veri yok)
const path = require('path'); const { loadFile, ROOT, t } = require('./helpers');

t.group('7 · Tatil ve makine duruşu');
const fresh = () => loadFile(path.join(ROOT, 'index.html'));
{ const A = fresh(); const d = A.dateSet('29.10.2026, 2026-12-31..2027-01-02;  05/11/2026 bozuk');
  t.ok(d.has('2026-10-29') && d.has('2026-12-31') && d.has('2027-01-01') && d.has('2027-01-02') && d.has('2026-11-05') && d.size === 5, 'tarih, aralık ve gg.aa.yyyy biçimleri okunuyor; geçersiz yazı yok sayılıyor', [...d].join()); }
{ const A = fresh(); const w = A.workDays('2026-10-28', 3, false, A.dateSet('2026-10-29')).map(A.iso);
  t.ok(w.join() === '2026-10-28,2026-10-30,2026-11-02', 'tatil günü çalışma günlerinden çıkıyor', w.join()); }

// sabit başlangıç tarihli plan: tatil ve duruşun etkisi ölçülebilsin
const base = A => { A.S.settings.start = '2026-11-02'; A.S.settings.batchDays = 0; return A; };
const firstJob = R => R.jobs.find(j => !j.running && j.machine && j.hrs > 30);
{ const A0 = base(fresh()), R0 = A0.compute(), j0 = firstJob(R0);
  const A1 = base(fresh()); A1.S.settings.holidays = '2026-11-03'; const R1 = A1.compute(), j1 = R1.jobs.find(j => j.key === j0.key);
  t.ok(!R1.days.map(A1.iso).includes('2026-11-03'), 'tatil günü plan takviminde yok');
  t.ok(j1.end > j0.end, 'tatil, işin bitişini ileri itiyor', `${A0.iso(j0.end)} → ${A1.iso(j1.end)}`);
  const A2 = base(fresh()); A2.S.machines.find(m => m.code === j0.machine).down = '2026-11-03'; const R2 = A2.compute();
  const s2 = R2.lanes[j0.machine].find(s => s.job.key === j0.key), s0 = R0.lanes[j0.machine].find(s => s.job.key === j0.key);
  t.ok(s2 && s0 && s0.startA < 1 && s0.endA > 2 && Math.abs((s2.endA - s0.endA) - 1) < 1e-6 && s2.startA === s0.startA, 'makine duruşu: iş o gün durur, bitiş 1 gün kayar', s2 && s0 && `${s0.startA}-${s0.endA} → ${s2.startA}-${s2.endA}`);
  const other = R2.jobs.find(j => j.machine && j.machine !== j0.machine && !j.running), o0 = R0.jobs.find(j => j.key === other.key);
  t.ok(other && o0 && +other.end === +o0.end, 'duruş yalnızca o makineyi etkiliyor'); }
{ const A = base(fresh()); A.S.machines.forEach(m => m.down = '2026-11-02..2026-11-04'); const R = A.compute();
  const starts = A.S.machines.flatMap(m => (R.lanes[m.code] || []).filter(s => !s.running && s.startA != null).map(s => s.startA));
  t.ok(starts.length && starts.every(a => a >= 3 - 1e-9), 'duruş günlerinde hiçbir iş başlamıyor', Math.min(...starts)); }
