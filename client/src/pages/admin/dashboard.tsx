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
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // Show access denied only after auth is ready and user is not authenticated or not admin
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="page-title mb-4">Akses Ditolak</h1>
          <p className="text-muted-foreground">Silakan login untuk mengakses dashboard admin</p>
        </div>
      </div>
    );
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="page-title mb-4">Akses Ditolak</h1>
          <p className="text-muted-foreground">Akses admin diperlukan. Role saat ini: {user.role}</p>
          <button 
            onClick={logout} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
            data-testid="button-logout-access-denied"
          >
            Keluar dan Login sebagai Admin
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
      <div className="flex-1 lg:pl-20">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="dashboard-title">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
              Keluar
            </Button>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="p-4 lg:p-6">
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
