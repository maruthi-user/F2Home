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
  .enhanceEndpoints({ addTagTypes: ["Product", "Order", "Farm"] })
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
        query: ({ lat, lng, category, deliveryAware }) => ({
          url: "/api/f2home/products",
          params: { lat, lng, category: category || undefined, deliveryAware },
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

      // Farmer: every listing ever added (active / expired / deleted) with sales.
      getFarmHistory: builder.query({
        query: () => "/api/f2home/farm/history",
        providesTags: [{ type: "Farm", id: "HISTORY" }],
      }),

      // Farmer: their own farm pin + delivery radius/days.
      getFarmProfile: builder.query({
        query: () => "/api/f2home/farm/profile",
        providesTags: [{ type: "Farm", id: "PROFILE" }],
      }),

      updateFarmProfile: builder.mutation({
        query: (body) => ({ url: "/api/f2home/farm/profile", method: "PUT", body }),
        invalidatesTags: [{ type: "Farm", id: "PROFILE" }],
      }),

      // Farmer: order lines for their products (pending / accepted / rejected).
      getFarmOrders: builder.query({
        query: () => "/api/f2home/farm/orders",
        providesTags: [{ type: "Farm", id: "ORDERS" }],
      }),

      updateFulfillment: builder.mutation({
        query: ({ orderId, ...body }) => ({
          url: "/api/f2home/farm/orders/" + orderId + "/fulfillment",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Farm", id: "ORDERS" }, { type: "Order", id: "LIST" }],
      }),

      decideFarmOrder: builder.mutation({
        query: ({ itemId, orderId, accept }) => ({
          url: `/api/f2home/farm/orders/${orderId ?? itemId}/${accept ? "accept" : "reject"}${orderId ? "-order" : ""}`,
          method: "POST",
        }),
        // Rejecting returns stock; accepting changes sold / revenue.
        invalidatesTags: [
          { type: "Farm", id: "ORDERS" },
          { type: "Farm", id: "HISTORY" },
          { type: "Product", id: "MINE" },
          { type: "Product", id: "LIST" },
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
        invalidatesTags: [
          { type: "Product", id: "LIST" },
          { type: "Product", id: "MINE" },
          { type: "Farm", id: "HISTORY" },
        ],
      }),

      updateProduct: builder.mutation({
        query: ({ id, formData }) => ({
          url: `/api/f2home/products/${id}`,
          method: "PUT",
          body: formData,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: "Farm", id: "HISTORY" },
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
          { type: "Farm", id: "HISTORY" },
          { type: "Product", id },
          { type: "Product", id: "LIST" },
          { type: "Product", id: "MINE" },
        ],
      }),

      getCheckoutQuote: builder.mutation({
        query: (body) => ({
          url: "/api/f2home/orders/quote",
          method: "POST",
          body,
        }),
      }),

      placeOrder: builder.mutation({
        query: ({ body, attemptId }) => ({
          url: "/api/f2home/orders",
          method: "POST",
          headers: { "Idempotency-Key": attemptId },
          body,
        }),
        // Stock changed, so every cached product list is stale.
        invalidatesTags: [
          { type: "Order", id: "LIST" },
          { type: "Product", id: "LIST" },
          { type: "Farm", id: "HISTORY" },
        ],
      }),

      cancelOrder: builder.mutation({
        query: (id) => ({ url: "/api/f2home/orders/" + id + "/cancel", method: "POST" }),
        invalidatesTags: [
          { type: "Order", id: "LIST" },
          { type: "Product", id: "LIST" },
          { type: "Product", id: "MINE" },
          { type: "Farm", id: "ORDERS" },
        ],
      }),

      getOrder: builder.query({
        query: (id) => "/api/f2home/orders/" + encodeURIComponent(id),
        providesTags: [{ type: "Order", id: "LIST" }],
      }),

      getOrderUpdates: builder.query({
        query: () => "/api/f2home/orders/updates",
        providesTags: [{ type: "Order", id: "UPDATES" }],
      }),
      markOrderUpdatesRead: builder.mutation({
        query: (id) => ({ url: "/api/f2home/orders/updates" + (id == null ? "" : "/" + id) + "/read", method: "POST" }),
        invalidatesTags: [{ type: "Order", id: "UPDATES" }],
      }),
      getItemReports: builder.query({
        query: (orderId) => "/api/f2home/orders/" + orderId + "/reports",
        providesTags: (result, error, orderId) => [{ type: "Order", id: "REPORTS:" + orderId }],
      }),
      createItemReport: builder.mutation({
        query: ({ orderId, ...body }) => ({ url: "/api/f2home/orders/" + orderId + "/reports", method: "POST", body }),
        invalidatesTags: (result, error, { orderId }) => [{ type: "Order", id: "REPORTS:" + orderId }],
      }),

      getSavedAddresses: builder.query({
        query: () => "/api/f2home/orders/addresses",
        providesTags: [{ type: "Order", id: "ADDRESSES" }],
      }),
      saveDeliveryAddress: builder.mutation({
        query: (body) => ({ url: "/api/f2home/orders/addresses", method: "POST", body }),
        invalidatesTags: [{ type: "Order", id: "ADDRESSES" }],
      }),
      deleteSavedAddress: builder.mutation({
        query: (id) => ({ url: "/api/f2home/orders/addresses/" + id, method: "DELETE" }),
        invalidatesTags: [{ type: "Order", id: "ADDRESSES" }],
      }),
      getReorderPreview: builder.query({
        query: ({ orderId, addressId }) => ({
          url: "/api/f2home/orders/" + orderId + "/reorder",
          params: addressId ? { addressId } : undefined,
        }),
        keepUnusedDataFor: 0,
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
  useGetFarmHistoryQuery,
  useGetFarmProfileQuery,
  useUpdateFarmProfileMutation,
  useGetFarmOrdersQuery,
  useDecideFarmOrderMutation,
  useUpdateFulfillmentMutation,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCheckoutQuoteMutation,
  usePlaceOrderMutation,
  useGetOrderUpdatesQuery,
  useMarkOrderUpdatesReadMutation,
  useGetItemReportsQuery,
  useCreateItemReportMutation,
  useGetSavedAddressesQuery,
  useSaveDeliveryAddressMutation,
  useDeleteSavedAddressMutation,
  useGetReorderPreviewQuery,
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
} = marketplaceApi;
