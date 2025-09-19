import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { printWithThermalSettings, getThermalPreference } from "@/utils/thermal-print";
import type { Order } from "@shared/schema";

interface ReceiptData extends Order {
  orderDate: string;
  customerData: {
    name: string;
    table: string;
  };
}

export default function SuccessPage() {
  const [, setLocation] = useLocation();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    // Load receipt data from localStorage
    const storedReceipt = localStorage.getItem('alonica-receipt');
    if (storedReceipt) {
      try {
        setReceiptData(JSON.parse(storedReceipt));
      } catch (error) {
        console.error('Failed to load receipt data:', error);
      }
    }
  }, []);

  const handleBackToMenu = () => {
    // Clear customer and receipt data when going back to menu
    localStorage.removeItem('alonica-customer');
    localStorage.removeItem('alonica-receipt');
    setLocation("/menu");
  };

  const handlePrintReceipt = () => {
    printWithThermalSettings(getThermalPreference());
  };

  if (!receiptData) {
    // Fallback to simple success message if no receipt data
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6">
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
      </div>
    );
  }

  const orderDate = new Date(receiptData.orderDate);
  const items = Array.isArray(receiptData.items) ? receiptData.items : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10 print-hide">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToMenu}
              className="mr-4 text-muted-foreground"
              data-testid="button-back"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-playfair font-bold text-primary" data-testid="text-page-title">
              Receipt
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReceipt}
            className="flex items-center gap-2"
            data-testid="button-print"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      {/* Receipt Content */}
      <div className="px-6 py-8">
        <div className="customer-receipt max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8" data-testid="receipt-container">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4" data-testid="icon-success">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-success-title">
              Pesanan Berhasil!
            </h2>
            <p className="text-muted-foreground" data-testid="text-success-message">
              Terima kasih atas pesanan Anda
            </p>
          </div>

          {/* Restaurant Info */}
          <div className="receipt-header text-center border-b border-border pb-6 mb-6">
            <h1 className="text-3xl font-playfair font-bold text-primary mb-2" data-testid="text-restaurant-name">
              Alonica
            </h1>
            <p className="text-sm text-muted-foreground">Jl. Kuliner Rasa No. 123</p>
            <p className="text-sm text-muted-foreground">Telp: (021) 555-0123</p>
          </div>

          {/* Order Info */}
          <div className="space-y-4 border-b border-border pb-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Order ID</p>
                <p className="font-medium" data-testid="text-order-id">#{receiptData.id?.slice(-8).toUpperCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tanggal</p>
                <p className="font-medium" data-testid="text-order-date">
                  {orderDate.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Waktu</p>
                <p className="font-medium" data-testid="text-order-time">
                  {orderDate.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Meja</p>
                <p className="font-medium" data-testid="text-table-number">#{receiptData.tableNumber}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Atas Nama</p>
              <p className="font-medium" data-testid="text-customer-name">{receiptData.customerData.name}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4 border-b border-border pb-6 mb-6">
            <h3 className="font-semibold text-foreground thermal-compact">Detail Pesanan</h3>
            {items.map((item: any, index: number) => (
              <div key={index} className="receipt-item thermal-compact" data-testid={`receipt-item-${index}`}>
                <div className="receipt-item-name">
                  <p className="font-medium text-foreground" data-testid={`text-item-name-${index}`}>{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} x {formatCurrency(item.price)}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic" data-testid={`text-item-notes-${index}`}>
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
                <div className="receipt-item-price" data-testid={`text-item-total-${index}`}>
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-3 pb-6 mb-6">
            <div className="thermal-divider"></div>
            <div className="thermal-grid">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium" data-testid="text-subtotal">{formatCurrency(receiptData.subtotal)}</span>
            </div>
            {receiptData.discount > 0 && (
              <div className="thermal-grid">
                <span className="text-muted-foreground">Diskon</span>
                <span className="font-medium text-red-600" data-testid="text-discount">-{formatCurrency(receiptData.discount)}</span>
              </div>
            )}
            <div className="thermal-divider"></div>
            <div className="receipt-total thermal-center">
              <div>Total: {formatCurrency(receiptData.total)}</div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">Metode Pembayaran</p>
              <p className="font-medium text-foreground capitalize" data-testid="text-payment-method">
                {receiptData.paymentMethod === 'qris' ? 'QRIS' : 'Cash'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Status Pesanan</p>
              <p className="font-medium text-primary capitalize" data-testid="text-order-status">
                {receiptData.status === 'pending' ? 'Sedang Diproses' : receiptData.status}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Terima kasih telah memesan di Alonica!
            </p>
            <p className="text-xs text-muted-foreground">
              Makanan Anda akan segera disiapkan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto mt-8 space-y-4 print-hide">
          <Button
            onClick={handlePrintReceipt}
            variant="outline"
            className="w-full h-12 rounded-xl"
            data-testid="button-print-receipt"
          >
            <Printer className="h-5 w-5 mr-2" />
            Print Receipt
          </Button>
          <Button
            onClick={handleBackToMenu}
            className="w-full h-12 rounded-xl"
            data-testid="button-back-to-menu"
          >
            Kembali ke Menu
          </Button>
        </div>
      </div>
    </div>
  );
}