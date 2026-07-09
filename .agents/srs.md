# Yazılım Gereksinimleri Şartnamesi (SRS) - Dijital Stok

## 1. Giriş

**Dijital Stok**, küçük ve orta ölçekli işletmelerin (KOBİ) ürün stoklarını takip edebilecekleri, hızlı ve pratik bir şekilde satış yapabilecekleri ve barkod okuyucu sistemleri kullanarak operasyonel süreçlerini hızlandırabilecekleri çapraz platform (Web, PWA, iOS ve Android) destekli, **"Çevrimdışı Öncelikli" (Offline-First)** bir envanter ve Satış Noktası (POS) uygulamasıdır. 

Uygulamanın temel amacı, internet bağlantısının kesintili veya hiç olmadığı ortamlarda bile ticari faaliyetlerin kesintisiz sürdürülmesini sağlamak ve bağlantı geri geldiğinde tüm verileri bulut veritabanıyla otomatik olarak senkronize etmektir.

---

## 2. Kullanıcı Rolleri

- **Mağaza Görevlisi / Kasiyer:** 
  - Satış Noktası (POS) ekranını kullanarak hızlı satış yapabilir, sepet oluşturabilir, barkod okutabilir, sepeti askıya alabilir (hold) veya geri yükleyebilir.
  - Yapılan satışlarda nakit, kredi kartı, karekod veya veresiye ödeme seçeneklerini seçebilir.
  - Sınırlı yetkilerle stok miktarlarını görebilir fakat kritik envanter tanımlamalarını değiştiremez.
- **Yönetici (Admin):**
  - Kasiyerin tüm yetkilerine sahiptir.
  - Envantere yeni ürün ekleyebilir, mevcut ürünleri güncelleyebilir veya silebilir.
  - Müşteri hesapları oluşturabilir, kredi limitlerini belirleyebilir ve tahsilat/ödeme girdisi yapabilir.
  - Geçmiş satışları filtreleyebilir, inceleyebilir ve gerektiğinde satış iptal (iade) işlemlerini gerçekleştirerek stokların ve borçların otomatik geri yüklenmesini sağlayabilir.
  - Dashboard üzerindeki ciro, grafik, en çok satan ürünler ve finansal raporları izleyebilir.

---

## 3. Fonksiyonel Gereksinimler (Functional Requirements)

### 3.1. Envanter Yönetimi (Inventory Management)
- **Manuel ve Barkodlu Ürün Ekleme:**
  - Kullanıcılar sisteme yeni ürün eklerken isim, fiyat, stok adedi, barkod ve SKU bilgilerini girebilirler.
  - Ürün Ekleme/Düzenleme Formu `React Hook Form` ve `Zod` şeması ile doğrulanır:
    - **Ürün Adı:** Zorunludur ve en az 2 karakter olmalıdır.
    - **Barkod:** Opsiyoneldir, benzersiz olmalıdır.
    - **Stok:** Zorunludur, tam sayı olmalıdır ve 0'dan küçük olamaz.
    - **Fiyat:** Zorunludur, ondalıklı sayı olmalıdır ve 0'dan küçük olamaz.
- **Open Food Facts API Entegrasyonu:**
  - Barkodlu yeni ürün eklenirken barkod alanının yanındaki "Ara" butonuyla harici **Open Food Facts API**'sine (`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`) istek atılır.
  - Dönen verilerden `product_name` -> Ürün Adı alanına otomatik yazılır.
  - Ek olarak ürün resmi (`image_front_url` veya `image_url`), marka (`brands`) ve içindekiler (`ingredients_text`) bilgileri çekilerek form altında önizleme kartı olarak kullanıcıya sunulur. Kullanıcı bu verileri inceleyip onaylayarak envanterine kaydedebilir.
- **Arama ve Listeleme:**
  - Ürünler tablo (`React Table`) formatında listelenir. Tablo sütunları: Ürün Görseli, Ürün Adı, Stok Adedi, Fiyatı, Barkod Değeri ve Düzenle/Sil aksiyonlarıdır.
  - Arama çubuğu üzerinden ürün adı veya barkod numarasına göre anlık (debounced) filtreleme yapılır.

