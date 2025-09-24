import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Shield, CreditCard, Printer, Settings, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Navigate based on user role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'kasir') {
        navigate('/kasir');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(username, password);
      toast({
        title: "Login berhasil",
        description: "Selamat datang kembali!",
      });
    } catch (err: any) {
      const errorMessage = err?.message || "Login gagal. Periksa kembali username dan password Anda.";
      setError(errorMessage);
      toast({
        title: "Login gagal",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (defaultUsername: string, defaultPassword: string, role: string) => {
    setUsername(defaultUsername);
    setPassword(defaultPassword);
    setIsLoading(true);
    setError("");

    try {
      // First, try to login
      await login(defaultUsername, defaultPassword);
      toast({
        title: "Login berhasil",
        description: `Masuk sebagai ${role}`,
      });
    } catch (err: any) {
      // If login fails, try to initialize default users first
      try {
        const response = await fetch('/api/auth/init-default-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Default users initialized:', result);
          
          // Now try to login again
          await login(defaultUsername, defaultPassword);
          toast({
            title: "Login berhasil",
            description: `User ${role} berhasil dibuat dan login berhasil`,
          });
        } else {
          throw new Error('Failed to initialize default users');
        }
      } catch (initError) {
        const errorMessage = err?.message || `Login ${role} gagal. Tidak dapat membuat user default.`;
        setError(errorMessage);
        toast({
          title: "Login gagal",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Login Berhasil</CardTitle>
            <CardDescription>
              Selamat datang, {user.username}! ({user.role})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => navigate(user.role === 'admin' ? '/admin' : '/kasir')}
              className="w-full bg-red-600 hover:bg-red-700"
              data-testid="button-go-dashboard"
            >
              {user.role === 'admin' ? 'Buka Admin Dashboard' : 'Buka Kasir Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-800">
            Alonica Restaurant
          </CardTitle>
          <CardDescription className="text-lg">
            Sistem Self-Order - Login Dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Login</TabsTrigger>
              <TabsTrigger value="quick">Quick Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      required
                      className="pl-10"
                      data-testid="input-username"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                      className="pl-10"
                      data-testid="input-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="quick" className="space-y-4">
              <div className="text-sm text-gray-600 text-center mb-4">
                Akun default untuk testing (akan dibuat otomatis jika belum ada):
              </div>
              
              <div className="grid gap-3">
                <Button
                  onClick={() => quickLogin("admin", "admin123", "Admin")}
                  variant="outline"
                  className="justify-start h-auto p-4 border-red-200 hover:bg-red-50"
                  disabled={isLoading}
                  data-testid="button-quick-admin"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-red-800">Admin</div>
                      <div className="text-sm text-gray-500">Username: admin | Password: admin123</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => quickLogin("kasir1", "kasir123", "Kasir 1")}
                  variant="outline"
                  className="justify-start h-auto p-4 border-blue-200 hover:bg-blue-50"
                  disabled={isLoading}
                  data-testid="button-quick-kasir1"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-blue-800">Kasir 1</div>
                      <div className="text-sm text-gray-500">Username: kasir1 | Password: kasir123</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => quickLogin("kasir2", "kasir456", "Kasir 2")}
                  variant="outline"
                  className="justify-start h-auto p-4 border-blue-200 hover:bg-blue-50"
                  disabled={isLoading}
                  data-testid="button-quick-kasir2"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-blue-800">Kasir 2</div>
                      <div className="text-sm text-gray-500">Username: kasir2 | Password: kasir456</div>
                    </div>
                  </div>
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                💡 Tip: Gunakan quick login untuk testing, atau manual login jika sudah punya akun
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                data-testid="button-back-home"
              >
                ← Kembali ke Beranda
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/printer')}
                data-testid="button-printer"
              >
                <Printer className="w-4 h-4 mr-1" />
                Printer Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}