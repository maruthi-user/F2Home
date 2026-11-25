import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetProductsByIdsQuery } from "@/redux/f2home/marketplaceApi";
import { fillMissingFarmIds, loadCartFor, selectCartItems } from "@/redux/slices/cartSlice";

// Keeps the cart bound to the signed-in customer: whenever the user changes
// (login, logout, session expiry, page refresh) the matching persisted cart
// is loaded. Non-customers get an empty cart. Renders nothing.
export default function CartOwnerSync() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user || null);
  const phone = user?.role === "CUSTOMER" ? user.phoneNumber : null;

  const owner = useSelector((state) => state.cart.owner);
  const items = useSelector(selectCartItems);
  const missingIds = items.filter((item) => item.farmerId == null).map((item) => item.productId);
  const { currentData } = useGetProductsByIdsQuery(missingIds, {
    skip: !phone || owner !== phone || !missingIds.length,
  });

  useEffect(() => {
    dispatch(loadCartFor(phone));
  }, [dispatch, phone]);

  useEffect(() => {
    if (currentData?.length && owner === phone) {
      dispatch(fillMissingFarmIds({ owner, products: currentData }));
    }
  }, [currentData, dispatch, owner, phone]);

  return null;
}