### 3.2. Satış Noktası (POS) & Sepet Modülü
- **Üç Kolonlu Arayüz Tasarımı:**
  - **1. Kolon (Arama & Aktif Sepet):** Ürünlerin hızlı arandığı arama çubuğu ve sepetteki ürünlerin listelendiği, miktarlarının artırılıp azaltılabildiği veya silinebildiği aktif sepet paneli.
  - **2. Kolon (Hızlı Ekleme Paneli):** Envanterdeki tüm ürünlerin kartlar halinde listelendiği ve üzerine tıklanarak sepete hızlıca eklenebildiği alan.
  - **3. Kolon (Fatura & Ödeme Paneli - Invoice Panel):** Alt toplam, indirim girişleri, müşteri seçimi, veresiye limit kontrolleri, ödeme yöntemi seçimi ve para üstü hesaplama arayüzünü içerir.
- **Barkod Okuma ve Sepete Ekleme:**
  - Fiziksel klavye emülasyonlu barkod okuyucuların hızlı veri girişini yakalamak için global bir keydown dinleyicisi (`useGlobalBarcodeScanner`) mevcuttur. İki tuş vuruşu arası süre 50ms'nin altındaysa ve veri `Enter` ile sonlanıyorsa bu giriş barkod olarak kabul edilir.
  - Barkod okunduğunda ürün envanterde kayıtlıysa doğrudan sepet miktarı 1 artırılarak sepete eklenir. Kayıtlı değilse sesli/görsel uyarı verilir ve kullanıcıya anında "Yeni Ürün Ekle" kısayolu sunularak barkod alanı otomatik doldurulmuş envanter formuna yönlendirilir.
- **Bekleyen Satışlar (Hold/Resume Sales):**
  - Aktif sepet durumundaki işlemler geçici olarak askıya alınabilir (Hold). Askıya alınan sepetler yerel önbellekte (`localStorage` üzerinde Zustand persist ile) "Bekleyen Satışlar" kuyruğuna eklenir.
  - Sağdan kayan bir çekmece (HeldSalesDrawer) üzerinden bekleyen satışların tarihleri, sepet tutarları ve içerikleri incelenerek istenen sepet aktif hale getirilebilir (Resume) veya listeden silinebilir.
- **Gelişmiş İndirim Sistemi:**
  - Satış anında faturaya Tutar (₺) bazlı sabit indirim veya Yüzde (%) bazlı oran indirimi uygulanabilir.
  - Yüzde bazlı indirim veya fiyat artırımı değeri `[-100, 100]` aralığında sınırlandırılmıştır. Sabit indirim tutarı sepet alt toplamını aşamaz.
- **Veresiye Satış ve Kredi Limiti Kontrolü:**
  - Ödeme yöntemi olarak "Veresiye" (Credit) seçildiğinde faturaya bir müşteri tanımlanması zorunludur.
  - Seçilen müşterinin mevcut borcu (`totalDebt`) ile güncel fatura tutarının toplamı, müşteriye tanımlanmış Kredi Limitini (`creditLimit`) aşarsa sistem "Kredi Limiti Aşıldı" uyarısı verir, "Ödemeyi Tamamla" butonunu devre dışı bırakır ve işlem engellenir.
- **Fiş Yazdırma / PDF Çıktısı:**
  - Satış başarıyla sonlandırıldığında otomatik bir Fiş Numarası (`INV-XXXXXX`) üretilir. 
  - Kullanıcı "Fiş Yazdır" butonuna basarak termal yazıcı formatına (`80mm`) uygun hazırlanmış `ReceiptTemplate` şablonu üzerinden tarayıcının yerleşik yazdırma penceresini (`react-to-print`) tetikleyebilir.

### 3.3. Barkod Tarama Teknolojileri
- **Native Platform Tarama (MLKit):**
  - Uygulama iOS veya Android cihazlarda (Capacitor wrapper) çalışırken cihaz kamerasını donanımsal hızda kullanan `@capacitor-mlkit/barcode-scanning` kütüphanesini tetikler.
  - Tarama başladığında, React uygulamasının arka planını şeffaflaştırmak için `document.body` sınıfına `barcode-scanner-active` eklenerek web arayüzü görünmez kılınır ve altındaki native kamera katmanı açılır.
