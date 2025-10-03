import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  ClipboardList, 
  ChefHat, 
  Calculator, 
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
  { id: 'kitchen', label: 'Dapur', icon: ChefHat, path: '/kasir/kitchen' },
  { id: 'cashier', label: 'Point of Sale (POS)', icon: Calculator, path: '/kasir/cashier' },
  { id: 'reservations', label: 'Reservasi', icon: Calendar, path: '/kasir/reservations' },
  { id: 'expenses', label: 'Pencatatan Pengeluaran', icon: Receipt, path: '/kasir/expenses' },
  { id: 'daily-reports', label: 'Laporan Penjualan', icon: TrendingUp, path: '/kasir/daily-reports' },
  { id: 'printer', label: 'Pengaturan Printer', icon: Printer, path: '/kasir/printer' },
];

export default function KasirSidebar({ isOpen, onClose, currentSection, user }: KasirSidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Sidebar - Collapsible with Hover */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-background border-r border-border transform transition-all duration-300 ease-in-out flex flex-col",
          "hidden lg:flex",
          isHovered ? "w-64" : "w-20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-4 py-5 border-b border-border">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          {isHovered && (
            <h1 className="text-base font-semibold text-foreground ml-3 whitespace-nowrap" data-testid="text-sidebar-brand">
              Alonica
            </h1>
          )}
        </div>

        {/* User Info */}
        {isHovered && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {/* Shift Toggle - Only show when expanded */}
          {isHovered && (
            <div className="mb-3 px-1">
              <ShiftToggle />
            </div>
          )}
          
          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <Link 
                  key={item.id} 
                  href={item.path}
                  className={cn(
                    "flex items-center rounded-md text-sm font-normal transition-colors",
                    isHovered ? "px-3 py-2.5 space-x-3" : "px-3 py-3 justify-center",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  data-testid={`nav-${item.id}`}
                  onClick={onClose}
                  title={!isHovered ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isHovered && <span className="truncate whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Fixed */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full h-10 text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm",
              isHovered ? "justify-start px-3" : "justify-center px-0"
            )}
            data-testid="button-logout-sidebar"
            title={!isHovered ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isHovered && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar - Full Width */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 ease-in-out flex flex-col lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-base font-semibold text-foreground" data-testid="text-sidebar-brand-mobile">Alonica</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
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
                  data-testid={`nav-${item.id}-mobile`}
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
            data-testid="button-logout-sidebar-mobile"
          >
            <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
}
