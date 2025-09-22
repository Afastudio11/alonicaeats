import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, Printer, Play, RefreshCw, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs as TabsContainer, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";
import { printKitchenTicket } from "@/utils/thermal-print";
import type { Order, OrderItem, Category, MenuItem } from "@shared/schema";

export default function KitchenSection() {
  const [activeTab, setActiveTab] = useState("kitchen");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
    staleTime: 300000, // Cache for 5 minutes
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onMutate: async ({ orderId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/orders'] });
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData<Order[]>(['/api/orders']);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Order[]>(['/api/orders'], (old) => {
        if (!old) return old;
        return old.map(order => 
          order.id === orderId 
            ? { ...order, status, updatedAt: new Date() }
            : order
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousOrders };
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      if (status === 'preparing') {
        toast({
          title: "Pesanan dimulai",
          description: "Pesanan telah masuk ke dapur untuk diproses",
        });
      } else {
        toast({
          title: "Status berhasil diupdate",
          description: "Status pesanan telah diperbarui",
        });
      }
    },
    onError: (err, variables, context) => {
      // If we have a previous value, rollback to it
      if (context?.previousOrders) {
        queryClient.setQueryData(['/api/orders'], context.previousOrders);
      }
      toast({
        title: "Gagal update status",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Separate mutation for auto-completing orders
  const autoCompleteMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'completed' });
      return response.json();
    },
    onMutate: async ({ orderId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/orders'] });
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData<Order[]>(['/api/orders']);
      
      // Optimistically update to completed
      queryClient.setQueryData<Order[]>(['/api/orders'], (old) => {
        if (!old) return old;
        return old.map(order => 
          order.id === orderId 
            ? { ...order, status: 'completed', updatedAt: new Date() }
            : order
        );
      });
      
      return { previousOrders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Pesanan selesai",
        description: "Pesanan telah otomatis diselesaikan dan siap disajikan",
      });
    },
    onError: (err, variables, context) => {
      // If auto-complete fails, rollback to the previous state (should be 'ready')
      if (context?.previousOrders) {
        queryClient.setQueryData(['/api/orders'], context.previousOrders);
      }
      toast({
        title: "Gagal menyelesaikan pesanan",
        description: "Pesanan tetap dalam status siap saji. Silakan selesaikan manual",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Helper function to check if an order contains only drinks
  const isDrinkOnlyOrder = (order: Order): boolean => {
    const orderItems = order.items as OrderItem[];
    if (!orderItems.length) return false;
    
    return orderItems.every(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      if (!menuItem) return false;
      
      const category = categories.find(cat => cat.id === menuItem.categoryId);
      return category?.name.toLowerCase().includes('minuman');
    });
  };

  // Helper function to check if an order contains drink items
  const hasDrinkItems = (order: Order): boolean => {
    const orderItems = order.items as OrderItem[];
    if (!orderItems.length) return false;
    
    return orderItems.some(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      if (!menuItem) return false;
      
      const category = categories.find(cat => cat.id === menuItem.categoryId);
      return category?.name.toLowerCase().includes('minuman');
    });
  };

  // Helper function to check if an order contains food items
  const hasFoodItems = (order: Order): boolean => {
    const orderItems = order.items as OrderItem[];
    if (!orderItems.length) return true; // Default to kitchen if no items found
    
    return orderItems.some(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      if (!menuItem) return true; // Default to kitchen if menu item not found
      
      const category = categories.find(cat => cat.id === menuItem.categoryId);
      return !category?.name.toLowerCase().includes('minuman');
    });
  };

  // Filter orders for kitchen and bar - only pending and preparing orders
  const allActiveOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
  );

  // Separate orders by type - mixed orders appear in both tabs
  const kitchenOrders = allActiveOrders.filter(order => hasFoodItems(order));
  const barOrders = allActiveOrders.filter(order => hasDrinkItems(order));

  // Separate pending and preparing orders for kitchen
  const pendingKitchenOrders = kitchenOrders.filter(order => order.status === 'pending');
  const preparingKitchenOrders = kitchenOrders.filter(order => order.status === 'preparing');

  // Separate pending and preparing orders for bar
  const pendingBarOrders = barOrders.filter(order => order.status === 'pending');
  const preparingBarOrders = barOrders.filter(order => order.status === 'preparing');

  const handleStartCooking = (order: Order) => {
    updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' });
  };

  const handleMarkReady = (orderId: string, fromStation?: "kitchen" | "bar") => {
    const order = orders.find(o => o.id === orderId);
    
    // Only change order status to 'ready' if:
    // 1. Called from kitchen, OR
    // 2. Called from bar and the order contains only drinks
    const shouldMarkReady = fromStation === 'kitchen' || 
      (fromStation === 'bar' && order && isDrinkOnlyOrder(order));
    
    if (shouldMarkReady) {
      // Update to 'ready'
      updateStatusMutation.mutate(
        { orderId, status: 'ready' },
        {
          onSuccess: () => {
            // Auto-complete logic remains the same
            const shouldAutoComplete = fromStation === 'kitchen' || 
              (fromStation === 'bar' && order && isDrinkOnlyOrder(order));
            
            if (shouldAutoComplete) {
              // After successfully marking as ready, automatically complete the order
              setTimeout(() => {
                autoCompleteMutation.mutate({ orderId });
              }, 500); // Small delay to ensure the ready state is visible
            }
          }
        }
      );
    } else {
      // For bar items in mixed orders, just show a message without changing order status
      toast({
        title: "Minuman siap",
        description: "Minuman sudah siap, menunggu makanan selesai dari dapur",
      });
    }
  };

  const handlePrintKitchenTicket = (order: Order, station?: "kitchen" | "bar") => {
    const orderItems = order.items as OrderItem[];
    
    // Filter items based on station type and enrich with menu item details
    const filteredItems = station ? orderItems.filter(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      if (!menuItem) return station === 'kitchen'; // Default to kitchen if item not found
      
      const category = categories.find(cat => cat.id === menuItem.categoryId);
      const isDrink = category?.name.toLowerCase().trim().includes('minuman');
      
      return station === 'bar' ? isDrink : !isDrink;
    }).map(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      return {
        ...orderItem,
        name: menuItem?.name || orderItem.name || 'Item'
      };
    }) : orderItems.map(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
      return {
        ...orderItem,
        name: menuItem?.name || orderItem.name || 'Item'
      };
    });

    // Guard against empty tickets
    if (filteredItems.length === 0) {
      toast({
        title: "Tidak ada item untuk dicetak",
        description: `Tidak ada ${station === 'bar' ? 'minuman' : 'makanan'} dalam pesanan ini`,
        variant: "destructive",
      });
      return;
    }

    // Print the ticket with filtered items
    printKitchenTicket(order, station, filteredItems);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-4 animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Dapur & Bar</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
            data-testid="button-refresh-orders"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Tabs for Kitchen and Bar */}
        <TabsContainer defaultValue="kitchen" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kitchen" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Dapur ({kitchenOrders.length})
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <Wine className="h-4 w-4" />
              Bar ({barOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Kitchen Tab Content */}
          <TabsContent value="kitchen" className="space-y-6">
            {/* Kitchen Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pesanan Baru</p>
                    <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending-kitchen-orders">
                      {pendingKitchenOrders.length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sedang Dimasak</p>
                    <p className="text-3xl font-bold text-blue-600" data-testid="stat-preparing-kitchen-orders">
                      {preparingKitchenOrders.length}
                    </p>
                  </div>
                  <ChefHat className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Aktif</p>
                    <p className="text-3xl font-bold text-primary" data-testid="stat-total-kitchen-active">
                      {kitchenOrders.length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Kitchen Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Kitchen Orders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pesanan Baru ({pendingKitchenOrders.length})
                </h3>
                {pendingKitchenOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    onStartCooking={() => handleStartCooking(order)}
                    onPrint={() => handlePrintKitchenTicket(order, "kitchen")}
                    isPrimary={true}
                    filterType="kitchen"
                    menuItems={menuItems}
                    categories={categories}
                  />
                ))}
                {pendingKitchenOrders.length === 0 && (
                  <div className="alonica-card p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-pending-kitchen-orders">
                      Tidak ada pesanan makanan baru
                    </p>
                  </div>
                )}
              </div>

              {/* Preparing Kitchen Orders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-blue-600" />
                  Sedang Dimasak ({preparingKitchenOrders.length})
                </h3>
                {preparingKitchenOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    onMarkReady={() => handleMarkReady(order.id, "kitchen")}
                    onPrint={() => handlePrintKitchenTicket(order, "kitchen")}
                    isPrimary={false}
                    filterType="kitchen"
                    menuItems={menuItems}
                    categories={categories}
                  />
                ))}
                {preparingKitchenOrders.length === 0 && (
                  <div className="alonica-card p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-preparing-kitchen-orders">
                      Tidak ada makanan sedang dimasak
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Bar Tab Content */}
          <TabsContent value="bar" className="space-y-6">
            {/* Bar Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pesanan Baru</p>
                    <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending-bar-orders">
                      {pendingBarOrders.length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sedang Dibuat</p>
                    <p className="text-3xl font-bold text-purple-600" data-testid="stat-preparing-bar-orders">
                      {preparingBarOrders.length}
                    </p>
                  </div>
                  <Wine className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="alonica-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Aktif</p>
                    <p className="text-3xl font-bold text-primary" data-testid="stat-total-bar-active">
                      {barOrders.length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Bar Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Bar Orders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pesanan Baru ({pendingBarOrders.length})
                </h3>
                {pendingBarOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    onStartCooking={() => handleStartCooking(order)}
                    onPrint={() => handlePrintKitchenTicket(order, "bar")}
                    isPrimary={true}
                    filterType="bar"
                    menuItems={menuItems}
                    categories={categories}
                  />
                ))}
                {pendingBarOrders.length === 0 && (
                  <div className="alonica-card p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-pending-bar-orders">
                      Tidak ada pesanan minuman baru
                    </p>
                  </div>
                )}
              </div>

              {/* Preparing Bar Orders */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wine className="h-5 w-5 text-purple-600" />
                  Sedang Dibuat ({preparingBarOrders.length})
                </h3>
                {preparingBarOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    onMarkReady={() => handleMarkReady(order.id, "bar")}
                    onPrint={() => handlePrintKitchenTicket(order, "bar")}
                    isPrimary={false}
                    filterType="bar"
                    menuItems={menuItems}
                    categories={categories}
                  />
                ))}
                {preparingBarOrders.length === 0 && (
                  <div className="alonica-card p-8 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-preparing-bar-orders">
                      Tidak ada minuman sedang dibuat
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </TabsContainer>
    </div>
  );
}

