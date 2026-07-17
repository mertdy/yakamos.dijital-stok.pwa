# Düşük Maliyet, Yüksek Dönüş Geliştirme Planı

En az maliyetle en yüksek dönüş için geliştirmeyi “müşterinin ürünü denemesi → verisini taşıması → ilk satışını yapması → günlük alışkanlık kazanması → ücretli plana geçmesi” sırasına göre planlamak gerekir.

Aşağıdaki sıra, mevcut kod altyapısından mümkün olduğunca yararlanır.

# Önerilen geliştirme sırası

| Sıra | Özellik                                     | Tahmini efor |     Beklenen ticari etki |
| ---: | ------------------------------------------- | -----------: | -----------------------: |
|    1 | Excel/CSV ürün ve müşteri aktarımı          |      4–6 gün |               Çok yüksek |
|    2 | Maliyet, KDV ve kâr takibi                  |      5–8 gün |               Çok yüksek |
|    3 | WhatsApp veresiye ekstresi                  |      2–4 gün |               Çok yüksek |
|    4 | Kredi limiti kontrolü ve yönetici onayı     |      2–3 gün |                   Yüksek |
|    5 | Para üstü ve bölünmüş ödeme                 |      3–5 gün |                   Yüksek |
|    6 | Stok hareket geçmişi                        |      5–8 gün |               Çok yüksek |
|    7 | Hızlı onboarding ve örnek veri              |      3–5 gün |                   Yüksek |
|    8 | Kritik stok bildirimleri ve sipariş listesi |      3–5 gün |                   Yüksek |
|    9 | CSV/Excel rapor dışa aktarma                |      2–4 gün |              Orta-yüksek |
|   10 | Barkod ve raf etiketi basma                 |      4–6 gün |              Orta-yüksek |
|   11 | Basit gün sonu/kasa raporu                  |      5–8 gün |                   Yüksek |
|   12 | Tedarikçi ve alış faturası                  |    12–20 gün | Çok yüksek ama maliyetli |

Tahminler tek geliştirici ve mevcut tasarım sisteminin kullanılması varsayımıyla yaklaşık iş günüdür.

# Faz 0 — Güvenli ticari temel

Süre: 3–5 gün

Yeni özelliklerden önce satış ve stok güvenilirliğini etkileyen birkaç problemi düzeltmek gerekir. Bunlar pazarlamada görünmez ancak ücretli müşteri almadan önce önemlidir.

## Yapılacaklar

- Satış tamamlanmadan Firestore işleminin sonucunu doğrulama
- Satış iptalindeki stok iadesini atomik `increment` ile yapma
- Fatura numarasını işletme/kasa bazında benzersiz hale getirme
- Stok alt limite indiğinde satış engelleme veya uyarma
- Ürünleri kalıcı silmek yerine arşivleme
- Satışta kredi limitini gerçekten kontrol etme
- Firestore şirket izolasyonu güvenlik kurallarını doğrulama
- Gerçek senkronizasyon durumu için:
  - Bekleyen işlem sayısı
  - Son başarılı senkronizasyon zamanı
  - Senkronizasyon hatası

## Başarı ölçütü

- Kayıp veya çift satış olmaması
- Negatif stok yarış koşullarının önlenmesi
- Offline işlemden sonra kullanıcının senkronizasyon durumunu anlayabilmesi

# Faz 1 — Müşteri geçişini kolaylaştır

Süre: 1 hafta

## 1. Excel/CSV ürün aktarımı

Bu ilk özellik olmalı. Çünkü satış görüşmesinde en sık oluşacak itirazlardan birini kaldırır:

> “Yüzlerce ürünü tek tek giremem.”

### İlk sürüm kapsamı

- Örnek CSV/XLSX şablonu
- Ürün adı, barkod, SKU, stok, satış fiyatı ve maliyet alanları
- Dosya yükleme
- İlk 20 satırın ön izlemesi
- Hatalı satırların gösterilmesi
- Yinelenen barkod kontrolü
- Geçerli kayıtları toplu aktarma
- Aktarım sonucu: başarılı, atlanan ve hatalı kayıt sayısı

İlk sürümde gelişmiş kolon eşleştirme yapılmayabilir. Sabit bir şablon geliştirme maliyetini ciddi şekilde düşürür.

## 2. Müşteri ve açılış bakiyesi aktarımı

