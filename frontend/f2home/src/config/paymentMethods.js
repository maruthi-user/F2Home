import { Banknote, CreditCard, Smartphone } from "lucide-react";

// Presentation of the payment methods the backend knows (its PaymentMethod
// enum). Which ones are actually live comes from
// GET /api/f2home/marketplace/rules - `enabled` here is only the fallback
// used before that response arrives. Enabling Card / UPI later is a
// backend change (flag + gateway step); this list just needs the labels.
export const PAYMENT_METHODS = [
  {
    id: "COD",
    label: "Cash on Delivery",
    description: "Pay in cash when your order arrives.",
    icon: Banknote,
    enabled: true,
  },
  {
    id: "CARD",
    label: "Debit / Credit Card",
    description: "Coming soon.",
    icon: CreditCard,
    enabled: false,
  },
  {
    id: "UPI",
    label: "UPI / Online Payment",
    description: "Coming soon.",
    icon: Smartphone,
    enabled: false,
  },
];

export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS.find((m) => m.enabled)?.id || "COD";

export const getPaymentMethod = (id) => PAYMENT_METHODS.find((m) => m.id === id) || null;
