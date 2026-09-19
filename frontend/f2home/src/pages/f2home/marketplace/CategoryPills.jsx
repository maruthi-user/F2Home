import { useNavigate } from "react-router-dom";
import { MARKETPLACE_CATEGORIES } from "@/config/marketplaceCategories";

// Horizontal, scrollable row of category chips with listing counts. Shown
// on the marketplace home and on every category page so switching
// categories never needs a trip back.
export default function CategoryPills({ counts = {}, activeId = null }) {
  const navigate = useNavigate();

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 py-1">
        <Pill
          active={activeId === null}
          onClick={() => navigate("/app/marketplace")}
          label="All"
          count={Object.values(counts).reduce((a, b) => a + b, 0)}
        />
        {MARKETPLACE_CATEGORIES.map(({ id, label, icon: Icon }) => (
          <Pill
            key={id}
            active={activeId === id}
            onClick={() => navigate(`/app/marketplace/${id}`)}
            label={label}
            icon={Icon}
            count={counts[id] || 0}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({ active, onClick, label, icon: Icon, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-[#33691e] bg-[#33691e] text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#8bc34a] hover:text-[#33691e] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
        {count}
      </span>
    </button>
  );
}
