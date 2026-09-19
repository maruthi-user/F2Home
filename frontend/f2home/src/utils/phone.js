// Phone number helpers shared by the login / register / password forms.
//
// The forms show a fixed country code and the user types only the local
// 10-digit mobile number; the API receives the E.164 form the backend stores
// (e.g. "+919876543210"). The backend also normalises on its side, so a
// number sent with spaces or a leading 0 still works.

export const DEFAULT_COUNTRY_CODE = "+91";

// Indian mobiles are 10 digits starting 6-9.
export const LOCAL_MOBILE_PATTERN = /^[6-9]\d{9}$/;

// Keep only digits, drop a leading 0 / 91 that people habitually type.
export function toLocalDigits(value = "") {
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export const toE164 = (localDigits, countryCode = DEFAULT_COUNTRY_CODE) =>
  `${countryCode}${toLocalDigits(localDigits)}`;

// "+919876543210" -> "9876543210" (for pre-filling a remembered number).
export function fromE164(full = "", countryCode = DEFAULT_COUNTRY_CODE) {
  if (!full) return "";
  return full.startsWith(countryCode) ? full.slice(countryCode.length) : toLocalDigits(full);
}

// react-hook-form validation rules for the local-digits field.
export const localMobileRules = {
  required: "Mobile number is required",
  validate: (v) => LOCAL_MOBILE_PATTERN.test(toLocalDigits(v)) || "Enter a valid 10-digit mobile number",
};
