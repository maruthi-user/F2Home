// F2HOME role -> permission map. Roles mirror the backend's F2HomeRole enum
// (CUSTOMER, FARMER, DELIVERY_PARTNER, ADMIN). Modules in config/apps.json can
// gate visibility with allowedRoles; Sidebar/TopNav derive permissions from
// this map.
export const ROLE_PERMISSIONS = {
  CUSTOMER: ["HOME_VIEW", "MARKETPLACE_VIEW", "CART_VIEW", "CHECKOUT", "PROFILE_VIEW"],

  FARMER: ["HOME_VIEW", "MARKETPLACE_VIEW", "MY_FARM_VIEW", "PROFILE_VIEW"],

  DELIVERY_PARTNER: ["HOME_VIEW", "DELIVERIES_VIEW", "PROFILE_VIEW"],

  ADMIN: [
    "HOME_VIEW",
    "MARKETPLACE_VIEW",
    "MY_FARM_VIEW",
    "DELIVERIES_VIEW",
    "PROFILE_VIEW",
    "MANAGE_USERS",
  ],
};
