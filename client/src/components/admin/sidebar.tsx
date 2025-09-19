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
  ChefHat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: string;
}

const SIDEBAR_ITEMS = [
  { key: 'orders', label: 'Orders', icon: ClipboardList, path: '/admin/orders' },
  { key: 'kitchen', label: 'Dapur', icon: ChefHat, path: '/admin/kitchen' },
  { key: 'cashier', label: 'Kasir Manual', icon: Receipt, path: '/admin/cashier' },
  { key: 'menu', label: 'Custom Menu', icon: Utensils, path: '/admin/menu' },
  { key: 'categories', label: 'Categories', icon: Tags, path: '/admin/categories' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { key: 'inventory', label: 'Inventory', icon: Package, path: '/admin/inventory' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
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
        className={`fixed left-0 top-0 w-64 h-full bg-white shadow-lg z-30 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
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

          <nav className="space-y-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.key;
              
              return (
                <Button
                  key={item.key}
                  variant="ghost"
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full justify-start px-4 py-3 h-auto text-left transition-all ${
                    isActive 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.key}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Button>
              );
            })}

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start px-4 py-3 h-auto text-left text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
              data-testid="nav-logout"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </>
  );
}
