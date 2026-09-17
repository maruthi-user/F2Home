import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { MARKETPLACE_CATEGORIES } from "@/config/marketplaceCategories";
import { getAllProducts } from "@/utils/marketplaceDb";

export default function MarketplaceIndex() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;

    getAllProducts().then((products) => {
      if (cancelled) return;

      const next = {};
      products.forEach((product) => {
        next[product.category] = (next[product.category] || 0) + 1;
      });
      setCounts(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="rounded-3xl bg-gradient-to-r from-[#f2f8ea] via-[#d9eebf] to-[#8bc34a] p-8 md:p-10">
        <h1 className="text-3xl font-bold text-[#33691e] md:text-4xl">
          Marketplace
        </h1>
        <p className="mt-2 text-[#2e7d32]">
          Fresh produce, straight from local farmers.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETPLACE_CATEGORIES.map(({ id, label, icon: Icon }) => (
          <Card
            key={id}
            onClick={() => navigate(`/app/marketplace/${id}`)}
            className="cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f8ea] text-[#33691e]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {counts[id] ? `${counts[id]} listed` : "No listings yet"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
