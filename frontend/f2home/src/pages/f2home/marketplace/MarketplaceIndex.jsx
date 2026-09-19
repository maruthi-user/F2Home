import { useMemo } from "react";
import { useSelector } from "react-redux";
import { ShoppingBasket } from "lucide-react";
import PageHeader, { Page } from "@/components/common/PageHeader";
import {
  useGetAllProductsQuery,
  useGetMarketplaceRulesQuery,
  useGetNearbyProductsQuery,
} from "@/redux/f2home/marketplaceApi";
import useCustomerLocation from "@/hooks/useCustomerLocation";
import LocationBar from "./LocationBar";
import CategoryPills from "./CategoryPills";
import ProductGrid from "./ProductGrid";

// Marketplace home: category chips (with counts) + every listing that is
// relevant to the viewer - within the radius for customers, everything for
// farmers/admins. Clicking a chip narrows to that category page.
export default function MarketplaceIndex() {
  const user = useSelector((state) => state.auth?.user || null);
  const isCustomer = user?.role === "CUSTOMER";
  const loc = useCustomerLocation();
  const { data: rules } = useGetMarketplaceRulesQuery();
  const radiusKm = rules?.nearbyRadiusKm ?? 20;

  const nearby = useGetNearbyProductsQuery(
    { lat: loc.location?.lat, lng: loc.location?.lng },
    { skip: !isCustomer || !loc.location }
  );
  const all = useGetAllProductsQuery({}, { skip: isCustomer });
  const active = isCustomer ? nearby : all;
  const waitingForLocation = isCustomer && !loc.location;
  const products = useMemo(() => (waitingForLocation ? [] : active.data || []), [waitingForLocation, active.data]);

  const counts = useMemo(() => {
    const next = {};
    products.forEach((p) => {
      next[p.category] = (next[p.category] || 0) + 1;
    });
    return next;
  }, [products]);

  const subtitle = waitingForLocation
    ? "Set your location to see produce near you"
    : isCustomer
      ? `${products.length} listing${products.length === 1 ? "" : "s"} within ${radiusKm} km`
      : `${products.length} listing${products.length === 1 ? "" : "s"} from local farmers`;

  return (
    <Page>
      <PageHeader icon={ShoppingBasket} title="Marketplace" subtitle={subtitle}>
        {isCustomer && (
          <div className="mt-3">
            <LocationBar loc={loc} />
          </div>
        )}
        <div className="mt-3">
          <CategoryPills counts={counts} activeId={null} />
        </div>
      </PageHeader>

      <ProductGrid
        products={products}
        isLoading={!waitingForLocation && active.isLoading}
        error={!waitingForLocation && active.error}
        showCategory
        emptyMessage={
          waitingForLocation
            ? "Use your current location or enter a place above to find produce near you."
            : isCustomer
              ? `No listings within ${radiusKm} km yet — try another location.`
              : "No listings yet."
        }
      />
    </Page>
  );
}
