# Coding Conventions

## Purpose

Defines coding standards for the entire project.

Do not place business rules or architecture decisions here.

---

# General Principles

Always prefer:

- Readability
- Simplicity
- Reusability
- Consistency

Avoid:

- Duplicate code
- Deep nesting
- Over-engineering
- Premature optimization

---

# TypeScript

Always use TypeScript.

Avoid:

- any
- unknown (unless necessary)

Prefer:

- interfaces for contracts
- type for utility types

Enable strict typing.

---

# React

Components

- Functional Components only

Hooks

- Built-in hooks imported directly

Good

import { useState } from 'react'

Bad

React.useState()

---

# Component Structure

Order

1. Imports
2. Types
3. Constants
4. Component
5. Helpers

---

# Props

Always define explicit interfaces.

Example

interface ProductCardProps {}

---

# State

Local UI state

↓

useState()

Feature state

↓

Zustand

Server state

↓

Firestore

---

# Zustand

Each store should expose

clear()

Never mutate state directly.

Actions belong inside stores.

---

# Firestore

Never call Firestore directly from components.

Use stores.

---

# Imports

Inside same feature

Relative imports.

Across features

Barrel exports.

Never deep import.

---

# Naming

Components

PascalCase

Hooks

useX

Stores

useXStore

Files

PascalCase for components

camelCase for utilities

---

# Permission Metadata

Every `PermissionKey` must have an exhaustive label, short label and
description entry in `src/core/types/permissions.ts`.

Account Settings, Company Settings and invitation views must consume the
shared `PERMISSION_META` or `AVAILABLE_PERMISSIONS` exports. Never add local
permission label mappings inside components.

When adding a permission, update its authorization checks and add coverage for
both permission assignment and Account Settings display.

---

# Styling

Tailwind CSS only.

Avoid inline styles.

Keep utility classes readable.

Extract repeated styles.

---

# Form Controls

Use HeroUI form controls throughout the application. Do not add native
`input`, `textarea` or checkbox elements to product code.

- Use HeroUI `Input` for single-line inputs, `TextArea` for multi-line inputs
  and the compound `Checkbox` API for checkboxes.
- Preserve user-facing labels, placeholders, descriptions/hints and validation
  messages when replacing a control.
- Forms must use React Hook Form with a Zod resolver. Keep validation rules in
  the Zod schema instead of duplicating them in event handlers.
- In React Hook Form screens, use the shared `FormInput` component for standard
  fields. It connects HeroUI's controlled `TextField` composition to React Hook
  Form with `useController` and renders `Label`, `Description` and `FieldError`.
- Do not spread React Hook Form's `register()` result directly onto an `Input`
  nested inside HeroUI `TextField`; the field context controls its value. Use
  `FormInput` or `Controller`/`useController` instead.
- Keep standalone controlled search/filter inputs as HeroUI `Input` when they
  are not forms and do not require schema validation.

---

# Error Handling

Never ignore exceptions.

Always provide meaningful messages.

---

# Testing

Every important store

↓

Unit tests

Critical workflows

↓

Playwright

---

# Comments

Write comments only when intent is not obvious.

Never explain simple code.

---

# Related Documents

ARCHITECTURE.md

PROJECT_STRUCTURE.md
