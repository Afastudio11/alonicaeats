import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, User, Table, Receipt, Calculator, Printer, FileText, Send, Eye, Split, Search } from "lucide-react";
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
  
  // Category & search state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Payment & receipt state
  const [showPaymentCalculator, setShowPaymentCalculator] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  
  // Open bills state
  const [showOpenBills, setShowOpenBills] = useState(false);
  const [viewingBill, setViewingBill] = useState<Order | null>(null);
  const [editingBill, setEditingBill] = useState<Order | null>(null);
  
  // Admin approval state for item cancellation
  const [showAdminApproval, setShowAdminApproval] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingCancellation, setPendingCancellation] = useState<{billId: string, itemIndex: number} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Split bill state
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitParts, setSplitParts] = useState<{id: number, items: CartItem[], customerName: string, paid?: boolean}[]>([]);
  const [currentSplit, setCurrentSplit] = useState(1);
  const [paymentContext, setPaymentContext] = useState<{
    mode: 'cart' | 'split' | 'open_bill',
    splitId?: number,
    billId?: string,
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

  // Handle item cancellation request (triggers admin approval)
  const handleRequestItemCancellation = (billId: string, itemIndex: number) => {
    setPendingCancellation({ billId, itemIndex });
    setShowAdminApproval(true);
    setAdminUsername("");
    setAdminPassword("");
  };

  // Verify admin credentials and process cancellation
  const handleAdminApproval = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast({
        title: "Input tidak lengkap",
        description: "Mohon masukkan username dan password admin",
        variant: "destructive",
      });
      return;
    }

    if (!pendingCancellation) {
      toast({
        title: "Error",
        description: "Tidak ada pending cancellation",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Verify admin credentials
      const verifyResponse = await apiRequest('POST', '/api/auth/verify-admin', {
        username: adminUsername,
        password: adminPassword
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.verified) {
        toast({
          title: "Verifikasi gagal",
          description: "Kredensial admin tidak valid",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      // Find the bill and remove the item
      const bill = openBills.find(b => b.id === pendingCancellation.billId);
      if (!bill) {
        toast({
          title: "Bill tidak ditemukan",
          description: "Bill mungkin sudah dihapus",
          variant: "destructive",
        });
        setIsVerifying(false);
        setShowAdminApproval(false);
        setPendingCancellation(null);
        return;
      }

      // Create updated items array without the cancelled item
      const updatedItems = Array.isArray(bill.items) 
        ? bill.items.filter((_, index) => index !== pendingCancellation.itemIndex)
        : [];

      if (updatedItems.length === 0) {
        toast({
          title: "Tidak dapat cancel",
          description: "Tidak bisa menghapus semua item. Gunakan delete bill untuk menghapus seluruh bill.",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      // Recalculate totals
      const newSubtotal = updatedItems.reduce((sum: number, item: any) => 
        sum + ((item.price || 0) * (item.quantity || 0)), 0);
      
      // Update the bill with new items
      const updateResponse = await apiRequest('PUT', `/api/orders/${bill.id}`, {
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal,
        discount: 0
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update bill");
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });

      toast({
        title: "Item berhasil dicancel",
        description: `Item telah dihapus dari bill dengan approval admin ${verifyResult.adminUsername}`,
      });

      // Close dialogs and reset state
      setShowAdminApproval(false);
      setPendingCancellation(null);
      setAdminUsername("");
      setAdminPassword("");
      
      // Refresh the viewing bill if it's still open
      if (viewingBill && viewingBill.id === bill.id) {
        const updatedBill = await (await apiRequest('GET', `/api/orders/${bill.id}`)).json();
        setViewingBill(updatedBill);
      }

      refetchOpenBills();

    } catch (error) {
      console.error("Admin approval error:", error);
      toast({
        title: "Gagal memverifikasi admin",
        description: "Terjadi kesalahan saat memverifikasi kredensial admin",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
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

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; // No tax or discount for now
  
  // Payment calculation - use payment context if available
  const cashAmountNumber = parseFloat(cashAmount) || 0;
  const currentPaymentTotal = paymentContext ? paymentContext.total : total;
  const change = cashAmountNumber >= currentPaymentTotal ? cashAmountNumber - currentPaymentTotal : 0;
  
  // Handle payment for open bills
  const handlePayOpenBill = (bill: Order) => {
    // Set payment context for open bill
    setPaymentContext({
      mode: 'open_bill' as any,
      billId: bill.id,
      total: bill.total,
      items: Array.isArray(bill.items) ? bill.items.map((item: any) => ({
        id: item.itemId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ""
      })) : [],
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
        // Regular new order payment
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
          subtotal: paymentContext.total,
          discount: 0,
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

    // Set payment context for regular cart payment
    setPaymentContext({
      mode: 'cart',
      total,
      items: cart,
      customerName: customerName.trim()
    });

    setShowPaymentCalculator(true);
    setCashAmount("");
  };

  // Edit existing open bill
  const handleEditOpenBill = (bill: Order) => {
    // Load bill data into current form
    setCustomerName(bill.customerName);
    setTableNumber(bill.tableNumber);
    setEditingBill(bill);
    
    // Convert bill items to cart format
    const billItems = Array.isArray(bill.items) ? bill.items : [];
    const cartItems: CartItem[] = billItems.map((item: any) => ({
      id: item.itemId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes || ""
    }));
    
    setCart(cartItems);
    
    toast({
      title: "Open Bill dimuat",
      description: `Bill untuk ${bill.customerName} - Meja ${bill.tableNumber} dimuat untuk editing`,
    });
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
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

    // Set payment context for this split
    const splitTotal = calculateSplitTotal(part.items);
    setPaymentContext({
      mode: 'split',
      splitId: part.id,
      total: splitTotal,
      items: part.items,
      customerName: part.customerName.trim()
    });

    // Show payment calculator
    setShowPaymentCalculator(true);
    setCashAmount("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="alonica-card p-4">
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

      {/* Open Bills Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Open Bills</span>
                <Badge variant="secondary" data-testid="open-bills-count">
                  {openBills.length}
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOpenBills(!showOpenBills)}
                data-testid="toggle-open-bills"
              >
                {showOpenBills ? 'Sembunyikan' : 'Tampilkan'} Open Bills
              </Button>
            </div>
          </CardHeader>
          {showOpenBills && (
            <CardContent>
              {openBills.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Tidak ada open bills</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openBills.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{bill.customerName}</h4>
                            <p className="text-sm text-muted-foreground">Meja {bill.tableNumber}</p>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Open
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {new Date(bill.createdAt).toLocaleString('id-ID')}
                        </p>
                        <p className="font-semibold text-lg mb-3">
                          {formatCurrency(bill.total)}
                        </p>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingBill(bill)}
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOpenBill(bill)}
                              className="flex-1"
                              data-testid={`button-edit-bill-${bill.id}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90"
                            onClick={() => handlePayOpenBill(bill)}
                            data-testid={`button-pay-bill-${bill.id}`}
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Bayar Bill
                          </Button>
                          <div className="w-full bg-green-50 border border-green-200 rounded-md p-2 text-center">
                            <div className="flex items-center justify-center text-green-700">
                              <Send className="h-4 w-4 mr-1" />
                              <span className="text-sm font-medium">Sudah Masuk ke Dapur</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">Open bill otomatis dikirim ke dapur</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
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
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari menu item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-menu"
                  />
                </div>
              </div>

              {/* Horizontal Scrollable Categories */}
              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {/* All Categories Button */}
                    <Button
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="whitespace-nowrap flex-shrink-0"
                      data-testid="button-category-all"
                    >
                      Semua
                    </Button>
                    
                    {/* Category Buttons */}
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="whitespace-nowrap flex-shrink-0"
                        data-testid={`button-category-${category.name.toLowerCase()}`}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredMenuItems.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex flex-col space-y-2">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]" data-testid={`menu-item-${item.id}`}>
                              {item.name}
                            </h3>
                            <div className="bg-gray-100 rounded-lg px-2 py-1.5 border border-gray-200" data-testid={`price-${item.id}`}>
                              <div className="flex items-baseline gap-1 justify-center">
                                <span className="text-xs font-medium text-gray-600">Rp</span>
                                <span className="text-sm font-bold text-primary">
                                  {item.price.toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                            <Button
                              onClick={() => addToCart(item)}
                              className="w-full"
                              size="sm"
                              data-testid={`button-add-${item.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Tambah
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Customer Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Info Customer</span>
                  {editingBill && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Edit Mode
                    </Badge>
                  )}
                </div>
                {editingBill && (
                  <Button
                    variant="outline"
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
                  >
                    Batal Edit
                  </Button>
                )}
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
                  disabled={!!editingBill}
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

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {/* Show split warning if unpaid assignments exist */}
                    {getUnpaidAssignedCount() > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Split Bill Aktif:</strong> {getUnpaidAssignedCount()} items di-assign ke unpaid splits.
                        </p>
                        <Button
                          onClick={cancelSplitBill}
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                        >
                          Batal Split Bill
                        </Button>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleSubmitOrder}
                      disabled={createOrderMutation.isPending || getUnpaidAssignedCount() > 0}
                      className="w-full"
                      data-testid="button-submit-order"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      {createOrderMutation.isPending ? "Memproses..." : "Hitung Pembayaran"}
                    </Button>
                    
                    <Button
                      onClick={handleCreateOpenBill}
                      disabled={createOpenBillMutation.isPending || getUnpaidAssignedCount() > 0}
                      variant="outline"
                      className="w-full"
                      data-testid="button-create-open-bill"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {createOpenBillMutation.isPending 
                        ? "Menyimpan..." 
                        : editingBill 
                          ? "Update Open Bill" 
                          : "Simpan sebagai Open Bill"}
                    </Button>
                    
                    <Button
                      onClick={initiateSplitBill}
                      variant="outline"
                      className="w-full"
                      data-testid="button-split-bill"
                      disabled={splitParts.length > 0}
                    >
                      <Split className="h-4 w-4 mr-2" />
                      {splitParts.length > 0 ? "Split Bill Aktif" : "Split Bill"}
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
              <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={(value: "cash" | "qris") => setPaymentMethod(value)}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="qris">📱 QRIS</SelectItem>
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
                  <span className="text-2xl">📱</span>
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
              disabled={paymentMethod === "cash" && cashAmountNumber < total}
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
                        onClick={() => handleRequestItemCancellation(viewingBill.id, index)}
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

      {/* Admin Approval Dialog for Item Cancellation */}
      <Dialog open={showAdminApproval} onOpenChange={setShowAdminApproval}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Persetujuan Admin Diperlukan</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Peringatan:</strong> Anda mencoba mencancel item dari Open Bill. 
                Tindakan ini memerlukan persetujuan admin untuk mencegah kesalahan atau penghapusan yang tidak sah.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="adminUsername">Username Admin</Label>
                <Input
                  id="adminUsername"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Masukkan username admin"
                  disabled={isVerifying}
                  data-testid="input-admin-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password Admin</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  disabled={isVerifying}
                  data-testid="input-admin-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isVerifying) {
                      handleAdminApproval();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAdminApproval(false);
                setPendingCancellation(null);
                setAdminUsername("");
                setAdminPassword("");
              }}
              disabled={isVerifying}
              data-testid="button-cancel-admin-approval"
            >
              Batal
            </Button>
            <Button 
              onClick={handleAdminApproval}
              disabled={isVerifying || !adminUsername.trim() || !adminPassword.trim()}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-admin-approval"
            >
              {isVerifying ? "Memverifikasi..." : "Verifikasi & Cancel Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}