import { useState, useEffect } from 'react';
import { useLayout } from '../../context/LayoutContext';
import { cn } from '../../lib/utils';
import {
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../../components/ui/dropdown-menu";

import * as Icons from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSelector } from "react-redux";
import { hasPermission } from "@/utils/permissions";
import { ROLE_PERMISSIONS } from "@/utils/rolePermissionMap";


export function Sidebar() {
  const { activeApp, isSidebarExpanded, toggleSidebar, activeAppId } = useLayout();
  const user = useSelector(
    (state) => state.auth?.user || null
  );
  const [location] = useLocation();

  const isHelpCenter =
    location === "/app/help-center" || location.startsWith("/app/help-center/");

  const permissions =
    ROLE_PERMISSIONS[user?.role] || [];

  // If no app selected, sidebar is hidden (help center still shows its nav)
  if (!activeAppId && !isHelpCenter) return null;
  if (!isHelpCenter && !activeApp) return null;

  // console.log(activeApp.modules);



  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 border-r border-border bg-card transition-[width] duration-300 ease-in-out z-40 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
        isSidebarExpanded
          ? isHelpCenter
            ? "w-72"
            : "w-55"
          : "w-16"
      )}
    >
      {/* Sidebar Toggle Button (Absolute on border) */}
      {/* <div className="absolute -right-3 top-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="h-6 w-6 rounded-full border-border shadow-sm bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer p-0 flex items-center justify-center"
        >
          {isSidebarExpanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </div> */}

      {/* Header - App Name */}
      <div
        className={cn(
          "h-14 border-b border-border/50 flex items-center transition-all duration-300",
          isSidebarExpanded
            ? "justify-start px-4"
            : "justify-center px-2"
        )}
      >
        {isSidebarExpanded ? (
          <div className="flex flex-col overflow-hidden">
            <span
              className="
          font-semibold
          text-[clamp(14px,1.2vw,16px)]
          text-foreground
          truncate
        "
            >
              {isHelpCenter ? "Help Center" : activeApp?.name}
            </span>

            <span
              className="
          text-[11px]
          text-muted-foreground
          truncate
        "
            >
              {isHelpCenter ? "Documentation" : "Workspace"}
            </span>
          </div>
        ) : (
          <div
            className="
        flex
        items-center
        justify-center
        whitespace-nowrap
        rounded-md
        bg-primary/10
        text-primary
        font-bold
        leading-none
        h-8
        min-w-10
        px-2
        text-[clamp(10px,2vw,13px)]
        tracking-wide
      "
          >
            {isHelpCenter ? "H" : (activeApp?.shortName || activeApp?.name)}
          </div>
        )}
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-border">
        <nav className="space-y-1 px-2">
          {isHelpCenter ? (
            <div className="px-4 text-sm text-muted-foreground">Help Center</div>
          ) : (
            activeApp.modules
              .filter((module) => {

              /* ================= ROLE BASED ================= */
              if (module.allowedRoles?.length > 0) {
                return module.allowedRoles.includes(
                  user?.role
                );
              }
              /* ================= USERS ================= */
              if (module.path === "/app/hr/people") {
                return hasPermission(
                  permissions,
                  "ALL_PROFILES"
                );
              }
              /* ================= HR DASHBOARD ================= */
              if (module.path === "/app/hr/dashboard") {
                return hasPermission(
                  permissions,
                  "VIEW_HR_DASHBOARD"
                );
              }
              /* ================= DSR ================= */
              if (module.path === "/app/f2home/dsr") {
                return hasPermission(permissions, "DSR_VIEW");
              }
              return true;
            }).map((module) => (
              <SidebarItem
                key={module.id}
                item={module}
                expanded={isSidebarExpanded}
              />
            ))
          )}
        </nav>
      </div>



      {/* Bottom Collapse Button */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          className={cn(
            "w-full h-10 flex items-center rounded-md hover:text-foreground hover:bg-muted/100",
            isSidebarExpanded
              ? "justify-between px-3"
              : "justify-center px-0"
          )}
        >
          <div className="flex items-center gap-2">
            {isSidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}

            {isSidebarExpanded && (
              <span className="text-[clamp(10px,2vw,13px)]">
                Collapse
              </span>
            )}
          </div>
        </Button>
      </div>

    </aside>
  );
}

