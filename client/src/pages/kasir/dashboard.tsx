import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import KasirSidebar from "@/components/kasir/sidebar";
import OrdersSection from "@/pages/admin/orders";
import KitchenSection from "@/pages/admin/kitchen";
import CashierSection from "@/pages/admin/cashier";
import ReservationsSection from "@/pages/admin/reservations";
import ExpensesSection from "@/pages/kasir/expenses";
import DailyReportsSection from "@/pages/kasir/daily-reports";
import ShiftManagementSection from "@/pages/kasir/shift-management";
import PrinterPage from "@/pages/printer";
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
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // Show access denied only after auth is ready and user is not authenticated or not kasir
  if (!isAuthenticated || !user || user.role !== 'kasir') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="page-title mb-4">Akses Ditolak</h1>
          <p className="text-muted-foreground">
            {!isAuthenticated || !user 
              ? "Silakan login untuk mengakses dashboard kasir"
              : "Akses kasir diperlukan"
            }
          </p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 'shift':
        return <ShiftManagementSection />;
      case 'orders':
        return <OrdersSection />;
      case 'kitchen':
        return <KitchenSection />;
      case 'cashier':
        return <CashierSection />;
      case 'reservations':
        return <ReservationsSection />;
      case 'expenses':
        return <ExpensesSection />;
      case 'daily-reports':
        return <DailyReportsSection />;
      case 'printer':
        return <PrinterPage />;
      // Block restricted sections for kasir
      case 'dashboard':
      case 'inventory':
      case 'analytics':
      case 'settings':
      case 'menu':
      case 'categories':
        return (
          <div className="text-center py-12">
            <h2 className="section-title mb-2">Akses Ditolak</h2>
            <p className="text-muted-foreground">Halaman ini hanya tersedia untuk pengguna admin.</p>
          </div>
        );
      default:
        return <OrdersSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <KasirSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentSection={section}
        user={user}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
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
            <h1 className="dashboard-title">Dashboard Kasir</h1>
          </div>
          <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
            Keluar
          </Button>
        </div>
        
        {/* Page Content */}
        <div className="p-4 lg:p-6">
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