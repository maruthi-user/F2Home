import { useEffect, useRef, useState } from 'react';
import { useLayout } from '../../context/LayoutContext';
import { cn } from '../../lib/utils';
import appsData from '../../config/apps.json';
import { useToast } from "../../hooks/use-toast";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { ROLE_PERMISSIONS } from "@/utils/rolePermissionMap";
import { hasModuleAccess } from "@/utils/moduleAccess";


import {
  UsersRound,
  Shield,
  Search,
  Package,
  ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

const IconMap = {
  UsersRound,
  Shield,
  Package
};

export function AppLauncher() {
  const { isLauncherOpen, closeLauncher, setActiveApp, activeAppId, openLauncher } = useLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const gridRef = useRef(null);


  const filteredApps = appsData.applications.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const user = useSelector(
    (state) => state.auth?.user || null
  );
  // console.log("Redux User:", user);
  // console.log("Redux user:", user?.fullName);
  // console.log("Role Type:", typeof user?.role);
  const permissions =
    ROLE_PERMISSIONS[user?.role] || [];

  // Reset selection when opening or searching
  useEffect(() => {
    setSelectedIndex(0);
  }, [isLauncherOpen, searchQuery]);

  // Keyboard navigation within the launcher
  useEffect(() => {
    if (!isLauncherOpen) return;

    const handleKeyDown = (e) => {
      const cols = 3; // Grid columns

      switch (e.key) {
        case 'ArrowRight':
          setSelectedIndex(prev => Math.min(prev + 1, filteredApps.length - 1));
          break;
        case 'ArrowLeft':
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          setSelectedIndex(prev => Math.min(prev + cols, filteredApps.length - 1));
          break;
        case 'ArrowUp':
          setSelectedIndex(prev => Math.max(prev - cols, 0));
          break;
        case 'Enter':
          if (filteredApps[selectedIndex]) {
            const selectedApp = filteredApps[selectedIndex];

            const firstModule =
              selectedApp.modules?.find(
                (module) => module.path
              );

            // Match by app id, not a path substring: the general app path
            // contains "/hr" as part of its name, so a substring check would
            // wrongly flag it as the restricted Formers (HR) dashboard.
            const isHRModule =
              selectedApp.id === "hrdashboard";

            const isAdminModule =
              selectedApp.id === "admin";

            if (
              isHRModule &&
              !hasModuleAccess(user, "HR")
            ) {
              toast({
                title: "Access Denied",
                description:
                  "Please reach out to your administrator if you need access.",
                variant: "destructive",
              });

              return;
            } else if (
              isAdminModule &&
              !hasModuleAccess(user, "Admin")
            ) {

              toast({
                title: "Access Denied",
                description:
                  "Please reach out to your administrator if you need access.",
                variant: "destructive",
              });
              return;
            }

            setActiveApp(selectedApp.id);

            if (firstModule?.path) {
              navigate(firstModule.path);
            }

            if (selectedApp.external) {
              window.open(selectedApp.external, "_blank", "noopener,noreferrer");
              closeLauncher();
              return;
            }
            closeLauncher();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLauncherOpen, filteredApps, selectedIndex, setActiveApp, closeLauncher]);

  return (
    <Dialog open={isLauncherOpen} onOpenChange={(open) => !open && closeLauncher()}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border shadow-2xl transition-all duration-200 sm:rounded-2xl">
        <VisuallyHidden.Root>
          <DialogTitle>App Launcher</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header / Search */}
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/20 relative">
          <div className="relative pr-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-background border border-input rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-lg transition-all placeholder:text-muted-foreground/50"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="p-8 min-h-[400px] bg-gradient-to-b from-background to-muted/20">
          <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {filteredApps.map((app, index) => {
              const Icon = IconMap[app.icon] || Package;
              const isSelected = index === selectedIndex;
              const isActive = app.id === activeAppId;


              const hasAccess =
                app.id === "hrdashboard"
                  ? hasModuleAccess(user, "HR")
                  : app.id === "admin"
                    ? hasModuleAccess(user, "Admin")
                    : true;



              return (
                <button
                  key={app.id}
                  onClick={() => {

                    if (app.external) {
                      window.open(app.external, "_blank", "noopener,noreferrer");
                      closeLauncher();
                      return;
                    }

                    const firstModule = app.modules?.find(
                      (module) => module.path
                    );

                    // Match by app id, not a path substring: the general app
                    // path contains "/hr" as part of its name, so a substring
                    // check would wrongly flag it as the restricted Formers
                    // (HR) dashboard.
                    const isHRModule =
                      app.id === "hrdashboard";

                    const isAdminModule =
                      app.id === "admin";

                    if (
                      isHRModule &&
                      !hasModuleAccess(user, "HR")
                    ) {
                      toast({
                        title: "Access Denied",
                        description:
                          "Please reach out to your administrator if you need access.",
                        variant: "destructive",
                      });

                      return;
                    }


                    if (
                      isAdminModule &&
                      !hasModuleAccess(user, "Admin")
                    ) {
                      toast({
                        title: "Access Denied",
                        description:
                          "Please reach out to your administrator if you need access.",
                        variant: "destructive",
                      });

                      return;
                    }



                    setActiveApp(app.id);

                    if (firstModule?.path) {
                      navigate(firstModule.path);
                    }

                    closeLauncher();
                  }}
                  className={cn(
                    "relative flex flex-col items-start p-6 rounded-2xl transition-all duration-200 border group text-left h-full",
                    !hasAccess
                      ? "bg-muted border-border opacity-60 grayscale cursor-not-allowed"
                      : isSelected
                        ? "bg-background border-primary/30 shadow-lg shadow-primary/5 scale-[1.02] ring-2 ring-primary/10"
                        : "bg-card border-border/40 hover:border-border hover:shadow-md hover:bg-background/80 cursor-pointer",
                    isActive && hasAccess && !isSelected && "border-primary/20 bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all shadow-sm",
                      !hasAccess
                        ? "bg-muted text-muted-foreground"
                        : isSelected
                          ? "bg-primary text-primary-foreground shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110",
                      isActive && hasAccess && !isSelected && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>

                  <div className="flex-1">
                    <h3 className={cn(
                      "text-lg font-semibold tracking-tight mb-1",
                      isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}>
                      {app.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {app.modules.length} modules available
                    </p>
                  </div>

                  {/* Hover Arrow */}
                  <div className={cn(
                    "absolute top-6 right-6 transition-all duration-200",
                    isSelected ? "opacity-100 translate-x-0 text-primary" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground"
                  )}>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              );
            })}

            {filteredApps.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No apps found</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-between items-center text-xs font-medium text-muted-foreground">
          <div className="flex gap-6">
            <span className="flex items-center gap-2">
              <kbd className="font-sans bg-background border border-border shadow-xs rounded px-1.5 py-0.5 text-[10px] text-foreground">↑↓←→</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-2">
              <kbd className="font-sans bg-background border border-border shadow-xs rounded px-1.5 py-0.5 text-[10px] text-foreground">Enter</kbd>
              Open
            </span>
          </div>
          <span className="flex items-center gap-2">
            <kbd className="font-sans bg-background border border-border shadow-xs rounded px-1.5 py-0.5 text-[10px] text-foreground">Esc</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
