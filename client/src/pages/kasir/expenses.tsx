import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, DollarSign, Calendar, FileText, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { insertExpenseSchema, type Expense, type InsertExpense } from "@shared/schema";

// Form schema for expense recording
const expenseFormSchema = insertExpenseSchema.omit({
  recordedBy: true
}).extend({
  amount: z.number().min(1, "Jumlah pengeluaran harus lebih dari 0"),
  description: z.string().min(1, "Deskripsi pengeluaran harus diisi")
});

const expenseCategories = [
  { value: "operational", label: "Operasional" },
  { value: "maintenance", label: "Perawatan" },
  { value: "supplies", label: "Persediaan" },
  { value: "other", label: "Lainnya" }
];

export default function ExpensesSection() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { createErrorHandler } = useErrorHandler();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form for expense recording
  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      description: "",
      category: "operational",
      notes: ""
    }
  });

  // Get expenses for this cashier
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => {
      if (!user?.id) {
        throw new Error("User authentication required");
      }
      
      const expenseData = {
        ...data,
        recordedBy: user.id
      };
      
      const response = await apiRequest('POST', '/api/expenses', expenseData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      form.reset();
      setShowForm(false);
      toast({
        title: "Pengeluaran berhasil dicatat",
        description: "Pengeluaran telah disimpan ke dalam sistem",
      });
    },
    onError: createErrorHandler("Gagal mencatat pengeluaran")
  });

  const handleSubmit = (data: z.infer<typeof expenseFormSchema>) => {
    createExpenseMutation.mutate(data);
  };


  // Get today's total expenses
  const todayTotal = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.createdAt).toDateString();
      const today = new Date().toDateString();
      return expenseDate === today;
    })
    .reduce((total, expense) => total + expense.amount, 0);

  // Get this week's total expenses
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekTotal = expenses
    .filter(expense => new Date(expense.createdAt) >= weekStart)
    .reduce((total, expense) => total + expense.amount, 0);

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
        <h1 className="text-2xl font-playfair font-bold text-foreground" data-testid="text-expenses-title">
          Pencatatan Pengeluaran
        </h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-toggle-expense-form"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Tutup Form" : "Catat Pengeluaran"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hari Ini</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-today-total">
                  {formatCurrency(todayTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses.filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString()).length} transaksi
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Minggu Ini</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-week-total">
                  {formatCurrency(weekTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses.filter(e => new Date(e.createdAt) >= weekStart).length} transaksi
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pencatatan</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-expenses">
                  {formatCurrency(expenses.reduce((total, expense) => total + expense.amount, 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses.length} transaksi total
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Catat Pengeluaran Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amount */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah Pengeluaran (Rp) *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            data-testid="input-expense-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-expense-category">
                              <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi Pengeluaran *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Contoh: Pembelian gas LPG, Bayar listrik, dll"
                          data-testid="input-expense-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Tambahan (opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Catatan tambahan tentang pengeluaran ini..."
                          rows={3}
                          data-testid="input-expense-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel-expense"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {createExpenseMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Pengeluaran
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pencatatan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada pencatatan pengeluaran</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik tombol "Catat Pengeluaran" untuk mulai mencatat
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`expense-item-${expense.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-foreground">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {expenseCategories.find(cat => cat.value === expense.category)?.label || expense.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(expense.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600" data-testid={`expense-amount-${expense.id}`}>
                      -{formatCurrency(expense.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}