# Sistem Tasarım Dokümanı (Design Document) - Dijital Stok

## 1. Mimari Genel Bakış

Dijital Stok uygulaması, modern web teknolojilerini native platformlara taşıyan hibrid bir mimari üzerine kurulmuştur. **"Offline-First"** (Çevrimdışı Öncelikli) yaklaşım benimsenerek sistem mimarisi aşağıdaki temellere oturtulmuştur:

- **Frontend Core:** React, Vite, TypeScript
- **UI & Styling:** Tailwind CSS v4, HeroUI v3, Framer Motion
- **Form Management:** React Hook Form, Zod
- **State Management:** Zustand (Persist middleware)
- **Local Database:** SQLite (Senkronizasyon kuyruğu ile)
- **Native Wrapper:** CapacitorJS

## 2. Veri Mimarisi ve State Yönetimi (Zustand & SQLite)

### 2.1. Store Yapısı

- **`useInventoryStore`**: Envanterdeki ürünleri, ürün ekleme, çıkarma, düzenleme mantıklarını yönetir. Veritabanı okuma-yazma işlemlerini tetikler.
- **`useSalesStore`**: Mevcut sepet durumunu, sepete eklenen ürünleri, fiyat/indirim (Tutar/Yüzde bazlı) hesaplamalarını ve ödeme (`checkout`) iş akışını yönetir. Ayrıca **Bekleyen Satışları (Held Sales)** persist middleware kullanarak yerel önbellekte saklar ve checkout anında stok işlemlerini tetikler.
- **`useCustomerStore`**: Müşteri verilerini (Ad, telefon, borç durumu, kredi limiti) yönetir, form doğrulama işlemlerinden sonra yeni müşteri yaratma ve düzenleme iş akışlarını SQLite'a yazar.

### 2.2. Yerel Veritabanı (SQLite) Şeması (Konseptüel)

- **Products Table:** `id` (UUID), `barcode` (String), `name` (String), `price` (Float), `stock` (Int), `created_at` (Timestamp), `updated_at` (Timestamp), `sync_status` (Enum: SYNCED, PENDING, ERROR).
- **Sales Table:** `id` (UUID), `customer_id` (UUID - Nullable), `total_amount` (Float), `discountType` (String), `discountValue` (Float), `items_snapshot` (JSON), `created_at` (Timestamp), `sync_status` (Enum: PENDING).
- **Customers Table:** `id` (UUID), `name` (String), `surname` (String), `phone` (String), `creditLimit` (Float), `totalDebt` (Float), `created_at` (Timestamp), `updated_at` (Timestamp).

### 2.3. Senkronizasyon (SyncWorker)

- Offline modda yapılan tüm işlemler veritabanına `sync_status = PENDING` olarak kaydedilir.
- `SyncWorker` bir EventListener vasıtasıyla veya düzenli bir polling aralığıyla `navigator.onLine` durumunu kontrol eder. Bağlantı var ise kuyruktaki işlemleri ana API'ye iletir.

## 3. UI ve Bileşen Hiyerarşisi (Component Tree)

### 3.1. Routing & Layout

- `App.tsx` (Zustand Providerları, HeroUIProvider)
  - `MainLayout` (Ekranın solunda masaüstü Sidebar, mobilde Bottom Navigation)
    - `/sales`: `SalesView` (Sol: `ProductList` ve `ScannerModal`, Sağ: `InvoicePanel`, Çekmeceler: `CustomerDrawer`, `HeldSalesDrawer`)
    - `/inventory`: `InventoryView` (Üst: Arama/Yeni Ürün, Alt: `InventoryTable`, Popup: `ProductFormModal`)
    - `/customers`: `CustomerListView` (Müşteri Listesi)
    - `/customers/new`, `/customers/edit/:id`: `CustomerFormView` (Müşteri oluşturma ve düzenleme formu)

### 3.2. Animasyonlar ve Etkileşim

- **Çekmeceler (Drawers):** `CustomerDrawer` ve `HeldSalesDrawer` bileşenleri `framer-motion` kütüphanesinin `<AnimatePresence>` bileşeni ile sarmalanmış olup, giriş ve çıkış anlarında "Slide-in-right" ve "Fade-in" pürüzsüz animasyonlarına sahiptir.

### 3.3. Google Material Design 3 Adaptasyonu

- Tailwind v4 yapılandırması CSS üzerinden yapılmıştır (`index.css`).
- Değişkenler:
  - `--color-primary`: `#1a73e8` (Google Blue)
  - `--color-background`: `#f8f9fa` (Google Gray/White)
- Ortak UI Elementleri: Ana kartlar (`rounded-[28px]`), Form inputları (`rounded-2xl`), Aksiyon Butonları (`rounded-full`).

## 4. Harici Entegrasyonlar ve Cihaz Donanımları

### 4.1. Barkod Tarayıcı (Scanner) Yaklaşımı

İki farklı senaryo desteklenmektedir:

1. **Mobil (Capacitor MLKit):** `BarcodeScanner.startScan()` çağrılır. Kamera UI altında çalışır, bu yüzden React uygulamasının gövdesine (`document.body`) `barcode-scanner-active` sınıfı eklenerek tüm zemin şeffaflaştırılır.
2. **Web Fallback (ZXing):** `<video>` elementi kullanılarak tarayıcının `navigator.mediaDevices.getUserMedia` yetkisi ile kamera stream'i ekrana yansıtılır.

### 4.2. Open Food Facts API

- Yeni bir ürün ekleneceğinde barkod kutusu yanındaki arama ikonuna basılır.
- **Endpoint:** `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Response Map:**
  - `product.product_name` -> Form İsim
  - `product.image_url` -> Ürün Görseli Kartı
  - `product.ingredients_text` -> İçindekiler Kartı
  - `product.brands` -> Marka Kartı
- Güvenlik: Veri dışarıdan geldiği için hata yönetimi yapılmış ve kullanıcıya bu verileri kaydetmeden önce düzenleme/reddetme şansı verilmiştir.