Ürün aktarımı altyapısını kullanarak eklenebilir:

- Ad
- Soyad
- Telefon
- E-posta
- Mevcut borç
- Kredi limiti

### Dikkat

Açılış borçları “manuel bakiye” hareketi olarak saklanmalı; doğrudan `totalDebt` yazmak yerine müşteri ekstresinde açıklanabilmeli.

## Başarı ölçütleri

- Kayıttan ilk ürün eklemeye kadar geçen süre
- Aktarım başlatanların başarı oranı
- İlk 24 saatte 10’dan fazla ürün ekleyen işletme oranı
- Kayıttan ilk satışa dönüşüm oranı

# Faz 2 — “Ciro değil, kazanç” değer önerisi

Süre: 1–1,5 hafta

## 3. Maliyet, KDV ve kâr takibi

Bu özellik ürünü sıradan stok programlarından ayıracak en hızlı ticari iyileştirmelerden biridir.

### Ürün kartına eklenecek alanlar

- Alış maliyeti
- Satış fiyatı
- KDV oranı
- Birim: adet, kg, litre, paket
- Kategori
- Kritik stok seviyesi
- Hedef kâr marjı

### Otomatik hesaplamalar

- Birim kâr
- Kâr marjı
- İndirim sonrası kâr
- Maliyetin altında satış uyarısı
- Hedef marja göre önerilen satış fiyatı

### Satış kaydında saklanması gerekenler

Ürünün güncel maliyetini sonradan okumak yerine satış anındaki maliyet satış satırına kopyalanmalı:

```ts
{
  unitPrice: 120,
  unitCost: 80,
  quantity: 2,
  grossProfit: 80
}
```

Böylece ürün maliyeti daha sonra değişse bile eski raporlar bozulmaz.

### Dashboard’a eklenecekler

- Bugünkü tahmini brüt kâr
- Kâr marjı
- En çok kazandıran ürünler
- Zararına satılan ürünler
- Ciro/kâr karşılaştırması

“Net kâr” ifadesi yerine ilk aşamada “brüt kâr” kullanılmalı; giderler takip edilmeden gerçek net kâr hesaplanamaz.

## Başarı ölçütleri

- Maliyet bilgisi girilmiş ürün oranı
- Kâr dashboard’unu haftalık kullanan işletme oranı
- Deneme süresinden ücretli pakete dönüşüm
- Maliyetin altında satış uyarısı sayısı

# Faz 3 — Veresiye özelliğini satış motoruna dönüştür

Süre: 1 hafta

## 4. WhatsApp veresiye ekstresi

İlk sürümde WhatsApp Business API gerekmez. Hazır mesaj bağlantısı kullanılarak çok düşük maliyetle değer üretilebilir.

### İlk sürüm

Müşteri detayına iki buton:

- WhatsApp’tan bakiye gönder
- Hesap ekstresini paylaş/yazdır

Mesaj içeriği:

- Müşteri adı
- İşletme adı
- Güncel borç
- Son ödeme
- Son satış
- İşletme telefon numarası
- İsteğe bağlı ödeme notu

Telefon numarası normalize edilmeli ve mesaj kullanıcıya gösterilip onaylandıktan sonra WhatsApp açılmalı.

### Sonraki küçük geliştirmeler

- Son hatırlatma tarihi
- Vade tarihi
- Ödeme sözü tarihi
- “7 gündür ödeme yok” filtresi
- Hazır mesaj şablonları
- Tahsilat sonrası teşekkür mesajı

Otomatik toplu mesaj ilk sürüme alınmamalı; maliyet, spam ve KVKK riski doğurur.

## 5. Kredi limiti kontrolü

Mevcut limit yalnızca gösteriliyor. Satış sırasında uygulanmalı.

### Davranış

- Limitin %80’inde uyarı
- Limit aşımında satış engeli
- İşletme sahibi için devam etme seçeneği
- Çalışan için yönetici PIN’i
- Limit aşımı denetim kaydı

## Başarı ölçütleri

- Gönderilen WhatsApp ekstre sayısı
- Mesaj gönderiminden sonraki 7 gün içindeki tahsilatlar
- Müşteri başına tahsilat süresi
- Kredi limitini aşan satışların azalması
- Veresiye kullanan işletmelerin aylık aktiflik oranı

# Faz 4 — Satış ekranını günlük kullanımda hızlandır

