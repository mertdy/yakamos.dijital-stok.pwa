# Akıllı Fiyat Asistanı Uygulanabilirlik Raporu

Evet, fikir uygulanabilir ve özellikle yüksek fiyat değişimi yaşayan market/büfe segmentinde esnafı ciddi biçimde cezbedebilir. Hatta doğru uygulanırsa Dijital Stok’un en güçlü farklılaştırıcı özelliklerinden biri olabilir.

Ancak özelliği “piyasadaki ortalama fiyatı bulup otomatik zam önerme” şeklinde değil, “fiyat güncelliği ve kâr koruma asistanı” olarak tasarlamanızı öneririm. Çünkü ortalama piyasa fiyatı her zaman esnaf için doğru satış fiyatı değildir.

# Neden ilgi çekebilir?

Küçük esnafın gerçek problemleri şunlar:

- Binlerce ürünün fiyatını takip edememek
- Tedarikçiden gelen zammı raf fiyatına geç yansıtmak
- Eski maliyet veya satış fiyatıyla zararına satış yapmak
- Çalışanın eski fiyatla satış yaptığını geç fark etmek
- Rakiplerden gereksiz derecede pahalı veya ucuz kalmak
- Raf etiketi ile kasa fiyatının farklılaşması
- Ürünün ne zaman ve ne kadar zamlandığını hatırlayamamak

Bu yüzden şu bildirim anlaşılır ve değerlidir:

> “Bu ürünün referans piyasa fiyatı son 14 günde 44,90 TL’den 52,50 TL’ye yükseldi. Sizin satış fiyatınız 44,90 TL. Fiyatınızı gözden geçirmek ister misiniz?”

Bu mesaj “grafik gösteren yazılım” değil, doğrudan para kaybını önleyen bir araç hissi verir.

# En kritik konu: fiyat verisi

Bu fikrin geliştirme tarafı nispeten kolaydır. Zor ve maliyetli olan kısmı güncel, doğru ve yasal olarak kullanılabilir fiyat verisidir.

