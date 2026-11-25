import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import useCustomerLocation from "@/hooks/useCustomerLocation";
import { useSelector, useStore } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardCheck, Crosshair, Loader, MapPin, PencilLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { v4 as uuid } from "uuid";
import { runWithProcessingLock } from "@/utils/processingLock";
import { forwardGeocode, getCurrentPosition, isValidCoords, reverseGeocode, formatCoords } from "@/utils/geo";
import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD } from "@/config/paymentMethods";
import {
  useGetMarketplaceRulesQuery,
  useGetCheckoutQuoteMutation,
  useGetSavedAddressesQuery,
  useSaveDeliveryAddressMutation,
  useDeleteSavedAddressMutation,
  usePlaceOrderMutation,
} from "@/redux/f2home/marketplaceApi";
import {
  selectCartItems,
  selectCartCount,
  canAddFromFarm,
  clearCart,
} from "@/redux/slices/cartSlice";

const fieldClass =
  "w-full rounded-2xl bg-[#eef3e6] px-4 py-3 text-gray-700 outline-none border border-transparent focus:border-[#7cb342]";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200";

const money = (amount) => "₹" + Number(amount).toFixed(2);
const dateLabel = (date) => new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeZone: "Asia/Kolkata",
}).format(new Date(date + "T00:00:00+05:30"));

