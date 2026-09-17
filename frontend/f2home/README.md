# F2Home frontend

React 19 + Vite SPA for F2Home. Renders the public auth flow and, once signed
in, the marketplace, the farmer's product listings and the customer's orders.

## Run

```bash
npm install
npm run dev      # http://localhost:3001, talks to http://localhost:8081
npm run build    # -> build/  (also the Capacitor webDir)
npm run lint
npm run preview  # serve the production build on http://localhost:3001
```

The backend must be running on port 8081 (see `../../backend`).

## Source layout

```
src/
├── index.jsx          React root + Redux Provider
├── App.jsx            route table; public routes vs. the AppShell chrome
├── LoginPage.jsx      login (phone number + password)
├── pages/
│   ├── auth/          RegisterPage (OTP), ForgotPassword, RestorePassword, AuthLayout, SuccessScreen
│   ├── f2home/        Welcome, marketplace/, farm/ (farmer listings), orders/
│   └── not-found.jsx
├── components/
│   ├── ui/            Radix-based primitives (button, dialog, select, toast, ...)
│   ├── layout/        AppShell, TopNav, Sidebar, AppLauncher
│   └── common/       AuthExpiryWatcher, ProcessingOverlay
├── redux/
│   ├── store.js       configureStore
│   ├── slices/        apiSlice (RTK Query base), authSlice, processingSlice
│   └── f2home/authApi.js   the F2Home auth endpoints
├── context/           LayoutContext
├── config/            apps.json, marketplaceCategories.js
├── hooks/             use-toast
├── lib/               utils.js (cn helper)
└── utils/             jwt, publicPaths, permissions, moduleAccess,
                       rolePermissionMap, processingLock, marketplaceDb, formatStatus
```

Imports use the `@/` alias for `src/` (configured in `vite.config.js`).

## Notes for contributors

- **Add a route in `App.jsx`.** If it must render without a session, add the
  path to `PUBLIC_PATHS` in `src/utils/publicPaths.js` first - `App.jsx`,
  `AuthExpiryWatcher` and `apiSlice` all read that one list, so an unlisted
  public route will get bounced by session-expiry handling.
- **API calls go through `src/redux/slices/apiSlice.js`**, never raw `fetch`.
  It sets the `Authorization` header and clears the session on a 401.
- **Anything slow or destructive** (submit, export, approve) should run inside
  `runWithProcessingLock` from `src/utils/processingLock.js`; the global
  `ProcessingOverlay` renders from that lock.
- **Marketplace data is client-side.** Products, orders and images live in
  IndexedDB via `src/utils/marketplaceDb.js` - there is no server API yet.
- **`public/` is copied verbatim into `build/`.** Never put an `index.html`
  there: it would overwrite the one Vite generates from the root `index.html`.
