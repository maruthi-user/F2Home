import { Fragment, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Coins, Loader, Package, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/common/BackButton";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { getCategoryById } from "@/config/marketplaceCategories";
import {
  useDecideFarmOrderMutation,
  useGetFarmOrdersQuery,
  useUpdateFulfillmentMutation,
} from "@/redux/f2home/marketplaceApi";
import useNow from "@/hooks/useNow";
import { formatDateTime } from "@/utils/expiry";

const inr = (v) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-600",
};
const STATUS_LABEL = { PENDING: "Pending", ACCEPTED: "Accepted", REJECTED: "Rejected" };
const closedLabels = {
  FARMER_REJECTED: "Rejected",
  ADMIN_CLOSED_DELIVERY: "Cancelled after failed delivery",
  CUSTOMER_CANCELLED: "Cancelled by customer",
  RESPONSE_TIMEOUT: "Response deadline passed",
};
const deadlineLabel = (value) => new Date(value).toLocaleString("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
}) + " IST";

const fulfillmentLabels = {
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery failed",
  DELIVERED: "Delivered",
};

const nextActions = {
  CONFIRMED: [["PREPARING", "Start preparing"]],
  PREPARING: [["OUT_FOR_DELIVERY", "Mark out for delivery"]],
  OUT_FOR_DELIVERY: [["DELIVERED", "Mark delivered"], ["DELIVERY_FAILED", "Report failed delivery"]],
  DELIVERY_FAILED: [["OUT_FOR_DELIVERY", "Retry delivery"]],
};

const QUEUES = [
  ["REQUESTS", "New requests"],
  ["PREPARING", "Preparing"],
  ["OUT_FOR_DELIVERY", "Out for delivery"],
  ["DELIVERY_FAILED", "Delivery issues"],
  ["DELIVERED", "Completed"],
  ["CLOSED", "Closed"],
  ["LEGACY", "Older accepted items"],
];

const categoryLabel = (id) => getCategoryById(id)?.label || id || "Other";
const indiaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});

function queueFor(row) {
  if (row.status === "REJECTED" || row.orderStatus === "CANCELLED") return "CLOSED";
  if (row.status === "PENDING") return "REQUESTS";
  if (!row.lines) return "LEGACY";
  return row.orderStatus === "CONFIRMED" ? "PREPARING" : row.orderStatus;
}

function needsActionToday(row, today) {
  const queue = queueFor(row);
  if (queue === "REQUESTS") return !row.responseDeadline || indiaDate.format(new Date(row.responseDeadline)) <= today;
  if (queue === "OUT_FOR_DELIVERY" || queue === "DELIVERY_FAILED") return true;
  return queue === "PREPARING" && (!row.deliveryDate || row.deliveryDate <= today);
}

function sortOrders(rows, sortBy, queue) {
  const field = sortBy === "NEXT"
    ? (queue === "REQUESTS" ? "DEADLINE" : "DELIVERY") : sortBy;
  const date = (row) => {
    if (field === "DEADLINE") {
      return row.responseDeadline ? Date.parse(row.responseDeadline) : Infinity;
    }
    return row.deliveryDate ? Date.parse(row.deliveryDate) : Infinity;
  };
  return [...rows].sort((a, b) => {
    if (sortBy === "NEXT" && ["DELIVERED", "CLOSED", "LEGACY"].includes(queue)) return b.orderId - a.orderId;
    return (date(a) - date(b)) || (a.orderId - b.orderId);
  });
}

const Detail = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-800">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{children}</dd>
  </div>
);

