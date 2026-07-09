# Project Conventions & Standards

This document outlines the coding standards, patterns, and conventions applied in the Dijital Stok codebase.

---

## 📂 1. Folder Organization

The codebase follows a modular, **feature-driven** architecture. Files are grouped by domain logic inside `src/features/` rather than by technical type:

```
src/features/feature-name/
├── api/             # HTTP requests or backend clients (if any)
├── components/      # UI components used only inside this feature
├── store/           # Zustand state files and Vitest unit tests
│   ├── useFeatureStore.ts
│   └── useFeatureStore.test.ts
├── views/           # Full screen views (route destinations) and tests
│   ├── FeatureView.tsx
│   └── FeatureView.test.tsx
└── index.ts         # Feature barrel export defining public API
```

---

## 🔗 2. Path Aliasing & Import Standards

*   **Mutlak İçe Aktarmalar (Absolute Imports):** Imports crossing different features or referring to the `shared/` or `core/` folders **must** use the `@/` path alias representing `src/` (e.g., `import { X } from '@/shared/components'`).
*   **Göreceli İçe Aktarmalar (Relative Imports):** Inside the *same* feature or subfolder, files **must** use relative imports (`./` or `../`) to prevent circular compiler dependencies.
*   **Barrel Exports (index.ts):**
    *   Features must expose their public components, stores, and hooks through a root `index.ts` file.
    *   Cross-feature deep importing (e.g., `@/features/sales/store/useSalesStore`) is strictly forbidden. Always import from the feature root (e.g., `import { useSalesStore } from '@/features/sales'`).

---

## 🏗️ 3. React & Hook Conventions

*   **Explicit Imports:** Do not call React hooks using namespace patterns (e.g., `React.useCallback`). Always import hooks directly from the React package:
    ```typescript
    import { useState, useEffect, useCallback } from 'react';
    ```
*   **Component Structure:** Declare components using `const` arrow functions with typing wrappers where appropriate:
    ```typescript
    export const ProductList: React.FC = () => { ... }
    ```
*   **Hook File Naming:** Custom hooks must start with the `use` prefix (e.g., `useGlobalBarcodeScanner.ts`) and must reside in the directory where they are consumed, or in `src/shared/hooks/` if shared across features.

---

## 📦 4. State Management (Zustand)

*   **Feature Stores:** Stores should be placed in `src/features/feature-name/store/`.
*   **Logout Lifecycle:** Every store must expose a `clearX` function. The `useAuthStore`'s `logout` action must explicitly call all secondary stores' clear functions to purge cached values on user logout.
*   **Select Caching:** When persisting state (using Zustand's `persist` middleware), configure a `partialize` filter to cache only variables that require persistence (e.g., `heldSales` array), keeping active state objects (e.g., `cart`) strictly in-memory.

---

## 🎨 5. Styling & HeroUI Modals

*   **Style Framework:** Tailwind CSS v4 is used for layout structure and coloring.
*   **Design Tokens:** The design follows Google Material Design 3 guidelines:
    *   Main outer cards: `rounded-[28px]`
    *   Form inputs: `rounded-2xl`
    *   Action buttons: `rounded-full`
*   **Modal Hierarchies:** HeroUI's `<Modal>` wrappers must respect the following exact hierarchy, keeping the close trigger as the direct first child of the `<Modal.Dialog>`:
    ```tsx
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>...</Modal.Header>
            <Modal.Body>...</Modal.Body>
            <Modal.Footer>...</Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
    ```

---

## 🛡️ 6. TypeScript & Type Safety

*   Strict mode is enabled. Avoid using `any` unless absolutely necessary (such as mocking DOM APIs during tests).
*   Interfaces should represent database documents, and Zod schemas should be used for user input forms.
*   Types/Interfaces should be defined alongside files where they are primarily consumed, or exported from store/index definitions if shared.

---

## 🧹 7. Linting, Formatting, & Git Hooks

*   **Linting:** ESLint is configured. Usage of `// eslint-disable-*` comments is forbidden. Rules must be updated in `eslint.config.js` or code refactored if validation rules fail.
*   **Formatting:** Prettier writes are applied before committing.
*   **Husky Hooks:** pre-commit hooks invoke `lint-staged`, which runs eslint and prettier against modified files automatically.
