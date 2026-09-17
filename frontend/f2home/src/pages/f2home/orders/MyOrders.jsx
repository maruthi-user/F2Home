import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getOrdersByCustomer } from "@/utils/marketplaceDb";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// A customer's own purchase history - "buy" isn't a dead-end action, they
// can see what they've bought. Orders are written locally by BuyDialog (see
// pages/f2home/marketplace/BuyDialog.jsx) - no payment/backend involved.
export default function MyOrders() {
  const user = useSelector((state) => state.auth?.user || null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    if (!user?.phoneNumber) return;

    getOrdersByCustomer(user.phoneNumber)
      .then((list) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt)
        );
        setOrders(sorted);

        const urls = {};
        sorted.forEach((order) => {
          if (order.productImage) {
            urls[order.id] = URL.createObjectURL(order.productImage);
          }
        });
        setImageUrls(urls);
      })
      .finally(() => setIsLoading(false));

    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phoneNumber]);

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="rounded-3xl bg-gradient-to-r from-[#f2f8ea] via-[#d9eebf] to-[#8bc34a] p-8 md:p-10">
        <h1 className="text-3xl font-bold text-[#33691e] md:text-4xl">My Orders</h1>
        <p className="mt-2 text-[#2e7d32]">Everything you've bought from local farmers.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground dark:border-gray-700">
          You haven't bought anything yet — head to the Marketplace to explore.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="flex items-center gap-4 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f2f8ea]">
                {imageUrls[order.id] ? (
                  <img
                    src={imageUrls[order.id]}
                    alt={order.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-6 w-6 text-[#8bc34a]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-[#3c3c3c] dark:text-white">
                  {order.productName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {order.quantity} × ₹{order.unitPrice} · {formatDate(order.purchasedAt)}
                </p>
              </div>

              <span className="shrink-0 text-lg font-bold text-[#33691e]">
                ₹{order.totalPrice}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
