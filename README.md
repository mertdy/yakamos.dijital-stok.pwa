# Dijital Stok ve Satış Sistemi

Dijital Stok, işletmelerin envanterlerini, müşteri borçlarını ve satış geçmişlerini kolayca takip etmelerini sağlayan, **mobil uyumlu (PWA)** ve modern arayüze sahip bir stok ve satış yönetim sistemidir.

## Özellikler

- **Satış Yönetimi (POS):** Hızlı ürün arama, sepete ekleme, nakit/kredi kartı/veresiye satış opsiyonları.
- **Müşteri ve Veresiye Takibi:** Müşteriye özel kredi limiti tanımlama, borç tahsilatı ve ödeme geçmişi.
- **Envanter (Stok) Yönetimi:** Ürün ekleme, düzenleme, stok güncelleme ve barkod ile hızlı satış.
- **Barkod Okuma (Kamera Desteği):** Mobil cihaz kamerasıyla Capacitor barkod eklentisi kullanarak direkt barkod okutma.
- **Raporlama:** Günlük, haftalık, aylık satış istatistikleri ve en çok satan ürünler analizi (Chart.js tabanlı grafikler).
- **Satış Bekletme (Askıya Alma):** İşlem sırasındaki sepeti beklemeye alma ve daha sonra geri yükleme.
- **Fatura Yazdırma:** Gerçekleşen siparişlerin faturasını / fişini tarayıcı üzerinden yazdırabilme.

## Kullanılan Teknolojiler

- **Frontend Core:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **UI & Stil:** [Tailwind CSS 4](https://tailwindcss.com/), [HeroUI (Eski NextUI)](https://heroui.com/)
- **State Yönetimi:** [Zustand](https://github.com/pmndrs/zustand)
- **Mobil/Native Entegrasyon:** [Capacitor](https://capacitorjs.com/) (MLKit Barkod Tarama eklentisi)
- **PWA (Progressive Web App):** Vite PWA Plugin ile çevrimdışı önbellekleme yeteneği.
- **Test:** [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Lint & Code Formatting:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Husky](https://typicode.github.io/husky/)

## Kurulum ve Yerelde Çalıştırma

Projeyi yerel ortamınızda ayağa kaldırmak için Node.js ve pnpm yüklü olmalıdır.

1. Bağımlılıkları yükleyin:
   ```bash
   pnpm install
   ```

2. Geliştirme sunucusunu başlatın:
   ```bash
   pnpm dev
   ```

3. Üretim (Production) derlemesi almak için:
   ```bash
   pnpm build
   ```

4. PWA (Production) halini yerelde önizlemek için:
   ```bash
   pnpm preview
   ```

## Test ve Lint Kontrolleri

Kod standartlarını korumak için Husky ile pre-commit kancaları ayarlanmıştır. Çalıştırmak için:

- **ESLint hatalarını denetleme:**
  ```bash
  pnpm lint
  ```

- **Birim (Unit) testleri çalıştırma:**
  ```bash
  pnpm test
  ```

## Klasör Yapısı

```
src/
├── app/          # Temel uygulama ayarları ve giriş noktası (main.tsx)
├── assets/       # Statik dosyalar, logolar ve resimler
├── features/     # Her bir modül (auth, inventory, sales, customers, vb.)
├── shared/       # Ortak kullanılan bileşenler, contextler ve kancalar
└── store/        # Zustand mağazaları (stores)
```
