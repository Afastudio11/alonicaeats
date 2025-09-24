import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Shift } from "@shared/schema";

export default function ShiftToggle() {
  const { toast } = useToast();
  const [startShiftOpen, setStartShiftOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [initialCash, setInitialCash] = useState(3000000); // Default 3,000,000
  const [finalCash, setFinalCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [summaryData, setSummaryData] = useState<{
    netIncome: number;
    remainingCash: number;
  } | null>(null);

  // Fetch active shift
  const { data: activeShift, isLoading } = useQuery<Shift | null>({
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
      setStartShiftOpen(false);
      setInitialCash(3000000);
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
      // Calculate summary data
      const netIncome = finalCash - (activeShift?.initialCash || 0);
      setSummaryData({
        netIncome,
        remainingCash: finalCash
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/active'] });
      setEndShiftOpen(false);
      setSummaryOpen(true);
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

  const handleToggleChange = (checked: boolean) => {
    if (checked && !activeShift) {
      // Opening shift
      setStartShiftOpen(true);
    } else if (!checked && activeShift) {
      // Closing shift
      setEndShiftOpen(true);
    }
  };

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

  const closeSummary = () => {
    setSummaryOpen(false);
    setSummaryData(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium">
        <Clock className="h-4 w-4 animate-spin" />
        <span className="truncate">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium">
        <div className="flex items-center space-x-2 flex-1">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Shift</span>
        </div>
        <Switch
          checked={!!activeShift}
          onCheckedChange={handleToggleChange}
          className={`${
            activeShift 
              ? "data-[state=checked]:bg-green-600" 
              : "data-[state=unchecked]:bg-gray-300"
          }`}
          data-testid="toggle-shift"
        />
        <div className={`w-2 h-2 rounded-full ${
          activeShift ? "bg-green-500" : "bg-gray-400"
        }`} />
      </div>

      {/* Start Shift Modal */}
      <Dialog open={startShiftOpen} onOpenChange={setStartShiftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mulai Shift</DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas awal untuk memulai shift kerja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-initial-cash">Kas Awal (Rp)</Label>
              <CurrencyInput
                id="start-initial-cash"
                value={initialCash}
                onValueChange={setInitialCash}
                data-testid="input-start-initial-cash"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStartShiftOpen(false)}
                className="flex-1"
                data-testid="button-cancel-start-shift"
              >
                Batal
              </Button>
              <Button
                onClick={handleOpenShift}
                disabled={openShiftMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-start-shift"
              >
                {openShiftMutation.isPending ? "Membuka..." : "Buka Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Shift Modal */}
      <Dialog open={endShiftOpen} onOpenChange={setEndShiftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tutup Shift (Closing)</DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas fisik yang dihitung untuk menutup shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="end-final-cash">Kas Fisik Dihitung (Rp)</Label>
              <CurrencyInput
                id="end-final-cash"
                value={finalCash}
                onValueChange={setFinalCash}
                data-testid="input-end-final-cash"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-notes">Catatan (Opsional)</Label>
              <Textarea
                id="end-notes"
                placeholder="Catatan untuk shift ini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="input-end-notes"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setEndShiftOpen(false)}
                className="flex-1"
                data-testid="button-cancel-end-shift"
              >
                Batal
              </Button>
              <Button
                onClick={handleCloseShift}
                disabled={closeShiftMutation.isPending}
                variant="destructive"
                className="flex-1"
                data-testid="button-confirm-end-shift"
              >
                {closeShiftMutation.isPending ? "Menutup..." : "Tutup Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Modal */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              Shift Ditutup
            </DialogTitle>
            <DialogDescription>
              Ringkasan hasil shift kerja Anda
            </DialogDescription>
          </DialogHeader>
          {summaryData && (
            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Pendapatan Bersih:</span>
                  <span className={`font-medium ${
                    summaryData.netIncome >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatCurrency(summaryData.netIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sisa Kas untuk Shift Berikutnya:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(summaryData.remainingCash)}
                  </span>
                </div>
              </div>
              <Button
                onClick={closeSummary}
                className="w-full"
                data-testid="button-close-summary"
              >
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}