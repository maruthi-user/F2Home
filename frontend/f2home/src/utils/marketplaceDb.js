import { v4 as uuidv4 } from "uuid";

// Marketplace product/order storage - IndexedDB, not the localStorage Web
// Storage API. localStorage has a hard ~5-10MB total quota per origin and
// only holds strings; a single product photo (let alone a video) would blow
// that quota and silently break the app. IndexedDB is still 100% local/
// browser-only (no backend involved) but supports much larger storage and
// stores File/Blob objects natively - no base64 conversion needed on either
// write or read.

const DB_NAME = "f2home-marketplace";
const DB_VERSION = 1;
const PRODUCTS_STORE = "products";
const ORDERS_STORE = "orders";

export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB per image
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB, optional, single video

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        const products = db.createObjectStore(PRODUCTS_STORE, { keyPath: "id" });
        products.createIndex("category", "category", { unique: false });
        products.createIndex("farmerPhone", "farmerPhone", { unique: false });
      }

      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const orders = db.createObjectStore(ORDERS_STORE, { keyPath: "id" });
        orders.createIndex("customerPhone", "customerPhone", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const result = await callback(store);

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  return result;
}

// ================= PRODUCTS =================

export function getAllProducts() {
  return withStore(PRODUCTS_STORE, "readonly", (store) =>
    requestToPromise(store.getAll())
  );
}

export function getProductsByCategory(category) {
  return withStore(PRODUCTS_STORE, "readonly", (store) =>
    requestToPromise(store.index("category").getAll(category))
  );
}

export function getProductsByFarmer(phoneNumber) {
  return withStore(PRODUCTS_STORE, "readonly", (store) =>
    requestToPromise(store.index("farmerPhone").getAll(phoneNumber))
  );
}

export function getProductById(id) {
  return withStore(PRODUCTS_STORE, "readonly", (store) =>
    requestToPromise(store.get(id))
  );
}

export async function addProduct(product) {
  const record = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...product,
  };

  await withStore(PRODUCTS_STORE, "readwrite", (store) =>
    requestToPromise(store.add(record))
  );

  return record;
}

export function updateProduct(id, patch) {
  return withStore(PRODUCTS_STORE, "readwrite", async (store) => {
    const existing = await requestToPromise(store.get(id));
    if (!existing) throw new Error("Product not found.");

    const updated = { ...existing, ...patch, id };
    await requestToPromise(store.put(updated));
    return updated;
  });
}

export function deleteProduct(id) {
  return withStore(PRODUCTS_STORE, "readwrite", (store) =>
    requestToPromise(store.delete(id))
  );
}

// Used by the buy flow: fails loudly if someone else bought the last units
// first, instead of silently going negative.
export function decrementProductQuantity(id, amount) {
  return withStore(PRODUCTS_STORE, "readwrite", async (store) => {
    const existing = await requestToPromise(store.get(id));
    if (!existing) throw new Error("Product not found.");
    if (existing.quantity < amount) {
      throw new Error("Not enough stock available.");
    }

    const updated = { ...existing, quantity: existing.quantity - amount };
    await requestToPromise(store.put(updated));
    return updated;
  });
}

// ================= ORDERS =================

export async function addOrder(order) {
  const record = {
    id: uuidv4(),
    purchasedAt: new Date().toISOString(),
    ...order,
  };

  await withStore(ORDERS_STORE, "readwrite", (store) =>
    requestToPromise(store.add(record))
  );

  return record;
}

export function getOrdersByCustomer(phoneNumber) {
  return withStore(ORDERS_STORE, "readonly", (store) =>
    requestToPromise(store.index("customerPhone").getAll(phoneNumber))
  );
}
