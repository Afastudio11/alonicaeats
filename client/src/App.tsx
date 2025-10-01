import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Lazy load pages for code splitting - reduces initial bundle size significantly
const WelcomePage = lazy(() => import("@/pages/welcome"));
const MenuPage = lazy(() => import("@/pages/menu"));
const CartPage = lazy(() => import("@/pages/cart"));
const PaymentPage = lazy(() => import("@/pages/payment"));
const SuccessPage = lazy(() => import("@/pages/success"));
const LoginPage = lazy(() => import("@/pages/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const KasirDashboard = lazy(() => import("@/pages/kasir/dashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component shown while chunks load
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={WelcomePage} />
        <Route path="/welcome" component={WelcomePage} />
        <Route path="/menu" component={MenuPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/payment" component={PaymentPage} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin/:section?" component={AdminDashboard} />
        <Route path="/kasir/:section?" component={KasirDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
