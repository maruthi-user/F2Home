import { useState } from "react";
import { useSelector } from "react-redux";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { decrementProductQuantity, addOrder } from "@/utils/marketplaceDb";
import { useToast } from "@/hooks/use-toast";

// Quantity-picker purchase confirmation. On confirm: decrements the
// product's stock and writes an order record - both local (IndexedDB), no
// backend/payment involved, matching the "customer can only buy" local-only
// scope of this feature.
export default function BuyDialog({ product, open, onOpenChange, onPurchased }) {
  const user = useSelector((state) => state.auth?.user || null);
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!product) return null;

  const totalPrice = (quantity * Number(product.price || 0)).toFixed(2);

  const handleOpenChange = (next) => {
    if (!next) {
      setQuantity(1);
      setError("");
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      await decrementProductQuantity(product.id, quantity);
      await addOrder({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] || null,
        customerPhone: user?.phoneNumber,
        customerName: user?.fullName,
        quantity,
        unitPrice: product.price,
        totalPrice: Number(totalPrice),
      });

      toast({
        title: "Order placed!",
        description: `${quantity} ${product.unit} of ${product.name} purchased.`,
      });

      onPurchased?.();
      handleOpenChange(false);
    } catch (err) {
      setError(err.message || "Unable to complete purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#33691e]">
            <ShoppingBasket className="h-5 w-5" /> Buy {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-xl bg-[#f2f8ea] px-4 py-3">
            <span className="text-sm text-[#2e7d32]">Price</span>
            <span className="font-semibold text-[#33691e]">
              ₹{product.price} / {product.unit}
            </span>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Quantity ({product.unit})
            </label>
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
              <span className="w-12 text-center text-lg font-semibold">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setQuantity((q) => Math.min(product.quantity, q + 1))
                }
                disabled={quantity >= product.quantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {product.quantity} available
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Total
            </span>
            <span className="text-xl font-bold text-[#33691e]">
              ₹{totalPrice}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || product.quantity <= 0}
            className="w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
          >
            {isSubmitting ? "Placing order..." : "Confirm Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
