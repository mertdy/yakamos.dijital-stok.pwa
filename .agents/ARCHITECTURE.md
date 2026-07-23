# Application Architecture

## Purpose

This document describes the high-level software architecture.

Business rules, API definitions and feature details belong to their own documents.

---

# Architectural Style

The application follows a Feature-Driven Architecture built on a Client-Side SPA.

Key principles:

- Offline First
- Modular
- Real-time
- Multi-tenant
- Event Driven

---

# Technology Stack

Frontend

- React 19
- TypeScript
- Vite

UI

- Tailwind CSS
- HeroUI

State

- Zustand

Backend

- Firebase Authentication
- Cloud Firestore

Mobile

- Capacitor

---

# High Level Layers

UI

↓

Feature Layer

↓

State Layer

↓

Data Layer

↓

Firestore

---

# Rendering Strategy

Rendering:

Client Side Rendering (CSR)

Reasons:

- Offline support
- PWA compatibility
- Capacitor compatibility
- Native-like navigation

SSR is intentionally not used.

---

# State Flow

View

↓

Store Action

↓

Firestore SDK

↓

Local Cache

↓

Snapshot Listener

↓

Store Update

↓

UI Refresh

---

# Offline Strategy

Firestore persistent cache is enabled.

Reads:

Serve from cache first.

Writes:

Queued locally.

Automatically synchronized when connectivity returns.

After the authenticated workspace is visible, route chunks and optional POS
features are prefetched sequentially during idle time. Core POS, camera and
receipt code therefore remain available after a successful online opening.

---

# Authentication Flow

Firebase Authentication

↓

Load User Profile

↓

Load Memberships

↓

Determine Active Company

↓

Initialize Stores

---

# Multi Tenant

Every business owns isolated data.

Isolation key:

companyId

Every query must include companyId filtering.

Cross-company access is forbidden.

---

# State Management

Global state:

Zustand

Persistence:

Only required state is persisted.

Transient UI state must stay in memory.

The authentication shell must not statically import feature stores. Company
hydration and logout cleanup load feature stores on demand, keeping initial
login code independent from inventory, customer and sales-history modules.

---

# Navigation

Application uses React Router.

Feature modules own their own routes.

---

# Dependency Direction

Views

↓

Stores

↓

Firestore

Views never communicate directly with Firestore.

---

# Error Handling

Recoverable errors

↓

User Notification

Fatal errors

↓

Error Boundary

↓

Crash Reporting

---

# Performance Goals

- Lazy loading
- Route splitting
- Memoization when needed
- Virtualized large lists
- Minimal rerenders

---

# Related Documents

API.md

Database structure.

FEATURES.md

Business workflows.

DECISIONS.md

Architectural reasoning.
