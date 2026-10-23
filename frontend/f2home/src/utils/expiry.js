// Time-left helpers for perishable listings. The backend sends expiresAt as a
// zone-less local timestamp (server and users share the same zone).

export const msUntil = (expiresAt, now = Date.now()) =>
  expiresAt ? new Date(expiresAt).getTime() - now : null;

export function formatTimeLeft(ms) {
  if (ms == null) return "";
  if (ms <= 0) return "Expired";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${Math.max(m, 1)}m left`;
}

export const isExpired = (expiresAt, now = Date.now()) => {
  const ms = msUntil(expiresAt, now);
  return ms != null && ms <= 0;
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
