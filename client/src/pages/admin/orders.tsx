import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShoppingBag, CheckCircle, Clock, DollarSign, Eye, X, Receipt, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import { smartPrintReceipt } from "@/utils/thermal-print";
import type { Order, OrderItem } from "@shared/schema";

export default function OrdersSection() {
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
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
            ? { ...order, orderStatus: status, updatedAt: new Date() }
            : order
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousOrders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status berhasil diupdate",
        description: "Status pesanan telah diperbarui",
      });
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


  // Calculate stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(order => 
    new Date(order.createdAt).toDateString() === today
  );

  const stats = {
    totalToday: todayOrders.length,
    completed: todayOrders.filter(order => order.orderStatus === 'served').length,
    pending: todayOrders.filter(order => order.orderStatus === 'queued').length,
    revenue: todayOrders.reduce((sum, order) => sum + order.total, 0)
  };

  const handleStatusUpdate = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };



  // Helper function to check if order date matches filter
  const isOrderInDateRange = (order: Order, filter: string): boolean => {
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (filter) {
      case "today":
        return orderDate.toDateString() === today.toDateString();
      case "yesterday":
        return orderDate.toDateString() === yesterday.toDateString();
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      case "30days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      case "all":
      default:
        return true;
    }
  };

  // Sort and filter orders based on statusFilter and dateFilter (memoized for performance)
  const filteredAndSortedOrders = useMemo(() => {
    return orders
      .filter(order => statusFilter === "all" || order.orderStatus === statusFilter)
      .filter(order => isOrderInDateRange(order, dateFilter))
      .sort((a, b) => {
        // Sort by status priority: queued -> preparing -> ready -> served
        const statusOrder = { queued: 0, preparing: 1, ready: 2, served: 3, cancelled: 4 };
        const aOrder = statusOrder[a.orderStatus as keyof typeof statusOrder] ?? 5;
        const bOrder = statusOrder[b.orderStatus as keyof typeof statusOrder] ?? 5;
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // If same status, sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [orders, statusFilter, dateFilter]);

  const handlePrintReceipt = async (order: Order) => {
    await smartPrintReceipt(order);
  };

  const handleViewReceipt = (order: Order) => {
    setViewingReceipt(order);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-4 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
        <div className="alonica-card p-4 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="alonica-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders Today</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-total-orders">
                {stats.totalToday}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="alonica-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed Orders</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-completed-orders">
                {stats.completed}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="alonica-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-pending-orders">
                {stats.pending}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="alonica-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue Today</p>
              <p className="text-3xl font-bold text-foreground" data-testid="stat-revenue">
                {formatCurrency(stats.revenue)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>


      {/* Recent Orders Table */}
      <div className="alonica-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="preparing">Sedang Dimasak</SelectItem>
                <SelectItem value="ready">Siap</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
                <SelectValue placeholder="Filter berdasarkan tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tanggal</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="yesterday">Kemarin</SelectItem>
                <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                <SelectItem value="30days">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
            data-testid="button-refresh-orders"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/4">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {filteredAndSortedOrders.map((order) => (
                <tr key={order.id} data-testid={`row-order-${order.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.tableNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground w-1/4">
                    <div className="space-y-1 max-w-xs">
                      {Array.isArray(order.items) && order.items.length > 0
                        ? order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="truncate flex-1 pr-2">{item.name}</span>
                              <span className="text-muted-foreground whitespace-nowrap">x{item.quantity}</span>
                            </div>
                          ))
                        : <span className="text-muted-foreground">No items</span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      className={getOrderStatusColor(order.orderStatus)}
                      data-testid={`status-${order.id}`}
                    >
                      {ORDER_STATUSES[order.orderStatus as keyof typeof ORDER_STATUSES] || order.orderStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(new Date(order.createdAt))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {order.orderStatus === 'queued' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="bg-blue-500 hover:bg-blue-600"
                        data-testid={`button-accept-${order.id}`}
                      >
                        Accept
                      </Button>
                    )}
                    {order.orderStatus === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="bg-green-500 hover:bg-green-600"
                        data-testid={`button-ready-${order.id}`}
                      >
                        Ready
                      </Button>
                    )}
                    {order.orderStatus === 'ready' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'served')}
                        data-testid={`button-complete-${order.id}`}
                      >
                        Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingOrder(order)}
                      data-testid={`button-view-${order.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintReceipt(order)}
                      className="bg-green-50 hover:bg-green-100 text-green-700"
                      data-testid={`button-receipt-${order.id}`}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-orders">
              {orders.length === 0 ? "Belum ada pesanan" : "Tidak ada pesanan dengan filter ini"}
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-order-details">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order Details - #{viewingOrder?.id.slice(-6).toUpperCase()}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingOrder(null)}
                data-testid="button-close-order-details"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Lihat detail lengkap pesanan termasuk items, payment info dan timeline.
            </DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Customer</h3>
                  <p className="text-lg font-medium" data-testid="order-detail-customer">{viewingOrder.customerName}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Table</h3>
                  <p className="text-lg font-medium" data-testid="order-detail-table">{viewingOrder.tableNumber}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Status</h3>
                  <Badge className={getOrderStatusColor(viewingOrder.orderStatus)} data-testid="order-detail-status">
                    {ORDER_STATUSES[viewingOrder.orderStatus as keyof typeof ORDER_STATUSES] || viewingOrder.orderStatus}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Payment</h3>
                  <p className="text-lg font-medium" data-testid="order-detail-payment">{viewingOrder.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">Items Ordered</h3>
                <div className="space-y-3">
                  {Array.isArray(viewingOrder.items) ? viewingOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg" data-testid={`order-item-${index}`}>
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground italic">Notes: {item.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.price)}</p>
                        <p className="text-sm text-muted-foreground">x {item.quantity}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">No items found</p>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="order-detail-subtotal">{formatCurrency(viewingOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span data-testid="order-detail-discount">{formatCurrency(viewingOrder.discount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span data-testid="order-detail-total">{formatCurrency(viewingOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-sm text-muted-foreground border-t pt-4">
                <p>Ordered: {formatDate(new Date(viewingOrder.createdAt))}</p>
                <p>Last Updated: {formatDate(new Date(viewingOrder.updatedAt))}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="max-w-md print:max-w-none print:shadow-none">
          <DialogHeader className="print-hide">
            <DialogTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Receipt - #{viewingReceipt?.id.slice(-6).toUpperCase()}</span>
            </DialogTitle>
            <DialogDescription>
              Receipt pesanan yang bisa dicetak dengan thermal printer.
            </DialogDescription>
          </DialogHeader>
          
          {viewingReceipt && (
            <div className="customer-receipt space-y-4 print:text-black print:bg-white">
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
                  <span>{formatDate(new Date(viewingReceipt.createdAt))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{new Date(viewingReceipt.createdAt).toLocaleTimeString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{viewingReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meja:</span>
                  <span>{viewingReceipt.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="text-xs">#{viewingReceipt.id.slice(-8).toUpperCase()}</span>
                </div>
              </div>
              
              {/* Items */}
              <div className="border-t border-b py-4">
                <h3 className="font-semibold mb-3">Detail Pesanan:</h3>
                <div className="space-y-2">
                  {(Array.isArray(viewingReceipt.items) ? viewingReceipt.items : []).map((item: any, index: number) => (
                    <div key={index} className="receipt-item text-sm">
                      <div className="receipt-item-name">
                        <p className="font-medium">{item?.name || 'N/A'}</p>
                        <p className="text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.price)}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            Catatan: {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="receipt-item-price">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Total */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewingReceipt.subtotal || 0)}</span>
                </div>
                {(viewingReceipt.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrency(viewingReceipt.discount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(viewingReceipt.total)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-center space-y-2">
                <div>
                  <p className="text-muted-foreground text-sm">Metode Pembayaran</p>
                  <p className="font-medium capitalize">
                    {viewingReceipt.paymentMethod === 'qris' ? 'QRIS' : 'Cash'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <p className="font-medium text-primary capitalize">
                    {ORDER_STATUSES[viewingReceipt.orderStatus as keyof typeof ORDER_STATUSES] || viewingReceipt.orderStatus}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  Terima kasih telah berkunjung!
                </p>
                <p className="text-xs text-muted-foreground">
                  Alonica Restaurant - Cita Rasa Nusantara
                </p>
              </div>
            </div>
          )}
          
          {/* Print Button */}
          <div className="mt-4 print-hide">
            <Button
              onClick={async () => await smartPrintReceipt(viewingReceipt)}
              className="w-full flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
