# API & Database Integration Reference

This document covers all remote database operations (Cloud Firestore) and external HTTP integrations (Open Food Facts API).

---

## 💾 1. Cloud Firestore Database Schemas

Since this application utilizes the client-side Cloud Firestore SDK directly, backend interactions are modeled as queries, writes, and batches.

### Collections and Document Structure

#### `inventory` Collection
*   **Path:** `inventory/{productId}`
*   **Document Structure:**
    ```typescript
    interface InventoryItem {
      id: string;         // UUID (generated client-side)
      name: string;       // Name of the product
      stock: number;      // Current stock quantity
      price: number;      // Unit price
      barcode?: string;   // EAN/UPC barcode number
      sku?: string;       // Unique Stock Keeping Unit identifier
      imageUrl?: string;  // Product thumbnail image URL
      updatedAt: string;  // ISO-8601 string timestamp
      userId: string;     // Firebase User UID
    }
    ```

#### `customers` Collection
*   **Path:** `customers/{customerId}`
*   **Document Structure:**
    ```typescript
    interface Customer {
      id: string;           // UUID (generated client-side)
      name: string;         // First name
      surname?: string;     // Last name
      email?: string;       // Customer email
      phone?: string;       // Contact phone number
      creditLimit?: number; // Predefined limit for credit purchases
      totalDebt?: number;   // Current accumulated unpaid debt
      userId: string;       // Firebase User UID
      createdAt: string;    // ISO-8601 string timestamp
      updatedAt?: string;   // ISO-8601 string timestamp
    }
    ```

#### `sales` Collection
*   **Path:** `sales/{saleId}`
*   **Document Structure:**
    ```typescript
    interface Sale {
      id: string;                   // Firestore auto-generated document ID
      userId: string;               // Firebase User UID
      invoiceNumber: string;        // String format: INV-XXXXXX (derived client-side)
      customerId: string | null;    // Associated customer UUID or null
      subtotal: number;             // Sum of cart item values before discounts
      discount: number;             // Total discount amount applied
      discountType: 'amount' | 'percentage';
      discountValue: number;        // Raw input discount value
      totalAmount: number;          // Payable total (subtotal - discount)
      paymentMethod: 'Cash' | 'Card' | 'Scan' | 'Credit';
      status: 'Completed' | 'cancelled';
      createdAt: string;            // ISO-8601 string timestamp
      cart: {                       // Snapshot of items in the cart at checkout
        inventoryId: string;
        name: string;
        price: number;
        quantity: number;
        imageUrl?: string;
        barcode?: string;
      }[];
    }
    ```

#### `saleItems` Collection
*   **Path:** `saleItems/{itemId}`
*   **Document Structure:**
    ```typescript
    interface SaleItem {
      id: string;          // Firestore auto-generated document ID
      saleId: string;      // Associated sale document ID
      userId: string;      // Firebase User UID
      inventoryId: string; // Associated product document ID
      quantity: number;    // Quantity sold
      unitPrice: number;   // Price per unit at purchase time
    }
    ```

#### `payments` Collection
*   **Path:** `payments/{paymentId}`
*   **Document Structure:**
    ```typescript
    interface Payment {
      id: string;         // UUID (generated client-side)
      customerId: string; // Associated customer UUID
      userId: string;     // Firebase User UID
      amount: number;     // Payment value collected
      createdAt: string;  // ISO-8601 string timestamp
    }
    ```

---

## ⚡ 2. Atomic Multi-Document Transactions

To maintain data consistency, the application groups dependent mutations into Firestore Write Batches (`writeBatch`).

### Checkout Transaction (`checkout`)
When a sale is completed, a single batch:
1.  Creates a new sales record in `sales`.
2.  Creates multiple entries in `saleItems`.
3.  Decrements the stock of each purchased product in the `inventory` collection:
    ```typescript
    batch.update(doc(db, 'inventory', item.inventoryId), {
      stock: increment(-item.quantity),
      updatedAt: new Date().toISOString()
    });
    ```
4.  If `paymentMethod == 'Credit'`, increments the customer's debt in `customers`:
    ```typescript
    batch.update(doc(db, 'customers', customerId), {
      totalDebt: increment(totalAmount)
    });
    ```

### Refund/Cancellation Transaction (`cancelSale`)
When a transaction is cancelled, a single batch:
1.  Updates the sale document status:
    ```typescript
    batch.update(doc(db, 'sales', saleId), { status: 'cancelled' });
    ```
2.  Increments product stock back to original quantities.
3.  If the sale was credit-based, decrements the customer's debt by the refund amount:
    ```typescript
    batch.update(doc(db, 'customers', customerId), {
      totalDebt: increment(-totalAmount)
    });
    ```

### Payment Collection Transaction (`addPayment`)
When a customer pays off debt, a single batch:
1.  Creates a record in `payments`.
2.  Decrements the debt of the customer document:
    ```typescript
    batch.update(doc(db, 'customers', customerId), {
      totalDebt: increment(-amount)
    });
    ```

---

## 🌐 3. External API Integration (Open Food Facts)

*   **Endpoint:** `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
*   **Method:** HTTP GET
*   **Purpose:** Fetches metadata of commercial food items to accelerate inventory entry.
*   **Protocol:** Standard Fetch API.

### Response Data Mapping
Only responses with `status === 1` and containing a valid `product` object are mapped:

| Response Field | Destination Field |
| :--- | :--- |
| `product.product_name` | Form Product Name (`name`) |
| `product.image_front_url` \| `product.image_url` | Form Preview Image (`imageUrl`) |
| `product.brands` | Brand Card Component |
| `product.ingredients_text` | Ingredients Card Component |

---

## ⚙️ 4. Offline Capabilities & Cache Behavior

Firestore SDK caches all read queries locally. In case of network interruption:
*   **Reads:** Served instantly from the local cache. If offline, the SDK skips checking the cloud servers and returns local data immediately.
*   **Writes:** Queued in local cache memory.
*   **Retry & Queue Sync:** Firestore SDK automatically retries queued writes as soon as `navigator.onLine` fires true. Developers do not need to build retry/polling architectures.
