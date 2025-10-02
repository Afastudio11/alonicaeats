import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Search, RefreshCw, User, FileText, Calendar, Shield, Key, Plus, X, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

export default function DeletionLogsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [newPinExpiry, setNewPinExpiry] = useState("");
  const [newPinMaxUses, setNewPinMaxUses] = useState("");
  const [newPinDescription, setNewPinDescription] = useState("");
  const { toast } = useToast();

  // Fetch deletion logs
  const { data: deletionLogs = [], isLoading: logsLoading, refetch } = useQuery<DeletionLog[]>({
    queryKey: ["/api/deletion-logs"],
  });

  // Fetch deletion PINs
  const { data: deletionPins = [], isLoading: pinsLoading, refetch: refetchPins } = useQuery<DeletionPin[]>({
    queryKey: ["/api/deletion-pins"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch users for lookup
  const { data: users = [], isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = logsLoading || usersLoading || pinsLoading;

  // Create PIN mutation
  const createPinMutation = useMutation({
    mutationFn: async (data: { expiresAt?: string; maxUses?: number; description?: string }) => {
      return await apiRequest("/api/deletion-pins", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deletion-pins"] });
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
      return await apiRequest(`/api/deletion-pins/${pinId}/deactivate`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deletion-pins"] });
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

  // Filter logs based on search query
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

  const formatTime = (date: string | Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
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
          <h1 className="text-2xl font-bold text-foreground">Log Penghapusan Item</h1>
          <p className="text-muted-foreground">Riwayat permanen penghapusan item dari Open Bill</p>
        </div>
        <Button
          onClick={() => {
            refetch();
            toast({
              title: "Data Direfresh",
              description: "Log penghapusan telah diperbarui",
            });
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penghapusan</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deletionLogs.length}</div>
            <p className="text-xs text-muted-foreground">Item yang dihapus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deletionLogs.reduce((sum, log) => sum + log.itemQuantity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Jumlah item</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Total</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(deletionLogs.reduce((sum, log) => 
                sum + (log.itemPrice * log.itemQuantity), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total nilai dihapus</p>
          </CardContent>
        </Card>
      </div>

      {/* PIN Management Section */}
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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-5 w-5" />
            Cari Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari item, order ID, kasir, admin, alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-logs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deletion Logs Table */}
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
    </div>
  );
}
