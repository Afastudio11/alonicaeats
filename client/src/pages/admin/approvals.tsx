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
  Clock,
  User,
  FileText,
  Shield,
  Key,
  Plus,
  Hash,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

interface DeletionLog {
  id: string;
  orderId: string;
  itemName: string;
  itemQuantity: number;
  itemPrice: number;
  requestedBy: string;
  authorizedBy: string;
  requestTime: string;
  approvalTime: string;
  reason: string | null;
  createdAt: string;
}

interface DeletionPin {
  id: string;
  pin: string;
  generatedBy: string;
  expiresAt: string | null;
  maxUses: number | null;
  usageCount: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

export default function ApprovalsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [newPinExpiry, setNewPinExpiry] = useState("");
  const [newPinMaxUses, setNewPinMaxUses] = useState("");
  const [newPinDescription, setNewPinDescription] = useState("");
  const { toast } = useToast();

  // Fetch all notifications with aggressive polling
  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    refetchIntervalInBackground: true,
  });

  // Fetch deletion logs with polling
  const { data: deletionLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery<DeletionLog[]>({
    queryKey: ["/api/deletion-logs"],
    refetchInterval: 5000,
  });

  // Fetch deletion PINs with polling
  const { data: deletionPins = [], isLoading: pinsLoading, refetch: refetchPins } = useQuery<DeletionPin[]>({
    queryKey: ["/api/deletion-pins"],
    refetchInterval: 5000,
  });

  // Fetch users for lookup
  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = notificationsLoading || logsLoading || pinsLoading;

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('POST', `/api/notifications/${notificationId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure sync
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deletion-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/open-bills'] });
      
      // Force immediate refetch to show changes everywhere
      refetchNotifications();
      refetchLogs();
      queryClient.refetchQueries({ queryKey: ['/api/orders'] });
      queryClient.refetchQueries({ queryKey: ['/api/orders/open-bills'] });
      
      toast({
        title: "Permintaan Disetujui",
        description: "Item berhasil dihapus dari open bill dan tercatat dalam log",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menyetujui permintaan",
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
      // Invalidate all related queries to ensure sync
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deletion-logs'] });
      
      // Force immediate refetch
      refetchNotifications();
      refetchLogs();
      
      toast({
        title: "Permintaan Ditolak",
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

  // Create PIN mutation
  const createPinMutation = useMutation({
    mutationFn: async (data: { expiresAt?: string; maxUses?: number; description?: string }) => {
      return await apiRequest('POST', "/api/deletion-pins", data);
    },
    onSuccess: () => {
      // Invalidate PIN queries
      queryClient.invalidateQueries({ queryKey: ["/api/deletion-pins"] });
      
      // Force immediate refetch
      refetchPins();
      
      setPinDialogOpen(false);
      setNewPinExpiry("");
      setNewPinMaxUses("");
      setNewPinDescription("");
      toast({
        title: "PIN Berhasil Dibuat",
        description: "PIN baru telah digenerate dan siap digunakan",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal Membuat PIN",
        description: error.message || "Terjadi kesalahan saat membuat PIN",
      });
    },
  });

  // Deactivate PIN mutation
  const deactivatePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      return await apiRequest('PUT', `/api/deletion-pins/${pinId}/deactivate`);
    },
    onSuccess: () => {
      // Invalidate PIN queries
      queryClient.invalidateQueries({ queryKey: ["/api/deletion-pins"] });
      
      // Force immediate refetch
      refetchPins();
      
      toast({
        title: "PIN Dinonaktifkan",
        description: "PIN telah dinonaktifkan dan tidak dapat digunakan lagi",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal Menonaktifkan PIN",
        description: error.message || "Terjadi kesalahan",
      });
    },
  });

  const handleCreatePin = () => {
    const data: { expiresAt?: string; maxUses?: number; description?: string } = {};
    
    if (newPinExpiry) {
      data.expiresAt = new Date(newPinExpiry).toISOString();
    }
    
    if (newPinMaxUses && parseInt(newPinMaxUses) > 0) {
      data.maxUses = parseInt(newPinMaxUses);
    }
    
    if (newPinDescription.trim()) {
      data.description = newPinDescription.trim();
    }
    
    createPinMutation.mutate(data);
  };

  // Get user by ID
  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  // Filter notifications for pending tab
  const pendingNotifications = useMemo(() => {
    let filtered = notifications.filter(n => n.status === 'pending');

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
  }, [notifications, searchQuery, users]);

  // Filter deletion logs for history tab
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return deletionLogs;
    
    const query = searchQuery.toLowerCase();
    return deletionLogs.filter(log => 
      log.itemName.toLowerCase().includes(query) ||
      log.orderId.toLowerCase().includes(query) ||
      log.reason?.toLowerCase().includes(query) ||
      getUserById(log.requestedBy)?.username.toLowerCase().includes(query) ||
      getUserById(log.authorizedBy)?.username.toLowerCase().includes(query)
    );
  }, [deletionLogs, searchQuery, users]);

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  const formatTime = (date: string | Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  };

  const handleRefresh = () => {
    refetchNotifications();
    refetchLogs();
    refetchPins();
    toast({
      title: "Data Direfresh",
      description: "Semua data telah diperbarui",
    });
  };

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
            Approval
          </h1>
          <p className="text-muted-foreground">Kelola permintaan penghapusan, riwayat log, dan PIN</p>
        </div>
        <Button
          onClick={handleRefresh}
          className="flex items-center gap-2"
          data-testid="button-refresh-approvals"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Total Deleted</CardTitle>
            <Trash2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-deleted-count">{deletionLogs.length}</div>
            <p className="text-xs text-muted-foreground">Item dihapus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active PINs</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deletionPins.filter(p => p.isActive).length}</div>
            <p className="text-xs text-muted-foreground">PIN aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Deleted</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(deletionLogs.reduce((sum, log) => 
                sum + (log.itemPrice * log.itemQuantity), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Nilai total</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan item, kasir, admin, atau alasan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-approvals"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <FileText className="h-4 w-4 mr-2" />
            History ({deletionLogs.length})
          </TabsTrigger>
          <TabsTrigger value="pins" data-testid="tab-pins">
            <Key className="h-4 w-4 mr-2" />
            PIN Management
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada permintaan pending</p>
              </CardContent>
            </Card>
          ) : (
            pendingNotifications.map((notification) => {
              const requestedByUser = getUserById(notification.requestedBy);

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
                          <Badge variant="default" data-testid={`approval-status-${notification.id}`}>
                            PENDING
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
                                  {formatCurrency(notification.relatedData.item.price)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-medium">
                                  {formatCurrency(notification.relatedData.item.price * notification.relatedData.item.quantity)}
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
                        </div>
                      </div>

                      {/* Actions */}
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
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Riwayat Penghapusan ({filteredLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Tidak ada log penghapusan</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Tidak ada hasil yang cocok dengan pencarian" : "Belum ada item yang dihapus"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-y">
                      <tr className="text-xs font-medium text-muted-foreground">
                        <th className="text-left px-4 py-3">Waktu</th>
                        <th className="text-left px-4 py-3">Order ID</th>
                        <th className="text-left px-4 py-3">Item</th>
                        <th className="text-center px-4 py-3">Qty</th>
                        <th className="text-right px-4 py-3">Nilai</th>
                        <th className="text-left px-4 py-3">Diminta Oleh</th>
                        <th className="text-left px-4 py-3">Disetujui Oleh</th>
                        <th className="text-left px-4 py-3">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLogs.map((log) => {
                        const requester = getUserById(log.requestedBy);
                        const authorizer = getUserById(log.authorizedBy);
                        
                        return (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`log-row-${log.id}`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {formatTime(log.approvalTime)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(log.requestTime)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.orderId.slice(0, 8)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-sm">{log.itemName}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary">{log.itemQuantity}x</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-sm">
                                {formatCurrency(log.itemPrice * log.itemQuantity)}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                @ {formatCurrency(log.itemPrice)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{requester?.username || 'Unknown'}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {requester?.role || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{authorizer?.username || 'Unknown'}</span>
                              </div>
                              <Badge variant="default" className="text-xs mt-1 bg-green-600">
                                {authorizer?.role || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground italic">
                                {log.reason || 'Tidak ada alasan'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PIN Management Tab */}
        <TabsContent value="pins" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Manajemen PIN Penghapusan
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate PIN sementara untuk kasir menghapus item tanpa password admin
                  </p>
                </div>
                <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" data-testid="button-generate-pin">
                      <Plus className="h-4 w-4" />
                      Generate PIN
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate PIN Penghapusan Baru</DialogTitle>
                      <DialogDescription>
                        PIN akan digenerate secara otomatis. Atur opsi kedaluwarsa dan batasan penggunaan.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="pin-description">Deskripsi (Opsional)</Label>
                        <Input
                          id="pin-description"
                          placeholder="Contoh: PIN untuk shift malam"
                          value={newPinDescription}
                          onChange={(e) => setNewPinDescription(e.target.value)}
                          data-testid="input-pin-description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pin-expiry">Tanggal Kadaluarsa (Opsional)</Label>
                        <Input
                          id="pin-expiry"
                          type="datetime-local"
                          value={newPinExpiry}
                          onChange={(e) => setNewPinExpiry(e.target.value)}
                          data-testid="input-pin-expiry"
                        />
                        <p className="text-xs text-muted-foreground">Kosongkan untuk PIN tanpa batas waktu</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pin-max-uses">Maksimal Penggunaan (Opsional)</Label>
                        <Input
                          id="pin-max-uses"
                          type="number"
                          min="1"
                          placeholder="Contoh: 10"
                          value={newPinMaxUses}
                          onChange={(e) => setNewPinMaxUses(e.target.value)}
                          data-testid="input-pin-max-uses"
                        />
                        <p className="text-xs text-muted-foreground">Kosongkan untuk penggunaan unlimited</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPinDialogOpen(false)}
                        data-testid="button-cancel-pin"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleCreatePin}
                        disabled={createPinMutation.isPending}
                        data-testid="button-create-pin"
                      >
                        {createPinMutation.isPending ? "Membuat..." : "Generate PIN"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {deletionPins.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada PIN yang digenerate</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-y">
                      <tr className="text-xs font-medium text-muted-foreground">
                        <th className="text-left px-4 py-3">PIN</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Dibuat</th>
                        <th className="text-left px-4 py-3">Kadaluarsa</th>
                        <th className="text-center px-4 py-3">Penggunaan</th>
                        <th className="text-left px-4 py-3">Deskripsi</th>
                        <th className="text-center px-4 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deletionPins.map((pin) => {
                        const isExpired = pin.expiresAt && new Date(pin.expiresAt) < new Date();
                        const isMaxedOut = pin.maxUses && pin.usageCount >= pin.maxUses;
                        const isValid = pin.isActive && !isExpired && !isMaxedOut;
                        const generator = getUserById(pin.generatedBy);
                        
                        return (
                          <tr key={pin.id} className="hover:bg-muted/30 transition-colors" data-testid={`pin-row-${pin.id}`}>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-lg font-bold px-3">
                                {pin.pin}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {isValid ? (
                                <Badge className="bg-green-600">Aktif</Badge>
                              ) : isExpired ? (
                                <Badge variant="destructive">Kadaluarsa</Badge>
                              ) : isMaxedOut ? (
                                <Badge variant="destructive">Habis</Badge>
                              ) : (
                                <Badge variant="secondary">Nonaktif</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">{formatTime(pin.createdAt)}</div>
                              <div className="text-xs text-muted-foreground">
                                oleh {generator?.username || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {pin.expiresAt ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(pin.expiresAt)}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Tidak ada batas</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span className="font-medium">{pin.usageCount}</span>
                                {pin.maxUses && (
                                  <span className="text-muted-foreground">/ {pin.maxUses}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground italic">
                                {pin.description || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pin.isActive && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deactivatePinMutation.mutate(pin.id)}
                                  disabled={deactivatePinMutation.isPending}
                                  data-testid={`button-deactivate-${pin.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
