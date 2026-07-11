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

# User Roles

Admin

Full access.

Employee

Limited permissions.

---

# Related Documents

API.md

SRS.md
