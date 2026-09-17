import { useEffect, useRef, useState } from 'react';
import { useLayout } from '../../context/LayoutContext';
import { cn } from '../../lib/utils';
import F2HomeLogo from "../ui/F2HomeLogo";
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { useLogoutMutation } from '../../redux/f2home/authApi';
import { formatStatus } from '../../utils/formatStatus';
import { useNavigate } from "react-router-dom";
import { useLocation } from "wouter";
import {
  Bell,
  HelpCircle,
  Search,
  Grip,
  Sun,
  Moon,
  User,
  ChevronDown,
  LogOut,
  Settings,
  MessageSquare,
  Calendar,
  AlertCircle,
  CreditCard,
  Users,
  Globe,
  Shield,
  Keyboard,
  LifeBuoy,
  Cloud,
  Building,
  PlusCircle,
  Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '../../components/ui/dropdown-menu';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { apiSlice } from '../../redux/slices/apiSlice';

export function TopNav() {
  const { theme, toggleTheme, toggleLauncher } = useLayout();
  const searchInputRef = useRef(null);
  const user = useSelector((state) => state.auth?.user || null);
  const token = useSelector((state) => state.auth.token);
  const refreshToken = useSelector((state) => state.auth?.refreshToken);
  const [revokeRefreshToken] = useLogoutMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [location] = useLocation();
  // Persisted so the return path survives a refresh while on an article.
  const helpReturnPath = useRef(
    sessionStorage.getItem("helpReturnPath") || "/app"
  );

  // First click opens the help center; clicking Help again returns to
  // the page the user came from (even after navigating between articles).
  const handleHelpClick = () => {
    const isHelpCenter =
      location === "/app/help-center" || location.startsWith("/app/help-center/");

    if (isHelpCenter) {
      navigate(helpReturnPath.current);
    } else {
      helpReturnPath.current = location;
      sessionStorage.setItem("helpReturnPath", location);
      navigate("/app/help-center");
    }
  };


  const getInitials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const handleLogoutClick = () => {
    console.log("Logging out...");
    // Best-effort: revoke the refresh token server-side before clearing the
    // local session. The local session is cleared either way.
    if (refreshToken) {
      revokeRefreshToken({ refreshToken });
    }
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    navigate("/auth/login");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    // <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--background-white)] backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-4 transition-colors width-auto">
    <header className="fixed top-0 inset-x-0 h-16 bg-[var(--background-white)] backdrop-blur-md border-b border-border z-40 flex items-center justify-between px-2 sm:px-4 lg:px-6">
      {/* Left: Launcher & Brand */}
      {/* <div className="flex items-center gap-4"> */}
      <div className="flex items-center sm:-ml-2 lg:-ml-4 gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLauncher}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
          aria-label="Open App Launcher"
        >
          <Grip className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>

        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="text-gray-800 dark:text-white w-24 sm:w-28 md:w-36 lg:w-40">

            <F2HomeLogo className="w-full h-auto object-contain" showTagline={false} />

          </div>
        </div>
      </div>

      {/* Center: Global Search */}
      {/* <div className="hidden md:block flex-1 max-w-2xl px-8">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search apps, users, docs..." 
            className="w-full h-10 pl-10 pr-4 rounded-lg  border focus:bg-background-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div> */}

      {/* Right: Actions & Profile */}
      {/* <div className="flex items-center gap-2"> */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* <Button variant="ghost" size="icon" className="hidden md:block text-muted-foreground hover:text-foreground cursor-pointer">
          <HelpCircle className=" h-10 w-9" />
        </Button> */}

        {/* Notifications Dropdown */}
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-background"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h4 className="font-semibold text-sm">Notifications</h4>
              <span className="text-xs text-muted-foreground">3 New</span>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col">
                <DropdownMenuItem className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mt-1">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">New Comment</p>
                    <p className="text-xs text-muted-foreground">Sarah commented on the "Q3 Report" task.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">2 mins ago</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50 border-t border-border/50">
                  <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mt-1">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Low Stock Alert</p>
                    <p className="text-xs text-muted-foreground">MacBook Pro 16" inventory is below threshold.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">1 hour ago</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50 border-t border-border/50">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mt-1">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Team Meeting</p>
                    <p className="text-xs text-muted-foreground">Weekly sync starting in 15 minutes.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">15 mins ago</p>
                  </div>
                </DropdownMenuItem>
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border bg-muted/20">
              <Button variant="ghost" className="w-full h-8 text-xs justify-center text-primary">
                Mark all as read
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu> */}

        <Button
          variant="ghost"
          size="icon"
          className="hidden md:block text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={handleHelpClick}
          aria-label="Help Center"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="hidden sm:flex text-muted-foreground hover:text-foreground mr-2 cursor-pointer"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2 pr-1 h-10 gap-2 hover:bg-muted/50 rounded-full sm:rounded-lg cursor-pointer">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              {/* <div className="hidden sm:flex flex-col items-start text-xs text-left"> */}
              <div className="hidden md:flex flex-col items-start text-xs text-left">
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-muted-foreground">{formatStatus(user?.role)}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            {/* User Header */}
            <div className="flex items-center gap-3 p-2 pb-3 mb-1 border-b border-border">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5">
                <span className="font-semibold text-sm">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal text-muted-foreground bg-muted/50">
                    SMAID:{user?.smaId}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="py-1">
              <div className="py-1">
                <DropdownMenuItem asChild className="mb-2 p-0 focus:bg-transparent">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs h-8 mb-2 cursor-pointer"
                    onClick={() => navigate("/app/profile")}
                  >
                    Manage Account
                  </Button>
                </DropdownMenuItem>
              </div>
            </div>

            {/* <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Organization</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>My Organization</span>
                <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Team & Users</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Subscription & Billing</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Preferences</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Language</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem className="cursor-pointer">English (US)</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Français</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Español</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem className="cursor-pointer">
                <Keyboard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Keyboard Shortcuts</span>
                <DropdownMenuShortcut>?</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Developer</DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>API Keys</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Cloud className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Integrations</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator /> */}

            <DropdownMenuItem
              className="cursor-pointer md:hidden"
            >
              <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Help Center</span>
            </DropdownMenuItem>


            <DropdownMenuItem
              className="cursor-pointer sm:hidden"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1">Dark Mode</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
                  theme === 'dark' ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                    theme === 'dark' ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20" onClick={handleLogoutClick}>
              <LogOut className="mr-2 h-4 w-4" />

              <span >Sign Out</span>

            </DropdownMenuItem>

            <div className="pt-2 pb-1 text-center">
              <span className="text-[10px] text-muted-foreground/50">v2.0.0-beta</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
