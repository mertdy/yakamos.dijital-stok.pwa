# Architectural Decision Log (ADR)

This document maps out key architectural decisions, their rationales, benefits, and associated tradeoffs.

---

## 1. Single Page Application (SPA) with Client-Side Rendering (CSR)

*   **Decision:** Run the application as a client-side rendered Single Page Application (SPA).
*   **Reason:** The app needs to run locally on mobile devices wrapped inside Capacitor webviews and function fully without an internet connection. Server-Side Rendering (SSR) would prevent offline capabilities and require a permanent active network.
*   **Benefits:**
    *   100% offline functionality.
    *   Immediate UI transitions with zero latency.
    *   Simple static asset distribution.
*   **Tradeoffs:**
    *   Higher initial bundle download size (resolved via PWA asset precaching).
    *   Lack of SEO (irrelevant since the application is an internal admin panel behind authentication).

---

## 2. State Management via Zustand 5

*   **Decision:** Use Zustand 5 for core state management over Redux or React Context.
*   **Reason:** Zustand provides a decoupled, global store that bypasses React's context re-render overhead. Unlike Redux, it has minimal boilerplate and supports selector-based subscription out of the box.
*   **Benefits:**
    *   High performance on POS screens with large transaction sizes.
    *   Simple React hook interface.
    *   Natively supports persistence middleware for suspending sales to local storage.
*   **Tradeoffs:**
    *   Does not enforce structured mutations (unlike Redux), requiring developers to be disciplined about where action logic is written.

---

## 3. Database Layer: Cloud Firestore with Native Offline Cache

*   **Decision:** Connect directly to Cloud Firestore from the client using persistent local cache configurations.
*   **Reason:** Writing a custom synchronization engine (e.g., using SQLite + web workers) is complex and prone to edge-case errors. Firestore provides a battle-tested offline-first synchronization engine out-of-the-box.
*   **Benefits:**
    *   **Zero Sync Code:** Writes (`setDoc`, `writeBatch`) are queued locally when offline and synced automatically when the connection is restored.
    *   **Latency Compensation:** Reads are immediately fulfilled from the local database cache and refreshed asynchronously.
*   **Tradeoffs:**
    *   **Vendor Lock-in:** Tied to the Firebase ecosystem.
    *   **Query Limitations:** Relational schemas must be denormalized, and complex queries require explicit index creation.

---

## 4. Native wrapper via CapacitorJS

*   **Decision:** Build native iOS and Android apps using CapacitorJS instead of React Native or Flutter.
*   **Reason:** The project's priority is to share 100% of the codebase, styling (Tailwind CSS v4), and business logic across Web, iOS, and Android. Capacitor enables compilation of standard web build folders into native containers without refactoring.
*   **Benefits:**
    *   Single codebase for Web, PWA, Android, and iOS.
    *   Integrates with native SDKs (e.g., Apple/Google MLKit for barcode scanning) via simple plugin bridges.
*   **Tradeoffs:**
    *   Performance is limited by the system's webview (though mitigated by modern device speed and hardware acceleration).

---

## 5. Global Keyboard Barcode Interceptor

*   **Decision:** Intercept global keyboard keypress events to capture physical scanner inputs.
*   **Reason:** Cashiers use hand-held scanners that act as USB/Bluetooth keyboard inputs. If a cashier has to click into a text box before scanning every item, the POS speed is severely hindered.
*   **Benefits:**
    *   Allows hands-free scanning on the POS screen.
    *   Automatically adds items to the cart or redirects to the inventory creation screen.
*   **Tradeoffs:**
    *   Must distinguish between typing (manual entries) and scanning (rapid automated inputs). Mitigated by measuring the elapsed time between keystrokes (must be under 50ms).
