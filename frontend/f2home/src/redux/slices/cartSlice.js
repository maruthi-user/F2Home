import { createSlice, createSelector } from "@reduxjs/toolkit";

// Customer shopping cart. Holds only ids + quantities + a light product
// snapshot (name/price/unit) for the badge and totals; the cart page always
// re-reads the live product (images, current stock) from IndexedDB.
//
// Persisted to localStorage PER CUSTOMER (key includes the phone number) so
// two customers sharing a browser never see each other's cart, and a cart
// survives a refresh. It is small (no files), so localStorage is fine here.

// Checkout minimums. The backend is the source of truth (it rejects any
// order below them); the UI reads the live values from
// GET /api/f2home/marketplace/rules and only falls back to these defaults
// while that request is in flight.
export const MIN_ORDER_ITEMS = 5; // total units across all lines
export const MIN_ORDER_VALUE = 500; // rupees

const storageKey = (phone) => `f2home-cart:${phone || "anonymous"}`;

function load(phone) {
  try {
    const raw = localStorage.getItem(storageKey(phone));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(phone, items) {
  try {
    localStorage.setItem(storageKey(phone), JSON.stringify(items));
  } catch {
    // Quota / private mode: the in-memory cart still works for this session.
  }
}

const initialState = {
  owner: null, // customer phone the items belong to
  items: [], // [{ productId, name, price, unit, farmerName, quantity }]
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Called when the signed-in user changes (login/logout/refresh) so the
    // cart shown always belongs to the current customer.
    loadCartFor: (state, action) => {
      const phone = action.payload || null;
      state.owner = phone;
      state.items = phone ? load(phone) : [];
    },
    addToCart: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.productId === product.id);
      const max = Number(product.quantity) || 0;

      if (existing) {
        existing.quantity = Math.min(max, existing.quantity + quantity);
        // Keep the snapshot fresh in case the farmer edited the listing.
        existing.name = product.name;
        existing.price = Number(product.price);
        existing.unit = product.unit;
        existing.farmerName = product.farmerName;
      } else {
        state.items.push({
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          unit: product.unit,
          farmerName: product.farmerName,
          quantity: Math.min(max, quantity),
        });
      }
      save(state.owner, state.items);
    },
    setQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (!item) return;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.productId !== productId);
      } else {
        item.quantity = quantity;
      }
      save(state.owner, state.items);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      save(state.owner, state.items);
    },
    clearCart: (state) => {
      state.items = [];
      save(state.owner, state.items);
    },
  },
});

export const { loadCartFor, addToCart, setQuantity, removeFromCart, clearCart } =
  cartSlice.actions;

// ---- Selectors -----------------------------------------------------------

const selectItems = (state) => state.cart?.items || [];

export const selectCartItems = selectItems;

export const selectCartCount = createSelector(selectItems, (items) =>
  items.reduce((sum, i) => sum + i.quantity, 0)
);

export const selectCartTotal = createSelector(selectItems, (items) =>
  Number(items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2))
);

// Why checkout is blocked (null when the cart satisfies both minimums).
// `rules` is the marketplace rules response; pass undefined while loading.
export const makeSelectCheckoutBlocker = (rules) => {
  const minItems = rules?.minOrderItems ?? MIN_ORDER_ITEMS;
  const minValue = Number(rules?.minOrderValue ?? MIN_ORDER_VALUE);

  return createSelector([selectCartCount, selectCartTotal], (count, total) => {
    const reasons = [];
    if (count < minItems) {
      reasons.push(`add ${minItems - count} more item${minItems - count === 1 ? "" : "s"} (minimum ${minItems})`);
    }
    if (total < minValue) {
      reasons.push(`add ₹${(minValue - total).toFixed(0)} more (minimum ₹${minValue})`);
    }
    return reasons.length ? reasons.join(" and ") : null;
  });
};

export const selectCheckoutBlocker = makeSelectCheckoutBlocker(undefined);

export default cartSlice.reducer;
