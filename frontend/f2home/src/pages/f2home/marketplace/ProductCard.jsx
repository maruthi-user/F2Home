import { ImageOff, MapPin } from "lucide-react";
import { formatKm } from "@/utils/geo";
import { firstImageUrl } from "@/redux/f2home/marketplaceApi";
import { getCategoryById } from "@/config/marketplaceCategories";

// Compact product tile: 4:3 photo, name, farmer · place · distance, price
// row. `footer` (Add-to-cart for customers, Edit/Delete for farmers) sits
// below the price. `onOpen` makes the photo and title open the detail page.
export default function ProductCard({ product, footer, onOpen, showCategory = false }) {
  const imageUrl = firstImageUrl(product);
  const clickable = typeof onOpen === "function";
  const openProps = clickable
    ? {
        role: "button",
        tabIndex: 0,
        onClick: onOpen,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        },
      }
    : {};
  const category = showCategory ? getCategoryById(product.category) : null;
  const outOfStock = product.quantity <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div
        {...openProps}
        className={`relative aspect-[4/3] w-full overflow-hidden bg-[#eef3e6] ${clickable ? "cursor-pointer" : ""}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-[#8bc34a]" />
          </div>
        )}
        {category && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#33691e] shadow-sm">
            {category.label}
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3
          {...openProps}
          className={`truncate text-sm font-semibold text-[#2f3b2f] dark:text-white ${clickable ? "cursor-pointer hover:text-[#33691e]" : ""}`}
          title={product.name}
        >
          {product.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span className="truncate">{product.farmerName}</span>
          {product.location?.label && (
            <>
              <span aria-hidden>·</span>
              <MapPin className="h-3 w-3 shrink-0 text-[#8bc34a]" />
              <span className="truncate">{product.location.label}</span>
              {Number.isFinite(product.distanceKm) && (
                <span className="shrink-0 font-medium text-[#33691e]">{formatKm(product.distanceKm)}</span>
              )}
            </>
          )}
        </p>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-base font-bold text-[#33691e]">
            ₹{product.price}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">/ {product.unit}</span>
          </span>
          <span className={`text-[11px] ${outOfStock ? "text-red-500" : "text-muted-foreground"}`}>
            {outOfStock ? "0 left" : `${product.quantity} ${product.unit} left`}
          </span>
        </div>

        {footer && <div className="mt-2.5">{footer}</div>}
      </div>
    </article>
  );
}
