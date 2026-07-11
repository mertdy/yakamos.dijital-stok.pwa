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

# Styling

Tailwind CSS only.

Avoid inline styles.

Keep utility classes readable.

Extract repeated styles.

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
