# Sistem Tasarım Dokümanı (Design Document) - Dijital Stok

## 1. Mimari Genel Bakış

Dijital Stok uygulaması, modern web teknolojilerini native platformlara taşıyan hibrid ve çevrimdışı öncelikli (Offline-First) bir mimari üzerine kurulmuştur. Sistem katmanları ve teknoloji yığını aşağıda detaylandırılmıştır:

- **Frontend Çekirdeği:** React 19 (React-DOM 19), Vite 8, TypeScript 6.
- **UI & Stil Katmanı:** Tailwind CSS v4, HeroUI v3 (eski adıyla NextUI), Lucide React (ikon kütüphanesi) ve Framer Motion 12 (animasyon kütüphanesi).
- **Form Yönetimi ve Validasyon:** React Hook Form ve Zod şema doğrulama kütüphanesi.
- **State Yönetimi ve Kalıcılık:** Zustand 5 (Zustand Persist Middleware ile tarayıcı yerel belleği entegrasyonu).
- **Veritabanı ve Senkronizasyon:** Cloud Firestore (Yerleşik Çevrimdışı Önbellek ve Çoklu Sekme Desteği ile).
- **Native Derleme Katmanı:** CapacitorJS v8 (iOS ve Android derleme wrapper'ları, MLKit Barkod Okuyucu ve Network Durum Kontrolü eklentileriyle).

---

## 2. Veri Mimarisi ve Veritabanı Şeması (Firestore)

Uygulamanın veri modeli, tüm işlemlerin çevrimdışı önbellekte tutulup senkronize edilmesini sağlayacak şekilde tasarlanmıştır. SQLite konsept tasarımı yerine projenin üretim ortamında kullanılan gerçek **Cloud Firestore** koleksiyon şemaları ve veri modelleri aşağıda tanımlanmıştır:

### 2.1. `inventory` Koleksiyonu
Her bir ürünün envanter bilgilerini saklar. Belgelerin ID değerleri istemci tarafında `crypto.randomUUID()` ile üretilir.
- **`id` (string, UUID):** Doküman anahtarı.
- **`name` (string):** Ürünün adı (Zod validasyonu: minimum 2 karakter).
- **`stock` (number):** Güncel stok miktarı (Tam sayı, minimum 0).
- **`price` (number):** Ürünün birim satış fiyatı (Ondalık sayı, minimum 0).
- **`barcode` (string, opsiyonel):** Ürünün barkod kodu (Eşsiz).
- **`sku` (string, opsiyonel):** Ürünün stok kodu (Eşsiz).
- **`imageUrl` (string, opsiyonel):** Ürün görselinin URL bağlantısı (Open Food Facts veya yükleme yolu).
- **`updatedAt` (string, ISO-8601):** Son güncelleme zaman damgası.
- **`userId` (string):** Ürünün ait olduğu Firebase kullanıcısının UID değeri.

### 2.2. `customers` Koleksiyonu
Cari hesap takibi yapılan kayıtlı müşterileri saklar.
- **`id` (string, UUID):** Doküman anahtarı.
- **`name` (string):** Müşteri adı.
- **`surname` (string, opsiyonel):** Müşteri soyadı.
- **`email` (string, opsiyonel):** E-posta adresi (Zod format doğrulaması ile).
- **`phone` (string, opsiyonel):** Telefon numarası.
- **`creditLimit` (number):** Veresiye alışveriş limiti (Ondalık sayı, varsayılan 0).
- **`totalDebt` (number):** Müşterinin güncel borç miktarı (Ödemeler ve veresiye satışlar doğrultusunda güncellenir).
- **`createdAt` (string, ISO-8601):** Kayıt tarihi.
- **`updatedAt` (string, opsiyonel, ISO-8601):** Güncelleme tarihi.
- **`userId` (string):** Müşterinin ait olduğu kullanıcının UID değeri.

### 2.3. `sales` Koleksiyonu
Satış Noktası (POS) üzerinden tamamlanan satış işlemlerini saklar.
- **`id` (string, Firestore auto-gen):** Fatura benzersiz ID'si.
- **`userId` (string):** Satışı yapan kullanıcının UID değeri.
- **`invoiceNumber` (string):** Fiş numarası formatı (Örn: `INV-123456`).
- **`customerId` (string, nullable):** Tanımlı müşteri ID'si (Veresiye satışta zorunludur).
- **`subtotal` (number):** Sepet alt toplam tutarı (İndirimsiz toplam).
- **`discount` (number):** Uygulanan toplam indirim tutarı.
- **`discountType` (string):** İndirim türü (`amount` veya `percentage`).
- **`discountValue` (number):** İndirim değeri (Raw form değeri).
- **`totalAmount` (number):** Ödenen/Borçlanılan genel toplam tutar (`subtotal - discount`).
- **`paymentMethod` (string):** Ödeme yöntemi (`Cash`, `Card`, `Scan`, `Credit`).
- **`status` (string):** İşlem durumu (`Completed` veya `cancelled`).
- **`createdAt` (string, ISO-8601):** Satış tarihi.
- **`cart` (Array):** Sepetteki ürünlerin o anki durumunun snapshot'ı. Eleman yapısı:
  - `inventoryId` (string)
  - `name` (string)
  - `price` (number)
  - `quantity` (number)
  - `imageUrl` (string, opsiyonel)
  - `barcode` (string, opsiyonel)

### 2.4. `saleItems` Koleksiyonu
Raporlama kolaylığı ve envanter analizleri için her satış faturasına ait satılan ürünlerin dökümünü tutar.
- **`id` (string, Firestore auto-gen):** Satır ID'si.
- **`saleId` (string):** Bağlı olduğu `sales` belgesinin ID değeri.
- **`userId` (string):** Kullanıcı UID'si.
- **`inventoryId` (string):** İlgili ürünün `inventory` dokümanı ID'si.
- **`quantity` (number):** Satış adedi.
- **`unitPrice` (number):** Satış anındaki birim fiyat.

### 2.5. `payments` Koleksiyonu
Müşterilerden alınan tahsilat (ödeme) işlemlerini saklar.
- **`id` (string, UUID):** İşlem ID'si.
- **`customerId` (string):** İlgili müşterinin ID'si.
- **`userId` (string):** İşlemi yapan kullanıcının UID değeri.
- **`amount` (number):** Alınan ödeme miktarı.
- **`createdAt` (string, ISO-8601):** Tahsilat tarihi.

---

## 3. Firebase Çevrimdışı Önbellek ve Senkronizasyon Mimarisi

Uygulamanın çevrimdışı çalışabilmesi için Firestore'un yerleşik veritabanı önbelleği yapılandırılmıştır. SQLite veya harici servis yazan bir senkronizasyon işçisi yerine sistem doğrudan Firebase SDK'sının yeteneklerini kullanır:

- **Önbellek Konfigürasyonu (`src/core/firebase/config.ts`):**
  - Firestore istemcisi `initializeFirestore` fonksiyonu ile başlatılır.
  - `localCache` özelliği `persistentLocalCache` olarak atanır.
  - `tabManager` özelliğine `persistentMultipleTabManager()` verilerek uygulamanın birden fazla tarayıcı sekmesinde veya arka planda çalışırken yerel verileri çakışmadan okuyup yazabilmesi sağlanır.
- **İşlem Kuyruklama (Latency Compensation):**
  - Çevrimdışı modda yapılan `setDoc`, `updateDoc` veya `writeBatch` işlemleri anında yerel önbelleğe yazılır ve Zustand store'ları üzerinden UI'a yansıtılır.
  - Firebase SDK, internet bağlantısı sağlandığı anda kuyruktaki işlemleri sırasıyla sunucuya iletir.
- **Bağlantı İzleme (SyncIndicator):**
  - `SyncIndicator.tsx` bileşeni tarayıcının `window.addEventListener('online')` ve `'offline'` olaylarını dinleyerek `navigator.onLine` durumunu günceller.
  - Bu sayede kullanıcının güncel ağ durumu ("Çevrimdışı Mod" veya "Buluta Bağlı") arayüzde görselleştirilir.

---

## 4. Zustand Store Yapıları (State Management)

State yönetimi, her bir işlevsel modül için ayrı Zustand store'ları ile gerçekleştirilmektedir. Store'lar arası veri geçişleri ve sorumluluk alanları aşağıda açıklanmıştır:

### 4.1. `useAuthStore`
Firebase Authentication durumunu sarmalar ve kullanıcı oturum kontrolünü sağlar.
- **Durum (State):** `user` (Firebase User nesnesi), `isLoading` (boolean), `isInitialized` (boolean), `authError` (string | null).
- **Eylemler (Actions):**
  - `loginWithEmail(email, password)`: Firebase Email/Password kimlik doğrulamasını başlatır.
  - `loginWithGoogle()`: Firebase Google Sign-In Popup ekranını açar.
  - `registerWithEmail(email, password)`: Yeni kullanıcı kaydeder ve doğrulama e-postası tetikler.
  - `resetPassword(email)`: Şifre sıfırlama e-postası gönderir.
  - `logout()`: Firebase oturumunu kapatır ve veri güvenliği için diğer tüm Zustand store'larının belleklerini temizler (`clearItems`, `clearCustomers`, `clearCart`, `clearSales`, vb.).

### 4.2. `useInventoryStore`
Envanter ürün verilerini ve veri yazma işlemlerini yönetir.
- **Durum (State):** `items` (InventoryItem dizisi), `isLoading` (boolean), `unsubscribeSnapshot` (Firestore snapshot iptal fonksiyonu).
- **Eylemler (Actions):**
  - `loadItems()`: Firestore üzerinde `userId == currentUser.uid` olan ürünler için bir `onSnapshot` gerçek zamanlı dinleyici başlatır.
  - `addItem(data)` / `updateItem(id, data)` / `deleteItem(id)`: Firestore üzerindeki dokümanları günceller. Çevrimdışı yazma işlemleri Firebase SDK'sı tarafından arka planda senkronize edilir.

### 4.3. `useCustomerStore`
Müşteri kayıtlarını ve tahsilat süreçlerini yönetir.
- **Durum (State):** `customers` (Customer dizisi), `isLoading` (boolean), `unsubscribeSnapshot` (Firestore snapshot iptal fonksiyonu).
- **Eylemler (Actions):**
  - `loadCustomers()`: Firestore üzerinde `userId == currentUser.uid` olan müşterileri dinler.
  - `addCustomer(data)` / `updateCustomer(id, data)`: İlgili müşteri dokümanlarını ekler veya günceller.
  - `addPayment(customerId, amount)`: Firestore **writeBatch** kullanarak `payments` koleksiyonuna ödeme belgesini ekler ve eşzamanlı olarak `customers/{customerId}` belgesindeki `totalDebt` alanını `increment(-amount)` ile azaltır.
  - `getCustomerTransactions(customerId)`: Verilen müşteriye ait veresiye satışları (`sales` koleksiyonundan) ve tahsilatları (`payments` koleksiyonundan) çeker, tarih sırasına göre (`desc`) birleştirip arayüze sunar.

### 4.4. `useSalesStore`
Aktif sepet, indirim hesaplamaları ve ödeme tamamlama işlemlerini yönetir. Zustand **persist** middleware'i ile `sales-storage` anahtarıyla tarayıcı yerel belleğinde saklanır.
- **Durum (State):** `cart` (CartItem dizisi), `isProcessing` (boolean), `customerId` (seçili müşteri ID'si), `discountType` (`amount` veya `percentage`), `discountValue` (indirim tutarı/oranı), `paymentMethod` (`Cash`, `Card`, `Scan`, `Credit`), `heldSales` (HeldSale dizisi).
- **Eylemler (Actions):**
  - `addToCart(item)`: Sepete yeni ürün ekler. Aynı ürün varsa miktarı artırır.
  - `updateQuantity(id, qty)` / `removeFromCart(id)`: Sepet içeriğini yönetir.
  - `holdSale()`: Aktif sepeti, müşteri ID'sini, indirim ve ödeme bilgilerini içeren bir `HeldSale` nesnesi üreterek `heldSales` dizisinin başına ekler, aktif sepeti temizler (Askıya Alma).
  - `restoreSale(id)`: Askıya alınmış sepeti `heldSales` içinden çekip aktif sepete yükler ve bekleyenlerden siler.
  - `checkout()`: Satış kapatma işlemini bir Firestore **writeBatch** ile atomik olarak yürütür:
    1. `sales` koleksiyonunda satış dokümanını oluşturur.
    2. Satılan her ürün için `saleItems` kaydı oluşturur ve envanterdeki stok miktarını `increment(-quantity)` kullanarak azaltır.
    3. Ödeme yöntemi `Credit` (Veresiye) ise, ilgili müşterinin `totalDebt` borç alanını `increment(totalAmount)` ile artırır.
    4. Batch tamamlandıktan sonra aktif sepeti ve indirimleri sıfırlar.

### 4.5. `useSalesHistoryStore`
Geçmiş satış işlemlerinin listelenmesi, filtrelenmesi ve iptal edilmesi süreçlerini yönetir.
- **Durum (State):** `sales` (SaleTransaction dizisi), `isLoading` (boolean), `filters` (SalesHistoryFilter nesnesi).
- **Eylemler (Actions):**
  - `fetchSales()`: Firestore'dan kullanıcının son 500 satışını çeker. Arama metni, müşteri filtreleme, ödeme yöntemi, tarih sınırı ve ciro aralığı gibi tüm filtreleme kriterlerini performans optimizasyonu açısından istemci tarafında (client-side) uygular.
  - `cancelSale(saleId)`: İptal işlemini bir Firestore **writeBatch** ile atomik olarak yürütür:
    1. Satış dokümanının durumunu (`status`) `cancelled` olarak günceller.
    2. Fiş içindeki ürünlerin miktarlarını envanterdeki stok sayısına geri ekler (`increment(quantity)`).
    3. Fiş "Veresiye" ise, müşterinin toplam borcunu `increment(-totalAmount)` ile azaltır.

---

## 5. UI/UX ve Bileşen Yapısı

### 5.1. Navigasyon Mimarisi (Routing & Layout)
- **`App.tsx`:** Genel router katmanıdır. `onAuthStateChanged` dinleyicisi ile kullanıcı oturumunu doğrular.
  - `/login`: Giriş ve kayıt ekranıdır (Oturum açık değilse erişilir).
  - Korunan Rotalar (Protected Routes): `MainLayout` bileşeni ile sarmalanmıştır ve sadece oturum açmış kullanıcılar (`user !== null`) erişebilir.
    - `/` -> `DashboardView` (Analitik pano)
    - `/sales` -> `SalesView` (POS ekranı)
    - `/sales-history` -> `SalesHistoryView` (Fatura listesi ve filtreleme)
    - `/customers` -> `CustomerListView` (Cari kart listesi)
    - `/customers/new`, `/customers/edit/:id` -> `CustomerFormView` (Müşteri ekleme/düzenleme)
    - `/customers/details/:id` -> `CustomerDetailView` (Hesap hareketleri ve tahsilat ekranı)
    - `/inventory` -> `InventoryView` (Envanter listesi)
    - `/inventory/new`, `/inventory/edit/:id` -> `ProductFormView` (Ürün ekleme/düzenleme ve Open Food Facts entegrasyonu)
- **Sidebar Davranışı (`MainLayout.tsx`):**
  - POS ekranındaki (`/sales`) görsel kalabalığı azaltmak ve kullanılabilir ekran alanını artırmak amacıyla, bu sayfaya gelindiğinde sol Sidebar otomatik olarak daraltılmış (icon-only, `isCollapsed = true`) moda geçer. Diğer tüm sayfalarda varsayılan geniş modda açılır. Kullanıcı dilerse ok butonu ile manuel olarak daraltıp genişletebilir.
  - Mobil ekranlarda ekranın altına sabitlenen `Bottom Navigation` çubuğu devreye girer.

### 5.2. Klavye Kısayolları (Hotkeys)
Kasiyerlerin fare kullanmadan işlem yapabilmesini kolaylaştırmak amacıyla `react-hotkeys-hook` ile global kısayollar tanımlanmıştır:
- **`F1`:** Satış (POS) Ekranına Git.
- **`F2`:** Yeni Satış Başlat (Aktif sepeti sıfırlar ve POS ekranına yönlendirir).
- **`F3`:** Müşteriler Ekranına Git.
- **`F4`:** Envanter Ekranına Git.
- Bu kısayollar form tagleri (input, textarea) aktifken de çalışacak şekilde (`enableOnFormTags: true`) yapılandırılmıştır.

---

## 6. Barkod Tarama ve Yakalama Mekanizması

Barkod tarama sistemi, fiziksel ve kameraya dayalı okuma yöntemlerinin her ikisini de destekleyecek şekilde tasarlanmıştır:

### 6.1. Fiziksel Donanım Tarayıcı Desteği (`useGlobalBarcodeScanner.ts`)
- El tipi USB/Kablosuz barkod tarayıcılar bilgisayara bir klavye gibi davranır ve barkodu çok hızlı bir şekilde (genellikle karakter başına 10-30ms) yazıp sonuna `Enter` ekler.
- `useGlobalBarcodeScanner` kancası, sayfa üzerinde aktif bir input/textarea elemanı odaklanmış durumda *değilse* klavye girdilerini izler.
- Her tuş vuruşu arasındaki zaman aralığı 50ms'den küçükse karakterleri `barcodeBuffer` tamponuna ekler. Aksi takdirde tamponu sıfırlar (manuel yavaş yazımları eler).
- `Enter` tuşuna basıldığında tamponda veri varsa `onScan(barcode)` callback fonksiyonunu tetikler ve tamponu temizler.
- E2E testlerinde barkod okuma senaryolarını otomatize etmek için global pencere nesnesine `window.mockBarcodeScan(barcode)` fonksiyonu eklenmiştir.

### 6.2. Kamera Tabanlı Tarayıcı Modalı (`ScannerModal.tsx`)
- Kullanıcı kamera butonuna bastığında tetiklenir ve platforma göre farklı tarama motorları kullanır:
  - **Mobil Platformlar (Native):** `@capacitor-mlkit/barcode-scanning` eklentisi kullanılır. Kamera katmanının uygulamanın webview'inin altında çalışabilmesi için `document.body.classList.add('barcode-scanner-active')` sınıfı eklenerek webview'deki tüm arka planlar şeffaf hale getirilir. Okuma tamamlandığında sınıf kaldırılır.
  - **Web Tarayıcıları:** Tarayıcının native `BarcodeDetector` API'si varsa bu API kullanılır. Yoksa `@zxing/browser` kütüphanesi başlatılarak kameradan gelen görüntü akışı bir HTML5 `<video>` elementi üzerinde anlık olarak analiz edilir.
  - Okunan barkod envanterde eşleşirse ürün 1 adet sepete eklenir, eşleşmezse "Ürün Bulunamadı" uyarısı gösterilir ve tek tıklamayla yeni ürün ekleme ekranına yönlendirme butonu sunulur.
