#!/usr/bin/env node
// ============================================================
// Gives listings a product photo through the real API (PUT
// /api/f2home/products/{id}), logging in as each farmer - the same
// validated path the farmer UI uses. No dependencies (Node 18+).
//
//   node seed-product-images.mjs [apiUrl] [--replace] [--placeholder]
//
//   default        : photos from Wikimedia Commons (free-licensed) for
//                    listings that have no image yet
//   --replace      : also replace listings that already have an image
//                    (videos are kept)
//   --placeholder  : skip the internet and use generated colour tiles
//
// Photos are looked up by a curated keyword per product name (falls back
// to the name itself, then to a generated tile if nothing is found). The
// Commons file name is stored as the media file name for attribution.
//
// Password for the seeded farmers: Test@123  (override: F2HOME_SEED_PASSWORD)
// ============================================================

import { deflateSync } from "node:zlib";

const args = process.argv.slice(2);
const API = (args.find((a) => !a.startsWith("--")) || "http://localhost:8081").replace(/\/$/, "");
const REPLACE = args.includes("--replace");
const PLACEHOLDER_ONLY = args.includes("--placeholder");
const PASSWORD = process.env.F2HOME_SEED_PASSWORD || "Test@123";
const UA = "F2Home-dev-seed/1.0 (local demo data loader)";

// Farmers seeded by seed-marketplace.sql (+ the two from create-user.sql).
const FARMER_PHONES = [
  ...Array.from({ length: 18 }, (_, i) => `+9191000000${String(i + 1).padStart(2, "0")}`),
  "+919000000001",
  "+919000000002",
];

