# Project Structure

## Purpose

Explains folder responsibilities.

No implementation details belong here.

---

# Root

src/

Application source.

public/

Static assets.

docs/

Project documentation.

.agents/

AI documentation.

---

# src/app

Application bootstrap.

Contains:

- App.tsx
- main.tsx

Responsible for:

- Router
- Providers
- Global initialization

---

# src/core

Framework configuration.

Contains:

- Firebase
- Environment
- Constants

---

# src/features

Business modules.

Each feature owns:

Components

Hooks

Stores

Views

Routes

Never access another feature internally.

Use public barrel exports.

---

# src/shared

Reusable code.

Contains:

Components

Hooks

Utils

Contexts

Types

Shared UI

---

# Typical Feature

feature/

components/

hooks/

store/

views/

types/

utils/

index.ts

---

# Import Rules

Inside feature

Relative imports.

Across features

Barrel exports.

Never deep import.

---

# Tests

Unit tests stay beside implementation.

Example

ProductCard.tsx

ProductCard.test.tsx

---

# Assets

Feature-specific assets stay inside the feature.

Shared assets belong in shared/.

---

# Naming

Components

PascalCase

Hooks

useSomething

Stores

useSomethingStore

Utilities

camelCase

Types

PascalCase

---

# Related Documents

CONVENTIONS.md

Coding standards.

ARCHITECTURE.md

Overall architecture.
