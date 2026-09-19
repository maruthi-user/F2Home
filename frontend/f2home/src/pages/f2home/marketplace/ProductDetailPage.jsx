import { useState } from "react";
import { useParams } from "wouter";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ImageOff, Loader, MapPin, Minus, Plus, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/common/BackButton";
import { Page } from "@/components/common/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { getCategoryById } from "@/config/marketplaceCategories";
import { useGetProductQuery, mediaUrl } from "@/redux/f2home/marketplaceApi";
import { haversineKm, formatKm } from "@/utils/geo";
import { addToCart, selectCartItems } from "@/redux/slices/cartSlice";
import useCustomerLocation from "@/hooks/useCustomerLocation";

// Customer view of one listing: gallery (images + optional video), price,
// stock, location (with distance from the customer), farmer, description
// and an add-to-cart control with a quantity picker.
export default function ProductDetailPage() {
  const { category: categoryId, id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const cartItems = useSelector(selectCartItems);
  const { location: myLocation } = useCustomerLocation();

  const { data: product, isLoading, error } = useGetProductQuery(id);
  const [quantity, setQuantity] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <Page className="max-w-3xl">
        <BackButton className="-ml-3" fallback={`/app/marketplace/${categoryId}`} />
        <p className="mt-6 text-center text-muted-foreground">This product is no longer available.</p>
      </Page>
    );
  }

  const media = (product.media || []).map((m) => ({ ...m, src: mediaUrl(m.url) }));
  const category = getCategoryById(product.category);
  const inCart = cartItems.find((i) => i.productId === product.id)?.quantity || 0;
  const remaining = Math.max(0, product.quantity - inCart);
  const distanceKm =
    myLocation && product.location ? haversineKm(myLocation, product.location) : null;
  const active = media[activeIndex] || media[0];

  const handleAdd = () => {
    dispatch(addToCart({ product, quantity }));
    toast({
      title: "Added to cart",
      description: `${quantity} ${product.unit} of ${product.name} added.`,
    });
    setQuantity(1);
  };

  return (
    <Page className="max-w-6xl">
      <BackButton className="-ml-3 mb-2" fallback={`/app/marketplace/${categoryId}`} />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        {/* Gallery */}
        <div>
          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f2f8ea]">
            {!active ? (
              <ImageOff className="h-14 w-14 text-[#8bc34a]" />
            ) : active.type === "VIDEO" ? (
              <video src={active.src} controls className="h-full w-full object-contain" />
            ) : (
              <img src={active.src} alt={product.name} className="h-full w-full object-cover" />
            )}
          </div>

          {media.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {media.map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                    index === activeIndex ? "border-[#33691e]" : "border-transparent"
                  }`}
                >
                  {m.type === "VIDEO" ? (
                    <video src={m.src} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={m.src} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {category && (
            <button
              type="button"
              onClick={() => navigate(`/app/marketplace/${category.id}`)}
              className="w-fit text-xs font-medium uppercase tracking-wide text-[#2e7d32] hover:underline"
            >
              {category.label}
            </button>
          )}
          <h1 className="mt-1 text-3xl font-bold text-[#3c3c3c] dark:text-white">{product.name}</h1>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#33691e]">₹{product.price}</span>
            <span className="text-sm text-muted-foreground">/ {product.unit}</span>
          </div>

          <p
            className={`mt-2 text-sm ${
              product.quantity > 0 ? "text-muted-foreground" : "font-medium text-red-500"
            }`}
          >
            {product.quantity > 0
              ? `${product.quantity} ${product.unit} available`
              : "Out of stock"}
            {inCart > 0 && ` · ${inCart} in your cart`}
          </p>

          <dl className="mt-5 space-y-3 rounded-2xl bg-[#f2f8ea] p-4 text-sm dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#33691e]" />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
                <dd className="text-gray-800 dark:text-gray-100">
                  {product.location?.label || "Not specified"}
                  {Number.isFinite(distanceKm) && (
                    <span className="ml-2 text-[#33691e]">({formatKm(distanceKm)} away)</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-[#33691e]" />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Farmer</dt>
                <dd className="text-gray-800 dark:text-gray-100">{product.farmerName}</dd>
              </div>
            </div>
          </dl>

          {product.description && (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Description</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-semibold">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                disabled={quantity >= remaining}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{product.unit}</span>
            </div>

            <Button
              type="button"
              onClick={handleAdd}
              disabled={remaining <= 0}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] py-6 text-base text-white hover:opacity-90 disabled:opacity-50"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {remaining <= 0
                ? inCart > 0
                  ? "All available stock is in your cart"
                  : "Out of stock"
                : `Add to cart · ₹${(quantity * Number(product.price)).toFixed(2)}`}
            </Button>

            {inCart > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/app/cart")}
                className="mt-2 w-full rounded-full"
              >
                View cart
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
