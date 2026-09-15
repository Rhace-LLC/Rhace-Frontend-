# Staff Management & Role-Based Workspaces — Audit & Plan

> Scope: audit the existing Staff surface, then map the proposed invitation/onboarding,
> staff-management hub (All Staff / Shift Manager / Reports / Activity), role-based workspaces
> per vertical, and clock-in/out onto what already exists.
>
> Status: **audit + plan** — no code changed by this document.
>
> Evidence uses `backend:` for `Rhace-Backend`, plain paths for `Rhace-Frontend-`.

---

## 0. Executive summary

The staff feature today is a **single stub**: one `Staff` collection with no tenancy, no
invitations, no login, no shifts, no attribution, and one frontend page that lists/creates staff.
Almost everything in your proposal is **net-new**, but the foundations (roles enum, email service,
token utilities, auth middleware, an activity-log pattern) already exist and set the conventions.

| Area | Today | Verdict |
|---|---|---|
| `Staff` model | name/phone/email/password/staffId/jobTitle/role**String**/permissions/status(`active\|inactive`) — **no `vendor`, no `branch`** | Extend (tenancy + invite + status) |
| Staff auth | **None** — `protect()` resolves `vendor→Vendor` else `→User`; `resolveVendorScope` throws for staff | Add staff auth + scope |
| Invitations | **None** (no tokens, no staff email) | Build (reuse `sendEmail` + JWT/crypto) |
| Staff management UI | one page: list + Add modal; stats hardcoded (`change: 12`) | Rebuild into the 4 hubs |
| Role-based workspaces | **None** | Build (biggest workstream) |
| Shifts / clock in-out | **None** | Build |
| Reports (sales/prep/voids per staff) | **None** (orders have no staff attribution) | Build (+ attribution) |
| Activity tracker | `UnitActivityLog` exists (unit-scoped only) | Add `StaffActivityLog` |
| Sidebar entry | none (routes exist at `/{vertical}/staffs`) | Add "Staff" hub |

**Biggest blockers:** (1) staff cannot authenticate at all; (2) orders carry no staff attribution
and no status timestamps, so the Reports/Tracker metrics have no source data yet.

---

## 1. What we have today

### 1.1 Backend

| Concern | Where | Reality |
|---|---|---|
| Model | `backend:src/models/staff.model.ts` | `name`, `phone`, `email`(unique), `password`, `photo`, `staffId`(unique), `jobTitle`, `role: String`, `permissions: Map<Boolean>`, `status: enum ["active","inactive"]`, `resetPasswordToken/Expires`. **No `vendor`, no `branch`.** |
| Controller | `backend:src/controllers/staff.controller.ts` | `createStaff` (defaults password `"staff"`), `getStaff` (paginate), `getStaffById` (populates non-existent `branch`), `exportStaffCSV`, `updateStaff` (assigns non-schema `branch`), `modifyStaffRoles`, `toggleStaffStatus`, `deleteStaff` |
| Routes | `backend:src/routes/staff.routes.ts` (`/api/v1/staff`) | `authorize(["admin","manager","vendor"])` etc.; **`DELETE` allows `["admin","user"]`**; staff can read but not write |
| Roles | `backend:src/types/enums.ts` | `UserRole = user\|admin\|superadmin\|vendor\|staff\|manager\|support\|finance\|ops` |
| Auth | `backend:src/middlewares/auth.middleware.ts`, `src/utils/vendor.ts` | `protect()` fetches **Vendor or User only**; `resolveVendorScope` **throws for staff** ("Staff tenancy not configured") |
| Email | `backend:src/services/mail.service.ts` | `sendEmail`, `sendPasswordResetEmail`, booking/payment emails |
| Activity | `backend:src/models/unitactivitylog.model.ts` | Unit-scoped log (`actor`, `action`, `fromState/toState`, `metadata`) — good pattern to mirror |

**Bugs found:** `toggleStaffStatus` compares `"Active"/"Inactive"` against the enum
`active|inactive`; `branch` is written but not in the schema (no-op); staff can never log in.

### 1.2 Frontend

| Concern | Where | Reality |
|---|---|---|
| Page | `src/pages/vendor/shared/staff/index.tsx` (494 lines) | "Staff List" + stats (hardcoded `change: 12`) + filters + table + **Add Staff** modal (`fullName`, phone, email, `staffId`, role ∈ Manager/Chef/Waiter) |
| Service | `src/services/staff.service.ts` | only `createStaff`, `getStaff` |
| Routes | `src/navigation/routes/vendor.tsx` | `restaurant/staffs`, `hotel/staffs`, `club/staffs` → `StaffManagementSystem` |
| Sidebar | `src/navigation/sidebar/SideMenuList.ts` | **no Staff entry** |
| Staff workspace | — | none |

