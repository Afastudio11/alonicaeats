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
      { key: 'reservations', label: 'Meja/Reservasi', icon: Users, path: '/admin/reservations' },
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
        className={`fixed left-0 top-0 w-64 h-full bg-white border-r border-border shadow-lg z-30 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:transform-none`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-playfair font-bold text-primary" data-testid="text-sidebar-brand">
              Alonica Admin
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="space-y-1">
            {SIDEBAR_CATEGORIES.map((category) => (
              <div key={category.label} className="mb-4">
                <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category.label}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.key;
                    
                    return (
                      <Button
                        key={item.key}
                        variant="ghost"
                        onClick={() => handleNavigation(item.path)}
                        className={`w-full justify-start px-6 py-2 h-auto text-left transition-all text-sm ${
                          isActive 
                            ? 'bg-primary text-white hover:bg-primary/90' 
                            : 'text-foreground hover:bg-muted'
                        }`}
                        data-testid={`nav-${item.key}`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <span>{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start px-4 py-3 h-auto text-left text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                data-testid="nav-logout"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Logout</span>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
