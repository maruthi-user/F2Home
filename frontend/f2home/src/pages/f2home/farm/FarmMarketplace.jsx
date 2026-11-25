import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Loader, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader, { Page, productGridClass } from "@/components/common/PageHeader";
import { useGetMyProductsQuery } from "@/redux/f2home/marketplaceApi";
import useNow from "@/hooks/useNow";
import { isExpired } from "@/utils/expiry";
import ProductCard from "../marketplace/ProductCard";
import ProductFormDialog from "./ProductFormDialog";
import ExpiryBadge from "./ExpiryBadge";

// Farmer "Marketplace": the farmer's own live listings. Opening one goes to
// the detail view (edit / delete). Perishables show a countdown and drop out
// of the grid the moment they expire (the backend also expires them).
export default function FarmMarketplace() {
  const navigate = useNavigate();
  const now = useNow();
  const [formOpen, setFormOpen] = useState(false);

  // Poll so listings the server expires disappear without a manual refresh.
  const { data: products = [], isLoading, isError, refetch } = useGetMyProductsQuery(undefined, {
    pollingInterval: 60000,
  });
  const live = products.filter((p) => !isExpired(p.expiresAt, now));

  return (
    <Page className="phone-listings">
      <PageHeader
        icon={Store}
        title={<><span className="phone-hide">Marketplace</span><span className="phone-only">My listings</span></>}
        subtitle={
          isLoading
            ? ""
            : <>{live.length} live listing{live.length === 1 ? "" : "s"}<span className="phone-hide"> · vegetables &amp; fruits auto-expire after 48 hours</span></>
        }
        actions={
          <Button
            type="button"
            onClick={() => setFormOpen(true)}
            className="phone-add-listing rounded-lg bg-[#33691e] text-white hover:bg-[#2e5d1a]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add product
          </Button>
        }
      />

      {isError && (
        <div className="phone-only phone-listings-message" role="status">
          <p>Couldn’t load your listings.</p>
          <Button type="button" variant="outline" onClick={refetch}>Try again</Button>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : live.length === 0 ? (
        <div className={`${isError ? "phone-hide" : ""} rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700`}>
          You have no live products — add one to start selling. Expired and deleted products stay in My Farm.
        </div>
      ) : (
        <div className={`phone-listings-grid ${productGridClass}`}>
          {live.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showCategory
              onOpen={() => navigate(`/app/farm/marketplace/${product.id}`)}
              footer={<>
                <ExpiryBadge product={product} />
                <Link className="phone-only phone-listing-link" to={`/app/farm/marketplace/${product.id}`}
                  aria-label={`View ${product.name}`}>
                  View listing <ChevronRight size={16} aria-hidden />
                </Link>
              </>}
            />
          ))}
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={null} />
    </Page>
  );
}
