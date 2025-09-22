import { useState } from "react";
import { useLocation } from "wouter";
import { Settings, Calendar, Clock, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const reservationSchema = z.object({
  customerName: z.string().min(2, "Nama harus minimal 2 karakter"),
  phoneNumber: z.string().min(10, "Nomor telepon harus minimal 10 digit").regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid"),
  guestCount: z.number().min(1, "Jumlah tamu minimal 1").max(20, "Jumlah tamu maksimal 20"),
  reservationDate: z.string().min(1, "Tanggal reservasi harus diisi"),
  reservationTime: z.string().min(1, "Waktu reservasi harus diisi"),
  notes: z.string().optional(),
});

function ReservationForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof reservationSchema>>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      guestCount: 1,
      reservationDate: "",
      reservationTime: "",
      notes: "",
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reservationSchema>) => {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create reservation");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate reservations query to refresh admin dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({
        title: "Reservasi berhasil dibuat!",
        description: "Kami akan menghubungi Anda untuk konfirmasi reservasi.",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Gagal membuat reservasi",
        description: "Silakan coba lagi atau hubungi restoran langsung.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof reservationSchema>) => {
    createReservationMutation.mutate(data);
  };

  // Generate time options (every 30 minutes from 10:00 to 22:00)
  const timeOptions: string[] = [];
  for (let hour = 10; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Anda</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama lengkap" {...field} data-testid="input-reservation-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor Telepon</FormLabel>
              <FormControl>
                <Input placeholder="08xxxxxxxxxx" {...field} data-testid="input-reservation-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="guestCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Tamu</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  data-testid="input-reservation-guests"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="reservationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Reservasi</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...field}
                  data-testid="input-reservation-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="reservationTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Waktu Reservasi</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-reservation-time">
                    <SelectValue placeholder="Pilih waktu" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan (Opsional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Permintaan khusus atau catatan lainnya"
                  {...field}
                  data-testid="input-reservation-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-reservation">
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={createReservationMutation.isPending}
            data-testid="button-submit-reservation"
          >
            {createReservationMutation.isPending ? "Menyimpan..." : "Buat Reservasi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const handleStartOrder = () => {
    if (!customerName.trim() || !tableNumber.trim()) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi nama dan nomor meja",
        variant: "destructive",
      });
      return;
    }

    // Validate table number is numeric and within valid range
    const tableNum = parseInt(tableNumber.trim());
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 999) {
      toast({
        title: "Nomor meja tidak valid",
        description: "Nomor meja harus berupa angka (1-999)",
        variant: "destructive",
      });
      return;
    }

    // Store customer data
    localStorage.setItem('alonica-customer', JSON.stringify({
      name: customerName.trim(),
      table: tableNumber.trim()
    }));

    setLocation("/menu");
  };

  const handleAdminLogin = async () => {
    try {
      await login(adminUsername, adminPassword);
      setShowAdminLogin(false);
      
      // Get user from auth hook after successful login
      const savedUser = localStorage.getItem('alonica-user');
      const userData = savedUser ? JSON.parse(savedUser) : null;
      
      // Redirect based on user role
      if (userData?.role === 'kasir') {
        setLocation("/kasir/orders");
        toast({
          title: "Login berhasil",
          description: "Selamat datang di kasir dashboard",
        });
      } else {
        setLocation("/admin");
        toast({
          title: "Login berhasil",
          description: "Selamat datang di admin dashboard",
        });
      }
    } catch (error) {
      toast({
        title: "Login gagal",
        description: "Username atau password salah",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col justify-center items-center px-6 relative">
      {/* Admin Access Button */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10"
            data-testid="button-admin-access"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-center">Admin Login</DialogTitle>
            <DialogDescription className="text-center">
              Masukkan kredensial admin untuk mengakses dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              data-testid="input-admin-username"
            />
            <Input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              data-testid="input-admin-password"
            />
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowAdminLogin(false)}
                data-testid="button-cancel-admin"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAdminLogin}
                data-testid="button-login-admin"
              >
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center text-white">
          <h1 className="text-2xl mb-2 font-inter font-normal">Welcome to</h1>
          <h2 className="text-5xl font-playfair font-bold mb-8" data-testid="text-brand-name">Alonica</h2>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Nama Kamu"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full h-14 px-4 rounded-xl bg-white text-foreground placeholder-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-white/30"
            data-testid="input-customer-name"
          />
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Nomor Meja Kamu"
            value={tableNumber}
            onChange={(e) => {
              // Only allow numeric characters
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              setTableNumber(numericValue);
            }}
            className="w-full h-14 px-4 rounded-xl bg-white text-foreground placeholder-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-white/30"
            data-testid="input-table-number"
          />
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleStartOrder}
            className="w-full h-14 bg-transparent border-2 border-white text-white font-medium rounded-xl hover:bg-white hover:text-primary transition-all"
            data-testid="button-start-order"
          >
            Pesan Sekarang
          </Button>
          
          <div className="text-center text-white/70 text-sm">atau</div>
          
          <Dialog open={showReservation} onOpenChange={setShowReservation}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 bg-white/10 border-2 border-white/30 text-white font-medium rounded-xl hover:bg-white/20 transition-all"
                data-testid="button-make-reservation"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Buat Reservasi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Buat Reservasi
                </DialogTitle>
                <DialogDescription>
                  Buat reservasi meja untuk tanggal dan waktu yang diinginkan.
                </DialogDescription>
              </DialogHeader>
              <ReservationForm onClose={() => setShowReservation(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
