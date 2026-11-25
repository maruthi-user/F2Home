import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Banknote, ChevronRight, Clock, ClipboardList, MapPin, ShieldCheck, ShoppingBasket, ShoppingCart, Sprout, TrendingUp, Truck, Users } from "lucide-react";
import { useGetLoginOptionsQuery } from "@/redux/f2home/authApi";
import { Card } from "@/components/ui/card";
import { ROLE_PERMISSIONS } from "@/utils/rolePermissionMap";
import { hasPermission } from "@/utils/permissions";

// Post-login landing. Marketplace/My Farm are live; Deliveries/Insights stay
// "Coming soon" - delivery runs and analytics aren't part of this phase.
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
    description: "Your product history, sales and earnings.",
    path: "/app/farm/history",
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
  {
    icon: ClipboardList,
    title: "Order Operations",
    description: "Find orders and resolve delivery or cash issues.",
    path: "/app/admin/orders",
    permission: "MANAGE_USERS",
  },
  {
    icon: ShieldCheck,
    title: "Farmer Approvals",
    description: "Review new farmers before their produce goes live.",
    path: "/app/admin/farmers",
    permission: "MANAGE_USERS",
  },
];

const phoneDestinations = {
  CUSTOMER: {
    label: "Your marketplace",
    links: [
      [ShoppingBasket, "Shop produce", "Find fresh produce from nearby farms.", "/app/marketplace"],
      [ClipboardList, "My orders", "Track deliveries and reorder favorites.", "/app/orders"],
      [ShoppingCart, "Cart", "Review items and checkout.", "/app/cart"],
    ],
  },
  FARMER: {
    label: "Your farm workspace",
    links: [
      [ShoppingBasket, "My listings", "Add products and manage what’s for sale.", "/app/farm/marketplace"],
      [ClipboardList, "Fulfillment", "Review orders and update deliveries.", "/app/farm/orders"],
      [Sprout, "My Farm", "See product history and sales.", "/app/farm/history"],
      [MapPin, "Delivery settings", "Set your delivery area and schedule.", "/app/farm/profile"],
    ],
  },
  ADMIN: {
    label: "Your admin workspace",
    links: [
      [ClipboardList, "Order operations", "Find orders and resolve delivery or item issues.", "/app/admin/orders"],
      [Banknote, "COD reconciliation", "Review cash collected and outstanding amounts.", "/app/admin/cod-reconciliation"],
      [ShieldCheck, "Farmer approvals", "Review farmer applications.", "/app/admin/farmers"],
      [ShoppingBasket, "Marketplace", "Browse the produce catalog.", "/app/marketplace"],
      [Sprout, "My Farm", "Open the farm workspace.", "/app/farm/history"],
    ],
  },
};

export default function Welcome() {
  const user = useSelector((state) => state.auth?.user || null);
  const navigate = useNavigate();
  const permissions = ROLE_PERMISSIONS[user?.role] || [];

  const { data: options } = useGetLoginOptionsQuery(undefined, { skip: user?.role !== "ADMIN" });
  const showUsers = user?.role === "ADMIN" && options?.usernameEnabled;
  const userManagement = { icon: Users, title: "User Management", description: "Manage test accounts.",
    path: "/app/admin/users", permission: "MANAGE_USERS" };
  const phoneHome = phoneDestinations[user?.role];
  const phoneLinks = showUsers
    ? [...phoneHome.links, [Users, userManagement.title, userManagement.description, userManagement.path]]
    : phoneHome?.links;
  const isFarmer = user?.role === "FARMER";
  const visibleCards = user?.role === "CUSTOMER"
    ? phoneLinks.map(([icon, title, description, path]) => ({ icon, title, description, path }))
    : (showUsers ? [...CARDS, userManagement] : CARDS).map((card) =>
    isFarmer && card.title === "Marketplace" ? { ...card, path: "/app/farm/marketplace" } : card
  ).filter(
    (card) => card.comingSoon || hasPermission(permissions, card.permission)
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      {phoneHome && (
        <div className="phone-only phone-welcome-hero">
          <p>{phoneHome.label}</p>
          <h1>Welcome{user?.fullName ? `, ${user.fullName}` : ""}!</h1>
        </div>
      )}
      <div className={`rounded-2xl bg-gradient-to-r from-[#f2f8ea] via-[#e3f0d3] to-[#c5e1a5] px-5 py-5 sm:px-6 ${phoneHome ? "phone-hide" : ""}`}>
        <h1 className="text-xl font-bold text-[#33691e] sm:text-2xl">
          Welcome{user?.fullName ? `, ${user.fullName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-[#2e7d32]">
          Bringing Nature Closer to You.
        </p>
      </div>

      {isFarmer && user?.status === "PENDING_APPROVAL" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Your account is being checked.</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-300">
              You can already add products from My Farm - they'll go live for customers as soon as
              an admin approves your farmer account.
            </p>
          </div>
        </div>
      )}

      {phoneHome && (
        <nav className="phone-only phone-welcome-links" aria-label={phoneHome.label}>
          {phoneLinks.map(([Icon, title, description, path], index) => (
            <Link key={path} to={path} className="phone-welcome-link">
              <span className="phone-welcome-icon"><Icon aria-hidden size={21} /></span>
              <span><strong>{title}</strong><span>{description}</span></span>
              {index === 0 ? <ArrowRight aria-hidden size={20} /> : <ChevronRight aria-hidden size={20} />}
            </Link>
          ))}
        </nav>
      )}

      <div className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${phoneHome ? "phone-hide" : ""}`}>
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
