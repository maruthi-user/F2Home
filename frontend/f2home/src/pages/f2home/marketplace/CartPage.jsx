import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader, { Page } from "@/components/common/PageHeader";
import {
  useGetMarketplaceRulesQuery,
  useGetProductsByIdsQuery,
  firstImageUrl,
} from "@/redux/f2home/marketplaceApi";
import {
  selectCartItems,
  selectCartCount,
  selectCartTotal,
  makeSelectCheckoutBlocker,
  setQuantity,
  removeFromCart,
} from "@/redux/slices/cartSlice";

// The customer's cart. Line items come from the cart slice; the live
// product (thumbnail, current stock) is re-read from the API so a farmer
// lowering stock is reflected before checkout. Checkout stays disabled
// until the server's minimum item count AND minimum value are both met.
export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const total = useSelector(selectCartTotal);
  const { data: rules } = useGetMarketplaceRulesQuery();
  const selectBlocker = useMemo(() => makeSelectCheckoutBlocker(rules), [rules]);
  const blocker = useSelector(selectBlocker);

  const ids = items.map((i) => i.productId);
  const { data: liveProducts = [] } = useGetProductsByIdsQuery(ids, { skip: ids.length === 0 });
  const live = useMemo(
    () => Object.fromEntries(liveProducts.map((p) => [p.id, p])),
    [liveProducts]
  );

  const minItems = rules?.minOrderItems ?? 5;
  const minValue = Number(rules?.minOrderValue ?? 500);
  const itemsProgress = Math.min(100, (count / minItems) * 100);
  const valueProgress = Math.min(100, (total / minValue) * 100);

  return (
    <Page className="max-w-5xl">
      <PageHeader
        icon={ShoppingCart}
        title="Your cart"
        subtitle={count ? `${count} item${count === 1 ? "" : "s"} · ₹${total.toFixed(2)}` : "Nothing here yet."}
        backFallback="/app/marketplace"
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-[#8bc34a]" />
          Your cart is empty — browse the Marketplace to add fresh produce.
          <div className="mt-4">
            <Button type="button" onClick={() => navigate("/app/marketplace")} className="rounded-full bg-[#33691e] text-white hover:opacity-90">
              Go to Marketplace
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {items.map((item) => {
              const product = live[item.productId];
              const imageUrl = firstImageUrl(product);
              const stock = product ? product.quantity : Infinity;
              const overStock = product && item.quantity > product.quantity;
              // Loaded the batch and this id is missing -> the listing is gone.
              const gone = liveProducts.length > 0 && !product;

              return (
                <Card key={item.productId} className="flex items-center gap-3 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f2f8ea]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-6 w-6 text-[#8bc34a]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[#3c3c3c] dark:text-white">{item.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">by {item.farmerName}</p>
                    <p className="mt-1 text-sm text-[#33691e]">
                      ₹{item.price} / {item.unit}
                    </p>
                    {gone && <p className="mt-1 text-xs text-red-600">No longer available — remove it to continue.</p>}
                    {overStock && (
                      <p className="mt-1 text-xs text-red-600">Only {product.quantity} {item.unit} left — reduce the quantity.</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-[#33691e]">₹{(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => dispatch(setQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                        disabled={item.quantity >= stock}
                        onClick={() => dispatch(setQuantity({ productId: item.productId, quantity: item.quantity + 1 }))}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => dispatch(removeFromCart(item.productId))} aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit p-4 md:sticky md:top-20">
            <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Order summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <Progress label={`Items (min ${minItems})`} value={`${count} / ${minItems}`} pct={itemsProgress} ok={count >= minItems} />
              <Progress label={`Cart value (min ₹${minValue})`} value={`₹${total.toFixed(0)} / ₹${minValue}`} pct={valueProgress} ok={total >= minValue} />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
              <span className="font-medium text-gray-700 dark:text-gray-200">Total</span>
              <span className="text-xl font-bold text-[#33691e]">₹{total.toFixed(2)}</span>
            </div>

            <Button
              type="button"
              disabled={!!blocker}
              onClick={() => navigate("/app/checkout")}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90 disabled:opacity-50"
            >
              Proceed to checkout
            </Button>
            {blocker && (
              <p className="mt-2 text-center text-xs text-red-600">To checkout, {blocker}.</p>
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}

function Progress({ label, value, pct, ok }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className={ok ? "font-medium text-[#33691e]" : "font-medium text-gray-700 dark:text-gray-200"}>{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${ok ? "bg-[#33691e]" : "bg-[#8bc34a]"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
