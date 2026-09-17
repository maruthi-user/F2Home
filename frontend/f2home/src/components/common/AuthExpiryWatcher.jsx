import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { expireSession, logout } from "@/redux/slices/authSlice";
import { getTokenExpiryMs } from "@/utils/jwt";
import { isPublicPath } from "@/utils/publicPaths";

// Browsers clamp setTimeout delays to a signed 32-bit int (~24.8 days).
const MAX_TIMEOUT_MS = 2_147_483_647;
const REDIRECT_COUNTDOWN_SECONDS = 3;

// Unmounted/remounted by the parent whenever `sessionExpired` flips, so each
// occurrence starts its own fresh countdown.
function SessionExpiredModal({ onFinished }) {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinished();
      return;
    }
    const timeoutId = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [secondsLeft, onFinished]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40">
          <Clock className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-[#3c3c3c] dark:text-gray-100">
          Your session has expired
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Please log in again to continue. You&rsquo;ll be redirected to the
          login page in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}.
        </p>
      </div>
    </div>,
    document.body
  );
}

// Mounted once, globally: the moment the current JWT's `exp` claim is
// reached (or the API rejects a request with 401 — see apiSlice.js), it
// clears the session, shows a "session expired" modal, and redirects to the
// login page after a short countdown.
export default function AuthExpiryWatcher() {
  const token = useSelector((state) => state.auth?.token);
  const sessionExpired = useSelector((state) => state.auth?.sessionExpired);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Schedule an automatic logout for the moment the JWT's `exp` claim is
  // reached. Skipped on public routes (login, register, activate-account,
  // forgot/restore password) - a stale/expiring token left over from an
  // unrelated earlier session must never interrupt someone activating an
  // account or resetting a password on those pages. The path is re-checked
  // at fire time (not captured up front) since the user may navigate between
  // when the timer is scheduled and when it goes off.
  useEffect(() => {
    if (!token) return;

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return;

    const expire = () => {
      if (isPublicPath(window.location.pathname)) return;
      dispatch(expireSession());
    };

    const remaining = expiryMs - Date.now();
    if (remaining <= 0) {
      expire();
      return;
    }

    const timeoutId = setTimeout(expire, Math.min(remaining, MAX_TIMEOUT_MS));
    return () => clearTimeout(timeoutId);
  }, [token, dispatch]);

  if (!sessionExpired || isPublicPath(window.location.pathname)) return null;

  const handleFinished = () => {
    navigate("/auth/login", { replace: true });
    // Clears sessionExpired so this modal disappears once the redirect lands.
    dispatch(logout());
  };

  return <SessionExpiredModal onFinished={handleFinished} />;
}
