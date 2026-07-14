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

---

# Authentication

Providers

- Email
- Google

---

# Firestore Rules

Every request requires:

request.auth != null

Every document must belong to:

companyId

Never expose global collections.

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
