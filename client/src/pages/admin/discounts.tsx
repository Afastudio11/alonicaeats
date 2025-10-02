import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Percent, DollarSign, Edit, Trash2, Save, X, Calendar, Tag, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { apiRequest } from "@/lib/queryClient";
import { insertDiscountSchema, type Discount, type Category, type MenuItem } from "@shared/schema";

// Form schema for discount management  
const discountFormSchema = insertDiscountSchema.omit({
  startDate: true,
  endDate: true,
  categoryIds: true,
  menuItemIds: true,
}).extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  menuItemIds: z.array(z.string()).optional(),
});

const discountTypes = [
  { value: "percentage", label: "Persentase (%)", icon: Percent },
  { value: "fixed", label: "Nominal Tetap (IDR)", icon: DollarSign }
];

export default function DiscountsSection() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { createErrorHandler } = useErrorHandler();
  const queryClient = useQueryClient();

  // Form for discount management
  const form = useForm<z.infer<typeof discountFormSchema>>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "percentage",
      value: 0,
      isActive: true,
      applyToAll: false,
      categoryIds: [],
      menuItemIds: [],
      startDate: "",
      endDate: ""
    }
  });

  // Queries
  const { data: discounts = [], isLoading } = useQuery<Discount[]>({
    queryKey: ["/api/discounts"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Mutations
  const createDiscountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof discountFormSchema>) => {
      const transformedData = {
        ...data,
        startDate: data.startDate && data.startDate.trim() !== '' ? new Date(data.startDate) : null,
        endDate: data.endDate && data.endDate.trim() !== '' ? new Date(data.endDate) : null,
        categoryIds: data.categoryIds && data.categoryIds.length > 0 ? data.categoryIds : null,
        menuItemIds: data.menuItemIds && data.menuItemIds.length > 0 ? data.menuItemIds : null,
      };
      const response = await apiRequest('POST', '/api/discounts', transformedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      form.reset();
      setShowForm(false);
      toast({
        title: "Discount berhasil dibuat",
        description: "Discount baru telah ditambahkan ke sistem",
      });
    },
    onError: createErrorHandler("Gagal membuat discount")
  });

  const updateDiscountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof discountFormSchema>> }) => {
      const transformedData: Record<string, any> = { ...data };
      
      // Only transform fields that are actually provided
      if ('startDate' in data) {
        transformedData.startDate = data.startDate && data.startDate.trim() !== '' ? new Date(data.startDate) : null;
      }
      if ('endDate' in data) {
        transformedData.endDate = data.endDate && data.endDate.trim() !== '' ? new Date(data.endDate) : null;
      }
      if ('categoryIds' in data) {
        transformedData.categoryIds = data.categoryIds && data.categoryIds.length > 0 ? data.categoryIds : null;
      }
      if ('menuItemIds' in data) {
        transformedData.menuItemIds = data.menuItemIds && data.menuItemIds.length > 0 ? data.menuItemIds : null;
      }
      
      const response = await apiRequest('PUT', `/api/discounts/${id}`, transformedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      setEditingId(null);
      toast({
        title: "Discount berhasil diperbarui",
        description: "Perubahan discount telah disimpan",
      });
    },
    onError: createErrorHandler("Gagal memperbarui discount")
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/discounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: "Discount berhasil dihapus",
        description: "Discount telah dihapus dari sistem",
      });
    },
    onError: createErrorHandler("Gagal menghapus discount")
  });

  const handleSubmit = (data: z.infer<typeof discountFormSchema>) => {
    if (editingId) {
      updateDiscountMutation.mutate({ id: editingId, data });
    } else {
      createDiscountMutation.mutate(data);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setShowForm(true);
    form.reset({
      ...discount,
      startDate: discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : "",
      endDate: discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : "",
      categoryIds: Array.isArray(discount.categoryIds) ? discount.categoryIds : [],
      menuItemIds: Array.isArray(discount.menuItemIds) ? discount.menuItemIds : [],
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus discount ini?")) {
      deleteDiscountMutation.mutate(id);
    }
  };

  const toggleDiscountStatus = (discount: Discount) => {
    updateDiscountMutation.mutate({
      id: discount.id,
      data: { isActive: !discount.isActive }
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    form.reset();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get discount display value
  const getDiscountDisplay = (discount: Discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    } else {
      return formatCurrency(discount.value);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="alonica-card p-6 animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
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
        <h1 className="text-2xl font-playfair font-bold text-foreground" data-testid="text-discounts-title">
          Kelola Discount
        </h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-toggle-discount-form"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Tutup Form" : "Tambah Discount"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Discount</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-discounts">
                  {discounts.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {discounts.filter(d => d.isActive).length} aktif
                </p>
              </div>
              <Tag className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discount Persentase</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-percentage-discounts">
                  {discounts.filter(d => d.type === 'percentage').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rata-rata: {Math.round(discounts.filter(d => d.type === 'percentage').reduce((sum, d) => sum + d.value, 0) / Math.max(discounts.filter(d => d.type === 'percentage').length, 1))}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discount Nominal</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-fixed-discounts">
                  {discounts.filter(d => d.type === 'fixed').length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {discounts.filter(d => d.type === 'fixed').length > 0 && 
                    `Rata-rata: ${formatCurrency(discounts.filter(d => d.type === 'fixed').reduce((sum, d) => sum + d.value, 0) / discounts.filter(d => d.type === 'fixed').length)}`
                  }
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discount Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {editingId ? "Edit Discount" : "Tambah Discount Baru"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Discount *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Contoh: Weekend Sale, Promo Ramadan"
                            data-testid="input-discount-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Discount *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-discount-type">
                              <SelectValue placeholder="Pilih jenis discount" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {discountTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Value */}
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nilai Discount * {form.watch("type") === "percentage" ? "(0-100%)" : "(IDR)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max={form.watch("type") === "percentage" ? "100" : undefined}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            placeholder={form.watch("type") === "percentage" ? "10" : "50000"}
                            data-testid="input-discount-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Status Aktif</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Discount dapat digunakan pelanggan
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-discount-active"
                          />
                        </FormControl>
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
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Deskripsi detail tentang discount ini..."
                          rows={3}
                          data-testid="input-discount-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Mulai (opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-discount-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Berakhir (opsional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-discount-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Apply to All Toggle */}
                <FormField
                  control={form.control}
                  name="applyToAll"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Berlaku untuk Semua Item</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Jika diaktifkan, discount berlaku untuk semua menu
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-discount-apply-all"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Category and Menu Item Selection - only shown when not apply to all */}
                {!form.watch("applyToAll") && (
                  <div className="space-y-6 border rounded-lg p-4 bg-muted/30">
                    <div>
                      <FormLabel className="text-base font-medium">Target Discount</FormLabel>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pilih kategori atau item menu yang akan mendapat discount
                      </p>
                    </div>

                    {/* Categories Selection */}
                    <FormField
                      control={form.control}
                      name="categoryIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori yang Mendapat Discount</FormLabel>
                          {categories.length === 0 ? (
                            <div className="border rounded-lg p-6 text-center bg-muted/50">
                              <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Belum ada kategori. Silakan buat kategori terlebih dahulu di menu Kategori.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                              {categories.map((category) => (
                                <div key={category.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`category-${category.id}`}
                                    checked={field.value?.includes(category.id) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValues, category.id]);
                                      } else {
                                        field.onChange(currentValues.filter(id => id !== category.id));
                                      }
                                    }}
                                    data-testid={`checkbox-category-${category.id}`}
                                  />
                                  <Label
                                    htmlFor={`category-${category.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {category.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {field.value.map(categoryId => {
                                const category = categories.find(c => c.id === categoryId);
                                return category ? (
                                  <Badge key={categoryId} variant="secondary" className="text-xs">
                                    {category.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Menu Items Selection */}
                    <FormField
                      control={form.control}
                      name="menuItemIds"
                      render={({ field }) => {
                        const selectedCategories = form.watch("categoryIds") || [];
                        const filteredMenuItems = selectedCategories.length > 0
                          ? menuItems.filter(item => selectedCategories.includes(item.categoryId))
                          : menuItems;

                        return (
                          <FormItem>
                            <FormLabel>Item Menu yang Mendapat Discount</FormLabel>
                            {menuItems.length === 0 ? (
                              <div className="border rounded-lg p-6 text-center bg-muted/50">
                                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Belum ada item menu. Silakan buat item menu terlebih dahulu di menu Menu Items.
                                </p>
                              </div>
                            ) : filteredMenuItems.length === 0 && selectedCategories.length > 0 ? (
                              <div className="border rounded-lg p-6 text-center bg-blue-50 dark:bg-blue-900/20">
                                <Tag className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Tidak ada item menu di kategori yang dipilih. Anda bisa tetap menyimpan untuk menerapkan discount ke seluruh kategori.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                                {filteredMenuItems.map((item) => (
                                  <div key={item.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`item-${item.id}`}
                                      checked={field.value?.includes(item.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValues, item.id]);
                                        } else {
                                          field.onChange(currentValues.filter(id => id !== item.id));
                                        }
                                      }}
                                      data-testid={`checkbox-item-${item.id}`}
                                    />
                                    <Label
                                      htmlFor={`item-${item.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {item.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {field.value.map(itemId => {
                                  const item = menuItems.find(i => i.id === itemId);
                                  return item ? (
                                    <Badge key={itemId} variant="secondary" className="text-xs">
                                      {item.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <strong>Catatan:</strong> Discount akan berlaku untuk:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Kategori yang dipilih (semua item di kategori tersebut)</li>
                        <li>Item menu spesifik yang dipilih</li>
                        <li>Atau keduanya</li>
                      </ul>
                      <p className="mt-2">
                        <strong className="text-destructive">Penting:</strong> Minimal pilih 1 kategori atau 1 item menu agar discount berfungsi.
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel-discount"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDiscountMutation.isPending || updateDiscountMutation.isPending}
                    data-testid="button-submit-discount"
                  >
                    {(createDiscountMutation.isPending || updateDiscountMutation.isPending) ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? "Perbarui" : "Simpan"} Discount
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Discounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Daftar Discount
          </CardTitle>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada discount yang dibuat</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik tombol "Tambah Discount" untuk mulai membuat discount
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {discounts.map((discount) => (
                <Card key={discount.id} className={`relative ${!discount.isActive ? 'opacity-60' : ''}`} data-testid={`discount-card-${discount.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1" data-testid={`discount-name-${discount.id}`}>
                          {discount.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={discount.isActive ? "default" : "secondary"}>
                            {discount.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                          <Badge variant="outline">
                            {discount.type === 'percentage' ? 'Persentase' : 'Nominal'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDiscountStatus(discount)}
                        data-testid={`button-toggle-status-${discount.id}`}
                      >
                        {discount.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Nilai Discount:</span>
                        <span className="text-lg font-bold text-primary" data-testid={`discount-value-${discount.id}`}>
                          {getDiscountDisplay(discount)}
                        </span>
                      </div>

                      {discount.description && (
                        <p className="text-sm text-muted-foreground">{discount.description}</p>
                      )}

                      {(discount.startDate || discount.endDate) && (
                        <div className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {discount.startDate && new Date(discount.startDate).toLocaleDateString('id-ID')}
                          {discount.startDate && discount.endDate && " - "}
                          {discount.endDate && new Date(discount.endDate).toLocaleDateString('id-ID')}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center">
                          <Tag className="h-3 w-3 mr-1" />
                          {discount.applyToAll ? "Semua item" : "Item terpilih"}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(discount)}
                        data-testid={`button-edit-${discount.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(discount.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-${discount.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}