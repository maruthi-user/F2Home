import { useState } from "react";
import { Crosshair, Loader, MapPin, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NEARBY_RADIUS_KM } from "@/utils/geo";

const fieldClass =
  "w-full rounded-2xl bg-[#eef3e6] px-4 py-3 text-gray-700 outline-none border border-transparent focus:border-[#7cb342]";

// Customer-only strip above the marketplace: says where the 20 km radius is
// centred and lets the customer change it (GPS, place name, or raw
// coordinates when geocoding is unreachable). Driven entirely by
// hooks/useCustomerLocation.js.
export default function LocationBar({ loc }) {
  const { location, status, error, detectCurrent, setManual, setCoords } = loc;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [showCoords, setShowCoords] = useState(false);

  const locating = status === "locating";

  const handleUseCurrent = async () => {
    if (await detectCurrent()) setOpen(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (await setManual(query)) setOpen(false);
  };

  const handleCoords = (e) => {
    e.preventDefault();
    if (setCoords(lat, lng)) setOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#d9eebf] bg-[#f7faf3] px-3 py-2 text-sm dark:bg-gray-900">
        <MapPin className="h-4 w-4 shrink-0 text-[#33691e]" />
        {location ? (
          <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">
            Showing produce within <strong>{NEARBY_RADIUS_KM} km</strong> of{" "}
            <strong className="text-[#33691e]">{location.label}</strong>
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-gray-700 dark:text-gray-200">
            Set your location to see produce within {NEARBY_RADIUS_KM} km of you.
          </span>
        )}

        {!location && (
          <Button
            type="button"
            size="sm"
            onClick={handleUseCurrent}
            disabled={locating}
            className="rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
          >
            {locating ? <Loader className="mr-1.5 h-4 w-4 animate-spin" /> : <Crosshair className="mr-1.5 h-4 w-4" />}
            Use current location
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-full"
        >
          {location ? "Change" : "Enter manually"}
        </Button>
      </div>

      {error && !open && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#33691e]">
              <MapPin className="h-5 w-5" /> Your location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <Button
              type="button"
              onClick={handleUseCurrent}
              disabled={locating}
              className="w-full rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] text-white hover:opacity-90"
            >
              {locating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
              Use my current location
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              or enter a place
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Town, city or area (e.g. Guntur)"
                className={fieldClass}
              />
              <Button type="submit" disabled={locating || !query.trim()} className="rounded-2xl bg-[#33691e] text-white hover:opacity-90">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setShowCoords((v) => !v)}
              className="text-xs text-[#33691e] underline-offset-2 hover:underline"
            >
              {showCoords ? "Hide coordinates" : "Enter coordinates instead"}
            </button>

            {showCoords && (
              <form onSubmit={handleCoords} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input type="number" step="any" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className={fieldClass} />
                <input type="number" step="any" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className={fieldClass} />
                <Button type="submit" className="rounded-2xl bg-[#33691e] text-white hover:opacity-90">Set</Button>
              </form>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
