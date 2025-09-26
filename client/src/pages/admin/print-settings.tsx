import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Printer, Edit, Trash2, Save, X, CheckCircle, Settings, Wifi, Usb, Monitor, Play, Bluetooth, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { apiRequest } from "@/lib/queryClient";
import { insertPrintSettingSchema, type PrintSetting } from "@shared/schema";
import { smartPrintReceipt } from "@/utils/thermal-print";

// Form schema for print settings management
const printSettingFormSchema = insertPrintSettingSchema;

const printerTypes = [
  { value: "thermal", label: "Thermal Printer", icon: Printer, description: "Untuk struk dan kitchen ticket" },
  { value: "inkjet", label: "Inkjet Printer", icon: Printer, description: "Printer rumahan biasa" },
  { value: "laser", label: "Laser Printer", icon: Printer, description: "Printer kantor" }
];

const paperSizes = [
  { value: "58mm", label: "58mm", description: "Thermal kecil (struk)" },
  { value: "80mm", label: "80mm", description: "Thermal standar" },
  { value: "a4", label: "A4", description: "Kertas standar" }
];

const connectionTypes = [
  { value: "browser", label: "Browser Print", icon: Monitor, description: "Print via browser (default)" },
  { value: "usb", label: "USB Connection", icon: Usb, description: "Direct USB connection" },
  { value: "network", label: "Network/WiFi", icon: Wifi, description: "IP address atau network" },
  { value: "bluetooth", label: "Bluetooth", icon: Bluetooth, description: "Koneksi wireless bluetooth" }
];

// Interface for discovered bluetooth devices
interface DiscoveredBluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
}

