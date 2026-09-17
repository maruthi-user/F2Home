import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import appsData from '../config/apps.json';
import { useLocation } from "wouter";

const LayoutContext = createContext(undefined);

const findAppById = (appId) =>
  appsData.applications.find((app) => app.id === appId) || null;

export function LayoutProvider({ children }) {
  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // App State
  // Restored from localStorage so the sidebar survives a hard refresh
  // (e.g. on /profile, which is not tied to any app module path).
  const [location] = useLocation();
  const [activeAppId, setActiveAppId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeAppId');
      if (saved && findAppById(saved)) return saved;
    }
    return null;
  });
  const [activeApp, setActiveApp] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeAppId');
      if (saved) return findAppById(saved);
    }
    return null;
  });

  const persistActiveApp = useCallback((appId) => {
    try {
      localStorage.setItem('activeAppId', appId);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const handleSetActiveApp = useCallback((appId) => {
    const app = findAppById(appId);
    if (app) {
      setActiveAppId(appId);
      setActiveApp(app);
      persistActiveApp(appId);
      // setIsSidebarExpanded(true);
      setIsLauncherOpen(false); // Close launcher if open
    }
  }, [persistActiveApp]);

  useEffect(() => {
    const matchedApp = appsData.applications.find(app =>
      app.modules?.some(module =>
        module.path && location.startsWith(module.path)
      )
    );

    if (!matchedApp) return;

    // Only update if changed
    if (matchedApp.id !== activeAppId) {
      setActiveAppId(matchedApp.id);
      setActiveApp(matchedApp);
      persistActiveApp(matchedApp.id);
      // setIsSidebarExpanded(true);
    }
  }, [location, activeAppId, persistActiveApp]);

  // Sidebar State
  const isMobileViewport = () =>
    typeof window !== "undefined" && window.innerWidth < 1024;
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => !isMobileViewport()
  );
  const toggleSidebar = useCallback(() => setIsSidebarExpanded(prev => !prev), []);

  // Collapse on mobile / expand on desktop when the breakpoint is crossed
  useEffect(() => {
    let isMobile = isMobileViewport();

    const handleResize = () => {
      const nowMobile = isMobileViewport();
      if (nowMobile !== isMobile) {
        setIsSidebarExpanded(!nowMobile);
        isMobile = nowMobile;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Launcher State
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const openLauncher = useCallback(() => setIsLauncherOpen(true), []);
  const closeLauncher = useCallback(() => setIsLauncherOpen(false), []);
  const toggleLauncher = useCallback(() => setIsLauncherOpen(prev => !prev), []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + ; (or Cmd + ;) to toggle launcher
      if ((e.ctrlKey || e.metaKey) && e.key === ';') {
        e.preventDefault();
        toggleLauncher();
      }
      // Esc to close launcher
      if (e.key === 'Escape' && isLauncherOpen) {
        closeLauncher();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLauncher, closeLauncher, isLauncherOpen]);

  return (
    <LayoutContext.Provider value={{
      theme,
      toggleTheme,
      activeAppId,
      activeApp,
      setActiveApp: handleSetActiveApp,
      isSidebarExpanded,
      toggleSidebar,
      setSidebarExpanded: setIsSidebarExpanded,
      isLauncherOpen,
      openLauncher,
      closeLauncher,
      toggleLauncher
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
