import { useMemo, useState } from "react";
import { Loader, Sprout } from "lucide-react";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { getCategoryById } from "@/config/marketplaceCategories";
import { useGetFarmHistoryQuery } from "@/redux/f2home/marketplaceApi";
import { formatDate, formatDateTime } from "@/utils/expiry";

const inr = (v) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE = {
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  DELETED: "bg-gray-100 text-gray-600",
};

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "EXPIRED", label: "Expired" },
  { id: "DELETED", label: "Deleted" },
];

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-lg font-bold text-[#33691e]">{value}</p>
  </div>
);

// Farmer "My Farm": history of every product ever added - active, expired
// and deleted - with what was sold and earned.
export default function MyFarm() {
  const { data, isLoading, isError } = useGetFarmHistoryQuery(undefined, { pollingInterval: 60000 });
  const [filter, setFilter] = useState("ALL");

  const items = useMemo(() => data?.items || [], [data]);
  const summary = data?.summary;
  const rows = useMemo(
    () => (filter === "ALL" ? items : items.filter((r) => r.status === filter)),
    [items, filter]
  );

  return (
    <Page>
      <PageHeader
        icon={Sprout}
        title="My Farm"
        subtitle="Every product you've added, with sales and status"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Couldn't load your farm history. Please try again.</p>
      ) : (
        <>
          {summary && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Products added" value={summary.total} />
              <Stat label="Active now" value={summary.active} />
              <Stat label="Units sold" value={summary.unitsSold} />
              <Stat label="Total revenue" value={inr(summary.totalRevenue)} />
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === f.id
                    ? "bg-[#33691e] text-white"
                    : "bg-[#eef3e6] text-[#33691e] hover:bg-[#e3f0d3]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
              {items.length === 0
                ? "No products yet — add one from the Marketplace tab."
                : "No products with this status."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#f2f8ea] text-xs uppercase text-[#33691e]">
                  <tr>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5">Added on</th>
                    <th className="px-3 py-2.5">Harvested</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5 text-right">Sold</th>
                    <th className="px-3 py-2.5 text-right">Left</th>
                    <th className="px-3 py-2.5 text-right">Avg. sale price</th>
                    <th className="px-3 py-2.5 text-right">Revenue</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Ended / expires</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[#2f3b2f] dark:text-white">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getCategoryById(r.category)?.label || r.category}
                          {r.perishable && " · perishable"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDateTime(r.addedAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.harvestDate)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {inr(r.price)} / {r.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {r.soldQuantity} {r.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {r.remainingQuantity} {r.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {r.avgSalePrice != null ? inr(r.avgSalePrice) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {inr(r.revenue)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                        >
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.status === "ACTIVE"
                          ? r.expiresAt
                            ? `Expires ${formatDateTime(r.expiresAt)}`
                            : "—"
                          : formatDateTime(r.endedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
