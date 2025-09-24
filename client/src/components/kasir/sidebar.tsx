import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  ChefHat, 
  CreditCard, 
  Users, 
  Package, 
  Calendar,
  Receipt,
  Clock,
  X,
  LogOut
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
  { id: 'orders', label: 'Menu Order', icon: ClipboardList, path: '/kasir/orders' },
  { id: 'kitchen', label: 'Dapur', icon: ChefHat, path: '/kasir/kitchen' },
  { id: 'cashier', label: 'Kasir Manual', icon: CreditCard, path: '/kasir/cashier' },
  { id: 'reservations', label: 'Reservasi', icon: Users, path: '/kasir/reservations' },
  { id: 'expenses', label: 'Pencatatan Pengeluaran', icon: Receipt, path: '/kasir/expenses' },
  { id: 'daily-reports', label: 'Laporan Harian', icon: Calendar, path: '/kasir/daily-reports' },
];

export default function KasirSidebar({ isOpen, onClose, currentSection, user }: KasirSidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-playfair text-lg font-bold text-foreground">Alonica Kasir</h1>
                <p className="text-xs text-muted-foreground">Alonica Restaurant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Welcome, {user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {/* Shift Toggle */}
            <ShiftToggle />
            
            {/* Menu Items */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <Link 
                  key={item.id} 
                  href={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  data-testid={`nav-${item.id}`}
                  onClick={onClose}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full justify-start"
              data-testid="button-logout-sidebar"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}