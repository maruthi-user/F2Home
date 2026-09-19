import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Crosshair, Loader, MapPin, PencilLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { runWithProcessingLock } from "@/utils/processingLock";
import { getCurrentPosition, reverseGeocode, formatCoords } from "@/utils/geo";
import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD } from "@/config/paymentMethods";
import {
  useGetMarketplaceRulesQuery,
  usePlaceOrderMutation,
} from "@/redux/f2home/marketplaceApi";
import {
  selectCartItems,
  selectCartCount,
  selectCartTotal,
  makeSelectCheckoutBlocker,
  clearCart,
} from "@/redux/slices/cartSlice";

const fieldClass =
  "w-full rounded-2xl bg-[#eef3e6] px-4 py-3 text-gray-700 outline-none border border-transparent focus:border-[#7cb342]";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200";

// Checkout: delivery address (current location OR typed) + payment method
// (COD today; Card / UPI declared in config/paymentMethods.js and enabled
// per the server's rules). POST /api/f2home/orders re-prices every line,
// enforces the minimums and decrements stock inside one transaction; any
// rejection comes back as a readable message shown next to the button.
export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useSelector((state) => state.auth?.user || null);
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const total = useSelector(selectCartTotal);
  const { data: rules } = useGetMarketplaceRulesQuery();
  const selectBlocker = useMemo(() => makeSelectCheckoutBlocker(rules), [rules]);
  const blocker = useSelector(selectBlocker);
  const [placeOrder] = usePlaceOrderMutation();
  // Server says which methods are live; the config supplies labels/icons.
  const enabledIds = useMemo(
    () => new Set((rules?.paymentMethods || []).filter((m) => m.enabled).map((m) => m.id)),
    [rules]
  );
  const isEnabled = (m) => (rules ? enabledIds.has(m.id) : m.enabled);

  const [addressMode, setAddressMode] = useState("CURRENT_LOCATION");
  const [current, setCurrent] = useState(null); // { lat, lng, label }
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { fullName: user?.fullName || "", phone: user?.phoneNumber || "", line1: "", landmark: "", city: "", pincode: "", note: "" },
  });

  // Guard: the cart page is the only way in, but a deep link / refresh with
  // an empty or under-minimum cart is sent back.
  useEffect(() => {
    if (items.length === 0 || blocker) navigate("/app/cart", { replace: true });
  }, [items.length, blocker, navigate]);

  const locate = async () => {
    setIsLocating(true);
    setLocationError("");
    try {
      const pos = await getCurrentPosition();
      const label = (await reverseGeocode(pos)) || `Current location (${formatCoords(pos)})`;
      setCurrent({ lat: pos.lat, lng: pos.lng, label });
    } catch (err) {
      setLocationError(err.message || "Unable to get your location.");
    } finally {
      setIsLocating(false);
    }
  };

  // Ask for the device location as soon as the "current location" mode is
  // chosen (it's the default), once.
  useEffect(() => {
    if (addressMode === "CURRENT_LOCATION" && !current && !isLocating && !locationError) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressMode]);

  const buildAddress = (form) => {
    if (addressMode === "CURRENT_LOCATION") {
      if (!current) throw new Error("We couldn't get your current location. Allow location access or enter the address manually.");
      return {
        mode: "CURRENT_LOCATION",
        label: current.label,
        line1: form.line1?.trim() || "",
        landmark: form.landmark?.trim() || "",
        lat: current.lat,
        lng: current.lng,
        contactName: form.fullName.trim(),
        contactPhone: form.phone.trim(),
      };
    }
    return {
      mode: "MANUAL",
      label: [form.line1, form.city, form.pincode].filter(Boolean).join(", "),
      line1: form.line1.trim(),
      landmark: form.landmark?.trim() || "",
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      contactName: form.fullName.trim(),
      contactPhone: form.phone.trim(),
    };
  };

  const onSubmit = async (form) => {
    setError("");
    try {
      if (blocker) throw new Error(`To checkout, ${blocker}.`);

      const address = buildAddress(form);
      const order = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        address: { ...address, note: form.note?.trim() || "" },
        paymentMethod,
      }).unwrap();

      dispatch(clearCart());
      toast({
        title: "Order placed!",
        description: `${order.itemCount} items · ₹${Number(order.total).toFixed(2)} · Cash on Delivery.`,
      });
      navigate("/app/orders", { replace: true });
    } catch (err) {
      setError(err?.data?.message || err.message || "Unable to place the order. Please try again.");
    }
  };

  const isManual = addressMode === "MANUAL";

  return (
    <Page className="max-w-5xl">
      <PageHeader icon={ClipboardCheck} title="Checkout" subtitle={`${count} items · ₹${total.toFixed(2)}`} backFallback="/app/cart" />

      <form
        onSubmit={handleSubmit((data) => runWithProcessingLock(() => onSubmit(data), "Placing your order…"))}
        className="grid gap-5 md:grid-cols-[1fr_300px]"
      >
        <div className="space-y-5">
          {/* Delivery address */}
          <Card className="p-4 sm:p-5">
            <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Delivery address</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ModeButton active={!isManual} onClick={() => setAddressMode("CURRENT_LOCATION")} icon={Crosshair} label="Use current location" />
              <ModeButton active={isManual} onClick={() => setAddressMode("MANUAL")} icon={PencilLine} label="Enter address manually" />
            </div>

            {!isManual && (
              <div className="mt-4 rounded-2xl bg-[#f2f8ea] p-4 text-sm dark:bg-gray-900">
                {isLocating ? (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader className="h-4 w-4 animate-spin" /> Finding your location…</span>
                ) : current ? (
                  <span className="flex items-start gap-2 text-gray-800 dark:text-gray-100">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#33691e]" />
                    <span>
                      {current.label}
                      <span className="block text-xs text-muted-foreground">{formatCoords(current)}</span>
                    </span>
                  </span>
                ) : (
                  <span className="text-red-600">{locationError || "Location not set."}</span>
                )}
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={locate} disabled={isLocating} className="rounded-full">
                    {current ? "Refresh location" : "Try again"}
                  </Button>
                  {locationError && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setAddressMode("MANUAL")} className="rounded-full">
                      Enter manually instead
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Receiver name</label>
                <input type="text" className={fieldClass} {...register("fullName", { required: "Required" })} />
                {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" className={fieldClass} {...register("phone", { required: "Required" })} />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>{isManual ? "House / street" : "House / street (optional)"}</label>
              <input type="text" placeholder="Door no., street" className={fieldClass}
                {...register("line1", { required: isManual ? "Address is required" : false })} />
              {errors.line1 && <p className="mt-1 text-sm text-red-500">{errors.line1.message}</p>}
            </div>
            <div className="mt-4">
              <label className={labelClass}>Landmark (optional)</label>
              <input type="text" placeholder="Near…" className={fieldClass} {...register("landmark")} />
            </div>

            {isManual && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Town / city</label>
                  <input type="text" className={fieldClass} {...register("city", { required: isManual ? "Required" : false })} />
                  {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>PIN code</label>
                  <input type="text" inputMode="numeric" className={fieldClass}
                    {...register("pincode", {
                      required: isManual ? "Required" : false,
                      pattern: { value: /^\d{6}$/, message: "Enter a 6-digit PIN code" },
                    })} />
                  {errors.pincode && <p className="mt-1 text-sm text-red-500">{errors.pincode.message}</p>}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className={labelClass}>Delivery note (optional)</label>
              <textarea rows={2} className={`${fieldClass} resize-none`} placeholder="Call on arrival…" {...register("note")} />
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-4 sm:p-5">
            <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Payment method</h2>
            <div className="mt-4 space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const { id, label, description, icon: Icon } = method;
                const enabled = isEnabled(method);
                const selected = paymentMethod === id;
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      !enabled
                        ? "cursor-not-allowed border-gray-200 opacity-50 dark:border-gray-700"
                        : selected
                          ? "cursor-pointer border-[#33691e] bg-[#f2f8ea] dark:bg-gray-900"
                          : "cursor-pointer border-gray-200 hover:border-[#8bc34a] dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={id}
                      checked={selected}
                      disabled={!enabled}
                      onChange={() => setPaymentMethod(id)}
                      className="accent-[#33691e]"
                    />
                    <Icon className="h-5 w-5 text-[#33691e]" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{label}</span>
                      <span className="block text-xs text-muted-foreground">{description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <Card className="h-fit p-4 md:sticky md:top-20">
          <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Order summary</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-gray-700 dark:text-gray-200">
                  {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                </span>
                <span className="shrink-0 text-[#33691e]">₹{(i.price * i.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-200">Total (COD)</span>
            <span className="text-xl font-bold text-[#33691e]">₹{total.toFixed(2)}</span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            className="mt-4 w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
          >
            Place order
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Pay ₹{total.toFixed(2)} in cash on delivery.</p>
        </Card>
      </form>
    </Page>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
        active
          ? "border-[#33691e] bg-[#f2f8ea] text-[#33691e] dark:bg-gray-900"
          : "border-gray-200 text-gray-600 hover:border-[#8bc34a] dark:border-gray-700 dark:text-gray-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
