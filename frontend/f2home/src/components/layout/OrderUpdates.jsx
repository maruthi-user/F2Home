import { Bell } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  useGetOrderUpdatesQuery, useMarkOrderUpdatesReadMutation,
} from "@/redux/f2home/marketplaceApi";

const labels = {
  CONFIRMED: "Accepted by farmer",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery attempt failed",
  DELIVERED: "Delivered",
};
const timestamp = (value) => new Date(value).toLocaleString("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
}) + " IST";

export function OrderUpdates() {
  const { data, isError, isLoading, refetch } = useGetOrderUpdatesQuery(undefined, { pollingInterval: 30000 });
  const [markRead] = useMarkOrderUpdatesReadMutation();
  const unread = data?.unread || 0;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) refetch(); }}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0"
          aria-label={unread ? "Order updates, " + unread + " unread" : "Order updates"}>
          <Bell className="size-5" />
          {unread > 0 && <span aria-hidden className="absolute right-0 top-0 rounded-full bg-[#245730] px-1 text-[10px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[65vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto">
        <DropdownMenuLabel>Order updates</DropdownMenuLabel>
        {unread > 0 && <DropdownMenuItem onSelect={() => markRead(null)}>Mark all as read</DropdownMenuItem>}
        <DropdownMenuSeparator />
        {isLoading && <p className="p-3 text-sm">Loading updates…</p>}
        {isError && <DropdownMenuItem onSelect={refetch}>Couldn’t load updates. Try again.</DropdownMenuItem>}
        {data?.updates.length === 0 && <p className="p-3 text-sm text-muted-foreground">No order updates yet.</p>}
        {data?.updates.map((update) => (
          <DropdownMenuItem key={update.id} asChild onSelect={() => { if (!update.read) markRead(update.id); }}>
            <Link href={"/app/orders/" + update.orderId} className="block">
              <span className={update.read ? "block" : "block font-semibold"}>{labels[update.status]} · Order #{update.orderId}</span>
              <span className="block text-xs text-muted-foreground">{timestamp(update.occurredAt)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

