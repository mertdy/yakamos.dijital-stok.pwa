# Project Structure Directory Catalog

This document catalogues the directory structure of the Dijital Stok codebase, detailing the responsibility of each folder and its contents.

---

## 📁 Root Folders

*   **`.agents/`:** Houses AI-agent specific configurations. Contains the global rule file (`AGENTS.md`) and copies of local implementation plans, task checklists, and walkthroughs to preserve AI alignment.
*   **`.github/workflows/`:** CI pipelines. Contains `ci.yml` which automates code style checks (Prettier), syntax checks (ESLint), unit testing (Vitest), and builds on Node.js v24.
*   **`dist/`:** Output folder containing the minified, compiled, ready-to-deploy static web assets.
*   **`docs/`:** Holds technical markdown documentation.
*   **`e2e/`:** E2E Playwright integration tests.
*   **`public/`:** Root static files that bypass the Vite asset pipeline. Contains `manifest.webmanifest`, app logos, and PWA favicon resources.
*   **`src/`:** The application source code folder.

---

## 📁 Source Folder Breakdown (`src/`)

### 1. `src/app/`
Contains the application entry points and core styles:
*   `App.tsx`: Controls the root router, initializes auth listener wrappers (`onAuthStateChanged`), and routes endpoints to Views.
*   `main.tsx`: Boots React, sets up standard I18n providers, and triggers initial analytical tracking and Crashlytics configurations.
*   `index.css`: Tailwind CSS imports, global themes, and Material 3 design override variables.

### 2. `src/core/`
Central initialization files:
*   `core/config/env.ts`: Loads and validates environment variables with fallbacks.
*   `core/firebase/config.ts`: Configures Firebase App, Auth providers, and registers Firestore with `persistentLocalCache` and multi-tab persistent managers.

### 3. `src/features/`
Feature-driven domains. Each domain directory represents an independent boundary.

| Feature Directory | Scope / Responsibility | Main Files |
| :--- | :--- | :--- |
| `auth/` | Session creation, registration, and user auth views. | `LoginView.tsx`, `useAuthStore.ts` |
| `dashboard/` | KPI statistics cards, ciro lines, low-stock notifications. | `DashboardView.tsx`, `useDashboardStats.ts` |
| `inventory/` | Product list, product forms, and Open Food Facts lookups. | `InventoryView.tsx`, `ProductFormView.tsx`, `useInventoryStore.ts` |
| `sales/` | Interactive POS register, active cart lines, barcode scanners. | `SalesView.tsx`, `CartPanel.tsx`, `InvoicePanel.tsx`, `useSalesStore.ts` |
| `sales-history/` | Filterable invoice logs, cancellation rollbacks. | `SalesHistoryView.tsx`, `useSalesHistoryStore.ts` |
| `customers/` | Credit ledger list, card views, payment collectors. | `CustomerListView.tsx`, `CustomerDetailView.tsx`, `useCustomerStore.ts` |

### 4. `src/shared/`
Cross-feature code reused globally:
*   `shared/components/`: Houses UI elements used across multiple features (e.g., `SyncIndicator.tsx`).
*   `shared/contexts/`: Global contexts like `ConfirmDialogContext.tsx` which exposes confirmation modals.
*   `shared/hooks/`:
    *   `useAppHotkeys.ts`: Binds keyboard shortcuts (F1-F4) globally.
    *   `useDebounce.ts`: Limits query frequencies.
    *   `useGlobalBarcodeScanner.ts`: Keyboard event listener capturing physical barcode hardware input rates.
*   `shared/layouts/`: Layout layouts. Houses `MainLayout.tsx` which implements the responsive responsive side navigation bar.
