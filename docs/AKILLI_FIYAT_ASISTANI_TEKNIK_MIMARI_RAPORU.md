# Akıllı Fiyat Asistanı Teknik Mimari Raporu

Kısa cevap: Evet, sunucu tarafında çalışan bir katman gerekiyor. Ancak ilk aşamada ayrı bir büyük backend uygulaması, ayrı kullanıcı sistemi veya mikroservis mimarisi kurmanıza gerek yok.

Mevcut Firebase altyapısını koruyup şu iki parçayı ekleyebilirsiniz:

1. Zamanlanmış fiyat toplama işi
2. Fiyatları normalize edip öneri/bildirim üreten servis

React uygulaması fiyat sitelerine doğrudan istek atmamalı. API anahtarları açığa çıkar, CORS sorunları yaşanır, uygulama kapalıyken fiyat kontrolü yapılamaz ve her müşteri aynı ürünü tekrar tekrar sorgulayarak maliyeti artırır.

# Önerdiğim genel mimari

```text
Fiyat kaynakları
API / XML / CSV / izinli scraping
              │
              ▼
      Fiyat Toplama Servisi
      Cloud Function / Cloud Run Job
              │
              ▼
   Doğrulama ve Normalizasyon
 barkod, gramaj, kampanya, aykırı fiyat
              │
              ▼
       Ortak Fiyat Kataloğu
   güncel referans + sınırlı geçmiş
              │
              ▼
      Fiyat Öneri Motoru
 maliyet + piyasa + işletme fiyatı
              │
              ▼
    İşletmeye Özel Uyarılar
              │
              ▼
 React/PWA/Mobil Dijital Stok
```

Burada piyasa fiyatı bütün işletmeler için ortak tutulur. Aynı barkod için her şirket adına ayrı piyasa fiyatı kaydetmezsiniz.

Örneğin Ankara’daki 100 işletmenin hepsinde aynı ayçiçek yağı varsa:

- Piyasa fiyatı: tek kayıt
- Her işletmenin kendi fiyatı ve maliyeti: işletmeye özel kayıt
- Öneri ve bildirim: işletmeye özel kayıt

Bu ayrım veritabanı maliyetini ciddi biçimde azaltır.

# Yeni backend gerekli mi?

## MVP için

Tam bir backend uygulaması gerekmiyor. Firebase projesine `functions` veya `services/price-worker` şeklinde sunucu tarafı kod eklenebilir.

API üzerinden veri alınacaksa:

- Firebase Cloud Functions 2nd gen
- Cloud Scheduler
- Firestore

yeterli olabilir.

