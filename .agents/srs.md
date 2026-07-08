# Yazılım Gereksinimleri Şartnamesi (SRS) - Dijital Stok

## 1. Giriş

**Dijital Stok**, küçük ve orta ölçekli işletmelerin (KOBİ) ürün stoklarını takip edebilecekleri, satış yapabilecekleri ve barkod okuyucu sistemini kullanarak işlemleri hızlandırabilecekleri çapraz platform (Web & Mobil) destekli, "Çevrimdışı Öncelikli" (Offline-First) bir uygulamadır.

## 2. Kullanıcı Rolleri

- **Mağaza Görevlisi/Kasiyer:** Sistemi sadece satış yapmak, barkod okutmak ve stok miktarlarını güncellemek için kullanır.
- **Yönetici:** Envanter ekleyebilir, silebilir, fiyat güncelleyebilir ve sistemin genel senkronizasyon ayarlarını kontrol edebilir.

## 3. Fonksiyonel Gereksinimler (Functional Requirements)

### 3.1. Envanter Yönetimi

- Kullanıcılar sisteme manuel veya barkod okutarak yeni ürün ekleyebilmelidir.
- Bir barkod okutulduğunda ürün sistemde yoksa, otomatik olarak harici bir veritabanından (Open Food Facts API) ürün bilgileri (İsim, fotoğraf, marka, içindekiler) çekilip kullanıcıya sunulmalıdır.
- Mevcut ürünlerin stok miktarları, isimleri ve fiyatları güncellenebilmeli; ürünler silinebilmelidir.
- Ürünler tabloda listelenmeli ve barkod/isim üzerinden arama yapılabilmelidir.

### 3.2. Satış Noktası (POS) & Sepet

- Arayüz, hızlı satışa imkan verecek şekilde "Barkod Okut" kısayoluna sahip olmalıdır.
- Ürünler liste üzerinden tıklanarak veya barkod okutularak sepete eklenebilmelidir.
- Sepette miktar artırma/azaltma yapılabilmeli, istenmeyen ürünler çıkarılabilmelidir.
- **İndirim Sistemi**: Fatura üzerinde Tutar (₺) veya Yüzde (%) bazlı indirim veya fiyat artırımı uygulanabilmelidir. Yüzde değeri [-100, 100] sınırlarına sahip olmalıdır.
- **Bekleyen Satışlar**: Sepetteki işlem geçici olarak askıya alınıp, yerel bellekte "Bekleme Listesi" (Hold Sales) olarak tutulabilmelidir. İstenildiğinde bu sepet geri yüklenebilmeli ve mevcut aktif sepetin üzerine yazılabilmelidir.
- Sepet temizlenebilmeli ve ödeme başarıyla tamamlandığında stoktan otomatik düşüş sağlanmalıdır.

### 3.3. Barkod Okuma İşlemleri

- **Mobil Cihazlarda:** Cihazın kendi kamerasını native hızda kullanarak donanımsal barkod okuma yapılmalıdır (Capacitor MLKit).
- **Web Ortamında:** Bilgisayar veya tarayıcı üzerinden giriş yapıldığında WebRTC destekli bir tarayıcı kütüphanesi (Zxing) ile kamera üzerinden okuma yapılmalıdır.

### 3.4. Çevrimdışı Çalışma ve Senkronizasyon

- Uygulamanın tüm temel özellikleri (satış, envanter görüntüleme, barkod tarama) internet olmadan çalışabilmelidir.
- Değişiklikler yerel olarak saklanmalıdır (LocalFirst).
- Arka planda çalışan bir `SyncWorker`, internet bağlantısı sağlandığında yerel değişiklikleri buluta iletmelidir.

### 3.5. Müşteri Yönetimi

- Kullanıcılar sisteme yeni müşteri ekleyebilmeli (Ad, Soyad, Telefon, Kredi Limiti) ve var olan müşteriyi düzenleyebilmelidir.
- Form alanları Zod ve React Hook Form ile kurallara göre (validasyon) doğrulanmalıdır.
- **Veresiye Satış**: Müşterinin önceden tanımlanmış bir "Kredi Limiti" (Max Limit) bulunmalıdır. Yapılan veresiye alışverişlerin toplam borcu bu limiti aştığında sistem veresiye satışı devredışı (disabled) bırakmalı ve uyarı mesajı (badge) göstermelidir.

## 4. Fonksiyonel Olmayan Gereksinimler (Non-Functional Requirements)

### 4.1. Performans

- Barkod okuma tepki süresi 500ms'nin altında olmalıdır.
- Kullanıcı arayüzünde takılma olmamalı, state yönetimleri (Zustand) UI thread'ini yormamalıdır.

### 4.2. Uyumluluk ve Dağıtım (Cross-Platform)

- Sistem hem Web (PWA) üzerinden hem de iOS/Android (CapacitorJS) üzerinden sorunsuz ve tek bir kod tabanıyla derlenebilir olmalıdır.

### 4.3. UI/UX (Kullanıcı Deneyimi)

- Arayüz **Google Chrome (Material Design 3)** standartlarında olmalıdır.
- Geniş oval (Bento) kartlar ve hap şeklinde (pill-shape) aksiyon tuşları kullanılmalıdır.
- Eski tarayıcı `alert()` bildirimleri kullanılmamalı; yerleşik modern bildirimler (Toast) veya HeroUI/Özel Modal tasarımları tercih edilmelidir.
- Modal ve Drawer bileşenlerinde sağdan kayan (Slide-in) ve solan (Fade-in) pürüzsüz giriş/çıkış animasyonları bulunmalıdır.
