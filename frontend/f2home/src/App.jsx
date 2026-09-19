import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { LayoutProvider } from "./context/LayoutContext";
import { AppShell } from "./components/layout/AppShell";
import { Suspense, lazy } from "react";
import { Loader } from "lucide-react";
import AuthExpiryWatcher from "./components/common/AuthExpiryWatcher";
import ProcessingOverlay from "./components/common/ProcessingOverlay";
import CartOwnerSync from "./components/common/CartOwnerSync";
import F2HomeLogo from "./components/ui/F2HomeLogo";
import { PUBLIC_PATHS } from "./utils/publicPaths";


const AppsPage = lazy(() => import("./pages/AppsPage"));
const Welcome = lazy(() => import("./pages/f2home/Welcome"));
const MarketplaceIndex = lazy(() => import("./pages/f2home/marketplace/MarketplaceIndex"));
const CategoryPage = lazy(() => import("./pages/f2home/marketplace/CategoryPage"));
const ProductDetailPage = lazy(() => import("./pages/f2home/marketplace/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/f2home/marketplace/CartPage"));
const CheckoutPage = lazy(() => import("./pages/f2home/marketplace/CheckoutPage"));
const MyProducts = lazy(() => import("./pages/f2home/farm/MyProducts"));
const MyOrders = lazy(() => import("./pages/f2home/orders/MyOrders"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const LoginPage = lazy(() => import("./LoginPage"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const RestorePassword = lazy(() => import("./pages/auth/RestorePassword"));
const NotFound = lazy(() => import("./pages/not-found"));

// Branded full-screen loader shown while a public route chunk is downloading
// (e.g. on a hard refresh of the browser).
const PublicRouteFallback = () => (
  <div className="fixed inset-0 z-[50] bg-[#f7faf3] flex flex-col items-center justify-center gap-8">
    <div className="w-52 max-w-full px-6">
      <F2HomeLogo className="w-full h-auto" showTagline={false} />
    </div>
    <div className="flex items-center gap-2 text-sm text-[#3c3c3c]/60">
      <Loader className="h-5 w-5 animate-spin text-[#33691e]" />
      <span>Loading…</span>
    </div>
  </div>
);

// Loader used inside the app shell while an authed route chunk is downloading.
const AppRouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

function PublicRouter() {
  return (
    <Suspense fallback={<PublicRouteFallback />}>
      <Switch>
        <Route path="/">
          <Redirect to="/auth/login" />
        </Route>
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/register" component={RegisterPage} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="/auth/restore-password" component={RestorePassword} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<AppRouteFallback />}>
      <Switch>
        <Route path="/app" component={AppsPage} />

        {/* F2Home */}
        <Route path="/app/welcome" component={Welcome} />
        <Route path="/app/marketplace" component={MarketplaceIndex} />
        <Route path="/app/marketplace/:category" component={CategoryPage} />
        <Route path="/app/marketplace/:category/:id" component={ProductDetailPage} />
        <Route path="/app/cart" component={CartPage} />
        <Route path="/app/checkout" component={CheckoutPage} />
        <Route path="/app/farm/products" component={MyProducts} />
        <Route path="/app/orders" component={MyOrders} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [location] = useLocation();
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => location === path || location.startsWith(`${path}/`)
  );

  return (
    <LayoutProvider>
      <TooltipProvider>
        {isPublicPath ? (
          <PublicRouter />
        ) : (
          <AppShell>
            <AppRouter />
          </AppShell>
        )}

        {/* Auto-logout + redirect to login when the JWT expires */}
        <AuthExpiryWatcher />

        {/* Loads the signed-in customer's persisted cart */}
        <CartOwnerSync />

        {/* Global Toast */}
        <Toaster />

        {/* Global processing lock: blocks the page (not the browser) while a
            submit / export / approve is in flight - see
            components/common/ProcessingOverlay.jsx and utils/processingLock.js */}
        <ProcessingOverlay />
      </TooltipProvider>
    </LayoutProvider>
  );
}

export default App;
