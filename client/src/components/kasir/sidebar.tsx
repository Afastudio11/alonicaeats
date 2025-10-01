import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  ChefHat, 
  CreditCard, 
  Calendar,
  Receipt,
  TrendingUp,
  X,
  LogOut,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import ShiftToggle from "./shift-toggle";

interface User {
  id: string;
  username: string;
  role: string;
}

interface KasirSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: string;
  user: User | null;
}

const menuItems = [
  { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/kasir/orders' },
  { id: 'kitchen', label: 'Sistem Dapur (KDS)', icon: ChefHat, path: '/kasir/kitchen' },
  { id: 'cashier', label: 'Point of Sale (POS)', icon: CreditCard, path: '/kasir/cashier' },
  { id: 'reservations', label: 'Reservasi', icon: Calendar, path: '/kasir/reservations' },
  { id: 'expenses', label: 'Pencatatan Pengeluaran', icon: Receipt, path: '/kasir/expenses' },
  { id: 'daily-reports', label: 'Laporan Penjualan', icon: TrendingUp, path: '/kasir/daily-reports' },
  { id: 'printer', label: 'Pengaturan Printer', icon: Printer, path: '/kasir/printer' },
];

export default function KasirSidebar({ isOpen, onClose, currentSection, user }: KasirSidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-base font-semibold text-foreground" data-testid="text-sidebar-brand">Alonica</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {user?.username?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* Shift Toggle */}
          <div className="mb-3">
            <ShiftToggle />
          </div>
          
          {/* Menu Items */}
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <Link 
                  key={item.id} 
                  href={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-normal transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  data-testid={`nav-${item.id}`}
                  onClick={onClose}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Fixed */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start px-3 py-2 h-9 text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
            data-testid="button-logout-sidebar"
          >
            <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
}