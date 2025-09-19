import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShoppingBag, CheckCircle, Clock, DollarSign, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import type { Order, OrderItem } from "@shared/schema";

export default function OrdersSection() {
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status berhasil diupdate",
        description: "Status pesanan telah diperbarui",
      });
    },
    onError: () => {
      toast({
        title: "Gagal update status",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  // Calculate stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(order => 
    new Date(order.createdAt).toDateString() === today
  );

  const stats = {
    totalToday: todayOrders.length,
    completed: todayOrders.filter(order => order.status === 'completed').length,
    pending: todayOrders.filter(order => order.status === 'pending').length,
    revenue: todayOrders.reduce((sum, order) => sum + order.total, 0)
  };

  const handleStatusUpdate = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-6 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
        <div className="alonica-card p-6 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="alonica-card p-6">
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

        <div className="alonica-card p-6">
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

        <div className="alonica-card p-6">
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

        <div className="alonica-card p-6">
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
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              {orders.map((order) => (
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
                  <td className="px-6 py-4 text-sm text-foreground">
                    {Array.isArray(order.items) 
                      ? order.items.map((item: any) => item.name).join(', ')
                      : 'No items'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      className={getOrderStatusColor(order.status)}
                      data-testid={`status-${order.id}`}
                    >
                      {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(new Date(order.createdAt))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="bg-blue-500 hover:bg-blue-600"
                        data-testid={`button-accept-${order.id}`}
                      >
                        Accept
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="bg-green-500 hover:bg-green-600"
                        data-testid={`button-ready-${order.id}`}
                      >
                        Ready
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-orders">
              Belum ada pesanan
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
                  <Badge className={getOrderStatusColor(viewingOrder.status)} data-testid="order-detail-status">
                    {ORDER_STATUSES[viewingOrder.status as keyof typeof ORDER_STATUSES] || viewingOrder.status}
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
    </div>
  );
}
