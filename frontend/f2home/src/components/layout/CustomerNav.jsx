import { ClipboardList, ShoppingCart, Store } from "lucide-react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "wouter";
import { selectCartCount } from "@/redux/slices/cartSlice";

const links = [
  { label: "Marketplace", shortLabel: "Shop", path: "/app/marketplace", icon: Store },
  { label: "Orders", path: "/app/orders", icon: ClipboardList },
  { label: "Cart", path: "/app/cart", icon: ShoppingCart },
];

export function CustomerNav({ mobile = false }) {
  const [location] = useLocation();
  const cartCount = useSelector(selectCartCount);

  return (
    <nav aria-label="Shopping" className={mobile
      ? "fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-[#faf7ef] pb-[env(safe-area-inset-bottom)] dark:bg-background lg:hidden"
      : "hidden items-center gap-5 px-3 lg:flex"}>
      {links.map((link) => {
        const { label, shortLabel, path, icon: Icon } = link;
        const active = location === path || location.startsWith(path + "/") ||
          (path === "/app/cart" && location === "/app/checkout");
        return (
          <Link
            key={path}
            href={path}
            aria-current={active ? "page" : undefined}
            className={["flex min-h-12 items-center justify-center gap-1.5 border-b-2 px-2 font-medium",
              mobile ? "flex-col py-2 text-xs" : "text-sm",
              active ? "border-current text-[#245730] dark:text-green-300" : "border-transparent text-foreground hover:text-primary"].join(" ")}
          >
            {(mobile || label === "Cart") && <Icon aria-hidden size={19} />}
            <span>{mobile ? shortLabel || label : label}{label === "Cart" && cartCount > 0 && " (" + (cartCount > 99 ? "99+" : cartCount) + ")"}</span>
          </Link>
        );
      })}
    </nav>
  );
}
