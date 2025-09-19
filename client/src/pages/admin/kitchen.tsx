import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, Printer, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";
import type { Order, OrderItem } from "@shared/schema";

export default function KitchenSection() {
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    staleTime: 0,
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
            ? { ...order, status, updatedAt: new Date().toISOString() }
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
            ? { ...order, status: 'completed', updatedAt: new Date().toISOString() }
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

  // Filter orders for kitchen - only pending and preparing orders
  const kitchenOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
  );

  // Separate pending and preparing orders
  const pendingOrders = kitchenOrders.filter(order => order.status === 'pending');
  const preparingOrders = kitchenOrders.filter(order => order.status === 'preparing');

  const handleStartCooking = (order: Order) => {
    updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' });
  };

  const handleMarkReady = (orderId: string) => {
    // First update to 'ready', then auto-complete to 'completed'
    updateStatusMutation.mutate(
      { orderId, status: 'ready' },
      {
        onSuccess: () => {
          // After successfully marking as ready, automatically complete the order
          setTimeout(() => {
            autoCompleteMutation.mutate({ orderId });
          }, 500); // Small delay to ensure the ready state is visible
        }
      }
    );
  };

  const printKitchenTicket = (order: Order) => {
    setPrintingOrder(order);
    // Use browser's print functionality
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 100);
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
      {/* Hidden print ticket - only visible during printing */}
      {printingOrder && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-50">
          <KitchenTicket order={printingOrder} />
        </div>
      )}

      {/* Main content - hidden during printing when ticket is showing */}
      <div className={printingOrder ? "print:hidden" : ""}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Dapur</h2>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="alonica-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pesanan Baru</p>
              <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending-orders">
                {pendingOrders.length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="alonica-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sedang Dimasak</p>
              <p className="text-3xl font-bold text-blue-600" data-testid="stat-preparing-orders">
                {preparingOrders.length}
              </p>
            </div>
            <ChefHat className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="alonica-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Aktif</p>
              <p className="text-3xl font-bold text-primary" data-testid="stat-total-active">
                {kitchenOrders.length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pesanan Baru ({pendingOrders.length})
          </h3>
          {pendingOrders.map((order) => (
            <KitchenOrderCard 
              key={order.id} 
              order={order} 
              onStartCooking={() => handleStartCooking(order)}
              onPrint={() => printKitchenTicket(order)}
              isPrimary={true}
            />
          ))}
          {pendingOrders.length === 0 && (
            <div className="alonica-card p-8 text-center">
              <p className="text-muted-foreground" data-testid="text-no-pending-orders">
                Tidak ada pesanan baru
              </p>
            </div>
          )}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-blue-600" />
            Sedang Dimasak ({preparingOrders.length})
          </h3>
          {preparingOrders.map((order) => (
            <KitchenOrderCard 
              key={order.id} 
              order={order} 
              onMarkReady={() => handleMarkReady(order.id)}
              onPrint={() => printKitchenTicket(order)}
              isPrimary={false}
            />
          ))}
          {preparingOrders.length === 0 && (
            <div className="alonica-card p-8 text-center">
              <p className="text-muted-foreground" data-testid="text-no-preparing-orders">
                Tidak ada pesanan sedang dimasak
              </p>
            </div>
          )}
        </div>
      </div>
      </div> {/* Close main content div */}
    </div>
  );
}

interface KitchenOrderCardProps {
  order: Order;
  onStartCooking?: () => void;
  onMarkReady?: () => void;
  onPrint: () => void;
  isPrimary: boolean;
}

function KitchenOrderCard({ order, onStartCooking, onMarkReady, onPrint, isPrimary }: KitchenOrderCardProps) {
  const orderItems = order.items as OrderItem[];
  const statusColor = getOrderStatusColor(order.status);
  
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
              {order.status === 'pending' ? 'Menunggu' : 'Dimasak'}
            </Badge>
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

        {/* Items */}
        <div className="space-y-2 mb-4">
          {orderItems.map((item, index) => (
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
              Mulai Masak
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

interface KitchenTicketProps {
  order: Order;
}

function KitchenTicket({ order }: KitchenTicketProps) {
  const orderItems = order.items as OrderItem[];
  
  return (
    <div className="kitchen-ticket bg-white p-6 max-w-sm mx-auto font-mono text-sm">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">ALONICA KITCHEN</h1>
        <h2 className="text-md font-semibold">KITCHEN ORDER TICKET</h2>
        <div className="border-t border-dashed border-gray-400 my-2"></div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between">
          <span>Order ID:</span>
          <span className="font-semibold">{order.id.slice(-8)}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span className="font-semibold">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>Table:</span>
          <span className="font-semibold">{order.tableNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span>{formatDate(new Date(order.createdAt))}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">ITEMS TO PREPARE:</h3>
        {orderItems.map((item, index) => (
          <div key={index} className="mb-3">
            <div className="flex justify-between font-semibold">
              <span>{item.quantity}x</span>
              <span className="flex-1 ml-2">{item.name}</span>
            </div>
            {item.notes && (
              <div className="text-xs text-gray-600 ml-4">
                ** {item.notes} **
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>

      <div className="text-center text-xs">
        <p>STATUS: {order.status.toUpperCase()}</p>
        <p>Printed: {new Date().toLocaleString()}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2"></div>
      
      <div className="text-center text-xs">
        <p>** KITCHEN COPY **</p>
        <p>Please prepare items as ordered</p>
      </div>
    </div>
  );
}