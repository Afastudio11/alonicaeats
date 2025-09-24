import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Mic, Plus, ChefHat, Coffee, Fish, Utensils, Soup, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, Category } from "@shared/schema";

export default function MenuPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addToCart, totalItems } = useCart();
  const { toast } = useToast();
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = menuLoading || categoriesLoading;

  const filteredItems = menuItems.filter(item =>
    item.isAvailable &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const itemsByCategory = categories.map(category => ({
    category,
    items: filteredItems.filter(item => item.categoryId === category.id)
  })).filter(group => group.items.length > 0);

  // Category icons mapping
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: any } = {
      "Ayam & Daging": ChefHat,
      "Camilan & Dessert": Cookie,
      "Ikan & Seafood": Fish,
      "Minuman": Coffee,
      "Nasi & Mie": Utensils,
      "Sayur & Sup": Soup,
    };
    return iconMap[categoryName] || Utensils;
  };

  const scrollToCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const element = sectionRefs.current[categoryId];
    if (element) {
      const headerHeight = 160; // Approximate height of header + search + category nav
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image || undefined
    });

    toast({
      title: "Ditambahkan ke keranjang",
      description: `${item.name} berhasil ditambahkan`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10">
          <h1 className="text-3xl font-playfair font-bold text-primary text-center">Alonica</h1>
        </header>
        <div className="px-6 py-8">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="alonica-card overflow-hidden animate-pulse">
                <div className="w-full h-32 bg-muted"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-6 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10">
        <h1 className="text-3xl font-playfair font-bold text-primary text-center" data-testid="text-brand-header">
          Alonica
        </h1>
      </header>

      {/* Search Bar */}
      <div className="px-6 py-4 bg-white">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Search for food, restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-12 rounded-full bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="input-search"
          />
          <Mic className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        </div>
      </div>

      {/* Modern Category Navigation Bar - Sticky */}
      <div className="bg-white/95 backdrop-blur-sm border-b shadow-sm px-4 py-3 sticky top-[72px] z-20">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200/50 shadow-inner">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {/* Semua Category */}
            <div
              onClick={() => {
                setSelectedCategory(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`
                flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl cursor-pointer transition-all duration-300 group
                ${selectedCategory === null 
                  ? 'bg-primary text-white shadow-lg scale-105' 
                  : 'bg-white hover:bg-gray-50 hover:shadow-md text-gray-700 hover:scale-102'
                }
              `}
            >
              <div className={`p-2 rounded-lg mb-1 transition-colors ${
                selectedCategory === null ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-primary/10'
              }`}>
                <Utensils className={`w-4 h-4 ${selectedCategory === null ? 'text-white' : 'text-primary'}`} />
              </div>
              <span className="text-xs font-medium text-center leading-tight">Semua</span>
              {selectedCategory === null && (
                <div className="w-6 h-0.5 bg-white/50 rounded-full mt-1"></div>
              )}
            </div>

            {/* Category Items */}
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.name);
              const isActive = selectedCategory === category.id;
              return (
                <div
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`
                    flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl cursor-pointer transition-all duration-300 group
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg scale-105' 
                      : 'bg-white hover:bg-gray-50 hover:shadow-md text-gray-700 hover:scale-102'
                    }
                  `}
                >
                  <div className={`p-2 rounded-lg mb-1 transition-colors ${
                    isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-primary/10'
                  }`}>
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {category.name}
                  </span>
                  {isActive && (
                    <div className="w-6 h-0.5 bg-white/50 rounded-full mt-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="px-6 py-6">
        {/* Menu Items Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🛒 Menu Items
          </h1>
        </div>

        {/* Dynamic Category Sections */}
        {itemsByCategory.map((group, index) => (
          <section 
            key={group.category.id} 
            className="mb-8"
            ref={(el) => {
              sectionRefs.current[group.category.id] = el;
            }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground" data-testid={`text-section-${group.category.id}`}>
                {group.category.name}
              </h2>
              <div className="w-12 h-1 bg-primary rounded-full mt-2"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  onAddToCart={handleAddToCart} 
                />
              ))}
            </div>
          </section>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-items">
              {searchQuery ? "Tidak ada item yang ditemukan" : "Menu belum tersedia"}
            </p>
          </div>
        )}
      </div>

      <Navbar totalItems={totalItems} />
    </div>
  );
}

function MenuItemCard({ item, onAddToCart }: { item: MenuItem; onAddToCart: (item: MenuItem) => void }) {
  // Truncate long names to keep cards compact
  const displayName = item.name.length > 35 ? `${item.name.substring(0, 35)}...` : item.name;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative hover:shadow-md transition-shadow duration-200" data-testid={`card-menu-${item.id}`}>
      <div className="relative">
        <img 
          src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"} 
          alt={item.name} 
          className="w-full h-28 object-cover"
          data-testid={`img-menu-${item.id}`}
        />
        <Button
          size="icon"
          onClick={() => onAddToCart(item)}
          className="absolute top-2 right-2 w-8 h-8 bg-white text-primary hover:bg-primary hover:text-white rounded-full shadow-lg transition-all duration-200"
          data-testid={`button-add-${item.id}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-2 text-sm leading-tight line-clamp-2 min-h-[2.5rem]" data-testid={`text-name-${item.id}`}>
          {displayName}
        </h3>
        <div className="flex items-center justify-between">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl px-4 py-3 shadow-sm" data-testid={`text-price-${item.id}`}>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-primary/80">Rp</span>
              <span className="text-xl font-bold text-primary">
                {item.price.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
