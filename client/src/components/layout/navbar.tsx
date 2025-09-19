import { useLocation } from "wouter";
import { Home, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  totalItems?: number;
}

export default function Navbar({ totalItems = 0 }: NavbarProps) {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-6 py-3 z-20">
      <div className="flex justify-around max-w-md mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/menu")}
          className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 ${
            isActive("/menu") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="nav-home"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center space-y-1 h-auto py-2 px-3 text-muted-foreground hover:text-foreground"
          data-testid="nav-search"
        >
          <Search className="h-5 w-5" />
          <span className="text-xs">Search</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/cart")}
          className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 relative ${
            isActive("/cart") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="nav-cart"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-destructive text-white cart-badge"
                data-testid="cart-badge"
              >
                {totalItems > 99 ? '99+' : totalItems}
              </Badge>
            )}
          </div>
          <span className="text-xs">Cart</span>
        </Button>
      </div>
    </nav>
  );
}
