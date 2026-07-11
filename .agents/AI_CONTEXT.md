# AI Context

## Project

Dijital Stok is an offline-first Inventory and POS application for SMEs.

Platform:

- Web
- PWA
- Android
- iOS

Architecture:

- Client-side SPA
- Offline-first
- Multi-tenant
- RBAC

---

## Tech Stack

Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- HeroUI

State

- Zustand

Database

- Firestore

Mobile

- Capacitor

Testing

- Vitest
- Playwright

---

## Architecture Principles

- Feature Driven Architecture
- Barrel Exports
- Offline First
- Company Isolation
- Real-time Firestore
- Atomic Batch Writes

---

## Critical Rules

Every Firestore query must be scoped by:

companyId

Never access collections globally.

---

Native Capacitor plugins must always be wrapped by

Capacitor.isNativePlatform()

---

All Zustand stores must expose a clear() action.

Logout clears every store.

---

Never hardcode secrets.

Use env.ts.

---

Avoid deep imports between features.

Use barrel exports.

---

## Folder Overview

src/

app/

core/

features/

shared/

---

## Important Documents

README.md

General project overview.

API.md

Firestore collections.

FEATURES.md

Business logic.

ARCHITECTURE.md

System architecture.

CONVENTIONS.md

Coding conventions.

SRS.md

Business requirements.

DESIGN_DOCUMENT.md

Detailed technical design.

---

## Goal

Keep generated code:

- Small
- Modular
- Testable
- Consistent
