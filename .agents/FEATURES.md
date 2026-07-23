# Product Features

## Purpose

Describes business capabilities.

Implementation details belong elsewhere.

---

# Authentication

Goal

Authenticate users.

Inputs

- Email
- Password

Outputs

- Authenticated session

Dependencies

Firebase Authentication

---

# Company Management

Goal

Select active company.

Outputs

Current company context.

All subsequent operations use this company.

Company owners can invite employees with an owner-only display name and a job
title. Employee titles are shown in the employee's navigation profile badge.

---

# Guided Onboarding

Goal

Help owners and employees reach a usable first sale without hiding the real
application workflow.

Capabilities

- Permission-aware short interface tour covering dashboard, sales, inventory,
  customers and the profile menu
- Company-scoped, per-user achievement checklist for sales, inventory filters
  and customer management
- Optional sample product creation for inventory managers
- Guide achievements complete when the user reaches the final step of the
  corresponding module; the workflows themselves remain optional
- Detailed customer guidance includes editing and WhatsApp statement sharing
- Modules that require unavailable permissions are hidden
- Persistent restart entry in the profile menu

---

# Inventory

Goal

Manage products.

Capabilities

- Create
- Update
- Delete
- Search
- Barcode lookup
- Browser-printable product, shelf, discount and package labels with bulk selection

Dependencies

Firestore

---

# Barcode Scanner

Goal

Quick product lookup.

Platforms

- Web
- Mobile

Web

ZXing

Mobile

ML Kit

---

# Sales

Goal

Create sales.

Capabilities

- Cart
- Discounts
- Payment
- Receipt

Updates

- Inventory
- Sales history
- Customer balance

---

# Suspended Sales

Goal

Temporarily save carts.

Storage

LocalStorage

Restore

Any suspended cart.

---

# Customers

Goal

Manage customer accounts.

Capabilities

- Credit
- Payments
- History
- Date-ranged account statements with opening and closing balances
- User-confirmed WhatsApp statement sharing
- Tenant-scoped statement share audit history

---

# Dashboard

Goal

Display business metrics.

Includes

- Revenue
- Sales
- Stock
- Top products

---

# Reports

Generate historical sales information.

Supports

Filtering

Export

---

# Offline Mode

Firestore cache.

Automatic synchronization.

---

# Application Recovery

Unexpected React render errors and uncaught browser errors show a recovery screen with retry and support actions. Technical context is recorded in PostHog without form data.

---

# User Roles

Admin

Full access.

Employee

Limited permissions.

---

# Related Documents

API.md

SRS.md
