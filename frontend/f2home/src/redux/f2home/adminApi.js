import { apiSlice, API_BASE_URL } from "../slices/apiSlice";

// Admin endpoints - farmer approval only for now. All hit
// /api/f2home/admin/** and are rejected by the backend for anyone but
// ROLE_ADMIN (see F2HomeSecurityConfiguration).

export const farmerPhotoUrl = (farmerId) => `${API_BASE_URL}/api/f2home/admin/farmers/${farmerId}/photo`;

export const adminApi = apiSlice
  .enhanceEndpoints({ addTagTypes: ["AdminFarmer"] })
  .injectEndpoints({
    endpoints: (builder) => ({
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
  useGetPendingFarmersQuery,
  useApproveFarmerMutation,
  useRejectFarmerMutation,
} = adminApi;
