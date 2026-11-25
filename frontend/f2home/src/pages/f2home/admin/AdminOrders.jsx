import { AdminItemReports } from "../orders/OrderItemReports";
import { Link } from "wouter";
import { PhoneAdminTabs } from "@/components/layout/PhoneWorkspaceNav";
import { useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useGetAdminOrderQuery, useResolveOrderMutation, useSearchAdminOrdersQuery } from "@/redux/f2home/adminApi";

const filters = [
  ["ALL", "All orders"],
  ["DELIVERY", "Failed deliveries"],
  ["CASH", "Open cash discrepancies"],
  ["SUPPORT", "Open item reports"],
  ["RESOLVED", "Resolution history"],
];

const actions = {
  RETRY_DELIVERY: ["Arrange another delivery", "Return the order to Preparing so the farmer can dispatch it again."],
  CLOSE_FAILED_DELIVERY: ["Close failed delivery", "Cancel the order. Stock quantities are left as recorded after dispatch."],
  CONFIRM_FULL_CASH: ["Confirm full cash received", "Use after verifying that the full order amount was actually collected."],
  KEEP_RECORDED_CASH: ["Close issue with recorded amount", "Keep the recorded cash and any outstanding amount, and close the issue in the admin queue."],
};

const money = (value) => value == null ? "—" : "₹" + Number(value).toFixed(2);
const label = (value) => value ? value.toLowerCase().replace(/_/g, " ") : "—";
const timestamp = (value) => new Date(value).toLocaleString("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
}) + " IST";

