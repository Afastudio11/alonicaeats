import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, subDays, isAfter, isBefore } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Calendar, 
  Filter, 
  Download, 
  FileText, 
  Clock, 
  User, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Shift, User as AppUser, Expense, CashMovement, AuditLog } from "@shared/schema";

interface ShiftAuditData {
  shift: Shift;
  cashier: AppUser;
  expenses: Expense[];
  cashMovements: CashMovement[];
  auditLogs: AuditLog[];
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

export default function AuditReportsSection() {
  const [activeTab, setActiveTab] = useState("shifts");
  const [dateFilter, setDateFilter] = useState("7"); // Last 7 days
  const [cashierFilter, setCashierFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all required data with optimized caching
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
    staleTime: 60000, // 1 minute (users change less frequently)
    retry: 2,
  });

  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    staleTime: 30000,
    retry: 2,
  });

  const { data: cashMovements = [], isLoading: cashMovementsLoading, error: cashMovementsError } = useQuery<CashMovement[]>({
    queryKey: ["/api/cash-movements"],
    staleTime: 30000,
    retry: 2,
  });

  const { data: auditLogs = [], isLoading: auditLogsLoading, error: auditLogsError } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
    staleTime: 30000,
    retry: 2,
  });

  const { data: deletionLogs = [], isLoading: deletionLogsLoading, error: deletionLogsError } = useQuery<DeletionLog[]>({
    queryKey: ["/api/deletion-logs"],
    retry: 1,
    staleTime: 10000,
  });

  // Loading state: all critical queries must finish (deletion logs is optional)
  const isLoading = shiftsLoading || usersLoading || expensesLoading || cashMovementsLoading || auditLogsLoading;
  // Error state: only show error if critical queries fail (not deletion logs)
  const hasCriticalError = shiftsError || usersError || expensesError || cashMovementsError || auditLogsError;

  // Filter and process data
  const processedData = useMemo(() => {
    if (isLoading) return [];

    // Ensure all data are arrays
    const safeShifts = Array.isArray(shifts) ? shifts : [];
    const safeUsers = Array.isArray(users) ? users : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeCashMovements = Array.isArray(cashMovements) ? cashMovements : [];
    const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

    // Create date filter
    const daysBack = parseInt(dateFilter);
    const filterDate = subDays(new Date(), daysBack);
    const startDate = startOfDay(filterDate);
    const endDate = endOfDay(new Date());

    // Filter shifts by date (inclusive of boundaries)
    const filteredShifts = safeShifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      const withinDateRange = (shiftDate >= startDate && shiftDate <= endDate);
      
      // Filter by cashier if specified
      const matchesCashier = cashierFilter === "all" || shift.cashierId === cashierFilter;
      
      return withinDateRange && matchesCashier;
    });

    // Create audit data for each shift
    const auditData: ShiftAuditData[] = filteredShifts.map(shift => {
      const cashier = safeUsers.find(u => u.id === shift.cashierId) || {
        id: shift.cashierId,
        username: "Unknown User",
        role: "kasir"
      } as AppUser;

      const shiftExpenses = safeExpenses.filter(expense => {
        const expenseDate = new Date(expense.createdAt);
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date();
        return expenseDate >= shiftStart && expenseDate <= shiftEnd && expense.recordedBy === shift.cashierId;
      });

      const shiftCashMovements = safeCashMovements.filter(movement => movement.shiftId === shift.id);

      const shiftAuditLogs = safeAuditLogs.filter(log => 
        (log.targetId === shift.id && log.targetType === 'shift') ||
        (log.performedBy === shift.cashierId && 
         new Date(log.createdAt) >= new Date(shift.startTime) && 
         new Date(log.createdAt) <= (shift.endTime ? new Date(shift.endTime) : new Date()))
      );

      return {
        shift,
        cashier,
        expenses: shiftExpenses,
        cashMovements: shiftCashMovements,
        auditLogs: shiftAuditLogs
      };
    });

    // Filter by search query
    if (searchQuery.trim()) {
      return auditData.filter(data => 
        data.cashier.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.shift.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.shift.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return auditData.sort((a, b) => new Date(b.shift.startTime).getTime() - new Date(a.shift.startTime).getTime());
  }, [shifts, users, expenses, cashMovements, auditLogs, dateFilter, cashierFilter, searchQuery, isLoading]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalShifts = processedData.length;
    const totalRevenue = processedData.reduce((sum, data) => sum + (data.shift.totalRevenue || 0), 0);
    const totalExpenses = processedData.reduce((sum, data) => 
      sum + data.expenses.reduce((expSum, exp) => expSum + exp.amount, 0), 0);
    const cashDiscrepancies = processedData.filter(data => Math.abs(data.shift.cashDifference || 0) > 1000);

    return {
      totalShifts,
      totalRevenue,
      totalExpenses,
      cashDiscrepancies: cashDiscrepancies.length,
      netCashDifference: processedData.reduce((sum, data) => sum + (data.shift.cashDifference || 0), 0)
    };
  }, [processedData]);

  const formatTime = (date: string | Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  };

  const formatDuration = (startTime: string | Date, endTime?: string | Date | null) => {
    if (!endTime) return "Sedang berjalan";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}j ${diffMinutes}m`;
  };

  const getShiftStatusColor = (shift: Shift) => {
    if (shift.status === 'open') return "bg-green-100 text-green-800";
    if (Math.abs(shift.cashDifference || 0) > 1000) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getShiftStatusText = (shift: Shift) => {
    if (shift.status === 'open') return "Aktif";
    if (Math.abs(shift.cashDifference || 0) > 1000) return "Selisih Kas";
    return "Selesai";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (hasCriticalError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Laporan & Audit Kasir</h1>
            <p className="text-muted-foreground">Laporan dan audit komprehensif per sesi/shift kasir</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Gagal Memuat Data</p>
            <p className="text-muted-foreground mb-4">Terjadi kesalahan saat memuat data laporan audit</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Muat Ulang Halaman
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan & Audit Kasir</h1>
          <p className="text-muted-foreground">Laporan dan audit komprehensif per sesi/shift kasir</p>
        </div>
        <Button
          onClick={() => {
            toast({
              title: "Data Direfresh",
              description: "Data audit telah diperbarui",
            });
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hari Ini</SelectItem>
                  <SelectItem value="7">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30">30 Hari Terakhir</SelectItem>
                  <SelectItem value="90">3 Bulan Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kasir</label>
              <Select value={cashierFilter} onValueChange={setCashierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kasir</SelectItem>
                  {Array.isArray(users) && users.filter(u => u.role === 'kasir').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cari kasir, ID shift, catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  // You could add status filtering here
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Shift</p>
                <p className="text-2xl font-bold">{summaryStats.totalShifts}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selisih Kas Signifikan</p>
                <p className="text-2xl font-bold">{summaryStats.cashDiscrepancies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Reports */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Laporan Per Shift</h2>
        
        {processedData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Tidak ada data shift untuk periode yang dipilih</p>
            </CardContent>
          </Card>
        ) : (
          processedData.map((auditData) => (
            <Card key={auditData.shift.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{auditData.cashier.username}</CardTitle>
                      <p className="text-sm text-muted-foreground">ID Sesi: {auditData.shift.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getShiftStatusColor(auditData.shift)}>
                      {getShiftStatusText(auditData.shift)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedShift(
                        selectedShift === auditData.shift.id ? null : auditData.shift.id
                      )}
                    >
                      {selectedShift === auditData.shift.id ? "Tutup Detail" : "Lihat Detail"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Shift Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mulai Shift</p>
                    <p className="font-medium">{formatTime(auditData.shift.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Selesai Shift</p>
                    <p className="font-medium">
                      {auditData.shift.endTime ? formatTime(auditData.shift.endTime) : "Belum selesai"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Durasi</p>
                    <p className="font-medium">
                      {formatDuration(auditData.shift.startTime, auditData.shift.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Selisih Kas</p>
                    <p className={`font-medium ${
                      (auditData.shift.cashDifference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(auditData.shift.cashDifference || 0)}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(auditData.shift.totalRevenue || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(auditData.expenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Pengeluaran Dadakan</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {auditData.cashMovements.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Transaksi Kas</p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedShift === auditData.shift.id && (
                  <div className="space-y-6 pt-4 border-t">
                    {/* Kas Details */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Detail Kas
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Kas Awal</p>
                          <p className="font-medium">{formatCurrency(auditData.shift.initialCash || 0)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Kas Akhir (Fisik)</p>
                          <p className="font-medium">{formatCurrency(auditData.shift.finalCash || 0)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Kas Sistem</p>
                          <p className="font-medium">{formatCurrency(auditData.shift.systemCash || 0)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Selisih</p>
                          <p className={`font-medium ${
                            (auditData.shift.cashDifference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(auditData.shift.cashDifference || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expenses */}
                    {auditData.expenses.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Pengeluaran Dadakan ({auditData.expenses.length})</h4>
                        <div className="space-y-2">
                          {auditData.expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-100">
                              <div>
                                <p className="font-medium">{expense.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {expense.category} • {formatTime(expense.createdAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-red-600">{formatCurrency(expense.amount)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cash Movements */}
                    {auditData.cashMovements.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Transaksi Kas ({auditData.cashMovements.length})</h4>
                        <div className="space-y-2">
                          {auditData.cashMovements.map((movement) => (
                            <div key={movement.id} className={`flex items-center justify-between p-3 rounded border ${
                              movement.type === 'in' 
                                ? 'bg-green-50 border-green-100' 
                                : 'bg-red-50 border-red-100'
                            }`}>
                              <div>
                                <p className="font-medium">{movement.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {movement.category} • {formatTime(movement.createdAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${
                                  movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {movement.type === 'in' ? '+' : '-'}{formatCurrency(movement.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {auditData.shift.notes && (
                      <div>
                        <h4 className="font-medium mb-3">Catatan Shift</h4>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm">{auditData.shift.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Audit Trail */}
                    {auditData.auditLogs.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Jejak Audit ({auditData.auditLogs.length})</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {auditData.auditLogs.map((log) => (
                            <div key={log.id} className="flex items-center gap-3 p-2 text-xs bg-gray-50 rounded">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <div className="flex-1">
                                <p>{log.action}</p>
                                <p className="text-muted-foreground">{formatTime(log.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}