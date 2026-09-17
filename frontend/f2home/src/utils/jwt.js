// Decodes a JWT's payload without verifying the signature (verification is the
// backend's job — this is only used client-side to read the `exp` claim).
export function decodeJwt(token) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Returns the token's `exp` claim in epoch milliseconds, or null if it can't be read.
export function getTokenExpiryMs(token) {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return null;
  return decoded.exp * 1000;
}
