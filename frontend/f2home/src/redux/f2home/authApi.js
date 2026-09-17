import { apiSlice } from "../slices/apiSlice";

// F2HOME auth endpoints. All URLs hit the backend's dedicated
// /api/f2home/auth/** security chain.
export const f2HomeAuthApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Registration step 1: request an OTP for the given phone number + role.
    requestRegisterOtp: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/register/request-otp",
        method: "POST",
        body: data,
      }),
    }),
    // Registration step 2: verify OTP + create the account. Returns the
    // access/refresh token pair, so the user is logged in immediately.
    verifyRegisterOtp: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/register/verify-otp",
        method: "POST",
        body: data,
      }),
    }),
    login: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/login",
        method: "POST",
        body: data,
      }),
    }),
    refresh: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/refresh",
        method: "POST",
        body: data,
      }),
    }),
    logout: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/logout",
        method: "POST",
        body: data,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: "/api/f2home/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useRequestRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = f2HomeAuthApi;