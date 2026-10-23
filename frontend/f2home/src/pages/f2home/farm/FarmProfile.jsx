import { useState } from "react";
import { Crosshair, Loader, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PageHeader, { Page } from "@/components/common/PageHeader";
import {
  useGetFarmProfileQuery,
  useGetMarketplaceRulesQuery,
  useUpdateFarmProfileMutation,
} from "@/redux/f2home/marketplaceApi";
import {
  getCurrentPosition,
  reverseGeocode,
  forwardGeocode,
  formatCoords,
  isValidCoords,
} from "@/utils/geo";

const fieldClass =
  "w-full rounded-2xl bg-[#eef3e6] px-4 py-3 text-gray-700 outline-none border border-transparent focus:border-[#7cb342]";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200";

const DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
];

// Farmer: where the farm is, how far they deliver, and which days. Hidden
// farmers (not yet approved, or with no radius set) fall back to the
// platform default on the backend - see FarmProfileService / ProductService.
export default function FarmProfile() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetFarmProfileQuery();
  const { data: rules } = useGetMarketplaceRulesQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateFarmProfileMutation();

  const maxRadiusKm = rules?.nearbyRadiusKm ?? 20;

  const [placeName, setPlaceName] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng } | null
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showCoords, setShowCoords] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [radiusKm, setRadiusKm] = useState("");
  const [days, setDays] = useState([]);

  // Pre-fill once the farmer's saved profile arrives. Adjusting state from a
  // query result while rendering (guarded so it only fires once per new
  // `profile` reference) - see https://react.dev/learn/you-might-not-need-an-effect.
  const [loadedProfile, setLoadedProfile] = useState(null);
  if (profile && profile !== loadedProfile) {
    setLoadedProfile(profile);
    setPlaceName(profile.locationLabel || "");
    setCoords(isValidCoords({ lat: profile.lat, lng: profile.lng }) ? { lat: profile.lat, lng: profile.lng } : null);
    setRadiusKm(profile.deliveryRadiusKm != null ? String(profile.deliveryRadiusKm) : "");
    setDays(profile.deliveryDays || []);
  }

  const toggleDay = (id) =>
    setDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError("");
    try {
      const pos = await getCurrentPosition();
      const next = { lat: pos.lat, lng: pos.lng };
      setCoords(next);
      const label = await reverseGeocode(next);
      setPlaceName(label || `Current location (${formatCoords(next)})`);
    } catch (err) {
      setLocationError(err.message || "Unable to get your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const applyManualCoords = () => {
    const next = { lat: Number(manualLat), lng: Number(manualLng) };
    if (!isValidCoords(next)) {
      setLocationError("Enter a valid latitude (-90..90) and longitude (-180..180).");
      return;
    }
    setCoords(next);
    setLocationError("");
    setShowCoords(false);
  };

  const handleSave = async () => {
    setLocationError("");
    let location = coords;

    if (!location) {
      if (!placeName.trim()) {
        setLocationError("Add your farm's location - use your current location or type the place name.");
        return;
      }
      const hit = await forwardGeocode(placeName.trim());
      if (!hit) {
        setLocationError(`Couldn't find "${placeName}". Use your current location, try a nearby town name, or enter coordinates.`);
        return;
      }
      location = { lat: hit.lat, lng: hit.lng };
    }

    const radius = Number(radiusKm);
    if (!radius || radius <= 0) {
      setLocationError("Enter how far you deliver (in km).");
      return;
    }
    if (radius > maxRadiusKm) {
      setLocationError(`Delivery radius cannot exceed ${maxRadiusKm} km.`);
      return;
    }
    if (days.length === 0) {
      setLocationError("Choose at least one delivery day.");
      return;
    }

    try {
      await updateProfile({
        lat: location.lat,
        lng: location.lng,
        locationLabel: placeName.trim() || formatCoords(location),
        deliveryRadiusKm: radius,
        deliveryDays: days,
      }).unwrap();
      setCoords(location);
      toast({ title: "Delivery settings saved", description: "Customers nearby will see your produce within your new radius." });
    } catch (err) {
      toast({
        title: "Couldn't save delivery settings",
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        icon={Truck}
        title="Delivery Settings"
        subtitle="Set your farm location and how far and when you deliver"
      />

      <div className="max-w-xl space-y-5">
        <div>
          <label className={labelClass}>Farm location</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#33691e]" />
              <input
                type="text"
                value={placeName}
                onChange={(e) => {
                  setPlaceName(e.target.value);
                  setCoords(null);
                }}
                placeholder="Village / town where your farm is"
                className={`${fieldClass} pl-11`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="shrink-0 rounded-2xl border-[#8bc34a] text-[#33691e] hover:bg-[#f2f8ea]"
              title="Use my current location"
            >
              {isLocating ? <Loader className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Current</span>
            </Button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {coords ? `Pinned at ${formatCoords(coords)}` : "Stand at your farm and tap Current, or type a nearby place name."}
            </span>
            <button
              type="button"
              onClick={() => setShowCoords((v) => !v)}
              className="text-[#33691e] underline-offset-2 hover:underline"
            >
              {showCoords ? "Hide coordinates" : "Enter coordinates"}
            </button>
          </div>
          {showCoords && (
            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className={fieldClass} />
              <input type="number" step="any" placeholder="Longitude" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className={fieldClass} />
              <Button type="button" onClick={applyManualCoords} className="rounded-2xl bg-[#33691e] text-white hover:opacity-90">Pin</Button>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Delivery radius (km)</label>
          <input
            type="number"
            min="1"
            max={maxRadiusKm}
            step="1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            placeholder={`Up to ${maxRadiusKm} km`}
            className={`${fieldClass} max-w-[160px]`}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Customers further than this will not see your produce. Maximum {maxRadiusKm} km.
          </p>
        </div>

        <div>
          <label className={labelClass}>Delivery days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  days.includes(d.id)
                    ? "border-[#33691e] bg-[#33691e] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#8bc34a] hover:text-[#33691e] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {locationError && <p className="text-sm text-red-500">{locationError}</p>}

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl bg-[#33691e] text-white hover:opacity-90"
        >
          {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save delivery settings
        </Button>
      </div>
    </Page>
  );
}
