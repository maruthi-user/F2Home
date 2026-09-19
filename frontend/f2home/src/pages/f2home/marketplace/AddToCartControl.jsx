import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addToCart, selectCartItems } from "@/redux/slices/cartSlice";
import { shortUnit } from "@/config/marketplaceCategories";

// Inline quantity stepper + Add button for a product tile, so a customer
// can put 3 kg (or 2 dozen, 5 pieces...) in the cart straight from the
// grid without opening the product. Quantity is capped at what is still
// available after whatever is already in the cart.
export default function AddToCartControl({ product }) {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const inCart = useSelector(selectCartItems).find((i) => i.productId === product.id)?.quantity || 0;
  const remaining = Math.max(0, product.quantity - inCart);
  const [qty, setQty] = useState(1);

  const value = Math.min(qty, Math.max(1, remaining));

  const handleAdd = () => {
    if (remaining <= 0) return;
    dispatch(addToCart({ product, quantity: value }));
    toast({
      title: "Added to cart",
      description: `${value} ${product.unit} of ${product.name} added.`,
    });
    setQty(1);
  };

  if (product.quantity <= 0) {
    return (
      <button
        type="button"
        disabled
        className="h-8 w-full rounded-lg bg-gray-100 text-xs font-medium text-gray-400 dark:bg-gray-800"
      >
        Sold out
      </button>
    );
  }

  if (remaining <= 0) {
    return (
      <p className="h-8 rounded-lg bg-[#f2f8ea] text-center text-[11px] leading-8 text-[#33691e]">
        All {product.quantity} {product.unit} in your cart
      </p>
    );
  }

  return (
    <div className="flex h-8 items-stretch gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 items-center rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={value <= 1}
          className="flex h-full w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Decrease quantity"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          min={1}
          max={remaining}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            setQty(Number.isFinite(n) ? Math.min(remaining, Math.max(1, n)) : 1);
          }}
          className="h-full w-9 border-x border-gray-200 bg-transparent text-center text-xs font-semibold text-[#2f3b2f] outline-none [appearance:textfield] dark:border-gray-700 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`Quantity in ${product.unit}`}
        />
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(remaining, q + 1))}
          disabled={value >= remaining}
          className="flex h-full w-7 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Increase quantity"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-[#33691e] px-2 text-xs font-medium text-white transition hover:bg-[#2e5d1a]"
        title={`Add ${value} ${product.unit} · ₹${(value * Number(product.price)).toFixed(0)}`}
      >
        <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Add {value} {shortUnit(product.unit)}</span>
      </button>
    </div>
  );
}
