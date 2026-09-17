import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, MessageCircle, Phone } from "lucide-react";
import AuthLayout from "./AuthLayout";
import SuccessScreen from "./SuccessScreen";
import { useForgotPasswordMutation } from "../../redux/f2home/authApi";
import { runWithProcessingLock } from "@/utils/processingLock";

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

const ForgotPassword = () => {
  const [apiError, setApiError] = useState("");
  const [successPhoneNumber, setSuccessPhoneNumber] = useState("");

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { phoneNumber: "" },
  });

  const onSubmit = async (formData) => {
    setApiError("");

    try {
      await forgotPassword({ phoneNumber: formData.phoneNumber }).unwrap();
      setSuccessPhoneNumber(formData.phoneNumber);
    } catch (error) {
      setApiError(
        parseErrorMessage(error?.data) ||
          "Unable to send the OTP. Please try again."
      );
    }
  };

  if (successPhoneNumber) {
    return (
      <AuthLayout>
        <SuccessScreen
          icon={MessageCircle}
          title="OTP Sent"
          message={`If the number is registered, an OTP has been sent to ${successPhoneNumber}.`}
          note="The OTP is valid for 10 minutes."
          buttonLabel="Enter OTP"
          buttonHref={`/auth/restore-password?phone=${encodeURIComponent(successPhoneNumber)}`}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-4xl font-bold text-[#3c3c3c] mb-3">
        Forgot Password
      </h1>
      <p className="text-center text-gray-500 mb-10">
        Enter your phone number and we'll send you an OTP to reset your
        password.
      </p>

      <form onSubmit={handleSubmit((data) => runWithProcessingLock(() => onSubmit(data), "Sending OTP…"))} className="space-y-5">
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

        {apiError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col items-center gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="min-w-[160px] rounded-full px-10 py-3 font-semibold text-white bg-gradient-to-r from-[#8bc34a] to-[#33691e] shadow-md hover:scale-[1.02] transition disabled:opacity-70"
          >
            {isLoading ? "Sending..." : "Send OTP"}
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

export default ForgotPassword;