### 1.3 Order attribution (needed for Reports)

- `backend:src/models/order.model.ts` / `orderline.model.ts` have **no `staffId`/`createdBy`**.
- `Order.status` has **no per-status timestamps** (only `createdAt`/`updatedAt`), so "order placed →
  marked ready" (kitchen speed) and "void/refund frequency per staff" cannot be derived.
- `UnitReservation.posSpend` exists but is unused.

---

## 2. Your plan vs reality (adoption view)

| Proposed | Exists? | How to add |
|---|---|---|
| Invite modal (name/email/role/phone/validity) + `acceptInviteToken` + `passwordChangeToken` + email link | ❌ | Extend `Staff` + new `StaffInvite` service + `sendStaffInviteEmail`; token via `jwt`/`crypto` |
| `/vendor-staff/accept-invite` (auto-accept → set password → login) | ❌ | New public page + `POST /staff/auth/accept-invite`, `POST /staff/auth/set-password` |
| Fallback: forgot-password after accept | partial | Reuse `forgotPassword` pattern for staff |
| Hub: All Staff / Shift Manager / Reports / Activity | ❌ | New vendor-admin section under `/dashboard/{vertical}/staff/*` |
| Role workspaces (waiter, KDS, bartender, VIP host, front desk, housekeeping) | ❌ | New staff app `/staff/*` with role-gated routes |
| Minimum-spend tracker (club) | partial | `blueprint.minimumSpend` + `Order.total` (both exist) |
| KDS color aging + bump | ❌ | Needs `Order` status timestamps + realtime |
| Stock controller / 86-list | partial | `Dish.trackStock/stock`, `Drink.trackStock/quantity` (from the hardening work) |
| Reports (sales/turnover/prep speed/voids) | ❌ | Needs staff attribution + status timestamps + activity log |
| Activity tracker (minute-by-minute) | ❌ | New `StaffActivityLog` (mirror `UnitActivityLog`) |
| Clock in/out | ❌ | New `StaffShift` (attendance) |

---

## 3. Target architecture

### 3.1 Data model changes

**`Staff`** (`backend:src/models/staff.model.ts`) — extend:
```
vendor: ObjectId ref Vendor (index)      // tenancy (REQUIRED — fixes resolveVendorScope)
branch: ObjectId ref Branch (index)      // optional
role: String  enum ["manager","waiter","chef","bartender","vip_host",
                     "bar_staff","front_desk","housekeeping","cashier","staff"]
status: enum ["invited","active","suspended"]        // replaces active|inactive
inviteToken / inviteExpires
passwordChangeToken / passwordChangeExpires
linkedUserId: ObjectId ref User          // optional: if we reuse User for auth
lastLoginAt, photo, permissions (keep)
```
> **Decision (see §9):** make `Staff` the auth entity (keep `password` on Staff) **or** link to a
> `User` with `role:"staff"`. Recommendation: **Staff is the auth entity** (fewer records), with a
> token carrying `{ id, role:'staff', staffRole, vendor }`.

**New `StaffInvite`** (optional if invite fields live on `Staff`): tracks token, inviter, expiry,
acceptedAt, revoked. Recommendation: keep tokens **on `Staff`** for v1; add a `StaffInvite` history
collection only if you want an audit of invites.

**New `StaffShift`** (attendance/clock):
```
vendor, staff, branch?, date (YYYY-MM-DD, index),
clockInAt, clockOutAt, status: ["open","closed"],
minutesWorked (derived), note
```
**New `StaffAssignment`** (shift manager roster): `vendor, staff, date, type:["table","room","zone"], refId, floorPlan?`.
**New `StaffActivityLog`** (mirror `UnitActivityLog`): `vendor, staff, action, entity, entityId, metadata, at`.

**`Order` / `OrderLine`** — add attribution + timestamps:
```
Order.staffId (waiter/host who placed it), Order.createdByStaff, Order.zone/tableId
Order.placedAt, Order.readyAt, Order.servedAt, Order.closedAt   // for prep-speed & turnover
OrderLine.staffId, OrderLine.prepStatus ["queued","preparing","ready","served"], OrderLine.updatedAt (exists)
voids/refunds: OrderLine.status ("void") already exists (from the hardening work)
```

### 3.2 Auth & tenancy (the keystone)

1. **Staff login**: `POST /api/v1/staff/auth/login` (email + password, only `status:"active"`).
   Issue the same access/refresh tokens, with claims `{ id, role: "staff", staffRole, vendor }`.
2. **`protect()`**: add a `role === "staff"` branch → load `Staff.findById(decoded.id)`; set
   `req.user = { _id, role: "staff", staffRole, vendor, permissions }`.
3. **`resolveVendorScope`**: for `staff`, return `String(req.user.vendor)` (replaces the current
   throw). This instantly makes all vendor-scoped endpoints staff-compatible.
