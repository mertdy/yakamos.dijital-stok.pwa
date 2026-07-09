# Project Roadmap & Technical Debt

This roadmap tracks completed functionality, known technical debt, and future development opportunities.

---

## ✅ Completed Work

*   **Authentication:** Firebase Auth integration supporting Email/Password (with verification emails) and Google Sign-in.
*   **Inventory Ledger:** Complete CRUD, image handling, barcode lookups, search filtering, and integration with the Open Food Facts API.
*   **POS Module:** Cart line management, multi-payment type settlement (Cash, Card, QR, Credit), discount systems, and hardware barcode interceptors.
*   **Suspended Sales:** LocalStorage queue persistence enabling cashiers to hold and resume active transactions.
*   **Customer Accounts:** Credit line limits, payment collection inputs, and chronological audit ledgers showing all sales and collection history.
*   **Sales History & Refunds:** Atomic transaction rollbacks that restore stock and cancel debts.
*   **Analytics Dashboard:** Period-filtered chart visualization, finance KPI cards, and low-stock alerts.
*   **Cross-Platform Builds:** Web PWA config + iOS/Android Capacitor build setup.
*   **Testing:** 110+ Vitest unit/integration coverage tests and Playwright E2E configurations.

---

## ⚠️ Technical Debt

1.  **Ineffective Dynamic Import Warning:**
    *   *Issue:* Vite output reports: `src/features/sales/components/ScannerModal.tsx is dynamically imported by SalesView.tsx but also statically imported by sales/index.ts`.
    *   *Impact:* Prevents proper code splitting, packing the scanner dependencies into the main chunk.
    *   *Fix Required:* Refactor the public barrel exports (`src/features/sales/index.ts`) so lazy-loaded modals are excluded from the main entry bundle.
2.  **Large Client Bundle Size:**
    *   *Issue:* The main compiled asset exceeds 2.7MB.
    *   *Impact:* Slower initial page load speeds on mobile networks when launching the app for the first time.
    *   *Fix Required:* Implement strict code-splitting for routes and replace heavy libraries with lighter alternatives.
3.  **Heavy Charting Libraries:**
    *   *Issue:* Chart.js adds substantial weight to the initial javascript execution bundle.
    *   *Fix Required:* Lazy-load charting libraries in the dashboard view, loading components only when they enter the viewport.

---

## 🔮 Future Opportunities & Missing Modules

### 1. Multi-Register & Cashier Accounts (Multi-Tenant)
*   Allow a business owner (admin) to spawn multiple cashier accounts under the same merchant profile.
*   Track sales statistics and register shifts per individual cashier.

### 2. Native ESC/POS Printing
*   *Current state:* Receipts are printed using `react-to-print` which invokes the browser print dialog. This does not work natively on mobile platforms.
*   *Improvement:* Integrate Capacitor Bluetooth/USB plugins to send raw ESC/POS commands directly to thermal roll printers.

### 3. Bulk CSV / Excel Import & Export
*   Add a feature to bulk upload product catalogs via CSV or Excel sheets.
*   Allow exporting inventory lists, customer ledgers, and sales logs to spreadsheets.

### 4. Advanced Tax & Category Settings
*   Support setting custom VAT/tax rates per product or product category.
*   Generate tax reports suitable for accounting software.

### 5. Multi-Language Support (Localization)
*   Extract hardcoded Turkish strings into localization files (`i18next`) to support English and other languages.
