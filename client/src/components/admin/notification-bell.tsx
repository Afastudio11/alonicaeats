import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  requestedBy: string;
  relatedId: string;
  relatedData: {
    itemIndex: number;
    item: {
      name: string;
      quantity: number;
      price: number;
    };
    reason: string;
  };
  status: string;
  isRead: boolean;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export default function NotificationBell() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch pending notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/pending'],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('POST', `/api/notifications/${notificationId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all order-related queries to ensure UI refreshes everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deletion-logs'] });
      // Force immediate refetch to show changes
      queryClient.refetchQueries({ queryKey: ['/api/orders'] });
      queryClient.refetchQueries({ queryKey: ['/api/orders/open-bills'] });
      toast({
        title: "Item Deleted",
        description: "Item berhasil dihapus dari open bill",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus item",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('POST', `/api/notifications/${notificationId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Request Rejected",
        description: "Permintaan penghapusan ditolak",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menolak permintaan",
        variant: "destructive",
      });
    },
  });

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
              data-testid="badge-notification-count"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" data-testid="popover-notifications">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1" data-testid={`notification-title-${notification.id}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`notification-message-${notification.id}`}>
                        {notification.message}
                      </p>
                      
                      {notification.relatedData && (
                        <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded">
                          <p><strong>Item:</strong> {notification.relatedData.item.name}</p>
                          <p><strong>Quantity:</strong> {notification.relatedData.item.quantity}x</p>
                          <p><strong>Price:</strong> Rp {notification.relatedData.item.price.toLocaleString('id-ID')}</p>
                          <p><strong>Reason:</strong> {notification.relatedData.reason}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {format(new Date(notification.createdAt), 'dd MMM yyyy, HH:mm')}
                      </p>
                      
                      {notification.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8"
                            onClick={() => approveMutation.mutate(notification.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-approve-${notification.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => rejectMutation.mutate(notification.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-reject-${notification.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
