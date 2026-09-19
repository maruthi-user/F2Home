import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadCartFor } from "@/redux/slices/cartSlice";

// Keeps the cart bound to the signed-in customer: whenever the user changes
// (login, logout, session expiry, page refresh) the matching persisted cart
// is loaded. Non-customers get an empty cart. Renders nothing.
export default function CartOwnerSync() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user || null);
  const phone = user?.role === "CUSTOMER" ? user.phoneNumber : null;

  useEffect(() => {
    dispatch(loadCartFor(phone));
  }, [dispatch, phone]);

  return null;
}
