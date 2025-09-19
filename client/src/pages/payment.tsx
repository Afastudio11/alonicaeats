import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Banknote, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { SAMPLE_QRIS_CODE } from "@/lib/constants";
import type { OrderItem } from "@shared/schema";

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'qris' | null>(null);
  const { cartItems, total, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      clearCart();
      setLocation("/success");
    },
    onError: () => {
      toast({
        title: "Gagal memproses pembayaran",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const handlePayment = async () => {
    if (!selectedPayment) {
      toast({
        title: "Pilih metode pembayaran",
        description: "Silakan pilih Cash atau QRIS",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Keranjang kosong",
        description: "Silakan tambahkan item ke keranjang",
        variant: "destructive",
      });
      return;
    }

    // Get customer data
    const customerData = localStorage.getItem('alonica-customer');
    if (!customerData) {
      toast({
        title: "Data customer tidak ditemukan",
        description: "Silakan kembali ke halaman welcome",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    const { name, table } = JSON.parse(customerData);

    // Convert cart items to order items
    const orderItems: OrderItem[] = cartItems.map(item => ({
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ""
    }));

    const orderData = {
      customerName: name,
      tableNumber: table,
      items: orderItems,
      subtotal: total,
      discount: 0,
      total: total,
      paymentMethod: selectedPayment,
      status: 'pending'
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/cart")}
            className="mr-4 text-muted-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-playfair font-bold text-primary" data-testid="text-page-title">
            Payment
          </h1>
        </div>
      </header>

      <div className="px-6 py-8 space-y-8">
        {/* Payment Methods */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Pilih Metode Pembayaran</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedPayment('cash')}
              className={`h-32 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                selectedPayment === 'cash' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary'
              }`}
              data-testid="button-payment-cash"
            >
              {selectedPayment === 'cash' && (
                <Check className="absolute top-2 right-2 h-5 w-5 text-primary" />
              )}
              <Banknote className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="font-medium text-foreground">Cash</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setSelectedPayment('qris')}
              className={`h-32 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                selectedPayment === 'qris' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary'
              }`}
              data-testid="button-payment-qris"
            >
              {selectedPayment === 'qris' && (
                <Check className="absolute top-2 right-2 h-5 w-5 text-primary" />
              )}
              <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="font-medium text-foreground">QRIS</span>
            </Button>
          </div>
        </div>

        {/* QRIS Preview */}
        {selectedPayment === 'qris' && (
          <div className="alonica-card p-6" data-testid="qris-preview">
            <div className="text-center">
              <img 
                src={SAMPLE_QRIS_CODE} 
                alt="QRIS Code" 
                className="w-48 h-48 mx-auto mb-4 rounded-xl"
                data-testid="img-qris-code"
              />
              <h3 className="font-semibold text-foreground mb-2">Nama Merchant Base Jono 1</h3>
              <p className="text-sm text-muted-foreground">NMID: XXXXXXXXXXXX</p>
              <p className="text-sm text-muted-foreground">TID</p>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-muted rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">TOTAL:</span>
            <span className="text-2xl font-bold text-primary" data-testid="text-payment-total">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={!selectedPayment || createOrderMutation.isPending}
          className="w-full h-14 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-pay-confirm"
        >
          {createOrderMutation.isPending ? "Memproses..." : "Pay and Confirm"}
        </Button>
      </div>
    </div>
  );
}
