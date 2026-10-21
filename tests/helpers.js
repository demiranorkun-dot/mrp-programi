// index.html içindeki hesap kodunu DOM olmadan Node'da çalıştırır.
const fs = require('fs'), path = require('path');

function loadApp(src) {
  const grab = (a, b) => { const i = src.indexOf(a); if (i < 0) throw new Error('index.html içinde bulunamadı: ' + a); return src.slice(i, src.indexOf(b, i)); };
  const opt = (a, b) => src.includes(a) ? grab(a, b) : '';
  const ctx = {};
  const code = `
    const esc=s=>String(s??"");
    ${grab('const nf0=', 'function today(){')}
    function today(){return iso(new Date())}
    ${grab('function demo(){', 'let S;')}
    let S=demo();
    ${grab('const netHours=', '/* ---------- material colours')}
    ${opt('const Dash={', 'const COL=')}
    globalThis.XLSX={utils:{sheet_to_json:ws=>ws}};
    ${grab('const DEF={', 'function cell(')}
    ${grab('function parseDate', 'function openPaste').replace(/function readWb[\s\S]*?function importAll/, 'function importAll').replace(/function importAll[\s\S]*/, '')}
    ctx.api={get S(){return S},set S(v){S=v},demo,compute,DEF,SYN,pickSheet,sheetRows,headerRow,autoMap,convRow,pickCell,validRow,netHours,iso,parseISO,
      Dash:typeof Dash!=='undefined'?Dash:null};`;
  new Function('ctx', code)(ctx);
  return ctx.api;
}
const loadFile = f => loadApp(fs.readFileSync(f, 'utf8'));
const ROOT = path.join(__dirname, '..');

// Gerçek veri: PLANPRES_DATA klasöründeki JSON dışa aktarımları (depoya girmez).
// Beklenen dosyalar: recete.json (Ürün Reçetesi + Makine Listesi sayfaları), siparisler.json, mamul_recetesi.json
function importJson(A, file, id) {
  const W = JSON.parse(fs.readFileSync(file, 'utf8')); const wb = { SheetNames: Object.keys(W), Sheets: W };
  const rows = A.sheetRows(wb, wb.SheetNames[A.pickSheet(id, wb.SheetNames)]), hr = A.headerRow(id, rows), map = A.autoMap(id, rows[hr]);
  const data = rows.slice(hr + 1).map(r => A.convRow(id, k => A.pickCell(map, r, k))).filter(o => A.validRow(id, o));
  const L = A.DEF[id].list(); L.length = 0; data.forEach((o, i) => L.push({ id: id + i, ...o })); return { rows, hr, map, data };
}
function realData(A) {
  const dir = process.env.PLANPRES_DATA; if (!dir) return null;
  const f = n => path.join(dir, n); const need = ['recete.json', 'siparisler.json'];
  if (!need.every(n => fs.existsSync(f(n)))) { console.log(`  (PLANPRES_DATA içinde ${need.join(', ')} yok, gerçek veri testleri atlandı)`); return null; }
  const st = A.S.settings; A.S = { settings: { ...st, exclude: 'KF-' }, machines: [], molds: [], bom: [], orders: [], materials: [], overrides: {} };
  importJson(A, f('recete.json'), 'makineler'); importJson(A, f('recete.json'), 'kaliplar');
  const ord = importJson(A, f('siparisler.json'), 'siparisler');
  if (fs.existsSync(f('mamul_recetesi.json'))) importJson(A, f('mamul_recetesi.json'), 'agac');
  return { ord };
}

let pass = 0, fail = 0, group = '';
const t = {
  group(name) { group = name; console.log('\n' + name); },
  ok(c, msg, extra) { if (c) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg + (extra ? '  → ' + extra : '')); } },
  near: (a, b, tol = 1e-6) => a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)),
  summary() { return { pass, fail }; }
};
module.exports = { loadApp, loadFile, ROOT, realData, importJson, t };