4. **`authorize()`**: keep role checks; add **staff-role** authorization
   (`authorizeStaff(["waiter","vip_host"])`) reading `req.user.staffRole` (or map staff roles into
   `permissions`).
5. **Refresh/forgot/reset** for staff: reuse token utils; add `POST /staff/auth/forgot-password`
   and `/staff/auth/reset-password`.

### 3.3 Invitation & onboarding flow

```
Vendor Admin → POST /staff/invite { name, email, role, phone, validHours }
   → create Staff { status:"invited", inviteToken(+expires), passwordChangeToken(+expires) }
   → sendStaffInviteEmail(link: FE/vendor-staff/accept-invite?inviteToken=…&resetToken=…)

Staff clicks link → FE /vendor-staff/accept-invite
   → POST /staff/auth/accept-invite { inviteToken }
        validate + not expired → status: "active" → return { email }
   → State A: "Invitation accepted — set your password"
   → POST /staff/auth/set-password { resetToken, password }
        validate passwordChangeToken → hash → status active, clear tokens → issue tokens → login
```
Fallback: if the staff closes before step B, `status` is already `active`, so they use
**Forgot password** on the staff login screen. `POST /staff/:id/resend-invite` regenerates tokens.

### 3.4 Role → workspace mapping (frontend routes)

Staff app under `/staff/*` (protected, redirect to `/auth/staff/login`), sidebar/landing rendered by
`staffRole`:

| Vertical | Staff role | Workspace (proposed route) | Core screens |
|---|---|---|---|
| Restaurant | Waiter | `/staff/waiter` | Day assignment, assigned tables floor map, POS order pad, order tracker |
| Restaurant | Chef (KDS) | `/staff/kitchen` | Fullscreen queue (age colour), bump to `ready`, 86-list |
| Restaurant | Bartender | `/staff/bar` | Drink ticket queue, one-tap ready |
| Club | VIP Host | `/staff/vip` | Assigned booths, section map, bottle-service pad, **minimum-spend tracker** |
| Club | Bar/Cellar | `/staff/cellar` | Dispatch queue, add-on/show alerts |
| Hotel | Front Desk | `/staff/frontdesk` | Room grid, check-in/out console, room-charge console |
| Hotel | Housekeeping | `/staff/housekeeping` | Assigned rooms by priority, status toggle, maintenance log |
| All | any | clock in/out widget (global) | `POST /staff/shifts/clock-in|clock-out` |

Role → screen gating is client-side for UX **and** server-side for every write (never trust the UI).

### 3.5 Shift manager & clock in/out

- **Clock widget** in the staff app header: `POST /staff/shifts/clock-in` / `clock-out`; a `StaffShift`
  per day; managers see live on-shift status in the hub.
- **Roster board** (vendor admin): assign staff → table/room/zone per day (`StaffAssignment`); the
  waiter/housekeeping "assigned for the day" list reads this.

### 3.6 Reports & analytics (source data)

| Metric | Source |
|---|---|
| Sales volume per staff | `Order.staffId` + `Order.total` (needs attribution) |
| Table/room turnover | `UnitReservation` start/end + `Order.closedAt` per `unitId` |
| Kitchen/bar prep speed | `Order.readyAt − Order.placedAt` (needs timestamps) |
| Voids & refunds per staff | `OrderLine.status="void"` + `Refund` (Refund model is a stub — wire it) |

Filters: date range, branch, staff (all requested). Endpoint: `GET /staff/reports?from&to&branchId&staffId`.

### 3.7 Activity tracker

`StaffActivityLog` written from the key actions (order served, table transferred, item 86'd,
check-in/out, void). `GET /staff/activity?date=&staffId=` returns the day's minute-by-minute feed.

---

## 4. API surface (draft)

**Staff auth (public)**
- `POST /staff/auth/login`
- `POST /staff/auth/accept-invite` · `POST /staff/auth/set-password`
- `POST /staff/auth/forgot-password` · `POST /staff/auth/reset-password`

**Staff admin (vendor admin)**
- `POST /staff/invite` · `POST /staff/:id/resend-invite` · `POST /staff/:id/revoke`
- `GET /staff` (filters: role, branch, status, shift, search) · `GET /staff/:id`
- `PATCH /staff/:id` (role/branch/status/permissions) · `GET /staff/export-csv` (exists)

**Shifts**
- `POST /staff/shifts/clock-in` · `POST /staff/shifts/clock-out`
- `GET /staff/shifts?date=&staffId=` · `POST /staff/assignments` · `GET /staff/assignments?date=`

**Reports / activity**
- `GET /staff/reports?from&to&branchId&staffId`
- `GET /staff/activity?date&staffId`

