import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getStockStatus, getStockColor } from "@/lib/utils";
import { INVENTORY_CATEGORIES } from "@/lib/constants";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";

export default function InventorySection() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ items: InventoryItem[]; total: number }>({
    queryKey: ["/api/inventory"],
  });

  const inventoryItems = data?.items || [];

  const createItemMutation = useMutation({
    mutationFn: async (item: InsertInventoryItem) => {
      const response = await apiRequest('POST', '/api/inventory', item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setShowAddDialog(false);
      toast({
        title: "Item berhasil ditambahkan",
        description: "Inventory item baru telah dibuat",
      });
    },
    onError: () => {
      toast({
        title: "Gagal menambahkan item",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<InsertInventoryItem> }) => {
      const response = await apiRequest('PUT', `/api/inventory/${id}`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      setEditingItem(null);
      toast({
        title: "Item berhasil diupdate",
        description: "Inventory item telah diperbarui",
      });
    },
    onError: () => {
      toast({
        title: "Gagal update item",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const filteredItems = inventoryItems.filter(item => 
    categoryFilter === 'all' || item.category === categoryFilter
  );

  // Calculate stock statistics
  const totalItems = inventoryItems.length;
  const criticalStock = inventoryItems.filter(item => 
    getStockStatus(item.currentStock, item.minStock, item.maxStock) === 'critical'
  ).length;
  const lowStock = inventoryItems.filter(item => 
    getStockStatus(item.currentStock, item.minStock, item.maxStock) === 'low'
  ).length;
  const sufficientStock = inventoryItems.filter(item => 
    getStockStatus(item.currentStock, item.minStock, item.maxStock) === 'sufficient'
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-4 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
        <div className="alonica-card p-4 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="alonica-card p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground" data-testid="stat-total-items">
              {totalItems}
            </p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </div>
        </div>
        <div className="alonica-card p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive" data-testid="stat-critical-stock">
              {criticalStock}
            </p>
            <p className="text-sm text-muted-foreground">Critical Stock</p>
          </div>
        </div>
        <div className="alonica-card p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600" data-testid="stat-low-stock">
              {lowStock}
            </p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </div>
        </div>
        <div className="alonica-card p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600" data-testid="stat-sufficient-stock">
              {sufficientStock}
            </p>
            <p className="text-sm text-muted-foreground">Sufficient</p>
          </div>
        </div>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-refresh-inventory"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-add-inventory-item">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Tambah item baru ke inventory dengan detail stok dan supplier.
                </DialogDescription>
              </DialogHeader>
              <InventoryItemForm
                onSubmit={(item) => createItemMutation.mutate(item)}
                isLoading={createItemMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === 'all' ? "default" : "outline"}
          onClick={() => setCategoryFilter('all')}
          data-testid="button-filter-all"
        >
          All
        </Button>
        {INVENTORY_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={categoryFilter === category ? "default" : "outline"}
            onClick={() => setCategoryFilter(category)}
            data-testid={`button-filter-${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="alonica-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Min/Max
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minStock, item.maxStock);
                const stockPercentage = (item.currentStock / item.maxStock) * 100;
                
                return (
                  <tr key={item.id} data-testid={`row-inventory-${item.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getStockColor(stockStatus)}`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {item.minStock}/{item.maxStock} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        className={
                          stockStatus === 'critical' ? 'bg-red-100 text-red-800' :
                          stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }
                        data-testid={`status-${item.id}`}
                      >
                        {stockStatus === 'critical' ? 'Critical' : 
                         stockStatus === 'low' ? 'Low' : 'Sufficient'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {item.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItem(item)}
                        data-testid={`button-edit-inventory-${item.id}`}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-inventory-items">
              Belum ada inventory item
            </p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <InventoryItemForm
              initialData={editingItem}
              onSubmit={(item) => updateItemMutation.mutate({ id: editingItem.id, item })}
              isLoading={updateItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InventoryItemForm({ 
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  initialData?: InventoryItem; 
  onSubmit: (item: InsertInventoryItem) => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<InsertInventoryItem>({
    name: initialData?.name || '',
    category: initialData?.category || 'Bahan Pokok',
    currentStock: initialData?.currentStock || 0,
    minStock: initialData?.minStock || 0,
    maxStock: initialData?.maxStock || 100,
    unit: initialData?.unit || 'kg',
    pricePerUnit: initialData?.pricePerUnit || 0,
    supplier: initialData?.supplier || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          data-testid="input-inventory-name"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
        >
          <SelectTrigger data-testid="select-inventory-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentStock">Current Stock</Label>
          <Input
            id="currentStock"
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
            required
            data-testid="input-current-stock"
          />
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
            required
            data-testid="input-unit"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minStock">Min Stock</Label>
          <Input
            id="minStock"
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
            required
            data-testid="input-min-stock"
          />
        </div>
        <div>
          <Label htmlFor="maxStock">Max Stock</Label>
          <Input
            id="maxStock"
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData(prev => ({ ...prev, maxStock: parseInt(e.target.value) || 0 }))}
            required
            data-testid="input-max-stock"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pricePerUnit">Price per Unit (Rp)</Label>
        <Input
          id="pricePerUnit"
          type="number"
          value={formData.pricePerUnit}
          onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: parseInt(e.target.value) || 0 }))}
          required
          data-testid="input-price-per-unit"
        />
      </div>

      <div>
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          value={formData.supplier || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          data-testid="input-supplier"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-save-inventory">
        {isLoading ? "Saving..." : "Save Item"}
      </Button>
    </form>
  );
}
