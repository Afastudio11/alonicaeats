import { useLocation } from "wouter";
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
  Cog
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
    label: "POS & ORDERS",
    items: [
      { key: 'cashier', label: 'Point of Sale (POS)', icon: CreditCard, path: '/admin/cashier' },
      { key: 'orders', label: 'Orders', icon: ClipboardList, path: '/admin/orders' },
      { key: 'reservations', label: 'Reservasi', icon: Calendar, path: '/admin/reservations' },
    ]
  },
  {
    label: "PROMO",
    items: [
      { key: 'discounts', label: 'Offers', icon: PercentIcon, path: '/admin/discounts' },
    ]
  },
  {
    label: "USERS",
    items: [
      { key: 'users', label: 'User Management', icon: UserCheck, path: '/admin/users' },
    ]
  },
  {
    label: "REPORTS",
    items: [
      { key: 'audit-reports', label: 'Credit Balance Report', icon: Building2, path: '/admin/audit-reports' },
      { key: 'analytics', label: 'Laporan Penjualan', icon: TrendingUp, path: '/admin/analytics' },
      { key: 'inventory', label: 'Items Report', icon: Package2, path: '/admin/inventory' },
    ]
  },
  {
    label: "SETUP",
    items: [
      { key: 'settings', label: 'Settings', icon: Cog, path: '/admin/settings' },
      { key: 'menu', label: 'Menu Management', icon: Utensils, path: '/admin/menu' },
      { key: 'categories', label: 'Categories', icon: Tags, path: '/admin/categories' },
      { key: 'printer', label: 'Pengaturan Printer', icon: Printer, path: '/admin/printer' },
    ]
  }
];

export default function AdminSidebar({ isOpen, onClose, currentSection }: AdminSidebarProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

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
      <div 
        className={`fixed left-0 top-0 w-64 h-full bg-background border-r border-border z-30 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:transform-none flex flex-col`}
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
            className="lg:hidden h-8 w-8"
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
                      className={`w-full justify-start px-3 py-2 h-9 text-left transition-colors text-sm font-normal ${
                        isActive 
                          ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
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
            data-testid="nav-logout"
          >
            <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
}
