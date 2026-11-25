import { useState } from "react";
import { useStore } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addToCart, canAddFromFarm, selectCartItems } from "@/redux/slices/cartSlice";

export default function useAddFarmProduct() {
  const store = useStore();
  const { toast } = useToast();
  const [pending, setPending] = useState(null);

  function commit(product, quantity, onAdded, replace = false) {
    const before = selectCartItems(store.getState());
    store.dispatch(addToCart({ product, quantity, replace }));
    if (selectCartItems(store.getState()) === before) return;
    toast({
      title: "Added to cart",
      description: quantity + " " + product.unit + " of " + product.name + " added.",
    });
    onAdded();
  }

  function add(product, quantity, onAdded) {
    if (product.farmerId == null || quantity <= 0 || product.quantity <= 0) return;
    const state = store.getState();
    const items = selectCartItems(state);
    if (canAddFromFarm(items, product.farmerId)) {
      commit(product, quantity, onAdded);
    } else {
      setPending({ product, quantity, onAdded, items, owner: state.cart.owner });
    }
  }

  function replaceCart() {
    const state = store.getState();
    if (state.cart.owner === pending.owner && selectCartItems(state) === pending.items) {
      commit(pending.product, pending.quantity, pending.onAdded, true);
    } else {
      toast({ title: "Your cart changed", description: "Review your cart and try again." });
    }
    setPending(null);
  }

  const confirmation = pending && (
    <Dialog open onOpenChange={(open) => { if (!open) setPending(null); }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl bg-[#faf7ef] dark:bg-background">
        <DialogHeader>
          <DialogTitle>Start a new cart?</DialogTitle>
          <DialogDescription>
            Each order can contain items from one farm. Starting a cart with {pending.product.farmerName}
            {" "}will remove the items currently in your cart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setPending(null)}>Keep current cart</Button>
          <Button type="button" className="bg-[#245730] text-white hover:bg-[#183f23]" onClick={replaceCart}>
            Start a new cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { add, confirmation };
}
