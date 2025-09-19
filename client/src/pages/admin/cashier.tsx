import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, User, Table, Receipt, Calculator, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { printWithThermalSettings, getThermalPreference } from "@/utils/thermal-print";
import type { MenuItem, Category, InsertOrder, Order } from "@shared/schema";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface PaymentData {
  cashAmount: number;
  change: number;
  order: Order & {
    items: Array<{
      itemId: string;
      name: string;
      price: number;
      quantity: number;
      notes: string;
    }>;
  };
}

export default function CashierSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Customer & order state
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  // Payment & receipt state
  const [showPaymentCalculator, setShowPaymentCalculator] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  // Load menu items and categories
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Group menu items by category
  const menuByCategory = categories.reduce((acc, category) => {
    acc[category.id] = menuItems.filter(item => item.categoryId === category.id && item.isAvailable);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Pesanan berhasil dibuat",
        description: "Pesanan telah disimpan ke sistem",
      });
      // Reset form
      setCustomerName("");
      setTableNumber("");
      setCart([]);
      setNotes({});
    },
    onError: () => {
      toast({
        title: "Gagal membuat pesanan",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  // Cart functions
  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === menuItem.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        notes: ""
      }];
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; // No tax or discount for now
  
  // Payment calculation
  const cashAmountNumber = parseFloat(cashAmount) || 0;
  const change = cashAmountNumber >= total ? cashAmountNumber - total : 0;
  
  // Handle payment calculation
  const handlePaymentCalculation = async () => {
    if (cashAmountNumber < total) {
      toast({
        title: "Uang tidak cukup",
        description: "Jumlah uang yang diberikan kurang dari total pesanan",
        variant: "destructive",
      });
      return;
    }
    
    const orderData = {
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim(),
      items: cart.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ""
      })),
      subtotal,
      discount: 0,
      total,
      paymentMethod: "cash",
      cashReceived: cashAmountNumber,
      change: change,
      status: "pending"
    };
    
    try {
      const response = await apiRequest('POST', '/api/orders', orderData);
      const createdOrder = await response.json();
      
      setPaymentData({
        cashAmount: cashAmountNumber,
        change,
        order: createdOrder
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowPaymentCalculator(false);
      setShowReceipt(true);
      
      toast({
        title: "Pesanan berhasil dibuat",
        description: "Pesanan telah disimpan ke sistem",
      });
    } catch (error) {
      toast({
        title: "Gagal membuat pesanan",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  };
  
  // Reset all forms
  const resetAllForms = () => {
    setCustomerName("");
    setTableNumber("");
    setCart([]);
    setNotes({});
    setCashAmount("");
    setPaymentData(null);
    setShowPaymentCalculator(false);
    setShowReceipt(false);
  };
  
  // Print receipt
  const handlePrintReceipt = () => {
    printWithThermalSettings(getThermalPreference());
  };

  // Submit order
  const handleSubmitOrder = () => {
    if (!customerName.trim()) {
      toast({
        title: "Nama customer diperlukan",
        description: "Mohon masukkan nama customer",
        variant: "destructive",
      });
      return;
    }

    if (!tableNumber.trim()) {
      toast({
        title: "Nomor meja diperlukan",
        description: "Mohon masukkan nomor meja",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Cart kosong",
        description: "Mohon tambahkan item ke cart",
        variant: "destructive",
      });
      return;
    }

    const orderData: InsertOrder = {
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim(),
      items: cart.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ""
      })),
      subtotal,
      discount: 0,
      total,
      paymentMethod: "cash", // Default to cash for manual orders
      status: "pending"
    };

    setShowPaymentCalculator(true);
    // We'll create the order after payment is calculated
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="alonica-card p-6">
        <div className="flex items-center space-x-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-cashier-title">
              Kasir Manual
            </h1>
            <p className="text-muted-foreground">
              Input pesanan customer secara manual
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Menu Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={categories[0]?.id || ""} className="w-full">
                <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${categories.length}, 1fr)`}}>
                  {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} data-testid={`tab-${category.name.toLowerCase()}`}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {categories.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menuByCategory[category.id]?.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-foreground" data-testid={`menu-item-${item.id}`}>
                                {item.name}
                              </h3>
                              <Badge variant="secondary" data-testid={`price-${item.id}`}>
                                {formatCurrency(item.price)}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <Button
                              onClick={() => addToCart(item)}
                              className="w-full"
                              size="sm"
                              data-testid={`button-add-${item.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Tambah ke Cart
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {(!menuByCategory[category.id] || menuByCategory[category.id].length === 0) && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Tidak ada menu tersedia</p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Customer Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Info Customer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nama Customer</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama customer"
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNumber" className="flex items-center space-x-2">
                  <Table className="h-4 w-4" />
                  <span>Nomor Meja</span>
                </Label>
                <Input
                  id="tableNumber"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Masukkan nomor meja"
                  data-testid="input-table-number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart</span>
                </div>
                <Badge variant="secondary" data-testid="cart-count">
                  {cart.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground" data-testid="empty-cart-message">
                    Cart masih kosong
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3" data-testid={`cart-item-${item.id}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center" data-testid={`quantity-${item.id}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold" data-testid={`item-total-${item.id}`}>
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>

                        <Input
                          placeholder="Catatan (opsional)"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          className="text-xs"
                          data-testid={`input-notes-${item.id}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span data-testid="subtotal">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span data-testid="total">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={createOrderMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-order"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {createOrderMutation.isPending ? "Memproses..." : "Hitung Pembayaran"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Calculator Dialog */}
      <Dialog open={showPaymentCalculator} onOpenChange={setShowPaymentCalculator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Kalkulator Pembayaran</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Customer:</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Meja:</span>
                <span className="font-medium">{tableNumber}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Pesanan:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cashAmount">Uang yang Diberikan</Label>
              <Input
                id="cashAmount"
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Masukkan jumlah uang"
                className="text-lg text-center"
                data-testid="input-cash-amount"
              />
            </div>
            
            {cashAmountNumber > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Uang Diterima:</span>
                  <span className="font-medium">{formatCurrency(cashAmountNumber)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Total Pesanan:</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Kembalian:</span>
                  <span className={`${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(change)}
                  </span>
                </div>
                {change < 0 && (
                  <p className="text-red-600 text-sm mt-2">
                    Uang kurang {formatCurrency(Math.abs(change))}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentCalculator(false)}
              data-testid="button-cancel-payment"
            >
              Batal
            </Button>
            <Button 
              onClick={handlePaymentCalculation}
              disabled={cashAmountNumber < total}
              data-testid="button-confirm-payment"
            >
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md print:max-w-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Struk Pembayaran</span>
            </DialogTitle>
          </DialogHeader>
          
          {paymentData && (
            <div className="receipt-content space-y-4 print:text-black print:bg-white" data-testid="receipt-content">
              {/* Restaurant Header */}
              <div className="text-center border-b pb-4">
                <h2 className="font-playfair text-xl font-bold">Alonica Restaurant</h2>
                <p className="text-sm text-muted-foreground">
                  Jl. Ratulangi No.14, Bantaeng<br />
                  Telp: 0515-4545
                </p>
              </div>
              
              {/* Order Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date().toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{new Date().toLocaleTimeString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{paymentData.order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meja:</span>
                  <span>{paymentData.order.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="text-xs">{paymentData.order.id.substring(0, 8)}</span>
                </div>
              </div>
              
              {/* Items */}
              <div className="border-t border-b py-4">
                <h3 className="font-semibold mb-3">Detail Pesanan:</h3>
                <div className="space-y-2">
                  {paymentData.order.items.map((item: any, index: number) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span>{item.name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>  {item.quantity}x {formatCurrency(item.price)}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-muted-foreground">
                          Catatan: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Payment Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(paymentData.order.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(paymentData.order.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uang Diterima:</span>
                  <span>{formatCurrency(paymentData.cashAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(paymentData.change)}</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>Terima kasih atas kunjungan Anda!</p>
                <p>Silakan kembali lagi</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="print:hidden">
            <Button 
              variant="outline" 
              onClick={resetAllForms}
              data-testid="button-new-order"
            >
              Pesanan Baru
            </Button>
            <Button 
              onClick={handlePrintReceipt}
              data-testid="button-print-receipt"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}