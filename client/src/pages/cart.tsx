import { useLocation } from "wouter";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";
import FoodPattern from "@/components/ui/food-pattern";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { cartItems, updateQuantity, updateNotes, subtotal, discount, total } = useCart();

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
      return;
    }
    setLocation("/payment");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/menu")}
            className="mr-4 text-muted-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="page-title font-playfair text-primary" data-testid="text-page-title">
              Alonica
            </h1>
            <p className="body-text-sm">Detail Pesanan</p>
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <div className="px-6 py-4 space-y-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-12" data-testid="text-empty-cart">
            <div className="text-4xl mb-4">🛒</div>
            <p className="text-muted-foreground">Keranjang masih kosong</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="alonica-card p-4 flex items-center space-x-4" data-testid={`cart-item-${item.id}`}>
              <img
                src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
                alt={item.name}
                className="w-14 h-14 rounded-xl object-cover"
                data-testid={`img-cart-${item.id}`}
              />
              <div className="flex-1">
                <h3 className="font-medium text-foreground" data-testid={`text-cart-name-${item.id}`}>
                  {item.name}
                </h3>
                <Textarea
                  placeholder="Catatan (opsional)"
                  value={item.notes || ""}
                  onChange={(e) => updateNotes(item.id, e.target.value)}
                  className="mt-2 text-sm h-20 resize-none"
                  data-testid={`textarea-notes-${item.id}`}
                />
                <p className="text-lg font-semibold text-primary mt-2" data-testid={`text-cart-price-${item.id}`}>
                  {formatCurrency(item.price)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-9 h-9 rounded-lg"
                  data-testid={`button-decrease-${item.id}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.id}`}>
                  {item.quantity}
                </span>
                <Button
                  size="icon"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-9 h-9 rounded-lg"
                  data-testid={`button-increase-${item.id}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Summary */}
      {cartItems.length > 0 && (
        <div className="px-6 mb-20">
          <FoodPattern className="bg-primary rounded-2xl p-6 text-white">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Diskon</span>
                <span data-testid="text-discount">{formatCurrency(discount)}</span>
              </div>
              <hr className="border-white/20" />
              <div className="flex justify-between text-xl font-semibold">
                <span>Total</span>
                <span data-testid="text-total">{formatCurrency(total)}</span>
              </div>
            </div>
          </FoodPattern>

          <Button
            onClick={handleProceedToPayment}
            disabled={cartItems.length === 0}
            className="w-full mt-4 h-14 bg-white text-primary border-2 border-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-proceed-payment"
          >
            Bayar Sekarang
          </Button>
        </div>
      )}
    </div>
  );
}
