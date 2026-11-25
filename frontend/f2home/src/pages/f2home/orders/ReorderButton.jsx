import { useState } from "react";
import { useSelector, useStore } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useGetReorderPreviewQuery, useGetSavedAddressesQuery } from "@/redux/f2home/marketplaceApi";
import { replaceFromReorder, selectCartItems } from "@/redux/slices/cartSlice";

const money = (price) => "₹" + Number(price).toFixed(2);
const fieldClass = "mt-1 w-full rounded-lg border bg-background p-2";

export default function ReorderButton({ orderId }) {
  const store = useStore();
  const navigate = useNavigate();
  const cart = useSelector(selectCartItems);
  const [open, setOpen] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const { currentData: addresses } = useGetSavedAddressesQuery(undefined, { skip: !open });
  const { currentData: preview, isFetching, isError, refetch } = useGetReorderPreviewQuery(
    { orderId, addressId }, { skip: !open, refetchOnMountOrArgChange: true }
  );
  const selected = preview?.farms.find((farm) => String(farm.farmerId) === farmerId)
    || (preview?.farms.length === 1 ? preview.farms[0] : null);
  const canContinue = !isFetching && !isError && selected && !selected.deliveryError
    && selected.items.some((item) => item.available > 0);

  function continueToCheckout() {
    if (!canContinue) return;
    const items = selected.items.filter((item) => item.available > 0).map((item) => ({
      productId: item.productId, name: item.name, unit: item.unit, price: Number(item.currentPrice),
      quantity: item.available, farmerId: selected.farmerId, farmerName: selected.name,
    }));
    store.dispatch(replaceFromReorder(items));
    setOpen(false);
    navigate("/app/checkout", { state: { reorderAddress: preview.address } });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => { setAddressId(""); setFarmerId(""); setOpen(true); }}>Reorder</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Review reorder · #{orderId}</DialogTitle>
            <DialogDescription>Review current prices, stock, and delivery before starting a new checkout.</DialogDescription>
          </DialogHeader>
          <label className="block text-sm">Delivery address
            <select value={addressId} onChange={(event) => { setAddressId(event.target.value); setFarmerId(""); }} className={fieldClass}>
              <option value="">Previous order address</option>
              {addresses?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>
          {preview?.address.label && <p className="break-words text-sm text-muted-foreground">{preview.address.label}</p>}
          {isFetching && <p role="status" className="text-sm">Checking current availability…</p>}
          {isError && <Button variant="outline" onClick={refetch}>Retry reorder review</Button>}
          {preview?.farms.length === 0 && <p className="text-sm">This order has no items to reorder.</p>}
          {preview?.farms.length > 1 && (
            <label className="block text-sm">Choose one farm for this checkout
              <select value={farmerId} onChange={(event) => setFarmerId(event.target.value)} className={fieldClass}>
                <option value="">Select a farm</option>
                {preview.farms.map((farm) => <option key={farm.farmerId} value={farm.farmerId}>{farm.name}</option>)}
              </select>
            </label>
          )}
          {selected && (
            <div className="space-y-2 text-sm">
              {selected.deliveryError ? <p className="rounded-lg bg-amber-50 p-2 text-amber-900">{selected.deliveryError}</p>
                : <p>Next delivery: <time dateTime={selected.deliveryDate}>{selected.deliveryDate}</time></p>}
              <ul className="divide-y rounded-lg border px-3">
                {selected.items.map((item) => (
                  <li key={item.itemId} className="space-y-1 py-2">
                    <p className="font-semibold">{item.name}</p>
                    <p>Previously {item.requested} {item.unit} at {money(item.previousPrice)} / {item.unit}</p>
                    {item.currentPrice == null ? <p className="text-muted-foreground">Listing unavailable. It won’t be added.</p> : (
                      <>
                        <p className={Number(item.previousPrice) !== Number(item.currentPrice) ? "font-semibold" : ""}>
                          Current price {money(item.currentPrice)} / {item.unit}{Number(item.previousPrice) !== Number(item.currentPrice) && " · Price changed"}
                        </p>
                        <p>{item.inStock} {item.unit} in stock. {item.available > 0 ? item.available + " will be added." : "It won’t be added."}</p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cart.length > 0 && <p className="text-sm text-muted-foreground">Continuing will replace the items currently in your cart.</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Back</Button>
            <Button type="button" disabled={!canContinue} onClick={continueToCheckout}>
              {cart.length > 0 ? "Replace cart and continue" : "Continue with available items"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
