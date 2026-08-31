# VI Agri Science — Digital Business Management Platform

"Planting dreams, harvesting life"

A production-structured business management system replacing manual
notebook-based order/payment/inventory tracking for VI Agri Science
(fertilizers, pesticides, insecticides, fungicides, herbicides, PGRs).

---

## Status of this build

This repository currently contains the **backend foundation, fully working
end-to-end and verified**:

- Django REST Framework API
- PostgreSQL-first data model (SQLite supported only as a local dev
  convenience — see `USE_SQLITE` below)
- Custom User → Role → Permission RBAC, enforced on every request
- Modules implemented with real business logic, not stubs:
  **Accounts/Roles, Customers, Products/Categories/Units, Suppliers,
  Purchases (with automatic inventory increase), Inventory (append-only
  movement ledger), Sales (atomic multi-item sale AND atomic sale editing
  with correct inventory-diff reconciliation), Payments (deterministic
  reconciliation, duplicate-reference guard, reversal), Expenses,
  Audit Log (immutable), Dashboard, and Reports (sales/outstanding).**
- **Sale editing (Section 14)**: `PATCH /api/sales/{id}/` with a new
  `items_input` correctly diffs old vs. new per-product quantities, writes
  an explicit `ADJUSTMENT` inventory movement for exactly the difference
  (never a silent quantity overwrite), rejects the whole edit atomically if
  stock is insufficient, and recomputes payment/reconciliation status.
  Verified live: `10 Urea → 15 Urea` produced `ADJUSTMENT -5`, stock went
  100→90→85 correctly, and an over-large edit was fully rejected with zero
  side effects (rollback confirmed).
- **Concurrency protection (Section 31)**: `select_for_update()` on every
  Product touched by a sale create/edit (ordered by pk to avoid deadlocks),
  and on the Sale row during payment create/reverse — so two staff selling
  the last 5 bags simultaneously can no longer both pass the stock check.
- Verified via real end-to-end smoke tests (not just code review): login →
  create sale → record partial payment → reconciliation status updates
  correctly → duplicate payment rejected → staff without `UPDATE_SALE`
  correctly receives HTTP 403 on a raw PATCH request → audit log correctly
  attributes the acting user → sale edit reconciles inventory correctly →
  failed edit rolls back cleanly.

**Not yet built:** full CRUD pages for each module (Section 14 of the
frontend spec explicitly deferred this to later phases — only the
dashboard is fully wired), automated test suite (`tests.py` files are
currently empty stubs), CSV import/export, an editable/persisted
`BusinessSettings` model (currently read-only from env vars), API docs
(Swagger), and the WhatsApp/payment-gateway integration extension point.
See "Next steps" at the bottom.

---

## Phase 5 — React frontend foundation (complete)

`frontend/` now contains a working React + Vite + TypeScript + Tailwind
v4 app, connected to the real backend above (endpoint names and response
shapes were re-read from the actual Django URLconf/serializers before any
frontend code was written — nothing invented).

**What's built and verified:**
- JWT auth: login, `/api/auth/me/` on load, automatic silent refresh on a
  401 (single retry, then forced logout), protected routes
- Permission-aware sidebar + mobile drawer, filtered against the real
  codenames from `accounts/permissions_catalog.py`
  (`hasPermission("ADD_SALE")`-style checks — UX only, the backend
  remains the actual security boundary)
- VI Agri Science branding: deep green / lime theme defined once as
  Tailwind `@theme` tokens (`src/index.css`) so it can be restyled in one
  place later
- Responsive layout: desktop sidebar, mobile slide-out nav, touch-sized
  controls
- Centralized Axios client (`src/api/axios.ts`) + one API module per
  backend app (`src/api/customers.ts`, `sales.ts`, `payments.ts`, etc.),
  matching every real endpoint
- TypeScript types hand-matched field-by-field against the actual DRF
  serializers (`src/types/`)
- Dashboard page fully wired to `GET /api/dashboard/` — no hard-coded
  numbers, includes loading/error/empty states
- Verified live: started the Vite dev server and Django together, logged
  in and fetched the dashboard **through Vite's own proxy** (not Django
  directly) — confirmed the JSON shape returned matches the TypeScript
  types exactly
- `npm run build` and `npm run lint` both run clean (0 errors)

**Deliberately deferred to the next phase (per the phase spec):** full
CRUD pages for Customers/Products/Suppliers — routes exist and are
reachable from the sidebar, but currently render a "coming soon"
placeholder rather than a real table/form, so navigation never 404s while
being honest that the UI isn't built yet.

---

**Backend change this phase:** `Sale`, `Payment`, `Purchase`, and
`Expense` list endpoints previously had no date-range filtering
capability at all (their `FilterSet`s only supported exact-match fields).
The frontend's "Date filter" requirement (Sections 1/8/17/21) genuinely
needed this, so each app got a small `filters.py` adding `date_from`/
`date_to` query params (`django_filters.DateFilter` with `gte`/`lte`
lookups) — additive only, nothing existing changed behavior. Verified
live: filtering to today returns the right count, filtering to an
unrelated year returns zero.

