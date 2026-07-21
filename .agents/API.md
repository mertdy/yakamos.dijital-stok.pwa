# API Reference

## Purpose

Defines all backend contracts.

Business explanations belong to FEATURES.md.

---

# Backend

Firebase

- Authentication
- Firestore
- Storage

---

# Firestore Collections

users

Stores user profiles.

companies

Stores business information.

memberships

Stores a user's company role, permissions, denormalized email address, owner
managed employee name and job title for company-scoped personnel management.

products

Inventory.

customers

Customer records.

sales

Completed sales.

payments

Debt payments.

statementShares

Audits customer statement sharing attempts. Documents include `companyId`,
`customerId`, statement period and balance snapshots, channel, mode, status,
actor and creation time. Click-to-chat shares use the `OPENED` status; this
does not claim that the customer received the message.

settings

Company configuration.

companyPreferences

Company-scoped shared interface preferences. The quick-add menu is stored in
`quickAddItems`; read access is available to company members, while writes
require the `MANAGE_COMPANY_QUICK_ADD` permission or company ownership.

pricingRules

Company-scoped automatic pricing rules. Rules can target product categories or
specific products, payment methods, a target-excluded basket threshold, and a
date/time schedule. Writes and per-sale rule overrides require the
`MANAGE_PROMOTIONS` permission or company ownership.

---

# Authentication

Providers

- Email
- Google

---

# Firestore Rules

Rules are defined in the repository root at `firestore.rules` and deployed with
the Firebase configuration in `firebase.json`.

Every request requires:

request.auth != null

Company-scoped documents must belong to:

companyId

Access is granted through the deterministic membership document
`memberships/{userId}_{companyId}`:

- Company owners can manage company settings, employees and invitations.
- Employees need the corresponding permission for protected writes.
- All company data reads are restricted to an active membership in the same
  company.
- `users` and `userPreferences` are readable and writable only by their owner.
- An employee membership created by accepting an invitation stores the
  invitation ID so the rule can verify the invitation's recipient, company and
  permissions.

The Firestore Emulator test suite is in
`src/core/firebase/firestore.rules.test.ts` and can be run with
`pnpm test:rules` in an environment with JDK 21 or newer.

---

# Write Pattern

Create

Update

Delete

Batch Write

Transaction

Choose the smallest operation possible.

---

# Reads

Realtime listeners:

onSnapshot()

One-time fetch:

getDocs()

Avoid polling.

---

# Offline

Firestore persistent cache is enabled.

Reads:

Cache First.

Writes:

Queued.

---

# IDs

Documents use Firestore generated ids unless a business requirement exists.

---

# Timestamp

Use serverTimestamp() whenever possible.

---

# Images

Uploaded to Firebase Storage.

Firestore stores only metadata.

---

# Validation

Client validation

↓

Firestore Rules

↓

Database

Never rely only on client validation.

---

# Security

Never trust client input.

Rules must validate:

- Authentication
- companyId
- Permissions

---

# Related Documents

FEATURES.md

Business behaviour.

ARCHITECTURE.md

System architecture.