Süre: 1 hafta

## 6. Para üstü hesaplama

Ödeme ekranında:

- Toplam tutar
- Müşteriden alınan tutar
- Para üstü
- Hızlı nakit butonları: ₺100, ₺200, ₺500, tam tutar

Bu küçük özellik kasiyerin uygulamayı daha profesyonel algılamasını sağlar.

## 7. Bölünmüş ödeme

Örnek:

- ₺500 nakit
- ₺750 kart
- ₺200 veresiye

### Veri modeli

Tek bir `paymentMethod` alanı yerine:

```ts
payments: [
  { method: 'Cash', amount: 500 },
  { method: 'Card', amount: 750 }
];
```

Mevcut satışlar için geriye dönük uyumluluk korunmalı.

## 8. Hızlı ürünler

- Favori ürünler
- Son satılanlar
- Kategori sekmeleri
- Kasiyere özel hızlı ürün düzeni
- Barkodsuz ürünler için büyük dokunmatik butonlar

İlk sürümde sürükle-bırak düzenleyici yerine basit favori işareti yeterlidir.

## Başarı ölçütleri

- Ortalama satış tamamlama süresi
- Sepete ürün ekleme süresi
- Satış iptal oranı
- Kullanıcı başına günlük satış sayısı
- Bölünmüş ödeme kullanılan satış oranı

# Faz 5 — Stok güveni ve günlük operasyon

Süre: 1–1,5 hafta

## 9. Stok hareket geçmişi

Her stok değişiminde ayrı bir kayıt oluşturulmalı:

```ts
{
  companyId,
  inventoryId,
  type: 'SALE',
  quantityDelta: -2,
  stockBefore: 15,
  stockAfter: 13,
  referenceId: saleId,
  userId,
  createdAt
}
```

### İlk sürüm hareketleri

- Ürün açılış stoğu
- Satış
- Satış iptali
- Manuel düzeltme
- Fire
- Sayım farkı

### Kullanıcı ekranı

Ürün detayında:

- Tarih
- İşlem türü
- Giriş/çıkış
- Önceki ve sonraki stok
- İşlemi yapan kişi
- Satış veya işlem bağlantısı

Bu özellik müşterinin uygulamadaki stok rakamına güvenmesini sağlar.

## 10. Kritik stok ve sipariş listesi

Her üründe sabit `10` yerine ayrı kritik stok seviyesi bulunmalı.

### Özellikler

- Kritik stok ekranı
- “Stokta yok” filtresi
- Seçili ürünlerden sipariş listesi oluşturma
- WhatsApp üzerinden tedarikçiye gönderilecek metin
- CSV/PDF çıktısı
- Dashboard uyarısı

İlk sürümde otomatik talep tahmini gerekmez. Önerilen miktar şu basit formülle hesaplanabilir:

```text
Hedef stok − mevcut stok
```

## Başarı ölçütleri

- Stok hareket ekranı kullanımı
- Manuel stok uyuşmazlığı bildirimleri
- Stoksuz ürünle karşılaşılan satış sayısı
- Oluşturulan sipariş listesi sayısı

# Faz 6 — Raporlama ve çıktı

Süre: 1 hafta

## 11. CSV/Excel dışa aktarma

Öncelikli raporlar:

- Ürün ve mevcut stok
- Kritik stok
- Satışlar
- Satış kalemleri
- Müşteriler
- Müşteri bakiyeleri
- Tahsilatlar
- Günlük ciro ve brüt kâr

Filtrelenmiş tablonun dışa aktarılması yeterlidir. İlk sürümde özel rapor tasarım aracı gereksizdir.

## 12. Barkod etiketi

### İlk sürüm

- Code 128
- Ürün adı
- Barkod
- Fiyat
- Etiket adedi
- A4 PDF
- 2–3 hazır şablon

Termal yazıcıya doğrudan komut gönderme sonraki sürüme bırakılabilir; önce tarayıcıdan yazdırılabilir PDF üretilmeli.

## Başarı ölçütleri

- Dışa aktarılan rapor sayısı
- Etiket basan işletme oranı
- Rapor kullanan işletmelerin tutulma oranı

# Faz 7 — Gün sonu ve kasa

Süre: 1–1,5 hafta

Çoklu kasa ve tam vardiya sisteminden önce basit bir gün sonu raporu çıkarılmalı.

