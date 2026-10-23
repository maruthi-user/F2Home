import { Fragment, useMemo, useState } from "react";
import { ClipboardList, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { getCategoryById } from "@/config/marketplaceCategories";
import {
  useDecideFarmOrderMutation,
  useGetFarmOrdersQuery,
} from "@/redux/f2home/marketplaceApi";
import { formatDateTime } from "@/utils/expiry";

const inr = (v) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-600",
};
const STATUS_LABEL = { PENDING: "Pending", ACCEPTED: "Accepted", REJECTED: "Rejected" };

const TABS = [
  { id: "REQUESTS", label: "Requests", match: (r) => r.status === "PENDING" },
  { id: "ACCEPTED", label: "Accepted", match: (r) => r.status === "ACCEPTED" },
  { id: "ALL", label: "All orders", match: () => true },
];

const categoryLabel = (id) => getCategoryById(id)?.label || id || "Other";

const Detail = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-800">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{children}</dd>
  </div>
);

// Farmer "My Orders": order lines for the farmer's own products. Requests =
// not yet accepted, Accepted, and All. Each pending line can be accepted or
// rejected after a confirmation that shows the full order detail.
export default function FarmOrders() {
  const { toast } = useToast();
  const { data: rows = [], isLoading, isError } = useGetFarmOrdersQuery(undefined, {
    pollingInterval: 30000,
  });
  const [decide, { isLoading: isDeciding }] = useDecideFarmOrderMutation();

  const [tab, setTab] = useState("REQUESTS");
  const [groupBy, setGroupBy] = useState("NONE");
  const [pending, setPending] = useState(null); // { row, accept }

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, rows.filter(t.match).length])),
    [rows]
  );

  const visible = useMemo(() => {
    const match = TABS.find((t) => t.id === tab).match;
    return rows.filter(match);
  }, [rows, tab]);

  const groups = useMemo(() => {
    if (groupBy === "NONE") return [{ key: "", label: "", rows: visible }];
    const map = new Map();
    visible.forEach((r) => {
      const key = r.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()]
      .sort(([a], [b]) => categoryLabel(a).localeCompare(categoryLabel(b)))
      .map(([key, list]) => ({ key, label: categoryLabel(key), rows: list }));
  }, [visible, groupBy]);

  const confirm = async () => {
    if (!pending) return;
    const { row, accept } = pending;
    try {
      await decide({ itemId: row.itemId, accept }).unwrap();
      toast({
        title: accept ? "Order accepted" : "Order rejected",
        description: `${row.productName} × ${row.quantity} ${row.unit} for ${row.customerName}.`,
      });
      setPending(null);
    } catch (err) {
      toast({
        title: `Couldn't ${accept ? "accept" : "reject"} order`,
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
      setPending(null);
    }
  };

  return (
    <Page>
      <PageHeader
        icon={ClipboardList}
        title="My Orders"
        subtitle="Orders placed for your products"
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Group by
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-foreground dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="NONE">None</option>
              <option value="CATEGORY">Product type</option>
            </select>
          </label>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tab === t.id ? "bg-[#33691e] text-white" : "bg-[#eef3e6] text-[#33691e] hover:bg-[#e3f0d3]"
            }`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Couldn't load your orders. Please try again.</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          {tab === "REQUESTS" ? "No new order requests." : tab === "ACCEPTED" ? "No accepted orders yet." : "No orders yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                  {groupBy !== "NONE" && (
                    <tr className="bg-[#eef3e6]">
                      <td colSpan={9} className="px-3 py-2 text-xs font-semibold text-[#33691e]">
                        {g.label} · {g.rows.length} order{g.rows.length === 1 ? "" : "s"} ·{" "}
                        {inr(g.rows.filter((r) => r.status !== "REJECTED").reduce((s, r) => s + Number(r.lineTotal), 0))}
                      </td>
                    </tr>
                  )}
                  {g.rows.map((r) => (
                    <tr key={r.itemId} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2.5 font-medium">#{r.orderId}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDateTime(r.orderedAt)}</td>
                      <td className="px-3 py-2.5">
                        <div>{r.customerName}</div>
                        <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{r.productName}</div>
                        <div className="text-xs text-muted-foreground">{categoryLabel(r.category)}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">{inr(r.unitPrice)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">{inr(r.lineTotal)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.status === "PENDING" ? (
                          <div className="flex gap-2">
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
                        ) : (
                          <span className="text-xs text-muted-foreground">{formatDateTime(r.decidedAt)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && !isDeciding && setPending(null)}>
        <DialogContent className="max-w-md">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className={pending.accept ? "text-[#33691e]" : "text-red-600"}>
                  {pending.accept ? "Accept this order?" : "Reject this order?"}
                </DialogTitle>
              </DialogHeader>
              <dl className="rounded-xl border border-gray-100 px-3 dark:border-gray-800">
                <Detail label="Order">#{pending.row.orderId}</Detail>
                <Detail label="Ordered on">{formatDateTime(pending.row.orderedAt)}</Detail>
                <Detail label="Customer">{pending.row.customerName}</Detail>
                <Detail label="Phone">{pending.row.customerPhone}</Detail>
                <Detail label="Deliver to">{pending.row.deliveryTo}</Detail>
                <Detail label="Payment">{pending.row.paymentMethod}</Detail>
                <Detail label="Product">
                  {pending.row.productName} ({categoryLabel(pending.row.category)})
                </Detail>
                <Detail label="Quantity">
                  {pending.row.quantity} {pending.row.unit}
                </Detail>
                <Detail label="Price">
                  {inr(pending.row.unitPrice)} / {pending.row.unit}
                </Detail>
                <Detail label="Total">{inr(pending.row.lineTotal)}</Detail>
              </dl>
              {!pending.accept && (
                <p className="text-xs text-muted-foreground">
                  Rejecting returns {pending.row.quantity} {pending.row.unit} to your stock and tells the customer
                  this item was declined.
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
    </Page>
  );
}
