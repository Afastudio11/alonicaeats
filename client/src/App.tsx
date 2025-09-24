import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Pages
import WelcomePage from "@/pages/welcome";
import MenuPage from "@/pages/menu";
import CartPage from "@/pages/cart";
import PaymentPage from "@/pages/payment";
import SuccessPage from "@/pages/success";
import LoginPage from "@/pages/login";
import PrinterPage from "@/pages/printer";
import AdminDashboard from "@/pages/admin/dashboard";
import KasirDashboard from "@/pages/kasir/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomePage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/menu" component={MenuPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/printer" component={PrinterPage} />
      <Route path="/admin/:section?" component={AdminDashboard} />
      <Route path="/kasir/:section?" component={KasirDashboard} />
      <Route component={NotFound} />
    </Switch>
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
