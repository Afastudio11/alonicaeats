import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import AdminSidebar from "@/components/admin/sidebar";
import OrdersSection from "./orders";
import KitchenSection from "./kitchen";
import CashierSection from "./cashier";
import MenuSection from "./menu";
import CategoriesSection from "./categories";
import AnalyticsSection from "./analytics";
import InventorySection from "./inventory";
import SettingsSection from "./settings";
import ReservationsSection from "./reservations";
import UsersSection from "./users";
import DiscountsSection from "./discounts";
import PrintSettingsSection from "./print-settings";
import AuditReportsSection from "./audit-reports";
import ApprovalsSection from "./approvals";
import PrinterPage from "../printer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/admin/notification-bell";

export default function AdminDashboard() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated, authReady } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract section from URL (e.g., /admin/orders -> orders)
  const section = location.split('/admin/')[1] || 'orders';

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

  // Show access denied only after auth is ready and user is not authenticated or not admin
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please login to access admin dashboard</p>
        </div>
      </div>
    );
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Admin access required. Current role: {user.role}</p>
          <button 
            onClick={logout} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
            data-testid="button-logout-access-denied"
          >
            Logout and Login as Admin
          </button>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 'orders':
        return <OrdersSection />;
      case 'kitchen':
        return <KitchenSection />;
      case 'cashier':
        return <CashierSection />;
      case 'reservations':
        return <ReservationsSection />;
      case 'users':
        return <UsersSection />;
      case 'menu':
        return <MenuSection />;
      case 'categories':
        return <CategoriesSection />;
      case 'discounts':
        return <DiscountsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'audit-reports':
        return <AuditReportsSection />;
      case 'approvals':
        return <ApprovalsSection />;
      case 'print-settings':
        return <PrintSettingsSection />;
      case 'printer':
        return <PrinterPage />;
      case 'inventory':
        return <InventorySection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <OrdersSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentSection={section}
      />

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-4 text-muted-foreground"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-admin-title">
                Restaurant Admin – Self Order Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Welcome, {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button 
              variant="outline" 
              onClick={logout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4">
          {renderSection()}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
