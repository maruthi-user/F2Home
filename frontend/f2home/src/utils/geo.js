// Location helpers shared by the farmer product form (where a listing is),
// the customer marketplace (20 km radius filter) and checkout (delivery
// address). Pure functions + thin browser-API wrappers; no state.

// Customers only see listings within this distance of their own location.
export const NEARBY_RADIUS_KM = 20;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two {lat, lng} points, in km (haversine).
export function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const formatKm = (km) =>
  !Number.isFinite(km) ? "" : km < 1 ? "< 1 km" : `${km.toFixed(km < 10 ? 1 : 0)} km`;

export const isValidCoords = (loc) =>
  !!loc &&
  Number.isFinite(loc.lat) &&
  Number.isFinite(loc.lng) &&
  Math.abs(loc.lat) <= 90 &&
  Math.abs(loc.lng) <= 180;

// Wraps navigator.geolocation in a promise. Rejects with a readable message
// (permission denied / unavailable / timeout) so callers can show it as-is.
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages = {
          1: "Location permission was denied. Allow location access or enter it manually.",
          2: "Your location is currently unavailable. Try again or enter it manually.",
          3: "Finding your location took too long. Try again or enter it manually.",
        };
        reject(new Error(messages[err.code] || "Unable to get your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000, ...options }
    );
  });
}

// ---- Geocoding (best effort) -------------------------------------------
// Uses OpenStreetMap's public Nominatim service to turn coordinates into a
// readable place name and vice-versa. Every caller must cope with a null
// result (offline, rate-limited, nothing found): the app keeps working on
// raw coordinates / the typed place name.

const NOMINATIM = "https://nominatim.openstreetmap.org";

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// {lat, lng} -> "Locality, District, State" (or null).
export async function reverseGeocode({ lat, lng }) {
  const data = await fetchJson(
    `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
  );
  if (!data?.address) return null;

  const a = data.address;
  const parts = [
    a.village || a.town || a.suburb || a.city_district || a.city,
    a.county || a.state_district,
    a.state,
  ].filter(Boolean);
  // De-duplicate e.g. "Hyderabad, Hyderabad, Telangana".
  return [...new Set(parts)].join(", ") || data.display_name || null;
}

// "Place name" -> {lat, lng, label} for the best match (or null).
export async function forwardGeocode(query) {
  const q = (query || "").trim();
  if (!q) return null;

  const data = await fetchJson(
    `${NOMINATIM}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
  );
  const hit = data?.[0];
  if (!hit) return null;

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name?.split(",").slice(0, 3).join(",").trim() || q,
  };
}

export const formatCoords = ({ lat, lng }) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
