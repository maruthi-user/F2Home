import { Clock } from "lucide-react";
import useNow from "@/hooks/useNow";
import { formatTimeLeft, msUntil } from "@/utils/expiry";

// "Expires in 1d 3h" chip for perishable listings; renders nothing for
// non-perishables. Turns red inside the last 6 hours.
export default function ExpiryBadge({ product, className = "" }) {
  const now = useNow();
  if (!product?.perishable || !product.expiresAt) return null;
  const ms = msUntil(product.expiresAt, now);
  const urgent = ms <= 6 * 3600 * 1000;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        urgent ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
      } ${className}`}
      title="Perishable listings are removed automatically 48 hours after being added"
    >
      <Clock className="h-3 w-3" />
      {formatTimeLeft(ms)}
    </span>
  );
}
