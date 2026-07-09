# Product Features Guide

This guide documents every core user-facing and technical feature implemented in the Dijital Stok application.

---

## 📊 1. Dashboard (Analytics & Insights)

### Purpose
Provides administrators with a high-level summary of their financial performance, sales volume, top products, payment trends, and critical stock warnings.

### User Flow
1.  User logs in and is greeted by the Dashboard page.
2.  User views metrics (revenue, transactions, average order value, customer debt).
3.  User changes the period filter (7D, 14D, 30D, THIS_MONTH, 6M, THIS_YEAR) to update charts and top lists.
4.  User checks the low-stock panel to identify items requiring reordering.

### Key Components
*   `DashboardView.tsx`: Main view structure wrapping stats cards, charts, and tables.
*   `useDashboardStats.ts`: Calculates revenue groupings, averages, top-selling items, and filters based on timeframes.

### Dependencies
*   `chart.js` & `react-chartjs-2` for rendering line and donut graphs.
*   `dayjs` for timezone and date range arithmetic.

---

## 📦 2. Inventory Management

### Purpose
Allows administrators to maintain a detailed catalog of items, including stock counts, sales prices, barcodes, and SKU codes.

### User Flow
1.  User navigates to `/inventory` to search and filter products by name or barcode.
2.  User clicks "Yeni Ürün Ekle" to open the form.
3.  *Optional:* User clicks the barcode scanner icon, scans a physical product. If the product is found in the **Open Food Facts API**, its name, brand, image, and ingredients are pre-populated.
4.  User completes required fields (name, price, stock) validated by Zod and saves the item.

### Key Components & Views
*   `InventoryView.tsx`: Product list layout with debounced search bar.
*   `InventoryTable.tsx`: Table wrapper built using `@tanstack/react-table`.
*   `ProductFormView.tsx`: Form for adding and updating products. Handles Open Food Facts API searches.

### Related APIs
*   **Open Food Facts API:** `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json`

### Edge Cases & Known Limitations
*   *Edge Case:* If Open Food Facts returns no product details, the app gracefully falls back to empty fields without throwing errors.
*   *Limitation:* Since Firestore operates offline, external API lookups will fail if there is no active internet connection.

---

## 🛒 3. Point of Sale (POS) & Cart

### Purpose
Fast-paced interface for adding items to a cart, entering discounts, assigning transactions to customers, and completing transactions.

### User Flow
1.  User enters the Sales page (`/sales`).
2.  User searches for products, clicks them from the quick-add list, or scans their barcodes.
3.  User enters an optional fixed or percentage discount.
4.  User selects a customer if doing a credit (veresiye) sale.
5.  User selects the payment method (Cash, Card, QR, Credit).
6.  User clicks "Ödemeyi Al" to complete the sale, update stock, and optionally print a receipt.

### Key Components & Views
*   `SalesView.tsx`: Three-column POS container.
*   `CartPanel.tsx` / `OrderDetailsPanel.tsx`: Manage active cart lines, quantities, and removal.
*   `InvoicePanel.tsx`: Calculates totals, applies discounts, verifies credit limits, and processes checkout.
*   `ReceiptTemplate.tsx`: 80mm styled thermal paper invoice printable via browser layout wrappers.

### Edge Cases & Validation
*   *Percentage Discounts:* Limited strictly to the range `[-100, 100]` via `InvoicePanel.tsx` validations.
*   *Credit Limit Violations:* If the payment method is set to "Credit" and the customer's current debt + the cart total exceeds their credit limit, checkout is disabled.

---

## ⏸️ 4. Suspended Sales (Hold/Resume)

### Purpose
Allows cashier to temporarily put a customer's cart on hold (e.g., if a customer forgets their wallet) to serve another customer, and resume the transaction later.

### User Flow
1.  User has items in their active cart.
2.  User clicks "Beklet" (Pause) in the Invoice Panel.
3.  The cart, discounts, and customer states are saved to the hold list; active cart is cleared.
4.  Later, the user opens the "Bekleyen Satışlar" (Suspended Sales) drawer.
5.  User clicks "Geri Yükle" on a held sale to reload it into the active cart, or deletes it.

### Key Components
*   `HeldSalesDrawer.tsx`: Sidebar drawer showing list of suspended transactions with timestamps.
*   Zustand `useSalesStore` actions: `holdSale`, `restoreSale`, `removeHeldSale`.

### Caching
*   Suspended sales are saved in the browser's `localStorage` via Zustand persist middleware under the key `sales-storage`.

---

## ⌨️ 5. Global Barcode Interceptor

### Purpose
Enables immediate barcode scanning from any page without needing to focus on an input box, allowing physical hardware scanners (which emulate USB keyboards) to trigger actions.

### User Flow
1.  User is on `/sales` or `/inventory/new` with no inputs focused.
2.  User pulls the trigger on a physical hardware scanner pointing to a barcode.
3.  The scanner rapidly inputs the characters and appends an `Enter` key.
4.  The system interceptor captures this, identifies the barcode, and automatically adds the item to the cart or fills the form.

### Key Scripts / Hooks
*   `useGlobalBarcodeScanner.ts`: Global keyboard event listener.
*   Measures interval between keypresses; if under 50ms, buffers input.
*   Provides `window.mockBarcodeScan(barcode)` global method for E2E testing environments.

---

## 👥 6. Customer Management & Debt Ledger

### Purpose
Maintains customer profiles, manages veresiye credit lines, and allows logging payments/tahsilat.

### User Flow
1.  User adds a new customer with a designated Credit Limit.
2.  When completing a POS sale using "Credit", the sale total is added to the customer's total debt.
3.  User visits the customer's detail view (`/customers/details/:id`) to see total debt, limit progress bars, and historical movements.
4.  User clicks "Tahsilat Al" (Collect Payment), enters the payment amount, and registers the transaction. The customer's debt is decremented.

### Key Components & Views
*   `CustomerListView.tsx`: Table listing all customers.
*   `CustomerDetailView.tsx`: Unified transaction history combining Credit Sales and Payments.
*   `PaymentModal.tsx`: Input modal for payment collections.

---

## 📜 7. Sales History & Cancellation (Refunds)

### Purpose
Provides a log of completed sales transactions and allows administrators to cancel/refund them.

### User Flow
1.  User visits `/sales-history` to view past invoices.
2.  User uses the filter panel to narrow down invoices by date, customer, payment method, or amount.
3.  User selects a transaction and clicks "Satışı İptal Et".
4.  Upon confirmation, the transaction is marked as cancelled, the products are returned to the inventory stock, and the customer's debt is decremented if the sale was veresiye.

### Key Components & Logic
*   `SalesHistoryView.tsx` / `SalesHistoryList.tsx`: Filters and table.
*   `useSalesHistoryStore.ts` action `cancelSale`: Executes an atomic Firestore `writeBatch` that rolls back all database states to preserve data integrity.
