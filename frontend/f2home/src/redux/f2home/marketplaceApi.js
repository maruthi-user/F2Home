import { apiSlice, API_BASE_URL } from "../slices/apiSlice";

// Marketplace endpoints - products (farmer CRUD + customer browsing),
// checkout and order history. All hit /api/f2home/** with the JWT set by
// apiSlice. Media URLs in responses are API-relative; use mediaUrl() to
// turn them into absolute src attributes.

export const mediaUrl = (relative) => (relative ? `${API_BASE_URL}${relative}` : null);

export const firstImageUrl = (product) =>
  mediaUrl(product?.media?.find((m) => m.type === "IMAGE")?.url);

// Builds the multipart body the backend expects: a JSON "product" part plus
// "images" (many) and "video" (one) file parts.
export function buildProductFormData(product, images = [], video = null) {
  const form = new FormData();
  form.append(
    "product",
    new Blob([JSON.stringify(product)], { type: "application/json" })
  );
  images.forEach((file) => form.append("images", file, file.name));
  if (video) form.append("video", video, video.name);
  return form;
}

export const marketplaceApi = apiSlice
  .enhanceEndpoints({ addTagTypes: ["Product", "Order"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      // Server-side rules (radius, order minimums, media limits, payment
      // methods) so the UI never hard-codes them.
      getMarketplaceRules: builder.query({
        query: () => "/api/f2home/marketplace/rules",
        keepUnusedDataFor: 3600,
      }),

      // Customer: listings within the radius of (lat, lng), nearest first.
      getNearbyProducts: builder.query({
        query: ({ lat, lng, category }) => ({
          url: "/api/f2home/products",
          params: { lat, lng, category: category || undefined },
        }),
        providesTags: (result = []) => [
          { type: "Product", id: "LIST" },
          ...result.map((p) => ({ type: "Product", id: p.id })),
        ],
      }),

      // Farmer / admin: every active listing (no radius).
      getAllProducts: builder.query({
        query: ({ category } = {}) => ({
          url: "/api/f2home/products",
          params: { category: category || undefined },
        }),
        providesTags: (result = []) => [
          { type: "Product", id: "LIST" },
          ...result.map((p) => ({ type: "Product", id: p.id })),
        ],
      }),

      // Cart page: the live rows for the ids in the cart.
      getProductsByIds: builder.query({
        query: (ids) => ({
          url: "/api/f2home/products",
          params: { ids: ids.join(",") },
        }),
        providesTags: (result = []) => result.map((p) => ({ type: "Product", id: p.id })),
      }),

      getMyProducts: builder.query({
        query: () => "/api/f2home/products/mine",
        providesTags: (result = []) => [
          { type: "Product", id: "MINE" },
          ...result.map((p) => ({ type: "Product", id: p.id })),
        ],
      }),

      getProduct: builder.query({
        query: (id) => `/api/f2home/products/${id}`,
        providesTags: (result, error, id) => [{ type: "Product", id }],
      }),

      createProduct: builder.mutation({
        query: (formData) => ({
          url: "/api/f2home/products",
          method: "POST",
          body: formData,
        }),
        invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "MINE" }],
      }),

      updateProduct: builder.mutation({
        query: ({ id, formData }) => ({
          url: `/api/f2home/products/${id}`,
          method: "PUT",
          body: formData,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: "Product", id },
          { type: "Product", id: "LIST" },
          { type: "Product", id: "MINE" },
        ],
      }),

      deleteProduct: builder.mutation({
        query: (id) => ({
          url: `/api/f2home/products/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (result, error, id) => [
          { type: "Product", id },
          { type: "Product", id: "LIST" },
          { type: "Product", id: "MINE" },
        ],
      }),

      placeOrder: builder.mutation({
        query: (body) => ({
          url: "/api/f2home/orders",
          method: "POST",
          body,
        }),
        // Stock changed, so every cached product list is stale.
        invalidatesTags: [{ type: "Order", id: "LIST" }, { type: "Product", id: "LIST" }],
      }),

      getMyOrders: builder.query({
        query: () => "/api/f2home/orders",
        providesTags: [{ type: "Order", id: "LIST" }],
      }),
    }),
  });

export const {
  useGetMarketplaceRulesQuery,
  useGetNearbyProductsQuery,
  useGetAllProductsQuery,
  useGetProductsByIdsQuery,
  useGetMyProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  usePlaceOrderMutation,
  useGetMyOrdersQuery,
} = marketplaceApi;
