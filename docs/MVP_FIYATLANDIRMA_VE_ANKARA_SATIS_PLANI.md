# Dijital Stok MVP, Fiyatlandırma ve Ankara Satış Planı

Hedef kitle 1–5 çalışanlı market, kırtasiye, büfe ve benzeri küçük esnaf olacaksa MVP’nin ana vaadi şu olmalı:

> “Barkodu okut, hızlı sat; stok ve veresiyeyi telefondan takip et. İnternet kesilse de satışın durmasın.”

Bu aşamada tam ERP, e-Fatura, tedarikçi yönetimi veya pazaryeri entegrasyonu geliştirmek MVP’yi gereksiz yere geciktirir.

# 1. Satılabilir MVP’de bulunması gereken özellikler

## A. Satış için vazgeçilmez özellikler

Bunlar olmadan market veya kırtasiye uygulamayı günlük kasasında kullanmak istemez.

### Hızlı barkodlu satış

- USB/Bluetooth barkod okuyucu
- Telefon kamerasıyla barkod okuma
- Ürün adı, barkod veya SKU ile hızlı arama
- Barkod okutulduğunda ürünü doğrudan sepete ekleme
- Adet artırma/azaltma
- Sepetten ürün çıkarma
- Satır ve sepet indirimi
- Barkodsuz ürün için hızlı satış
- Satış tamamlanınca stoktan otomatik düşme

Mevcut projede bunların önemli bölümü zaten var.

### Temel ödeme işlemleri

- Nakit
- Kart
- QR
- Veresiye
- Müşteriden alınan tutar
- Otomatik para üstü hesabı
- Satış iptali
- Fiş yazdırma veya paylaşma

Bölünmüş ödeme faydalıdır fakat ilk pilot için zorunlu değildir. İlk 10 müşteriden talep gelirse hemen eklenebilir.

### Güvenilir stok

- Ürün ekleme ve düzenleme
- Barkod, isim, stok ve satış fiyatı
- Kategori
- Kritik stok seviyesi
- Stokta kalmayan ürünler
- Satış iptalinde stok iadesi
- Negatif stok uyarısı
- Basit stok düzeltme
- Ürün arşivleme

“Stok neden değişti?” sorusu pilotlarda sık gelirse stok hareket geçmişi MVP+1’e alınmalı.

## B. Esnafı ürüne bağlayacak özellikler

### Veresiye ve tahsilat

Bu, Dijital Stok’un küçük esnaf için en güçlü farklılaştırıcısı olabilir.

- Müşteri kaydı
- Telefon numarası
- Mevcut borç
- Veresiye limiti
- Veresiye satış
- Tahsilat girişi
- Müşteri hesap ekstresi
- WhatsApp’tan bakiye paylaşımı
- Limit aşımında uyarı

Özellikle market, büfe ve mahalle esnafında “POS + veresiye” tek başına güçlü bir satın alma nedenidir.

### Patron ekranı

İşletme sahibi dükkânda olmasa da şunları telefonundan görmek ister:

- Bugünkü ciro
- Bugünkü satış sayısı
- Nakit/kart/veresiye dağılımı
- Toplam müşteri borcu
- Kritik stoklar
- En çok satılan ürünler
- Hangi çalışanın ne kadar satış yaptığı
- İptal edilen satışlar

“Dükkânda değilken kontrol” satış görüşmelerinde teknik özelliklerden daha güçlü anlatılabilir.

### Çalışan ve yetkilendirme

Beş çalışana kadar olan işletmeler için karmaşık rol sistemi gerekmez.

MVP’de iki rol yeterlidir:

- İşletme sahibi
- Çalışan/kasiyer

Kasiyer için sınırlandırılabilecek işlemler:

- Ciroyu görme
- Fiyat değiştirme
- Ürün silme
- Satış iptal etme
- Limit aşan veresiye verme
- Müşteri borcu değiştirme

