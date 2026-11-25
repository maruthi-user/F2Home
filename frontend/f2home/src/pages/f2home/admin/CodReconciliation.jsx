import { PhoneAdminTabs } from "@/components/layout/PhoneWorkspaceNav";
import { useState } from "react";
import { Banknote, Loader } from "lucide-react";
import { Link } from "wouter";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetCodReconciliationQuery } from "@/redux/f2home/adminApi";

const indiaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function Metric({ label, value, detail }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-2xl font-bold">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </Card>
  );
}

function FarmAmounts({ farm }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-muted-foreground">Delivered value</dt><dd className="font-medium">{money.format(farm.deliveredValue)}</dd></div>
      <div><dt className="text-muted-foreground">Cash collected</dt><dd className="font-medium">{money.format(farm.cashCollected)}</dd></div>
      <div><dt className="text-muted-foreground">Outstanding</dt><dd className="font-medium">{money.format(farm.outstanding)}</dd></div>
      <div><dt className="text-muted-foreground">Resolved discrepancies</dt><dd className="font-medium">{farm.resolvedDiscrepancies}</dd></div>
    </dl>
  );
}

export default function CodReconciliation() {
  const today = indiaDay.format(Date.now());
  const [range, setRange] = useState(() => ({ from: indiaDay.format(Date.now() - 29 * 86400000), through: today }));
  const [applied, setApplied] = useState(range);
  const { currentData: report, error, isFetching, refetch } = useGetCodReconciliationQuery(applied);
  const pilot = report?.pilot;

  return (
    <Page className="max-w-6xl space-y-5 phone-module phone-admin">
      <PhoneAdminTabs active="/app/admin/cod-reconciliation" />
      <PageHeader icon={Banknote} title="COD reconciliation" subtitle="Farm collections, outstanding cash, and pilot metrics"
        actions={<Button asChild variant="outline" className="phone-hide"><Link href="/app/admin/orders">Order Operations</Link></Button>} />
      <form className="phone-recon-range flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4" onSubmit={(event) => {
        event.preventDefault();
        setApplied(range);
      }}>
        <label className="block min-w-0 text-sm">From
          <input type="date" required max={range.through || today} value={range.from}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
            className="mt-1 block rounded-lg border bg-background p-2" />
        </label>
        <label className="block min-w-0 text-sm">Through
          <input type="date" required min={range.from} max={today} value={range.through}
            onChange={(event) => setRange({ ...range, through: event.target.value })}
            className="mt-1 block rounded-lg border bg-background p-2" />
        </label>
        <Button type="submit" disabled={isFetching} className="bg-[#245730] text-white hover:bg-[#183f23]">Apply dates</Button>
        <p className="w-full text-xs text-muted-foreground">Dates use India time (IST).</p>
      </form>
      {isFetching && <p role="status" className="flex items-center gap-2 text-sm"><Loader className="size-4 animate-spin" /> Loading reconciliation…</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <p>{error.data?.message || "Couldn’t load reconciliation."}</p>
        <Button variant="outline" onClick={refetch}>Try again</Button>
      </div>}
      {report && (
        <>
          <section aria-labelledby="cash-overview" className="space-y-3">
            <h2 id="cash-overview" className="text-lg font-semibold">Cash overview</h2>
            <div className="phone-cash-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Delivered order value" value={money.format(report.totals.deliveredValue)} />
              <Metric label="Cash collected" value={money.format(report.totals.cashCollected)} />
              <Metric label="Outstanding cash" value={money.format(report.totals.outstanding)} />
              <Metric label="Resolved discrepancies" value={report.totals.resolvedDiscrepancies} detail="By resolution date" />
            </div>
            <p className="text-xs text-muted-foreground">Amounts use current cash records for orders delivered in the selected dates. Closing a discrepancy without correcting cash leaves any shortage outstanding.</p>
          </section>
          <section aria-labelledby="farm-breakdown" className="space-y-3">
            <h2 id="farm-breakdown" className="text-lg font-semibold">By farm</h2>
            {!report.farms.length && <Card className="p-4 text-sm text-muted-foreground">No delivered COD orders or resolved cash discrepancies in this date range.</Card>}
            {report.farms.length > 0 && (
              <>
                <div className="phone-only phone-farm-breakdown">
                  <table>
                    <thead><tr>
                      <th scope="col">Farm</th>
                      <th scope="col">Delivered</th>
                      <th scope="col">Collected</th>
                      <th scope="col">Outstanding</th>
                    </tr></thead>
                    <tbody>
                      {report.farms.map((farm) => (
                        <tr key={farm.farmerId ?? "unallocated"}>
                          <th scope="row">
                            {farm.farmName}
                            <small>{farm.deliveredOrders} delivered · {farm.resolvedDiscrepancies} resolved</small>
                          </th>
                          <td>{money.format(farm.deliveredValue)}</td>
                          <td>{money.format(farm.cashCollected)}</td>
                          <td data-outstanding={farm.outstanding > 0}>{money.format(farm.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <th scope="row">Total</th>
                      <td>{money.format(report.totals.deliveredValue)}</td>
                      <td>{money.format(report.totals.cashCollected)}</td>
                      <td data-outstanding={report.totals.outstanding > 0}>{money.format(report.totals.outstanding)}</td>
                    </tr></tfoot>
                  </table>
                </div>
                <div className="phone-hide space-y-2 lg:hidden">
                  {report.farms.map((farm) => (
                    <Card key={farm.farmerId ?? "unallocated"} className="space-y-3 p-4">
                      <div><h3 className="font-semibold">{farm.farmName}</h3>
                        <p className="text-sm text-muted-foreground">{farm.deliveredOrders} delivered</p></div>
                      <FarmAmounts farm={farm} />
                    </Card>
                  ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="p-3 text-left">Farm</th>
                        {["Orders delivered", "Delivered value", "Cash collected", "Outstanding", "Resolved discrepancies"].map((label) => (
                          <th key={label} scope="col" className="p-3 text-right">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.farms.map((farm) => (
                        <tr key={farm.farmerId ?? "unallocated"}>
                          <th scope="row" className="p-3 text-left font-medium">{farm.farmName}</th>
                          <td className="p-3 text-right">{farm.deliveredOrders}</td>
                          <td className="p-3 text-right">{money.format(farm.deliveredValue)}</td>
                          <td className="p-3 text-right">{money.format(farm.cashCollected)}</td>
                          <td className="p-3 text-right font-medium">{money.format(farm.outstanding)}</td>
                          <td className="p-3 text-right">{farm.resolvedDiscrepancies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {report.farms.some((farm) => farm.farmerId == null) && <p className="text-xs text-muted-foreground">
              Unallocated orders have products from multiple farms or no attributable farm. Their cash is included in the overview.
            </p>}
          </section>
          <section aria-labelledby="pilot-metrics" className="space-y-3">
            <h2 id="pilot-metrics" className="text-lg font-semibold">Pilot metrics</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Average acceptance time" value={pilot.averageAcceptanceMinutes == null ? "—" : number.format(pilot.averageAcceptanceMinutes) + " min"}
                detail={pilot.acceptedOrders + " accepted orders with recorded placement times"} />
              <Metric label="Failed delivery attempts" value={pilot.failedAttempts}
                detail={pilot.ordersWithFailedAttempts + " distinct orders affected"} />
              <Metric label="Repeat orders" value={pilot.repeatOrders}
                detail={pilot.placedOrders ? number.format(pilot.repeatOrders * 100 / pilot.placedOrders) + "% of " + pilot.placedOrders + " placed orders" : "No orders placed in this period"} />
            </div>
            <p className="text-xs text-muted-foreground">A repeat order is a new COD order from a customer who had already received a delivery when they placed it.</p>
          </section>
        </>
      )}
    </Page>
  );
}
