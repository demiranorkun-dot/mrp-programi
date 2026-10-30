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
- ✅ Makine bakım / arıza duruşlarının takvime kapalı zaman olarak girilmesi (makine kartı → Duruş günleri; fabrika tatilleri Ayarlar'da).
- ⬜ Günlük iş emri çıktısı (ustabaşı için makine bazında liste).
- ✅ Sipariş önceliğinin (öncelik alanı) sıralamaya etkisi — 1 acil · 2 normal · 3 düşük; Ayarlar'dan kapatılabilir.

## Yönetim paneli
- ⬜ Plan / gerçekleşen karşılaştırması (geçmiş planların saklanması gerekiyor).
- ⬜ Grafiklerin dışa aktarımı (PNG / Excel).

## Altyapı
- ⬜ `index.html` tek dosya (~160 KB): ürünleştirme öncesi modüllere bölme ve derleme adımı.
- ⬜ SheetJS 0.18.5 güncellemesi (bilinen açıklar; cdnjs'te daha yeni sürüm yok — çözüm araştırılmalı).
- ⬜ Çok kullanıcılı sürüm: sunucu, kullanıcı girişi, firma ayrımı.