## İlk sürüm kapsamı

- Tarih ve çalışan seçimi
- Nakit satış toplamı
- Kart ve QR toplamı
- Veresiye satışlar
- Tahsilatlar
- İptaller
- İndirim toplamı
- Beklenen nakit
- Kullanıcının saydığı nakit
- Kasa farkı
- PDF/yazdırma

Bu rapor mevcut satış ve tahsilat verilerinden üretilebilir. İlk aşamada yeni ve karmaşık bir vardiya altyapısı gerekmez.

## Başarı ölçütleri

- Gün sonu raporu oluşturan işletme oranı
- Haftada en az beş gün rapor kullanan işletmeler
- Birden fazla çalışan davet eden işletme oranı

# Faz 8 — Büyük ama değerli yatırım

Süre: 3–5 hafta

## Tedarikçi ve alış yönetimi

Önceki fazlar kullanımı ve ücretli dönüşümü kanıtladıktan sonra geliştirilmelidir.

### Sıralı kapsam

1. Tedarikçi kartı
2. Tedarikçi bakiye ve hareketleri
3. Basit stok girişi
4. Alış belgesi
5. Alışla birlikte maliyet ve stok güncelleme
6. Vadeli alış ve ödeme
7. Alış iadesi
8. Ortalama maliyet
9. Tedarikçiye göre sipariş önerisi

Bu modül veri modelini ciddi şekilde etkilediği için daha erken geliştirilmesi hızlı dönüş hedefiyle uyuşmaz.

# İlk 30 günlük uygulanabilir takvim

## 1. hafta

- Satış ve stok güvenilirliği düzeltmeleri
- CSV ürün şablonu
- Ürün toplu aktarımı
- Müşteri aktarımı

## 2. hafta

- Ürün maliyeti, KDV, kategori ve kritik stok
- Satış anı maliyet kaydı
- Brüt kâr hesapları
- Kâr dashboard’u

## 3. hafta

- WhatsApp bakiye paylaşımı
- Müşteri ekstresi çıktısı
- Kredi limiti kontrolü
- Limit aşımı için yönetici PIN’i

## 4. hafta

- Para üstü
- Bölünmüş ödeme
- Favori ürünler
- Basit onboarding kontrol listesi
- PostHog dönüşüm hunileri

# Öncelik verilmemesi gerekenler

Kısa vadede bunlara kaynak ayırmazdım:

- Yapay zekâlı talep tahmini
- Kapsamlı sadakat/kampanya motoru
- Pazaryeri entegrasyonları
- Çoklu depo
- Tam ERP/muhasebe
- Plugin sistemi
- Çoklu dil
- Gelişmiş dashboard tasarım değişiklikleri
- WhatsApp Business API ile otomatik toplu mesaj
- Doğrudan termal yazıcı protokolleri
- Özel rapor tasarım aracı

Bunların bazıları değerli olsa da ilk müşteri dönüşümünü daha ucuz özellikler kadar hızlı artırmaz.

# Ticari paketleme önerisi

Geliştirme sırasını fiyatlandırmaya bağlamak dönüşü artırır.

| Paket       | İçerik                                                |
| ----------- | ----------------------------------------------------- |
| Başlangıç   | POS, barkod, stok, temel raporlar                     |
| Esnaf       | Veresiye, WhatsApp ekstre, kâr takibi, Excel aktarımı |
| İşletme     | Çalışanlar, yetkiler, gün sonu, gelişmiş raporlar     |
| Profesyonel | Tedarikçi, alış, çoklu kasa/şube, entegrasyonlar      |

En güçlü ücretli dönüş noktası “Esnaf” paketi olacaktır. Çünkü Excel aktarımı kullanıcıyı içeri alır, kâr takibi işletme sahibine sürekli değer verir, WhatsApp veresiye ise tahsilatı doğrudan iyileştirir.

Net geliştirme sıram:

1. Güvenilir satış ve stok altyapısı
2. Excel/CSV içe aktarma
3. Maliyet ve brüt kâr
4. WhatsApp veresiye ekstresi
5. Kredi limiti kontrolü
6. Para üstü ve bölünmüş ödeme
7. Stok hareketleri
8. Kritik stok ve sipariş listesi
9. Rapor dışa aktarma
10. Barkod etiketi
11. Gün sonu
12. Tedarikçi ve alış yönetimi
