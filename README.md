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

... (README truncated in commit for brevity) ...

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
