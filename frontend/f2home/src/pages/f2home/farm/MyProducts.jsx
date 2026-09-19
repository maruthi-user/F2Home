import { useState } from "react";
import { Loader, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
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
import PageHeader, { Page, productGridClass } from "@/components/common/PageHeader";
import { useDeleteProductMutation, useGetMyProductsQuery } from "@/redux/f2home/marketplaceApi";
import ProductCard from "../marketplace/ProductCard";
import ProductFormDialog from "./ProductFormDialog";

// A farmer's own listings - add/edit/delete via /api/f2home/products.
// Read-only browsing/buying lives in the marketplace pages; this is the
// "farmer can add products + price" side of the feature.
export default function MyProducts() {
  const { toast } = useToast();

  const { data: products = [], isLoading } = useGetMyProductsQuery();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
    try {
      await deleteProduct(deleteTarget.id).unwrap();
      toast({ title: "Product removed", description: `${deleteTarget.name} was deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Couldn't delete product",
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Page>
      <PageHeader
        icon={Sprout}
        title="My products"
        subtitle={isLoading ? "" : `${products.length} listing${products.length === 1 ? "" : "s"} · list your harvest and reach customers directly`}
        actions={
          <Button
            type="button"
            onClick={openAddDialog}
            className="rounded-lg bg-[#33691e] text-white hover:bg-[#2e5d1a]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add product
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          You haven't listed any products yet — add your first one to get started.
        </div>
      ) : (
        <div className={productGridClass}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showCategory
              footer={
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-lg text-xs"
                    onClick={() => openEditDialog(product)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-lg text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteTarget(product)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
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
    </Page>
  );
}
