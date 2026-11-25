import { Banknote, ClipboardList, ShieldCheck, Sprout, Tags, MapPin, Users } from "lucide-react";
import { useGetLoginOptionsQuery } from "@/redux/f2home/authApi";
import { Link } from "wouter";

const links = {
  FARMER: [
    ["Listings", "/app/farm/marketplace", Tags],
    ["Fulfillment", "/app/farm/orders", ClipboardList],
    ["My Farm", "/app/farm/history", Sprout],
    ["Delivery", "/app/farm/profile", MapPin],
  ],
  ADMIN: [
    ["Orders", "/app/admin/orders", ClipboardList],
    ["Reconciliation", "/app/admin/cod-reconciliation", Banknote],
    ["Approvals", "/app/admin/farmers", ShieldCheck],
  ],
};

export function PhoneAdminTabs({ active }) {
  return (
    <nav className="phone-only phone-admin-tabs" aria-label="COD administration">
      {links.ADMIN.slice(0, 2).map(([label, path]) => (
        <Link key={path} href={path} aria-current={active === path ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

export default function PhoneWorkspaceNav({ role, location }) {
  const { data: options } = useGetLoginOptionsQuery(undefined, { skip: role !== "ADMIN" });
  const destinations = role === "ADMIN" && options?.usernameEnabled
    ? [...links.ADMIN, ["Users", "/app/admin/users", Users]] : links[role];
  return (
    <nav className="phone-only phone-nav" aria-label={role === "FARMER" ? "Farm workspace" : "Admin workspace"}>
      {destinations.map(([label, path, Icon]) => (
        <Link key={path} href={path} aria-current={location === path || location.startsWith(path + "/") ? "page" : undefined}>
          <Icon aria-hidden size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