function SidebarItem({ item, expanded }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { toggleSidebar } = useLayout();


  const hasSubmodules = item.submodules && item.submodules.length > 0;
  const isPathActive = (path) => {
    if (!path) return false;
    // HR Dashboard should only match exactly
    if (path === "/app/hr/dashboard") {
      return location === "/app/hr/dashboard";
    }
    return location === path;
  };

  const isActive =
    isPathActive(item.path) ||
    (hasSubmodules &&
      item.submodules.some((sub) => isPathActive(sub.path)));

  useEffect(() => {
    if (!hasSubmodules) return;

    const shouldOpen = item.submodules.some(
      (sub) => sub.path && location.startsWith(sub.path)
    );

    setIsOpen(shouldOpen);
  }, [location]);


  // Close sidebar on mobile when navigating
  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const IconComponent = Icons[item.icon] || Icons.FileText;
  if (!expanded) {

    // Collapsed State - Icon Only with Tooltip
    if (window.innerWidth < 768 && hasSubmodules) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-10 p-0  flex items-center justify-center rounded-md",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <IconComponent className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start" className="w-44">
            {item.submodules.map((sub) => {
              const isSubActive = isPathActive(sub.path);

              return (
                <DropdownMenuItem key={sub.id} asChild>
                  <Link
                    href={sub.path || "#"}
                    className={cn(
                      "cursor-pointer",
                      isSubActive && "text-primary font-medium"
                    )}
                  //             onClick={() => {
                  //               if (window.innerWidth < 768) {
                  //   setTimeout(() => toggleSidebar(), 150)
                  // }
                  //             }}
                  >
                    {sub.name}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* <Link href={item.path || "#"}> */}
            <Link href={
              item.path ||
              (hasSubmodules && item.submodules[0]?.path) ||
              "#"
            }>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-10 p-0 flex items-center justify-center rounded-md",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="h-4 w-4" />
                  {/* <span className="text-sm">{item.name}</span> */}
                </div>
              </Button>
            </Link>

          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium z-50" sideOffset={10}>
            {item.name}
            {hasSubmodules && (
              <div className="mt-1 pt-1 border-t border-border/50 text-xs text-muted-foreground flex flex-col gap-1">
                {item.submodules.map((sub) => {
                  const isSubActive =
                    sub.path && location.startsWith(sub.path);

                  return (
                    <Link key={sub.id} href={sub.path || "#"}>
                      <div
                        className={cn(
                          "block px-2 py-1 rounded cursor-pointer text-white hover:bg-white hover:text-primary ",
                          isSubActive && "bg-white text-primary"
                        )}
                      >
                        {sub.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

  }

  // Expanded State
  if (hasSubmodules) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between h-10 px-3 mb-1 font-normal cursor-pointer",
              isOpen ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <IconComponent className="h-4 w-4" />
              <span className="text-[clamp(9px,1.5vw,12px)]">{item.name}</span>
            </div>
            <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1 animate-slide-down">
          <div className="border-l border-border pl-2 ml-2 mt-1 space-y-1">
            {item.submodules.map((sub) => {
              const isActive =
                sub.path && location.startsWith(sub.path);

              return (
                <Link key={sub.id} href={sub.path || "#"}  >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-8 px-3 text-sm font-normal",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                    )} onClick={handleMenuClick}
                  >
                    {sub.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  return (
    // <Link href={item.path || "#"}>
    <Link href={
      item.path ||
      (hasSubmodules && item.submodules[0]?.path) ||
      "#"
    }>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-10 px-3 mb-1 font-normal",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )} onClick={handleMenuClick}
      >
        <div className="flex items-center gap-3">
          <IconComponent className="h-4 w-4" />
          <span className="text-[clamp(10px,2vw,13px)]">{item.name}</span>
        </div>
      </Button>
    </Link>

  );
}
