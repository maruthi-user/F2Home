import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, RotateCcw, Upload, X } from "lucide-react";

// Self-taken registration photo.
//
//  - Phone (Chrome/Edge/any mobile browser): the front camera opens as soon
//    as the role is chosen and the shutter fires BY ITSELF once the face has
//    been held steady in the frame - the picture can never be picked from the
//    gallery. If the camera can't start (permission denied, insecure origin),
//    the field falls back to the native capture input, i.e. the phone's own
//    camera app.
//  - Desktop (Chrome/Edge/Firefox/Safari): there is no phone camera to hold
//    up, so an image file may be uploaded instead.
//
//   <CapturePhotoField value={file} onChange={setFile} error={errors.photo} />

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SAMPLE_INTERVAL_MS = 350;
// ~1.4s of a steady frame trips the automatic shutter.
const STABLE_SAMPLES_NEEDED = 4;
const STABILITY_THRESHOLD = 6;
// Frames darker than this are "camera covered / not in frame", not a subject.
const MIN_MEAN_LUMINANCE = 25;
// Never shoot while the sensor is still warming up.
const MIN_LIVE_TIME_MS = 1200;
const MAX_CAPTURE_DIMENSION = 1280;
const GRID_W = 32;
const GRID_H = 24;

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini/i.test(navigator.userAgent);

const message = (error) => (typeof error === "string" ? error : error?.message) || "";

