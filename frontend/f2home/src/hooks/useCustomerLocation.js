import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getCurrentPosition,
  reverseGeocode,
  forwardGeocode,
  formatCoords,
  isValidCoords,
} from "@/utils/geo";

// The customer's shopping location: where the 20 km radius is measured
// from. Remembered per user in sessionStorage so it survives navigation
// (and a refresh within the tab) without prompting for GPS on every page.
//
// Returns { location, status, error, detectCurrent, setManual, setCoords, clear }
//   location: { lat, lng, label, source: "gps" | "manual" } | null
//   status:   "idle" | "locating" | "ready" | "error"

const storageKey = (phone) => `f2home-location:${phone || "anonymous"}`;

function read(phone) {
  try {
    const raw = sessionStorage.getItem(storageKey(phone));
    const loc = raw ? JSON.parse(raw) : null;
    return isValidCoords(loc) ? loc : null;
  } catch {
    return null;
  }
}

function write(phone, loc) {
  try {
    if (loc) sessionStorage.setItem(storageKey(phone), JSON.stringify(loc));
    else sessionStorage.removeItem(storageKey(phone));
  } catch {
    // ignore - in-memory state still works for this page
  }
}

export default function useCustomerLocation() {
  const user = useSelector((state) => state.auth?.user || null);
  const phone = user?.phoneNumber;

  const [location, setLocation] = useState(() => read(phone));
  const [status, setStatus] = useState(location ? "ready" : "idle");
  const [error, setError] = useState("");

  // User switched (logout/login as someone else) -> load their location.
  useEffect(() => {
    const stored = read(phone);
    setLocation(stored);
    setStatus(stored ? "ready" : "idle");
    setError("");
  }, [phone]);

  const commit = useCallback(
    (loc) => {
      write(phone, loc);
      setLocation(loc);
      setStatus(loc ? "ready" : "idle");
      setError("");
    },
    [phone]
  );

  // Browser geolocation, then a best-effort readable label.
  const detectCurrent = useCallback(async () => {
    setStatus("locating");
    setError("");
    try {
      const pos = await getCurrentPosition();
      const label = (await reverseGeocode(pos)) || `Current location (${formatCoords(pos)})`;
      commit({ lat: pos.lat, lng: pos.lng, label, source: "gps" });
      return true;
    } catch (err) {
      setStatus(location ? "ready" : "error");
      setError(err.message || "Unable to get your location.");
      return false;
    }
  }, [commit, location]);

  // Typed place name -> coordinates via geocoding.
  const setManual = useCallback(
    async (query) => {
      setStatus("locating");
      setError("");
      const hit = await forwardGeocode(query);
      if (!hit) {
        setStatus(location ? "ready" : "error");
        setError(`Couldn't find "${query}". Try a nearby town or city name.`);
        return false;
      }
      commit({ lat: hit.lat, lng: hit.lng, label: hit.label, source: "manual" });
      return true;
    },
    [commit, location]
  );

  // Raw coordinates typed by the user (fallback when geocoding is offline).
  const setCoords = useCallback(
    (lat, lng, label) => {
      const loc = { lat: Number(lat), lng: Number(lng) };
      if (!isValidCoords(loc)) {
        setError("Enter a valid latitude (-90..90) and longitude (-180..180).");
        return false;
      }
      commit({ ...loc, label: label || formatCoords(loc), source: "manual" });
      return true;
    },
    [commit]
  );

  const clear = useCallback(() => commit(null), [commit]);

  return { location, status, error, detectCurrent, setManual, setCoords, clear };
}
