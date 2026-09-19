import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Sprout, ShoppingBasket, Truck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ROLE_PERMISSIONS } from "@/utils/rolePermissionMap";
import { hasPermission } from "@/utils/permissions";

// Post-login landing. Marketplace/My Farm are live; Deliveries/Insights stay
// "Coming soon" - Delivery Partner flows and analytics aren't part of this
// phase.
const CARDS = [
  {
    icon: ShoppingBasket,
    title: "Marketplace",
    description: "Browse fresh produce straight from the farm.",
    path: "/app/marketplace",
    permission: "MARKETPLACE_VIEW",
  },
  {
    icon: Sprout,
    title: "My Farm",
    description: "List your harvest and manage your listings.",
    path: "/app/farm/products",
    permission: "MY_FARM_VIEW",
  },
  {
    icon: Truck,
    title: "Deliveries",
    description: "Pick up delivery runs from farms to homes. Coming soon.",
    comingSoon: true,
  },
  {
    icon: TrendingUp,
    title: "Insights",
    description: "Track your orders, sales and earnings. Coming soon.",
    comingSoon: true,
  },
];

export default function Welcome() {
  const user = useSelector((state) => state.auth?.user || null);
  const navigate = useNavigate();
  const permissions = ROLE_PERMISSIONS[user?.role] || [];

  const visibleCards = CARDS.filter(
    (card) => card.comingSoon || hasPermission(permissions, card.permission)
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="rounded-2xl bg-gradient-to-r from-[#f2f8ea] via-[#e3f0d3] to-[#c5e1a5] px-5 py-5 sm:px-6">
        <h1 className="text-xl font-bold text-[#33691e] sm:text-2xl">
          Welcome{user?.fullName ? `, ${user.fullName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-[#2e7d32]">
          Bringing Nature Closer to You.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.map(({ icon: Icon, title, description, path, comingSoon }) => (
          <Card
            key={title}
            onClick={() => path && navigate(path)}
            className={`p-4 ${
              path ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" : "opacity-70"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f8ea] text-[#33691e]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
