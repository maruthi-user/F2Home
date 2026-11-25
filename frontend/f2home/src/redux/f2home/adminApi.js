import { apiSlice, API_BASE_URL } from "../slices/apiSlice";

// Admin endpoints. All hit
// /api/f2home/admin/** and are rejected by the backend for anyone but
// ROLE_ADMIN (see F2HomeSecurityConfiguration).

export const farmerPhotoUrl = (farmerId) => `${API_BASE_URL}/api/f2home/admin/farmers/${farmerId}/photo`;

export const adminApi = apiSlice
  .enhanceEndpoints({ addTagTypes: ["AdminFarmer", "AdminOrder", "TestUser"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      listTestUsers: builder.query({
        query: (params) => ({ url: "/api/f2home/admin/users", params }),
        providesTags: ["TestUser"],
      }),
      getTestUser: builder.query({
        query: (id) => "/api/f2home/admin/users/" + id,
        providesTags: ["TestUser"],
      }),
      manageTestUser: builder.mutation({
        query: ({ id, action, body }) => ({
          url: "/api/f2home/admin/users" + (id ? "/" + id : "") + (action ? "/" + action : ""),
          method: !id || action === "password" ? "POST" : "PUT",
          body,
        }),
        invalidatesTags: (result, error) => error ? [] : ["TestUser", "AdminFarmer", { type: "Product", id: "LIST" }, { type: "Order", id: "ADDRESSES" }],
      }),
      getAdminItemReports: builder.query({
        query: (orderId) => "/api/f2home/admin/orders/" + orderId + "/reports",
        providesTags: (result, error, orderId) => [{ type: "AdminOrder", id: "REPORTS:" + orderId }],
      }),
      resolveItemReport: builder.mutation({
        query: ({ orderId, reportId, resolution }) => ({
          url: "/api/f2home/admin/orders/" + orderId + "/reports/" + reportId + "/resolve",
          method: "POST",
          body: { resolution },
        }),
        invalidatesTags: (result, error, { orderId }) => [
          { type: "AdminOrder", id: "REPORTS:" + orderId }, { type: "AdminOrder", id: "LIST" },
        ],
      }),
      getCodReconciliation: builder.query({
        query: (params) => ({ url: "/api/f2home/admin/cod-reconciliation", params }),
        providesTags: [{ type: "AdminOrder", id: "LIST" }],
      }),
      searchAdminOrders: builder.query({
        query: (params) => ({ url: "/api/f2home/admin/orders", params }),
        providesTags: [{ type: "AdminOrder", id: "LIST" }],
      }),
      getAdminOrder: builder.query({
        query: (id) => "/api/f2home/admin/orders/" + id,
        providesTags: (result, error, id) => [{ type: "AdminOrder", id }],
      }),
      resolveOrder: builder.mutation({
        query: ({ id, ...body }) => ({
          url: "/api/f2home/admin/orders/" + id + "/resolve",
          method: "POST",
          body,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: "AdminOrder", id: "LIST" }, { type: "AdminOrder", id },
        ],
      }),
      getPendingFarmers: builder.query({
        query: () => "/api/f2home/admin/farmers/pending",
        providesTags: (result = []) => [
          { type: "AdminFarmer", id: "PENDING" },
          ...result.map((f) => ({ type: "AdminFarmer", id: f.id })),
        ],
      }),

      approveFarmer: builder.mutation({
        query: (id) => ({ url: `/api/f2home/admin/farmers/${id}/approve`, method: "POST" }),
        invalidatesTags: (result, error, id) => [
          { type: "AdminFarmer", id: "PENDING" },
          { type: "AdminFarmer", id },
          { type: "Product", id: "LIST" },
        ],
      }),

      rejectFarmer: builder.mutation({
        query: (id) => ({ url: `/api/f2home/admin/farmers/${id}/reject`, method: "POST" }),
        invalidatesTags: (result, error, id) => [
          { type: "AdminFarmer", id: "PENDING" },
          { type: "AdminFarmer", id },
          { type: "Product", id: "LIST" },
        ],
      }),
    }),
  });

export const {
  useListTestUsersQuery,
  useGetTestUserQuery,
  useManageTestUserMutation,
  useGetAdminItemReportsQuery,
  useResolveItemReportMutation,
  useGetCodReconciliationQuery,
  useSearchAdminOrdersQuery,
  useGetAdminOrderQuery,
  useResolveOrderMutation,
  useGetPendingFarmersQuery,
  useApproveFarmerMutation,
  useRejectFarmerMutation,
} = adminApi;
