import { useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  Utensils, 
  Tags,
  BarChart3, 
  Package, 
  Settings, 
  Receipt,
  LogOut,
  X,
  ChefHat,
  Calendar,
  Users,
  Percent,
  Printer,
  FileSearch,
  Monitor,
  ShoppingCart,
  Coffee,
  Percent as PercentIcon,
  UserCheck,
  Users2,
  UserCog,
  CreditCard,
  TrendingUp,
  Package2,
  Building2,
  Cog,
  Trash2,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: string;
}

interface SidebarCategory {
  label: string;
  items: {
    key: string;
    label: string;
    icon: any;
    path: string;
  }[];
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    label: "POS & PESANAN",
    items: [
      { key: 'cashier', label: 'Kasir', icon: CreditCard, path: '/admin/cashier' },
      { key: 'orders', label: 'Pesanan', icon: ClipboardList, path: '/admin/orders' },
      { key: 'kitchen', label: 'Dapur', icon: ChefHat, path: '/admin/kitchen' },
      { key: 'reservations', label: 'Reservasi', icon: Calendar, path: '/admin/reservations' },
    ]
  },
  {
    label: "PROMO",
    items: [
      { key: 'discounts', label: 'Penawaran', icon: PercentIcon, path: '/admin/discounts' },
    ]
  },
  {
    label: "PENGGUNA",
    items: [
      { key: 'users', label: 'Manajemen Pengguna', icon: UserCheck, path: '/admin/users' },
    ]
  },
  {
    label: "LAPORAN",
    items: [
      { key: 'approvals', label: 'Persetujuan', icon: CheckSquare, path: '/admin/approvals' },
      { key: 'audit-reports', label: 'Laporan Keuangan', icon: Building2, path: '/admin/audit-reports' },
      { key: 'analytics', label: 'Laporan Penjualan', icon: TrendingUp, path: '/admin/analytics' },
      { key: 'inventory', label: 'Laporan Item', icon: Package2, path: '/admin/inventory' },
    ]
  },
  {
    label: "PENGATURAN",
    items: [
      { key: 'settings', label: 'Pengaturan', icon: Cog, path: '/admin/settings' },
      { key: 'menu', label: 'Manajemen Menu', icon: Utensils, path: '/admin/menu' },
      { key: 'categories', label: 'Kategori', icon: Tags, path: '/admin/categories' },
      { key: 'printer', label: 'Pengaturan Printer', icon: Printer, path: '/admin/printer' },
    ]
  }
];

export default function AdminSidebar({ isOpen, onClose, currentSection }: AdminSidebarProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const handleNavigation = (path: string) => {
    setLocation(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Desktop Sidebar - Collapsible with Hover */}
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

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {SIDEBAR_CATEGORIES.map((category, categoryIndex) => (
            <div key={category.label} className={categoryIndex > 0 ? "mt-6" : ""}>
              {/* Category Label - Only show when hovered */}
              {isHovered && (
                <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {category.label}
                </h3>
              )}
              
              {/* Category Items */}
              <div className="space-y-1">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.key;
                  
                  return (
                    <Button
                      key={item.key}
                      variant="ghost"
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "w-full rounded-md text-sm font-normal transition-colors",
                        isHovered ? "justify-start px-3 py-2.5 h-auto" : "justify-center px-3 py-3 h-auto",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      data-testid={`nav-${item.key}`}
                      title={!isHovered ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {isHovered && <span className="ml-3 truncate whitespace-nowrap">{item.label}</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Fixed */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
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
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-200 ease-in-out flex flex-col lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-base font-semibold text-foreground" data-testid="text-sidebar-brand">
              Alonica
            </h1>
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

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SIDEBAR_CATEGORIES.map((category, categoryIndex) => (
            <div key={category.label} className={categoryIndex > 0 ? "mt-6" : ""}>
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {category.label}
              </h3>
              <div className="space-y-0.5">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.key;
                  
                  return (
                    <Button
                      key={item.key}
                      variant="ghost"
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "w-full justify-start px-3 py-2 h-9 text-left transition-colors text-sm font-normal",
                        isActive 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`nav-${item.key}`}
                    >
                      <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Fixed */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start px-3 py-2 h-9 text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
}
