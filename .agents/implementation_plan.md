# HeroUI Button Migration Plan

## Goal Description
Uygulama genelinde kullanılan özel `Button` (`src/shared/components/Button.tsx`) bileşenini kaldırıp, yerine uygulamanın her yerinde standart **HeroUI Button** (`import { Button } from '@heroui/react'`) bileşenini kullanacağız. Bu sayede kod tekrarından kurtulacak, erişilebilirlik standartlarını iyileştirecek ve uygulamanın tutarlı bir tasarım dili (HeroUI) kullanmasını sağlayacağız.

## Prop Dönüşüm Haritası:
- `variant="primary"` ➡️ `color="primary" variant="solid"`
- `variant="secondary"` ➡️ `color="secondary" variant="solid"` (Kullanıcı onayıyla HeroUI standart rengi kullanılıyor)
- `variant="danger"` ➡️ `color="danger" variant="solid"`
- `variant="ghost"` ➡️ `color="default" variant="light"` 
- `variant="outline"` ➡️ `color="primary" variant="bordered"`
- `variant="surface"` ➡️ `color="primary" variant="flat"`
- `size="icon"` ➡️ `isIconOnly={true}`
- `leftIcon={...}` ➡️ `startContent={...}`
- `rightIcon={...}` ➡️ `endContent={...}`
- `disabled={true}` ➡️ `isDisabled={true}`
- `onClick={...}` ➡️ `onPress={...}` (HeroUI standartlarına uygunluk için)

## Proposed Changes

### Özel Button Bileşeninin Silinmesi
#### [DELETE] [Button.tsx](file:///Users/mertdy/Desktop/dijital-stok/src/shared/components/Button.tsx)

### Mevcut Kullanımların Güncellenmesi
Uygulama içerisindeki aşağıdaki dosyalar dahil toplam 18 noktada import'lar `import { Button } from '@heroui/react';` olarak değiştirilecek ve eski proplar yukarıdaki haritaya göre dönüştürülecektir.

#### Auth & Layout
- `src/features/auth/views/LoginView.tsx`
- `src/shared/layouts/MainLayout.tsx`

#### Customers (Müşteriler)
- `src/features/customers/components/CustomerDrawer.tsx`
- `src/features/customers/components/PaymentModal.tsx`
- `src/features/customers/views/CustomerDetailView.tsx`
- `src/features/customers/views/CustomerFormView.tsx`
- `src/features/customers/views/CustomerListView.tsx`

#### Inventory (Envanter)
- `src/features/inventory/components/InventoryTable.tsx`
- `src/features/inventory/views/InventoryView.tsx`
- `src/features/inventory/views/ProductFormView.tsx`

#### Sales & History (Satış ve Geçmiş)
- `src/features/sales-history/components/SalesHistoryFilters.tsx`
- `src/features/sales-history/components/SalesHistoryList.tsx`
- `src/features/sales/components/CartPanel.tsx`
- `src/features/sales/components/HeldSalesDrawer.tsx`
- `src/features/sales/components/InvoicePanel.tsx`
- `src/features/sales/components/QuickAddEditModal.tsx`
- `src/features/sales/components/ScannerModal.tsx`

#### Contexts
- `src/shared/contexts/ConfirmDialogContext.tsx`

## Verification Plan
### Automated Tests
- İşlemler bittikten sonra Typescript denetimi için `npx tsc -b` çalıştırılacaktır.
- Uygulamanın hatasız build edildiğini doğrulamak için `pnpm build` komutu çalıştırılacaktır.

### Manual Verification
- Eski `Button` bileşenine ait hiçbir referansın kalmadığından emin olunacaktır.
- Sizden ekranları dolaşıp buton tasarımlarının istendiği gibi göründüğünü kontrol etmeniz istenecektir.