- **Web Platform Tarama (ZXing & BarcodeDetector):**
  - Tarayıcı üzerinden erişildiğinde, öncelikle modern tarayıcılarda bulunan native `BarcodeDetector` API'si kontrol edilir.
  - Desteklenmiyorsa, WebRTC tabanlı `navigator.mediaDevices.getUserMedia` akışını kullanan `@zxing/browser` kütüphanesi ile `<video>` elementi üzerinden barkod tespiti gerçekleştirilir.
  - Yanlış okumaları ve mükerrer taramaları önlemek amacıyla, aynı barkodun 3 saniye içerisinde üst üste taranması engellenir.

### 3.4. Çevrimdışı Çalışma ve Senkronizasyon (Offline-First)
- **Çevrimdışı Veri Yönetimi:**
  - İnternet bağlantısı kesildiğinde envanter görüntüleme, sepete ekleme, satış yapma, müşteri ekleme ve tahsilat kaydetme gibi tüm temel işlevler çalışmaya devam eder.
  - Yapılan tüm veri güncellemeleri yerel veritabanında (Firestore Local Cache) kuyruğa alınır.
- **Senkronizasyon Göstergesi (SyncIndicator):**
  - Ekranın üst kısmında dinamik bir ağ durum göstergesi yer alır:
    - **Buluta Bağlı (Yeşil Bulut):** İnternet bağlantısının aktif olduğunu ve tüm verilerin bulut veritabanıyla senkronize çalıştığını belirtir.
    - **Çevrimdışı Mod (Turuncu WifiOff):** Cihazın internet bağlantısının koptuğunu ve yapılan işlemlerin yerel belleğe kaydedildiğini belirtir.
  - Bağlantı durumu tarayıcının `window.online` ve `window.offline` event listener'ları ile gerçek zamanlı olarak izlenir.
  - İnternet geri geldiğinde, Firestore arka planda birikmiş tüm yazma kuyruğunu otomatik olarak bulut sunucularına iletir ve çift yönlü senkronizasyonu tamamlar.

### 3.5. Müşteri ve Tahsilat Yönetimi (Customer & Debt Management)
- **Müşteri Kaydı:**
  - Yönetici, müşterilerin Ad, Soyad, E-posta, Telefon ve Kredi Limiti bilgilerini kaydedebilir. Telefon numarası ve e-posta formatları Zod şeması ile doğrulanır.
- **Tahsilat (Ödeme Alma):**
  - Müşteri detay sayfasında yer alan "Tahsilat Ekle" modalı ile müşteriden nakit veya kartla alınan ödeme miktarı girilir.
  - Girilen ödeme tutarı müşterinin toplam borcundan (`totalDebt`) düşülür ve `payments` koleksiyonuna bir tahsilat kaydı olarak eklenir.
- **Müşteri Cari ve Hesap Detayı:**
  - Her müşterinin detay sayfasında borç limiti durumu görsel bir bar grafiğiyle gösterilir.
  - Alt kısımda müşteriye ait tüm hareketler (Veresiye Satışlar ve yapılan Tahsilatlar) tarih sırasına göre listelenir.
  - Satış hareketlerine tıklandığında ilgili satış faturasının sepet içeriği, indirimleri ve fiş detayları popup içinde görüntülenebilir.

### 3.6. Satış Geçmişi & İşlem İptali
- **Satış Listesi:**
  - Yapılan son 500 satış işlemi fatura numarası, tarih, müşteri adı, ödeme türü, sepet içeriği ve toplam tutar bilgileriyle listelenir.
- **Gelişmiş Filtreleme:**
  - Kullanıcılar geçmiş satışları fatura numarasına göre arayabilir; tarih aralığı, müşteri, ödeme yöntemi (Nakit, Kart, Karekod, Veresiye) ve minimum/maksimum tutar kriterlerine göre filtreleyebilirler.
