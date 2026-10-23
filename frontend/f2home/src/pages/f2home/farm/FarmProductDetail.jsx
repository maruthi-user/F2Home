import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoute } from "wouter";
import { Loader, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PageHeader, { Page } from "@/components/common/PageHeader";
import { getCategoryById } from "@/config/marketplaceCategories";
import {
  mediaUrl,
  useDeleteProductMutation,
  useGetMyProductsQuery,
} from "@/redux/f2home/marketplaceApi";
import { formatDate, formatDateTime } from "@/utils/expiry";
import ProductFormDialog from "./ProductFormDialog";
import ExpiryBadge from "./ExpiryBadge";

const Detail = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-sm last:border-0 dark:border-gray-800">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium text-[#2f3b2f] dark:text-white">{children}</dd>
  </div>
);

// Full details of one of the farmer's own listings, with edit and
// (confirmed) delete. Looked up from the farmer's own list, so a listing that
// isn't theirs, or has expired / been deleted, simply isn't found.
export default function FarmProductDetail() {
  const [, params] = useRoute("/app/farm/marketplace/:id");
  const id = Number(params?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: products = [], isLoading } = useGetMyProductsQuery();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);

  const product = products.find((p) => p.id === id);

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      </Page>
    );
  }

  if (!product) {
    return (
      <Page>
        <PageHeader title="Product not found" backFallback="/app/farm/marketplace" />
        <p className="text-sm text-muted-foreground">
          This listing is no longer live — it may have been deleted or expired. You can still find it under My Farm.
        </p>
      </Page>
    );
  }

  const media = product.media || [];
  const current = media[Math.min(activeMedia, media.length - 1)];
  const category = getCategoryById(product.category);

  const handleDelete = async () => {
    try {
      await deleteProduct(product.id).unwrap();
      toast({ title: "Product deleted", description: `${product.name} was removed from the marketplace.` });
      navigate("/app/farm/marketplace");
    } catch (err) {
      toast({
        title: "Couldn't delete product",
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
      setConfirmOpen(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title={product.name}
        subtitle={category?.label}
        backFallback="/app/farm/marketplace"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)} className="rounded-lg">
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#eef3e6]">
            {current?.type === "VIDEO" ? (
              <video src={mediaUrl(current.url)} controls className="h-full w-full object-contain" />
            ) : current ? (
              <img src={mediaUrl(current.url)} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No photos added
              </div>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMedia(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-[#eef3e6] ${
                    i === activeMedia ? "border-[#33691e]" : "border-transparent"
                  }`}
                >
                  {m.type === "VIDEO" ? (
                    <span className="text-xs">Video</span>
                  ) : (
                    <img src={mediaUrl(m.url)} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-2xl font-bold text-[#33691e]">
              ₹{product.price}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {product.unit}</span>
            </span>
            <ExpiryBadge product={product} />
          </div>
          {product.description && (
            <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
          )}
          <dl>
            <Detail label="Category">{category?.label || product.category}</Detail>
            <Detail label="Quantity available">
              {product.quantity} {product.unit}
            </Detail>
            <Detail label="Harvest date">{formatDate(product.harvestDate)}</Detail>
            <Detail label="Location">{product.location?.label}</Detail>
            <Detail label="Listed on">{formatDateTime(product.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(product.updatedAt)}</Detail>
            {product.perishable && (
              <Detail label="Auto-expires">{formatDateTime(product.expiresAt)}</Detail>
            )}
          </dl>
        </div>
      </div>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{product.name}" will be removed from the marketplace. It stays in My Farm as history, but
            this can't be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
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
