import BackButton from "./BackButton";

// Compact page header used across the marketplace / farm / order pages:
// back control + icon + title + one-line subtitle on the left, optional
// actions on the right. Replaces the tall gradient banners so the content
// starts near the top of the screen.
export default function PageHeader({ icon: Icon, title, subtitle, actions, back = true, backFallback, children }) {
  return (
    <div className="mb-4">
      {back && <BackButton className="-ml-3 mb-1" fallback={backFallback} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f3dc] text-[#33691e]">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-[#2f3b2f] dark:text-white sm:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// Standard page wrapper: full-width up to 7xl with tight, consistent padding.
export function Page({ className = "", children }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5 ${className}`}>{children}</div>;
}

// Product grid: as many columns as the width allows, 4:3 tiles.
export const productGridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";
