import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Check, 
  X, 
  Trash2, 
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User as AppUser } from "@shared/schema";

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

export default function ApprovalsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();

  // Fetch all notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Fetch users for lookup
  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('POST', `/api/notifications/${notificationId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
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

  // Get user by ID
  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by tab (status)
    if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.status === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const requestedByUsername = getUserById(n.requestedBy)?.username?.toLowerCase() || '';
        return (
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.relatedData?.item?.name?.toLowerCase().includes(query) ||
          n.relatedData?.reason?.toLowerCase().includes(query) ||
          requestedByUsername.includes(query)
        );
      });
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, activeTab, searchQuery, users]);

  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const approvedCount = notifications.filter(n => n.status === 'approved').length;
  const rejectedCount = notifications.filter(n => n.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="h-96 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-approvals-title">
            Approval Management
          </h1>
          <p className="text-muted-foreground">Kelola permintaan penghapusan item dari kasir</p>
        </div>
        <Button
          onClick={() => {
            refetch();
            toast({
              title: "Data Direfresh",
              description: "Daftar approval telah diperbarui",
            });
          }}
          className="flex items-center gap-2"
          data-testid="button-refresh-approvals"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-count">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-approved-count">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Disetujui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-rejected-count">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Ditolak</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan item, kasir, atau alasan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-approvals"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada permintaan {activeTab !== 'all' ? activeTab : ''}</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const requestedByUser = getUserById(notification.requestedBy);
              const processedByUser = notification.processedBy ? getUserById(notification.processedBy) : null;

              return (
                <Card key={notification.id} data-testid={`approval-card-${notification.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground" data-testid={`approval-title-${notification.id}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              notification.status === 'pending' ? 'default' :
                              notification.status === 'approved' ? 'outline' :
                              'destructive'
                            }
                            data-testid={`approval-status-${notification.id}`}
                          >
                            {notification.status.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Details */}
                        {notification.relatedData && (
                          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Item Name</p>
                                <p className="font-medium" data-testid={`approval-item-name-${notification.id}`}>
                                  {notification.relatedData.item.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Quantity</p>
                                <p className="font-medium">
                                  {notification.relatedData.item.quantity}x
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Price</p>
                                <p className="font-medium">
                                  Rp {notification.relatedData.item.price.toLocaleString('id-ID')}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-medium">
                                  Rp {(notification.relatedData.item.price * notification.relatedData.item.quantity).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-border">
                              <p className="text-muted-foreground text-sm">Reason</p>
                              <p className="font-medium" data-testid={`approval-reason-${notification.id}`}>
                                {notification.relatedData.reason}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Requested by: <strong>{requestedByUser?.username || 'Unknown'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(notification.createdAt), 'dd MMM yyyy, HH:mm')}
                          </span>
                          {notification.processedAt && processedByUser && (
                            <>
                              <span>•</span>
                              <span>
                                Processed by: <strong>{processedByUser.username}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {notification.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveMutation.mutate(notification.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-approve-${notification.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(notification.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            data-testid={`button-reject-${notification.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
