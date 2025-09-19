import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import { formatCurrency } from "@/lib/utils";
import { MENU_CATEGORIES } from "@/lib/constants";
import type { MenuItem } from "@shared/schema";

export default function MenuPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { addToCart, totalItems } = useCart();
  const { toast } = useToast();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const filteredItems = menuItems.filter(item =>
    item.isAvailable &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const foodItems = filteredItems.filter(item => item.category === 'food');
  const drinkItems = filteredItems.filter(item => item.category === 'drink');

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

      {/* Menu Content */}
      <div className="px-6">
        {/* Makanan Section */}
        {foodItems.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4" data-testid="text-section-food">
              {MENU_CATEGORIES.food}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {foodItems.map((item) => (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  onAddToCart={handleAddToCart} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Minuman Section */}
        {drinkItems.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4" data-testid="text-section-drinks">
              {MENU_CATEGORIES.drink}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {drinkItems.map((item) => (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  onAddToCart={handleAddToCart} 
                />
              ))}
            </div>
          </section>
        )}

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
  return (
    <div className="alonica-card overflow-hidden relative" data-testid={`card-menu-${item.id}`}>
      <img 
        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"} 
        alt={item.name} 
        className="w-full h-32 object-cover"
        data-testid={`img-menu-${item.id}`}
      />
      <div className="p-4">
        <h3 className="font-medium text-foreground mb-1" data-testid={`text-name-${item.id}`}>
          {item.name}
        </h3>
        <p className="text-lg font-semibold text-primary" data-testid={`text-price-${item.id}`}>
          {formatCurrency(item.price)}
        </p>
      </div>
      <Button
        size="icon"
        onClick={() => onAddToCart(item)}
        className="absolute top-2 right-2 w-8 h-8 bg-primary text-white rounded-full hover:bg-primary/90 transition-all"
        data-testid={`button-add-${item.id}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
