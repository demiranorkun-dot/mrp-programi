# PlanPres

Plastik enjeksiyon fabrikaları için üretim planlama ve MRP uygulaması. Türkçe arayüz.
Kullanıcı: üretim planlama yöneticisi; uygulama ileride başka firmalara satılacak.

## Yapı

- **Kaynak `src/`, çıktı `index.html`.** HTML + CSS + JavaScript, framework yok (vanilla JS).
  Düzenleme her zaman `src/` altında yapılır; `index.html` `node scripts/build.js` ile üretilir ve
  depoya **üretilmiş haliyle** girer (yayın ve regresyon testi bu dosyayı kullanır). `index.html`'i elle düzenleme.
  - `src/index.html` şablondur; `<!-- @dahil: yol -->` satırları ilgili parçayla birebir değiştirilir.
  - `src/css/` stiller, `src/govde.html` sayfa iskeleti (menü, başlık, modal kökü, SheetJS betiği),
    `src/js/00…11-*.js` uygulama betiği. JS parçaları **tek bir IIFE'nin ardışık bölümleridir**
    (`00-baslangic.js` açar, `11-hammadde-ayarlar.js` kapatır): ortak kapsamı paylaşırlar, tek başlarına
    çalışmazlar, sıraları önemlidir. Yeni parça eklerken şablona da ekle; eklenmemiş parça derlemeyi durdurur.
  - Testler bölüm sınırlarını metin işaretleriyle bulur (`tests/helpers.js` → `grab`). Bölüm başlıklarını
    ve `function demo(){`, `const DEF={` gibi işaret satırlarını değiştirirken testleri de güncelle.
  Claude.ai Artifact olarak yayınlanır; dosya `<!doctype>/<html>/<head>/<body>` içermez,
  yayın sırasında bu iskelet otomatik eklenir.
- **Veri:** sunucu ve veritabanı yok. Tüm kayıtlar kullanıcının tarayıcısında
  `localStorage["planpres-v1"]` anahtarında tek bir JSON nesnesi (`S`) olarak durur.
  Panel filtreleri `localStorage["planpres-dash"]`. Taşıma = Ayarlar → Yedek al / Yedekten yükle (.txt/.json).
- **Dış bağımlılıklar (yalnızca CDN):**
  - SheetJS `xlsx` 0.18.5 — cdnjs (Excel okuma)
  - Google Fonts: Barlow, Barlow Semi Condensed, IBM Plex Mono
  - Claude Artifact çalışma zamanı: `window.claude.use("downloads")` (yedek indirme)
  Artifact CSP'si yalnızca cdnjs / jsdelivr / unpkg / Google Fonts'a izin verir.

### Kaynak dosyalar (birleşme sırasıyla)

| Dosya | İşlev |
|---|---|
| `css/01-temel.css` | `:root` token'ları (açık/koyu tema, `--s1..--s4` grafik renkleri), kabuk, tablolar, Gantt |
| `css/02-yonetim-paneli.css` | Yönetim paneli stilleri |
| `govde.html` | Sayfa iskeleti, SheetJS `<script>` etiketi |
| `js/00-baslangic.js` | IIFE açılışı, yardımcılar (`nf0`, `iso`, `num`…), `demo()` / `load()` / `save()` |
| `js/01-planlama-motoru.js` | `compute()`: sipariş → reçete patlatma → parça işleri → makine önerisi → saat bazlı çizelge (kalıp çakışması, çalışan iş, araya iş) |
| `js/02-mrp.js` | `mrp()`: çizelgeye göre zamanlanmış malzeme ihtiyacı, stok bakiyesi, sipariş önerisi |
| `js/03-ortak-gorunum.js` | Malzeme renkleri, etiket/rozet yardımcıları |
| `js/04-gezinme.js` | Menü ve sayfa geçişleri |
| `js/05-ekranlar.js` | Özet, Üretim Planı, Makine Takvimi (sürükle-bırak), MRP |
| `js/06-panel-analiz.js` | `Dash`: yönetim paneli analizleri — **saf fonksiyonlar**, S ve R'yi yalnızca okur |
| `js/07-panel-grafik.js` | `Chart`: SVG/HTML grafik çizimi |
| `js/08-panel-ekran.js` | Yönetim paneli ekranı |
| `js/09-kayit-tanimlari.js` | `DEF` / `SYN`: kayıt ekranları (CRUD) tanımları, Excel sütun eşleştirme sözlüğü |
| `js/10-excel-aktarim.js` | Excel/yapıştırma ile içe aktarma |
| `js/11-hammadde-ayarlar.js` | Hammadde ve Ayarlar ekranları, başlatma, IIFE kapanışı |

### Veri modeli (`S`)

`settings`, `machines`, `molds`, `bom` (mamul reçetesi), `orders`, `materials` (stok kartları),
`production` (üretim gerçekleşmeleri), `overrides` / `seq` / `splits` (elle plan düzenlemeleri),
`family` (aile kalıpları), `lastBackup`.

## Kurallar

1. **Veri modelini bozma.** Mevcut alanları yeniden adlandırma, silme ya da anlamını değiştirme.
   Yeni alanlar isteğe bağlı olmalı; eski yedekler (`PlanPres_yedek_*.txt`) değişmeden yüklenmeli.
2. **Gerçek kayıtlara dokunma.** Kod kullanıcının verisini kendiliğinden silmez/değiştirmez;
   her silme ve toplu değişiklik uygulama içinde kullanıcı onayıyla yapılır.
3. **Eksik veriyi uydurma.** Hesaplanamayan değer `null` döner ve ekranda "eksik" olarak raporlanır;
   0, tahmin ya da örnek değerle doldurulmaz.
4. **Gizli bilgi ve gerçek veri depoya girmez:** Excel dosyaları, yedekler, müşteri adları,
   gerçek ürün kodlarıyla yazılmış test beklentileri, ekran görüntüleri. Bkz. `.gitignore`.
   Commit öncesi `node scripts/check-sensitive.js` çalıştır.
5. **Ana dala doğrudan gönderme yok.** Her iş ayrı dalda (`ozellik/...`, `duzeltme/...`), PR ile.
6. **Bir seferde tek geliştirme görevi.** Açık görevler: `docs/BACKLOG.md`.
7. Arayüz metinleri Türkçe ve sektör dilinde (göz, çevrim, yolluk, kalıp değişimi, termin).

## Komutlar

```bash
node scripts/build.js                   # src/ → index.html (her src/ değişikliğinden sonra)
node scripts/build.js --check           # index.html güncel mi? (testler de bunu denetler)
node tests/run.js                       # tüm testler (örnek veriyle, gerçek veri gerekmez)
PLANPRES_DATA=./data node tests/run.js  # + gerçek veri testleri (data/ klasörü depoya girmez)
node scripts/check-sensitive.js         # takip edilen dosyalarda gizli bilgi / gerçek veri taraması
```

Testler `index.html`'den ilgili fonksiyonları ayıklayıp Node'da çalıştırır (paket kurulumu gerekmez).
Regresyon testi plan ve MRP sonuçlarını `main` dalındaki sürümle karşılaştırır.

## Yayın

Canlı uygulama bir Claude.ai Artifact'idir; GitHub'dan otomatik yayın yoktur.
`main` dalına birleşen sürüm, bir Claude oturumunda aynı Artifact'e yeniden yayınlanır.