**Workspace reads (staff-scoped, reuse existing)**
- Tables/rooms: existing floor-plan + `GET /physical-units/:id`, `/floor-plans/:id/availability`.
- Orders: `GET /orders` (already vendor-scoped — works once staff tenancy is set).
- 86-list: `PATCH /dishes/:id`, `PATCH /drinks/:id` (availability/stock).

---

## 5. Frontend surfaces

1. **Vendor Admin — Staff hub** (`/dashboard/{vertical}/staff/*` + sidebar entry):
   - **All Staff** — directory with real filters (role, branch, on/off shift, status) + actions
     (Edit role, Resend invite, Revoke, Suspend/Activate). Replaces the current single page.
   - **Shift Manager** — roster board + live clock status.
   - **Reports & Analytics** — date range/branch/staff filters + the metrics in §3.6.
   - **Activity Tracker** — per-day feed.
2. **Staff invite + onboarding** (public): `/vendor-staff/accept-invite`, `/auth/staff/login`.
3. **Staff workspace app** (`/staff/*`) — role-gated pages per §3.4, with a global clock in/out
   widget; touch-optimized for floor roles, fullscreen for KDS.

---

## 6. Security

- Invite/password tokens: single-use, short-lived, hashed at rest; revoke on use/expiry.
- Tenancy: every staff-scoped read/write resolves `vendor` from the token — never from the body.
- Role gating server-side (`authorizeStaff`) for every workspace mutation.
- Audit voids/refunds/86-ing (money + stock actions) in `StaffActivityLog`.
- Staff cannot access vendor-admin endpoints (separate route trees + role checks).

---

## 7. Phasing

| Phase | Work | Acceptance |
|---|---|---|
| **S1 — Staff auth + tenancy** | `Staff.vendor/status/tokens`; staff login; `protect` + `resolveVendorScope` staff support; fix `toggleStaffStatus`. | A staff token scopes to its vendor on existing endpoints. |
| **S2 — Invitations** | invite service + email + accept/set-password/forgot flows + FE pages. | Invite → accept → set password → logged in; fallback forgot-password works. |
| **S3 — Admin hub** | All Staff (real filters/actions), Shift Manager, Activity, Reports shells. | Hub replaces the stub page; sidebar entry. |
| **S4 — Attribution + timestamps** | `Order.staffId`, status timestamps, `StaffActivityLog` writes. | Reports metrics have real data. |
| **S5 — Workspaces** | Waiter/KDS/bartender/VIP/cellar/front-desk/housekeeping pages; 86-list; min-spend tracker. | Each role lands on its workspace with correct gating. |
| **S6 — Clock/roster + reports** | `StaffShift` clock in/out, roster assignments, report endpoints + UI. | Clock works; reports filterable. |

Suggested order: **S1 → S2 → S4 → S3 → S5 → S6** (attribution early so reports have data).

---

## 8. Decisions needed

1. **Auth entity:** make `Staff` the auth record (recommended) vs link to a `User` with role `staff`.
2. **Role taxonomy:** confirm the staff-role list per vertical (waiter/chef/bartender/vip_host/
   bar_staff/front_desk/housekeeping/cashier/manager) and whether roles are per-branch.
3. **Branch tenancy:** is `Staff.branch` required, and does branch scope override vendor scope?
4. **Token transport:** single email link carrying both tokens (your proposal) vs a 2-step link.
5. **Order attribution:** is every staff-placed order attributed to the logged-in staff (recommended
   for reports), or only waiter/host roles?
6. **86-list scope:** dish/drink availability global per vendor, or per branch?
7. **KDS realtime:** Socket.io namespace for order queues (reuse `floor-plan` gateway pattern).

---

## 9. Appendix — key references

**Backend**
- `src/models/staff.model.ts`, `src/controllers/staff.controller.ts`, `src/routes/staff.routes.ts`
- `src/middlewares/auth.middleware.ts` (`protect`), `src/middlewares/permission.middleware.ts` (`authorize`)
- `src/utils/vendor.ts` (`resolveVendorScope` — staff throws today), `src/utils/jwt.ts`
- `src/services/mail.service.ts` (`sendEmail`, `sendPasswordResetEmail`)
- `src/models/{order,orderline}.model.ts` (attribution/timestamps), `src/models/unitactivitylog.model.ts` (log pattern)
- `src/models/{dish via menu.model,drink}.model.ts` (`trackStock`/`stock`/`availability`), `src/models/branch.model.ts`

**Frontend**
- `src/pages/vendor/shared/staff/index.tsx`, `src/services/staff.service.ts`
- `src/navigation/routes/vendor.tsx` (`*/staffs`), `src/navigation/sidebar/SideMenuList.ts`
- `src/features/orders/**` (order pad data), `src/features/floor-plan/**` (floor maps), `src/features/reservations/**`
