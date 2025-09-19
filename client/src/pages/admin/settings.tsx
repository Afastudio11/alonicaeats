import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Building, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StoreProfile, InsertStoreProfile } from "@shared/schema";

export default function SettingsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<InsertStoreProfile>>({
    restaurantName: "",
    address: "",
    phone: "",
    email: "",
    description: ""
  });

  const { data: storeProfile, isLoading } = useQuery<StoreProfile | null>({
    queryKey: ["/api/store-profile"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertStoreProfile>) => {
      console.log('Attempting to save store profile:', data);
      console.log('Current store profile ID:', storeProfile?.id);
      
      try {
        if (storeProfile?.id) {
          // Update existing profile
          console.log('Updating existing profile with ID:', storeProfile.id);
          const response = await apiRequest('PUT', `/api/store-profile/${storeProfile.id}`, data);
          const result = await response.json();
          console.log('Update response:', result);
          return result;
        } else {
          // Create new profile
          console.log('Creating new profile');
          const response = await apiRequest('POST', '/api/store-profile', data);
          const result = await response.json();
          console.log('Create response:', result);
          return result;
        }
      } catch (error) {
        console.error('Store profile save error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-profile'] });
      toast({
        title: "Profile berhasil disimpan",
        description: "Informasi toko telah diperbarui",
      });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast({
        title: "Gagal menyimpan profile",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  // Update form data when store profile loads
  useEffect(() => {
    if (storeProfile) {
      setFormData({
        restaurantName: storeProfile.restaurantName || "",
        address: storeProfile.address || "",
        phone: storeProfile.phone || "",
        email: storeProfile.email || "",
        description: storeProfile.description || ""
      });
    }
  }, [storeProfile]);

  const handleInputChange = (field: keyof InsertStoreProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="alonica-card p-6 animate-pulse">
          <div className="h-8 bg-muted rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="alonica-card p-6">
        <div className="flex items-center space-x-3">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">
              Store Settings
            </h1>
            <p className="text-muted-foreground">
              Kelola informasi toko untuk ditampilkan di receipt
            </p>
          </div>
        </div>
      </div>

      {/* Store Profile Form */}
      <div className="alonica-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Restaurant Name */}
            <div className="space-y-2">
              <Label htmlFor="restaurantName" className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Nama Restaurant</span>
              </Label>
              <Input
                id="restaurantName"
                value={formData.restaurantName || ""}
                onChange={(e) => handleInputChange("restaurantName", e.target.value)}
                placeholder="Masukkan nama restaurant"
                required
                data-testid="input-restaurant-name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="info@restaurant.com"
                data-testid="input-email"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Telepon</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(021) 555-0123"
                data-testid="input-phone"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Alamat</span>
            </Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Jl. Kuliner Rasa No. 123"
              data-testid="input-address"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi Restaurant</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Restaurant dengan cita rasa Indonesia yang autentik"
              rows={3}
              data-testid="input-description"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-save-profile"
            >
              <Save className="h-4 w-4" />
              <span>
                {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan Profile"}
              </span>
            </Button>
          </div>
        </form>
      </div>

      {/* Preview Receipt Info */}
      <div className="alonica-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Preview Receipt Header
        </h2>
        <div className="bg-muted p-6 rounded-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-2" data-testid="preview-restaurant-name">
              {formData.restaurantName || "Nama Restaurant"}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="preview-address">
              {formData.address || "Alamat restaurant"}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="preview-phone">
              {formData.phone ? `Telp: ${formData.phone}` : "Telp: -"}
            </p>
            {formData.email && (
              <p className="text-sm text-muted-foreground" data-testid="preview-email">
                Email: {formData.email}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          * Informasi ini akan ditampilkan di header receipt customer
        </p>
      </div>
    </div>
  );
}