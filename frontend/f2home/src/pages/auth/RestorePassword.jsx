import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearch } from "wouter";
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Phone } from "lucide-react";
import AuthLayout from "./AuthLayout";
import SuccessScreen from "./SuccessScreen";
import { useResetPasswordMutation } from "../../redux/f2home/authApi";
import { runWithProcessingLock } from "@/utils/processingLock";

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: "Minimum 8 characters" },
  { test: (value) => /[A-Z]/.test(value), label: "One uppercase letter" },
  { test: (value) => /[a-z]/.test(value), label: "One lowercase letter" },
  { test: (value) => /[0-9]/.test(value), label: "One number" },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    label: "One special character",
  },
];

const parseErrorMessage = (data) => {
  if (!data) return "";
  if (typeof data === "string") {
    if (data.includes("Error:")) return data.replace("Error: ", "").trim();
    try {
      const parsed = JSON.parse(data);
      if (parsed?.message) return parsed.message;
    } catch {
      // not JSON, fall through
    }
    return data;
  }
  return data?.message || "";
};

const getErrorMessage = (error) => {
  let message = parseErrorMessage(error?.data);

  if (message.includes("expired")) {
    return "This OTP has expired. Please request a new one.";
  }

  if (message.includes("Passwords do not match")) {
    return "Passwords do not match.";
  }

  return message || "Unable to reset your password. Please try again.";
};

const RestorePassword = () => {
  const search = useSearch();
  // Phone number flows in from the Forgot Password success screen so the
  // user doesn't have to retype it.
  const initialPhone = new URLSearchParams(search).get("phone") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: initialPhone,
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const password = watch("newPassword") || "";

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const requirementChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const allRequirementsMet = requirementChecks.every((rule) => rule.passed);

  const onSubmit = async (formData) => {
    setApiError("");

    try {
      const res = await resetPassword({
        phoneNumber: formData.phoneNumber,
        otp: formData.otp,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      }).unwrap();

      setSuccessMessage(res?.message || "Password reset successfully.");
    } catch (error) {
      setApiError(getErrorMessage(error));
    }
  };

  if (successMessage) {
    return (
      <AuthLayout>
        <SuccessScreen
          title="Password Reset"
          message={successMessage}
          note="You can now sign in with your new password."
          buttonLabel="Back to Login"
          buttonHref="/auth/login"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-4xl font-bold text-[#3c3c3c] mb-3">
        Reset Password
      </h1>
      <p className="text-center text-gray-500 mb-10">
        Enter the OTP we sent you and choose a new password.
      </p>

      <form onSubmit={handleSubmit((data) => runWithProcessingLock(() => onSubmit(data), "Resetting password…"))} className="space-y-5">
        <div>
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
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
              className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-5 py-4 text-gray-700 outline-none border ${
                errors.phoneNumber
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
            <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="6-digit OTP"
              inputMode="numeric"
              maxLength={6}
              {...register("otp", {
                required: "OTP is required",
                pattern: {
                  value: /^\d{6}$/,
                  message: "OTP must be a 6-digit code",
                },
              })}
              className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-5 py-4 text-gray-700 outline-none border tracking-[0.3em] ${
                errors.otp
                  ? "border-red-500"
                  : "border-transparent focus:border-[#7cb342]"
              }`}
            />
          </div>
          {errors.otp && (
            <p className="mt-2 text-sm text-red-500 ml-3">
              {errors.otp.message}
            </p>
          )}
        </div>

        <div>
          <div className="relative">
            <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              autoComplete="new-password"
              {...register("newPassword", {
                required: "New password is required",
                validate: (value) =>
                  PASSWORD_RULES.every((rule) => rule.test(value)) ||
                  "Password does not meet all requirements",
              })}
              className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-14 py-4 text-gray-700 outline-none border ${
                errors.newPassword
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

          {errors.newPassword && (
            <p className="mt-2 text-sm text-red-500 ml-3">
              {errors.newPassword.message}
            </p>
          )}

          <div className="mt-3 space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 p-3">
            {requirementChecks.map((rule) => (
              <p
                key={rule.label}
                className={`flex items-center gap-2 text-sm ${
                  password && rule.passed ? "text-green-600" : "text-gray-500"
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-xs ${
                    password && rule.passed
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
                {rule.label}
              </p>
            ))}
          </div>
        </div>

        <div>
          <div className="relative">
            <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              autoComplete="new-password"
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) =>
                  value === password || "Passwords do not match.",
              })}
              className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-14 py-4 text-gray-700 outline-none border ${
                errors.confirmPassword
                  ? "border-red-500"
                  : "border-transparent focus:border-[#7cb342]"
              }`}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-500 ml-3">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {apiError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col items-center gap-4">
          <button
            type="submit"
            disabled={isLoading || !allRequirementsMet}
            className="min-w-[180px] rounded-full px-10 py-3 font-semibold text-white bg-gradient-to-r from-[#8bc34a] to-[#33691e] shadow-md hover:scale-[1.02] transition disabled:opacity-70"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RestorePassword;
