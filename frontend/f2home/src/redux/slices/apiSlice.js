import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { expireSession } from "./authSlice";
import { isPublicPath } from "../../utils/publicPaths";
import { Capacitor } from "@capacitor/core";

const host = window.location.hostname;
const isSecure = window.location.protocol === "https:";

// API base URL per environment:
//   local  -> f2home.com (via the hosts file) or localhost, served over
//             http on the Vite dev port: the backend runs on :8081 on this
//             machine.
//   dev    -> dev.f2home.com (GitHub Pages) : api-dev.f2home.com (Render)
//   prod   -> f2home.com (https) : api.f2home.com
//   native -> api.f2home.com
const isLocalDevHost =
  host === "localhost" ||
  host === "127.0.0.1" ||
  (host === "f2home.com" && !isSecure);

let BASE_URL;

if (Capacitor.isNativePlatform()) {
  BASE_URL = "https://api.f2home.com";
} else if (isLocalDevHost) {
  BASE_URL = "http://localhost:8081";
} else if (host === "192.168.0.151") {
  BASE_URL = "http://192.168.0.151:8081";
} else if (host === "dev.f2home.com") {
  BASE_URL = "https://api-dev.f2home.com";
} else {
  BASE_URL = "https://api.f2home.com";
}
// Absolute API origin - used to build <img>/<video> src for product media,
// which the browser fetches directly (no Authorization header; the media
// endpoint is public by unguessable UUID).
export const API_BASE_URL = BASE_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    if (endpoint !== "login") {
      const token = getState()?.auth?.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    // headers.set("Content-Type", "application/json");
    return headers;
  },
});

// On GitHub Pages the app is served under a sub path (e.g. /F2Home/), so the
// raw window pathname must have that prefix stripped before it is matched
// against PUBLIC_PATHS (which are root-relative, e.g. /auth/login).
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
function stripBasePath(pathname) {
  if (!BASE_PATH) return pathname;
  return pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || "/"
    : pathname;
}

// If the JWT has expired or is otherwise rejected by the backend, clear the
// session so the app shows the "session expired" modal and redirects to the
// login page (see AuthExpiryWatcher). Excluded:
// - the login endpoint - a failed login is a 401 with no session to clear.
// - any public route (login, register, activate-account, forgot/restore
//   password) - those pages work without a session, and a stale/expiring
//   token left over from an unrelated earlier session must never interrupt
//   someone activating an account or resetting a password.
const baseQueryWithAuthLogout = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (
    result.error?.status === 401 &&
    api.endpoint !== "login" &&
    !isPublicPath(stripBasePath(window.location.pathname))
  ) {
    api.dispatch(expireSession());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuthLogout,
  tagTypes: ["F2HomeAuth"],
  endpoints: () => ({}),
});