export default function AdminOrders() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [message, setMessage] = useState("");
  const search = useSearchAdminOrdersQuery({ q: query, filter, page }, { pollingInterval: 30000 });
  const detail = useGetAdminOrderQuery(selectedId, { skip: selectedId == null });
  const [resolveOrder, { isLoading: saving }] = useResolveOrderMutation();
  const selected = detail.currentData;
  const order = selected?.order;
  const availableActions = order?.status === "DELIVERY_FAILED"
    ? ["RETRY_DELIVERY", "CLOSE_FAILED_DELIVERY"]
    : selected?.openCashIssue ? ["CONFIRM_FULL_CASH", "KEEP_RECORDED_CASH"] : [];

  function selectOrder(id) {
    setSelectedId(id);
    setAction("");
    setReason("");
    setMessage("");
    setResolutionError("");
  }

  async function resolve(event) {
    event.preventDefault();
    if (!action || !reason.trim() || saving || !order) return;
    setResolutionError("");
    setMessage("");
    try {
      await resolveOrder({ id: order.id, action, reason: reason.trim() }).unwrap();
      setAction("");
      setReason("");
      setMessage("Resolution recorded.");
    } catch (error) {
      setResolutionError(error?.data?.message || "The resolution could not be saved.");
      detail.refetch();
    }
  }

  return (
    <Page className="max-w-6xl phone-module phone-admin">
      <PhoneAdminTabs active="/app/admin/orders" />
      <PageHeader icon={ClipboardList} title="Order operations" subtitle="Look up orders and resolve delivery or cash issues"
        actions={<Button asChild variant="outline" className="phone-hide"><Link href="/app/admin/cod-reconciliation">COD reconciliation</Link></Button>} />
      <Card className="space-y-4 p-4">
        <form className="flex flex-wrap gap-2" onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setQuery(input.trim());
        }}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search orders</span>
            <input type="search" value={input} onChange={(event) => setInput(event.target.value)} maxLength={120}
              className="min-h-10 w-full rounded-lg border bg-background px-3" placeholder="Order #, customer, phone, or farm" />
          </label>
          <Button type="submit" className="bg-[#245730] text-white hover:bg-[#183f23]"><Search className="size-4" /> Search</Button>
        </form>
        <h2 className="phone-only phone-admin-filter-title">Filters</h2>
        <div className="phone-admin-filters flex flex-wrap gap-2" aria-label="Order filters">
          {filters.map(([value, name]) => (
            <Button key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value}
              onClick={() => { setFilter(value); setPage(0); }}>{name}</Button>
          ))}
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        {search.isFetching && <p className="text-sm text-muted-foreground" role="status">Loading orders…</p>}
        {search.isError ? <p role="alert">Couldn’t load orders. <Button variant="outline" onClick={search.refetch}>Try again</Button></p>
          : search.currentData?.orders.length === 0 ? <p className="p-4 text-muted-foreground">No matching orders.</p> : null}
        {search.currentData?.orders.map((row) => (
          <Card key={row.id} className="phone-admin-order-row flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <h2 className="font-semibold">Order #{row.id} · {row.customerName}</h2>
              <p className="break-words text-sm text-muted-foreground">{row.customerPhone} · {row.farms?.join(", ") || "Farm unavailable"}</p>
              <p className="text-sm capitalize">{label(row.status)} · {label(row.paymentStatus)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{money(row.status === "CANCELLED" ? 0 : row.total)}</span>
              <Button variant="outline" aria-label={"View order " + row.id} onClick={() => selectOrder(row.id)}>View order</Button>
            </div>
          </Card>
        ))}
        {(page > 0 || search.currentData?.hasNext) && (
          <div className="flex items-center gap-3 py-2">
            <Button variant="outline" disabled={page === 0 || search.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm">Page {page + 1}</span>
            <Button variant="outline" disabled={!search.currentData?.hasNext || search.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={selectedId != null} onOpenChange={(open) => { if (!open && !saving) selectOrder(null); }}>
        <DialogContent className="phone-dialog phone-task-dialog max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Order #{selectedId}</DialogTitle>
            <DialogDescription>Order details, exceptions, and resolution history</DialogDescription>
          </DialogHeader>
          {detail.isFetching && !selected && <p role="status">Loading order…</p>}
          {detail.isError && <p role="alert">Couldn’t load this order. <Button variant="outline" onClick={detail.refetch}>Try again</Button></p>}
          {order && (
            <>
              <dl className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Customer</dt><dd>{selected.customerName} · {selected.customerPhone}</dd></div>
                <div><dt className="text-muted-foreground">Farm</dt><dd>{selected.farms.join(", ") || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Delivery</dt><dd className="capitalize">{label(order.status)} · {order.deliveryDate || "Date unavailable"}</dd></div>
                <div><dt className="text-muted-foreground">Order total</dt><dd>{money(order.total)}</dd></div>
                <div><dt className="text-muted-foreground">Cash collected</dt><dd>{money(order.payment.cashCollected)}</dd></div>
                <div><dt className="text-muted-foreground">Payment</dt><dd className="capitalize">{label(order.payment.status)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Delivery address</dt><dd>
                  {[order.address.line1, order.address.landmark, order.address.city, order.address.pincode]
                    .filter(Boolean).join(", ") || order.address.label || "—"}
                </dd></div>
              </dl>

              {order.timeline?.some((entry) => entry.status === "DELIVERY_FAILED") && (
                <section>
                  <h3 className="font-semibold">Failed delivery attempts</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {order.timeline.filter((entry) => entry.status === "DELIVERY_FAILED").map((entry, index) => (
                      <li key={index}><time dateTime={entry.occurredAt} className="text-muted-foreground">{timestamp(entry.occurredAt)}</time>
                        <p className="break-words">{entry.note}</p></li>
                    ))}
                  </ul>
                </section>
              )}

              <AdminItemReports key={order.id} orderId={order.id} />
              {!!availableActions.length && (
                <form className="space-y-3 rounded-lg border p-3" onSubmit={resolve}>
                  <h3 className="font-semibold">Resolve issue</h3>
                  <label className="block text-sm">Action
                    <select className="mt-1 w-full rounded-lg border bg-background p-2" required value={action} onChange={(event) => setAction(event.target.value)}>
                      <option value="">Choose an action</option>
                      {availableActions.map((id) => <option key={id} value={id}>{actions[id][0]}</option>)}
                    </select>
                  </label>
                  {action && <p className="text-sm text-muted-foreground">{actions[action][1]}</p>}
                  <label className="block text-sm">Resolution reason
                    <textarea className="mt-1 w-full rounded-lg border bg-background p-2" rows={3}
                      maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} required />
                  </label>
                  <Button type="submit" disabled={saving || !action || !reason.trim()}
                    className="bg-[#245730] text-white hover:bg-[#183f23]">{saving ? "Saving…" : "Save resolution"}</Button>
                </form>
              )}
              {resolutionError && <p role="alert" className="text-sm text-red-600">{resolutionError}</p>}
              {message && <p role="status" className="text-sm">{message}</p>}
              <section>
                <h3 className="font-semibold">Resolution history</h3>
                {selected.resolutions.length ? (
                  <ol className="mt-2 space-y-3">
                    {selected.resolutions.map((entry) => (
                      <li key={entry.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{actions[entry.action]?.[0] || label(entry.action)}</p>
                        <p className="text-muted-foreground">{entry.adminName} (#{entry.adminId}) · {timestamp(entry.resolvedAt)}</p>
                        <p className="mt-1 break-words">{entry.reason}</p>
                        {entry.previousStatus !== entry.resultingStatus && <p className="capitalize">{label(entry.previousStatus)} → {label(entry.resultingStatus)}</p>}
                        {entry.previousCash !== entry.resultingCash && <p>Cash changed from {money(entry.previousCash)} to {money(entry.resultingCash)}</p>}
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-2 text-sm text-muted-foreground">No admin resolutions recorded.</p>}
              </section>
            </>
          )}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => selectOrder(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
