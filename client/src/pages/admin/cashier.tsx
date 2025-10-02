import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, ShoppingBag, User, Table, Receipt, Calculator, Printer, FileText, Send, Eye, Split, Search, Clock, QrCode, Banknote, CreditCard as CreditCardIcon, Wallet, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { smartPrintReceipt } from "@/utils/thermal-print";
import type { MenuItem, Category, InsertOrder, Order, Discount } from "@shared/schema";

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
  
  // Category & search state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editBillSearch, setEditBillSearch] = useState(""); // Search untuk edit bill dialog
  
  // Order type (tabs)
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  
  // Payment & receipt state
  const [showPaymentCalculator, setShowPaymentCalculator] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  
  // Open bills state
  const [showOpenBills, setShowOpenBills] = useState(false);
  const [openBillsCollapsed, setOpenBillsCollapsed] = useState(false);
  const [viewingBill, setViewingBill] = useState<Order | null>(null);
  const [editingBill, setEditingBill] = useState<Order | null>(null);
  
  // Deletion request state (new notification-based system)
  const [showDeletionReason, setShowDeletionReason] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<{billId: string, itemIndex: number} | null>(null);
  
  // Edit Open Bill deletion verification state
  const [showDeletionVerification, setShowDeletionVerification] = useState(false);
  const [securityMethod, setSecurityMethod] = useState<'approval' | 'pin'>('approval');
  const [adminPin, setAdminPin] = useState("");
  const [pendingDeleteItem, setPendingDeleteItem] = useState<{itemId: string, itemName: string} | null>(null);
  
  // Split bill state
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitParts, setSplitParts] = useState<{id: number, items: CartItem[], customerName: string, paid?: boolean}[]>([]);
  const [currentSplit, setCurrentSplit] = useState(1);
  const [paymentContext, setPaymentContext] = useState<{
    mode: 'cart' | 'split' | 'open_bill',
    splitId?: number,
    billId?: string,
    subtotal?: number,
    discount?: number,
    tax?: number,
    total: number,
    items: CartItem[],
    customerName?: string
  } | null>(null);

  // Load menu items and categories
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Load open bills
  const { data: openBills = [], refetch: refetchOpenBills } = useQuery<Order[]>({
    queryKey: ["/api/orders/open-bills"],
  });

  // Load active discounts
  const { data: activeDiscounts = [] } = useQuery<Discount[]>({
    queryKey: ["/api/discounts/active"],
  });

  // Group menu items by category
  const menuByCategory = categories.reduce((acc, category) => {
    acc[category.id] = menuItems.filter(item => item.categoryId === category.id && item.isAvailable);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Filter menu items based on search query and selected category
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    
    // Filter by category if selected
    if (selectedCategory && item.categoryId !== selectedCategory) return false;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Filter cart items untuk edit bill search
  const filteredCartForEdit = cart.filter(item => {
    if (!editBillSearch.trim()) return true;
    const query = editBillSearch.toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

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

  // Create open bill mutation (smart - checks for existing bill for table)
  const createOpenBillMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/orders/open-bill-smart', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
      
      // Show different messages based on whether it was created or updated
      toast({
        title: data.action === 'updated' ? "Open Bill berhasil diperbarui" : "Open Bill berhasil dibuat",
        description: data.message || "Bill telah disimpan dan otomatis dikirim ke dapur",
      });
      // Reset form
      setCustomerName("");
      setTableNumber("");
      setCart([]);
      setNotes({});
      setEditingBill(null);
    },
    onError: () => {
      toast({
        title: "Gagal memproses open bill",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  // Submit open bill mutation (convert to pending)
  const submitOpenBillMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/submit`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
      toast({
        title: "Bill berhasil disubmit",
        description: "Bill telah dikirim ke dapur untuk diproses",
      });
      setViewingBill(null);
      refetchOpenBills();
    },
    onError: () => {
      toast({
        title: "Gagal submit bill",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  // Request deletion mutation (new notification-based system)
  const requestDeletionMutation = useMutation({
    mutationFn: async ({ orderId, itemIndex, reason }: { orderId: string, itemIndex: number, reason: string }) => {
      const response = await apiRequest('POST', '/api/orders/request-deletion', {
        orderId,
        itemIndex,
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permintaan Terkirim",
        description: "Permintaan penghapusan item telah dikirim ke admin untuk persetujuan",
      });
      setShowDeletionReason(false);
      setPendingDeletion(null);
      setDeletionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengirim permintaan",
        description: error.message || "Terjadi kesalahan saat mengirim permintaan penghapusan",
        variant: "destructive",
      });
    },
  });

  // Handle item deletion request (opens reason dialog)
  const handleRequestItemDeletion = (billId: string, itemIndex: number) => {
    setPendingDeletion({ billId, itemIndex });
    setShowDeletionReason(true);
    setDeletionReason("");
  };

  // Submit deletion request with reason
  const handleSubmitDeletionRequest = () => {
    if (!pendingDeletion) return;

    // Validate reason is provided
    if (!deletionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penghapusan item",
        variant: "destructive",
      });
      return;
    }

    requestDeletionMutation.mutate({
      orderId: pendingDeletion.billId,
      itemIndex: pendingDeletion.itemIndex,
      reason: deletionReason.trim()
    });
  };

  // PIN verification and deletion mutation (with audit logging)
  const deleteWithPinMutation = useMutation({
    mutationFn: async ({ pin, orderId, itemIndex, reason }: { pin: string, orderId: string, itemIndex: number, reason: string }) => {
      const response = await apiRequest('POST', '/api/orders/delete-with-pin', { 
        pin, 
        orderId, 
        itemIndex, 
        reason 
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (pendingDeleteItem && editingBill) {
        // Update the cart with the new items from backend
        const updatedItems = data.updatedOrder.items.map((item: any) => ({
          id: item.itemId || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ""
        }));
        setCart(updatedItems);
        
        toast({
          title: "Item dihapus",
          description: `${pendingDeleteItem.itemName} telah dihapus dan tercatat dalam audit log`,
        });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
        queryClient.invalidateQueries({ queryKey: ['/api/deletion-logs'] });
      }
      setShowDeletionVerification(false);
      setPendingDeleteItem(null);
      setAdminPin("");
      setDeletionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal menghapus item",
        description: error.message || "PIN admin salah atau terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  // Handle deletion with verification in Edit Open Bill dialog
  const handleDeleteWithVerification = (itemId: string, itemName: string) => {
    if (!editingBill) {
      // Not in edit mode, delete normally
      removeFromCart(itemId);
      return;
    }
    
    // In edit mode, show verification dialog
    setPendingDeleteItem({ itemId, itemName });
    setShowDeletionVerification(true);
    setSecurityMethod('approval');
    setAdminPin("");
    setDeletionReason("");
  };

  // Process deletion based on security method
  const processDeletionVerification = () => {
    if (!pendingDeleteItem || !editingBill) return;

    // Require reason for all deletions
    if (!deletionReason.trim()) {
      toast({
        title: "Alasan diperlukan",
        description: "Mohon berikan alasan penghapusan item",
        variant: "destructive",
      });
      return;
    }

    const itemIndex = cart.findIndex(item => item.id === pendingDeleteItem.itemId);
    if (itemIndex === -1) {
      toast({
        title: "Item tidak ditemukan",
        description: "Item yang akan dihapus tidak ditemukan dalam cart",
        variant: "destructive",
      });
      return;
    }

    if (securityMethod === 'pin') {
      // Verify PIN and delete with audit logging
      if (!adminPin.trim()) {
        toast({
          title: "PIN diperlukan",
          description: "Masukkan PIN admin untuk melanjutkan",
          variant: "destructive",
        });
        return;
      }
      
      deleteWithPinMutation.mutate({
        pin: adminPin,
        orderId: editingBill.id,
        itemIndex,
        reason: deletionReason.trim()
      });
    } else {
      // Send approval request to admin
      requestDeletionMutation.mutate({
        orderId: editingBill.id,
        itemIndex,
        reason: deletionReason.trim()
      });
      
      setShowDeletionVerification(false);
      setPendingDeleteItem(null);
      setDeletionReason("");
    }
  };

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

  // Get discount for a menu item
  const getItemDiscount = (item: MenuItem): Discount | null => {
    return activeDiscounts.find(d => {
      if (!d.isActive) return false;
      if (d.applyToAll) return true;
      
      const menuItemIds = d.menuItemIds as string[] | null;
      const categoryIds = d.categoryIds as string[] | null;
      
      if (menuItemIds?.includes(item.id)) return true;
      if (categoryIds?.includes(item.categoryId)) return true;
      
      return false;
    }) || null;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number, discount: Discount): number => {
    if (discount.type === 'percentage') {
      return originalPrice - (originalPrice * discount.value / 100);
    } else {
      return Math.max(0, originalPrice - discount.value);
    }
  };

  // Calculate totals with discount
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate total discount from cart items with active discounts
  const totalDiscount = cart.reduce((sum, item) => {
    // Find the full MenuItem to check for discounts
    const menuItem = menuItems.find(mi => mi.id === item.id);
    if (!menuItem) return sum;
    
    const discount = getItemDiscount(menuItem);
    if (discount) {
      const originalPrice = item.price * item.quantity;
      const discountedPrice = calculateDiscountedPrice(item.price, discount) * item.quantity;
      return sum + (originalPrice - discountedPrice);
    }
    return sum;
  }, 0);
  
  // Calculate tax (0% for now, but structure is ready)
  const taxRate = 0;
  const taxAmount = (subtotal - totalDiscount) * taxRate;
  
  const total = subtotal - totalDiscount + taxAmount;
  
  // Helper function to calculate bill total from items
  const calculateBillTotal = (bill: Order) => {
    if (!bill || !Array.isArray(bill.items)) return 0;
    
    // If stored total exists (including 0), use it - it's the source of truth
    if (typeof bill.total === 'number') {
      return bill.total;
    }
    
    // Otherwise, calculate from items and apply discount
    const billItems = bill.items;
    const calculatedSubtotal = billItems.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
    
    const discount = bill.discount || 0;
    return Math.max(0, calculatedSubtotal - discount);
  };
  
  // Payment calculation - use payment context if available
  const cashAmountNumber = parseFloat(cashAmount) || 0;
  const currentPaymentTotal = paymentContext ? paymentContext.total : total;
  const change = cashAmountNumber >= currentPaymentTotal ? cashAmountNumber - currentPaymentTotal : 0;
  
  // Handle payment for open bills
  const handlePayOpenBill = (bill: Order) => {
    // Parse items from the bill
    const billItems = Array.isArray(bill.items) ? bill.items.map((item: any) => ({
      id: item.itemId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ""
    })) : [];
    
    // Calculate subtotal from items
    const calculatedSubtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Use stored values if they exist (including 0), otherwise use calculated
    const subtotalToUse = typeof bill.subtotal === 'number' ? bill.subtotal : calculatedSubtotal;
    const discountToUse = typeof bill.discount === 'number' ? bill.discount : 0;
    const totalToUse = calculateBillTotal(bill);
    
    // Set payment context for open bill
    setPaymentContext({
      mode: 'open_bill' as any,
      billId: bill.id,
      subtotal: subtotalToUse,
      discount: discountToUse,
      tax: 0, // Tax not stored in DB, always 0
      total: totalToUse,
      items: billItems,
      customerName: bill.customerName
    });
    
    // Show payment calculator
    setShowPaymentCalculator(true);
    setCashAmount("");
    setPaymentMethod("cash");
  };

  // Handle payment calculation
  const handlePaymentCalculation = async () => {
    if (!paymentContext) {
      toast({
        title: "Error pembayaran",
        description: "Konteks pembayaran tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    // Validate cash payment
    if (paymentMethod === "cash") {
      if (cashAmountNumber < paymentContext.total) {
        toast({
          title: "Uang tidak cukup",
          description: "Jumlah uang yang diberikan kurang dari total pesanan",
          variant: "destructive",
        });
        return;
      }
    }
    
    const change = paymentMethod === "cash" ? (cashAmountNumber - paymentContext.total) : 0;
    
    try {
      let result;
      
      // Check if this is an open bill payment
      if ((paymentContext as any).mode === 'open_bill' && (paymentContext as any).billId) {
        // Pay existing open bill - DO NOT create duplicate order
        const response = await apiRequest('POST', `/api/orders/${(paymentContext as any).billId}/pay`, {
          paymentMethod: paymentMethod,
          cashReceived: paymentMethod === "cash" ? cashAmountNumber : paymentContext.total,
          change: change
        });
        result = await response.json();
        
        // Invalidate open bills query
        queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
        
        toast({
          title: "Open bill berhasil dibayar",
          description: "Pembayaran telah dicatat, pesanan sudah di dapur",
        });
      } else {
        // Regular new order payment with correct breakdown
        const orderData = {
          customerName: paymentContext.customerName || customerName.trim(),
          tableNumber: tableNumber.trim(),
          items: paymentContext.items.map(item => ({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || ""
          })),
          subtotal: (paymentContext as any).subtotal || paymentContext.total,
          discount: (paymentContext as any).discount || 0,
          tax: (paymentContext as any).tax || 0,
          total: paymentContext.total,
          paymentMethod: paymentMethod,
          cashReceived: paymentMethod === "cash" ? cashAmountNumber : paymentContext.total,
          change: change,
          status: "pending"
        };
        
        const response = await apiRequest('POST', '/api/orders/cash', orderData);
        result = await response.json();
      }
      
      const createdOrder = result.order;
      
      setPaymentData({
        cashAmount: cashAmountNumber,
        change,
        order: createdOrder
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      // Handle split payment success
      if (paymentContext.mode === 'split' && (paymentContext as any).splitId) {
        // Decrement cart quantities by the paid split's items
        setCart(prevCart => {
          return prevCart.map(cartItem => {
            const paidItem = paymentContext.items.find(item => item.id === cartItem.id);
            if (paidItem) {
              const newQuantity = cartItem.quantity - paidItem.quantity;
              return newQuantity > 0 
                ? { ...cartItem, quantity: newQuantity }
                : null; // Mark for removal
            }
            return cartItem;
          }).filter(Boolean) as CartItem[]; // Remove null items
        });

        // Mark this split as paid (do NOT modify other splits)
        setSplitParts(prev => {
          const updatedParts = prev.map(part => {
            if (part.id === (paymentContext as any).splitId) {
              return { ...part, paid: true };
            }
            // Leave other splits unchanged
            return part;
          });
          
          // Check if all splits are paid
          const unpaidParts = updatedParts.filter(part => !part.paid);
          if (unpaidParts.length === 0) {
            // All splits are paid, close dialog and clear everything
            setTimeout(() => {
              setShowSplitBill(false);
              setSplitParts([]); // Reset split parts to empty array
              setCart([]);
              setCustomerName("");
              setTableNumber("");
            }, 100);
          }
          
          return updatedParts;
        });
      } else if ((paymentContext as any).mode !== 'open_bill') {
        // Regular cart payment - clear everything (not for open bill)
        setCustomerName("");
        setTableNumber("");
        setCart([]);
      }

      // Close viewing bill dialog if paying from there
      if ((paymentContext as any).mode === 'open_bill') {
        setViewingBill(null);
      }

      // Reset payment context
      setPaymentContext(null);
      setShowPaymentCalculator(false);
      setShowReceipt(true);
      
    } catch (error) {
      toast({
        title: "Gagal memproses pembayaran",
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
    setPaymentMethod("cash");
    setPaymentData(null);
    setShowPaymentCalculator(false);
    setShowReceipt(false);
  };
  
  // Print receipt
  const handlePrintReceipt = async () => {
    if (paymentData?.order) {
      await smartPrintReceipt(paymentData.order);
    }
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

    // Additional guard: prevent cart checkout if unpaid assigned items exist
    const unpaidAssignedCount = getUnpaidAssignedCount();
    if (unpaidAssignedCount > 0) {
      toast({
        title: "Split bill aktif",
        description: "Selesaikan semua split payment terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Set payment context for regular cart payment with full breakdown
    setPaymentContext({
      mode: 'cart',
      subtotal,
      discount: totalDiscount,
      tax: taxAmount,
      total,
      items: cart,
      customerName: customerName.trim()
    });

    setShowPaymentCalculator(true);
    setCashAmount("");
  };

  // Edit existing open bill - now opens in dialog
  const handleEditOpenBill = (bill: Order) => {
    setEditingBill(bill);
    
    // Convert bill items to cart format for editing
    const billItems = Array.isArray(bill.items) ? bill.items : [];
    const cartItems: CartItem[] = billItems.map((item: any) => ({
      id: item.itemId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ""
    }));
    
    // Load into cart for editing in dialog
    setCart(cartItems);
    setCustomerName(bill.customerName);
    setTableNumber(bill.tableNumber);
  };

  // Create open bill
  const handleCreateOpenBill = () => {
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
    };

    // Additional guard: prevent open bill if unpaid assigned items exist
    const unpaidAssignedCount = getUnpaidAssignedCount();
    if (unpaidAssignedCount > 0) {
      toast({
        title: "Split bill aktif",
        description: "Selesaikan semua split payment terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // If editing existing bill, add mode and billId to the request
    if (editingBill) {
      createOpenBillMutation.mutate({ 
        ...orderData, 
        mode: 'replace',
        billId: editingBill.id 
      });
    } else {
      createOpenBillMutation.mutate({ 
        ...orderData, 
        mode: 'create' 
      });
    }
  };

  // Cancel split bill
  const cancelSplitBill = () => {
    // Check if any splits have been paid
    const hasPaidSplits = splitParts.some(part => part.paid);
    if (hasPaidSplits) {
      toast({
        title: "Tidak dapat dibatalkan",
        description: "Ada split yang sudah dibayar, tidak bisa dibatalkan",
        variant: "destructive",
      });
      return;
    }

    setSplitParts([]);
    setCurrentSplit(1);
    setShowSplitBill(false);
    toast({
      title: "Split bill dibatalkan",
      description: "Kembali ke checkout normal",
    });
  };

  // Split bill handlers
  const initiateSplitBill = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart kosong",
        description: "Mohon tambahkan item ke cart untuk split bill",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize with 2 parts
    setSplitParts([
      { id: 1, items: [], customerName: "", paid: false },
      { id: 2, items: [], customerName: "", paid: false }
    ]);
    setCurrentSplit(1);
    setShowSplitBill(true);
  };

  const addSplitPart = () => {
    const newPart = { id: splitParts.length + 1, items: [], customerName: "", paid: false };
    setSplitParts([...splitParts, newPart]);
  };

  const removeSplitPart = (partId: number) => {
    const targetPart = splitParts.find(part => part.id === partId);
    if (targetPart?.paid) {
      toast({
        title: "Split sudah dibayar",
        description: "Tidak bisa hapus split yang sudah dibayar",
        variant: "destructive",
      });
      return;
    }

    if (splitParts.length <= 2) return; // Minimum 2 parts
    setSplitParts(splitParts.filter(part => part.id !== partId));
    if (currentSplit === partId) {
      setCurrentSplit(1);
    }
  };

  const assignItemToSplit = (cartItem: CartItem, partId: number, quantity: number) => {
    // Check if trying to assign to a paid split
    const targetPart = splitParts.find(part => part.id === partId);
    if (targetPart?.paid) {
      toast({
        title: "Split sudah dibayar",
        description: "Tidak bisa assign item ke split yang sudah dibayar",
        variant: "destructive",
      });
      return;
    }

    const currentAssigned = getUnpaidAssignedQuantity(cartItem.id);
    const remainingQty = cartItem.quantity - currentAssigned;
    
    if (quantity > remainingQty) {
      toast({
        title: "Jumlah melebihi yang tersedia",
        description: `Hanya tersisa ${remainingQty} item`,
        variant: "destructive",
      });
      return;
    }

    setSplitParts(prev => prev.map(part => {
      if (part.id === partId && !part.paid) {
        const existingItemIndex = part.items.findIndex(item => item.id === cartItem.id);
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...part.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity
          };
          return { ...part, items: updatedItems };
        } else {
          // Add new item to split
          return {
            ...part,
            items: [...part.items, { ...cartItem, quantity }]
          };
        }
      }
      return part;
    }));
  };

  const updateSplitCustomerName = (partId: number, name: string) => {
    setSplitParts(prev => prev.map(part => 
      part.id === partId ? { ...part, customerName: name } : part
    ));
  };

  const calculateSplitTotal = (items: CartItem[]) => {
    // Calculate subtotal
    const splitSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate discount for split items
    const splitDiscount = items.reduce((sum, item) => {
      // Find the full MenuItem to check for discounts
      const menuItem = menuItems.find(mi => mi.id === item.id);
      if (!menuItem) return sum;
      
      const discount = getItemDiscount(menuItem);
      if (discount) {
        const originalPrice = item.price * item.quantity;
        const discountedPrice = calculateDiscountedPrice(item.price, discount) * item.quantity;
        return sum + (originalPrice - discountedPrice);
      }
      return sum;
    }, 0);
    
    // Return discounted total (no tax for splits to keep it simple)
    return splitSubtotal - splitDiscount;
  };

  const getAssignedQuantity = (cartItemId: string) => {
    // Count items in ALL splits (paid and unpaid) for display purposes
    return splitParts.reduce((total, part) => {
      const item = part.items.find(item => item.id === cartItemId);
      return total + (item?.quantity || 0);
    }, 0);
  };

  const getUnpaidAssignedQuantity = (cartItemId: string) => {
    // Count only items assigned to UNPAID splits for capacity calculations
    return splitParts.reduce((total, part) => {
      if (part.paid) return total; // Skip paid splits
      const item = part.items.find(item => item.id === cartItemId);
      return total + (item?.quantity || 0);
    }, 0);
  };

  const getUnpaidAssignedCount = () => {
    // Count only items assigned to unpaid splits
    return splitParts.reduce((total, part) => {
      if (part.paid) return total;
      return total + part.items.reduce((partTotal, item) => partTotal + item.quantity, 0);
    }, 0);
  };

  const handleSplitPayment = (part: {id: number, items: CartItem[], customerName: string, paid?: boolean}) => {
    // Early return if split already paid
    if (part.paid) {
      toast({
        title: "Split sudah dibayar",
        description: "Split ini sudah dibayar sebelumnya",
        variant: "destructive",
      });
      return;
    }

    if (!part.customerName.trim()) {
      toast({
        title: "Nama customer diperlukan",
        description: "Mohon masukkan nama customer untuk split ini",
        variant: "destructive",
      });
      return;
    }

    if (part.items.length === 0) {
      toast({
        title: "Tidak ada item",
        description: "Split ini belum ada item yang di-assign",
        variant: "destructive",
      });
      return;
    }

    // Set payment context for this split with full breakdown
    const splitSubtotal = part.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const splitDiscount = part.items.reduce((sum, item) => {
      // Find the full MenuItem to check for discounts
      const menuItem = menuItems.find(mi => mi.id === item.id);
      if (!menuItem) return sum;
      
      const discount = getItemDiscount(menuItem);
      if (discount) {
        const originalPrice = item.price * item.quantity;
        const discountedPrice = calculateDiscountedPrice(item.price, discount) * item.quantity;
        return sum + (originalPrice - discountedPrice);
      }
      return sum;
    }, 0);
    const splitTotal = splitSubtotal - splitDiscount;
    
    setPaymentContext({
      mode: 'split',
      splitId: part.id,
      subtotal: splitSubtotal,
      discount: splitDiscount,
      tax: 0,
      total: splitTotal,
      items: part.items,
      customerName: part.customerName.trim()
    });

    // Show payment calculator
    setShowPaymentCalculator(true);
    setCashAmount("");
  };

  // Countdown timer component for discounts
  const DiscountCountdown = ({ endDate }: { endDate: Date | null }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!endDate) return;

      const updateTimer = () => {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft('Berakhir');
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }, [endDate]);

    if (!endDate || !timeLeft) return null;

    return (
      <span className="text-sm text-primary font-medium">
        Ends in {timeLeft}
      </span>
    );
  };

  // Filter discounts that have associated menu items
  const discountsWithItems = activeDiscounts
    .filter(discount => {
      const discountItems = menuItems.filter(item => getItemDiscount(item)?.id === discount.id);
      return discountItems.length > 0;
    })
    .slice(0, 4); // Limit to 4 items for display

  return (
    <>
      {/* 2-Column Layout: Product Lists (Left) and Cart Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Product Lists */}
        <div className="space-y-4">
        {/* Open Bills Section - Collapsible */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Order queues</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => setOpenBillsCollapsed(!openBillsCollapsed)}
                data-testid="toggle-open-bills"
              >
                {openBillsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <button className="text-sm text-primary hover:underline flex items-center gap-1" onClick={() => setShowOpenBills(true)}>
              <Eye className="h-4 w-4" />
              View All
            </button>
          </div>
          
          {!openBillsCollapsed && (
            <>
            {openBills.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground text-sm">Tidak ada open bills</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {openBills.slice(0, 6).map((bill) => {
                const statusColors = {
                  pending: 'bg-green-100 text-green-700 border-green-200',
                  preparing: 'bg-amber-100 text-amber-700 border-amber-200',
                  ready: 'bg-green-100 text-green-700 border-green-200',
                  served: 'bg-gray-100 text-gray-700 border-gray-200',
                  cancelled: 'bg-red-100 text-red-700 border-red-200'
                };
                const status = bill.orderStatus || 'pending';
                const statusText = status === 'pending' || status === 'ready' ? 'Ready to serve' : 
                                  status === 'preparing' ? 'On Cooking' : 
                                  status === 'cancelled' ? 'Cancelled' : 'Served';
                
                return (
                  <Card key={bill.id} className="border hover:shadow-md transition-shadow cursor-pointer group" onClick={() => handlePayOpenBill(bill)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">#{bill.id.slice(0, 8)}</span>
                            <Badge className={`text-xs px-2 py-0.5 ${statusColors[status as keyof typeof statusColors] || statusColors.pending}`}>
                              {statusText}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground">{bill.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bill.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(bill.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>{Array.isArray(bill.items) ? bill.items.length : 0} items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Table {bill.tableNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setViewingBill(bill); }}
                          className="h-8 flex-1 hover:bg-muted"
                          data-testid={`button-view-bill-${bill.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleEditOpenBill(bill); }}
                          className="h-8 flex-1 hover:bg-muted"
                          data-testid={`button-edit-bill-${bill.id}`}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}
            </>
          )}
        </div>

        {/* Special Discount Today Section */}
        {discountsWithItems.length > 0 && (
          <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Special Discount Today</h3>
              {discountsWithItems[0]?.endDate && (
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="h-3.5 w-3.5" />
                  <DiscountCountdown endDate={discountsWithItems[0].endDate} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {discountsWithItems.slice(0, 4).map((discount) => {
                const discountItem = menuItems.find(item => getItemDiscount(item)?.id === discount.id);
                if (!discountItem) return null;
                
                const originalPrice = discountItem.price;
                const discountedPrice = calculateDiscountedPrice(originalPrice, discount);
                
                return (
                  <div key={discount.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 relative overflow-hidden">
                    <Badge className="absolute top-2 right-2 bg-primary text-white text-xs px-1.5 py-0.5">
                      {discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
                    </Badge>
                    <h4 className="text-sm font-medium text-foreground mb-2 pr-12">{discountItem.name}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(originalPrice)}
                      </span>
                      <span className="text-base font-bold text-primary">
                        {formatCurrency(discountedPrice)}
                      </span>
                    </div>
                    <Button
                      onClick={() => addToCart(discountItem)}
                      size="sm"
                      className="w-full mt-2 h-7 text-xs"
                      data-testid={`button-add-discount-${discountItem.id}`}
                    >
                      Order
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
          </Card>
        )}

        {/* Menu Selection with Search */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-lg font-semibold">Product Lists</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    Input manually
                  </Button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search for food"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-sm"
                  data-testid="input-search-menu"
                />
              </div>
            </CardHeader>
            <CardContent>
              {/* Horizontal Scrollable Categories */}
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {/* Category Buttons - English names for consistency */}
                  {[
                    { id: null, name: 'Appetizers' },
                    ...categories.slice(0, 8).map(cat => ({
                      id: cat.id,
                      name: cat.name === 'Nasi & Mie' ? 'Seafood platters' : 
                            cat.name === 'Ikan & Seafood' ? 'Fish' :
                            cat.name === 'Ayam & Daging' ? 'Shrimp' :
                            cat.name === 'Sayur & Sup' ? 'Crab' :
                            cat.name === 'Minuman' ? 'Drinks' :
                            cat.name === 'Camilan & Dessert' ? 'Dessert' :
                            cat.name
                    }))
                  ].map((category, index) => (
                    <Button
                      key={category.id || 'all'}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`whitespace-nowrap flex-shrink-0 h-9 px-4 ${selectedCategory === category.id ? 'bg-primary text-white' : ''}`}
                      data-testid={`button-category-${index}`}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Menu Items Grid */}
              <div className="space-y-4">
                {filteredMenuItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery ? "Tidak ada menu yang cocok dengan pencarian" : "Tidak ada menu tersedia"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredMenuItems.map((item) => {
                      const cartItem = cart.find(c => c.id === item.id);
                      const quantity = cartItem?.quantity || 0;
                      
                      return (
                        <Card key={item.id} className="hover:shadow-lg transition-all border-0 shadow-sm overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col">
                              {/* Menu Image */}
                              <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <img
                                      src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Menu Details */}
                              <div className="p-3 space-y-2">
                                <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]" data-testid={`menu-item-${item.id}`}>
                                  {item.name}
                                </h3>
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-foreground" data-testid={`price-${item.id}`}>
                                    $ {(item.price / 1000).toFixed(2)} / serving
                                  </div>
                                </div>
                                
                                {/* Category Badge */}
                                <div className="text-xs text-muted-foreground">
                                  {categories.find(c => c.id === item.categoryId)?.name || 'Food'}
                                </div>
                                
                                {/* Add/Quantity Controls */}
                                {quantity === 0 ? (
                                  <Button
                                    onClick={() => addToCart(item)}
                                    className="w-full h-9"
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-add-${item.id}`}
                                  >
                                    Add to cart
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, quantity - 1)}
                                      className="h-9 w-9 p-0 rounded-lg"
                                      data-testid={`button-decrease-${item.id}`}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-bold w-8 text-center" data-testid={`quantity-${item.id}`}>
                                      {quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, quantity + 1)}
                                      className="h-9 w-9 p-0 rounded-lg"
                                      data-testid={`button-increase-${item.id}`}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Cart Details */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {/* Cart Details Header with Tabs */}
        <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Cart Details</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          {/* Order Type Tabs */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={orderType === "dine_in" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("dine_in")}
              className="flex-1 h-8"
            >
              Dine in
            </Button>
            <Button
              variant={orderType === "takeaway" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("takeaway")}
              className="flex-1 h-8"
            >
              Takeaway
            </Button>
            <Button
              variant={orderType === "delivery" ? "default" : "outline"}
              size="sm"
              onClick={() => setOrderType("delivery")}
              className="flex-1 h-8"
            >
              Delivery
            </Button>
          </div>
        </CardHeader>
        </Card>
        
        {/* Customer Information - Modern Clean Design */}
        <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Customer information</h3>
            {editingBill && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Edit Mode
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingBill(null);
                    setCustomerName("");
                    setTableNumber("");
                    setCart([]);
                    setNotes({});
                    toast({
                      title: "Edit dibatalkan",
                      description: "Kembali ke mode buat pesanan baru",
                    });
                  }}
                  data-testid="button-cancel-edit"
                  className="text-xs h-7"
                >
                  Cancel Edit
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="customerName" className="text-xs text-muted-foreground mb-1.5 block">Customer name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter name"
                className="h-9 text-sm"
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <Label htmlFor="tableNumber" className="text-xs text-muted-foreground mb-1.5 block">Table location</Label>
              <Select value={tableNumber} onValueChange={setTableNumber}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-table-number">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={`${num}`}>Table {num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Order Items - Modern Design */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Order items</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-auto p-0" onClick={() => setCart([])}>
                  Clear all items
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground" data-testid="empty-cart-message">
                    No items in cart yet
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-3 pb-3 border-b border-border/50" data-testid={`cart-item-${item.id}`}>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground">{item.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="text-muted-foreground hover:text-destructive h-6 w-6 p-0 -mt-1"
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary" data-testid={`item-total-${item.id}`}>
                              {formatCurrency(item.price * item.quantity)} x{item.quantity}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-7 w-7 p-0 rounded-full"
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-6 text-center" data-testid={`quantity-${item.id}`}>
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-7 w-7 p-0 rounded-full bg-primary text-white hover:bg-primary/90 hover:text-white border-primary"
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Summary */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Sub total</span>
                        <span data-testid="subtotal">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount (5%)</span>
                        <span className="text-destructive" data-testid="discount-amount">
                          {totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : '-Rp.0'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tax (2.6%)</span>
                        <span data-testid="tax-amount">{formatCurrency(taxAmount)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t">
                      <span>Total amount</span>
                      <span className="text-primary" data-testid="total">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter promo code"
                      className="h-10 text-sm"
                    />
                    <Button variant="outline" className="h-10 px-6">
                      Apply
                    </Button>
                  </div>

                  {/* Payment Button */}
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={createOrderMutation.isPending || cart.length === 0 || getUnpaidAssignedCount() > 0}
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold"
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? "Processing..." : "Proceed payment"}
                  </Button>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleCreateOpenBill}
                      disabled={createOpenBillMutation.isPending || getUnpaidAssignedCount() > 0}
                      variant="outline"
                      className="h-9 text-xs"
                      data-testid="button-create-open-bill"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      {createOpenBillMutation.isPending 
                        ? "Saving..." 
                        : editingBill 
                          ? "Update Bill" 
                          : "Open Bill"}
                    </Button>
                    
                    <Button
                      onClick={initiateSplitBill}
                      variant="outline"
                      className="h-9 text-xs"
                      data-testid="button-split-bill"
                      disabled={splitParts.length > 0}
                    >
                      <Split className="h-3.5 w-3.5 mr-1.5" />
                      {splitParts.length > 0 ? "Split Active" : "Split Bill"}
                    </Button>
                  </div>
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
              {paymentContext && paymentContext.mode === 'split' && (
                <Badge variant="secondary">Split {paymentContext.splitId}</Badge>
              )}
            </DialogTitle>
            {paymentContext && paymentContext.mode === 'split' && (
              <p className="text-sm text-muted-foreground">
                Customer: {paymentContext.customerName}
              </p>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Customer:</span>
                <span className="font-medium">{paymentContext?.customerName || customerName}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Meja:</span>
                <span className="font-medium">{tableNumber}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Pesanan:</span>
                <span className="text-primary">{formatCurrency(currentPaymentTotal)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={(value: "cash" | "qris") => setPaymentMethod(value)}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      <span>Cash</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="qris">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>QRIS</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {paymentMethod === "cash" && (
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
            )}
            
            {paymentMethod === "qris" && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Smartphone className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">Pembayaran QRIS</p>
                    <p className="text-sm">Customer akan membayar dengan QRIS</p>
                  </div>
                </div>
              </div>
            )}
            
            {paymentMethod === "cash" && cashAmountNumber > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Uang Diterima:</span>
                  <span className="font-medium">{formatCurrency(cashAmountNumber)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Total Pesanan:</span>
                  <span className="font-medium">{formatCurrency(currentPaymentTotal)}</span>
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
              disabled={paymentMethod === "cash" && cashAmountNumber < currentPaymentTotal}
              data-testid="button-confirm-payment"
            >
              Konfirmasi Pembayaran {paymentMethod === "qris" ? "QRIS" : "Cash"}
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
            <div className="receipt-content admin-receipt space-y-4 print:text-black print:bg-white" data-testid="receipt-content">
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
                  <span>{paymentData.order?.customerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meja:</span>
                  <span>{paymentData.order?.tableNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="text-xs">{paymentData.order?.id?.substring(0, 8) || 'N/A'}</span>
                </div>
              </div>
              
              {/* Items */}
              <div className="border-t border-b py-4">
                <h3 className="font-semibold mb-3">Detail Pesanan:</h3>
                <div className="space-y-2">
                  {(paymentData.order?.items || []).map((item: any, index: number) => (
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
                  <span>{formatCurrency(paymentData.order?.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(paymentData.order?.total || 0)}</span>
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

      {/* View Bill Dialog */}
      <Dialog open={!!viewingBill} onOpenChange={() => setViewingBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Detail Open Bill</span>
            </DialogTitle>
          </DialogHeader>
          
          {viewingBill && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Customer:</span>
                  <span className="font-medium">{viewingBill.customerName}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Meja:</span>
                  <span className="font-medium">{viewingBill.tableNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dibuat:</span>
                  <span className="font-medium">{new Date(viewingBill.createdAt).toLocaleString('id-ID')}</span>
                </div>
              </div>
              
              {/* Order Items */}
              <div className="space-y-2">
                <h4 className="font-medium">Items:</h4>
                {Array.isArray(viewingBill.items) && viewingBill.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start py-2 border-b">
                    <div className="flex-1">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {formatCurrency((item.price || 0) * (item.quantity || 0))}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestItemDeletion(viewingBill.id, index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        data-testid={`button-cancel-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(viewingBill.total)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setViewingBill(null)}
              className="flex-1"
            >
              Tutup
            </Button>
            <Button
              onClick={() => viewingBill && handlePayOpenBill(viewingBill)}
              className="flex-1 bg-primary hover:bg-primary/90"
              data-testid="button-pay-viewing-bill"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Bayar Bill
            </Button>
            <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2 w-full">
              <div className="flex items-center text-green-700">
                <Send className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Sudah Masuk ke Dapur</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Open bill otomatis dikirim ke dapur</p>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={!!editingBill} onOpenChange={() => {
        setEditingBill(null);
        setCart([]);
        setCustomerName("");
        setTableNumber("");
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Edit Open Bill</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingBill && (
            <div className="space-y-4">
              {/* Customer Info - Editable */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Customer</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama customer"
                  />
                </div>
                <div>
                  <Label>Nomor Meja</Label>
                  <Input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="No. Meja"
                  />
                </div>
              </div>
              
              {/* Current Items */}
              <div className="space-y-2">
                <h4 className="font-medium">Items Saat Ini:</h4>
                {/* Search Input untuk Edit Bill */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari item dalam bill..."
                    value={editBillSearch}
                    onChange={(e) => setEditBillSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-edit-bill"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredCartForEdit.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{item.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWithVerification(item.id, item.name)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add New Items */}
              <div className="space-y-2">
                <h4 className="font-medium">Tambah Item Baru:</h4>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                  {menuItems.filter(item => item.isAvailable).map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart(item)}
                      className="justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {item.name} - {formatCurrency(item.price)}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Total */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatCurrency(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingBill(null);
                setCart([]);
                setCustomerName("");
                setTableNumber("");
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (editingBill) {
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
                    mode: 'replace',
                    billId: editingBill.id
                  };
                  createOpenBillMutation.mutate(orderData);
                  setEditingBill(null);
                  setCart([]);
                  setCustomerName("");
                  setTableNumber("");
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Bill Dialog */}
      <Dialog open={showSplitBill} onOpenChange={setShowSplitBill}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Split className="h-5 w-5" />
              <span>Split Bill</span>
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Assign items ke masing-masing customer untuk split pembayaran
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Split Parts Management */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={addSplitPart}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Split
              </Button>
              <span className="text-sm text-muted-foreground">
                Total: {splitParts.length} splits
              </span>
            </div>

            {/* Cart Items to Assign */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Items untuk di-assign</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.map((item) => {
                    const assignedQty = getAssignedQuantity(item.id);
                    const remainingQty = item.quantity - assignedQty;
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={remainingQty > 0 ? "destructive" : "default"}>
                              Tersisa: {remainingQty}
                            </Badge>
                            <Badge variant="secondary">
                              Assigned: {assignedQty}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Quick assign buttons */}
                        <div className="flex space-x-2">
                          {splitParts.map((part) => (
                            <Button
                              key={part.id}
                              size="sm"
                              variant="outline"
                              onClick={() => assignItemToSplit(item, part.id, 1)}
                              disabled={remainingQty <= 0}
                              className="min-w-[60px]"
                            >
                              Split {part.id}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Split Parts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {splitParts.map((part) => (
                <Card key={part.id} className={`border-l-4 ${part.paid ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>Split {part.id}</span>
                        {part.paid && (
                          <Badge className="bg-green-100 text-green-800">
                            PAID
                          </Badge>
                        )}
                      </CardTitle>
                      {splitParts.length > 2 && !part.paid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSplitPart(part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Customer Name */}
                      <div>
                        <Label htmlFor={`customer-${part.id}`}>Nama Customer</Label>
                        <Input
                          id={`customer-${part.id}`}
                          value={part.customerName}
                          onChange={(e) => updateSplitCustomerName(part.id, e.target.value)}
                          placeholder="Masukkan nama customer"
                        />
                      </div>

                      {/* Assigned Items */}
                      <div>
                        <Label>Items ({part.items.length})</Label>
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                          {part.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Belum ada item di-assign
                            </p>
                          ) : (
                            part.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.quantity}× {item.name}</span>
                                <span>{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Split Total */}
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex justify-between font-semibold">
                          <span>Total Split {part.id}:</span>
                          <span className="text-green-600">
                            {formatCurrency(calculateSplitTotal(part.items))}
                          </span>
                        </div>
                      </div>

                      {/* Process Payment Button */}
                      {part.paid ? (
                        <Button
                          disabled
                          className="w-full"
                          size="sm"
                          variant="outline"
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Sudah Dibayar
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSplitPayment(part)}
                          disabled={part.items.length === 0 || !part.customerName.trim()}
                          className="w-full"
                          size="sm"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Proses Pembayaran
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm">Total Splits: {splitParts.length}</p>
                    <p className="text-sm">
                      Total Assigned: {formatCurrency(splitParts.reduce((sum, part) => 
                        sum + calculateSplitTotal(part.items), 0
                      ))}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Original Bill</h4>
                    <p className="text-sm">Items: {cart.length}</p>
                    <p className="text-sm">Total: {formatCurrency(total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitBill(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Reason Dialog (New Notification-Based System) */}
      <Dialog open={showDeletionReason} onOpenChange={setShowDeletionReason}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Permintaan Penghapusan Item</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Informasi:</strong> Penghapusan item dari Open Bill memerlukan persetujuan admin. 
                Mohon berikan alasan penghapusan, dan admin akan menerima notifikasi untuk menyetujui permintaan Anda.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletionReason">Alasan Penghapusan <span className="text-destructive">*</span></Label>
              <Input
                id="deletionReason"
                type="text"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Contoh: Customer berubah pikiran"
                disabled={requestDeletionMutation.isPending}
                data-testid="input-deletion-reason"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !requestDeletionMutation.isPending) {
                    handleSubmitDeletionRequest();
                  }
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeletionReason(false);
                setPendingDeletion(null);
                setDeletionReason("");
              }}
              disabled={requestDeletionMutation.isPending}
              data-testid="button-cancel-deletion-request"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSubmitDeletionRequest}
              disabled={requestDeletionMutation.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-submit-deletion-request"
            >
              {requestDeletionMutation.isPending ? "Mengirim..." : "Kirim Permintaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Open Bill Deletion Verification Dialog */}
      <Dialog open={showDeletionVerification} onOpenChange={setShowDeletionVerification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Verifikasi Penghapusan Item</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Perhatian:</strong> Anda akan menghapus <strong>{pendingDeleteItem?.itemName}</strong> dari Open Bill.
                Pilih metode keamanan untuk melanjutkan.
              </p>
            </div>

            {/* Security Method Selection */}
            <div className="space-y-3">
              <Label>Pilih Metode Keamanan</Label>
              <div className="space-y-2">
                <div 
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    securityMethod === 'approval' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSecurityMethod('approval')}
                  data-testid="option-approval"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      securityMethod === 'approval' ? 'border-primary' : 'border-gray-300'
                    }`}>
                      {securityMethod === 'approval' && (
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Notifikasi Real-Time ke Admin</h4>
                      <p className="text-xs text-muted-foreground">
                        Kirim permintaan ke admin untuk approve/reject
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    securityMethod === 'pin' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSecurityMethod('pin')}
                  data-testid="option-pin"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      securityMethod === 'pin' ? 'border-primary' : 'border-gray-300'
                    }`}>
                      {securityMethod === 'pin' && (
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Kode Unik Admin (PIN)</h4>
                      <p className="text-xs text-muted-foreground">
                        Masukkan PIN rahasia yang hanya diketahui Admin/Manager
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditional Input Fields */}
            {securityMethod === 'pin' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="adminPin">PIN Admin <span className="text-destructive">*</span></Label>
                  <Input
                    id="adminPin"
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Masukkan PIN admin"
                    disabled={deleteWithPinMutation.isPending}
                    data-testid="input-admin-pin"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !deleteWithPinMutation.isPending) {
                        processDeletionVerification();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deletionReasonPin">Alasan Penghapusan <span className="text-destructive">*</span></Label>
                  <Input
                    id="deletionReasonPin"
                    type="text"
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Contoh: Customer berubah pikiran"
                    disabled={deleteWithPinMutation.isPending}
                    data-testid="input-deletion-reason-pin"
                  />
                </div>
              </>
            )}

            {securityMethod === 'approval' && (
              <div className="space-y-2">
                <Label htmlFor="deletionReasonEdit">Alasan Penghapusan <span className="text-destructive">*</span></Label>
                <Input
                  id="deletionReasonEdit"
                  type="text"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Contoh: Customer berubah pikiran"
                  disabled={requestDeletionMutation.isPending}
                  data-testid="input-deletion-reason-edit"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeletionVerification(false);
                setPendingDeleteItem(null);
                setAdminPin("");
                setDeletionReason("");
              }}
              disabled={deleteWithPinMutation.isPending || requestDeletionMutation.isPending}
              data-testid="button-cancel-verification"
            >
              Batal
            </Button>
            <Button 
              onClick={processDeletionVerification}
              disabled={deleteWithPinMutation.isPending || requestDeletionMutation.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-confirm-deletion"
            >
              {deleteWithPinMutation.isPending || requestDeletionMutation.isPending 
                ? "Memproses..." 
                : securityMethod === 'pin' 
                  ? "Verifikasi & Hapus" 
                  : "Kirim Permintaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}