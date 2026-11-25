import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Search } from "lucide-react";
import { useParams } from "wouter";
import { getCategoryById } from "@/config/marketplaceCategories";
import {
  useGetAllProductsQuery,
  useGetNearbyProductsQuery,
  useGetSavedAddressesQuery,
} from "@/redux/f2home/marketplaceApi";
import useCustomerLocation from "@/hooks/useCustomerLocation";
import banner from "@/assets/images/marketplace-produce.webp";
import LocationBar from "./LocationBar";
import CategoryPills from "./CategoryPills";
import ProductGrid from "./ProductGrid";
import "./marketplace.css";

export default function MarketplaceIndex() {
  const { category: categoryId } = useParams();
  const category = getCategoryById(categoryId);
  const isCustomer = useSelector((state) => state.auth?.user?.role === "CUSTOMER");
  const [search, setSearch] = useState("");
  const loc = useCustomerLocation();
  const { currentData: addresses } = useGetSavedAddressesQuery(undefined, { skip: !isCustomer });
  const waitingForLocation = isCustomer && !loc.location;
  const nearby = useGetNearbyProductsQuery(
    { lat: loc.location?.lat, lng: loc.location?.lng, deliveryAware: true },
    { skip: !isCustomer || waitingForLocation, refetchOnMountOrArgChange: true }
  );
  const all = useGetAllProductsQuery({}, { skip: isCustomer });
  const active = isCustomer ? nearby : all;
  const listings = waitingForLocation ? undefined : active.currentData;
  const query = search.trim().toLowerCase();

  const { products, counts } = useMemo(() => {
    const matches = (listings || []).filter((product) =>
      [product.name, product.farmerName].some((name) => name?.toLowerCase().includes(query))
    );
    const totals = {};
    for (const product of matches) {
      totals[product.category] = (totals[product.category] || 0) + 1;
    }
    return {
      products: categoryId ? matches.filter((product) => product.category === categoryId) : matches,
      counts: totals,
    };
  }, [listings, query, categoryId]);

  let emptyMessage = isCustomer
    ? "No listings deliver to this location on the farms’ current schedules."
    : "No listings yet.";
  if (waitingForLocation) {
    emptyMessage = "Set your location to see produce near you.";
  } else if (query) {
    emptyMessage = "No produce matches your search.";
  }

  if (categoryId && !category) {
    return <p className="py-10 text-center">Unknown category.</p>;
  }

  return (
    <div className="phone-module marketplace-view mx-auto w-full max-w-[1440px] space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <h1 className="phone-only phone-marketplace-title">Marketplace</h1>
      <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
        {isCustomer && <LocationBar loc={loc} savedAddresses={addresses} compact />}
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-[#aeb9a2] px-4 focus-within:ring-2 focus-within:ring-[#487453]">
          <Search aria-hidden className="size-4 shrink-0" />
          <input
            type="search"
            aria-label="Search produce or farms"
            placeholder="Search produce"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
      </div>

      {category ? (
        <h1 className="font-serif text-3xl font-bold text-[#17391e] dark:text-green-100">{category.label}</h1>
      ) : (
        <section className="relative isolate flex min-h-36 items-center overflow-hidden rounded-xl bg-[#f4ead0] sm:min-h-56 lg:min-h-72">
          <img src={banner} alt="" className="absolute inset-y-0 right-0 -z-10 h-full w-[68%] object-cover object-[65%_center]" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#f4ead0_22%,#f4ead0_38%,transparent_72%)]" />
          <h1 className="phone-marketplace-hero w-[66%] px-4 py-5 font-serif text-[clamp(1.55rem,5vw,4.25rem)] leading-[1.05] font-bold text-[#17391e] sm:w-[57%] sm:px-9 lg:px-12">
            Fresh from<br />nearby farms
          </h1>
        </section>
      )}

      <CategoryPills counts={counts} activeId={categoryId ?? null} />
      <ProductGrid
        products={products}
        isLoading={!waitingForLocation && active.isFetching && !listings}
        error={!waitingForLocation && active.error}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
