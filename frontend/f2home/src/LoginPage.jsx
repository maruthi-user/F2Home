import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, Linkedin, Globe, Instagram, Twitter, Loader } from "lucide-react";
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


export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  // Covers the whole login flow (login call, profile fetch, redirect) so the
  // UI stays visibly busy end-to-end on slow connections instead of only
  // during the login request itself.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [login] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
  });

  const dispatch = useDispatch();

  const onSubmit = async (formData) => {
    setApiError("");
    setIsSubmitting(true);

    try {
      const loginRes = await login(formData).unwrap();

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

  return (
    <div className="fixed inset-0 z-[50] min-h-screen bg-[#f7faf3] flex overflow-hidden ">
      {/* Left brand panel - hero banner (logo/tagline/badges already baked
          into the image), cropped from the left so the branding stays fully
          visible and only the photo's right edge is cropped by a narrower
          viewport. */}
      <div className="hidden md:flex relative w-1/2 items-center justify-center overflow-hidden">
        <img
          src={loginHeroImage}
          alt="F2Home — From Farm to Home. Bringing nature closer to you."
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="md:hidden flex justify-center mb-8">
            <div className="w-44">
              <F2HomeLogo className="w-full h-auto" showTagline={false} />
            </div>
          </div>

          <h1 className="text-center text-4xl font-bold text-[#3c3c3c] mb-10">
            Sign In
          </h1>

          <form onSubmit={handleSubmit((data) => runWithProcessingLock(() => onSubmit(data), "Signing in…"))} className="space-y-5">
            <div>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Phone Number (e.g. +919876543210)"
                  autoComplete="username"
                  {...register("phoneNumber", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^\+[1-9]\d{7,14}$/,
                      message: "Enter a valid phone number with country code, e.g. +919876543210",
                    },
                  })}
                  className={`w-full rounded-full bg-[#eef3e6] pl-14 pr-5 py-4 text-gray-700 outline-none border ${errors.phoneNumber
                      ? "border-red-500"
                      : "border-transparent focus:border-[#7cb342]"
                    }`}
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-2 text-sm text-red-500 ml-3">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                  className={`w-full rounded-full bg-[#eef3e6] pl-14 pr-14 py-4 text-gray-700 outline-none border ${errors.password
                      ? "border-red-500"
                      : "border-transparent focus:border-[#7cb342]"
                    }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="mt-2 text-sm text-red-500 ml-3">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/auth/register"
                className="pl-2 text-sm text-black hover:underline"
              >
                New here?{" "}
                <span className="font-bold text-black hover:underline">
                  Register
                </span>
              </Link>
              <button
                type="button"
                onClick={() => navigate("/auth/forgot-password")}
                className="text-sm text-black hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {apiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <div className="pt-2 flex flex-col items-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full px-10 py-3 font-semibold text-white bg-gradient-to-r from-[#8bc34a] to-[#33691e] shadow-md hover:scale-[1.02] transition disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    Logging in...
                  </>
                ) : (
                  "LOGIN"
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-black text-lg mb-6">Follow us on social platforms</p>

            <div className="flex justify-center gap-5">
              {[
                { Icon: Linkedin, href: "https://www.linkedin.com/company/f2home" },
                { Icon: Globe, href: "https://f2home.com" },
                { Icon: Instagram, href: "https://www.instagram.com/f2home" },
                { Icon: Twitter, href: "https://twitter.com/f2home" },
              ].map(({ Icon, href }, index) => (
                <a
                  key={index}
                  type="button"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-12 rounded-full border border-gray-600 flex items-center justify-center text-gray-700 hover:bg-white transition cursor-pointer"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="mt-6 text-sm text-gray-500">
              © {new Date().getFullYear()}{" "}
              <a
                href="https://f2home.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2e7d32] font-semibold hover:underline"
              >
                f2home.com
              </a>{" "}
              — From Farm to Home
            </p>
          </div>
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