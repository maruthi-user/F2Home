export const statusLabels = {
  PLACED: "Awaiting farmer confirmation",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  DELIVERY_FAILED: "Delivery attempt failed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const closedLabels = {
  FARMER_REJECTED: "Rejected by farmer",
  ADMIN_CLOSED_DELIVERY: "Cancelled after failed delivery",
  CUSTOMER_CANCELLED: "Cancelled by you",
  RESPONSE_TIMEOUT: "Farmer response deadline passed",
};
export function orderStatusLabel(order) {
  return closedLabels[order.closureReason] || statusLabels[order.status] || order.status;
}