**What's built:**
- **Sales** (`/sales`, `/sales/new`, `/sales/:id`): searchable/filterable
  list (customer, payment status, date range) with backend pagination; a
  mobile-first sale entry flow (`CustomerPicker` + `ProductPicker`, both
  debounced search-selects hitting the real search-filtered endpoints) with
  a live-editable cart (`SaleItemsCart`) showing an "estimated total" —
  explicitly labeled as such, since the backend remains authoritative and
  recomputes it server-side; detail page with items, payment summary,
  in-place edit (reusing the exact same cart component, submitting only
  `items_input` + `reason` — **no client-side inventory math at all**, the
  backend's diff/reconciliation logic from Phase 4 does 100% of the work),
  and cancel with an optional reason field
- **Payments**: recording embedded in Sale Detail (amount defaults to the
  live outstanding balance, with a confirm-to-proceed prompt on
  overpayment rather than a hard block, since the backend itself doesn't
  reject overpayment), a standalone `/payments` list with date/method/status
  filters, and reversal (reason required, disabled until provided) — every
  outcome re-fetches the sale so paid/outstanding always reflects the
  backend's own `recompute_payment_status()`, never a client guess
- **Inventory** (`/inventory`): stock status per product computed from the
  same `current_stock`/`is_low_stock` fields used elsewhere (no second
  stock source), an authorized adjustment modal (product + signed quantity
  + required reason) calling the one real adjustment endpoint, and links
  into the existing Product Detail page (built in Phase 6) for movement
  history — deliberately not duplicated as a second page
- **Purchases** (`/purchases`, `/purchases/new`, `/purchases/:id`): same
  cart pattern as Sales but without a discount field (purchases don't have
  one on the backend); detail page is read-only, since the backend itself
  has no update/delete for purchases once recorded — the frontend doesn't
  offer an edit button that would just 404
- **Expenses** (`/expenses`): list with date/category filters, add via
  modal (no separate route needed), cancel with confirmation

**Verified live** (backend + frontend running together, real HTTP through
Vite's proxy, checked against actual server state — not just "React showed
success"):
- Sale created with 1 item → total ₹7,500, stock 100→90, `CREATE_SALE`
  audit entry confirmed
- Sale created with 2 items → total exactly ₹7,350 (5×750 + 3×1200),
  matching the backend's own computed sum
- Sale edited 10→15 Urea → total recalculated to ₹11,250, stock correctly
  dropped an additional 5 units (90→80) via an `ADJUSTMENT` movement, not a
  silent overwrite
- Sale cancelled → status `cancelled`, stock fully reversed (100 again)
- Payment: partial (₹3,000 of ₹7,500) → `outstanding: 4500, partial`;
  remaining payment → `outstanding: 0, paid`; reversal of the first payment
  → `outstanding: 3000, partial` again, **original payment record still
  present** (`count: 2`, not 1) with `status: reversed`
- Inventory: adjustment of `-2` correctly created an `ADJUSTMENT` movement
  and dropped stock 100→98
- Purchase of 20 units → total ₹18,000, stock 98→118
- Expense creation correctly reflected in `/api/dashboard/`'s
  `todays_expenses` — this actually caught a timezone subtlety worth
  noting: the sandbox's system clock is UTC, but `TIME_ZONE=Asia/Kolkata`
  means Django's `timezone.localdate()` correctly resolves to the next
  calendar day once it's past 6:30pm UTC. An expense dated with the wrong
  day (my first test's mistake, not a bug) was correctly excluded from
  "today's" total, then correctly included once dated right — confirming
  the backend's timezone handling works as intended for a real Hyderabad
  shop
- Security: staff (no `REVERSE_PAYMENT`/`ADJUST_STOCK`) got 403 on both
  actions; the stock-insufficient error message came through exactly as
  the backend phrased it ("Insufficient stock for X: N available, M
  requested"), unmodified, via `extractErrorMessage`

- `npm run build` → 0 errors. `npm run lint` → 0 errors, 11 warnings, all
  the same intentional fetch-on-mount/debounced-search pattern already
  accepted in Phases 5–6, none new in kind.

---

## Phase 6 — Customers, Products & Suppliers (complete)

Full CRUD pages for these three modules, connected to the real backend
(endpoint/serializer shapes re-verified from source before writing UI —
one real mismatch was caught this way: `SupplierViewSet` has no
`perform_destroy` override, so its `DELETE` hard-deletes rather than
soft-deletes like Customer/Product. Rather than change backend behavior in
a frontend-only phase, the "Deactivate Supplier" action deliberately uses
`PATCH {is_active: false}` instead of `DELETE` — flagged here for you to
decide whether to fix backend-side later).

**What's built:**
- `/customers`, `/customers/new`, `/customers/:id` — list (search,
  pagination, permission-gated Add button), create form (client-side
  validation mirrors backend constraints — required name/phone, phone
  format, non-negative credit limit/opening balance — but the backend
  remains authoritative), detail page showing `total_purchases`,
  `total_paid`, `outstanding_balance` straight from
  `CustomerDetailSerializer` (never recalculated in React), recent
  sales/payments, inline edit modal, deactivate with confirmation
- `/products`, `/products/new`, `/products/:id` — same pattern, plus
  category filter, quick-add-inline for Category/Unit (no separate
  management page needed since none was in the route list), opening stock
  recorded as a real `OPENING` inventory movement, stock status
  (In Stock/Low Stock/Out of Stock) computed from `current_stock` /
  `is_low_stock` as returned by the backend, recent stock movement history
- `/suppliers`, `/suppliers/new`, `/suppliers/:id` — same pattern, purchase
  history and total purchase value (a simple client-side sum of the
  backend-provided `total_amount` on each already-fetched purchase — not
  an invented metric)
- New shared components: `ConfirmDialog`, `SearchBar` (debounced),
  `Pagination`, `FormField`, `QuickAddSelect`, `StatusBadge`, `PageHeader`,
  `Button`/`LinkButton`, plus a `ToastContext` for success/error
  notifications and a `usePaginatedList` hook shared by all three list
  pages
- Every list/detail page has loading, error (retry), and empty states
- Desktop tables / mobile cards on every list page, per Section 12
- All buttons (Add/Edit/Deactivate) are permission-gated via
  `hasPermission()`, but this is UX only — every write still goes through
  the same backend endpoints that enforce `HasPermissionCode` regardless

**Verified live** (through Vite's actual dev proxy, the same path the
browser uses): Customer add → view detail (outstanding balance reflects
opening balance correctly) → edit → search → deactivate (soft, `status`
flips to `inactive`, row preserved). Product add with opening stock →
current_stock correctly shows 50 → edit → search → inventory movement
history correctly shows the `OPENING +50` row. Supplier add → retrieve →
deactivate via `PATCH` → row confirmed still present with `is_active:
false` (not hard-deleted).

- `npm run build` → 0 errors. `npm run lint` → 0 errors, 6 warnings, all
  the same intentional fetch-on-mount pattern already accepted in Phase 5
  (one new fast-refresh warning from Phase 5 was fixed this phase by
  splitting `inputClasses` into its own file).

---

## Phase 7 — Sales, Payments, Inventory, Purchases, Expenses (complete)

The core money/stock transaction modules, connected to the real backend
and verified end-to-end through the actual Vite dev proxy (not just unit
logic). One backend gap was found and fixed as a small, additive,
non-breaking change (see below).

**Backend change this phase:** `Sale`, `Payment`, `Purchase`, and
`Expense` list endpoints previously had no date-range filtering
capability at all (their `FilterSet`s only supported exact-match fields).
The frontend's "Date filter" requirement (Sections 1/8/17/21) genuinely
needed this, so each app got a small `filters.py` adding `date_from`/
`date_to` query params (`django_filters.DateFilter` with `gte`/`lte`
lookups) — additive only, nothing existing changed behavior. Verified
live: filtering to today returns the right count, filtering to an
unrelated year returns zero.

**What's built:**
- **Sales** (`/sales`, `/sales/new`, `/sales/:id`): searchable/filterable
  list (customer, payment status, date range) with backend pagination; a
  mobile-first sale entry flow (`CustomerPicker` + `ProductPicker`, both
  debounced search-selects hitting the real search-filtered endpoints) with
  a live-editable cart (`SaleItemsCart`) showing an "estimated total" —
  explicitly labeled as such, since the backend remains authoritative and
  recomputes it server-side; detail page with items, payment summary,
  in-place edit (reusing the exact same cart component, submitting only
  `items_input` + `reason` — **no client-side inventory math at all**, the
  backend's diff/reconciliation logic from Phase 4 does 100% of the work),
  and cancel with an optional reason field
- **Payments**: recording embedded in Sale Detail (amount defaults to the
  live outstanding balance, with a confirm-to-proceed prompt on
  overpayment rather than a hard block, since the backend itself doesn't
  reject overpayment), a standalone `/payments` list with date/method/status
  filters, and reversal (reason required, disabled until provided) — every
  outcome re-fetches the sale so paid/outstanding always reflects the
  backend's own `recompute_payment_status()`, never a client guess
- **Inventory** (`/inventory`): stock status per product computed from the
  same `current_stock`/`is_low_stock` fields used elsewhere (no second
  stock source), an authorized adjustment modal (product + signed quantity
  + required reason) calling the one real adjustment endpoint, and links
  into the existing Product Detail page (built in Phase 6) for movement
  history — deliberately not duplicated as a second page
- **Purchases** (`/purchases`, `/purchases/new`, `/purchases/:id`): same
  cart pattern as Sales but without a discount field (purchases don't have
  one on the backend); detail page is read-only, since the backend itself
  has no update/delete for purchases once recorded — the frontend doesn't
  offer an edit button that would just 404
- **Expenses** (`/expenses`): list with date/category filters, add via
  modal (no separate route needed), cancel with confirmation

**Verified live** (backend + frontend running together, real HTTP through
Vite's proxy, checked against actual server state — not just "React showed
success"):
- Sale created with 1 item → total ₹7,500, stock 100→90, `CREATE_SALE`
  audit entry confirmed
- Sale created with 2 items → total exactly ₹7,350 (5×750 + 3×1200),
  matching the backend's own computed sum
- Sale edited 10→15 Urea → total recalculated to ₹11,250, stock correctly
  dropped an additional 5 units (90→80) via an `ADJUSTMENT` movement, not a
  silent overwrite
- Sale cancelled → status `cancelled`, stock fully reversed (100 again)
- Payment: partial (₹3,000 of ₹7,500) → `outstanding: 4500, partial`;
  remaining payment → `outstanding: 0, paid`; reversal of the first payment
  → `outstanding: 3000, partial` again, **original payment record still
  present** (`count: 2`, not 1) with `status: reversed`
- Inventory: adjustment of `-2` correctly created an `ADJUSTMENT` movement
  and dropped stock 100→98
- Purchase of 20 units → total ₹18,000, stock 98→118
- Expense creation correctly reflected in `/api/dashboard/`'s
  `todays_expenses` — this actually caught a timezone subtlety worth
  noting: the sandbox's system clock is UTC, but `TIME_ZONE=Asia/Kolkata`
  means Django's `timezone.localdate()` correctly resolves to the next
  calendar day once it's past 6:30pm UTC. An expense dated with the wrong
  day (my first test's mistake, not a bug) was correctly excluded from
  "today's" total, then correctly included once dated right — confirming
  the backend's timezone handling works as intended for a real Hyderabad
  shop
- Security: staff (no `REVERSE_PAYMENT`/`ADJUST_STOCK`) got 403 on both
  actions; the stock-insufficient error message came through exactly as
  the backend phrased it ("Insufficient stock for X: N available, M
  requested"), unmodified, via `extractErrorMessage`

- `npm run build` → 0 errors. `npm run lint` → 0 errors, 11 warnings, all
  the same intentional fetch-on-mount/debounced-search pattern already
  accepted in Phases 5–6, none new in kind.

---

## Audit + Critical Fixes + Phase 8 — Dashboard, Reports, Analytics (complete)

A fresh, skeptical audit of the actual code (not prior reports) surfaced
and fixed four real issues before Phase 8 began, then extended
Dashboard/Reports/Analytics substantially.

### Critical fixes (before Phase 8 work)

1. **Supplier had zero audit logging.** Unlike every other model,
   `SupplierViewSet` had no `perform_create`/`perform_update` override —
   fixed, now logs `CREATE_SUPPLIER`/`UPDATE_SUPPLIER` like every other app.
2. **Supplier hard-delete gap, unfixed since Phase 6.** Only ever worked
   around in the frontend; the backend itself still had no
   `perform_destroy`, so a raw `DELETE` call permanently destroyed the row.
   Fixed with the same soft-delete pattern as Customer/Product.
3. **Overpayment was invisible.** A code comment claimed excess payment was
   "flagged elsewhere" — it wasn't, anywhere. Added a real `overpaid` status
   to `Sale.payment_status` and fixed `recompute_payment_status()` to set it
   correctly. Verified live: paying ₹8,000 against a ₹7,500 sale now shows
   `payment_status: overpaid`, `outstanding: -500` (a visible credit, not a
   silently-absorbed "paid").
4. **N+1 queries in `DashboardView` and `OutstandingReportView`.** Both
   looped per-row calling model methods that each triggered their own
   aggregate query — fine at demo scale, but 1,000+ extra queries at
   1,000+ products/customers. Rewrote both using `Subquery`/`Coalesce`
   aggregation. **Caught a subtler bug while fixing this**: an initial
   attempt annotated two `Sum()`s over different reverse-FK relations
   (sales and payments) in one `annotate()` call, which causes Django to
   JOIN both relations and silently inflate both sums for any customer
   with more than one sale AND more than one payment — a classic ORM trap
   that would have produced quietly wrong financial numbers. Rewrote using
   isolated `Subquery` per aggregate instead. Verified live with a
   multi-sale, multi-payment customer: `total_sales: 6000` (not 12000 or
   some multiple), `total_paid: 2000`, `outstanding: 4000` — exactly correct.

All four verified live against a real database, not just "no exception thrown."

### Phase 8 — backend

- **Dashboard extended**: `out_of_stock_count`/`out_of_stock_products`
  (previously only low-stock existed), `recent_purchases`,
  `recent_expenses` added alongside existing recent sales/payments.
- **New report endpoints**: `/api/reports/payments/` (total collected,
  by-method breakdown, all-time outstanding — from actual `Payment`
  records only, never inferred from `Sale` totals), `/api/reports/inventory/`
  (in/low/out-of-stock sections), `/api/reports/purchases/` (by-supplier
  totals), `/api/reports/expenses/` (by-category, by-day trend),
  `/api/reports/activity/` (audit-log entries for cancellations, edits,
  reversals, and adjustments — explicitly framed as a review aid, never as
  a fraud accusation, per the instruction).
- **Sales report extended**: added `items_sold`, `average_order_value`,
  `top_customers`.
- **`/api/reports/business-summary/`** — deliberately **not** called
  "profit." `Product.purchase_price` is a mutable current-price snapshot,
  not a per-sale historical cost, so a computed "gross profit" would look
  precise while actually being wrong. Instead this returns a clearly
  labeled "Business Transaction Summary" (revenue, collected, expenses,
  purchases, net cash movement) with an explicit note explaining why
  profit isn't shown — exactly per the instruction's own test for this
  situation.
- **CSV export**: added `/export/` actions to Sales/Payments/Purchases/
  Expenses viewsets plus dedicated `/api/inventory/export/` and
  `/api/reports/outstanding/export/`, all gated on the `EXPORT_REPORT`
  permission (verified: staff without it gets 403) and all honoring
  whatever filters were applied via `filter_queryset()` — never just the
  current page.
- **Date-range filtering** verified IST-correct end-to-end via a real
  "yesterday isolation" test: a sale created "today" correctly returns
  `total_sales: 0` when the report is filtered to yesterday's date, proving
  the Asia/Kolkata boundary is respected, not just assumed.

### Phase 8 — frontend

- **Dashboard**: now shows the out-of-stock card and recent
  purchases/expenses sections, all from the extended API — no new
  client-side computation.
- **`src/utils/dateRanges.ts`**: Today/Yesterday/Last 7/Last 30/This
  Month/Last Month/Custom, computed via `Intl.DateTimeFormat` with an
  explicit `timeZone: 'Asia/Kolkata'` — deliberately not `new Date()`
  interpreted in the browser's own timezone, per the spec's explicit
  UTC-vs-IST warning.
- **`/reports`**: tabbed interface (Sales, Payments, Outstanding,
  Inventory, Purchases, Expenses, Business Summary, Activity), each tab a
  thin fetch-and-render component reusing the same `StatBox`/
  `ReportSection`/`SimpleBarList` primitives — every number comes straight
  from its report endpoint, nothing recomputed in React. CSV export
  buttons appear only for users with `EXPORT_REPORT` and trigger real
  browser downloads (`downloadCsv()` in `api/dashboard.ts`, using a blob
  fetch since `<a href>` can't carry an `Authorization` header).
- **`/analytics`**: Recharts line chart (sales trend) and bar charts (top
  products, top customers, expenses by category), sharing the same
  date-range picker and the same report data — this page visualizes what
  Reports already fetches, it doesn't introduce a second data source.

### Verified live (real database, through the actual Vite proxy)
Every item from the spec's testing checklist: dashboard sales increased by
exactly the sale total; payments increased by the payment amount and
outstanding recalculated correctly (₹4,500 = ₹7,500 − ₹3,000); purchase of
15 units moved DAP stock 100→115; a ₹750 expense correctly appeared in
`todays_expenses`; a stock adjustment of −1 correctly appeared as the
latest `InventoryMovement`; cancelling a 5-unit sale correctly reversed
stock 95→100; the sales report for today showed the right total; and
critically, the **same report scoped to yesterday showed `total_sales: 0`**
— proving the date-range logic doesn't leak across the IST day boundary.

- `npm run build` → 0 errors (one Recharts-driven bundle-size *warning*,
  not an error — not chased, per "don't over-optimize prematurely").
  `npm run lint` → 0 errors, 18 warnings, all the same accepted
  fetch-on-mount pattern, none new in kind.

### Database scalability findings (Step 6)
- **Fixed this phase**: the two N+1 patterns above.
- **Still fine at real-shop scale, worth knowing for 10,000+ txns**: audit
  log has indexes on `(entity_type, entity_id)` and `(action, created_at)`
  already; `InventoryMovement.current_stock()` is a `SUM()` over an
  ever-growing table with no index-assisted early exit — at very high
  transaction volume (100,000+ movements per product) this could
  eventually benefit from either a per-product covering index or a
  periodically-materialized stock snapshot, but that's a real
  "when-it-grows" concern, not a today concern, and premature to build now.
- List endpoints all paginate server-side (confirmed, not assumed);
  CSV exports intentionally bypass pagination since a report export must
  reflect every filtered row, not one page — acceptable since exports are
  infrequent, permission-gated, admin-initiated actions, not hot-path reads.

---

## Phase 9 — Administration: Users, Roles, Permissions, Audit Logs, Settings (complete)

A fresh audit of the actual admin-related code (not prior reports) found
and fixed a genuine security bug and several completeness gaps before
building the admin UI.

### Critical fix — refresh token blacklisting was silently non-functional
`SIMPLE_JWT` had `BLACKLIST_AFTER_ROTATION: True`, but
`rest_framework_simplejwt.token_blacklist` was never added to
`INSTALLED_APPS`. **Verified live**: after rotating a refresh token, the
original (rotated-away) token still worked — HTTP 200 on reuse. This means
a stolen refresh token was never actually invalidated by rotation, despite
the settings claiming otherwise. Fixed by installing the app and running
its migrations; re-verified: reusing a rotated token now correctly returns
`401 {"detail": "Token is blacklisted"}`. A regression test
(`test_refresh_token_rotation_blacklists_old_token`) guards against this
breaking silently again.

### Other gaps found and fixed
- **Supplier hard-delete/audit gaps** from Phase 6/8 were already fixed in
  a prior session — re-confirmed still in place, not re-done.
- **No audit logging on User or Role changes at all.** Every other model
  in the system logs create/update; User and Role didn't. Fixed:
  `CREATE_USER`, `UPDATE_USER`, `DEACTIVATE_USER`, `REACTIVATE_USER`,
  `CREATE_ROLE`, `UPDATE_ROLE` now all logged, consistent with the
  existing verb-first naming convention used everywhere else in the
  codebase (not the task prompt's illustrative `USER_CREATED`-style names,
  to stay consistent with what's already there).
- **No way to reactivate a deactivated user via the API at all** — only
  deactivation existed. Added `POST /api/users/{id}/reactivate/`.
- **No owner-safety enforcement** (Section 19): nothing prevented
  deactivating the last user with `MANAGE_USERS`, or editing a role to
  strip `MANAGE_USERS` from the only role that grants it. Added
  `accounts/safety.py` with both checks, enforced in `UserViewSet.destroy`
  and `RoleViewSet.update`. Verified live: attempting to deactivate the
  sole admin returns `400 {"detail": "Cannot deactivate this user: they
  are the last account able to manage users..."}` and the account remains
  active; deactivation succeeds once a second admin exists.
- **`BusinessSettings` had no persisted, editable backing at all** — it
  was read-only from environment variables since Phase 5, a gap flagged
  repeatedly but never closed. Added a real singleton `BusinessSettings`
  model (name, tagline, address, phone, email, GSTIN, currency, invoice
  prefix, default minimum stock) with `GET` open to any authenticated user
  and `PATCH` gated on `MANAGE_SETTINGS`, every change audited with
  old/new values. Deliberately **not** added: a logo field (no file
  storage configured — would be a half-built feature) or a runtime-editable
  timezone (Django's `TIME_ZONE` is a process-level setting baked into
  every date-boundary calculation across dashboard/reports; making it a
  database value risks exactly the kind of silent reporting bug this
  project has been careful to avoid — stays as explicit `Asia/Kolkata`
  business configuration, matching the spec's own documented fallback for
  this situation).
- **Audit Logs had no date-range or object-ID filtering, despite the spec
  explicitly requiring both.** Added `audit/filters.py` (same
  `date_from`/`date_to` pattern as every other module) plus `entity_id`
  and a `search` field (reason, entity_id, username).
- **`last_login` was never exposed or even populated** — `UPDATE_LAST_LOGIN`
  wasn't enabled in `SIMPLE_JWT`, so the field stayed `null` forever even
  though the User model has always had it. Enabled it and added it to
  `UserSerializer`.

### Automated tests — the "no test suite" limitation starts getting fixed
30 real tests added (`accounts/tests.py`, `audit/tests.py`, `core/tests.py`,
`sales/tests.py`), hitting actual API endpoints per the instruction to
never test security only through React:
- Login success/failure, inactive-user rejection, the refresh-blacklist
  regression test above
- Staff correctly 403'd from `/api/users/`, `/api/roles/`,
  `/api/audit-logs/`, `PATCH /api/settings/business/`; admin correctly
  allowed
- User creation, soft-delete-not-hard-delete, reactivation, owner-safety
  block (and that it correctly allows deactivation once a second admin
  exists)
- Audit log immutability: `PATCH`/`DELETE` on `/api/audit-logs/{id}/`
  return 405 even for an admin, verified the row is unchanged after
  attempting `PATCH`
- Audit completeness spot-checks (Customer, Product creation both produce
  the expected audit entry)
- Business settings: view/update permissions, persistence, audit trail,
  singleton-stays-singleton
- The full Sale → SaleItems → InventoryMovement → AuditLog chain: single
  item, cancellation-reverses-stock, and insufficient-stock-rejected-
  atomically-with-no-orphaned-row
- Data integrity on deactivation: a customer created by an admin, who is
  then deactivated, still shows that admin as the audit log's `user`
  (never orphaned, never reassigned)

All 30 pass: `python manage.py test` → `Ran 30 tests ... OK`.

### Frontend — `/admin` section
- `navConfig.ts` updated: Administration section now points at
  `/admin`, `/admin/users`, `/admin/roles`, `/admin/permissions`,
  `/admin/audit-logs`, `/admin/settings` (previously top-level
  `ComingSoonPage` placeholders at `/users` etc. from Phase 5, never built)
- `AdminTabs` — shared sub-navigation, permission-filtered per tab
- **Admin Dashboard** (`/admin`): active/inactive/total user counts, role
  count, recent administrative activity (a distinct feed from the
  business Activity/Exceptions on the Reports page — this one shows
  user/role/settings changes, not sales/stock activity)
- **Users** (`/admin/users`): search, create, edit, deactivate (with the
  exact confirmation copy the spec asked for), reactivate — a user can
  never deactivate their own account (button disabled with a tooltip
  explaining why), and the backend's owner-safety error surfaces verbatim
  if someone tries to remove the last admin anyway
- **Roles** (`/admin/roles`): a real editable permission matrix — roles as
  columns, permissions as rows grouped by module (`utils/permissionGroups.ts`,
  matching the actual backend catalog, not the task prompt's illustrative
  grouping), checkboxes toggle membership, a "Save {role}" button appears
  only for roles with unsaved changes, and the backend's safety-block
  message surfaces verbatim if a save would strip the last admin access
- **Permissions** (`/admin/permissions`): read-only catalog grouped by
  the same module mapping
- **Audit Logs** (`/admin/audit-logs`): search, date range, module,
  action filters, pagination; detail modal shows before/after values
  **only when the backend actually recorded them** — never fabricated
- **Settings** (`/admin/settings`): full form for every editable field,
  visible-but-disabled for users without `MANAGE_SETTINGS` (with an
  explanatory note) rather than hidden entirely, since they're still
  allowed to view it

- `npm run build` → 0 errors. `npm run lint` → 0 errors, 20 warnings, all
  the same accepted fetch-on-mount/debounced-search pattern from every
  prior phase, none new in kind.

### Verified live (real database, through the actual Vite proxy)
Users list correctly shows `last_login` (populated for a user who's
logged in, `null` for one who hasn't); Roles/Permissions endpoints return
the real catalog (34 permissions, matching each role's actual assigned
count); Settings `PATCH` persists and is reflected on the next `GET`;
Audit Logs' new `entity_type`/`search` filters return correct counts;
Admin Dashboard's active/inactive tally matches the real user table.

---

## Architecture

```
React (Vite + TS + Tailwind)
        │
        ▼
Django REST Framework API  ──►  Business logic / permission checks / audit
        │
        ▼
PostgreSQL
```

React never talks to PostgreSQL directly. Every write goes through the
Django API, which validates, enforces permissions, computes totals itself
(never trusts a client-sent total), and writes financial/audit records
inside atomic transactions.

### Core design principles actually implemented in this code

- **Nothing financial is ever hard-deleted.** Sales are cancelled (with an
  inventory-reversing `CANCELLATION` movement), payments are reversed (with
  a required reason), customers/products are deactivated. See
  `sales/views.py::cancel`, `payments/views.py::reverse`.
- **Stock is never a manually-editable field.** `Product.current_stock()`
  always sums the `InventoryMovement` ledger. See `products/models.py`,
  `inventory/models.py`.
- **Reconciliation is deterministic, not AI.** `Sale.recompute_payment_status()`
  is plain arithmetic comparing `amount_paid()` to `total_amount`.
- **Every protected endpoint checks a permission code server-side**,
  regardless of what the frontend shows or hides. See
  `accounts/permissions.py::HasPermissionCode`.
- **Money fields are `DecimalField`, never floats.** Quantity/price/amount
  everywhere.
- **Multi-step business transactions are atomic.** Creating a Sale writes
  the Sale + SaleItems + InventoryMovements + AuditLog together or not at
  all (`sales/views.py::_create_sale_atomic`).

---

## Local setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ (recommended) — see the SQLite note below for a quicker
  local start
- Node.js 18+ (once the frontend is added)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set SECRET_KEY, and either configure Postgres (DB_NAME etc.)
# or set USE_SQLITE=True for a quick local run without installing Postgres.
```

#### Option A — PostgreSQL (required for production)
```bash
# Create the database and user (adjust names/password as you like):
sudo -u postgres psql -c "CREATE DATABASE vi_agri_science;"
sudo -u postgres psql -c "CREATE USER vi_agri_user WITH PASSWORD 'change-this-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vi_agri_science TO vi_agri_user;"
# Then in .env: USE_SQLITE=False, and fill in DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT
```

#### Option B — SQLite (local dev convenience ONLY, never production)
```bash
# In .env: USE_SQLITE=True
```

#### Then, either way:
```bash
python manage.py makemigrations
python manage.py migrate

# Required system configuration (permission catalog + default roles):
python manage.py seed_permissions

# Optional — fictional demo data so the dashboard looks populated.
# Remove/skip this before going live with a real shop's data.
python manage.py seed_demo_data

python manage.py runserver
```

Run the backend test suite (30 tests as of Phase 9, covering auth,
permissions, user management, audit immutability, settings, and the core
Sale→SaleItems→InventoryMovement→AuditLog chain):
```bash
python manage.py test
```

The demo seed creates:
- `owner` / `ChangeMe123!` — Owner/Admin role, full permissions
- `staff1` / `ChangeMe123!` — Staff role, limited permissions

**Change these passwords immediately in any shared/deployed environment.**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Opens at `http://localhost:5173`. In development, Vite proxies `/api/*`
requests to `http://127.0.0.1:8000` (see `vite.config.ts`) — so the
backend must be running (Section 1 above) before the frontend can log in
or load data.

Login with the demo credentials from the seed script above
(`owner` / `ChangeMe123!` or `staff1` / `ChangeMe123!`).

```bash
npm run build   # production build -> frontend/dist/
npm run lint    # oxlint (the linter this template ships with)
```

### 3. Django admin

```bash
# If you didn't use seed_demo_data, create your own superuser:
python manage.py createsuperuser
```
Visit `http://127.0.0.1:8000/admin/` — useful for inspecting data directly
during development.

---

## Backup & restore (PostgreSQL)

```bash
# Backup
pg_dump -U vi_agri_user -h localhost vi_agri_science > backup_$(date +%Y%m%d).sql

# Restore
psql -U vi_agri_user -h localhost vi_agri_science < backup_20260101.sql
```
For production, prefer your cloud provider's managed automated backups
(e.g. daily snapshots with point-in-time recovery) over manual `pg_dump`.

---

## Adding a new user and assigning permissions

Via the API (as an Owner/Admin token):
```bash
curl -X POST http://127.0.0.1:8000/api/users/ \
  -H "Authorization: Bearer <owner_token>" -H "Content-Type: application/json" \
  -d '{"username":"staff2","password":"SomeStrongPassword1","email":"staff2@viagriscience.test","role":<staff_role_id>}'
```
Or via Django admin at `/admin/accounts/user/`. Roles and their permission
sets are managed at `/admin/accounts/role/` or via `PATCH /api/roles/{id}/`
with a `permission_codes` list.

---

## Project structure

```
backend/
  config/          # settings, root urls
  core/            # base model, BusinessSettings, pagination, exception
                   #   handling, dashboard/reports, csv_export
  accounts/        # User, Role, Permission, auth, RBAC, safety.py
                   #   (owner-safety checks), tests.py
  customers/
  products/        # Product, ProductCategory, Unit
  purchases/       # Supplier, Purchase, PurchaseItem, filters.py
  inventory/       # InventoryMovement (append-only stock ledger)
  sales/           # Sale, SaleItem, filters.py, tests.py
  payments/        # filters.py
  expenses/        # filters.py
  audit/           # AuditLog, middleware, log_action() helper,
                   #   filters.py, tests.py
  requirements.txt
  .env.example

frontend/
  src/
    api/           # axios instance + one module per backend app
    components/
      ui/          # shared primitives: Button, FormField, ConfirmDialog,
                   #   Pagination, SearchBar, DateRangeFilter, StatCard,
                   #   StatusBadge, PageHeader, QuickAddSelect, states
      layout/      # Sidebar, Navbar, MobileNav, navConfig
      sales/       # CustomerPicker, ProductPicker, SaleItemsCart
      payments/    # PaymentForm
      purchases/   # SupplierPicker, PurchaseItemsCart
      inventory/   # StockAdjustmentForm
      expenses/    # ExpenseForm
      customers/ products/ suppliers/   # entity forms
      reports/     # DateRangePresetPicker, ReportTabs
      admin/       # AdminTabs, UserForm
    context/       # AuthContext, ToastContext
    hooks/         # useAuth, usePaginatedList
    layouts/       # AppLayout (authenticated shell)
    pages/         # one folder per module (customers/, products/, sales/,
                   #   payments/, inventory/, purchases/, expenses/,
                   #   suppliers/, admin/) plus DashboardPage, ReportsPage,
                   #   AnalyticsPage, LoginPage, NotFoundPage
    routes/        # router.tsx, ProtectedRoute
    types/         # hand-matched to Django serializers, incl. cart.ts
    utils/         # validation, inputStyles, dateRanges (IST-aware),
                   #   permissionGroups (matches backend catalog)
```

---

## Deployment readiness

- All secrets/config via environment variables (`.env`, never committed —
  see `.env.example`)
- `DEBUG=False` in any real deployment
- Migrations run cleanly from a fresh install (verified)
- CORS configured via `CORS_ALLOWED_ORIGINS`
- No stack traces reach the client (`core/exceptions.py`)

---

## Next steps

1. React frontend (Vite + TS + Tailwind): login screen, dashboard, and
   pages for each module, wired to this API.
2. CSV import for historical notebook data (Section 61 of the original
   spec) — validated before insert, not blind import.
3. CSV/Excel export for reports.
4. WhatsApp/AI integration point (kept as a genuinely optional future
   layer — the core system already works fully without it, per the
   architecture constraint that AI never touches financial confirmation).
