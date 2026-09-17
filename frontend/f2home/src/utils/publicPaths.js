// Routes that render outside the app chrome (no TopNav / Sidebar) and are
// reachable without a valid session — login, registration, and the
// OTP-based password-reset flow. Auth-expiry handling must never fire on
// these: someone mid password-reset shouldn't get bounced by a stale/expiring
// token left over from an unrelated earlier session. Kept in one place so
// App.jsx (route chrome), AuthExpiryWatcher (session-expiry modal + redirect)
// and apiSlice (401 handling) can't drift out of sync.
export const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/restore-password",
];

export function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
