import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Category, InsertCategory } from "@shared/schema";

export default function CategoriesSection() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (category: InsertCategory) => {
      const response = await apiRequest('POST', '/api/categories', category);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setShowAddDialog(false);
      toast({
        title: "Kategori berhasil ditambahkan",
        description: "Kategori baru telah dibuat",
      });
    },
    onError: () => {
      toast({
        title: "Gagal menambahkan kategori",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: Partial<InsertCategory> }) => {
      const response = await apiRequest('PUT', `/api/categories/${id}`, category);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingCategory(null);
      toast({
        title: "Kategori berhasil diupdate",
        description: "Kategori telah diperbarui",
      });
    },
    onError: () => {
      toast({
        title: "Gagal update kategori",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiRequest('DELETE', `/api/categories/${id}`);
      } catch (error: any) {
        // apiRequest throws on non-OK responses, so we need to check the error message
        if (error.message.includes('409')) {
          throw new Error("Category is in use and cannot be deleted");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Kategori berhasil dihapus",
        description: "Kategori telah dihapus",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menghapus kategori",
        description: error.message === "Category is in use and cannot be deleted" 
          ? "Kategori masih digunakan oleh menu item dan tidak dapat dihapus"
          : "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const handleToggleActive = (category: Category) => {
    updateCategoryMutation.mutate({
      id: category.id,
      category: { isActive: !category.isActive }
    });
  };

  const handleDelete = (category: Category) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-4 animate-pulse">
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Category Management</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-add-category">
              <Plus className="h-4 w-4" />
              Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              onSubmit={(category) => createCategoryMutation.mutate(category)}
              isLoading={createCategoryMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="alonica-card p-6" data-testid={`card-category-${category.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground text-lg" data-testid={`text-category-name-${category.id}`}>
                    {category.name}
                  </h3>
                  <Badge 
                    variant={category.isActive ? "default" : "secondary"}
                    data-testid={`badge-status-${category.id}`}
                  >
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4" data-testid={`text-description-${category.id}`}>
                    {category.description}
                  </p>
                )}
                
                <div className="text-xs text-muted-foreground mb-4">
                  Created: {new Date(category.createdAt).toLocaleDateString('id-ID')}
                </div>
              </div>
              
              <Switch
                checked={category.isActive}
                onCheckedChange={() => handleToggleActive(category)}
                data-testid={`switch-active-${category.id}`}
              />
            </div>
            
            <div className="flex space-x-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingCategory(category)}
                className="flex items-center gap-1"
                data-testid={`button-edit-${category.id}`}
              >
                <Edit className="h-3 w-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(category)}
                className="flex items-center gap-1 text-destructive hover:text-destructive"
                data-testid={`button-delete-${category.id}`}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground" data-testid="text-no-categories">
            Belum ada kategori. Tambahkan kategori pertama Anda.
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              initialData={editingCategory}
              onSubmit={(category) => updateCategoryMutation.mutate({ id: editingCategory.id, category })}
              isLoading={updateCategoryMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({ 
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  initialData?: Category; 
  onSubmit: (category: InsertCategory) => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<InsertCategory>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          data-testid="input-category-name"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          data-testid="textarea-category-description"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          data-testid="switch-category-active"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" disabled={isLoading} data-testid="button-save-category">
          {isLoading ? 'Saving...' : 'Save Category'}
        </Button>
      </div>
    </form>
  );
}