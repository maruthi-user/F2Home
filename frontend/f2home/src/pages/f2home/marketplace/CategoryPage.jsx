import { useMemo } from "react";
import { useParams } from "wouter";
import { useSelector } from "react-redux";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { getCategoryById } from "@/config/marketplaceCategories";
import {
  useGetAllProductsQuery,
  useGetMarketplaceRulesQuery,
  useGetNearbyProductsQuery,
} from "@/redux/f2home/marketplaceApi";
import useCustomerLocation from "@/hooks/useCustomerLocation";
import LocationBar from "./LocationBar";
import CategoryPills from "./CategoryPills";
import ProductGrid from "./ProductGrid";

// One category. The chip row stays so the customer can hop between
// categories; counts come from the same (radius-filtered) result set as
// the marketplace home.
export default function CategoryPage() {
  const { category: categoryId } = useParams();
  const user = useSelector((state) => state.auth?.user || null);
  const category = getCategoryById(categoryId);
  const isCustomer = user?.role === "CUSTOMER";
  const loc = useCustomerLocation();
  const { data: rules } = useGetMarketplaceRulesQuery();
  const radiusKm = rules?.nearbyRadiusKm ?? 20;

  // Fetch everything relevant once; filter by category client-side so the
  // chip counts and the grid come from the same data.
  const nearby = useGetNearbyProductsQuery(
    { lat: loc.location?.lat, lng: loc.location?.lng },
    { skip: !isCustomer || !loc.location }
  );
  const all = useGetAllProductsQuery({}, { skip: isCustomer });
  const active = isCustomer ? nearby : all;
  const waitingForLocation = isCustomer && !loc.location;
  const everything = useMemo(() => (waitingForLocation ? [] : active.data || []), [waitingForLocation, active.data]);
  const products = useMemo(() => everything.filter((p) => p.category === categoryId), [everything, categoryId]);

  const counts = useMemo(() => {
    const next = {};
    everything.forEach((p) => {
      next[p.category] = (next[p.category] || 0) + 1;
    });
    return next;
  }, [everything]);

  if (!category) {
    return (
      <Page>
        <p className="py-10 text-center text-muted-foreground">Unknown category.</p>
      </Page>
    );
  }

  const subtitle = waitingForLocation
    ? "Set your location to see nearby listings"
    : `${products.length} listing${products.length === 1 ? "" : "s"} ${isCustomer ? `within ${radiusKm} km` : "from local farmers"}`;

  return (
    <Page>
      <PageHeader icon={category.icon} title={category.label} subtitle={subtitle} backFallback="/app/marketplace">
        {isCustomer && (
          <div className="mt-3">
            <LocationBar loc={loc} />
          </div>
        )}
        <div className="mt-3">
          <CategoryPills counts={counts} activeId={categoryId} />
        </div>
      </PageHeader>

      <ProductGrid
        products={products}
        isLoading={!waitingForLocation && active.isLoading}
        error={!waitingForLocation && active.error}
        emptyMessage={
          waitingForLocation
            ? "Use your current location or enter a place above to find produce near you."
            : isCustomer
              ? `No ${category.label.toLowerCase()} within ${radiusKm} km yet.`
              : "Nothing listed here yet — check back soon."
        }
      />
    </Page>
  );
}
