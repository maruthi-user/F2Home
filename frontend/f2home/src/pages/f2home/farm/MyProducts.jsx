import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getCategoryById } from "@/config/marketplaceCategories";
import { getProductsByFarmer, deleteProduct } from "@/utils/marketplaceDb";
import ProductCard from "../marketplace/ProductCard";
import ProductFormDialog from "./ProductFormDialog";

// A farmer's own listings - add/edit/delete. Read-only browsing/buying lives
// in the marketplace pages; this is the "farmer can add products + price"
// side of the feature.
export default function MyProducts() {
  const user = useSelector((state) => state.auth?.user || null);
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = useCallback(() => {
    if (!user?.phoneNumber) return;
    setIsLoading(true);
    getProductsByFarmer(user.phoneNumber)
      .then(setProducts)
      .finally(() => setIsLoading(false));
  }, [user?.phoneNumber]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast({ title: "Product removed", description: `${deleteTarget.name} was deleted.` });
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      toast({
        title: "Couldn't delete product",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#f2f8ea] via-[#d9eebf] to-[#8bc34a] p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div>
          <h1 className="text-3xl font-bold text-[#33691e] md:text-4xl">My Products</h1>
          <p className="mt-2 text-[#2e7d32]">
            List your harvest, set a price, and reach customers directly.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAddDialog}
          className="w-fit rounded-full bg-white text-[#33691e] hover:bg-white/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-muted-foreground dark:border-gray-700">
          You haven't listed any products yet — add your first one to get started.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              footer={
                <div className="space-y-2">
                  <p className="text-center text-xs text-muted-foreground">
                    {getCategoryById(product.category)?.label || product.category}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={loadProducts}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{deleteTarget?.name}" will be removed from the marketplace. This can't be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