- **Satış İptali ve İade Mantığı:**
  - Hatalı yapılan veya iade edilen satışlar "Satışı İptal Et" butonuyla iptal edilebilir.
  - İptal işlemi, veri bütünlüğünü korumak adına bir Firestore **Transaction/Batch** yazma işlemiyle atomik olarak gerçekleştirilir:
    1. Satış dokümanının durumu (`status`) `cancelled` olarak güncellenir.
    2. Satılan ürünlerin miktarları envanterdeki stok sayılarına (`stock`) geri eklenir.
    3. Eğer satış "Veresiye" olarak yapılmışsa, müşterinin toplam borcundan (`totalDebt`) satış tutarı düşülür.

### 3.7. Analitik Dashboard
- **Finansal Metrikler:**
  - **Bugünkü Ciro:** Gün içinde yapılan başarılı satışların toplam tutarı.
  - **Sipariş Sayısı:** Gün içinde yapılan faturalandırılmış satış sayısı.
  - **Ortalama Sepet Tutarı:** Bugünkü cironun sipariş sayısına oranı.
  - **Toplam Alacak:** Tüm müşterilerin ödenmemiş toplam borç miktarı.
- **Satış Grafik Yapısı:**
  - Dönemsel ciro değişim grafiği (Çizgi veya Bar grafik). Dönem seçenekleri: Son 7 Gün (7D), Son 14 Gün (14D), Son 30 Gün (30D), Bu Ay (THIS_MONTH), Son 6 Ay (6M), Bu Yıl (THIS_YEAR).
- **Raporlama Listeleri:**
  - **En Çok Satan Ürünler:** Satış adetlerine göre sıralı ilk 5 ürün.
  - **En Çok Borcu Olan Müşteriler:** Borç miktarına göre sıralı ilk 5 müşteri.
  - **En Çok Alışveriş Yapan Müşteriler:** Toplam harcama cirosuna göre sıralı ilk 5 müşteri.
  - **Ödeme Yöntemi Dağılımı:** Satışların ödeme türlerine göre pasta/halka grafiği şeklinde dağılımı.
  - **Kritik Stok Uyarıları:** Stok miktarı 10 adet veya altına düşmüş ürünlerin listesi.

---

## 4. Fonksiyonel Olmayan Gereksinimler (Non-Functional Requirements)

### 4.1. Performans ve Tepkisellik
- Barkod okuma ve sepete ekleme süresi donanımsal veya yazılımsal okuyucularda 500ms'nin altında olmalıdır.
- Büyük envanter listelerinde (10.000+ ürün) dahi arama filtrelemesi ve liste render performansı `useMemo` ve debounced search ile akıcı tutulmalı, UI thread'inde donma yaşanmamalıdır.

### 4.2. Güvenlik ve Veri İzolasyonu
- Her kullanıcının verisi tamamen kendine izole edilmiştir. Firestore kuralları (`firestore.rules`) ve store sorguları, sadece aktif oturum açmış kullanıcının `userId` değerine eşit olan dokümanları okumasına ve yazmasına izin verir.
- API anahtarları veya veritabanı bağlantı şemaları doğrudan kod içinde sert kodlanmış (hardcoded) olarak yer almaz; `ENV` konfigürasyon nesnesi üzerinden yönetilir.

### 4.3. UI/UX Tasarım ve Kullanılabilirlik
- Tasarım dili **Google Material Design 3** ve **Bento Grid** prensiplerine dayanır. Geniş oval köşeli kartlar (`rounded-[28px]`), yumuşak form girdileri (`rounded-2xl`) ve hap şeklinde butonlar (`rounded-full`) kullanılır.
- Satış ekranı (POS) gibi yoğun veri girişi gerektiren ekranlarda çalışma alanını maksimize etmek için yan navigasyon menüsü (`MainLayout`) otomatik olarak daraltılmış (icon-only) moda geçer. Diğer ekranlarda ise geniş modda kalır.
- Drawer ve modal bileşenleri açılıp kapanırken Framer Motion yardımıyla pürüzsüz animasyonlarla (örneğin sağdan kayarak giriş, solarak çıkış) ekrana gelir.
