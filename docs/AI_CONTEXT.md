# AI Context & Knowledge Base

This document serves as a developer guide and context parameter catalog for future AI coding agents. It aims to prevent context loss and maintain consistent development practices.

---

## 🧭 Project Intent & Architecture At a Glance

*   **Objective:** SME Inventory and Point of Sale (POS) application.
*   **Architecture:** Client-Side Single Page Application (SPA), Offline-First.
*   **Core Stack:** React 19, TypeScript 6, Vite 8, Zustand 5, Tailwind CSS v4, HeroUI v3, Cloud Firestore (direct client connection).
*   **Mobile Wrapper:** CapacitorJS. Web code compiled and loaded locally inside device webviews.

---

## 🛡️ Critical Constraints & Assumptions

### 1. User Data Isolation
All collection reads and writes must be isolated per logged-in user. You **must** append a query filter matching the authenticated user's ID on all reads:
```typescript
where('userId', '==', user.uid)
```
Do not write modifications or queries that pull documents globally without user-scoped isolation filters.

### 2. Native Eklenti Koruyucuları (Capacitor Safety on Web)
Capacitor hardware plugins (such as MLKit barcode scanning and Firebase Crashlytics) throw `CapacitorException: Not implemented on web` when executed in browsers.
*   **Rule:** Always wrap calls to native-only APIs inside a platform check:
    ```typescript
    if (Capacitor.isNativePlatform()) {
      await FirebaseCrashlytics.setEnabled({ enabled: true });
    }
    ```

### 3. State Purge on Logout
When a user logs out, all store memory and client caches must be wiped to prevent session bleed:
*   **Rule:** If adding a new Zustand store, ensure it implements a `clear` action and register it inside `useAuthStore.ts`'s `logout` sequence.

---

## ⚡ Essential Coding Patterns

### 1. Barrel Imports
*   Features resides inside `src/features/`. Cross-feature imports **must** go through the feature's public root barrel export:
    ```typescript
    // Correct
    import { SalesView } from '@/features/sales';

    // Forbidden
    import { useSalesStore } from '@/features/sales/store/useSalesStore';
    ```
*   Feature internal code **must** use relative paths (`./` or `../`) and avoid calling its own barrel entry points to prevent circular dependency compiler loops.

### 2. React Hook Imports
*   Do not call React hooks on the `React` namespace. Direct imports only:
    ```typescript
    // Correct
    import { useState, useCallback } from 'react';

    // Forbidden
    const [state, setState] = React.useState();
    ```

### 3. HeroUI Modals Hiyerarşisi
Modals must strictly implement the standard hierarchy. The `<Modal.CloseTrigger />` **must** be the direct first child of `<Modal.Dialog>`:
```tsx
<Modal isOpen={isOpen}>
  <Modal.Backdrop>
    <Modal.Container>
      <Modal.Dialog>
        <Modal.CloseTrigger />
        <Modal.Header>Title</Modal.Header>
        <Modal.Body>Body Content</Modal.Body>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>
</Modal>
```

---

## ⚠️ Common Pitfalls & Anti-Patterns

1.  **Statically Exporting Lazy Components:**
    Vite throws bundling warnings if a file is dynamically loaded in one place but statically exported in a feature's public barrel `index.ts`. If a modal (like `ScannerModal`) is lazy-loaded, do not export it in the feature's root barrel.
2.  **Hardcoded Configurations:**
    Never hardcode Firebase configs or keys. Always load settings from `src/core/config/env.ts`.
3.  **eslint-disable Comments:**
    Inline eslint-disable comment lines are blocked. Refactor the code or modify the root `eslint.config.js` config.

---

## 🔍 Essential Files to Read Before Making Major Changes

1.  **[.agents/AGENTS.md](file:///Users/mertdy/Desktop/dijital-stok/.agents/AGENTS.md):** The master project rules file. Must be followed at all times.
2.  **[src/core/firebase/config.ts](file:///Users/mertdy/Desktop/dijital-stok/src/core/firebase/config.ts):** Persistence cache and Firebase configurations.
3.  **[src/features/sales/store/useSalesStore.ts](file:///Users/mertdy/Desktop/dijital-stok/src/features/sales/store/useSalesStore.ts):** Renders write batches for POS checkout.
4.  **[src/features/sales-history/store/useSalesHistoryStore.ts](file:///Users/mertdy/Desktop/dijital-stok/src/features/sales-history/store/useSalesHistoryStore.ts):** Contains sales cancellation rollback logic.
