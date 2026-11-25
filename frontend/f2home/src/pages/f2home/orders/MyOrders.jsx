import { useState } from "react";
import { ChevronLeft, ChevronRight, Package, Search } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMyOrdersQuery } from "@/redux/f2home/marketplaceApi";
import ReorderButton from "./ReorderButton";
import { orderStatusLabel, statusLabels } from "./orderStatus";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function deliveryDate(order) {
  return order.deliveryDate && order.status !== "CANCELLED"
    ? date.format(new Date(order.deliveryDate + "T00:00:00+05:30")) : "—";
}

function Status({ order }) {
  const tone = order.status === "DELIVERED" ? "bg-emerald-100 text-emerald-900"
    : ["CANCELLED", "DELIVERY_FAILED"].includes(order.status) ? "bg-red-100 text-red-900"
      : "bg-amber-100 text-amber-900";
  return <span className={"inline-block rounded-lg px-2 py-1 text-xs font-medium " + tone}>{orderStatusLabel(order)}</span>;
}

function OpenOrder({ order }) {
  const closed = ["DELIVERED", "CANCELLED"].includes(order.status);
  return <Button asChild variant="outline" size="sm">
    <Link href={"/app/orders/" + order.id} aria-label={(closed ? "View" : "Track") + " order " + order.id}>
      {closed ? "View order" : "Track order"}
    </Link>
  </Button>;
}

export default function MyOrders() {
  const { data: orders = [], isLoading, error, refetch } = useGetMyOrdersQuery();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const query = search.trim().toLowerCase();
  const matches = orders.filter(order => (!status || order.status === status)
    && [String(order.id), ...order.items.flatMap(item => [item.productName, item.farmerName])]
      .some(value => value?.toLowerCase().includes(query.replace(/^#/, ""))));
  const size = 10;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matches.length / size) - 1));
  const offset = currentPage * size;
  const rows = matches.slice(offset, offset + size);

  return <div className="phone-module w-full min-w-0 px-3 py-4 sm:px-5">
    <header className="mb-3 flex items-center justify-between gap-3">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Package aria-hidden size={22} /> My orders</h1>
      <Button asChild variant="outline" size="sm"><Link href="/app/marketplace">Shop produce</Link></Button>
    </header>
    <section aria-label="Order history" className="min-w-0 rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <label className="relative w-full sm:max-w-72">
          <span className="sr-only">Search orders</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} placeholder="Order number, farm or product"
            onChange={event => { setSearch(event.target.value); setPage(0); }}
            className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-base sm:text-sm" />
        </label>
        <select aria-label="Order status" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}
          className="h-11 max-w-full rounded-lg border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {isLoading && <p role="status" className="p-4">Loading orders…</p>}
      {error && <p role="alert" className="p-4">Couldn’t load orders. <Button variant="outline" onClick={refetch}>Try again</Button></p>}
      {!isLoading && !error && !rows.length && <p className="p-4 text-sm text-muted-foreground">{orders.length ? "No matching orders." : "Your orders will appear here after checkout."}</p>}
      {!!rows.length && <>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5">
            <thead className="border-b bg-muted/35 text-xs"><tr>
              {["Order", "Placed", "Farm / items", "Delivery date", "Status", "Order total", "Actions"].map(label =>
                <th key={label} scope="col" className="whitespace-nowrap font-semibold">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {rows.map(order => <tr key={order.id} className="hover:bg-muted/25">
                <th scope="row" className="font-medium">#{order.id}</th>
                <td className="whitespace-nowrap">{date.format(new Date(order.createdAt))}</td>
                <td className="min-w-24 break-words">{[...new Set(order.items.map(item => item.farmerName).filter(Boolean))].join(", ") || "Farm"}<br />
                  <span className="text-xs text-muted-foreground">{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</span></td>
                <td className="whitespace-nowrap">{deliveryDate(order)}</td>
                <td><Status order={order} /></td>
                <td className="whitespace-nowrap font-semibold">{money.format(order.status === "CANCELLED" ? 0 : order.total)}</td>
                <td><div className="flex flex-wrap gap-2"><OpenOrder order={order} /><ReorderButton orderId={order.id} /></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2.5 bg-muted/20 p-2.5 sm:grid-cols-2 lg:hidden">
          {rows.map(order => <article key={order.id} className="min-w-0 space-y-3 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-semibold">Order #{order.id}</h2><p className="text-xs text-muted-foreground">{date.format(new Date(order.createdAt))}</p></div>
              <Status order={order} />
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t pt-2 text-sm">
              <dt className="text-muted-foreground">Delivery</dt><dd>{deliveryDate(order)}</dd>
              <dt className="text-muted-foreground">Order total</dt><dd className="font-semibold">{money.format(order.status === "CANCELLED" ? 0 : order.total)}</dd>
            </dl>
            <div className="flex flex-wrap gap-2"><OpenOrder order={order} /><ReorderButton orderId={order.id} /></div>
          </article>)}
        </div>
        <nav aria-label="Order pagination" className="flex items-center justify-end gap-2 border-t p-2.5 text-sm">
          <Button size="icon" variant="outline" aria-label="Previous page" disabled={!currentPage}
            onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden /></Button>
          <span>{offset + 1}–{offset + rows.length} of {matches.length}</span>
          <Button size="icon" variant="outline" aria-label="Next page" disabled={offset + size >= matches.length}
            onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden /></Button>
        </nav>
      </>}
    </section>
  </div>;
}
