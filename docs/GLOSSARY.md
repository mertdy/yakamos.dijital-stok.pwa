# Domain Glossary & Terminology

This document contains definitions for business concepts, internal naming conventions, and domain-specific terminology used throughout the Dijital Stok application.

---

## 💼 Business & Domain Concepts

### 1. POS (Point of Sale)
*   **Definition:** The digital checkout register where cashier builds a cart, applies discounts, checks customer credit limits, and collects payments.
*   **Internal Term:** *Satış Noktası*.

### 2. Held Sale / Suspended Cart
*   **Definition:** An active shopping cart that is paused and saved to local storage, allowing the cashier to clear the screen, process another customer, and resume the transaction later.
*   **Internal Term:** *Bekleyen Satış*.

### 3. Credit (Veresiye)
*   **Definition:** A payment method allowing a customer to buy products immediately and pay later. The transaction total is added to their accumulated debt.
*   **Internal Term:** *Veresiye*.

### 4. Credit Limit
*   **Definition:** The maximum amount of debt a customer is permitted to accrue. If a new credit sale pushes the customer's total debt beyond this limit, checkout is blocked.
*   **Internal Term:** *Kredi Limiti*.

### 5. Collection / Payment Receipt
*   **Definition:** A financial transaction where a customer pays off all or part of their outstanding debt. This transaction decrements the customer's total debt.
*   **Internal Term:** *Tahsilat*.

### 6. Revenue (Ciro)
*   **Definition:** The sum of all completed, non-cancelled sales within a specific period.
*   **Internal Term:** *Ciro*.

### 7. Average Order Value (AOV)
*   **Definition:** The average value of a single sales transaction, calculated as total revenue divided by the total count of invoices.
*   **Internal Term:** *Ortalama Sepet Tutarı*.

---

## 🛠️ Technical & Architecture Terms

### 1. Latency Compensation
*   **Definition:** A database synchronization pattern where database updates are immediately reflected in the local UI before the cloud database acknowledges the write, ensuring zero-latency transitions for the user.

### 2. Persistent Cache
*   **Definition:** Firestore's local client database cache. Stores documents on disk, enabling query lookups and offline write queueing.

### 3. Barrel Export
*   **Definition:** A file organization practice where a single `index.ts` file in a directory gathers and re-exports modules from internal subfolders, exposing a clean public API and preventing deep imports.

### 4. MLKit Barcode Scanning
*   **Definition:** Google's Machine Learning Kit wrapped via Capacitor plugins. Used on mobile devices (iOS/Android) to decode barcodes using hardware acceleration.

### 5. ZXing ("Zebra Crossing")
*   **Definition:** An open-source, multi-format 1D/2D barcode image processing library. Used as the web browser fallback to capture and parse barcode frames via the user's webcam.

### 6. Sync Indicator
*   **Definition:** A UI status component (`SyncIndicator.tsx`) displaying the current internet connectivity status and notifying the user whether their data is safely synced to the cloud or saved locally.
