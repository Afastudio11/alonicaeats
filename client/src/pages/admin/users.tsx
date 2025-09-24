import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, type User, type InsertUser } from "@shared/schema";

// Schema for creating new users
const createUserSchema = insertUserSchema;

// Schema for editing users (password is optional)
const editUserSchema = insertUserSchema.extend({
  password: z.string().optional()
});

export default function UsersSection() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { createErrorHandler } = useErrorHandler();
  const { confirm, dialog } = useConfirmDialog();
  const queryClient = useQueryClient();
  
  // Form for creating new users
  const createForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "kasir"
    }
  });
  
  // Form for editing existing users
  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "kasir"
    }
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (user: InsertUser) => {
      const response = await apiRequest('POST', '/api/users', user);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowAddDialog(false);
      createForm.reset();
      toast({
        title: "User berhasil ditambahkan",
        description: "User baru telah dibuat",
      });
    },
    onError: createErrorHandler("Gagal menambahkan user")
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, user }: { id: string; user: Partial<InsertUser> }) => {
      const response = await apiRequest('PUT', `/api/users/${id}`, user);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "User berhasil diupdate",
        description: "Data user telah diperbarui",
      });
    },
    onError: createErrorHandler("Gagal update user")
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User berhasil dihapus",
        description: "User telah dihapus",
      });
    },
    onError: createErrorHandler("Gagal menghapus user")
  });

  const handleCreateSubmit = (data: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(data);
  };

  const handleEditSubmit = (data: z.infer<typeof editUserSchema>) => {
    if (!editingUser) return;
    
    // Only send fields that have values for editing
    const updateData: Partial<InsertUser> = {
      username: data.username,
      role: data.role
    };
    
    // Only include password if it's being changed
    if (data.password && data.password.trim() !== "") {
      updateData.password = data.password;
    }
    
    updateUserMutation.mutate({
      id: editingUser.id,
      user: updateData
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      password: "", // Don't populate password for security
      role: user.role
    });
  };

  const handleDelete = (user: User) => {
    confirm({
      title: "Hapus User",
      description: `Apakah Anda yakin ingin menghapus user "${user.username}"?`,
      confirmText: "Hapus",
      variant: "destructive",
      onConfirm: () => deleteUserMutation.mutate(user.id),
    });
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingUser(null);
    createForm.reset();
    editForm.reset();
    setShowPassword(false);
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

  const currentForm = editingUser ? editForm : createForm;
  const isDialogOpen = showAddDialog || !!editingUser;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-playfair font-bold text-foreground" data-testid="text-users-title">
          Manajemen Pengguna
        </h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-2" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" data-testid="dialog-user-form">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingUser ? "Edit User" : "Tambah User Baru"}
              </DialogTitle>
            </DialogHeader>
            <Form {...currentForm}>
              <form onSubmit={currentForm.handleSubmit(editingUser ? handleEditSubmit : handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={currentForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Masukkan username"
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={currentForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {editingUser ? "Password Baru (opsional)" : "Password"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder={editingUser ? "Kosongkan jika tidak ingin mengubah" : "Masukkan password"}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={currentForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Pilih role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kasir">Kasir</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingUser ? "Updating..." : "Creating..."}
                      </div>
                    ) : (
                      editingUser ? "Update User" : "Tambah User"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {users.map((user) => (
          <div key={user.id} className="alonica-card p-6" data-testid={`card-user-${user.id}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground" data-testid={`text-username-${user.id}`}>
                  {user.username}
                </h3>
                <Badge 
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  data-testid={`badge-role-${user.id}`}
                >
                  {user.role === 'admin' ? 'Admin' : 'Kasir'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(user)}
                  data-testid={`button-edit-${user.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(user)}
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-delete-${user.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>ID: {user.id}</p>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12" data-testid="text-no-users">
          <p className="text-muted-foreground">Belum ada user yang dibuat</p>
        </div>
      )}

      {dialog}
    </div>
  );
}