// Product name -> Commons search keywords. Names not listed are searched as-is.
const KEYWORDS = {
  "Fresh Tomatoes": "ripe tomatoes", "Tomatoes": "ripe tomatoes", "Green Chillies": "green chili peppers",
  "Sona Masoori Rice": "white rice grains bowl", "Country Eggs": "brown chicken eggs", "Farm Eggs": "brown chicken eggs",
  "Curry Leaves": "curry leaves Murraya koenigii", "Toor Dal": "toor dal pigeon pea split",
  "Ladies Finger (Okra)": "okra pods", "Brinjal": "purple eggplant", "Banganapalli Mangoes": "ripe mango fruit",
  "Buffalo Milk": "glass of milk", "Coriander Bunch": "fresh coriander leaves", "Moong Dal": "moong dal yellow split",
  "Bananas (Chakkarakeli)": "bunch of bananas", "Papaya": "papaya fruit cut", "Drumsticks": "moringa drumstick vegetable",
  "BPT Rice": "white rice grains", "Country Chicken": "country chicken hen", "Turmeric Powder": "turmeric powder",
  "Bottle Gourd": "bottle gourd lauki", "Ridge Gourd": "ridge gourd luffa vegetable", "Guava": "guava fruit",
  "Black Gram (Urad)": "urad dal black gram", "Curd (Perugu)": "curd yogurt bowl", "Mint Leaves": "fresh mint leaves",
  "Red Chilli (Dry)": "dried red chillies", "Cotton-seed Cattle Feed": "cottonseed cake", "Nellore Sheep": "Nellore sheep",
  "Onions": "red onions", "Chana Dal": "chana dal split chickpea", "Groundnuts": "peanuts shelled",
  "Sweet Lime (Mosambi)": "sweet lime mosambi", "Pomegranate": "pomegranate fruit", "Cluster Beans": "cluster beans guar",
  "Jowar (Sorghum)": "sorghum grain", "Ghee": "ghee jar", "Tamarind": "tamarind pods",
  "Coconuts": "coconut fruit", "Tender Coconut": "tender coconut water", "Cashew Nuts": "cashew nuts",
  "Ponni Rice": "rice grains", "Duck Eggs": "duck eggs", "Spinach (Palak)": "spinach leaves",
  "Cabbage": "green cabbage", "Cauliflower": "cauliflower head", "Carrots": "carrots fresh",
  "Idli Rice": "parboiled rice", "Paneer": "paneer cubes", "Masoor Dal": "masoor dal red lentils",
  "Sapota (Chikoo)": "sapodilla chikoo fruit", "Watermelon": "watermelon", "Pumpkin": "pumpkin",
  "Broken Rice (Nooka)": "broken rice", "Goat (Live)": "goat farm", "Garlic": "garlic bulbs",
  "Nuzvid Rasalu Mangoes": "mango fruit ripe", "Jackfruit": "jackfruit", "Bitter Gourd": "bitter gourd karela",
  "Cashew Apple Jam": "jam jar", "Foxtail Millet": "foxtail millet grain", "Horse Gram": "horse gram Macrotyloma",
  "Oil Palm Fresh Fruit": "oil palm fruit bunch", "Sweet Corn": "sweet corn cob", "Green Peas": "green peas pod",
  "Swarna Rice": "rice grains", "Cow Milk": "milk bottle glass", "Black Pepper": "black peppercorns",
  "Prawns (Vannamei)": "raw prawns", "Rohu Fish": "rohu fish", "Cucumber": "cucumber vegetable",
  "Raw Banana": "green bananas raw", "Rock Salt": "sea salt crystals", "Green Gram (Whole)": "mung beans whole green",
  "Kakinada Kaja": "kakinada kaja sweet", "Pineapple": "pineapple fruit", "Elephant Yam": "elephant foot yam",
  "Ragi (Finger Millet)": "finger millet ragi", "Quail Eggs": "quail eggs", "Rajma (Kidney Beans)": "red kidney beans",
  "Custard Apple": "custard apple sugar apple", "Amla (Gooseberry)": "Indian gooseberry amla", "Beetroot": "beetroot",
  "Bamboo Rice": "bamboo rice", "Honey (Forest)": "honey jar", "Turkey Birds": "domestic turkey bird",
  "Warangal Chilli": "dried red chili peppers", "Sesame Seeds": "sesame seeds", "Maize (Corn Grain)": "maize kernels",
  "Sheep Manure": "compost manure", "Lemons": "lemons", "Green Beans (French)": "green beans",
  "Capsicum (Mixed)": "bell peppers red yellow green", "Strawberries": "strawberries", "Basil & Mint Box": "fresh basil leaves",
};

// ---- tiny PNG encoder (fallback placeholder) --------------------------------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
function makePng(size, hue) {
  const [r, g, b] = hslToRgb(hue, 0.55, 0.42), [r2, g2, b2] = hslToRgb(hue, 0.55, 0.62);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const band = Math.abs(x + y - size) < size * 0.18, strip = y > size * 0.82;
      const px = strip ? [r * 0.6, g * 0.6, b * 0.6] : band ? [r2, g2, b2] : [r, g, b];
      row[1 + x * 3] = px[0]; row[2 + x * 3] = px[1]; row[3 + x * 3] = px[2];
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}
const CATEGORY_HUE = { vegetables: 110, fruits: 28, "rice-grains": 45, "dhals-pulses": 20, "sheep-livestock": 0, "dairy-poultry": 200, "spices-herbs": 350 };
const hueFor = (p) => { let h = 0; for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) % 360; return ((CATEGORY_HUE[p.category] ?? 160) + (h % 40) - 20 + 360) % 360; };

// ---- Wikimedia Commons ---------------------------------------------------------

const photoCache = new Map(); // keyword -> {bytes, type, name} | null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Commons throttles anonymous clients: space requests out and back off on
// 429 / HTML error pages instead of giving up.
async function fetchJsonPolitely(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    const text = await res.text();
    if (res.ok && text.startsWith("{")) return JSON.parse(text);
    const wait = 4000 * 2 ** attempt;
    console.log(`    (commons ${res.status}, retrying in ${wait / 1000}s)`);
    await sleep(wait);
  }
  throw new Error("commons unavailable");
}

