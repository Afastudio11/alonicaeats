import { useState } from "react";
import { useLocation } from "wouter";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
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
      setLocation("/admin");
      toast({
        title: "Login berhasil",
        description: "Selamat datang di admin dashboard",
      });
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

        <Button
          onClick={handleStartOrder}
          className="w-full h-14 bg-transparent border-2 border-white text-white font-medium rounded-xl hover:bg-white hover:text-primary transition-all"
          data-testid="button-start-order"
        >
          Pesan Sekarang
        </Button>
      </div>
    </div>
  );
}
