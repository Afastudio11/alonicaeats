import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import FoodPattern from "@/components/ui/food-pattern";

export default function SuccessPage() {
  const [, setLocation] = useLocation();

  const handleBackToMenu = () => {
    // Clear customer data when going back to menu
    localStorage.removeItem('alonica-customer');
    setLocation("/menu");
  };

  return (
    <FoodPattern className="min-h-screen bg-background flex flex-col justify-center items-center px-6">
      <div className="text-center space-y-8">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto" data-testid="icon-success">
          <Check className="h-10 w-10 text-white" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-success-title">
            Terima Kasih!
          </h1>
          <p className="text-muted-foreground" data-testid="text-success-message">
            Pesanan Kamu Sedang Kami Proses, Ya.
          </p>
        </div>

        <h2 className="text-4xl font-playfair font-bold text-primary" data-testid="text-brand-footer">
          Alonica
        </h2>

        <Button
          onClick={handleBackToMenu}
          className="px-8 py-3 rounded-xl"
          data-testid="button-back-to-menu"
        >
          Kembali ke Menu
        </Button>
      </div>
    </FoodPattern>
  );
}