Firebase zamanlanmış fonksiyonları cron benzeri programlarla çalıştırabiliyor. Örneğin her gece 03.00 veya altı saatte bir fiyat kontrolü yapılabilir. [Firebase scheduled functions](https://firebase.google.com/docs/reference/functions/firebase-functions.schedule)

## Scraping yapılacaksa

Scraping için Cloud Run Job daha uygun olabilir. Çünkü:

- Playwright/Chromium gibi tarayıcı bağımlılıkları kullanılabilir.
- Uzun süren işler daha rahat çalışır.
- Container belleği ve süresi kontrol edilebilir.
- İş tamamlandıktan sonra servis kapanır.
- Ürünler paralel görevlere bölünebilir.

Cloud Run Job, sürekli açık bir sunucu yerine işi çalıştırıp sonlanan batch süreçleri için tasarlanmıştır. Zamanlanabilir ve ileride paralel görevlere ayrılabilir. [Cloud Run Jobs](https://cloud.google.com/run/docs/create-jobs)

## Önerilen karar

| Veri alma yöntemi           | Kullanılacak altyapı               |
| --------------------------- | ---------------------------------- |
| Belgelenmiş REST API        | Cloud Functions                    |
| XML/CSV ürün feed’i         | Cloud Functions veya Cloud Run Job |
| Basit statik HTML           | Cloud Run Job                      |
| JavaScript ile açılan sayfa | Cloud Run + Playwright             |
| Büyük miktarda scraping     | Ayrı worker + görev kuyruğu        |
| Bildirim oluşturma          | Cloud Functions                    |
| Mobil push gönderme         | Cloud Functions + FCM              |

İlk sürümde API bulunursa Cloud Functions ile başlayın. Scraping kesinleşirse Cloud Run Job ekleyin.

# Backend aynı repoda mı olmalı?

MVP için aynı repoda monorepo şeklinde tutulabilir:

```text
dijital-stok/
├── src/                         # React uygulaması
├── functions/                   # Firebase Functions
│   ├── src/
│   │   ├── price-alerts/
│   │   ├── notifications/
│   │   └── index.ts
│   └── package.json
├── services/
│   └── price-collector/         # Gerekirse Cloud Run worker
│       ├── src/
│       │   ├── adapters/
│       │   ├── normalization/
│       │   └── jobs/
│       ├── Dockerfile
│       └── package.json
└── firestore.rules
```

Başlangıçta yalnızca `functions/` eklenir. Cloud Run gereksinimi oluştuğunda `services/price-collector/` açılır.

# Fiyatları hangi mantıkla bulacağız?

Veri kaynağı tercih sırası şöyle olmalı:

## 1. Lisanslı API

En iyi yöntemdir.

Aranacak özellikler:

- Barkodla sorgulama
- Kaynak/mağaza bilgisi
- Güncelleme tarihi
- Kampanya bilgisi
- Gramaj/adet bilgisi
- Ticari kullanım izni
- Geçmiş fiyat saklama izni
- İstek ve ürün limiti
- SLA veya erişilebilirlik garantisi

API’nin yalnızca çalışıyor olması yeterli değildir. Sözleşmede şu hakların bulunması gerekir:

- Ticari uygulamada gösterme
- Veriyi önbelleğe alma
- Fiyat geçmişi saklama
- Türetilmiş medyan/aralık oluşturma
- Son kullanıcıya kaynak gösterme

## 2. Üretici veya satıcı feed’i

Bazı kaynaklar şunları sağlayabilir:

- XML ürün feed’i
- CSV dosyası
- SFTP aktarımı
- Google Merchant benzeri ürün feed’i
- Bayi ürün kataloğu
- Tedarikçi fiyat listesi

Özellikle esnafın kendi tedarikçilerinden aldığı fiyat listeleri piyasa fiyatından daha değerlidir. Çünkü gerçek maliyeti gösterir.

## 3. Tedarikçi alış faturası

Uzun vadede en güvenilir fiyat sinyallerinden biri:

- Esnaf alış faturasını girer veya yükler.
- Barkod/ürün ile alış maliyeti eşleştirilir.
- Yeni maliyet eski maliyetle karşılaştırılır.
- Marj düşerse uyarı oluşturulur.

Bu yaklaşım harici piyasa verisi olmasa bile çalışır.

## 4. İzinli scraping

Resmî API veya feed yoksa düşünülebilir. Ancak son seçenek olmalı.

Kontrol edilmesi gerekenler:

- Kullanım şartları
- `robots.txt`
- Ticari kullanım kısıtları
- Yeniden yayınlama hakkı
- İstek sıklığı
- Kaynak gösterme gerekliliği
- Oturum veya üyelik gerektirip gerektirmemesi
- Fiyatın konuma göre değişmesi
- Kampanyalı fiyatın koşulları

İzin veya lisans net değilse o kaynak ürünün temel bağımlılığı haline getirilmemeli.

# Site crawling nasıl yapılmalı?

Her site için ayrı bir “adapter” yazılmalı.

```ts
interface PriceSourceAdapter {
  sourceId: string;

  fetchProducts(input: { barcodes: string[] }): Promise<RawPriceObservation[]>;

  normalize(observation: RawPriceObservation): NormalizedPriceObservation | null;
}
```

Örnek adapter’lar:

```text
adapters/
├── licensed-api.adapter.ts
├── retailer-a.adapter.ts
├── retailer-b.adapter.ts
├── supplier-xml.adapter.ts
└── manual-import.adapter.ts
```

Her sitenin HTML yapısını ana fiyat motorunun içine yazmamalısınız. Bir kaynak değiştiğinde yalnızca ilgili adapter bozulmalı.

## Toplayıcının adımları

```text
1. Takip edilen aktif barkodları al
2. Kaynak bazında gruplandır
3. Rate limit uygula
4. Veriyi indir
5. Barkodu doğrula
6. Ürün ve gramajı doğrula
7. Fiyatı normalize et
8. Kampanyalı fiyatı işaretle
9. Önceki değerle karşılaştır
10. Yalnızca gerekli veriyi kaydet
11. Referans medyanı yeniden hesapla
12. Gerekirse uyarı oluştur
```

## Rate limit

Aynı anda binlerce sayfaya istek gönderilmemeli.

Örneğin:

- Kaynak başına saniyede 1–2 istek
- İstekler arasına küçük rastgele gecikme
- HTTP `429` durumunda exponential backoff
- Aynı barkodu aynı gün tekrar sorgulamama
- Başarısız kaynak için circuit breaker
- Maksimum tekrar sayısı
- Kaynak bazında zaman aşımı

İş büyürse Cloud Tasks kullanılabilir. Görev kuyruğu yürütme hızını ve yeniden denemeyi kontrol eder. Firebase’in task queue fonksiyonları Cloud Tasks üzerinden güvenilir sunucu görevleri çalıştırabilir. [Firebase task queue functions](https://firebase.google.com/docs/functions/task-functions)

# Google, Akakçe veya Cimri’yi scrape edelim mi?

İlk tercih olarak önermem.

Arama motoru veya fiyat karşılaştırma sitesi scraping’i:

- HTML değişikliklerinden kolay etkilenir.
- Bot korumalarına takılabilir.
- Sonuçların konuma ve kullanıcıya göre değişmesi mümkündür.
- Kullanım koşulları sorun yaratabilir.
- Barkod bilgisi her üründe bulunmayabilir.
- Farklı satıcıların kargo dahil/hariç fiyatları karışabilir.
- Dijital Stok’un ana özelliği üçüncü tarafın arayüzüne bağımlı hale gelir.

Daha doğru sıra:

1. Resmî/lisanslı API
2. Perakendeci veya tedarikçi feed’i
3. İşletmenin alış maliyetleri
4. Kullanıcının elle bağladığı ürün URL’si
5. İzinli scraping

Kullanıcının belirli bir ürün sayfasını kendisinin eklemesi, tüm siteyi taramaktan daha kontrollü bir ara çözüm olabilir.

# Ürünleri nasıl eşleştireceğiz?

## Birincil anahtar: GTIN/barkod

Global ürün kaydının kimliği barkod olabilir:

```text
globalProducts/8691234567890
```

Ancak barkod tek başına her zaman yeterli değildir. Kaynak verisi şu kontrollerden geçmeli:

- Barkod tam eşleşiyor mu?
- Marka aynı mı?
- Ürün ismi yeterince benzer mi?
- Gramaj aynı mı?
- Paket adedi aynı mı?
- Varyant aynı mı?
- Ürün tekli mi çoklu paket mi?

## Normalize edilmiş birim

Bütün fiyatlar karşılaştırılabilir birime dönüştürülmeli.

Örnek:

```ts
interface ProductUnit {
  amount: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'piece';
  packCount: number;
}
```

Örnek dönüşüm:

```text
900 ml yağ, 81 TL → 90 TL/litre
1 litre yağ, 94 TL → 94 TL/litre
4 × 250 ml yağ, 100 TL → 100 TL/litre
```

Farklı gramajlar aynı ürünmüş gibi doğrudan karşılaştırılmamalı.

# Firestore veri modeli

MVP için ayrı PostgreSQL kurmadan Firestore kullanılabilir.

## 1. Global ürün kataloğu

```text
globalProducts/{barcode}
```

```ts
interface GlobalProduct {
  barcode: string;
  normalizedName: string;
  brand?: string;
  quantity?: number;
  unit?: 'g' | 'kg' | 'ml' | 'l' | 'piece';
  packCount?: number;
  category?: string;
  imageUrl?: string;
  matchConfidence: number;
  updatedAt: string;
}
```

Bu kayıt bütün işletmeler arasında ortaktır.

## 2. En güncel kaynak fiyatları

```text
currentSourcePrices/{barcode_sourceId}
```

```ts
interface CurrentSourcePrice {
  barcode: string;
  sourceId: string;
  price: number;
  unitPrice?: number;
  isCampaign: boolean;
  location?: string;
  observedAt: string;
  sourceUrl?: string;
  contentHash: string;
}
```

Aynı kaynak ve barkod için yeni belge oluşturmak yerine mevcut belge güncellenir.

Böylece:

```text
500 barkod × 7 kaynak = en fazla 3.500 güncel fiyat belgesi
```

Her gün yeni 3.500 belge eklemek yerine aynı belgeler overwrite edilir.

## 3. Güncel referans fiyat

```text
priceReferences/{barcode}
```

```ts
interface PriceReference {
  barcode: string;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  trimmedMean?: number;
  unitMedianPrice?: number;
  regularMedianPrice?: number;
  campaignMedianPrice?: number;
  sourceCount: number;
  confidenceScore: number;
  calculatedAt: string;
  previousMedianPrice?: number;
  changePercentage?: number;
}
```

React uygulaması bütün ham fiyatları okumak yerine çoğunlukla bu tek belgeyi okur.

## 4. Günlük fiyat geçmişi

```text
priceHistory/{barcode}/days/{YYYY-MM-DD}
```

```ts
interface DailyPriceSummary {
  barcode: string;
  date: string;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  sourceCount: number;
  changePercentage: number;
  expireAt?: Timestamp;
}
```

Her kaynak için her sorguyu saklamak yerine barkod başına günlük tek özet tutulur.

## 5. İşletmenin takip ettiği ürünler

```text
companyTrackedProducts/{companyId_barcode}
```

```ts
interface CompanyTrackedProduct {
  companyId: string;
  inventoryId: string;
  barcode: string;
  currentSellingPrice: number;
  currentCost?: number;
  targetMargin?: number;
  minimumMargin?: number;
  marketAlertThreshold?: number;
  isPriceTrackingEnabled: boolean;
  lastCheckedAt?: string;
}
```

## 6. İşletmeye özel uyarılar

```text
priceAlerts/{alertId}
```

```ts
interface PriceAlert {
  companyId: string;
  inventoryId: string;
  barcode: string;
  type: 'LOW_MARGIN' | 'BELOW_REFERENCE' | 'ABOVE_REFERENCE' | 'COST_INCREASE';
  currentPrice: number;
  currentCost?: number;
  referenceMedian?: number;
  recommendedPrice?: number;
  confidenceScore: number;
  status: 'OPEN' | 'APPLIED' | 'DISMISSED' | 'SNOOZED';
  createdAt: string;
  expiresAt: Timestamp;
}
```

Uyarı yalnızca şirket tarafından okunabilir. Global ürün ve referans fiyatları istemcide salt okunur olmalı; yazma yalnızca Admin SDK kullanan backend tarafından yapılmalı.

# Ortalama nasıl hesaplanmalı?

Aritmetik ortalama kullanmak yerine medyan tercih edin.

Örnek fiyatlar:

```text
49,90
50,00
51,50
52,00
89,90
```

Aritmetik ortalama yüksek uç değerden etkilenir. Medyan ise 51,50 TL olur.

## Önerilen hesap

1. Geçersiz fiyatları çıkar.
2. Gramajı normalize et.
3. Eski verileri çıkar.
4. Kampanyalı ve normal fiyatı ayır.
5. IQR veya benzeri yöntemle aykırı değerleri çıkar.
6. Medyan hesapla.
7. Kaynak sayısı ve veri yaşına göre güven puanı üret.

Örnek güven skoru:

```ts
const confidence = sourceCoverageScore * 0.4 + freshnessScore * 0.25 + productMatchScore * 0.25 + priceConsistencyScore * 0.1;
```

## Bildirim şartı

```text
Kaynak sayısı >= 3
VE güven skoru >= 0,75
VE veri yaşı <= 48 saat
VE fiyat farkı >= %5
VE aynı ürün için son 7 günde bildirim gönderilmedi
```

Bunlara ek olarak maliyet biliniyorsa:

```text
mevcut brüt marj < işletmenin minimum marjı
```

durumu piyasa fiyatından daha yüksek öncelik taşımalı.

# Veritabanı nasıl şişmez?

En önemli karar ham gözlemleri sonsuza kadar saklamamaktır.

## 1. Yalnızca takip edilen barkodları toplayın

Türkiye’deki bütün ürünleri her gün taramayın.

Sistemde en az bir işletmenin aktif olarak takip ettiği barkodları alın:

```text
Takip edilmeyen ürün → taranmaz
Birçok işletmede bulunan ürün → yalnızca bir kez taranır
```

Örnek:

```text
10 işletme × 500 ürün = teorik olarak 5.000 ürün
Ortak barkodlardan sonra benzersiz ürün = yaklaşık 2.000–3.000
```

Toplayıcı yalnızca benzersiz barkodları sorgular.

## 2. Güncel veriyi overwrite edin

Şunu yapmayın:

```text
observations/{randomId}
observations/{randomId}
observations/{randomId}
```

Her sorguda yeni kayıt oluşur ve koleksiyon hızla büyür.

Bunun yerine:

```text
currentSourcePrices/{barcode_sourceId}
```

belgesini güncelleyin.

## 3. Yalnızca değişiklik varsa yazın

Yeni fiyat öncekiyle aynıysa Firestore’a tekrar yazmayın.

```ts
if (previous.contentHash === current.contentHash && previous.price === current.price) {
  return;
}
```

Bu, yazma maliyetini ciddi biçimde azaltır.

## 4. Ham veriyi geçici saklayın

Kaynağın döndürdüğü büyük HTML veya JSON cevabını Firestore’a koymayın.

Gerekirse:

- Cloud Storage’da gzip olarak saklayın.
- Yalnızca hata ayıklama için tutun.
- 3–7 gün sonra otomatik silin.
- Başarılı cevapları hiç saklamayıp yalnızca parse edilmiş sonucu tutun.
- Hatalı parse edilen cevapları daha uzun saklayın.

## 5. Günlük özet tutun

Her kaynak sorgusunu geçmiş olarak saklamak yerine:

```text
Bir barkod için:
- Güncel kaynak fiyatları
- Günlük tek referans özeti
```

saklayın.

Örneğin:

```text
10.000 ürün × 365 gün = 3,65 milyon günlük özet
```

Buna karşılık:

```text
10.000 ürün × 7 kaynak × günde 4 kontrol × 365
= 102,2 milyon ham gözlem
```

Aradaki fark çok büyüktür.

## 6. Yalnızca değişen günleri saklayın

Daha agresif optimizasyon:

- Medyan fiyat değişmediyse yeni günlük belge oluşturma.
- Kaynak sayısı veya güven puanı anlamlı değişmediyse yazma.
- Son kayıtta geçerli olduğu tarih aralığını uzat.

```ts
interface PricePeriod {
  barcode: string;
  medianPrice: number;
  validFrom: string;
  validUntil: string;
}
```

Böylece fiyat 20 gün değişmediyse 20 kayıt yerine tek dönem kaydı tutulabilir. Ancak sorgulama biraz daha karmaşık olur. İlk MVP’de günlük özet daha basittir.

## 7. Saklama katmanları oluşturun

Önerilen politika:

| Veri                      |    Saklama süresi |
| ------------------------- | ----------------: |
| Ham HTML/JSON             |           3–7 gün |
| Kaynak bazlı güncel fiyat | Sürekli overwrite |
| Günlük fiyat özeti        |            90 gün |
| Haftalık fiyat özeti      |           1–2 yıl |
| Aylık fiyat özeti         |         Uzun süre |
| Açık bildirimler          | Sonuçlanana kadar |
| Kapatılmış bildirimler    |        90–180 gün |

90 günden eski günlük veriler haftalık özetlere dönüştürülebilir:

```text
İlk 90 gün: günlük
3–12 ay: haftalık
12 ay sonrası: aylık
```

## 8. Firestore TTL kullanın

Geçici gözlem ve eski uyarılara `expireAt` alanı eklenebilir. Firestore TTL politikası bu kayıtları otomatik temizler. Firebase’e göre TTL, belirlenen zaman alanına göre eski belgeleri otomatik siler; silme işlemleri genellikle süresi dolduktan sonraki 24 saat içinde gerçekleşir. TTL silmeleri ücretli belge silme işlemi olarak sayılır. [Firestore TTL](https://firebase.google.com/docs/firestore/ttl)

Örnek:

```ts
{
  barcode: '869...',
  rawPrice: 49.90,
  observedAt: Timestamp.now(),
  expireAt: Timestamp.fromDate(
    dayjs().add(7, 'day').toDate()
  )
}
```

TTL alanı için gereksiz tek alan indeksini kapatmak da maliyet ve hotspot riskini azaltabilir.

## 9. Firestore indekslerini sınırlayın

Ham ve geçici koleksiyonlarda şu alanların çoğu için indeks gerekmez:

- `sourceUrl`
- `rawName`
- `rawPayload`
- `contentHash`
- `expireAt`
- Büyük metin alanları

Gereksiz indeksler:

- Depolamayı artırır.
- Her yazmayı pahalılaştırır.
- Toplu yazma hızını düşürür.

Yalnızca gerçekten sorgulanacak alanları indeksleyin.

## 10. React’te sürekli listener kullanmayın

Tüm fiyat geçmişini `onSnapshot` ile dinlemeyin.

Uygulama:

- Açık uyarıları dinleyebilir.
- Ürün detayına girildiğinde fiyat geçmişini isteyebilir.
- Dashboard için önceden hesaplanmış özet okuyabilir.
- Referans fiyatları günde birkaç kez yenileyebilir.

Her ürünün bütün geçmişini gerçek zamanlı dinlemek gereksiz Firestore okumasına neden olur.

# Firestore yeterli mi?

## MVP ve ilk müşteriler için

Evet. Şu veriler Firestore’da rahatça tutulabilir:

- Global ürün bilgisi
- Güncel kaynak fiyatları
- Güncel referans
- 90 günlük özet geçmiş
- İşletmeye özel takip ayarları
- Uyarılar

## Ne zaman başka veritabanı düşünülmeli?

Şu seviyelerde yeniden değerlendirin:

- On binlerce aktif barkod
- Çok sayıda kaynak
- Saatlik veya daha sık fiyat toplama
- Milyonlarca tarihsel gözlem
- Gelişmiş zaman serisi analizi
- Kaynaklar arası büyük raporlar
- Makine öğrenmesi eğitimi

Bu aşamada:

- İşletimsel güncel veri: Firestore
- Detaylı zaman serisi: PostgreSQL/TimescaleDB
- Büyük analitik arşiv: BigQuery
- Ham dosya: Cloud Storage

şeklinde ayrılabilir.

İlk günden PostgreSQL veya BigQuery kurmak gerekli değil.

# Maliyet kontrolü için en önemli optimizasyon

Toplama sıklığını ürün bazında dinamik hale getirin.

Her ürün aynı sıklıkta kontrol edilmemeli.

```text
Çok satan ve fiyatı sık değişen ürün → günde 2 kez
Orta hızda ürün → günde 1 kez
Az satan ürün → haftada 2 kez
30 gündür satılmayan ürün → haftada 1 kez
Takip dışı ürün → hiç sorgulama
```

Örnek öncelik skoru:

```ts
priority = salesVelocityScore * 0.35 + recentPriceVolatility * 0.25 + marginRiskScore * 0.25 + stockValueScore * 0.15;
```

Bu yöntem hem API hem scraping maliyetini düşürür.

# Önerilen MVP uygulama planı

## Faz 1 — Harici fiyat olmadan

Önce ürünlere ekleyin:

- Alış maliyeti
- Hedef marj
- Minimum marj
- Son maliyet değişimi
- Önerilen satış fiyatı
- Düşük marj uyarısı

Bu kısım tamamen mevcut Firestore verileriyle çalışır.

## Faz 2 — Manuel referans fiyat

- Yönetici belirli bir ürün için referans fiyat girebilir.
- Sistem fiyat karşılaştırma ve bildirim mantığını test eder.
- Kullanıcıların önerileri kabul edip etmediği ölçülür.

## Faz 3 — Tek lisanslı veri kaynağı

- 3–5 pilot market
- En fazla 100 benzersiz barkod
- Günde bir kontrol
- En güncel fiyat overwrite
- Günlük tek özet
- Manuel onaylı fiyat değişimi

## Faz 4 — Çoklu kaynak ve medyan

- En az üç kaynak
- Kampanya ayrımı
- Aykırı değer temizliği
- Medyan fiyat
- Güven skoru
- Günlük fiyat kontrol listesi

## Faz 5 — Otomatik bildirim

- Günlük uygulama içi özet
- İsteğe bağlı push
- Fiyat güncelleme ekranı
- Toplu seçim
- Raf etiketi kuyruğu
- Bildirimi erteleme veya kapatma

# Net teknik önerim

İlk sürüm için:

- Mevcut React/Firebase uygulamasını koruyun.
- Firebase Functions altında fiyat öneri ve bildirim motoru oluşturun.
- Lisanslı API varsa zamanlanmış Cloud Function kullanın.
- Scraping gerekiyorsa ayrı bir Cloud Run Job ekleyin.
- Yalnızca aktif olarak takip edilen benzersiz barkodları sorgulayın.
- Aynı fiyatı şirket başına çoğaltmayın.
- Kaynak başına yalnızca güncel fiyatı overwrite edin.
- Barkod başına günlük tek medyan özet saklayın.
- Eski günlük özetleri 90 gün sonra haftalık kayda dönüştürün veya TTL ile silin.
- Ham HTML’yi Firestore’da tutmayın.
- Fiyat değişmediyse Firestore’a yazmayın.
- Uygulamada otomatik fiyat değişikliği yapmayın; kullanıcı onayı isteyin.
- İlk etapta 3–5 işletme ve 50–100 barkodla deneyin.

En doğru başlangıç, scraping altyapısını hemen kurmak değil; önce güvenilir ve ticari kullanıma izin veren veri kaynağı bulmaktır. Veri kaynağı kesinleşmeden kapsamlı backend yazmak, projenin en riskli kısmını çözmeden maliyet üretir.
