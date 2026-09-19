import { Phone } from "lucide-react";
import { DEFAULT_COUNTRY_CODE, toLocalDigits, localMobileRules } from "@/utils/phone";

// Mobile number input with a fixed country code chip. The registered field
// holds only the 10 local digits; callers convert with toE164() on submit.
//
//   <PhoneField register={register} name="phoneNumber" error={errors.phoneNumber} />
//
// `register` is react-hook-form's register; `variant="pill"` matches the
// rounded inputs on the register / password pages, the default matches the
// login card.
export default function PhoneField({
  register,
  name = "phoneNumber",
  error,
  variant = "default",
  placeholder = "10-digit mobile number",
  autoFocus = false,
  disabled = false,
  className = "",
}) {
  const { onChange, ...field } = register(name, localMobileRules);
  const pill = variant === "pill";

  return (
    <div className={className}>
      <div
        className={`flex items-stretch overflow-hidden border bg-white transition focus-within:ring-2 ${
          pill ? "rounded-full bg-[#eef3e6]" : "rounded-lg"
        } ${
          error
            ? "border-red-400 focus-within:ring-red-200"
            : `border-gray-200 focus-within:border-[#7cb342] focus-within:ring-[#7cb342]/25 ${pill ? "border-transparent" : ""}`
        }`}
      >
        <span
          className={`flex select-none items-center gap-1.5 border-r px-3 text-sm font-semibold text-[#2f3b2f] ${
            pill ? "border-[#d9e3c9] bg-[#e3ecd6] pl-4" : "border-gray-200 bg-gray-50"
          }`}
          aria-hidden
        >
          <Phone className="h-4 w-4 text-gray-400" />
          {DEFAULT_COUNTRY_CODE}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={`Mobile number (${DEFAULT_COUNTRY_CODE})`}
          {...field}
          onChange={(e) => {
            // Keep the field digits-only as the user types (also strips a
            // pasted "+91 " or leading 0).
            e.target.value = toLocalDigits(e.target.value);
            onChange(e);
          }}
          className={`min-w-0 flex-1 bg-transparent px-3 text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60 ${
            pill ? "py-4" : "py-2.5 text-sm lg:py-3"
          }`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