Türkiye’de TÜBİTAK tarafından işletilen Market Fiyatı platformu, yedi zincir markette yaklaşık 50 bin ürünün güncel fiyatlarını karşılaştırıyor. Kaynaklar arasında A101, BİM, CarrefourSA, Hakmar, Migros, Tarım Kredi ve ŞOK bulunuyor. Bu, özelliğin veri açısından mümkün olduğuna dair güçlü bir kanıt. [TÜBİTAK Market Fiyatı duyurusu](https://tubitak.gov.tr/tr/haber/zincir-market-fiyatlarina-aninda-erisimin-onu-acildi)

Fakat burada önemli bir ayrım var:

- Verilerin web sitesinde herkese açık olması, ticari bir SaaS içinde otomatik ve toplu kullanım hakkı bulunduğu anlamına gelmez.
- Herkese açık, belgelenmiş bir ticari API ve kullanım lisansı olup olmadığı ayrıca doğrulanmalı.
- Siteyi izinsiz kazımak kırılgan, sürdürülemez ve hukuki açıdan riskli olabilir.
- Üçüncü taraf fiyat API’leri mevcut; fakat kapsam, güncellik, süreklilik ve veri lisansları sözleşmeyle doğrulanmadan temel ürün bağımlılığı haline getirilmemeli.

Dolayısıyla öncelikle TÜBİTAK veya lisanslı bir veri sağlayıcıyla resmi veri erişimi görüşülmeli.

# “Ortalama piyasa fiyatı” neden tek başına riskli?

Aynı ürünün fiyatı şu nedenlerle değişebilir:

- Şehir ve mağaza konumu
- Zincir market kampanyası
- Sadakat kartı fiyatı
- Online mağaza ile fiziksel mağaza farkı
- Gramaj, adet veya ambalaj değişikliği
- Eski ve yeni barkod
- KDV dahil/hariç veri
- Çoklu paket
- Kargo dahil çevrim içi fiyat
- Bölgesel dağıtım maliyeti
- Zincir marketin zararına kampanyası
- Yerel esnafın satın alma maliyetinin daha yüksek olması

Örneğin büyük zincir bir ürünü 39,90 TL’ye kampanyalı satarken küçük esnaf aynı ürünü 41 TL’ye satın alıyor olabilir. Bu durumda zincir market fiyatını “doğru piyasa fiyatı” olarak göstermek yanıltıcı olur.

Bu nedenle kullanıcıya tek bir sayı vermek yerine şunlar gösterilmeli:

- Medyan fiyat
- En düşük fiyat
- En yüksek fiyat
- Kaç kaynaktan veri alındığı
- Fiyatların güncellenme tarihi
- Kampanyalı fiyatların bulunup bulunmadığı
- Esnafın fiyatının aralık içindeki konumu
- Gramaj veya birim fiyat karşılaştırması
- Veri güven skoru

Örnek:

> Referans fiyat aralığı: 47,50–54,90 TL  
> Medyan fiyat: 51,90 TL  
> Sizin fiyatınız: 44,90 TL  
> Son güncelleme: Bugün  
> 6 mağaza fiyatı karşılaştırıldı.

“Piyasa ortalaması kesin olarak budur” yerine “referans fiyat aralığı” demek daha doğru ve güven vericidir.

# En doğru ürün yaklaşımı

Özelliği üç ayrı sinyalin birleşimi olarak tasarlayın.

## 1. Maliyet değişimi

En güvenilir sinyal budur.

Esnaf ürünü yeniden satın aldığında yeni alış maliyeti girer:

- Eski maliyet: 35 TL
- Yeni maliyet: 42 TL
- Satış fiyatı: 45 TL
- Yeni brüt marj: %6,7

Sistem şunu söyler:

> “Bu ürünün alış maliyeti %20 arttı. Mevcut satış fiyatıyla brüt marjınız %6,7’ye düştü. %20 hedef marj için önerilen satış fiyatı 52,50 TL.”

Bu hesap harici piyasa verisi gerektirmez ve doğrudan işletmenin gerçek kârını korur.

## 2. Referans piyasa fiyatı

Harici kaynaklardan alınır:

> “Benzer satış noktalarında medyan fiyat 51,90 TL.”

Bu kararın bağlamını sağlar fakat tek başına fiyat belirlememelidir.

## 3. Satış davranışı

Dijital Stok’un kendi verisinden hesaplanır:

- Son satış tarihi
- Satış hızı
- Stokta kalma süresi
- Fiyat değişikliğinden sonra satış düşüşü
- Ürünün işletmedeki kârlılığı

Örneğin:

> “Bu ürün piyasanın %12 altında fakat son 30 günde yalnızca iki kez satılmış. Fiyat artışı önerisi düşük güvenle oluşturuldu.”

Bu üç sinyal birlikte kullanıldığında özellik çok daha değerli hale gelir:

```text
Alış maliyeti + referans piyasa fiyatı + işletmenin satış hızı
                         ↓
              güvenli fiyat önerisi
```

# Önerilen kullanıcı deneyimi

## Yeni ürün eklerken

Barkod okutulduğunda:

- Ürün adı ve görsel
- Referans fiyat aralığı
- Medyan fiyat
- Esnafın girdiği maliyet
- Hedef kâr marjı
- Önerilen satış fiyatı

Örnek:

> Piyasa referansı: 47,50–54,90 TL  
> Alış maliyetiniz: 40 TL  
> Hedef marjınız: %20  
> Önerilen fiyat: 50 TL

Butonlar:

- Önerilen fiyatı kullan
- Kendi fiyatımı gir
- Bu ürün için fiyat takibi aç

## Mevcut ürünlerde

Ürün kartında:

- Mevcut fiyat
- Referans medyan
- Fiyat farkı yüzdesi
- Son kontrol tarihi
- Son 30 günlük referans fiyat grafiği
- Maliyet ve brüt marj

## Bildirim örneği

> Fiyat kontrolü öneriliyor  
> 1 L Ayçiçek Yağı’nın referans medyan fiyatı son 7 günde %11 yükselerek 89,90 TL oldu. Sizin fiyatınız 79,90 TL. Mevcut maliyetinize göre brüt marjınız %5’e düştü.

Eylemler:

- Fiyatı güncelle
- Detayları göster
- 7 gün sonra hatırlat
- Bu ürünü takip etme

## Toplu fiyat güncelleme

Tek tek bildirim yerine günlük bir özet daha faydalı olabilir:

> 18 ürününüz fiyat kontrolü bekliyor  
> Tahmini düşük fiyat farkı: 1.840 TL/ay

Ürünler şu şekilde gruplanabilir:

- Muhtemelen zararına satılanlar
- Piyasanın belirgin altında kalanlar
- Piyasanın belirgin üstünde kalanlar
- Uzun süredir fiyatı güncellenmeyenler
- Maliyeti değişenler

Esnaf ürünleri seçip toplu güncelleyebilmeli. Ancak her değişikliği onaylamalı; sistem fiyatı kendiliğinden değiştirmemeli.

# Bildirimlerin rahatsız edici olmaması için

Yüksek enflasyon nedeniyle yüzlerce ürün aynı anda uyarı oluşturabilir. Her fiyat değişiminde push gönderirseniz kullanıcı kısa sürede bildirimleri kapatır.

Önerilen kurallar:

- Değişim %3–5 altındaysa bildirim gönderme
- En az 3 güvenilir kaynak gerektir
- Kampanya kaynaklı kısa değişimleri filtrele
- Aynı ürün için 7 gün içinde tekrar bildirim gönderme
- Kritik ürünleri anlık, diğerlerini günlük özetle gönder
- Kullanıcının takip edeceği kategorileri seçmesine izin ver
- “Sadece marjım %10’un altına düşerse bildir” ayarı sun
- Sessiz saatler belirle
- Bildirim başına kaynak ve tarih göster

En iyi bildirim tetikleyicisi yalnızca “piyasa yükseldi” olmamalı:

```text
Referans piyasa fiyatı yükseldi
VEYA alış maliyeti yükseldi
VE kullanıcının fiyatı anlamlı şekilde geride kaldı
VE veri güveni yeterli
```

# Ürün eşleştirme problemi

Barkod, paketli market ürünlerinde büyük avantaj sağlar. Ancak şu durumlarda sorun çıkabilir:

- Barkod değişmiş olabilir.
- Aynı ürün farklı gramajlarda bulunabilir.
- Çoklu paket ile tek ürün karışabilir.
- Kırtasiye ürünlerinde barkod veri kapsamı zayıf olabilir.
- Yerel veya markasız ürünlerin piyasa verisi olmayabilir.
- Meyve, sebze ve açık ürünlerde barkod standart olmayabilir.

Bu nedenle eşleştirme önceliği şöyle olmalı:

1. Tam barkod eşleşmesi
2. Marka + ürün adı + gramaj
3. Kullanıcı tarafından doğrulanmış eşleşme
4. Benzer ürün/kategori karşılaştırması

Tam eşleşme yoksa “aynı ürünün piyasa fiyatı” denmemeli. Bunun yerine:

> “Benzer 1 kg toz şeker ürünlerinde referans fiyat aralığı…”

# Hangi sektörlerde daha iyi çalışır?

## Çok uygun

- Market
- Bakkal
- Büfe
- Tekel
- Temizlik ürünleri satan işletmeler
- Petshop
- Paketli gıda satan işletmeler
- Kozmetik ve kişisel bakım
- Bebek ürünleri

## Orta uygunluk

- Kırtasiye
- Hırdavat
- Züccaciye
- Oyuncak
- Yedek parça

Bu sektörlerde çevrim içi fiyatlar bulunabilir fakat ürün varyantı ve barkod eşleştirmesi daha zor olur.

## Zayıf uygunluk

- El yapımı ürün
- Markasız ürün
- Hizmet
- Açık ürün
- Bölgesel veya özel üretim
- İşletmeye özel paket

İlk pilot market ve bakkal ürünleriyle yapılmalı. Kırtasiye aynı anda kapsanmaya çalışılırsa veri kalitesi problemi büyüyebilir.

# MVP’ye doğrudan eklenmeli mi?

Ana MVP’nin zorunlu parçası olarak geliştirmem. Önce küçük ve kontrollü bir “fiyat asistanı beta” olarak test ederim.

Çünkü ana MVP’nin satılabilirliği şunlara bağlıdır:

- Satışın hızlı ve güvenilir olması
- Stokların doğru düşmesi
- Veresiye takibi
- Ürünlerin kolay aktarılması
- İşletme sahibinin telefondan kontrol edebilmesi

Fiyat asistanı ise müşteri ediniminde çok güçlü bir vitrin özelliğidir fakat harici veri bağımlılığı taşır. Ana POS’un çalışmasını bu veriye bağımlı hale getirmemek gerekir.

# En düşük maliyetli doğrulama planı

## Aşama 1 — “Sihirbazlık yapmadan” test

Süre: 1 hafta

Harici fiyat API’si geliştirmeden 10–15 esnafla konsept testi yapın.

Gösterilecek basit prototip:

> “42 ürününüzün fiyatı referans piyasanın altında kaldı. Bunları incelemek ister misiniz?”

Sorulacak sorular:

- Böyle bir ekranı haftada kaç kez kullanırdınız?
- Hangi fiyat kaynaklarına güvenirsiniz?
- Zincir market fiyatını dikkate alır mısınız?
- Maliyet değişimi mi, piyasa fiyatı mı daha önemlidir?
- Böyle bir özellik için aylık ne kadar fazla öderdiniz?
- Fiyatların otomatik mi, onaylı mı değişmesini istersiniz?

“Güzel fikir” cevabı yeterli değildir. Kullanıcıdan ücretli beta veya ön sipariş talep edilmelidir.

## Aşama 2 — 50–100 ürünlük kontrollü pilot

Süre: 2–3 hafta

- 3–5 market
- Her markette en çok satan 50–100 paketli ürün
- Tam barkod eşleşmesi
- Fiyatlar günde bir kez güncellenir
- Tek kaynak yerine en az 3 fiyat
- Medyan ve fiyat aralığı hesaplanır
- Kullanıcı bütün değişiklikleri onaylar
- Yanlış öneriler ayrıca işaretlenir

Bu aşamada ölçülecekler:

- Eşleştirilebilen barkod oranı
- Yanlış eşleşme oranı
- Önerilerin kabul oranı
- Kabul edilen fiyat artışının tahmini etkisi
- Kullanıcının ekranı tekrar kullanma oranı
- Bildirimlerin kapatılma oranı

## Aşama 3 — Maliyet ve marj ile birleştirme

Pilot olumluysa:

- Ürün maliyeti
- Hedef marj
- Minimum marj
- Satış hızı
- Piyasa medyanı

birlikte kullanılarak güven skorlu öneri üretilir.

# Teknik mimari önerisi

Fiyat sorguları doğrudan React uygulamasından üçüncü taraf servise yapılmamalı.

```text
Fiyat sağlayıcıları
        ↓
Sunucu tarafı fiyat toplama servisi
        ↓
Normalizasyon ve ürün eşleştirme
        ↓
Fiyat geçmişi veritabanı
        ↓
Uyarı ve öneri motoru
        ↓
Dijital Stok uygulaması
```

Gerekli veri yapıları:

```ts
interface MarketPriceObservation {
  barcode: string;
  source: string;
  price: number;
  unitPrice?: number;
  observedAt: string;
  isCampaign?: boolean;
  location?: string;
}

interface ProductPriceReference {
  barcode: string;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  sourceCount: number;
  confidenceScore: number;
  calculatedAt: string;
}

interface PriceRecommendation {
  inventoryId: string;
  currentPrice: number;
  currentCost?: number;
  referenceMedian: number;
  recommendedPrice?: number;
  reason: 'LOW_MARGIN' | 'MARKET_INCREASE' | 'MARKET_DECREASE';
  confidenceScore: number;
  createdAt: string;
}
```

Fiyat verisi her uygulama açılışında sorgulanmamalı. Merkezi olarak günde bir veya birkaç kez güncellenip tüm müşteriler arasında önbellekten paylaşılmalı. Böylece API maliyeti ciddi biçimde düşer.

# Rekabet ve hukuki hassasiyet

Kamuya açık fiyatları göstermek ile bağımsız esnafların fiyatlarını merkezi olarak toplayıp fiyat önerisi üretmek aynı risk düzeyinde değildir.

Dikkat edilmesi gerekenler:

- Veri sağlayıcının ticari kullanım lisansı
- Kaynak gösterme zorunluluğu
- Verinin saklanma süresi
- Web scraping kullanım şartları
- Esnaftan alınan fiyatların anonimleştirilmesi
- Rakip işletmeler arasında hassas fiyat verisi paylaşımı
- Otomatik fiyat koordinasyonu veya benzer fiyatlara yönlendirme riski
- “Tavsiye edilen fiyat” ifadesinin kullanıcı tarafından serbestçe reddedilebilir olması

Sistem fiyatları otomatik eşitlememeli ve “piyasadaki herkes bu fiyata satıyor, siz de yükseltin” gibi bir dil kullanmamalıdır. Özellikle esnaf verilerinden bölgesel fiyat önerisi üretilecekse rekabet hukuku konusunda uzman görüşü alınması doğru olur.

# Fiyatlandırmaya etkisi

Bu özellik doğrulanırsa ücretsiz veya en ucuz pakete koymamanızı öneririm.

Örnek:

| Paket | Aylık fiyat |
|---|---:|
| Dijital Stok Esnaf | 399 TL + KDV |
| Dijital Stok Akıllı Fiyat | 549–599 TL + KDV |

Akıllı Fiyat paketinde:

- Günlük fiyat kontrolü
- Maliyet ve marj uyarıları
- Referans fiyat aralığı
- Fiyat geçmişi
- Toplu fiyat güncelleme
- Fiyatı değişen ürünlerin etiket listesi
- Günlük fiyat kontrol özeti

Alternatif olarak özellik eklentisi sunulabilir:

- Fiyat Asistanı: **+149–199 TL/ay**
- İlk 100 ürün dahil
- Daha yüksek ürün sayısı için kademeli fiyat

Ancak ürün başına çok karmaşık ücretlendirme küçük esnafı rahatsız edebilir. “Aylık sabit fiyat, en fazla 1.000 takipli ürün” daha anlaşılırdır.

# Satış mesajı

“Piyasa fiyatlarını takip ediyoruz” teknik ve zayıf kalır. Daha güçlü mesaj:

> Zamları kaçırmayın, eski fiyatla satış yapmayın.

Alternatifler:

> Alış maliyetiniz veya piyasa fiyatı değiştiğinde Dijital Stok sizi uyarır.

> Hangi ürünün fiyatını güncellemeniz gerektiğini her sabah görün.

> Binlerce etiketi tek tek kontrol etmeyin; geride kalan fiyatları Dijital Stok bulsun.

> Kârınızı eriten eski fiyatları satış yapmadan önce fark edin.

# Net değerlendirmem

- Müşteriyi cezbetme potansiyeli: **çok yüksek**
- Market/bakkal uygunluğu: **çok yüksek**
- Kırtasiye uygunluğu: **orta**
- Teknik arayüz geliştirme zorluğu: **düşük-orta**
- Güvenilir veri edinme zorluğu: **yüksek**
- Hukuki ve lisans riski: **orta-yüksek**
- Premium paket oluşturma potansiyeli: **yüksek**
- Ana MVP için zorunluluk: **hayır**
- MVP sonrasında en güçlü farklılaştırıcı adaylarından biri: **evet**

Önce maliyet ve marj uyarısını geliştirmek en güvenli adımdır; çünkü işletmenin kendi verisine dayanır. Aynı anda 3–5 Ankara marketinde, en çok satılan 50–100 barkodlu ürünle referans piyasa fiyatı beta testi yapılabilir. Veri doğruluğu ve öneri kabul oranı yeterli çıkarsa “Akıllı Fiyat Asistanı” adıyla ücretli üst pakete dönüştürülebilir.