export default function CapturePhotoField({
  value,
  onChange,
  error,
  autoStart = true,
  disabled = false,
}) {
  const mobile = isMobileDevice();
  const [phase, setPhase] = useState(value ? "captured" : "idle"); // idle | live | captured
  const [hint, setHint] = useState("Position your face in the frame");
  const [cameraError, setCameraError] = useState("");
  const [cameraOff, setCameraOff] = useState(false);
  const [localError, setLocalError] = useState("");

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const sampleTimerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const prevGridRef = useRef(null);
  const stableRef = useRef(0);
  const startedAtRef = useRef(0);
  const capturingRef = useRef(false);
  const hintRef = useRef("");
  // Bumped whenever the camera is torn down, so a getUserMedia() that
  // resolves after that (StrictMode remount, quick navigation) is discarded.
  const sessionRef = useRef(0);

  // Object URL for the captured file; the previous one is revoked as soon as
  // the file changes (the cleanup below runs before the next one is created).
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  function stopCamera() {
    sessionRef.current += 1;
    if (sampleTimerRef.current) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    prevGridRef.current = null;
    stableRef.current = 0;
    capturingRef.current = false;
  }

  function readGrid() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    const canvas =
      gridCanvasRef.current || (gridCanvasRef.current = document.createElement("canvas"));
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, GRID_W, GRID_H);
    const { data } = ctx.getImageData(0, 0, GRID_W, GRID_H);
    const grid = new Float32Array(GRID_W * GRID_H);
    let sum = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grid[p] = lum;
      sum += lum;
    }
    return { grid, mean: sum / grid.length };
  }

  function setHintOnce(next) {
    if (hintRef.current !== next) {
      hintRef.current = next;
      setHint(next);
    }
  }

  async function capture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      capturingRef.current = false;
      return;
    }

    const ratio = Math.min(
      1,
      MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
    );
    const width = Math.round(video.videoWidth * ratio);
    const height = Math.round(video.videoHeight * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // Same mirroring as the live preview, so what the user saw is what we keep.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    capturingRef.current = false;
    if (!blob) {
      stopCamera();
      setCameraError("Could not take the photo automatically. Please upload one instead.");
      setPhase("idle");
      return;
    }

    stopCamera();
    setLocalError("");
    setPhase("captured");
    onChange(new File([blob], "photo.jpg", { type: "image/jpeg" }));
  }

  function sampleFrame() {
    if (!streamRef.current || capturingRef.current) return;
    if (Date.now() - startedAtRef.current < MIN_LIVE_TIME_MS) return;
    const frame = readGrid();
    if (!frame) return;

    if (frame.mean < MIN_MEAN_LUMINANCE) {
      prevGridRef.current = null;
      stableRef.current = 0;
      setHintOnce("Move into the light so your face is clearly visible");
      return;
    }

    const prev = prevGridRef.current;
    let diff = Number.POSITIVE_INFINITY;
    if (prev) {
      diff = 0;
      for (let i = 0; i < frame.grid.length; i++) {
        diff += Math.abs(frame.grid[i] - prev[i]);
      }
      diff /= frame.grid.length;
    }
    prevGridRef.current = frame.grid;
    stableRef.current = diff < STABILITY_THRESHOLD ? stableRef.current + 1 : 0;

    if (stableRef.current >= STABLE_SAMPLES_NEEDED) {
      setHintOnce("Perfect - taking your photo now");
      capture();
      return;
    }
    setHintOnce(
      diff < STABILITY_THRESHOLD ? "Hold still a moment…" : "Position your face in the frame"
    );
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available in this browser. Upload a photo instead.");
      setPhase("idle");
      return;
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      if (session !== sessionRef.current) {
        // Camera was torn down while the permission prompt was open.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      prevGridRef.current = null;
      stableRef.current = 0;
      startedAtRef.current = Date.now();
      setHintOnce("Position your face in the frame");
      setPhase("live");
      sampleTimerRef.current = setInterval(sampleFrame, SAMPLE_INTERVAL_MS);
    } catch {
      if (session !== sessionRef.current) return;
      setCameraError(
        "Camera access was blocked. Allow camera access or upload a photo instead."
      );
      setPhase("idle");
    }
  }

  // Auto-open the camera on phones the moment the field appears; always
  // release it when the field goes away. The camera start is deferred by a
  // tick so the video element is painted (and the permission prompt never
  // races this effect's cleanup).
  useEffect(() => {
    if (!(autoStart && mobile && !value && !cameraOff && !cameraError)) return undefined;
    const id = setTimeout(() => startCamera(), 0);
    return () => {
      clearTimeout(id);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopCamera(), []);

  function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Photo must be a JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError("Photo is over the 5MB limit. Please use a smaller photo.");
      return;
    }
    setLocalError("");
    stopCamera();
    setPhase("captured");
    onChange(file);
  }

  function resetPhoto() {
    setLocalError("");
    onChange(null);
    setPhase("idle");
    if (mobile && !cameraOff && !cameraError) {
      setTimeout(() => startCamera(), 0);
    } else if (mobile) {
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }

  const errorMessage = localError || message(error);

  if (value && phase === "captured") {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-2xl border border-[#c5e1a5] bg-[#f2f8ea]">
          <img
            src={previewUrl}
            alt="The photo you just took"
            className="h-52 w-full object-cover"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#33691e] shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Photo captured
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={resetPhoto}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#3c3c3c] hover:border-[#7cb342] disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {mobile && !cameraOff && !cameraError ? "Retake" : "Change photo"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setLocalError("");
              onChange(null);
              stopCamera();
              setPhase("idle");
            }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-500 hover:text-red-500 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            Remove
          </button>
        </div>
        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      </div>
    );
  }

  const cameraUsable = mobile && !cameraError && !cameraOff;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={mobile ? "user" : undefined}
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="hidden"
      />

      {cameraUsable ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
          <div className="relative">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-56 w-full bg-black object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
              <p className="text-center text-xs font-medium text-white">
                {phase === "live" ? hint : "Starting your camera…"}
              </p>
            </div>
            <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-white/50" />
          </div>
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
            <span className="text-xs text-gray-500">The photo is taken automatically.</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                stopCamera();
                setCameraOff(true);
                setPhase("idle");
                setTimeout(() => fileInputRef.current?.click(), 0);
              }}
              className="shrink-0 text-xs font-medium text-[#33691e] hover:underline"
            >
              Upload instead
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-[#f7f9f4] px-4 py-6 text-center transition hover:border-[#7cb342] disabled:opacity-60"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f8ea] text-[#33691e]">
            {mobile ? <Camera className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          </span>
          <span className="text-sm font-semibold text-[#3c3c3c]">
            {mobile ? "Take a photo" : "Upload your photo"}
          </span>
          <span className="text-xs text-gray-500">
            {mobile
              ? "Opens your camera - JPEG, PNG or WEBP, up to 5MB"
              : "Chrome / Edge / any browser - JPEG, PNG or WEBP, up to 5MB"}
          </span>
        </button>
      )}

      {cameraError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
    </div>
  );
}