Mevcut projedeki yetkilendirme altyapısı bunun için yeterli görünüyor.

## C. Müşterinin ürüne geçmesini sağlayacak özellik

### Excel/CSV ürün aktarımı

Bu özellik MVP’nin teknik değil, ticari olarak en kritik eksiklerinden biridir.

Bir market sahibine “ürünleri tek tek gireceksiniz” derseniz satış zorlaşır. Şunlar bulunmalı:

- Hazır Excel şablonu
- Ürün adı
- Barkod
- Stok
- Satış fiyatı
- Kategori
- Maliyet — tercihen
- Toplu yükleme
- Hatalı satır raporu

İlk pilotlarda aktarımı müşteri yerine sizin yapmanız daha iyi olabilir. Böylece hem satış bariyerini kaldırır hem farklı müşterilerin veri yapısını öğrenirsiniz.

# 2. MVP’ye alınmaması gerekenler

İlk 10–20 ücretli müşteri doğrulanmadan şunları geliştirmem:

- e-Fatura/e-Arşiv
- Tam ön muhasebe
- Tedarikçi ve alış faturası
- Çoklu depo
- Çoklu şube
- Pazaryeri entegrasyonları
- Sadakat ve karmaşık kampanyalar
- Gelişmiş stok tahmini
- Yapay zekâ özellikleri
- Çoklu para birimi
- Çek/senet
- Üretim veya reçete
- Kapsamlı muhasebe raporları
- Doğrudan yazar kasa entegrasyonu

Bunlar uzun vadede değerli olabilir ancak MVP’nin satılabilirliğini test etmek için gerekli değiller.

# 3. MVP’nin net kapsamı

İlk satılabilir sürüm şu paketten oluşmalı:

## Dijital Stok Esnaf MVP

- 1 işletme
- 1 kasa
- En fazla 5 kullanıcı
- Sınırsız veya yüksek limitli ürün
- Barkodlu satış
- Nakit, kart, QR ve veresiye
- Para üstü hesabı
- Stok takibi
- Kritik stok
- Müşteri ve veresiye
- Tahsilat
- WhatsApp bakiye paylaşımı
- Satış geçmişi ve iptal
- Temel dashboard
- Çalışan yetkileri
- Excel’den ürün aktarımı
- Web, telefon ve tablet kullanımı
- Offline çalışma
- Standart destek

İlk aşamada kullanıcıya çok sayıda plan göstermek yerine tek güçlü MVP paketi satmak daha iyi olur. Böylece hangi özelliğin hangi pakette olması gerektiğini tahmin etmek yerine gerçek kullanımdan öğrenirsiniz.

# 4. Ankara için fiyatlandırma önerisi

