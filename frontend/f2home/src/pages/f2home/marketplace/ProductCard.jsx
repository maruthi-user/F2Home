import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";

// Shared product tile - used by the customer-facing category grid (with a
// Buy button in `footer`) and the farmer's own product list (with Edit/
// Delete in `footer`). The first image is shown as the thumbnail via
// URL.createObjectURL, since product.images are File objects stored
// directly in IndexedDB (see utils/marketplaceDb.js) - the object URL is
// revoked on unmount/change to avoid leaking memory.
export default function ProductCard({ product, footer }) {
  const [imageUrl, setImageUrl] = useState(null);
  const firstImage = product.images?.[0];

  useEffect(() => {
    if (!firstImage) {
      setImageUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(firstImage);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [firstImage]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-[#f2f8ea]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-10 w-10 text-[#8bc34a]" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="truncate font-semibold text-[#3c3c3c] dark:text-white">
          {product.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          by {product.farmerName}
        </p>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#33691e]">
            ₹{product.price}
          </span>
          <span className="text-xs text-muted-foreground">
            / {product.unit}
          </span>
        </div>

        <p
          className={`text-xs ${
            product.quantity > 0 ? "text-muted-foreground" : "font-medium text-red-500"
          }`}
        >
          {product.quantity > 0
            ? `${product.quantity} ${product.unit} available`
            : "Out of stock"}
        </p>

        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </Card>
  );
}