async function findPhoto(keyword) {
  if (photoCache.has(keyword)) return photoCache.get(keyword);
  let result = null;
  try {
    const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=8"
      + "&gsrsearch=" + encodeURIComponent("filetype:bitmap " + keyword)
      + "&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&format=json";
    await sleep(1200);
    const pages = Object.values((await fetchJsonPolitely(url)).query?.pages || {}).sort((a, b) => a.index - b.index);
    // Prefer real photos: JPEG, reasonably large, landscape-ish.
    const pick = pages.map((p) => ({ p, i: p.imageinfo?.[0] })).filter(({ i }) => i && /jpeg|png/.test(i.mime) && i.width >= 500)
      .sort((a, b) => (b.i.width >= b.i.height) - (a.i.width >= a.i.height))[0];
    if (pick) {
      await sleep(400);
      const img = await fetch(pick.i.thumburl, { headers: { "User-Agent": UA } });
      if (img.ok) {
        const bytes = Buffer.from(await img.arrayBuffer());
        if (bytes.length > 2000 && bytes.length <= 4 * 1024 * 1024) {
          result = { bytes, type: img.headers.get("content-type")?.split(";")[0] || pick.i.mime, name: pick.p.title.replace(/^File:/, "") };
        }
      }
    }
  } catch (e) {
    console.log(`    (commons lookup failed for "${keyword}": ${e.message})`);
  }
  photoCache.set(keyword, result);
  return result;
}

// ---- API helpers -------------------------------------------------------------

async function api(path, { method = "GET", token, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${json?.message || text}`);
  return json;
}

async function login(phoneNumber) {
  const r = await api("/api/f2home/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber, password: PASSWORD }) });
  return { token: r.accessToken, name: r.user?.fullName };
}

async function setImage(token, product) {
  const { id, name, category, description, price, unit, quantity, location, media } = product;
  let file;
  if (!PLACEHOLDER_ONLY) {
    const photo = await findPhoto(KEYWORDS[name] || name) || (KEYWORDS[name] ? await findPhoto(name) : null);
    if (photo) file = { blob: new Blob([photo.bytes], { type: photo.type }), name: photo.name, source: "commons" };
  }
  if (!file) file = { blob: new Blob([makePng(320, hueFor(product))], { type: "image/png" }), name: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, source: "placeholder" };

  const form = new FormData();
  form.append("product", new Blob([JSON.stringify({
    name, category, description, price, unit, quantity,
    location: { lat: location.lat, lng: location.lng, label: location.label },
    // keep videos; keep existing images only when not replacing
    keepMediaIds: media.filter((m) => m.type === "VIDEO" || !REPLACE).map((m) => m.id),
  })], { type: "application/json" }));
  form.append("images", file.blob, file.name);
  await api(`/api/f2home/products/${id}`, { method: "PUT", token, body: form });
  return file.source;
}

// ---- main ---------------------------------------------------------------------

let photos = 0, placeholders = 0, skipped = 0, failed = 0;
for (const phone of FARMER_PHONES) {
  let session;
  try { session = await login(phone); } catch (e) { console.log(`skip ${phone}: ${e.message}`); continue; }
  const products = await api("/api/f2home/products/mine", { token: session.token });
  for (const p of products) {
    if (!REPLACE && p.media.some((m) => m.type === "IMAGE")) { skipped++; continue; }
    try {
      const source = await setImage(session.token, p);
      source === "commons" ? photos++ : placeholders++;
      console.log(`  ${source === "commons" ? "📷" : "▩ "} ${session.name}: ${p.name}`);
    } catch (e) {
      failed++;
      console.log(`  ! ${session.name}: ${p.name} - ${e.message}`);
    }
  }
}
console.log(`\nphotos: ${photos}, placeholders: ${placeholders}, skipped (already had image): ${skipped}, failed: ${failed}`);
process.exit(failed ? 1 : 0);