Güncel pazarda geniş kapsamlı ön muhasebe ürünlerinden biri aylık 575 TL civarında; yıllık ödemede daha düşük aylık karşılık sunuyor ve buna e-Fatura/e-Arşiv gibi özellikler de dahil ediyor. [Aplika fiyatları](https://aplika.com.tr/fiyatlarimiz)

Yerel barkod sistemi satıcılarında ise tek seferlik lisans, kurulum ve yıllık destek modeli hâlâ yaygın. Ankara’daki rakiplerin “yerinde kurulum”, “eğitim” ve “tek seferlik lisans” mesajlarını öne çıkardığı görülüyor. [Ankara Barkod Sistemi](https://www.barkodsistemi.com.tr/ankara-barkod-sistemi), [MarketPOS](https://www.marketposs.com/)

Dijital Stok henüz e-Fatura ve tam ön muhasebe sunmadığı için aylık 575 TL’nin üzerinde konumlandırmak ilk aşamada zor olabilir. Buna karşılık yerinde destek, offline kullanım ve beş kullanıcı avantajıyla çok ucuz da görünmemeli.

## Tavsiye edilen normal liste fiyatı

### Tek paketle MVP testi

**Dijital Stok Esnaf: 399 TL/ay + KDV**

İçerik:

- 1 işletme
- 1 kasa
- 5 kullanıcı
- Barkodlu satış
- Stok
- Veresiye
- Raporlar
- Mobil erişim
- Offline çalışma
- Standart destek

Yıllık ödeme:

**3.990 TL/yıl + KDV**

Bu fiyat yaklaşık iki ay ücretsiz kullanım etkisi yaratır.

### Kurulum hizmeti

İlk kurulum için ayrı bir ücret belirleyin:

- Uzaktan kurulum ve eğitim: **750–1.000 TL**
- Ankara içi yerinde kurulum ve eğitim: **1.500–2.500 TL**
- Excel ürün aktarımı: ilk belirli limite kadar ücretsiz
- Büyük veya çok bozuk veri dosyası: ayrıca fiyatlandırma
- Barkod okuyucu/yazıcı kurulumu: hizmet kapsamına göre ayrıca

Kurulum ücretini abonelikten ayırmak önemlidir. Çünkü Ankara içinde ulaşım, eğitim, cihaz ayarı ve veri aktarımı ciddi zaman maliyeti oluşturacaktır.

## Kurucu müşteri fiyatı

İlk 10 işletme için:

**249 TL/ay + KDV veya 2.490 TL/yıl + KDV**

Koşullar:

- Fiyat 12 ay sabit
- Kurulum ücretsiz veya sembolik ücretli
- Aylık kısa geri bildirim görüşmesi
- İzin veren müşteriden referans ve yorum
- Sorunların ekran kaydıyla paylaşılması
- Yeni özellikleri erken deneme

249 TL’yi kalıcı liste fiyatı yapmayın. “İlk 10 Ankara işletmesine özel kurucu müşteri fiyatı” olarak sınırlandırın.

Bu fiyat:

- Ürünün ücretsiz algılanmasını engeller.
- Gerçek ödeme isteğini test eder.
- Hataları tolere edecek pilot müşteri bulmayı kolaylaştırır.
- Daha sonra 399–499 TL bandına çıkmayı mümkün kılar.

# 5. MVP doğrulandıktan sonraki paketler

İlk 15–20 ücretli müşteri sonrasında iki paket yeterli olacaktır.

| Paket | Aylık fiyat önerisi | Hedef |
|---|---:|---|
| Esnaf | 349–399 TL + KDV | Tek kişi veya 1–2 çalışan |
| Esnaf Plus | 499–599 TL + KDV | 3–5 çalışan, daha fazla kontrol |

## Esnaf

- 1 kasa
- 2 kullanıcı
- Barkodlu satış
- Stok
- Veresiye
- Temel raporlar
- Mobil patron ekranı
- Standart destek

## Esnaf Plus

- 5 kullanıcı
- Çalışan yetkileri
- Çalışan bazlı raporlar
- Gelişmiş satış geçmişi
- WhatsApp ekstre
- Excel aktarım/dışa aktarım
- Gün sonu raporu
- Öncelikli destek

Ancak başlangıçta özellikleri fazla bölmeyin. Temel satış, stok ve veresiye bütün ücretli müşterilerde bulunmalı. Kullanıcı sayısı, raporlar, destek ve yönetim yetenekleri paket ayrımı için daha uygundur.

# 6. Kullanıcı veya işlem başına fiyatlandırma yapmayın

Küçük esnaf için şu modeller sorun çıkarabilir:

- Satış başına komisyon
- Fiş başına ücret
- Ürün sayısına göre düşük limitler
- Her çalışan için ayrı yüksek ücret
- Her cihaz için ek lisans
- Beklenmeyen senkronizasyon veya depolama ücretleri

Esnaf öngörülebilir maliyet ister. En anlaşılır mesaj:

> “Aylık sabit fiyat; satış başına komisyon yok.”

İleride ek kasa için sabit bir ücret alınabilir:

- Ek kasa: 100–150 TL/ay
- 5 kullanıcı üzeri her kullanıcı: 50–75 TL/ay
- Ek işletme/şube: ana paketin %60–70’i

# 7. En etkili kampanya ve promosyonlar

## Kampanya 1 — Ankara Kurucu Esnaf Programı

En güçlü başlangıç kampanyası bu olur.

> Ankara’daki ilk 10 işletmeye özel: kurulum ve ürün aktarımı ücretsiz, Dijital Stok 12 ay boyunca aylık 249 TL.

Karşılığında:

- Haftalık veya aylık geri bildirim
- Referans olma
- İşletmede kısa tanıtım videosuna izin
- Anonim kullanım verisi
- Yeni sürümleri test etme

“İndirim” yerine “kurucu esnaf” ifadesi müşteriyi ürünün gelişimine ortak eder.

## Kampanya 2 — 14 gün, kendi ürünlerinle ücretsiz deneme

Boş demo hesabı yeterince etkili olmaz.

- Müşterinin 20–50 gerçek ürünü aktarılır.
- Barkod okuyucusu bağlanır.
- Gerçek kasada kontrollü deneme yapılır.
- 14 gün boyunca destek verilir.
- Kart bilgisi istenmez.
- Devam etmek istemezse verileri dışa aktarılıp hesabı kapatılır.

Rakiplerin 30 günlük deneme ve para iadesi gibi risk azaltıcı teklifler kullandığı görülüyor. [MarketPOS](https://www.marketposs.com/)

Ben MVP döneminde 14 günü tercih ederim. Küçük esnaf iki hafta içinde sistemi gerçekten kullanıp kullanmayacağına karar verebilir.

## Kampanya 3 — Eski programdan ücretsiz geçiş

> Mevcut Excel veya stok listenizi ücretsiz aktarıyoruz.

Bu kampanya, fiyat indiriminden daha değerli olabilir. Müşterinin asıl maliyeti çoğu zaman abonelik değil, geçiş zahmetidir.

Sınırları açık yazılmalı:

- İlk 1.000 ürün ücretsiz
- Standart Excel/CSV dosyası
- Bir kez aktarım
- Karmaşık veri temizliği ayrıca ücretli

## Kampanya 4 — Esnaf arkadaşını getir

- Mevcut müşteri bir işletme getirir.
- Yeni işletme ücretli abone olduğunda ikisine de bir ay ücretsiz.
- Nakit ödül yerine abonelik kredisi verilir.
- En fazla 3–6 ay biriktirilebilir.

Mahalle esnafında referans, dijital reklamlardan daha güvenilir çalışabilir.

## Kampanya 5 — Yıllık ödeme avantajı

- Aylık: 399 TL
- Yıllık: 3.990 TL
- Kurulum ücretsiz
- Fiyat 12 ay sabit

Sadece indirim değil, ücretsiz kurulum eklemek yıllık ödemeyi daha cazip kılar.

## Kampanya 6 — Memnuniyet güvencesi

> İlk 30 gün içinde memnun kalmazsanız ödediğiniz abonelik ücretini iade ediyoruz.

Kurulum hizmeti gerçekten verilmişse kurulum ücretinin iade edilip edilmeyeceği sözleşmede açıkça belirtilmeli.

# 8. Ankara’da müşteri edinme yöntemi

İlk aşamada Meta veya Google reklamına büyük bütçe ayırmazdım. Ürün henüz tam doğrulanmadığı için yüz yüze satış daha fazla öğrenme sağlar.

## Hedef bölgeler

Pilot için birbirine yakın 2–3 bölge seçin. Böylece ulaşım ve destek maliyeti düşer:

- Keçiören
- Yenimahalle
- Etimesgut
- Sincan
- Mamak
- Altındağ

Birbirinden uzak ilçelerde aynı anda başlamayın.

## İlk hedef işletme profili

- Tek şubeli
- 1–5 çalışanlı
- En fazla 1–2 kasa
- Hâlâ defter veya Excel kullanan
- Eski masaüstü programından memnun olmayan
- Veresiye veren
- İşletme sahibi telefonundan kontrol isteyen
- 200–3.000 ürün aralığında çalışan

İlk aşamada büyük marketlerden kaçının. Çoklu kasa, terazi, yazar kasa ve e-Fatura beklentileri MVP’yi zorlayabilir.

## Satış görüşmesi

Özellik listesi anlatmak yerine üç soru sorun:

1. Stokta ne kaldığını dükkânda değilken görebiliyor musunuz?
2. Veresiye borçlarını nasıl takip edip müşteriye bildiriyorsunuz?
3. İnternet veya bilgisayar sorunu olduğunda satışınız duruyor mu?

Ardından 5 dakikalık demo:

1. Barkod okut.
2. Satışı tamamla.
3. Stokun düştüğünü göster.
4. Veresiye yaz.
5. İşletme sahibinin telefonunda ciro ve borcu göster.
6. WhatsApp bakiye mesajını aç.

# 9. MVP’nin satılabilirliğini nasıl ölçmelisiniz?

“Beğendiniz mi?” sorusu yerine gerçek ödeme davranışını ölçün.

## İlk hedef huni

- 50 işletmeyle yüz yüze görüşme
- 20 canlı demo
- 10 gerçek ürünleriyle deneme
- 5 ücretli müşteri
- 3 müşterinin ikinci ay devam etmesi

## Başarı kriterleri

MVP umut verici sayılabilir, eğer:

- Demoların en az %40’ı denemeye geçiyorsa
- Denemelerin en az %40’ı ödeme yapıyorsa
- Ücretli müşterilerin en az %70’i ikinci ay devam ediyorsa
- Müşteriler haftada en az 4 gün kullanıyorsa
- Satışların önemli bölümü uygulamadan geçiriliyorsa
- Destek ihtiyacı müşteri başına sürdürülebilir seviyedeyse

## Fiyat testi

İlk müşterilere tek fiyat söylemek yerine küçük bir test yapılabilir:

- İlk grup: 249 TL kurucu fiyatı
- İkinci grup: 349 TL
- Üçüncü grup: 399 TL

Fiyat yükseldikçe dönüşüm çok az düşüyorsa 399 TL doğru seviyedir. 249 TL’den bile satış olmuyorsa sorun büyük ihtimalle fiyat değil; güven, özellik veya hedef müşteri seçimidir.

# Net önerim

İlk sürümü şu şekilde pazara çıkarın:

- Ürün: barkodlu satış + stok + veresiye + telefonla patron kontrolü
- Müşteri: Ankara’da 1–5 çalışanlı tek şubeli esnaf
- Liste fiyatı: **399 TL/ay + KDV**
- Yıllık fiyat: **3.990 TL + KDV**
- İlk 10 işletme: **249 TL/ay, 12 ay fiyat garantisi**
- İlk 10 işletmeye kurulum ve standart Excel aktarımı ücretsiz
- 14 gün gerçek ürünlerle ücretsiz deneme
- Arkadaşını getirene iki tarafa bir ay ücretsiz
- Ankara içi normal yerinde kurulum: **1.500–2.500 TL**
- Donanım ayrıca fiyatlandırılır
- İlk hedef: 50 görüşmeden 5 ücretli, ikinci aya devam eden müşteri

MVP’ye eklenmesi gereken ilk üç geliştirme de şunlardır:

1. Excel/CSV ürün aktarımı
2. WhatsApp veresiye ekstresi
3. Para üstü ve güvenli kredi limiti kontrolü

Bu üç özellik tamamlandığında mevcut proje, hedeflediğiniz küçük esnaf segmentinde satılabilirliği test etmeye yeterli bir noktaya gelir.