export default function CheckoutPage() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const previousAddress = location.state?.reorderAddress;
  const browsingAddressId = useCustomerLocation().location?.savedAddressId;
  const user = useSelector((state) => state.auth?.user || null);
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const { data: rules } = useGetMarketplaceRulesQuery();
  const oneFarm = items.length > 0 && canAddFromFarm(items, items[0].farmerId);
  const [getCheckoutQuote] = useGetCheckoutQuoteMutation();
  const [placeOrder] = usePlaceOrderMutation();
  // Server says which methods are live; the config supplies labels/icons.
  const enabledIds = useMemo(
    () => new Set((rules?.paymentMethods || []).filter((m) => m.enabled).map((m) => m.id)),
    [rules]
  );
  const isEnabled = (m) => (rules ? enabledIds.has(m.id) : m.enabled);

  const [addressMode, setAddressMode] = useState(previousAddress ? "SAVED" : "CURRENT_LOCATION");
  const [savedId, setSavedId] = useState(previousAddress ? "previous" : "");
  const [addressName, setAddressName] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const { currentData: addresses, isError: addressesError } = useGetSavedAddressesQuery(undefined, { skip: !user });
  const [saveAddress, { isLoading: savingAddress }] = useSaveDeliveryAddressMutation();
  const [deleteAddress, { isLoading: deletingAddress }] = useDeleteSavedAddressMutation();
  const initialAddressResolved = useRef(false);
  const selectedAddress = savedId === "previous" ? previousAddress : addresses?.find((entry) => String(entry.id) === savedId)?.address;
  const [current, setCurrent] = useState(null); // { lat, lng, label }
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [editingPhoneAddress, setEditingPhoneAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const owner = user?.phoneNumber;
  const attemptStorageKey = "f2home-checkout-attempt:" + owner;
  const [pendingAttempt, setPendingAttempt] = useState(() => {
    if (!owner) return null;
    try {
      return JSON.parse(sessionStorage.getItem(attemptStorageKey));
    } catch {
      return null;
    }
  });
  const pending = pendingAttempt?.owner === owner ? pendingAttempt : null;

  function saveAttempt(attempt) {
    setPendingAttempt(attempt);
    try {
      if (attempt) sessionStorage.setItem(attemptStorageKey, JSON.stringify(attempt));
      else sessionStorage.removeItem(attemptStorageKey);
    } catch {
      // A retry in this mounted page can still reuse the attempt.
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { fullName: previousAddress?.contactName || user?.fullName || "", phone: previousAddress?.contactPhone || user?.phoneNumber || "", line1: "", landmark: "", city: "", pincode: "", note: "" },
  });

  useEffect(() => {
    if (!oneFarm && !pending) navigate("/app/cart", { replace: true });
  }, [oneFarm, pending, navigate]);

  const orderLines = items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  const revision = JSON.stringify([watch(), addressMode, current, selectedAddress, paymentMethod, orderLines]);
  const quote = review?.revision === revision ? review.quote : null;

  const locate = async () => {
    setIsLocating(true);
    setLocationError("");
    setReview(null);
    setCurrent(null);
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
    if (!pending && addressMode === "CURRENT_LOCATION" && !current && !isLocating && !locationError) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressMode]);

  function selectAddress(id) {
    initialAddressResolved.current = true;
    setSavedId(id);
    setReview(null);
    setAddressError("");
    setAddressMessage("");
    const address = id === "previous" ? previousAddress : addresses?.find((entry) => String(entry.id) === id)?.address;
    if (!address) {
      setAddressMode("CURRENT_LOCATION");
      return;
    }
    setAddressMode("SAVED");
    setValue("fullName", address.contactName);
    setValue("phone", address.contactPhone);
  }

  useEffect(() => {
    if (initialAddressResolved.current || !addresses) return;
    initialAddressResolved.current = true;
    const preferred = addresses.find((entry) => entry.id === browsingAddressId)
      || addresses.find((entry) => entry.defaultAddress);
    if (!previousAddress && preferred) {
      setSavedId(String(preferred.id));
      setAddressMode("SAVED");
      setValue("fullName", preferred.address.contactName);
      setValue("phone", preferred.address.contactPhone);
    }
  }, [addresses, previousAddress, browsingAddressId, setValue]);

  const buildAddress = async (form) => {
    if (addressMode === "SAVED") {
      if (!selectedAddress) throw new Error("Choose a delivery address.");
      return { ...selectedAddress, contactName: form.fullName.trim(), contactPhone: form.phone.trim() };
    }
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
    const addressText = [form.line1, form.city, form.pincode].map((part) => part.trim()).join(", ");
    const match = await forwardGeocode(addressText + ", India");
    if (!isValidCoords(match)) {
      throw new Error("We couldn’t locate this address. Check the street, town and PIN, or use your current location at the delivery address.");
    }
    return {
      mode: "MANUAL",
      label: match.label.slice(0, 255),
      lat: match.lat,
      lng: match.lng,
      line1: form.line1.trim(),
      landmark: form.landmark?.trim() || "",
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      contactName: form.fullName.trim(),
      contactPhone: form.phone.trim(),
    };
  };

  async function saveCurrentAddress(form) {
    setAddressError("");
    setAddressMessage("");
    if (!addressName.trim()) {
      setAddressError("Enter a name for this address.");
      return;
    }
    try {
      const address = review?.revision === revision ? review.request.address : await buildAddress(form);
      await saveAddress({ name: addressName.trim(), address }).unwrap();
      setAddressName("");
      setAddressMessage("Delivery address saved.");
    } catch (err) {
      setAddressError(err?.data?.message || err.message || "Couldn’t save this address.");
    }
  }

  async function removeAddress() {
    if (!window.confirm("Remove this saved delivery address?")) return;
    try {
      await deleteAddress(savedId).unwrap();
      selectAddress("");
      setAddressMessage("Saved address removed.");
    } catch (err) {
      setAddressError(err?.data?.message || "Couldn’t remove this address.");
    }
  }

  async function submitAttempt(attempt) {
    const order = await runWithProcessingLock(() => placeOrder({
      attemptId: attempt.id,
      body: attempt.body,
    }).unwrap(), "Placing your order…");
    if (!order?.id) throw new Error("The order reference wasn’t returned.");

    // Keep newer cart changes if the customer edited the cart before retrying.
    const cart = store.getState().cart;
    const requested = attempt.body.items;
    if (cart.owner === attempt.owner && cart.items.length === requested.length &&
        cart.items.every((item) => requested.some((line) =>
          line.productId === item.productId && line.quantity === item.quantity))) {
      store.dispatch(clearCart());
    }
    saveAttempt(null);
    navigate("/app/orders/" + order.id, { replace: true });
  }

  function handlePlacementError(err) {
    if (err?.status === 400) {
      saveAttempt(null);
      setReview(null);
      setError(err.data?.message || "Review the current quote and try again.");
    } else if (err?.status === 409) {
      setError(err.data?.message || "This checkout attempt cannot be reused with different order details.");
    } else {
      setError("We couldn’t verify your order. Retry this same checkout attempt to recover it safely.");
    }
  }

  async function retryOrder() {
    if (!pending || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await submitAttempt(pending);
    } catch (err) {
      handlePlacementError(err);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const onSubmit = async (form) => {
    if (submitting.current || pending) return;
    submitting.current = true;
    setError("");
    setBusy(true);
    try {
      if (!oneFarm) throw new Error("Keep items from one farm before checking delivery.");
      if (!quote) {
        setReview(null);
        const address = await buildAddress(form);
        const request = {
          items: orderLines,
          address: { ...address, note: form.note?.trim() || "" },
          paymentMethod,
        };
        const nextQuote = await getCheckoutQuote(request).unwrap();
        setReview({ revision, quote: nextQuote, request });
        setEditingPhoneAddress(false);
        return;
      }

      const attempt = { id: uuid(), owner, body: { ...review.request, quoteVersion: quote.version } };
      saveAttempt(attempt);
      try {
        await submitAttempt(attempt);
      } catch (err) {
        handlePlacementError(err);
      }
    } catch (err) {
      setReview(null);
      setError(err?.data?.message || err.message || "Unable to complete checkout. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <Page className="max-w-xl">
        <PageHeader icon={ClipboardCheck} title="Check your order" backFallback="/app/cart" />
        <Card className="space-y-4 p-5">
          <p role={error ? "alert" : "status"}>
            {error || (busy ? "Checking your order…" : "You have an unfinished checkout. Retry to confirm the result.")}
          </p>
          <Button disabled={busy} onClick={retryOrder} className="bg-[#245730] text-white hover:bg-[#183f23]">
            Retry order
          </Button>
        </Card>
      </Page>
    );
  }

  const isManual = addressMode === "MANUAL";
  const isSaved = addressMode === "SAVED";

  return (
    <Page className="max-w-5xl phone-module phone-checkout">
      <PageHeader icon={ClipboardCheck} title="Checkout" subtitle={count + " items · " + (items[0]?.farmerName || "One farm per order")} backFallback="/app/cart" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-5 md:grid-cols-[1fr_300px]"
      >
        <div className="space-y-5">
          {/* Delivery address */}
          {quote && !editingPhoneAddress && (
            <div className="phone-only phone-address-review">
              <MapPin size={22} aria-hidden />
              <div className="min-w-0">
                <strong>{isSaved && selectedAddress?.name ? selectedAddress.name : "Delivery address"}</strong>
                <p className="break-words">{[review.request.address.line1, review.request.address.city, review.request.address.pincode]
                  .filter(Boolean).join(", ") || review.request.address.label}</p>
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setEditingPhoneAddress(true)}>Edit</Button>
            </div>
          )}
          <Card className={`phone-address-card p-4 sm:p-5 ${quote && !editingPhoneAddress ? "phone-hide" : ""}`}>
            <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Delivery address</h2>

            {(previousAddress || addresses?.length > 0) && (
              <label className="mt-4 block text-sm font-medium">
                Saved delivery address
                <select value={isSaved ? savedId : ""} onChange={(event) => selectAddress(event.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background p-2">
                  <option value="">Choose an address</option>
                  {previousAddress && <option value="previous">Address from reorder review</option>}
                  {addresses?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </label>
            )}
            {addressesError && <p className="mt-2 text-sm text-muted-foreground">Saved addresses couldn’t be loaded.</p>}
            {isSaved && selectedAddress && (
              <div className="mt-3 space-y-2 rounded-lg border p-3 text-sm">
                <p className="break-words">{[selectedAddress.line1, selectedAddress.city, selectedAddress.pincode]
                  .filter(Boolean).join(", ") || selectedAddress.label}</p>
                {savedId !== "previous" && (
                  <Button type="button" variant="outline" size="sm" disabled={deletingAddress} onClick={removeAddress}>
                    Remove saved address
                  </Button>
                )}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ModeButton active={!isManual && !isSaved} onClick={() => { initialAddressResolved.current = true; setAddressMode("CURRENT_LOCATION"); }} icon={Crosshair} label="Use current location" />
              <ModeButton active={isManual} onClick={() => { initialAddressResolved.current = true; setAddressMode("MANUAL"); }} icon={PencilLine} label="Enter address manually" />
            </div>

            {!isManual && !isSaved && (
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
                  <Button type="button" size="sm" variant="outline" onClick={locate} disabled={busy || isLocating} className="rounded-full">
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

            {!isSaved && <>
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

            </>}

            {(!isSaved || savedId === "previous") && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 text-sm">Name for saved address
                  <input type="text" value={addressName} maxLength={60} placeholder="Home or Work"
                    onChange={(event) => setAddressName(event.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background p-2" />
                </label>
                <Button type="button" variant="outline" disabled={busy || savingAddress || isLocating}
                  onClick={handleSubmit(saveCurrentAddress)}>Save address</Button>
              </div>
            )}
            {addressMessage && <p className="mt-2 text-sm text-muted-foreground" role="status">{addressMessage}</p>}
            {addressError && <p className="mt-2 text-sm text-red-600" role="alert">{addressError}</p>}

            <div className="mt-4">
              <label className={labelClass}>Delivery note (optional)</label>
              <textarea rows={2} className={`${fieldClass} resize-none`} placeholder="Call on arrival…" {...register("note")} />
            </div>
          </Card>

          {quote && (
            <div className="phone-only phone-delivery-date">
              <CalendarDays size={22} aria-hidden />
              <div>
                <p>Delivery date</p>
                <strong>{dateLabel(quote.deliveryDate)}</strong>
                <p className="text-sm text-muted-foreground">{review.request.address.label}</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <Card className={`p-4 sm:p-5 ${PAYMENT_METHODS.filter(isEnabled).length === 1 && paymentMethod === "COD" ? "phone-hide" : ""}` }>
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
        <Card className="phone-checkout-summary h-fit p-4 md:sticky md:top-20">
          <h2 className="font-semibold text-[#3c3c3c] dark:text-white">Order summary</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {quote?.items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-gray-700 dark:text-gray-200">
                  {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                  <span className="block text-xs text-muted-foreground">{money(i.unitPrice)} / {i.unit} · {i.availableStock} {i.unit} in stock</span>
                </span>
                <span className="shrink-0 text-[#33691e]">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {quote ? (
            <div aria-live="polite" className="mt-4 space-y-3 border-t pt-4 text-sm">
              <div className="phone-hide">
                <p className="font-semibold">Next delivery: {dateLabel(quote.deliveryDate)}</p>
                <p className="text-muted-foreground">Delivery location: {review.request.address.label}</p>
              </div>
              <div className="flex justify-between gap-2"><span>Items subtotal</span><span>{money(quote.subtotal)}</span></div>
              <div className="flex justify-between gap-2"><span>Delivery fee</span><span>{money(quote.deliveryFee)}</span></div>
              <div className="flex justify-between gap-2 font-semibold phone-cod-total"><span>Cash due on delivery</span><span>{money(quote.total)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Check your address to see the next delivery date and current COD total.</p>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            disabled={busy || isLocating || !oneFarm}
            className="phone-primary mt-4 w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
          >
            {busy ? (quote ? "Placing order…" : "Checking delivery…") : quote ? "Place COD order" : "Check delivery and total"}
          </Button>

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
