import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import KasirSidebar from "@/components/kasir/sidebar";
import KasirOrdersSection from "./orders";
import KasirKitchenSection from "./kitchen";
import KasirCashierSection from "./cashier";
import CustomerSection from "./customer";
import KasirInventorySection from "./inventory";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function KasirDashboard() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated, authReady } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract section from URL (e.g., /kasir/orders -> orders)
  const section = location.split('/kasir/')[1] || 'orders';

  // Show loading while auth is hydrating
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied only after auth is ready and user is not authenticated or not kasir
  if (!isAuthenticated || !user || user.role !== 'kasir') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            {!isAuthenticated || !user 
              ? "Please login to access kasir dashboard"
              : "Kasir access required"
            }
          </p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 'orders':
        return <KasirOrdersSection />;
      case 'kitchen':
        return <KasirKitchenSection />;
      case 'cashier':
        return <KasirCashierSection />;
      case 'customer':
        return <CustomerSection />;
      case 'inventory':
        return <KasirInventorySection />;
      default:
        return <KasirOrdersSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <KasirSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentSection={section}
        user={user}
      />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">Kasir Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
            Logout
          </Button>
        </div>
        
        {/* Page Content */}
        <div className="p-6">
          {renderSection()}
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}