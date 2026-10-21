// Git'e eklenecek dosyalarda gizli bilgi ve gerçek firma verisi taraması.
// Kullanım: node scripts/check-sensitive.js   (takip edilen + eklenmeye hazır dosyalar)
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const BAD_FILES = [/\.env(\.|$)/i, /\.(xlsx?|xlsm|csv|sql|dump|bak|db|sqlite3?|pem|key|p12|pfx)$/i, /PlanPres_yedek_/i, /^data\//];
const SECRETS = [
  [/sk-[A-Za-z0-9_-]{20,}/, 'API anahtarı (sk-...)'], [/AKIA[0-9A-Z]{16}/, 'AWS erişim anahtarı'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'özel anahtar'],
  [/\b(api[_-]?key|secret|password|parola|şifre)\s*[:=]\s*["'][^"']{6,}["']/i, 'parola/anahtar ataması'],
  [/(mongodb(\+srv)?|postgres(ql)?|mysql):\/\/[^\s"']+/i, 'veritabanı bağlantı adresi'], [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, 'JWT/oturum belirteci'],
];
// Gerçek veri izleri: Mikro sipariş dökümü başlıkları ve gerçek veri dosyasından alınmış yapı. Firma/müşteri adlarını buraya yazma;
// ek kelimeleri yerelde PLANPRES_DENY="ad1,ad2" ile ver.
const DENY = (process.env.PLANPRES_DENY || '').split(',').map(s => s.trim()).filter(Boolean);
const REAL = [[/KALAN SİPARİŞ MİKTARI|STOK ELDEKİ MİKTAR|CARİ İSMİ/, 'Mikro sipariş dökümü içeriği'], [/"savedAt":"20\d\d-.*"data":\{/, 'PlanPres yedek içeriği']];
let issues = 0;
for (const f of files) {
  if (BAD_FILES.some(r => r.test(f))) { console.log(`✗ ${f}: bu dosya türü depoya girmemeli`); issues++; continue; }
  const p = path.join(root, f); if (!fs.existsSync(p) || fs.statSync(p).size > 5e6) continue;
  if (path.resolve(p) === path.resolve(__filename)) continue; // betiğin kendi arama kalıpları
  const txt = fs.readFileSync(p, 'utf8');
  for (const [r, what] of [...SECRETS, ...REAL]) if (r.test(txt)) { console.log(`✗ ${f}: olası ${what}`); issues++; }
  for (const w of DENY) if (txt.toLocaleLowerCase('tr').includes(w.toLocaleLowerCase('tr'))) { console.log(`✗ ${f}: yasaklı kelime "${w}"`); issues++; }
}
console.log(issues ? `\n${issues} sorun bulundu — commit etmeden önce düzeltin.` : `✓ ${files.length} dosya tarandı, gizli bilgi ya da gerçek veri izi bulunamadı.`);
process.exit(issues ? 1 : 0);
