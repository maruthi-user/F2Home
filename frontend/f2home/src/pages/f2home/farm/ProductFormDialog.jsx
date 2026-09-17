import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSelector } from "react-redux";
import { ImagePlus, Trash2, Video, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MARKETPLACE_CATEGORIES,
  PRODUCT_UNITS,
} from "@/config/marketplaceCategories";
import {
  addProduct,
  updateProduct,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  MAX_VIDEO_SIZE_BYTES,
} from "@/utils/marketplaceDb";

const fieldClass =
  "w-full rounded-2xl bg-[#eef3e6] px-4 py-3 text-gray-700 outline-none border border-transparent focus:border-[#7cb342]";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200";

const emptyValues = {
  name: "",
  category: "",
  description: "",
  price: "",
  unit: "kg",
  quantity: "",
};

// Add/edit dialog for a farmer's own listing. Images/video are held as plain
// File objects in local state (not react-hook-form fields) so previews via
// URL.createObjectURL are simple to manage; on submit they're written
// straight into IndexedDB (see utils/marketplaceDb.js) - no upload endpoint,
// no base64 conversion.
export default function ProductFormDialog({ open, onOpenChange, product, onSaved }) {
  const user = useSelector((state) => state.auth?.user || null);
  const { toast } = useToast();
  const isEditing = Boolean(product);

  const [images, setImages] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // string[] object URLs
  const [video, setVideo] = useState(null); // File | null
  const [videoPreview, setVideoPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: emptyValues });

  // Reset the whole form (fields + media) whenever the dialog opens, seeded
  // from the product being edited or blank for a new one.
  useEffect(() => {
    if (!open) return;

    reset(
      product
        ? {
            name: product.name,
            category: product.category,
            description: product.description || "",
            price: product.price,
            unit: product.unit,
            quantity: product.quantity,
          }
        : emptyValues
    );
    setImages(product?.images || []);
    setVideo(product?.video || null);
    setFileError("");
  }, [open, product, reset]);

  // Build/revoke object URLs whenever the underlying File lists change.
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  useEffect(() => {
    if (!video) {
      setVideoPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(video);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const handleImagesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setFileError("");

    if (images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
      setFileError(`You can add up to ${MAX_IMAGES_PER_PRODUCT} images.`);
      return;
    }

    const tooBig = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is over the 4MB limit per image.`);
      return;
    }

    setImages((prev) => [...prev, ...files]);
  };

  const handleVideoSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileError("");

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setFileError(`"${file.name}" is over the 25MB video limit.`);
      return;
    }

    setVideo(file);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    setFileError("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name.trim(),
        category: data.category,
        description: data.description.trim(),
        price: Number(data.price),
        unit: data.unit,
        quantity: Number(data.quantity),
        images,
        video,
        farmerPhone: user?.phoneNumber,
        farmerName: user?.fullName,
      };

      if (isEditing) {
        await updateProduct(product.id, payload);
        toast({ title: "Product updated", description: `${payload.name} has been updated.` });
      } else {
        await addProduct(payload);
        toast({ title: "Product listed", description: `${payload.name} is now live in the marketplace.` });
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setFileError(err.message || "Unable to save this product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#33691e]">
            {isEditing ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Product Name</label>
            <input
              type="text"
              placeholder="e.g. Fresh Tomatoes"
              className={fieldClass}
              {...register("name", { required: "Product name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <Controller
                name="category"
                control={control}
                rules={{ required: "Required" }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-2xl bg-[#eef3e6] border-transparent py-3 h-auto">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETPLACE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Unit</label>
              <Controller
                name="unit"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="rounded-2xl bg-[#eef3e6] border-transparent py-3 h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={fieldClass}
                {...register("price", {
                  required: "Required",
                  min: { value: 0.01, message: "Must be greater than 0" },
                })}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Quantity Available</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className={fieldClass}
                {...register("quantity", {
                  required: "Required",
                  min: { value: 0, message: "Cannot be negative" },
                })}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              placeholder="Freshly harvested, pesticide-free..."
              className={`${fieldClass} resize-none`}
              {...register("description")}
            />
          </div>

          <div>
            <label className={labelClass}>
              Photos ({images.length}/{MAX_IMAGES_PER_PRODUCT})
            </label>
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((src, index) => (
                <div key={src} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES_PER_PRODUCT && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#8bc34a] text-[#33691e] hover:bg-[#f2f8ea]">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImagesSelected}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Video (optional)</label>
            {videoPreview ? (
              <div className="relative w-full max-w-xs">
                <video src={videoPreview} controls className="w-full rounded-xl" />
                <button
                  type="button"
                  onClick={() => setVideo(null)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex h-20 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#8bc34a] text-[#33691e] hover:bg-[#f2f8ea]">
                <Video className="h-5 w-5" />
                <span className="text-xs">Add video</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoSelected}
                />
              </label>
            )}
          </div>

          {fileError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {fileError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "List Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
