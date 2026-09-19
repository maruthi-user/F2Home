import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Top-left "Back" control used by every marketplace / farm / order page.
// Goes to the previous history entry; when there is none (deep link or a
// hard refresh) it falls back to `fallback` so the user never gets stuck.
export default function BackButton({ fallback = "/app/welcome", label = "Back", className }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#33691e] hover:bg-[#f2f8ea] transition cursor-pointer",
        className
      )}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
