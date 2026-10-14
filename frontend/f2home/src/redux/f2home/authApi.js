import { apiSlice } from "../slices/apiSlice";

// Registration step 1 body: multipart "registration" (JSON: phone, name,
// village, role) plus "photo" - the picture the user just took. The backend
// parks it as a draft until the OTP is verified.
export function buildRegisterFormData({ phoneNumber, fullName, village, role, photo }) {
  const form = new FormData();
  form.append(
    "registration",
    new Blob([JSON.stringify({ phoneNumber, fullName, village, role })], {
      type: "application/json",
    }),
    "registration.json"
  );
  form.append("photo", photo, photo.name || "photo.jpg");
  return form;
}

// F2HOME auth endpoints. All URLs hit the backend's dedicated
// /api/f2home/auth/** security chain.
export const f2HomeAuthApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Registration step 1: park the profile + photo and send the OTP.
    // Accepts the FormData built by buildRegisterFormData().
    requestRegisterOtp: builder.mutation({
      query: (formData) => ({
        url: "/api/f2home/auth/register/request-otp",
        method: "POST",
        body: formData,
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