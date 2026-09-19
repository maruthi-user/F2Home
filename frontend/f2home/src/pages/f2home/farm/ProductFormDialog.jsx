import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Crosshair, ImagePlus, Loader, MapPin, Trash2, Video, X } from "lucide-react";
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
  buildProductFormData,
  mediaUrl,
  useCreateProductMutation,
  useGetMarketplaceRulesQuery,
  useUpdateProductMutation,
} from "@/redux/f2home/marketplaceApi";
import {
  getCurrentPosition,
  reverseGeocode,
  forwardGeocode,
  formatCoords,
  isValidCoords,
} from "@/utils/geo";

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

// Add/edit dialog for a farmer's own listing. New photos/video are held as
// File objects in local state (previews via URL.createObjectURL); media the
// listing already has is shown from its API URL and reported back as
// keepMediaIds so the backend deletes whatever the farmer removed. Submit is
// one multipart request (see buildProductFormData).
export default function ProductFormDialog({ open, onOpenChange, product }) {
  const { toast } = useToast();
  const isEditing = Boolean(product);
  const { data: rules } = useGetMarketplaceRulesQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  // Limits come from the server rules; defaults only until they arrive.
  const MAX_IMAGE_SIZE_BYTES = rules?.maxImageBytes ?? 4 * 1024 * 1024;
  const MAX_IMAGES_PER_PRODUCT = rules?.maxImagesPerProduct ?? 5;
  const MAX_VIDEO_SIZE_BYTES = rules?.maxVideoBytes ?? 25 * 1024 * 1024;

  const [existingImages, setExistingImages] = useState([]); // [{ id, url }] already on the listing
  const [existingVideo, setExistingVideo] = useState(null); // { id, url } | null
  const [images, setImages] = useState([]); // File[] (new)
  const [imagePreviews, setImagePreviews] = useState([]); // string[] object URLs
  const [video, setVideo] = useState(null); // File | null (new)
  const [videoPreview, setVideoPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where the produce is. Customers only see listings within 20 km of
  // themselves, so a listing needs coordinates: from the device's GPS, or
  // geocoded from the typed place name on submit (with a raw lat/lng
  // fallback when geocoding is unreachable).
  const [placeName, setPlaceName] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng } | null
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showCoords, setShowCoords] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

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
    const media = product?.media || [];
    setExistingImages(
      media.filter((m) => m.type === "IMAGE").map((m) => ({ id: m.id, url: mediaUrl(m.url) }))
    );
    const v = media.find((m) => m.type === "VIDEO");
    setExistingVideo(v ? { id: v.id, url: mediaUrl(v.url) } : null);
    setImages([]);
    setVideo(null);
    setFileError("");

    setPlaceName(product?.location?.label || "");
    setCoords(
      product?.location?.lat != null
        ? { lat: product.location.lat, lng: product.location.lng }
        : null
    );
    setManualLat("");
    setManualLng("");
    setShowCoords(false);
    setLocationError("");
  }, [open, product, reset]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError("");
    try {
      const pos = await getCurrentPosition();
      const next = { lat: pos.lat, lng: pos.lng };
      setCoords(next);
      const label = await reverseGeocode(next);
      setPlaceName(label || `Current location (${formatCoords(next)})`);
    } catch (err) {
      setLocationError(err.message || "Unable to get your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handlePlaceNameChange = (e) => {
    setPlaceName(e.target.value);
    // A hand-edited place no longer matches the stored coordinates.
    setCoords(null);
    setLocationError("");
  };

  const applyManualCoords = () => {
    const next = { lat: Number(manualLat), lng: Number(manualLng) };
    if (!isValidCoords(next)) {
      setLocationError("Enter a valid latitude (-90..90) and longitude (-180..180).");
      return;
    }
    setCoords(next);
    setLocationError("");
    if (!placeName.trim()) setPlaceName(formatCoords(next));
  };

  // Resolve the listing's location for saving. Returns null (and sets the
  // error) when it cannot be determined.
  const resolveLocation = async () => {
    const label = placeName.trim();
    if (!label && !coords) {
      setLocationError("Add the product location - use your current location or type the place name.");
      return null;
    }
    if (coords) return { ...coords, label: label || formatCoords(coords) };

    const hit = await forwardGeocode(label);
    if (!hit) {
      setLocationError(
        `Couldn't find "${label}". Use your current location, try a nearby town name, or enter coordinates.`
      );
      setShowCoords(true);
      return null;
    }
    setCoords({ lat: hit.lat, lng: hit.lng });
    return { lat: hit.lat, lng: hit.lng, label };
  };

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

    if (existingImages.length + images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
      setFileError(`You can add up to ${MAX_IMAGES_PER_PRODUCT} images.`);
      return;
    }

    const tooBig = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is over the ${Math.round(MAX_IMAGE_SIZE_BYTES / 1048576)}MB limit per image.`);
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
      setFileError(`"${file.name}" is over the ${Math.round(MAX_VIDEO_SIZE_BYTES / 1048576)}MB video limit.`);
      return;
    }

    // A listing holds one video: a new upload replaces the existing one.
    setExistingVideo(null);
    setVideo(file);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    setFileError("");
    setLocationError("");
    setIsSubmitting(true);

    try {
      const location = await resolveLocation();
      if (!location) return;

      const payload = {
        name: data.name.trim(),
        category: data.category,
        description: data.description.trim(),
        price: Number(data.price),
        unit: data.unit,
        quantity: Number(data.quantity),
        location,
        keepMediaIds: [
          ...existingImages.map((m) => m.id),
          ...(existingVideo ? [existingVideo.id] : []),
        ],
      };
      const formData = buildProductFormData(payload, images, video);

      if (isEditing) {
        await updateProduct({ id: product.id, formData }).unwrap();
        toast({ title: "Product updated", description: `${payload.name} has been updated.` });
      } else {
        await createProduct(formData).unwrap();
        toast({ title: "Product listed", description: `${payload.name} is now live in the marketplace.` });
      }

      onOpenChange(false);
    } catch (err) {
      setFileError(err?.data?.message || err.message || "Unable to save this product. Please try again.");
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
            <label className={labelClass}>Product Location</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#33691e]" />
                <input
                  type="text"
                  value={placeName}
                  onChange={handlePlaceNameChange}
                  placeholder="Village / town where the produce is"
                  className={`${fieldClass} pl-11`}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="shrink-0 rounded-2xl border-[#8bc34a] text-[#33691e] hover:bg-[#f2f8ea]"
                title="Use my current location"
              >
                {isLocating ? <Loader className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">Current</span>
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {coords ? `Pinned at ${formatCoords(coords)}` : "Customers within 20 km of this place will see it."}
              </span>
              <button
                type="button"
                onClick={() => setShowCoords((v) => !v)}
                className="text-[#33691e] underline-offset-2 hover:underline"
              >
                {showCoords ? "Hide coordinates" : "Enter coordinates"}
              </button>
            </div>
            {showCoords && (
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className={fieldClass} />
                <input type="number" step="any" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className={fieldClass} />
                <Button type="button" onClick={applyManualCoords} className="rounded-2xl bg-[#33691e] text-white hover:opacity-90">Pin</Button>
              </div>
            )}
            {locationError && (
              <p className="mt-1 text-sm text-red-500">{locationError}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Photos ({existingImages.length + images.length}/{MAX_IMAGES_PER_PRODUCT})
            </label>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((m) => (
                <div key={m.id} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingImages((prev) => prev.filter((x) => x.id !== m.id))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
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

              {existingImages.length + images.length < MAX_IMAGES_PER_PRODUCT && (
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
            {videoPreview || existingVideo ? (
              <div className="relative w-full max-w-xs">
                <video src={videoPreview || existingVideo.url} controls className="w-full rounded-xl" />
                <button
                  type="button"
                  onClick={() => {
                    setVideo(null);
                    setExistingVideo(null);
                  }}
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
