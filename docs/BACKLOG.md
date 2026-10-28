# Açık geliştirme görevleri

Bir seferde tek görev. Her görev ayrı dalda, testlerle birlikte. Durum: ⬜ açık · 🔄 çalışılıyor · ✅ bitti

## Satınalma ihtiyaç hesaplama
- ⬜ **Satınalma siparişleri takibi.** Bugün malzeme başına tek bir "yoldaki miktar + tarih" tutuluyor; birden fazla
  açık satınalma siparişi modellenemiyor. MRP önerisinden sipariş açma, beklenen geliş tarihli birden çok sipariş,
  teslim alma, Mikro açık satınalma listesini Excel ile yükleme. (Önerilen sıradaki görev)
- ⬜ Satınalma önerisinde parti büyüklüğü (koli/palet katı) yuvarlaması.

## Stok yönetimi
- ⬜ Hammadde stoklarının Mikro stok listesinden düzenli güncellenmesi için eşleştirme ayarının kaydedilmesi.
- ⬜ Mamul stok hareketleri: üretim girişi ile planlanan ihtiyaç arasındaki ilişki (çift sayım riski analiz edilmeli).

## Üretim planlama
- ⬜ Makine bakım / arıza duruşlarının takvime kapalı zaman olarak girilmesi.
- ⬜ Günlük iş emri çıktısı (ustabaşı için makine bazında liste).
- ⬜ Sipariş önceliğinin (öncelik alanı) sıralamaya etkisi — alan var, motorda kullanılmıyor.

## Yönetim paneli
- ⬜ Plan / gerçekleşen karşılaştırması (geçmiş planların saklanması gerekiyor).
- ⬜ Grafiklerin dışa aktarımı (PNG / Excel).

## Çok kullanıcılı sürüm — yol haritası

Hedef: planlama motoruna (`compute()`, `mrp()`) dokunmadan, birden çok firmanın ve firma başına birkaç
kullanıcının güvenle kullanabileceği web uygulaması. Önerilen altyapı: Supabase (PostgreSQL + giriş +
satır bazlı güvenlik) ve ön yüz için Vercel / Cloudflare Pages. Fazlar sırayla; her faz bitmeden sonrakine geçilmez.
Tahmini süre: Faz 0–3 yaklaşık 6–8 hafta (akşam ve hafta sonu çalışmasıyla).

### Faz 0 — Hazırlık
- ✅ `index.html` tek dosya (~160 KB): `src/` altında 2 CSS + 12 JS parçasına bölündü; `scripts/build.js`
  (bağımlılıksız) parçaları birleştirip `index.html`'i üretiyor. İlk derleme çıktısı eski dosyayla bayt bayt aynı.
  Vite yerine bağımlılıksız betik seçildi: parçalar tek IIFE'yi paylaştığı için ES modüllerine geçiş ayrı bir iş.
- ⬜ JS parçalarının ES modüllerine dönüştürülmesi (ortak `S` durumu ve yardımcıların açık `import`/`export` ile
  paylaşılması) ve gerekiyorsa Vite. Faz 1'deki depolama adaptörüyle birlikte yapılması önerilir.
- ⬜ SheetJS 0.18.5 güncellemesi (bilinen açıklar). Yeni sürümler npm/cdnjs'te değil, SheetJS'in kendi
  dağıtımında (cdn.sheetjs.com); derleme adımıyla pakete gömülmesi araştırılmalı.
- ⬜ Artifact çalışma zamanına bağımlılığın (`window.claude.use("downloads")`) kaldırılması; yedek indirme
  standart tarayıcı indirmesiyle çalışmalı.

### Faz 1 — Veri katmanı
- ⬜ `load()` / `save()` arkasına depolama adaptörü: localStorage ve veritabanı aynı arayüzle.
- ⬜ `S` nesnesinin firma başına tek JSON kaydı olarak veritabanına yazılması (veri modeli değişmez;
  eski `PlanPres_yedek_*.txt` dosyaları aynen yüklenebilmeli — Kural 1).
- ⬜ Kayıt sürüm numarası ve iyimser kilitleme: iki kişi aynı anda kaydederse sonraki kayıt eskisini ezmez,
  kullanıcı uyarılır.
- ⬜ localStorage'daki mevcut veriyi (veya yedek dosyasını) veritabanına aktarma ekranı, kullanıcı onaylı.

### Faz 2 — Giriş ve roller
- ⬜ E-posta + şifre ile giriş; her kullanıcı bir firmaya bağlı.
- ⬜ Firma ayrımı: satır bazlı güvenlik (RLS) ile bir firmanın verisi başka firmaya hiçbir koşulda görünmez;
  bunu doğrulayan test.
- ⬜ Roller: Yönetici (kullanıcı ekler, ayarlar), Planlamacı (planı düzenler), İzleyici (salt okunur).
  Arayüzde izleyiciye düzenleme kontrolleri gösterilmez, sunucu tarafında da engellenir.

### Faz 3 — Ekip kullanımı
- ⬜ Planlamacı kaydettiğinde izleyici ekranlarının otomatik yenilenmesi (canlı güncelleme).
- ⬜ Günlük iş emri çıktısının (bkz. Üretim planlama) telefondan, makine bazında görüntülenmesi.
- ⬜ Otomatik günlük yedek ve geri yükleme; elle yedek isteğe bağlı kalır.
- ⬜ İşlem kaydı: kim, ne zaman, neyi değiştirdi (özellikle elle plan düzenlemeleri ve silmeler).

### Faz 4 — Pilot
- ⬜ 1–2 dış firmada gerçek veriyle pilot; haftalık geri bildirim ve hata listesi.
- ⬜ Kendi fabrikamızda kullanım için önce şirketten yazılı izin (gerçek veri dış sunucuya çıkar: KVKK ve
  yazılım sahipliği).

### Faz 5 — Satışa hazırlık
- ⬜ KVKK aydınlatma metni, kullanıcı sözleşmesi, veri işleme sözleşmesi; veri konumu kararı
  (Frankfurt bölgesi mi, Türkiye'de barındırma mı).
- ⬜ Firma başına aylık abonelik, deneme süresi ve faturalama süreci.
- ⬜ Mikro entegrasyonu: Excel yüklemesinden sonra Mikro SQL görünümlerinden otomatik veri çekme.
