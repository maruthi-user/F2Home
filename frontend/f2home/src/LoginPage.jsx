import React, { useState } from "react";
import { Lock, Eye, EyeOff, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLoginMutation } from "@/redux/f2home/authApi";
import { useNavigate } from "react-router-dom";
import { Link } from "wouter";
import F2HomeLogo from "./components/ui/F2HomeLogo";
import loginHeroImage from "./assets/images/login-hero.png";
import { useDispatch } from "react-redux";
import { setTokenData, setUserData } from "@/redux/slices/authSlice";
import { apiSlice } from "./redux/slices/apiSlice";
import { runWithProcessingLock } from "@/utils/processingLock";
import PhoneField from "./components/common/PhoneField";
import { toE164, fromE164 } from "@/utils/phone";

const REMEMBER_KEY = "f2home-remembered-phone";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  // Covers the whole login flow (login call, profile fetch, redirect) so the
  // UI stays visibly busy end-to-end on slow connections instead of only
  // during the login request itself.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [login] = useLoginMutation();

  const rememberedPhone = (() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) || "";
    } catch {
      return "";
    }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: fromE164(rememberedPhone),
      password: "",
      remember: !!rememberedPhone,
    },
  });

  const dispatch = useDispatch();

  const onSubmit = async (formData) => {
    setApiError("");
    setIsSubmitting(true);

    try {
      // The field holds the 10 local digits; the API gets +91XXXXXXXXXX.
      const phoneNumber = toE164(formData.phoneNumber);
      const loginRes = await login({ phoneNumber, password: formData.password }).unwrap();

      // "Remember me" only keeps the phone number pre-filled - never the password.
      try {
        if (formData.remember) localStorage.setItem(REMEMBER_KEY, phoneNumber);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // storage unavailable - nothing to remember
      }

      dispatch(
        setTokenData({
          token: loginRes.accessToken,
          expiresIn: loginRes.expiresIn,
          refreshToken: loginRes.refreshToken,
        })
      );

      const formattedUser = {
        fullName: loginRes.user?.fullName,
        phoneNumber: loginRes.user?.phoneNumber,
        email: loginRes.user?.email,
        role: loginRes.user?.role,
        status: loginRes.user?.status,
      };
      dispatch(setUserData(formattedUser));
      dispatch(apiSlice.util.resetApiState());

      // Left true on purpose: the spinner stays up until this page is
      // unmounted by the route change, so there's no gap before the
      // dashboard's own loading state (AppRouteFallback) takes over.
      navigate("/app/welcome");
    } catch (error) {
      console.error("Login error:", error);
      setApiError(
        error?.data?.message || error?.data || "Invalid phone number or password"
      );
      setIsSubmitting(false);
    }
  };

  const inputClass = (invalid) =>
    `w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 lg:py-3 outline-none transition placeholder:text-gray-400 focus:ring-2 ${
      invalid
        ? "border-red-400 focus:ring-red-200"
        : "border-gray-200 focus:border-[#7cb342] focus:ring-[#7cb342]/25"
    }`;

  return (
    // The brand artwork is the whole backdrop (logo, badges, tagline and the
    // farmer are all part of the image and stay fully visible on the left).
    // The login card is a frosted panel on the right, vertically centred
    // over the field - it never has to dodge the logo, so it looks the same
    // on a 13" laptop and a 27" monitor. On phones it is simply centred.
    <div className="fixed inset-0 z-[50] overflow-y-auto bg-[#f3f8ee]">
      <img
        src={loginHeroImage}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[30%_center] md:object-[left_center]"
      />
      {/* Slight darkening on the right so the white card reads against the
          bright sky/field no matter the crop. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-transparent md:from-black/20" />

      <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-6 md:items-end md:px-[6vw] lg:px-[7vw]">
        <div className="w-full max-w-[400px] rounded-2xl bg-white/[0.93] p-5 shadow-[0_24px_70px_-20px_rgba(20,40,15,0.6)] ring-1 ring-white/60 backdrop-blur-md sm:p-6 lg:max-w-[440px] lg:p-7">
          <h1 className="text-xl font-bold text-[#1f2a1f] lg:text-2xl">Welcome Back</h1>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">Login to your f2home account</p>

          <form
            onSubmit={handleSubmit((data) => runWithProcessingLock(() => onSubmit(data), "Signing in…"))}
            className="mt-4 space-y-3"
          >
            <PhoneField register={register} name="phoneNumber" error={errors.phoneNumber} placeholder="Mobile number" />

            <div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  {...register("password", { required: "Password is required" })}
                  className={`${inputClass(!!errors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  {...register("remember")}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-[#33691e]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate("/auth/forgot-password")}
                className="font-medium text-[#33691e] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {apiError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e7d32] py-2.5 text-sm font-semibold lg:py-3 text-white shadow-md shadow-[#2e7d32]/30 transition hover:bg-[#33691e] disabled:opacity-70"
            >
              {isSubmitting ? "Signing in…" : "Login"}
              {!isSubmitting && <span aria-hidden>→</span>}
            </button>
          </form>

          {/* Google sign-in is not wired to the backend yet; shown disabled so
              the layout is final and the button can be enabled later. */}
          {/* <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-500 opacity-70"
          >
            <GoogleMark />
            Continue with Google
            <span className="ml-1 rounded-full bg-gray-100 px-1.5 text-[10px] font-normal text-gray-500">soon</span>
          </button> */}

          <p className="mt-3 text-center text-xs text-gray-500">
            Don&rsquo;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-[#33691e] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-[50] bg-[#f7faf3] flex flex-col items-center justify-center gap-8">
          <div className="w-52 max-w-full px-6">
            <F2HomeLogo className="w-full h-auto" showTagline={false} />
          </div>
          <div className="flex items-center gap-2 text-sm text-[#3c3c3c]/60">
            <Loader className="h-5 w-5 animate-spin text-[#33691e]" />
            <span>Loading…</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Kept for when Google sign-in is wired up (see the commented button above).
/*
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12S6.6 21.8 12 21.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
*/
