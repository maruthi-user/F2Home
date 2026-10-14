import { Phone } from "lucide-react";
import { DEFAULT_COUNTRY_CODE, toLocalDigits, localMobileRules } from "@/utils/phone";

// Mobile number input with a fixed country code chip. The registered field
// holds only the 10 local digits; callers convert with toE164() on submit.
//
//   <PhoneField register={register} name="phoneNumber" error={errors.phoneNumber} />
//
// `register` is react-hook-form's register; `variant="pill"` matches the
// rounded inputs on the register / password pages, `variant="glass"` is the
// frosted field used on the login screen (translucent surface + blur, so it
// never renders on a transparent background over the hero photo), and the
// default matches the plain card inputs.
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
  const glass = variant === "glass";

  // One class group per variant/state, so background, border and focus ring
  // never fight each other. `glass` is a frosted surface: the translucency
  // lives on the field itself (backdrop blur + tint + a soft inset shadow),
  // which is what keeps it readable over the hero photo instead of looking
  // like a transparent hole.
  const surface = error
    ? pill
      ? "rounded-full border-red-400 bg-[#eef3e6] focus-within:ring-red-200"
      : glass
        ? "rounded-xl border-red-400/80 bg-red-50/75 shadow-[inset_0_1px_2px_rgba(120,20,20,0.08)] backdrop-blur-md focus-within:ring-red-200"
        : "rounded-lg border-red-400 focus-within:ring-red-200"
    : pill
      ? "rounded-full border-gray-200 border-transparent bg-[#eef3e6] focus-within:border-[#7cb342] focus-within:ring-[#7cb342]/25"
      : glass
        ? "rounded-xl border-black/10 bg-white/70 shadow-[inset_0_1px_2px_rgba(15,35,10,0.10)] backdrop-blur-md focus-within:border-[#7cb342] focus-within:bg-white/90 focus-within:shadow-none focus-within:ring-[#7cb342]/30"
        : "rounded-lg border-gray-200 bg-white focus-within:border-[#7cb342] focus-within:ring-[#7cb342]/25";

  const chip = pill
    ? "border-[#d9e3c9] bg-[#e3ecd6] pl-4"
    : glass
      ? "border-black/10 bg-white/60"
      : "border-gray-200 bg-gray-50";

  const inputSize = pill ? "py-4" : glass ? "py-3 text-base md:py-3 md:text-sm" : "py-2.5 text-sm lg:py-3";

  return (
    <div className={className}>
      <div
        className={`flex items-stretch overflow-hidden border transition focus-within:ring-2 ${surface}`}
      >
        <span
          className={`flex select-none items-center gap-1.5 border-r px-3 text-sm font-semibold text-[#2f3b2f] ${chip}`}
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
          className={`min-w-0 flex-1 bg-transparent px-3 text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60 ${inputSize}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
