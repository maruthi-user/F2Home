import { closedLabels, orderStatusLabel, statusLabels } from "./orderStatus";
import { OrderItemReports } from "./OrderItemReports";
import ReorderButton from "./ReorderButton";
import { useState } from "react";
import { CheckCircle2, Loader } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/common/BackButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/common/PageHeader";
import { useCancelOrderMutation, useGetOrderQuery } from "@/redux/f2home/marketplaceApi";

const responseDeadline = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});

const deliveryDate = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeZone: "Asia/Kolkata",
});

export default function OrderConfirmation() {
  const { id } = useParams();
  const { data: order, isLoading, error, refetch } = useGetOrderQuery(id, { pollingInterval: 30000 });
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const timeline = order
    ? [
        ...(order.timeline?.[0]?.status === "PLACED" ? [] : [{ status: "PLACED" }]),
        ...(order.timeline?.length ? order.timeline : order.status === "PLACED" ? [] : [{ status: order.status }]),
      ]
    : [];
  const cashCollected = order?.payment?.cashCollected;
  const cashDue = order?.status === "CANCELLED" || order?.payment?.status === "PAID"
    ? 0 : Math.max(0, Number(order?.total) - Number(cashCollected ?? 0));

  async function cancel() {
    setCancelError("");
    try {
      await cancelOrder(id).unwrap();
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(err?.data?.message || "Couldn’t cancel the order. Try again.");
      refetch();
      setConfirmCancel(false);
    }
  }

  return (
    <Page className="max-w-xl phone-module phone-order">
      <Card className="space-y-5 p-5 sm:p-8">
        {isLoading ? (
          <p role="status" className="flex items-center gap-2"><Loader className="size-4 animate-spin" /> Loading your order…</p>
        ) : error || !order ? (
          <>
            <p role="alert">{error?.data?.message || "We couldn’t load this order."}</p>
            {error?.status !== 404 && <Button variant="outline" onClick={refetch}>Try again</Button>}
          </>
        ) : (
          <>
            <div className="phone-hide">
              <CheckCircle2 aria-hidden className="mb-3 size-9 text-[#245730] dark:text-green-300" />
              <h1 className="text-2xl font-bold sm:text-3xl">{order.status === "PLACED" ? "Order placed" : "Order details"}</h1>
            </div>
            <div className="phone-only phone-order-title"><BackButton fallback="/app/orders" /><h1>Order #{order.id}</h1></div>
            <div className="phone-only phone-order-status">
              <CheckCircle2 aria-hidden />
              <div>
                <strong>{orderStatusLabel(order)}</strong>
                {timeline.at(-1)?.occurredAt && <p>{responseDeadline.format(new Date(timeline.at(-1).occurredAt))} IST</p>}
              </div>
            </div>
            <dl className="phone-order-summary divide-y divide-border rounded-xl border border-border px-4">
              <div className="phone-hide flex flex-wrap justify-between gap-2 py-3"><dt>Order reference</dt><dd className="font-semibold">#{order.id}</dd></div>
              <div className="phone-hide flex flex-wrap justify-between gap-2 py-3"><dt>Status</dt><dd className="font-semibold">{orderStatusLabel(order)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 py-3">
                <dt>Delivery date</dt>
                <dd className="font-semibold">{order.status !== "CANCELLED" && order.deliveryDate
                  ? deliveryDate.format(new Date(order.deliveryDate + "T00:00:00+05:30"))
                  : "—"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-3">
                <dt>{order.status === "DELIVERED" ? "Outstanding amount" : "Cash due on delivery"}</dt>
                <dd className="font-semibold">₹{cashDue.toFixed(2)}</dd>
              </div>
              {cashCollected != null && (
                <div className="flex flex-wrap justify-between gap-2 py-3">
                  <dt>Cash recorded</dt><dd className="font-semibold">₹{Number(cashCollected).toFixed(2)}</dd>
                </div>
              )}
              {order.status === "PLACED" && order.responseDeadline && (
                <div className="flex flex-wrap justify-between gap-2 py-3">
                  <dt>Farmer response due</dt>
                  <dd className="font-semibold">{responseDeadline.format(new Date(order.responseDeadline))} IST</dd>
                </div>
              )}
            </dl>
            {order.payment?.status === "COLLECTION_EXCEPTION" && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The amount recorded differs from the order total.</p>
            )}
            <section aria-labelledby="order-timeline">
              <h2 id="order-timeline" className="font-semibold">Order timeline</h2>
              <ol className="phone-order-timeline mt-3 space-y-4 border-l border-border pl-4">
                {timeline.map((event, index) => (
                  <li key={index} aria-current={index === timeline.length - 1 ? "step" : undefined} className="relative text-sm">
                    <span aria-hidden className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[#245730] dark:bg-green-300" />
                    <CheckCircle2 aria-hidden className="phone-only phone-timeline-check" />
                    <p className="font-medium">{event.status === "PLACED" ? "Order placed"
                      : (event.status === "CANCELLED" && closedLabels[order.closureReason]) || statusLabels[event.status] || event.status}</p>
                    {event.occurredAt && <time dateTime={event.occurredAt} className="text-muted-foreground">
                      {responseDeadline.format(new Date(event.occurredAt))} IST
                    </time>}
                    {event.note && <p className="mt-1 break-words text-muted-foreground">{event.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
            {order.status === "DELIVERED" && <OrderItemReports key={order.id} order={order} />}
            {cancelError && <p role="alert" className="text-sm text-red-600">{cancelError}</p>}
            {order.canCancel && (
              <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancel order</Button>
            )}
          </>
        )}
        <div className="phone-order-actions flex flex-wrap gap-3">
          <Button asChild className="bg-[#245730] text-white hover:bg-[#183f23]"><Link href="/app/orders">My orders</Link></Button>
          <Button asChild variant="outline"><Link href="/app/marketplace">Continue shopping</Link></Button>
          {order && <ReorderButton orderId={order.id} />}
        </div>
      </Card>
      <Dialog open={confirmCancel} onOpenChange={(open) => { if (!cancelling) setConfirmCancel(open); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>The order will be closed and the reserved items released.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={cancelling} onClick={() => setConfirmCancel(false)}>Keep order</Button>
            <Button variant="destructive" disabled={cancelling} onClick={cancel}>
              {cancelling ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