export default function PrintSettingsSection() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBluetoothDialog, setShowBluetoothDialog] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<DiscoveredBluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { createErrorHandler } = useErrorHandler();
  const queryClient = useQueryClient();

  // Form for print settings management
  const form = useForm<z.infer<typeof printSettingFormSchema>>({
    resolver: zodResolver(printSettingFormSchema),
    defaultValues: {
      name: "",
      printerType: "thermal",
      paperSize: "58mm",
      isActive: false,
      printHeader: true,
      printFooter: true,
      printLogo: true,
      fontSize: 12,
      lineSpacing: 1,
      connectionType: "browser",
      connectionString: ""
    }
  });

  // Queries
  const { data: printSettings = [], isLoading } = useQuery<PrintSetting[]>({
    queryKey: ["/api/print-settings"],
  });

  const { data: activeSetting } = useQuery<PrintSetting | null>({
    queryKey: ["/api/print-settings/active"],
  });

  // Mutations
  const createPrintSettingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof printSettingFormSchema>) => {
      const response = await apiRequest('POST', '/api/print-settings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings/active'] });
      form.reset();
      setShowForm(false);
      toast({
        title: "Print setting berhasil dibuat",
        description: "Konfigurasi printer baru telah ditambahkan",
      });
    },
    onError: createErrorHandler("Gagal membuat print setting")
  });

  const updatePrintSettingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof printSettingFormSchema>> }) => {
      const response = await apiRequest('PUT', `/api/print-settings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings/active'] });
      setEditingId(null);
      toast({
        title: "Print setting berhasil diperbarui",
        description: "Konfigurasi printer telah disimpan",
      });
    },
    onError: createErrorHandler("Gagal memperbarui print setting")
  });

  const activatePrintSettingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PUT', `/api/print-settings/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings/active'] });
      toast({
        title: "Print setting diaktifkan",
        description: "Konfigurasi ini sekarang menjadi setting aktif",
      });
    },
    onError: createErrorHandler("Gagal mengaktifkan print setting")
  });

  const deletePrintSettingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/print-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/print-settings/active'] });
      toast({
        title: "Print setting berhasil dihapus",
        description: "Konfigurasi printer telah dihapus",
      });
    },
    onError: createErrorHandler("Gagal menghapus print setting")
  });

  const handleSubmit = (data: z.infer<typeof printSettingFormSchema>) => {
    if (editingId) {
      updatePrintSettingMutation.mutate({ id: editingId, data });
    } else {
      createPrintSettingMutation.mutate(data);
    }
  };

  const handleEdit = (setting: PrintSetting) => {
    setEditingId(setting.id);
    setShowForm(true);
    form.reset({
      ...setting,
      connectionString: setting.connectionString || "",
      connectionType: setting.connectionType as "browser" | "usb" | "network" | "bluetooth"
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus konfigurasi printer ini?")) {
      deletePrintSettingMutation.mutate(id);
    }
  };

  const handleActivate = (id: string) => {
    activatePrintSettingMutation.mutate(id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    form.reset();
  };

  // Bluetooth device discovery function
  const scanBluetoothDevices = async () => {
    setIsScanning(true);
    try {
      // Check if Web Bluetooth API is available
      if (!navigator.bluetooth) {
        toast({
          title: "Bluetooth tidak didukung",
          description: "Browser Anda tidak mendukung Web Bluetooth API. Gunakan Network/WiFi atau USB sebagai alternatif.",
          variant: "destructive"
        });
        return;
      }

      // Request bluetooth device with better filters for printer devices
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "POS" },
          { namePrefix: "ESC" },
          { namePrefix: "Thermal" },
          { namePrefix: "Receipt" },
          { namePrefix: "Printer" }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
          '12345678-1234-5678-1234-56789abcdef0'  // Custom printer service
        ]
      });

      if (device) {
        const newDevice: DiscoveredBluetoothDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          connected: device.gatt?.connected || false
        };

        setBluetoothDevices(prev => {
          const exists = prev.find(d => d.id === newDevice.id);
          if (!exists) {
            return [...prev, newDevice];
          }
          return prev;
        });

        toast({
          title: "Device ditemukan",
          description: `${newDevice.name} telah ditambahkan ke daftar`,
        });
      }
    } catch (error) {
      console.error('Bluetooth scanning error:', error);
      toast({
        title: "Gagal scan bluetooth",
        description: "Pastikan bluetooth aktif dan izinkan akses. Catatan: Thermal printer klasik mungkin tidak mendukung Web Bluetooth.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const selectBluetoothDevice = (device: DiscoveredBluetoothDevice) => {
    form.setValue('connectionString', device.id, { shouldDirty: true });
    setShowBluetoothDialog(false);
    toast({
      title: "Device dipilih",
      description: `${device.name} dipilih sebagai printer bluetooth`,
    });
  };

  const handleConnectionTypeChange = (value: string) => {
    form.setValue('connectionType', value as "browser" | "usb" | "network" | "bluetooth", { shouldDirty: true });
    if (value === 'bluetooth') {
      setShowBluetoothDialog(true);
    }
  };

  const handleTestPrint = async () => {
    const testOrder = {
      id: "TEST-ORDER",
      items: [
        { name: "Test Item 1", price: 25000, quantity: 2, notes: "Test catatan" },
        { name: "Test Item 2", price: 15000, quantity: 1 }
      ],
      subtotal: 65000,
      total: 65000,
      discount: 0,
      customerName: "Test Customer",
      tableNumber: "Test Table",
      paymentMethod: "Test Payment",
      createdAt: new Date().toISOString()
    };
    
    await smartPrintReceipt(testOrder);
    toast({
      title: "Test print dimulai",
      description: "Print test telah dikirim",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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
        <h1 className="text-2xl font-playfair font-bold text-foreground" data-testid="text-print-settings-title">
          Kelola Setting Print
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleTestPrint}
            variant="outline"
            data-testid="button-test-print"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Print
          </Button>
          <Button 
            onClick={() => setShowForm(!showForm)}
            data-testid="button-toggle-print-form"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Tutup Form" : "Tambah Setting"}
          </Button>
        </div>
      </div>

      {/* Active Setting Alert */}
      {activeSetting && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Setting Aktif: {activeSetting.name}
                </p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  {printerTypes.find(t => t.value === activeSetting.printerType)?.label} - {activeSetting.paperSize} - {connectionTypes.find(c => c.value === activeSetting.connectionType)?.label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Printer</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-printers">
                  {printSettings.length}
                </p>
              </div>
              <Printer className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Thermal</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-thermal-printers">
                  {printSettings.filter(p => p.printerType === 'thermal').length}
                </p>
              </div>
              <Printer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Network</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-network-printers">
                  {printSettings.filter(p => p.connectionType === 'network').length}
                </p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Browser Print</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-browser-printers">
                  {printSettings.filter(p => p.connectionType === 'browser').length}
                </p>
              </div>
              <Monitor className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Settings Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {editingId ? "Edit Setting Print" : "Tambah Setting Print Baru"}
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
                        <FormLabel>Nama Setting *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Contoh: Printer Kasir, Printer Dapur"
                            data-testid="input-print-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Printer Type */}
                  <FormField
                    control={form.control}
                    name="printerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Printer *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-printer-type">
                              <SelectValue placeholder="Pilih jenis printer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {printerTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Paper Size */}
                  <FormField
                    control={form.control}
                    name="paperSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ukuran Kertas *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-paper-size">
                              <SelectValue placeholder="Pilih ukuran kertas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paperSizes.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                <div>
                                  <div className="font-medium">{size.label}</div>
                                  <div className="text-xs text-muted-foreground">{size.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Connection Type */}
                  <FormField
                    control={form.control}
                    name="connectionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Koneksi *</FormLabel>
                        <Select onValueChange={handleConnectionTypeChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-connection-type">
                              <SelectValue placeholder="Pilih jenis koneksi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {connectionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Connection String */}
                {form.watch("connectionType") !== "browser" && (
                  <FormField
                    control={form.control}
                    name="connectionString"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("connectionType") === "network" ? "IP Address" : 
                           form.watch("connectionType") === "bluetooth" ? "Device ID" : "Connection Path"}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder={
                                form.watch("connectionType") === "network" 
                                  ? "192.168.1.100:9100"
                                  : form.watch("connectionType") === "bluetooth"
                                  ? "Pilih device bluetooth"
                                  : "/dev/usb/lp0"
                              }
                              readOnly={form.watch("connectionType") === "bluetooth"}
                              data-testid="input-connection-string"
                            />
                            {form.watch("connectionType") === "bluetooth" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBluetoothDialog(true)}
                                data-testid="button-select-bluetooth"
                              >
                                <Bluetooth className="h-4 w-4 mr-2" />
                                Pilih Device
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Print Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Opsi Print</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="printHeader"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Print Header</FormLabel>
                            <div className="text-xs text-muted-foreground">Nama toko & alamat</div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-print-header"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="printFooter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Print Footer</FormLabel>
                            <div className="text-xs text-muted-foreground">Terima kasih & info</div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-print-footer"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="printLogo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Print Logo</FormLabel>
                            <div className="text-xs text-muted-foreground">Logo restoran</div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-print-logo"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Font Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fontSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ukuran Font</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="8"
                            max="24"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-font-size"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lineSpacing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spasi Baris</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="3"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-line-spacing"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel-print-setting"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPrintSettingMutation.isPending || updatePrintSettingMutation.isPending}
                    data-testid="button-submit-print-setting"
                  >
                    {(createPrintSettingMutation.isPending || updatePrintSettingMutation.isPending) ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? "Perbarui" : "Simpan"} Setting
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Print Settings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Daftar Setting Print
          </CardTitle>
        </CardHeader>
        <CardContent>
          {printSettings.length === 0 ? (
            <div className="text-center py-12">
              <Printer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada konfigurasi printer</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik tombol "Tambah Setting" untuk konfigurasi printer pertama
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {printSettings.map((setting) => (
                <Card key={setting.id} className={`relative ${setting.isActive ? 'ring-2 ring-primary' : ''}`} data-testid={`print-setting-card-${setting.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1" data-testid={`print-setting-name-${setting.id}`}>
                          {setting.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {setting.isActive && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Aktif
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {printerTypes.find(t => t.value === setting.printerType)?.label}
                          </Badge>
                        </div>
                      </div>
                      {!setting.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivate(setting.id)}
                          data-testid={`button-activate-${setting.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Kertas:</span>
                        <span className="font-medium">{setting.paperSize}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Koneksi:</span>
                        <span className="font-medium">
                          {connectionTypes.find(c => c.value === setting.connectionType)?.label}
                        </span>
                      </div>
                      {setting.connectionString && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-medium text-xs truncate">{setting.connectionString}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Font:</span>
                        <span className="font-medium">{setting.fontSize}px</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {setting.printHeader && <Badge variant="secondary" className="text-xs">Header</Badge>}
                      {setting.printFooter && <Badge variant="secondary" className="text-xs">Footer</Badge>}
                      {setting.printLogo && <Badge variant="secondary" className="text-xs">Logo</Badge>}
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(setting)}
                        data-testid={`button-edit-print-${setting.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {!setting.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(setting.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-print-${setting.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bluetooth Device Discovery Dialog */}
      <Dialog open={showBluetoothDialog} onOpenChange={setShowBluetoothDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              Pilih Device Bluetooth
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Device bluetooth yang tersedia:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={scanBluetoothDevices}
                disabled={isScanning}
                data-testid="button-scan-bluetooth"
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isScanning ? "Scanning..." : "Scan Device"}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bluetoothDevices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bluetooth className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada device yang ditemukan</p>
                  <p className="text-xs">Klik "Scan Device" untuk mencari</p>
                </div>
              ) : (
                bluetoothDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                    onClick={() => selectBluetoothDevice(device)}
                    data-testid={`bluetooth-device-${device.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Bluetooth className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.connected && (
                        <Badge variant="secondary" className="text-xs">Connected</Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        Pilih
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowBluetoothDialog(false)}
                data-testid="button-cancel-bluetooth"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}