// Orders with a response deadline use one decision for the entire order.
export default function FarmOrders() {
  const { toast } = useToast();
  const { data: lines, isLoading, isError, refetch } = useGetFarmOrdersQuery(undefined, {
    pollingInterval: 30000,
  });
  const rows = useMemo(() => {
    const orders = new Map();
    const entries = [];
    for (const line of lines || []) {
      if (!line.responseDeadline) {
        entries.push(line);
        continue;
      }
      let order = orders.get(line.orderId);
      if (!order) {
        order = { ...line, lines: [] };
        orders.set(line.orderId, order);
        entries.push(order);
      }
      order.lines.push(line);
    }
    return entries;
  }, [lines]);
  const [decide, { isLoading: isDeciding }] = useDecideFarmOrderMutation();
  const [updateFulfillment, { isLoading: updating }] = useUpdateFulfillmentMutation();
  const [deliveryAction, setDeliveryAction] = useState(null);
  const [cashEntered, setCashEntered] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

  const [view, setView] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEXT");
  const now = useNow();
  const today = indiaDate.format(now);
  const [pending, setPending] = useState(null); // { row, accept }

  const actionRows = rows.filter((row) => needsActionToday(row, today)
    && !(queueFor(row) === "REQUESTS" && Date.parse(row.responseDeadline) <= now));
  const actionItems = new Set(actionRows.map((row) => row.itemId));
  const actionCount = new Set(actionRows.map((row) => row.orderId)).size;
  const collected = new Map(rows.filter((row) => row.cashCollected != null)
    .map((row) => [row.orderId, row]));
  let cashToday = 0;
  let cashTotal = 0;
  for (const row of collected.values()) {
    const amount = Math.round(Number(row.cashCollected) * 100);
    cashTotal += amount;
    if (row.cashCollectedAt && indiaDate.format(new Date(row.cashCollectedAt)) === today) cashToday += amount;
  }

  const visible = view === "TODAY" ? actionRows : rows;
  const groups = QUEUES.map(([key, label]) => ({
    key, label, rows: sortOrders(visible.filter((row) => queueFor(row) === key), sortBy, key),
  })).filter((group) => group.rows.length);

  const confirm = async () => {
    if (!pending) return;
    const { row, accept } = pending;
    try {
      const result = await decide({
        itemId: row.itemId,
        orderId: row.lines ? row.orderId : undefined,
        accept,
      }).unwrap();
      toast({
        title: result.closureReason === "RESPONSE_TIMEOUT" ? "Response deadline passed" : accept ? "Order accepted" : "Order rejected",
        description: row.lines ? `Order #${row.orderId} for ${row.customerName}.` : `${row.productName} × ${row.quantity} ${row.unit}.`,
      });
      setPending(null);
    } catch (err) {
      toast({
        title: `Couldn't ${accept ? "accept" : "reject"} order`,
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
      refetch();
      setPending(null);
    }
  };

  function openDeliveryAction(row, status, label) {
    setDeliveryError("");
    setCashEntered("");
    setDeliveryAction({ row, status, label });
  }

  async function confirmDeliveryAction(event) {
    event.preventDefault();
    if (updating) return;
    const form = new FormData(event.currentTarget);
    const { row, status } = deliveryAction;
    setDeliveryError("");
    try {
      await updateFulfillment({
        orderId: row.orderId,
        status,
        ...(status === "DELIVERED" && { cashCollected: form.get("cashCollected") }),
        ...(status === "DELIVERY_FAILED" && { failureReason: form.get("failureReason").trim() }),
      }).unwrap();
      toast({ title: fulfillmentLabels[status] });
      setDeliveryAction(null);
    } catch (err) {
      setDeliveryError(err?.data?.message || "Couldn’t save this update. Try again.");
      refetch();
    }
  }

  const [phoneOrderItemId, setPhoneOrderItemId] = useState(null);

  function renderActions(r) {
    if (queueFor(r) === "REQUESTS" && Date.parse(r.responseDeadline) <= now) {
      return <span className="text-xs text-muted-foreground">Response deadline passed</span>;
    }
    return queueFor(r) === "REQUESTS" ? (
      <div className="phone-farm-decisions flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 bg-[#33691e] px-3 text-xs text-white hover:bg-[#2e5d1a]"
          onClick={() => setPending({ row: r, accept: true })}
        >
          Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setPending({ row: r, accept: false })}
        >
          Reject
        </Button>
      </div>
    ) : r.lines && nextActions[r.orderStatus] ? (
      <div className="phone-farm-progress flex flex-wrap gap-2">
        {nextActions[r.orderStatus].map(([status, label]) => (
          <Button type="button" size="sm" variant="outline" key={status}
            onClick={() => openDeliveryAction(r, status, label)}>
            {label}
          </Button>
        ))}
      </div>
    ) : r.cashCollected != null ? (
      <div className="text-xs">
        <p>Cash recorded: {inr(r.cashCollected)}</p>
        {r.paymentStatus === "COLLECTION_EXCEPTION" && <p className="text-amber-700">Collection discrepancy</p>}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">{formatDateTime(r.decidedAt)}</span>
    );
  }

  function renderToday(r) {
    return actionItems.has(r.itemId) && <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Action today</span>;
  }

  function renderStatus(r) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
        {closedLabels[r.closureReason] || fulfillmentLabels[r.orderStatus] || STATUS_LABEL[r.status]}
      </span>
    );
  }

  return (
    <Page className={`phone-module phone-farm ${visible.some((row) => row.itemId === phoneOrderItemId) ? "phone-farm-detail-open" : ""}`}>
      <div className="phone-only phone-farm-title"><BackButton /><h1>Fulfillment</h1></div>
      <PageHeader icon={ClipboardList} title="Fulfillment dashboard"
        subtitle="Manage requests, deliveries, and recorded cash" />

      {!isLoading && !isError && (
        <section aria-label="Fulfillment summary" className="phone-farm-summary mb-4 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setView(view === "TODAY" ? "ALL" : "TODAY")}
            aria-pressed={view === "TODAY"}
            className="rounded-xl border bg-card p-4 text-left shadow-sm hover:border-[#33691e] focus-visible:ring-2 focus-visible:ring-primary">
            <ClipboardList className="phone-only phone-metric-icon" aria-hidden />
            <span className="block text-sm text-muted-foreground">Needs action today</span>
            <strong className="mt-1 block text-2xl">{actionCount}</strong>
            <span className="text-xs text-muted-foreground">{view === "TODAY" ? "Show all orders" : "View today’s queue"}</span>
          </button>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <Coins className="phone-only phone-metric-icon" aria-hidden />
            <p className="text-sm text-muted-foreground">Cash collected today</p>
            <p className="mt-1 break-words text-2xl font-bold">{inr(cashToday / 100)}</p>
            <p className="text-xs text-muted-foreground">Based on delivery time in IST</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total cash recorded</p>
            <p className="mt-1 break-words text-2xl font-bold">{inr(cashTotal / 100)}</p>
            <p className="text-xs text-muted-foreground">Includes partial collections</p>
          </div>
        </section>
      )}

      <div className="phone-farm-filters mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Order view">
          <Button type="button" size="sm" variant={view === "ALL" ? "default" : "outline"}
            aria-pressed={view === "ALL"} onClick={() => setView("ALL")}>All orders</Button>
          <Button type="button" size="sm" variant={view === "TODAY" ? "default" : "outline"}
            aria-pressed={view === "TODAY"} onClick={() => setView("TODAY")}>Action today</Button>
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span>Sort within status</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}
            className="min-h-9 rounded-lg border bg-background px-2 text-foreground">
            <option value="NEXT">Next action</option>
            <option value="DEADLINE">Response deadline</option>
            <option value="DELIVERY">Delivery date</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p role="alert" className="text-red-600">Couldn’t load your orders.</p>
          <Button variant="outline" onClick={refetch}>Try again</Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          {view === "TODAY" ? "No orders need action today." : "No orders yet."}
        </div>
      ) : (
        <>
          <div className="phone-farm-queue space-y-4 xl:hidden">
            {groups.map((group) => (
              <section key={group.key || "all"} className="space-y-3">
                <h2 className="text-sm font-semibold">{group.label} ({group.rows.length})</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.rows.map((r) => (
                    <article key={r.itemId} aria-label={`Order #${r.orderId}`}
                      className={`phone-farm-order min-w-0 space-y-3 rounded-xl border bg-card p-4 text-sm shadow-sm ${phoneOrderItemId === r.itemId ? "phone-selected-order" : ""}`}>
                      <button type="button" className="phone-only phone-detail-back" onClick={() => setPhoneOrderItemId(null)}><ArrowLeft aria-hidden size={20} /> Fulfillment</button>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold"><Package aria-hidden className="phone-only" size={21} /> Order #{r.orderId}</h3>
                        {renderStatus(r)}
                      </div>
                      {renderToday(r)}
                      <div className="phone-farm-customer space-y-1">
                        <p className="break-words font-medium">{r.customerName}</p>
                        <p className="text-xs text-muted-foreground">{r.customerPhone}</p>
                        {r.deliveryDate && <p className="text-xs">Delivery {r.deliveryDate}</p>}
                        {r.responseDeadline && r.status === "PENDING" && (
                          <p className="text-xs text-muted-foreground">Respond by {deadlineLabel(r.responseDeadline)}</p>
                        )}
                      </div>
                      {r.responseDeadline && r.status === "PENDING" && <p className="phone-only phone-farm-deadline">Respond by {deadlineLabel(r.responseDeadline)}</p>}
                      <div className="phone-only phone-farm-items-heading">Order items</div>
                      <ul className="phone-farm-items space-y-1 border-t pt-2">
                        {(r.lines || [r]).map((item) => (
                          <li key={item.itemId} className="flex justify-between gap-2">
                            <span className="min-w-0 break-words">{item.productName} × {item.quantity} {item.unit}</span>
                            <span className="shrink-0">{inr(item.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="phone-farm-total font-medium">Total {inr(r.lines ? r.orderTotal : r.lineTotal)}</p>
                      {r.deliveryDate && <div className="phone-only phone-farm-delivery"><CalendarDays size={20} aria-hidden /> Delivery date <strong>{r.deliveryDate}</strong></div>}
                      {r.deliveryTo && <div className="phone-only phone-farm-delivery"><MapPin size={20} aria-hidden /> Destination <strong>{r.deliveryTo}</strong></div>}
                      <Button type="button" variant="outline" className="phone-only phone-view-order" onClick={() => setPhoneOrderItemId(r.itemId)}>View order</Button>
                      {renderActions(r)}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl xl:block border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f2f8ea] text-xs uppercase text-[#33691e]">
                <tr>
                  <th className="px-3 py-2.5">Order</th>
                  <th className="px-3 py-2.5">Ordered on</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Price</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key || "all"}>
                    <tr className="bg-[#eef3e6] dark:bg-muted">
                      <th colSpan={9} className="px-3 py-2 text-left text-sm font-semibold text-[#33691e] dark:text-green-200">
                        {g.label} ({g.rows.length})
                      </th>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.itemId} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2.5 font-medium">#{r.orderId}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {formatDateTime(r.orderedAt)}
                          {r.deliveryDate && <p className="text-xs text-muted-foreground">Delivery {r.deliveryDate}</p>}
                          {r.responseDeadline && r.status === "PENDING" && (
                            <p className="text-xs text-muted-foreground">Respond by {deadlineLabel(r.responseDeadline)}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div>{r.customerName}</div>
                          <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.lines ? r.lines.map((item) => (
                            <div key={item.itemId}>{item.productName} × {item.quantity} {item.unit}</div>
                          )) : (
                            <>
                              <div className="font-medium">{r.productName}</div>
                              <div className="text-xs text-muted-foreground">{categoryLabel(r.category)}</div>
                            </>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          {r.lines ? "—" : r.quantity + " " + r.unit}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">{r.lines ? "—" : inr(r.unitPrice)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">{inr(r.lines ? r.orderTotal : r.lineTotal)}</td>
                        <td className="px-3 py-2.5">
                          {renderStatus(r)}
                          <div>{renderToday(r)}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {renderActions(r)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && !isDeciding && setPending(null)}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className={pending.accept ? "text-[#33691e]" : "text-red-600"}>
                  {pending.accept ? "Accept this order?" : "Reject this order?"}
                </DialogTitle>
                <DialogDescription>{pending.row.lines ? "This decision applies to every item in the order." : "This decision applies to the selected item."}</DialogDescription>
              </DialogHeader>
              <dl className="rounded-xl border border-gray-100 px-3 dark:border-gray-800">
                <Detail label="Order">#{pending.row.orderId}</Detail>
                <Detail label="Ordered on">{formatDateTime(pending.row.orderedAt)}</Detail>
                <Detail label="Customer">{pending.row.customerName}</Detail>
                <Detail label="Phone">{pending.row.customerPhone}</Detail>
                {pending.row.deliveryDate && <Detail label="Delivery date">{pending.row.deliveryDate}</Detail>}
                <Detail label="Deliver to">{pending.row.deliveryTo}</Detail>
                <Detail label="Payment">{pending.row.paymentMethod}</Detail>
                {(pending.row.lines || [pending.row]).map((item) => (
                  <Detail key={item.itemId} label={item.productName}>
                    {item.quantity} {item.unit} × {inr(item.unitPrice)}
                  </Detail>
                ))}
                <Detail label="Total">{inr(pending.row.lines ? pending.row.orderTotal : pending.row.lineTotal)}</Detail>
              </dl>
              {!pending.accept && (
                <p className="text-xs text-muted-foreground">
                  {pending.row.lines ? "Rejecting releases the reserved stock for every item."
                    : "Rejecting releases the reserved stock for this item."}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isDeciding} onClick={() => setPending(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeciding}
                  onClick={confirm}
                  className={pending.accept ? "bg-[#33691e] text-white hover:bg-[#2e5d1a]" : "bg-red-600 text-white hover:bg-red-700"}
                >
                  {isDeciding ? "Please wait..." : pending.accept ? "Confirm accept" : "Confirm reject"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deliveryAction} onOpenChange={(open) => { if (!open && !updating) setDeliveryAction(null); }}>
        <DialogContent className="phone-dialog phone-task-dialog w-[calc(100%-2rem)] max-w-md rounded-xl">
          {deliveryAction && (
            <form className="space-y-4" onSubmit={confirmDeliveryAction}>
              <DialogHeader>
                <DialogTitle>{deliveryAction.label}</DialogTitle>
                <DialogDescription className="phone-delivery-order">Order #{deliveryAction.row.orderId}</DialogDescription>
              </DialogHeader>
              {deliveryAction.status === "DELIVERED" && (
                <div className="space-y-3">
                <div className="phone-only phone-cash-due flex-col">
                  <span className="text-sm">Amount due</span>
                  <strong className="text-2xl">{inr(deliveryAction.row.orderTotal)}</strong>
                </div>
                <label className="block space-y-2 text-sm">
                  <span className="block">Cash collected (₹)</span>
                  <input name="cashCollected" type="number" inputMode="decimal" min="0" max="9999999999.99"
                    step="0.01" required placeholder="0.00" value={cashEntered}
                    onChange={(event) => setCashEntered(event.target.value)} className="w-full rounded-lg border bg-background p-2" />
                  <span className="block text-muted-foreground">
                    <span className="phone-hide">Amount due: {inr(deliveryAction.row.orderTotal)}. </span>Enter 0 if you collected no cash.
                  </span>
                </label>
                {cashEntered !== "" && Math.round(Number(cashEntered) * 100) !== Math.round(Number(deliveryAction.row.orderTotal) * 100) && (
                  <p className="phone-only rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-900" aria-live="polite">
                    {inr(Math.abs(Math.round(Number(cashEntered) * 100) - Math.round(Number(deliveryAction.row.orderTotal) * 100)) / 100)}
                    {Number(cashEntered) < Number(deliveryAction.row.orderTotal) ? " short" : " over"}
                  </p>
                )}
                </div>
              )}
              {deliveryAction.status === "DELIVERY_FAILED" && (
                <label className="block space-y-2 text-sm">
                  <span className="block">Reason shown to the customer</span>
                  <textarea name="failureReason" required maxLength={300} rows={3}
                    className="w-full rounded-lg border bg-background p-2" placeholder="For example, customer unavailable" />
                </label>
              )}
              {deliveryError && <p role="alert" className="text-sm text-red-600">{deliveryError}</p>}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" disabled={updating} onClick={() => setDeliveryAction(null)}>Back</Button>
                <Button type="submit" disabled={updating} className="bg-[#245730] text-white hover:bg-[#183f23]">
                  {updating ? "Saving…" : "Save update"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
