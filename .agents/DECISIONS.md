# Architecture Decisions

## Purpose

This document records important engineering decisions.

It explains WHY decisions were made.

Implementation belongs elsewhere.

---

# ADR-001

Decision

Client Side Rendering

Reason

Application must work completely offline.

Consequences

+ Offline support

+ PWA compatible

- SEO not available

---

# ADR-002

Decision

Firestore

Reason

Native offline synchronization.

Consequences

+ Realtime

+ Local cache

+ Conflict handling

- Vendor lock-in

---

# ADR-003

Decision

Zustand

Reason

Minimal boilerplate.

High performance.

Consequences

+ Small API

+ Fast rendering

- Developer discipline required

---

# ADR-004

Decision

Feature Driven Architecture

Reason

Independent business modules.

Consequences

+ Easy maintenance

+ Scalable

---

# ADR-005

Decision

Capacitor

Reason

Single codebase for

- Web

- Android

- iOS

---

# ADR-006

Decision

Realtime Snapshot Listeners

Reason

Immediate UI updates.

Avoid polling.

---

# ADR-007

Decision

Batch Writes

Reason

Atomic operations.

Prevent partial updates.

---

# ADR-008

Decision

companyId Isolation

Reason

Multi tenant security.

Every query is isolated.

---

# Future ADRs

Whenever architecture changes:

Create a new ADR.

Never rewrite old decisions.
