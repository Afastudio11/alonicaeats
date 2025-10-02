import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Search, RefreshCw, User, FileText, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
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

export default function DeletionLogsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch deletion logs
  const { data: deletionLogs = [], isLoading: logsLoading, refetch } = useQuery<DeletionLog[]>({
    queryKey: ["/api/deletion-logs"],
  });

  // Fetch users for lookup
  const { data: users = [], isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = logsLoading || usersLoading;

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
