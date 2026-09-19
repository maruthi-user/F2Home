import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader } from "lucide-react";
import { productGridClass } from "@/components/common/PageHeader";
import ProductCard from "./ProductCard";
import AddToCartControl from "./AddToCartControl";

// The customer / farmer product grid used by the marketplace home and the
// category pages. Customers get a quantity stepper + Add button on every
// tile and can open the detail page; farmers and admins just browse.
export default function ProductGrid({ products = [], isLoading, error, emptyMessage, showCategory = false }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user || null);
  const isCustomer = user?.role === "CUSTOMER";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="h-7 w-7 animate-spin text-[#33691e]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-600">
        {error?.data?.message || "Couldn't load listings. Please try again."}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm text-muted-foreground dark:border-gray-700 dark:bg-gray-900/60">
        {emptyMessage || "Nothing listed here yet — check back soon."}
      </div>
    );
  }

  return (
    <div className={productGridClass}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showCategory={showCategory}
          onOpen={isCustomer ? () => navigate(`/app/marketplace/${product.category}/${product.id}`) : undefined}
          footer={isCustomer ? <AddToCartControl product={product} /> : null}
        />
      ))}
    </div>
  );
}
