import React from 'react';
import { useLayout } from '../../context/LayoutContext';
import { TopNav } from '../../components/layout/TopNav';
import { Sidebar } from '../../components/layout/Sidebar';
import { AppLauncher } from '../../components/layout/AppLauncher';
import { cn } from '../../lib/utils';
import { Link, useLocation } from "wouter";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import "./phone-layout.css";
import brandArtwork from "../../assets/images/login-hero.png";

export const AppShell = React.memo(function AppShell({ children }) {
  const { activeAppId, isSidebarExpanded } = useLayout();
  const [location] = useLocation();

  const role = useSelector((state) => state.auth?.user?.role);
  const isWelcome = location === "/app/welcome" || location === "/app/welcome/";
  const isCustomer = role === "CUSTOMER";
  const phoneWorkspace = !!role;
  const isShopping = isCustomer && /^\/app\/(marketplace|cart|checkout|orders)(\/|$)/.test(location);

  const hideSidebar =
    location === "/";

  const isHelpCenter =
    location === "/app/help-center" || location.startsWith("/app/help-center/");

  // Main content offset: hidden when no app is active and we are not in Help Center
  const hasSidebar = !hideSidebar && (!!activeAppId || isHelpCenter);

  // Calculate left margin based on sidebar state
  // hidden (0) / collapsed (4rem=16) / expanded (16rem=64)
  // Help Center uses a wider expanded sidebar (w-72 = 288px)
  const sidebarWidthClass = !hasSidebar
    ? "ml-0"
    : isSidebarExpanded
      ? isHelpCenter
        ? "sm:ml-72"
        : "sm:ml-55"
      : "sm:ml-16";
  const phoneBack = location === "/app/checkout" ? ["/app/cart", "Back to cart"]
    : /^\/app\/orders\/[^/]+/.test(location) ? ["/app/orders", "Back to orders"]
    : /^\/app\/farm\/marketplace\/[^/]+/.test(location) ? ["/app/farm/marketplace", "Back to listings"]
    : ["/app/welcome", "Back to modules"];
  return (
    <div className={cn("relative min-h-screen bg-[var(--background-white)] text-foreground font-sans selection:bg-primary/20 selection:text-primary",
      (phoneWorkspace || isShopping || isWelcome) && "phone-app",
      phoneWorkspace && "phone-workspace phone-module-shell", isWelcome && "phone-welcome-shell")}>
      {/* Brand watermark: the farmer artwork, very faint, fixed behind every
          page so the app feels like the login screen without hurting
          legibility. A white gradient fades it out towards the left where
          the sidebar and text sit. */}
      {!isShopping && <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={brandArtwork}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[88%_center] opacity-[0.14] saturate-[1.1] dark:opacity-[0.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--background-white)] via-[var(--background-white)]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background-white)]/60 via-transparent to-[var(--background-white)]/40" />
      </div>}

      <TopNav isShopping={isShopping} />
      {!hideSidebar && <Sidebar />}

      <main
        className={cn(
          "relative z-[1] pt-16 transition-all duration-300 ease-in-out min-h-screen",
          sidebarWidthClass,
          /^\/app\/admin\/users\/?$/.test(location) && "bg-background",
          isShopping && "bg-[#faf7ef] dark:bg-background"
        )}
      >
        <div className="container mx-auto max-w-full h-full">
          {phoneWorkspace && !isWelcome && (
            <Link href={phoneBack[0]} className="phone-only phone-module-back">
              <ArrowLeft aria-hidden size={18} /> {phoneBack[1]}
            </Link>
          )}
          {children}
        </div>
      </main>

      <AppLauncher />
    </div>
  );
})
