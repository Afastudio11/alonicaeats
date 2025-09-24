import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, DollarSign, TrendingUp, TrendingDown, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import type { Shift, InsertShift } from "@shared/schema";

export default function ShiftManagementSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialCash, setInitialCash] = useState(0);
  const [finalCash, setFinalCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [cashIn, setCashIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);
  const [cashDescription, setCashDescription] = useState("");

  // Fetch active shift
  const { data: activeShift, isLoading: loadingShift } = useQuery<Shift | null>({
    queryKey: ['/api/shifts/active'],
    retry: false
  });

  // Open shift mutation
  const openShiftMutation = useMutation({
    mutationFn: async (data: { initialCash: number }) => {
      const response = await apiRequest('POST', '/api/shifts', {
        initialCash: data.initialCash
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shift Dibuka",
        description: "Shift berhasil dibuka. Anda dapat mulai melayani pelanggan."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/active'] });
      setInitialCash(0);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Membuka Shift",
        description: error.message || "Terjadi kesalahan saat membuka shift",
        variant: "destructive"
      });
    }
  });

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: async (data: { finalCash: number; notes?: string }) => {
      if (!activeShift?.id) throw new Error("No active shift");
      const response = await apiRequest('PUT', `/api/shifts/${activeShift.id}/close`, {
        finalCash: data.finalCash,
        notes: data.notes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shift Ditutup",
        description: "Shift berhasil ditutup. Laporan shift telah disimpan."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/active'] });
      setFinalCash(0);
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Menutup Shift",
        description: error.message || "Terjadi kesalahan saat menutup shift",
        variant: "destructive"
      });
    }
  });

  // Cash movement mutation
  const cashMovementMutation = useMutation({
    mutationFn: async (data: { type: 'in' | 'out'; amount: number; description: string }) => {
      if (!activeShift?.id) throw new Error("No active shift");
      const response = await apiRequest('POST', '/api/cash-movements', {
        shiftId: activeShift.id,
        cashierId: user?.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.type === 'in' ? 'deposit' : 'expense'
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.type === 'in' ? "Kas Masuk Dicatat" : "Kas Keluar Dicatat",
        description: `Transaksi kas ${variables.type === 'in' ? 'masuk' : 'keluar'} berhasil dicatat`
      });
      setCashIn(0);
      setCashOut(0);
      setCashDescription("");
      queryClient.invalidateQueries({ queryKey: ['/api/cash-movements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Mencatat Kas",
        description: error.message || "Terjadi kesalahan saat mencatat transaksi kas",
        variant: "destructive"
      });
    }
  });

  const handleOpenShift = () => {
    if (isNaN(initialCash) || initialCash < 0) {
      toast({
        title: "Input Tidak Valid",
        description: "Masukkan jumlah kas awal yang valid",
        variant: "destructive"
      });
      return;
    }
    openShiftMutation.mutate({ initialCash });
  };

  const handleCloseShift = () => {
    if (isNaN(finalCash) || finalCash < 0) {
      toast({
        title: "Input Tidak Valid",
        description: "Masukkan jumlah kas akhir yang valid",
        variant: "destructive"
      });
      return;
    }
    closeShiftMutation.mutate({ finalCash, notes: notes || undefined });
  };

  const handleCashMovement = (type: 'in' | 'out') => {
    const amount = type === 'in' ? cashIn : cashOut;
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Input Tidak Valid",
        description: "Masukkan jumlah kas yang valid",
        variant: "destructive"
      });
      return;
    }

    if (!cashDescription.trim()) {
      toast({
        title: "Input Tidak Valid",
        description: "Masukkan deskripsi transaksi kas",
        variant: "destructive"
      });
      return;
    }

    cashMovementMutation.mutate({
      type,
      amount,
      description: cashDescription
    });
  };


  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateCashDifference = () => {
    if (!activeShift || !finalCash) return 0;
    const expected = (activeShift.systemCash || activeShift.initialCash || 0);
    return finalCash - expected;
  };

  if (loadingShift) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Shift</h1>
          <p className="text-muted-foreground">Kelola sesi kerja dan pencatatan kas</p>
        </div>
        <Badge variant={activeShift ? "default" : "secondary"} className="text-sm">
          {activeShift ? "Shift Aktif" : "Tidak Ada Shift"}
        </Badge>
      </div>

      {!activeShift ? (
        /* Open Shift Card */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Buka Shift Baru
            </CardTitle>
            <CardDescription>
              Mulai sesi kerja baru dengan mencatat kas awal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initial-cash">Kas Awal (Rp)</Label>
              <CurrencyInput
                id="initial-cash"
                value={initialCash}
                onValueChange={setInitialCash}
                data-testid="input-initial-cash"
              />
            </div>
            <Button 
              onClick={handleOpenShift}
              disabled={openShiftMutation.isPending}
              className="w-full"
              data-testid="button-open-shift"
            >
              {openShiftMutation.isPending ? "Membuka..." : "Buka Shift"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Active Shift Management */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Shift Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Shift Aktif
              </CardTitle>
              <CardDescription>
                ID Sesi: {activeShift.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Mulai Shift</p>
                  <p className="font-medium">{formatTime(activeShift.startTime)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kasir</p>
                  <p className="font-medium">{user?.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kas Awal</p>
                  <p className="font-medium">{formatCurrency(activeShift.initialCash || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="default">Aktif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Kas Masuk/Keluar
              </CardTitle>
              <CardDescription>
                Catat setoran awal dan pengeluaran dadakan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cash-description">Deskripsi</Label>
                <Input
                  id="cash-description"
                  placeholder="Deskripsi transaksi"
                  value={cashDescription}
                  onChange={(e) => setCashDescription(e.target.value)}
                  data-testid="input-cash-description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash-in">Kas Masuk (Rp)</Label>
                  <CurrencyInput
                    id="cash-in"
                    value={cashIn}
                    onValueChange={setCashIn}
                    data-testid="input-cash-in"
                  />
                  <Button 
                    size="sm"
                    onClick={() => handleCashMovement('in')}
                    disabled={cashMovementMutation.isPending}
                    className="w-full"
                    data-testid="button-cash-in"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Catat
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cash-out">Kas Keluar (Rp)</Label>
                  <CurrencyInput
                    id="cash-out"
                    value={cashOut}
                    onValueChange={setCashOut}
                    data-testid="input-cash-out"
                  />
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleCashMovement('out')}
                    disabled={cashMovementMutation.isPending}
                    className="w-full"
                    data-testid="button-cash-out"
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Catat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Close Shift */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tutup Shift (Closingan)
              </CardTitle>
              <CardDescription>
                Akhiri sesi kerja dan lakukan penghitungan kas akhir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="final-cash">Kas Fisik Dihitung (Rp)</Label>
                  <CurrencyInput
                    id="final-cash"
                    value={finalCash}
                    onValueChange={setFinalCash}
                    data-testid="input-final-cash"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (Opsional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan untuk shift ini..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="input-shift-notes"
                  />
                </div>
              </div>

              {finalCash && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Ringkasan Kas</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Kas Tercatat</p>
                      <p className="font-medium">{formatCurrency(activeShift.systemCash || activeShift.initialCash || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kas Fisik</p>
                      <p className="font-medium">{formatCurrency(finalCash || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Selisih</p>
                      <div className="flex items-center gap-1">
                        {calculateCashDifference() !== 0 && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <p className={`font-medium ${
                          calculateCashDifference() > 0 ? 'text-green-600' : 
                          calculateCashDifference() < 0 ? 'text-red-600' : 
                          'text-foreground'
                        }`}>
                          {formatCurrency(calculateCashDifference())}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />
              
              <Button 
                onClick={handleCloseShift}
                disabled={closeShiftMutation.isPending}
                variant="destructive"
                className="w-full"
                data-testid="button-close-shift"
              >
                {closeShiftMutation.isPending ? "Menutup..." : "Tutup Shift"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}