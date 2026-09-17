import { Carrot, Apple, Wheat, Bean, PawPrint, Egg, Flame } from "lucide-react";

// Single source of truth for marketplace categories - used by the category
// page (label/icon lookup) and the product form's category picker. Mirrored
// as static entries in config/apps.json for the sidebar (plain JSON can't
// import this), so keep the two in sync by hand if a category is added.
export const MARKETPLACE_CATEGORIES = [
  { id: "vegetables", label: "Vegetables", icon: Carrot },
  { id: "fruits", label: "Fruits", icon: Apple },
  { id: "rice-grains", label: "Rice & Grains", icon: Wheat },
  { id: "dhals-pulses", label: "Dhals & Pulses", icon: Bean },
  { id: "sheep-livestock", label: "Sheep & Livestock", icon: PawPrint },
  { id: "dairy-poultry", label: "Dairy & Poultry", icon: Egg },
  { id: "spices-herbs", label: "Spices & Herbs", icon: Flame },
];

export const getCategoryById = (id) =>
  MARKETPLACE_CATEGORIES.find((category) => category.id === id) || null;

export const PRODUCT_UNITS = ["kg", "gram", "dozen", "litre", "piece"];
