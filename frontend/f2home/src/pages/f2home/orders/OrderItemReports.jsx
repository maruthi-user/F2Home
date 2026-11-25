import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useGetItemReportsQuery, useCreateItemReportMutation,
} from "@/redux/f2home/marketplaceApi";
import { useGetAdminItemReportsQuery, useResolveItemReportMutation } from "@/redux/f2home/adminApi";

const fieldClass = "mt-1 w-full rounded-lg border bg-background p-2";
const timestamp = (value) => new Date(value).toLocaleString("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
}) + " IST";

function ReportSummary({ entry }) {
  return (
    <>
      <h3 className="font-semibold">{entry.itemName} · {entry.kind === "MISSING" ? "Missing" : "Damaged"}</h3>
      <p className="text-muted-foreground">{entry.resolvedAt ? "Resolved" : "Open · Awaiting support"}</p>
      <p className="break-words">{entry.details}</p>
      {entry.resolution && <p className="break-words"><strong>Resolution:</strong> {entry.resolution}</p>}
    </>
  );
}

export function OrderItemReports({ order }) {
  const { currentData: reports, isLoading, isError, refetch } = useGetItemReportsQuery(order.id, { pollingInterval: 30000 });
  const [submit, { isLoading: saving }] = useCreateItemReportMutation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const openItems = new Set(reports?.filter((report) => !report.resolvedAt).map((report) => report.itemId));
  const items = (order.items || []).filter((item) => item.itemId != null && item.status !== "REJECTED" && !openItems.has(item.itemId));

  async function report(event) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      await submit({ orderId: order.id, itemId: Number(form.get("itemId")),
        kind: form.get("kind"), details: form.get("details").trim() }).unwrap();
      setOpen(false);
    } catch (err) {
      setError(err?.data?.message || "Couldn’t send your report. Please try again.");
      refetch();
    }
  }

  return (
    <section aria-labelledby="item-report-title" className="phone-report-problem space-y-3 border-t pt-4">
      <h2 id="item-report-title" className="font-semibold">Item reports</h2>
      {isLoading && <p role="status" className="text-sm">Loading reports…</p>}
      {isError && <Button type="button" variant="outline" onClick={refetch}>Retry loading reports</Button>}
      {reports?.map((entry) => (
        <article key={entry.id} className="space-y-1 rounded-lg border p-3 text-sm"><ReportSummary entry={entry} /></article>
      ))}
      {reports && items.length > 0 && (open ? (
        <form onSubmit={report} className="space-y-3 rounded-lg border p-3">
          <label className="block text-sm">Item
            <select name="itemId" required className={fieldClass}>
              <option value="">Choose an item</option>
              {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.productName}</option>)}
            </select>
          </label>
          <label className="block text-sm">Problem
            <select name="kind" required className={fieldClass}>
              <option value="">Choose a problem</option>
              <option value="MISSING">Missing item</option><option value="DAMAGED">Damaged item</option>
            </select>
          </label>
          <label className="block text-sm">What happened?
            <textarea name="details" required maxLength={500} rows={3} className={fieldClass} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>Submit report</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => { setOpen(false); setError(""); }}>Back</Button>
          </div>
        </form>
      ) : <Button type="button" variant="outline" onClick={() => setOpen(true)}>Report a problem</Button>)}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

export function AdminItemReports({ orderId }) {
  const { currentData: reports, isLoading, isError, refetch } = useGetAdminItemReportsQuery(orderId, { pollingInterval: 30000 });
  const [resolve, { isLoading: saving }] = useResolveItemReportMutation();
  const [error, setError] = useState("");

  async function submit(event, reportId) {
    event.preventDefault();
    if (saving) return;
    const resolution = new FormData(event.currentTarget).get("resolution").trim();
    setError("");
    try {
      await resolve({ orderId, reportId, resolution }).unwrap();
    } catch (err) {
      setError(err?.data?.message || "Couldn’t save the resolution.");
      refetch();
    }
  }

  return (
    <section aria-label="Customer item reports" className="space-y-2">
      <h3 className="font-semibold">Customer item reports</h3>
      {isLoading && <p role="status" className="text-sm">Loading item reports…</p>}
      {isError && <Button type="button" variant="outline" onClick={refetch}>Retry loading item reports</Button>}
      {reports?.length === 0 && <p className="text-sm text-muted-foreground">No item reports.</p>}
      {reports?.map((entry) => (
        <article key={entry.id} className="phone-item-resolution space-y-2 rounded-lg border p-3 text-sm">
          <ReportSummary entry={entry} />
          {!entry.resolvedAt && <p className="phone-only text-muted-foreground">Reported {timestamp(entry.createdAt)}</p>}
          {entry.resolvedAt ? (
            <p className="text-muted-foreground">{entry.adminName} (#{entry.adminId}) · {timestamp(entry.resolvedAt)}</p>
          ) : (
            <form onSubmit={(event) => submit(event, entry.id)} className="space-y-2">
              <label className="block">Resolution shared with customer
                <textarea name="resolution" required maxLength={500} rows={2} className={fieldClass} />
              </label>
              <Button type="submit" disabled={saving} size="sm"><span className="phone-hide">Resolve item report</span><span className="phone-only">Save resolution</span></Button>
            </form>
          )}
        </article>
      ))}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
