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

userPreferences

Private account-level interface preferences. Guided onboarding progress is
stored in `onboardingByCompany`, keyed by company ID, so each user can complete
or dismiss the guide independently in each company. Each entry contains the
onboarding version, welcome/tour timestamps, dismissal timestamp, optional
sample product ID and a `completedModules` timestamp map for completed guide
achievements.

pricingRules

Company-scoped automatic pricing rules. Rules can target product categories or
specific products, payment methods, a target-excluded basket threshold, and a
date/time schedule. Writes and per-sale rule overrides require the
`MANAGE_PROMOTIONS` permission or company ownership.

supportReports

User-submitted bug reports, support requests and suggestions. Each report is
written by a company member, includes optional recent client error context and
an optional, client-compressed WebP screenshot, and is readable by its author
and the platform support administrator. Screenshot payloads are deliberately
excluded from Firestore indexes.

notifications

Platform notification events. The initial event type is `SUPPORT_REPORT` and
is delivered through the temporary client-side WirePusher adapter. The
collection is structured for later delivery channels such as Firebase Cloud
Messaging and Capacitor native push.

notificationDevices

Future device registration records for web PWA and native clients. A user can
only read and manage their own device records.

Company data transfer package

Company owners can download a one-time ZIP transfer package and import it into
an empty target company. The package is generated and consumed locally in the
browser; it is never stored in Firestore. It includes inventory, categories,
customers, sales, sale items, payments, statement-share audits, campaigns and
shared quick-add preferences. Relationships are remapped on import.

Memberships, invitations, user profiles and account preferences are never
included. Source user IDs are replaced by the importing owner so that the
target company's existing permission model remains intact. An interrupted
import can resume from the same package because imported documents carry its
package ID.

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

Product images are uploaded to Firebase Storage and Firestore stores only
their metadata. Support report screenshots are the temporary exception: they
are client-compressed WebP data URLs stored directly on a report, limited to
350 KB and excluded from indexes until a server-side upload flow is introduced.

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
