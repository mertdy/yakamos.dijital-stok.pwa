# Product Features

## Purpose

Describes current business capabilities. Implementation contracts belong in
`API.md` and technical design details belong elsewhere.

---

# Authentication and Account Preferences

Goal

Authenticate users and retain their account-level preferences.

Capabilities

- Email/password registration, login and password reset
- Google login, using redirect on mobile browsers and popup on desktop browsers
- Account-level light/dark theme preference
- Account settings, changelog and secure logout

Dependencies

Firebase Authentication

---

# Company Management

Goal

Work in the correct active company context.

Capabilities

- Create and switch between companies
- Configure company profile, receipt information and default low-stock threshold
- Invite employees with a display name, job title and granular permissions
- Show employee titles in the navigation profile badge
- Import/export company data and transfer a one-time package into an empty
  target company

All company-scoped operations use the active company.

---

# Guided Onboarding

Goal

Help owners and employees discover the real workflow without blocking it.

Capabilities

- Permission-aware short interface tour covering company selection,
  navigation, synchronization status and the profile menu
- Per-user achievement checklist shared across the user's companies
- Optional sample product creation for inventory managers
- Sales guidance covering product search, barcode scanning, cart, payment,
  customer selection, quick add, hold and reset actions
- Customer guidance covering creation, editing and WhatsApp statement sharing
- Achievements complete when the corresponding tour reaches its final step;
  performing a real sale or creating a customer is not required
- Modules with unavailable permissions are hidden and guides can be restarted
  from the profile menu

---

# Support Requests

Goal

Let users report problems, request support or send suggestions without leaving
the application.

Capabilities

- Profile-menu support form with a title, description and report type
- Optional compressed screenshot and recent client error context
- Private report visibility for its author and the platform support
  administrator
- Notification event structure for current client-side WirePusher delivery and
  future PWA/native notification channels

---

# Support Access

Goal

Allow platform support to investigate a company without taking over a user's
authentication identity.

Capabilities

- Platform support administrators select a target company, a member whose
  permissions are mirrored, a duration and a support reason
- A time-limited employee membership grants the matching company access while
  the administrator remains the authenticated and auditable actor
- Active sessions can be ended early from the profile menu
- Expired support memberships cannot remain the active company
- Owner-only company, personnel and invitation controls remain owner-only;
  a support session never becomes an owner role

---

# Inventory and Categories

Goal

Manage products and their categories.

Capabilities

- Create, edit, delete, search and barcode lookup for products
- Category management and alphabetically ordered category product views
- Quick and detailed filters for stock, price, category, unit, product state,
  image state and last-update date
- Bulk editing of common product values and bulk label printing
- Browser-printable product, shelf, discount and package labels

Dependencies

Firestore

---

# Barcode Scanner

Goal

Find products quickly with a device camera or barcode input device.

Capabilities

- Single sale mode: add a found product and close the scanner
- Multiple sale mode: retain scanned products, edit quantities and add the
  confirmed list to the cart
- Price view: show product name, barcode and sale price and optionally add the
  most recently viewed product to the cart
- Camera flip and torch controls when the device supports them

Web implementation

ZXing

---

# Sales and Suspended Carts

Goal

Create sales and keep the cashier workflow fast.

Capabilities

- Product search, barcode scanning, cart quantity management and cart reset
- Customer selection, discounts and automatic price rules
- Cash, card, QR code and on-account payment options
- Personal and shared-company quick-add menus
- Printable receipt and change calculation
- Local suspended-cart storage and restoration

Updates

- Inventory
- Sales history
- Customer balance

---

# Campaigns and Price Rules

Goal

Apply understandable discounts or surcharges automatically at checkout.

Capabilities

- Fixed or percentage discount/surcharge, per item or once per cart
- Product/category, payment method and other-items subtotal conditions
- Date/time and day-of-week validity schedules
- Priority ordering and conflict handling
- Permission-protected campaign management and reasoned checkout overrides

---

# Customers

Goal

Manage customer accounts and statements.

Capabilities

- Customer records, credit balances, payments and history
- Date-ranged account statements with opening and closing balances
- User-confirmed WhatsApp statement sharing and share audit history
- Quick and detailed customer filters

---

# Dashboard and Sales History

Goal

Give the company a clear operational overview and searchable sales records.

Dashboard includes

- Revenue
- Sales
- Stock
- Top products

Sales history supports

- Search and detailed filters retained in the URL
- Clear filters action
- Client-side Excel or CSV export, as one file or a ZIP of separate files

---

# Data Management

Goal

Move and archive company data safely from company settings.

Capabilities

- Import inventory and customer records with field mapping and validation
- Export selected company datasets in Excel or CSV
- Filter exported transactions by date range or all time
- Create and import a one-time company transfer package, including operational
  history while preserving the target company's identities and access model

---

# Offline Mode and Recovery

Offline mode

- Firestore persistent cache with per-company preparation for offline use
- Automatic synchronization when connectivity returns

Application recovery

- Unexpected React render errors and uncaught browser errors show a recovery
  screen with retry and support actions
- Technical context is recorded in PostHog without form data

---

# Access Roles

Company owner

Full company access, including settings, personnel and invitations.

Employee

Permission-scoped company access.

Platform support administrator

Can receive support reports and open time-limited support sessions without
impersonating a user's authentication identity.

---

# Related Documents

- `API.md`
- `SRS.md`
