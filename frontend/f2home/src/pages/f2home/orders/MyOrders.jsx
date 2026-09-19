import { Banknote, Loader, MapPin, Package, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { useGetMyOrdersQuery, mediaUrl } from "@/redux/f2home/marketplaceApi";
import { getPaymentMethod } from "@/config/paymentMethods";

// Manual addresses carry their parts (street, town, PIN); current-location
// addresses carry a geocoded label plus optional street/landmark. Either
// way, each piece is printed once.
const formatAddress = (a) =>
  (a.mode === "MANUAL"
    ? [a.line1, a.landmark, a.city, a.pincode]
    : [a.line1, a.landmark, a.label]
  )
    .filter(Boolean)
    .join(", ");

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// A customer's order history from GET /api/f2home/orders: one order = many
// line items (a snapshot taken at checkout) + delivery address + payment.
export default function MyOrders() {
  const { data: orders = [], isLoading, error } = useGetMyOrdersQuery();

  return (
    <Page className="max-w-4xl">
      <PageHeader
        icon={Package}
        title="My orders"
        subtitle={isLoading ? "" : `${orders.length} order${orders.length === 1 ? "" : "s"} from local farmers`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-600">
          {error?.data?.message || "Couldn't load your orders. Please try again."}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          You haven't bought anything yet — head to the Marketplace to explore.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const method = getPaymentMethod(order.payment?.method) || null;
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-[#f7faf3] px-4 py-3 text-xs dark:border-gray-800 dark:bg-gray-900">
                  <span className="text-muted-foreground">
                    Order #{order.id} · {formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-[#d9eebf] px-2.5 py-0.5 font-medium text-[#33691e]">
                    {(order.status || "PLACED").replace(/_/g, " ")}
                  </span>
                </div>

                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items.map((item, index) => {
                    const url = mediaUrl(item.thumbnailUrl);
                    return (
                      <li key={`${order.id}:${item.productId ?? index}`} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f2f8ea]">
                          {url ? (
                            <img src={url} alt={item.productName} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-[#8bc34a]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-[#3c3c3c] dark:text-white">{item.productName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit || ""} × ₹{item.unitPrice}
                            {item.farmerName ? ` · ${item.farmerName}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-[#33691e]">₹{Number(item.lineTotal).toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-wrap items-start justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {order.address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#33691e]" />
                        <span>{formatAddress(order.address)}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 shrink-0 text-[#33691e]" />
                      {method?.label || order.payment?.method || "Cash on Delivery"}
                      {order.payment?.status ? ` · ${order.payment.status.toLowerCase()}` : ""}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-[#33691e]">₹{Number(order.total).toFixed(2)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