interface KitchenOrderCardProps {
  order: Order;
  onStartCooking?: () => void;
  onMarkReady?: () => void;
  onPrint: () => void;
  isPrimary: boolean;
  filterType?: "kitchen" | "bar";
  menuItems?: MenuItem[];
  categories?: Category[];
}

function KitchenOrderCard({ order, onStartCooking, onMarkReady, onPrint, isPrimary, filterType, menuItems = [], categories = [] }: KitchenOrderCardProps) {
  const orderItems = order.items as OrderItem[];
  const statusColor = getOrderStatusColor(order.status);
  
  // Filter items based on the current view (kitchen or bar)
  const filteredItems = filterType ? orderItems.filter(orderItem => {
    const menuItem = menuItems.find(mi => mi.id === orderItem.itemId);
    if (!menuItem) return filterType === 'kitchen'; // Default to kitchen if item not found
    
    const category = categories.find(cat => cat.id === menuItem.categoryId);
    const isDrink = category?.name.toLowerCase().includes('minuman');
    
    return filterType === 'bar' ? isDrink : !isDrink;
  }) : orderItems;

  // Don't render if no items match the filter
  if (filteredItems.length === 0) return null;
  
  return (
    <div className="alonica-card overflow-hidden" data-testid={`card-kitchen-order-${order.id}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-foreground" data-testid={`text-order-customer-${order.id}`}>
              {order.customerName}
            </h4>
            <Badge 
              className={statusColor}
              data-testid={`badge-order-status-${order.id}`}
            >
              {order.status === 'pending' ? 'Menunggu' : (filterType === 'bar' ? 'Dibuat' : 'Dimasak')}
            </Badge>
            {filterType && (
              <Badge variant="outline" className="text-xs">
                {filterType === 'bar' ? 'Bar' : 'Dapur'}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Meja</p>
            <p className="font-semibold" data-testid={`text-table-${order.id}`}>
              {order.tableNumber}
            </p>
          </div>
        </div>

        {/* Order Time */}
        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-order-time-${order.id}`}>
          {formatDate(new Date(order.createdAt))}
        </p>

        {/* Items - show only relevant items */}
        <div className="space-y-2 mb-4">
          {filteredItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <span className="font-medium" data-testid={`text-item-name-${order.id}-${index}`}>
                  {item.quantity}x {item.name}
                </span>
                {item.notes && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-item-notes-${order.id}-${index}`}>
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
          {filterType && filteredItems.length < orderItems.length && (
            <p className="text-xs text-muted-foreground italic">
              {orderItems.length - filteredItems.length} item lainnya ada di {filterType === 'bar' ? 'dapur' : 'bar'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isPrimary && onStartCooking && (
            <Button
              onClick={onStartCooking}
              className="flex-1 flex items-center gap-2"
              data-testid={`button-start-cooking-${order.id}`}
            >
              <Play className="h-4 w-4" />
              {filterType === 'bar' ? 'Mulai Buat' : 'Mulai Masak'}
            </Button>
          )}
          
          {!isPrimary && onMarkReady && (
            <Button
              onClick={onMarkReady}
              className="flex-1 flex items-center gap-2"
              data-testid={`button-mark-ready-${order.id}`}
            >
              <CheckCircle className="h-4 w-4" />
              Siap Saji
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="flex items-center gap-2"
            data-testid={`button-print-ticket-${order.id}`}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

