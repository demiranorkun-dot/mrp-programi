# PlanPres

Plastik enjeksiyon fabrikaları için üretim planlama ve MRP uygulaması. Türkçe arayüz.
Kullanıcı: üretim planlama yöneticisi; uygulama ileride başka firmalara satılacak.

## Yapı

- **Tek dosya:** `index.html` — HTML + CSS + JavaScript, framework yok (vanilla JS).
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

### `index.html` içindeki bölümler (sırayla)

| Bölüm | İşlev |
|---|---|
| `:root` token'ları | Açık/koyu tema renkleri, `--s1..--s4` grafik renkleri |
| `demo()` / `load()` / `save()` | Örnek veri, localStorage okuma/yazma |
| `planning engine` → `compute()` | Sipariş → reçete patlatma → parça işleri → makine önerisi → saat bazlı çizelge (kalıp çakışması, çalışan iş, araya iş) |
| `mrp()` | Çizelgeye göre zamanlanmış malzeme ihtiyacı, stok bakiyesi, sipariş önerisi |
| `views` | Özet, Üretim Planı, Makine Takvimi (sürükle-bırak), MRP, Ayarlar |
| `Dash` | Yönetim paneli analiz modülleri — **saf fonksiyonlar**, S ve R'yi yalnızca okur |
| `Chart` | SVG/HTML grafik çizimi |
| `DEF` / `SYN` | Kayıt ekranları (CRUD) tanımları ve Excel sütun eşleştirme sözlüğü |

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
node tests/run.js                       # tüm testler (örnek veriyle, gerçek veri gerekmez)
PLANPRES_DATA=./data node tests/run.js  # + gerçek veri testleri (data/ klasörü depoya girmez)
node scripts/check-sensitive.js         # takip edilen dosyalarda gizli bilgi / gerçek veri taraması
```

Testler `index.html`'den ilgili fonksiyonları ayıklayıp Node'da çalıştırır (paket kurulumu gerekmez).
Regresyon testi plan ve MRP sonuçlarını `main` dalındaki sürümle karşılaştırır.

## Yayın

Canlı uygulama bir Claude.ai Artifact'idir; GitHub'dan otomatik yayın yoktur.
`main` dalına birleşen sürüm, bir Claude oturumunda aynı Artifact'e yeniden yayınlanır.
