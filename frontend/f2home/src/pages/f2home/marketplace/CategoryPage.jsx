import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { useSelector } from "react-redux";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryById } from "@/config/marketplaceCategories";
import { getProductsByCategory } from "@/utils/marketplaceDb";
import ProductCard from "./ProductCard";
import BuyDialog from "./BuyDialog";

export default function CategoryPage() {
  const { category: categoryId } = useParams();
  const user = useSelector((state) => state.auth?.user || null);
  const category = getCategoryById(categoryId);

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyTarget, setBuyTarget] = useState(null);

  const loadProducts = useCallback(() => {
    if (!categoryId) return;
    setIsLoading(true);
    getProductsByCategory(categoryId)
      .then(setProducts)
      .finally(() => setIsLoading(false));
  }, [categoryId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">
        Unknown category.
      </div>
    );
  }

  const Icon = category.icon;
  const isCustomer = user?.role === "CUSTOMER";

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-[#f2f8ea] via-[#d9eebf] to-[#8bc34a] p-8 md:p-10">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#33691e]">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-[#33691e] md:text-4xl">
            {category.label}
          </h1>
          <p className="mt-1 text-[#2e7d32]">
            {products.length
              ? `${products.length} listing${products.length === 1 ? "" : "s"} from local farmers`
              : "No listings in this category yet"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground dark:border-gray-700">
          Nothing listed here yet — check back soon.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              footer={
                isCustomer ? (
                  <Button
                    type="button"
                    disabled={product.quantity <= 0}
                    onClick={() => setBuyTarget(product)}
                    className="w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {product.quantity > 0 ? "Buy" : "Out of stock"}
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      )}

      <BuyDialog
        product={buyTarget}
        open={!!buyTarget}
        onOpenChange={(open) => !open && setBuyTarget(null)}
        onPurchased={loadProducts}
      />
    </div>
  );
}
