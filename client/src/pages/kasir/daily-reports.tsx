import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Save, Eye, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { insertDailyReportSchema, type DailyReport, type InsertDailyReport } from "@shared/schema";

// Form schema for daily reports
const dailyReportFormSchema = insertDailyReportSchema.extend({
  reportDate: z.coerce.date()
});

export default function DailyReportsSection() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const { createErrorHandler } = useErrorHandler();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form for daily report
  const form = useForm<z.infer<typeof dailyReportFormSchema>>({
    resolver: zodResolver(dailyReportFormSchema),
    defaultValues: {
      reportDate: new Date(),
      cashierId: user?.id || "",
      totalRevenueCash: 0,
      totalRevenueNonCash: 0,
      totalRevenue: 0,
      physicalCashAmount: 0,
      cashDifference: 0,
      totalOrders: 0,
      cashOrders: 0,
      nonCashOrders: 0,
      notes: ""
    }
  });

  // Get daily reports
  const { data: reports = [], isLoading } = useQuery<DailyReport[]>({
    queryKey: ["/api/daily-reports"],
  });

  // Get today's report if exists
  const todayReport = reports.find(report => {
    const reportDate = new Date(report.reportDate).toDateString();
    const today = new Date().toDateString();
    return reportDate === today;
  });

  // Create/update daily report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dailyReportFormSchema>) => {
      // Calculate derived fields
      const formData = {
        ...data,
        totalRevenue: (data.totalRevenueCash || 0) + (data.totalRevenueNonCash || 0),
        cashDifference: (data.physicalCashAmount || 0) - (data.totalRevenueCash || 0),
        totalOrders: (data.cashOrders || 0) + (data.nonCashOrders || 0),
        cashierId: user?.id || ""
      };

      if (todayReport) {
        // Update existing report
        const response = await apiRequest('PUT', `/api/daily-reports/${todayReport.id}`, formData);
        return response.json();
      } else {
        // Create new report
        const response = await apiRequest('POST', '/api/daily-reports', formData);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({
        title: "Laporan berhasil disimpan",
        description: "Laporan harian telah disimpan",
      });
    },
    onError: createErrorHandler("Gagal menyimpan laporan harian")
  });

  const handleSubmit = (data: z.infer<typeof dailyReportFormSchema>) => {
    submitReportMutation.mutate(data);
  };

  // Calculate real-time values
  const totalRevenueCash = form.watch("totalRevenueCash") || 0;
  const totalRevenueNonCash = form.watch("totalRevenueNonCash") || 0;
  const physicalCashAmount = form.watch("physicalCashAmount") || 0;
  const cashOrders = form.watch("cashOrders") || 0;
  const nonCashOrders = form.watch("nonCashOrders") || 0;

  const totalRevenue = totalRevenueCash + totalRevenueNonCash;
  const cashDifference = physicalCashAmount - totalRevenueCash;
  const totalOrders = cashOrders + nonCashOrders;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Load today's report into form if exists
  useEffect(() => {
    if (todayReport) {
      form.reset({
        reportDate: new Date(todayReport.reportDate),
        cashierId: todayReport.cashierId,
        totalRevenueCash: todayReport.totalRevenueCash,
        totalRevenueNonCash: todayReport.totalRevenueNonCash,
        totalRevenue: todayReport.totalRevenue,
        physicalCashAmount: todayReport.physicalCashAmount,
        cashDifference: todayReport.cashDifference,
        totalOrders: todayReport.totalOrders,
        cashOrders: todayReport.cashOrders,
        nonCashOrders: todayReport.nonCashOrders,
        notes: todayReport.notes || ""
      });
    } else if (user?.id) {
      // Reset to defaults when no report exists
      form.reset({
        reportDate: new Date(),
        cashierId: user.id,
        totalRevenueCash: 0,
        totalRevenueNonCash: 0,
        totalRevenue: 0,
        physicalCashAmount: 0,
        cashDifference: 0,
        totalOrders: 0,
        cashOrders: 0,
        nonCashOrders: 0,
        notes: ""
      });
    }
  }, [todayReport, user?.id, form]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="alonica-card p-6 animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-daily-reports-title">
          Laporan Harian Kasir
        </h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tunai: {formatCurrency(totalRevenueCash)} | Non-Tunai: {formatCurrency(totalRevenueNonCash)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kas Fisik</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-physical-cash">
                  {formatCurrency(physicalCashAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Pesanan: {totalOrders}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selisih Kas</p>
                <p className={`text-2xl font-bold ${cashDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-cash-difference">
                  {cashDifference >= 0 ? '+' : ''}{formatCurrency(cashDifference)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fisik - Tercatat
                </p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cashDifference >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={`h-5 w-5 ${cashDifference >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Report Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {todayReport ? "Edit Laporan Hari Ini" : "Buat Laporan Harian"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cash Revenue */}
                <FormField
                  control={form.control}
                  name="totalRevenueCash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pendapatan Tunai (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          data-testid="input-cash-revenue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Non-Cash Revenue */}
                <FormField
                  control={form.control}
                  name="totalRevenueNonCash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pendapatan Non-Tunai (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          data-testid="input-noncash-revenue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Physical Cash */}
                <FormField
                  control={form.control}
                  name="physicalCashAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kas Fisik yang Dihitung (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          data-testid="input-physical-cash"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cash Difference Display */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Selisih Kas</label>
                  <div className={`p-3 rounded-md border ${
                    cashDifference === 0 
                      ? 'bg-gray-50 border-gray-200' 
                      : cashDifference > 0 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={`font-semibold ${
                      cashDifference === 0 
                        ? 'text-gray-600' 
                        : cashDifference > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`} data-testid="display-cash-difference">
                      {cashDifference >= 0 ? '+' : ''}{formatCurrency(cashDifference)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kas Fisik - Pendapatan Tunai
                    </p>
                  </div>
                </div>

                {/* Cash Orders */}
                <FormField
                  control={form.control}
                  name="cashOrders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Pesanan Tunai</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          data-testid="input-cash-orders"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Non-Cash Orders */}
                <FormField
                  control={form.control}
                  name="nonCashOrders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Pesanan Non-Tunai</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          data-testid="input-noncash-orders"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Catatan tentang shift hari ini, masalah yang terjadi, dll."
                        rows={4}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitReportMutation.isPending}
                  data-testid="button-submit-report"
                >
                  {submitReportMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {todayReport ? "Update Laporan" : "Simpan Laporan"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Laporan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.slice(0, 5).map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`report-item-${report.id}`}>
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(report.reportDate).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrency(report.totalRevenue)} ({report.totalOrders} pesanan)
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={report.cashDifference >= 0 ? "default" : "destructive"}>
                      {report.cashDifference >= 0 ? '+' : ''}{formatCurrency(report.cashDifference)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selisih kas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}