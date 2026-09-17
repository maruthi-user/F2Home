import React from 'react';
import { useLayout } from '../../context/LayoutContext';
import { TopNav } from '../../components/layout/TopNav';
import { Sidebar } from '../../components/layout/Sidebar';
import { AppLauncher } from '../../components/layout/AppLauncher';
import { cn } from '../../lib/utils';
import { useLocation } from "wouter";

export const AppShell = React.memo(function AppShell({ children }) {
  const { activeAppId, isSidebarExpanded } = useLayout();
  const [location] = useLocation();

  const hideSidebar =
    location === "/" || location === "/app";

  const isHelpCenter =
    location === "/app/help-center" || location.startsWith("/app/help-center/");

  // Main content offset: hidden when no app is active and we are not in Help Center
  const hasSidebar = !!activeAppId || isHelpCenter;

  // Calculate left margin based on sidebar state
  // hidden (0) / collapsed (4rem=16) / expanded (16rem=64)
  // Help Center uses a wider expanded sidebar (w-72 = 288px)
  const sidebarWidthClass = !hasSidebar
    ? "ml-0"
    : isSidebarExpanded
      ? isHelpCenter
        ? "sm:ml-68 ml-8"
        : "sm:ml-51 ml-8"
      : "sm:ml-12 ml-15";
  //const sidebarWidthClass = isSidebarExpanded ? "ml-64" : "ml-16";
  return (
    <div className="min-h-screen bg-[var(--background-white)] text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      <TopNav />
      {!hideSidebar && <Sidebar />}

      <main
        className={cn(
          "pt-16 transition-all duration-300 ease-in-out min-h-screen",
          sidebarWidthClass
        )}
      >
        <div className="container mx-auto max-w-full h-full">
          {children}
        </div>
      </main>

      <AppLauncher />
    </div>
  );
})
