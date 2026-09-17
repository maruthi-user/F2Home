import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Sprout,
  Truck,
  User,
  ShoppingBasket,
} from "lucide-react";
import AuthLayout from "./AuthLayout";
import SuccessScreen from "./SuccessScreen";
import {
  useRequestRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
} from "../../redux/f2home/authApi";
import { setTokenData, setUserData } from "@/redux/slices/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { runWithProcessingLock } from "@/utils/processingLock";

const ROLES = [
  {
    value: "CUSTOMER",
    label: "Customer",
    description: "Buy fresh produce directly from farmers",
    icon: ShoppingBasket,
  },
  {
    value: "FARMER",
    label: "Farmer",
    description: "Sell your harvest to customers directly",
    icon: Sprout,
  },
  {
    value: "DELIVERY_PARTNER",
    label: "Delivery Partner",
    description: "Deliver orders from farms to homes",
    icon: Truck,
  },
];

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

const STEP_STYLES = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold";

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [registration, setRegistration] = useState(null);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [requestRegisterOtp, { isLoading: isRequestingOtp }] =
    useRequestRegisterOtpMutation();
  const [verifyRegisterOtp, { isLoading: isVerifying }] =
    useVerifyRegisterOtpMutation();

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    defaultValues: {
      phoneNumber: "",
      role: "",
      otp: "",
      fullName: "",
      email: "",
      password: "",
    },
  });

  const password = watch("password") || "";
  const requirementChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
  const allRequirementsMet = requirementChecks.every((rule) => rule.passed);

  // Step 1: phone + role -> request an OTP.
  const onRequestOtp = async (data) => {
    setApiError("");
    try {
      const res = await requestRegisterOtp({
        phoneNumber: data.phoneNumber,
        role: data.role,
      }).unwrap();
      setRegistration({
        phoneNumber: data.phoneNumber,
        role: data.role,
        message: res?.message || "OTP sent.",
      });
      setStep(2);
    } catch (error) {
      setApiError(parseErrorMessage(error?.data) || "Unable to send the OTP. Please try again.");
    }
  };

  // Step 2: OTP + profile -> create the account (auto-login).
  const onVerifyAndCreate = async (data) => {
    setApiError("");
    try {
      const res = await verifyRegisterOtp({
        phoneNumber: registration.phoneNumber,
        otp: data.otp,
        fullName: data.fullName,
        email: data.email || undefined,
        password: data.password,
        role: registration.role,
      }).unwrap();

      dispatch(
        setTokenData({
          token: res.accessToken,
          expiresIn: res.expiresIn,
          refreshToken: res.refreshToken,
        })
      );
      dispatch(
        setUserData({
          fullName: res.user?.fullName,
          phoneNumber: res.user?.phoneNumber,
          email: res.user?.email,
          role: res.user?.role,
          status: res.user?.status,
        })
      );
      setRegistered(true);
    } catch (error) {
      setApiError(parseErrorMessage(error?.data) || "Unable to create your account. Please try again.");
    }
  };

  const goToStep = (target) => {
    if (target === 1) setRegistration(null);
    setApiError("");
    setStep(target);
  };

  if (registered) {
    return (
      <AuthLayout>
        <SuccessScreen
          icon={Check}
          title="Welcome to F2Home!"
          message={`Your account has been created successfully. You are signed in as ${getValues("fullName") || "a new member"}.`}
          note="Start exploring from your home dashboard."
          buttonLabel="Go to Dashboard"
          buttonHref="/app/welcome"
        />
      </AuthLayout>
    );
  }

  const selectedRole = ROLES.find((r) => r.value === getValues("role"));

  return (
    <AuthLayout>
      <h1 className="text-center text-4xl font-bold text-[#3c3c3c] mb-2">
        Create Account
      </h1>
      <p className="text-center text-gray-500 mb-6">
        Join F2Home — from farm to home.
      </p>

      {/* Stepper (same visual language as the rest of the auth pages) */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`${STEP_STYLES} ${
                step >= s
                  ? "bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white"
                  : "bg-[#ebebeb] text-gray-500"
              }`}
            >
              {s}
            </div>
            <span className={`text-sm ${step >= s ? "text-[#33691e] font-medium" : "text-gray-400"}`}>
              {s === 1 ? "Phone & Role" : "Verify OTP"}
            </span>
            {s === 1 && <ArrowRight className="h-4 w-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={handleSubmit((data) => runWithProcessingLock(() => onRequestOtp(data), "Sending OTP…"))} className="space-y-5">
          <div>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Phone Number (e.g. +919876543210)"
                autoComplete="tel"
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
              <p className="mt-2 text-sm text-red-500 ml-3">{errors.phoneNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            {ROLES.map(({ value, label, description, icon: Icon }) => (
              <label
                key={value}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition ${
                  watch("role") === value
                    ? "border-[#7cb342] bg-[#f2f8ea]"
                    : "border-gray-200 bg-white hover:border-[#c5e1a5]"
                }`}
              >
                <input type="radio" value={value} className="sr-only" {...register("role", { required: "Please choose a role" })} />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f8ea] text-[#33691e]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-[#3c3c3c]">{label}</span>
                  <span className="block text-xs text-gray-500">{description}</span>
                </span>
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    watch("role") === value ? "border-[#33691e] bg-[#8bc34a]" : "border-gray-300"
                  }`}
                />
              </label>
            ))}
            {errors.role && (
              <p className="text-sm text-red-500 ml-3">{errors.role.message}</p>
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
              disabled={isRequestingOtp}
              className="min-w-[180px] rounded-full px-10 py-3 font-semibold text-white bg-gradient-to-r from-[#8bc34a] to-[#33691e] shadow-md hover:scale-[1.02] transition disabled:opacity-70"
            >
              {isRequestingOtp ? "Sending OTP..." : "Send OTP"}
            </button>

            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Already have an account? Login
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit((data) => runWithProcessingLock(() => onVerifyAndCreate(data), "Creating your account…"))} className="space-y-5">
          <p className="text-center text-sm text-gray-500">
            We sent a 6-digit OTP to <span className="font-semibold text-[#3c3c3c]">{registration?.phoneNumber}</span>
            {selectedRole ? (
              <>
                {" "}for your <span className="font-semibold text-[#3c3c3c]">{selectedRole.label}</span> account
              </>
            ) : null}
            . It is valid for 10 minutes.
          </p>

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
              <p className="mt-2 text-sm text-red-500 ml-3">{errors.otp.message}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Full Name"
                autoComplete="name"
                {...register("fullName", {
                  required: "Full name is required",
                  maxLength: { value: 255, message: "Full name is too long" },
                })}
                className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-5 py-4 text-gray-700 outline-none border ${
                  errors.fullName
                    ? "border-red-500"
                    : "border-transparent focus:border-[#7cb342]"
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-2 text-sm text-red-500 ml-3">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="email"
                placeholder="Email (optional)"
                autoComplete="email"
                {...register("email", {
                  pattern: {
                    value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                    message: "Enter a valid email address",
                  },
                })}
                className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-5 py-4 text-gray-700 outline-none border ${
                  errors.email
                    ? "border-red-500"
                    : "border-transparent focus:border-[#7cb342]"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-500 ml-3">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                {...register("password", {
                  required: "Password is required",
                  validate: (value) =>
                    PASSWORD_RULES.every((rule) => rule.test(value)) ||
                    "Password does not meet all requirements",
                })}
                className={`w-full rounded-full bg-[#ebebeb] pl-14 pr-14 py-4 text-gray-700 outline-none border ${
                  errors.password
                    ? "border-red-500"
                    : "border-transparent focus:border-[#7cb342]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-500 ml-3">{errors.password.message}</p>
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

          {apiError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col items-center gap-4">
            <button
              type="submit"
              disabled={isVerifying || !allRequirementsMet}
              className="min-w-[220px] rounded-full px-10 py-3 font-semibold text-white bg-gradient-to-r from-[#8bc34a] to-[#33691e] shadow-md hover:scale-[1.02] transition disabled:opacity-70"
            >
              {isVerifying ? "Creating account..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => goToStep(1)}
              className="inline-flex items-center gap-2 text-sm hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Change phone number or role
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default RegisterPage;
