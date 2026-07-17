# Dijital Stok (Digital Inventory & POS)

Dijital Stok is a modern, mobile-friendly (PWA) inventory and Point of Sale (POS) management system designed for Small and Medium Enterprises (SMEs). Built with an **Offline-First** architecture, it allows businesses to track products, manage customer debts, handle barcodes, and complete sales transactions seamlessly even when there is no internet connection.

---

## 🚀 Key Features

- **Point of Sale (POS):** Fast-paced sales interface with real-time barcode interceptor, held/suspended sales, and multi-method payment support (Cash, Card, QR, Credit/Veresiye).
- **Inventory Management:** Track items, prices, stock levels, and automatically retrieve product metadata (name, brand, image, ingredients) via the external Open Food Facts API when scanning unregistered barcodes.
- **Customer & Debt Ledger:** Customer accounts with customizable credit limits, debt accrual for credit sales, payment collections, and unified transaction history.
- **Sales History & Cancellation:** List of past transactions with deep client-side filtering and a single-batch transaction cancellation logic that reverts stock and customer debts.
- **Analytics Dashboard:** Metrics (revenue, order counts, average order value, total outstanding debt), ciro charts, low stock alerts, and top-selling/revenue lists.
- **Offline-First & Auto Sync:** Native offline support powered by Cloud Firestore's persistent cache. Displays network connectivity states ("Online" vs "Offline") via a dynamic sync indicator.
- **Cross-Platform Support:** Ready to run as a Web PWA or wrapped as a native iOS/Android application via CapacitorJS.

---

## 🛠️ Main Technologies

- **Frontend Core:** React 19 (React-DOM 19), TypeScript 6, Vite 8
- **UI & Styling:** Tailwind CSS v4, HeroUI v3 (formerly NextUI), Framer Motion 12, Lucide Icons
- **State Management:** Zustand 5 (with persist middleware for local storage caching)
- **Database & Auth:** Cloud Firestore, Firebase Auth
- **Native & Hardware Integrations:** CapacitorJS (with MLKit Barcode Scanning and Capacitor Network plugins), ZXing Browser (for web camera scanning)
- **Testing:** Vitest, React Testing Library

---

## 📦 Folder Structure

An overview of the project's folder layout:

```
dijital-stok/
├── .agents/            # Agent custom instructions, rules, and local plan copies
├── .github/            # GitHub Actions CI pipelines
├── docs/               # Detailed technical documentation
├── public/             # Static public assets (icons, manifest, PWA assets)
├── src/
│   ├── app/            # Application entrypoint (main.tsx, App.tsx, styles)
│   ├── assets/         # App-specific images and styling resources
│   ├── core/           # Core configuration (Firebase, environment variables)
│   ├── features/       # Feature-driven modules (auth, inventory, sales, customers, dashboard)
│   └── shared/         # Common UI components, custom hooks, and contexts
└── vitest.setup.ts     # Testing setup
```

---

## ⚙️ Development Setup & Environment Variables

All environment variables are centrally managed and consumed via the config wrapper `src/core/config/env.ts`.

Create a `.env` file in the root directory (or let the app fallback to the placeholder values defined in `env.ts`):

```env
# PostHog Analytics
VITE_POSTHOG_KEY=phc_YOUR_POSTHOG_KEY
VITE_POSTHOG_HOST=https://app.posthog.com

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dijital-stokk.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dijital-stokk
VITE_FIREBASE_STORAGE_BUCKET=dijital-stokk.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=526702915988
VITE_FIREBASE_APP_ID=1:526702915988:web:5ba3d31447d83fab8d9f81
VITE_FIREBASE_MEASUREMENT_ID=G-3VGSXRNWW1

# E2E Test Credentials
VITE_TEST_USER_EMAIL=test@dijitalstok.com
VITE_TEST_USER_PASSWORD=test1234

# Second E2E test user
VITE_TEST_USER_2_EMAIL=test2@dijitalstok.com
VITE_TEST_USER_2_PASSWORD=qweQWE123
```

---

## 🛠️ Installation & Running Locally

To install dependencies and run the development environment, make sure you have [pnpm](https://pnpm.io/) installed.

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Start the development server:**
    ```bash
    pnpm dev
    ```
3.  **Compile the production build:**
    ```bash
    pnpm build
    ```
4.  **Preview the production/PWA build locally:**
    ```bash
    pnpm preview
    ```

---

## 🧪 Running Tests & Quality Checks

Pre-commit hooks are configured via Husky to ensure formatting and linting rules are enforced before code is committed.

- **Run linter checks:**
  ```bash
  pnpm lint
  ```
- **Run unit tests (Vitest):**
  ```bash
  pnpm test
  ```
- **Run E2E tests (Playwright):**
  ```bash
  pnpm test:e2e
  ```

---

## 📖 Detailed Documentation

For a deeper dive into the system's design, features, and workflows, please refer to the following resources in the `/docs` directory:

1.  **[Architecture Guide](file:///Users/mertdy/Desktop/dijital-stok/docs/ARCHITECTURE.md):** In-depth application design, rendering, state management, and offline cache mechanics.
2.  **[Feature Specifications](file:///Users/mertdy/Desktop/dijital-stok/docs/FEATURES.md):** Purposes, user flows, and components of every implemented module.
3.  **[API Reference](file:///Users/mertdy/Desktop/dijital-stok/docs/API.md):** Cloud Firestore schema structures and external Open Food Facts integration contracts.
4.  **[Coding Conventions](file:///Users/mertdy/Desktop/dijital-stok/docs/CONVENTIONS.md):** Folder rules, naming styles, barrel imports, and React standards.
5.  **[Architectural Decision Log (ADR)](file:///Users/mertdy/Desktop/dijital-stok/docs/DECISIONS.md):** Rationale behind technologies and tradeoffs.
6.  **[Project Structure](file:///Users/mertdy/Desktop/dijital-stok/docs/PROJECT_STRUCTURE.md):** Complete catalog of files and folder dependencies.
7.  **[Roadmap & Tech Debt](file:///Users/mertdy/Desktop/dijital-stok/docs/ROADMAP.md):** Known issues, missing modules, and future refactor areas.
8.  **[Glossary](file:///Users/mertdy/Desktop/dijital-stok/docs/GLOSSARY.md):** Core domain concepts and naming references.
9.  **[AI Context](file:///Users/mertdy/Desktop/dijital-stok/docs/AI_CONTEXT.md):** Technical rules and context parameters for AI coding agents.
