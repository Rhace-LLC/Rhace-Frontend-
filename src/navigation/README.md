# Navigation

Single composition root for the app's UI shells and routing.

```
navigation/
├─ index.tsx              # ORCHESTRATOR — wraps each route group in its layout (useRoutes)
├─ public_layout/         # PublicAuth/public shell        → <Outlet/>
│  └─ index.tsx
├─ user_layout/           # Authenticated user shell       → <Outlet/>
│  ├─ index.tsx
│  └─ _sub_component/     # UserHeader, Footer (+ barrel)
├─ vendor_layout/         # Vendor dashboard shell          → Sidebar + VendorHeader + <Outlet/>
│  ├─ index.tsx
│  └─ _sub_component/     # VendorHeader, VendorHeader2
├─ admin_layout/          # Admin dashboard shell           → AdminSidebar + AdminHeader + <Outlet/>
│  ├─ index.tsx
│  └─ _sub_component/     # AdminHeader
├─ sidebar/               # Shared vendor/admin sidebars
│  ├─ index.tsx           # Vendor sidebar orchestrator
│  ├─ AdminSidebar.tsx
│  ├─ SideMenuList.ts
│  └─ _sub_component/     # SidebarItem (+ barrel)
└─ routes/                # Route tables only (data, no UI)
   ├─ public.tsx
   ├─ user.tsx
   ├─ vendor.tsx
   └─ admin.tsx
```

## Conventions

- `index.tsx` is always the thin orchestrator for its folder.
- Section components live in `_sub_component/` and are re-exported through its barrel.
- Route groups in `routes/` are plain `RouteObject[]`; they never import layout chrome.
- `navigation/index.tsx` is the only place that binds a route group to a layout.

## Auth

All auth is provided by `src/contexts/AuthContext.tsx` (`AuthProvider` + `useAuth`).
Role-scoped session helpers used by non-React code (e.g. the axios interceptor) live in
`src/contexts/authSession.ts`. The Redux `auth` slice no longer exists.

```ts
const { user, vendor, admin, isAuthenticated, setUser, setVendor, setAdmin, logout } = useAuth();
logout('vendor'); // clears session and redirects to the role login
```
