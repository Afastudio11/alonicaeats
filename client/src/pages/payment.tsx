import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Check, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { OrderItem } from "@shared/schema";

interface PaymentResponse {
  order: any;
  payment: {
    qrisUrl?: string;
    qrisString?: string;
    expiryTime: string;
    transactionId: string;
    midtransOrderId: string;
  };
}

interface PaymentStatus {
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired';
  transactionStatus: string;
  orderId: string;
  total: number;
}

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'creating' | 'pending' | 'paid' | 'failed' | 'expired'>('creating');
  const { cartItems, total, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data: PaymentResponse) => {
      setOrderId(data.order.id);
      setPaymentData(data);
      setPaymentStatus('pending');
      
      // Start polling payment status
      startPolling(data.order.id);
    },
    onError: (error: any) => {
      console.error('Order creation error:', error);
      toast({
        title: "Gagal membuat pesanan",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
      setPaymentStatus('failed');
    }
  });

  // Payment status polling
  const { data: statusData, refetch: refetchStatus } = useQuery<PaymentStatus>({
    queryKey: ['/api/orders', orderId, 'payment-status'],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID');
      const response = await apiRequest('GET', `/api/orders/${orderId}/payment-status`);
      return response.json();
    },
    enabled: !!orderId && paymentStatus === 'pending',
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
  });

  // Handle payment status changes
  useEffect(() => {
    if (statusData) {
      setPaymentStatus(statusData.paymentStatus);
      
      if (statusData.paymentStatus === 'paid') {
        // Store order details for receipt
        const receiptData = {
          ...paymentData?.order,
          orderDate: new Date().toISOString(),
          paymentMethod: 'qris',
          total: statusData.total
        };
        localStorage.setItem('alonica-receipt', JSON.stringify(receiptData));
        
        clearCart();
        toast({
          title: "Pembayaran berhasil!",
          description: "Terima kasih, pesanan Anda sedang diproses",
        });
        
        setTimeout(() => {
          setLocation("/success");
        }, 2000);
      } else if (statusData.paymentStatus === 'expired') {
        toast({
          title: "Pembayaran kedaluwarsa",
          description: "Silakan buat pesanan baru",
          variant: "destructive",
        });
      } else if (statusData.paymentStatus === 'failed') {
        toast({
          title: "Pembayaran gagal",
          description: "Silakan coba lagi",
          variant: "destructive",
        });
      }
    }
  }, [statusData, paymentData, clearCart, setLocation, toast]);

  const startPolling = (orderIdToWatch: string) => {
    // The useQuery will automatically start polling when orderId is set
    console.log('Started payment polling for order:', orderIdToWatch);
  };

  const handleCreateOrder = async () => {
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
    };

    createOrderMutation.mutate(orderData);
  };

  const formatTimeRemaining = (expiryTime: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiryTime).getTime();
    const remaining = Math.max(0, expiry - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPaymentContent = () => {
    if (paymentStatus === 'creating') {
      return (
        <div className="space-y-8">
          {/* QRIS Payment Method - Always selected */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Metode Pembayaran</h2>
            <div className="w-full">
              <div className="h-32 border-2 border-primary bg-primary/5 rounded-2xl flex flex-col items-center justify-center transition-all relative">
                <Check className="absolute top-2 right-2 h-5 w-5 text-primary" />
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <span className="font-medium text-primary">QRIS Payment</span>
              </div>
            </div>
          </div>

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
            onClick={handleCreateOrder}
            disabled={createOrderMutation.isPending}
            className="w-full h-14 font-semibold rounded-xl"
            data-testid="button-create-payment"
          >
            {createOrderMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Membuat Pembayaran...
              </>
            ) : (
              "Buat Pembayaran QRIS"
            )}
          </Button>
        </div>
      );
    }

    if (paymentStatus === 'pending' && paymentData) {
      return (
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="alonica-card p-6 text-center" data-testid="qris-payment">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">Scan QR Code untuk Bayar</h2>
              <p className="text-sm text-muted-foreground">
                Gunakan aplikasi e-wallet atau mobile banking Anda
              </p>
            </div>

            {paymentData.payment.qrisUrl ? (
              <img 
                src={paymentData.payment.qrisUrl} 
                alt="QRIS Payment Code" 
                className="w-48 h-48 mx-auto mb-4 rounded-xl border"
                data-testid="img-qris-code"
              />
            ) : paymentData.payment.qrisString ? (
              <div className="w-48 h-48 mx-auto mb-4 rounded-xl border bg-white flex items-center justify-center">
                <p className="text-xs text-gray-500 text-center p-2">
                  QR Code: {paymentData.payment.qrisString.substring(0, 50)}...
                </p>
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto mb-4 rounded-xl border bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">QR Code Loading...</p>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Order ID: {paymentData.payment.midtransOrderId}</p>
              <p className="font-semibold text-lg text-primary">
                Total: {formatCurrency(total)}
              </p>
              {paymentData.payment.expiryTime && (
                <p className="text-orange-500 font-medium">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Berlaku hingga: {formatTimeRemaining(paymentData.payment.expiryTime)}
                </p>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-2" />
              <span className="font-medium text-blue-700">Menunggu Pembayaran</span>
            </div>
            <p className="text-sm text-blue-600">
              Silakan lakukan pembayaran, status akan terupdate otomatis
            </p>
          </div>
        </div>
      );
    }

    if (paymentStatus === 'paid') {
      return (
        <div className="text-center space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-green-700 mb-2">Pembayaran Berhasil!</h2>
            <p className="text-muted-foreground">Pesanan Anda sedang diproses</p>
          </div>
        </div>
      );
    }

    if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      return (
        <div className="text-center space-y-6">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              {paymentStatus === 'expired' ? 'Pembayaran Kedaluwarsa' : 'Pembayaran Gagal'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {paymentStatus === 'expired' 
                ? 'Waktu pembayaran telah habis' 
                : 'Terjadi kesalahan dalam pemrosesan pembayaran'
              }
            </p>
            <Button
              onClick={() => setLocation('/cart')}
              variant="outline"
              className="w-full"
            >
              Kembali ke Keranjang
            </Button>
          </div>
        </div>
      );
    }

    return null;
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
            QRIS Payment
          </h1>
        </div>
      </header>

      <div className="px-6 py-8">
        {renderPaymentContent()}
      </div>
    </div>
  );
}