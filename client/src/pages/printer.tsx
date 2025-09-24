import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Printer, 
  Bluetooth, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  Settings, 
  FileText,
  AlertCircle,
  Zap,
  RefreshCw,
  Home
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Web Bluetooth API Type Definitions
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
      getAvailability(): Promise<boolean>;
      addEventListener(type: string, listener: (event: any) => void): void;
    };
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: {
      connected: boolean;
      connect(): Promise<{
        getPrimaryServices(): Promise<any[]>;
        getPrimaryService(service: string): Promise<{
          getCharacteristics(): Promise<any[]>;
          getCharacteristic(characteristic: string): Promise<{
            properties: {
              write: boolean;
              writeWithoutResponse: boolean;
            };
            writeValue(value: Uint8Array): Promise<void>;
          }>;
        }>;
      }>;
      disconnect(): void;
    };
  }
}

interface PrinterDevice {
  id: string;
  name: string;
  connected: boolean;
  type?: 'thermal' | 'pos' | 'standard';
}

interface PrintSettings {
  paperWidth: string;
  fontSize: string;
  alignment: string;
  lineSpacing: string;
  encoding: string;
}

export default function PrinterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Bluetooth state
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(false);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<PrinterDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Print settings state
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperWidth: '80mm',
    fontSize: '12px',
    alignment: 'left',
    lineSpacing: '1.2',
    encoding: 'utf-8'
  });
  
  // Test print state
  const [testText, setTestText] = useState(`=================================
        ALONICA RESTAURANT
=================================
Test Print - ${new Date().toLocaleString()}

Item 1: Nasi Goreng Spesial  25,000
Item 2: Es Teh Manis         5,000
Item 3: Kerupuk             3,000
                           --------
Total:                     33,000
Bayar:                     50,000
Kembali:                   17,000

        Terima Kasih!
      Silahkan Datang Kembali
=================================`);
  
  const deviceRef = useRef<PrinterDevice | null>(null);
  const characteristicRef = useRef<any>(null);

  useEffect(() => {
    checkBluetoothSupport();
  }, []);

  const checkBluetoothSupport = async () => {
    if ('bluetooth' in navigator) {
      setIsBluetoothSupported(true);
      try {
        const availability = await navigator.bluetooth!.getAvailability();
        setIsBluetoothEnabled(availability);
        
        // Listen for bluetooth availability changes
        navigator.bluetooth!.addEventListener('availabilitychanged', (event: any) => {
          setIsBluetoothEnabled(event.value);
        });
      } catch (error) {
        console.warn('Cannot check Bluetooth availability:', error);
      }
    } else {
      setIsBluetoothSupported(false);
    }
  };

  const scanForDevices = async () => {
    if (!isBluetoothSupported) {
      toast({
        title: "Bluetooth tidak didukung",
        description: "Browser Anda tidak mendukung Web Bluetooth API",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {
      // Request Bluetooth devices with printing services
      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Printer Service
          '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute Service
          '00001800-0000-1000-8000-00805f9b34fb'  // Generic Access Service
        ]
      });

      if (device) {
        const newDevice: PrinterDevice = {
          id: device.id,
          name: device.name || 'Unknown Printer',
          connected: false,
          type: detectPrinterType(device.name || '')
        };

        setAvailableDevices(prev => {
          const exists = prev.find(d => d.id === newDevice.id);
          if (exists) return prev;
          return [...prev, newDevice];
        });

        toast({
          title: "Perangkat ditemukan",
          description: `Printer "${newDevice.name}" berhasil ditemukan`,
        });
      }
    } catch (error) {
      console.error('Error scanning for devices:', error);
      toast({
        title: "Gagal mencari perangkat",
        description: "Pastikan Bluetooth aktif dan printer dalam mode pairing",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const detectPrinterType = (deviceName: string): 'thermal' | 'pos' | 'standard' => {
    const name = deviceName.toLowerCase();
    if (name.includes('thermal') || name.includes('58mm') || name.includes('80mm')) {
      return 'thermal';
    } else if (name.includes('pos') || name.includes('receipt')) {
      return 'pos';
    }
    return 'standard';
  };

  const connectToDevice = async (deviceId: string) => {
    const device = availableDevices.find(d => d.id === deviceId);
    if (!device) return;

    setIsConnecting(true);
    try {
      // Request the same device again to get proper connection
      const bluetoothDevice = await navigator.bluetooth!.requestDevice({
        filters: [{ name: device.name }],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '00001801-0000-1000-8000-00805f9b34fb',
          '00001800-0000-1000-8000-00805f9b34fb'
        ]
      });

      const server = await bluetoothDevice.gatt.connect();
      
      // Try to find a writable characteristic
      const services = await server.getPrimaryServices();
      let characteristic = null;

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            break;
          }
        }
        if (characteristic) break;
      }

      if (characteristic) {
        characteristicRef.current = characteristic;
        deviceRef.current = { ...device, connected: true };
        setConnectedDevice({ ...device, connected: true });
        
        // Update available devices
        setAvailableDevices(prev => 
          prev.map(d => 
            d.id === deviceId ? { ...d, connected: true } : { ...d, connected: false }
          )
        );

        toast({
          title: "Koneksi berhasil",
          description: `Terhubung ke printer "${device.name}"`,
        });
      } else {
        throw new Error('No writable characteristic found');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Koneksi gagal",
        description: `Tidak dapat terhubung ke "${device.name}"`,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (deviceRef.current && characteristicRef.current) {
      try {
        // Disconnect from GATT server
        const device = await navigator.bluetooth!.requestDevice({
          filters: [{ name: deviceRef.current.name }]
        });
        
        if (device.gatt.connected) {
          device.gatt.disconnect();
        }

        setConnectedDevice(null);
        deviceRef.current = null;
        characteristicRef.current = null;
        
        // Update available devices
        setAvailableDevices(prev => 
          prev.map(d => ({ ...d, connected: false }))
        );

        toast({
          title: "Terputus",
          description: "Koneksi printer telah diputus",
        });
      } catch (error) {
        console.error('Disconnect failed:', error);
      }
    }
  };

  const printTest = async () => {
    if (!characteristicRef.current) {
      toast({
        title: "Printer tidak terhubung",
        description: "Hubungkan printer terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert text to bytes for thermal printer
      const encoder = new TextEncoder();
      const data = encoder.encode(testText + '\n\n\n'); // Add paper feed

      // Send data to printer
      await characteristicRef.current.writeValue(data);

      toast({
        title: "Test print berhasil",
        description: "Dokumen test telah dikirim ke printer",
      });
    } catch (error) {
      console.error('Print failed:', error);
      toast({
        title: "Print gagal",
        description: "Tidak dapat mencetak dokumen test",
        variant: "destructive",
      });
    }
  };

  const formatReceiptText = (text: string): string => {
    const lines = text.split('\n');
    const width = parseInt(printSettings.paperWidth) === 58 ? 32 : 48;
    
    return lines.map(line => {
      if (printSettings.alignment === 'center') {
        const padding = Math.max(0, (width - line.length) / 2);
        return ' '.repeat(Math.floor(padding)) + line;
      } else if (printSettings.alignment === 'right') {
        const padding = Math.max(0, width - line.length);
        return ' '.repeat(padding) + line;
      }
      return line;
    }).join('\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-blue-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-blue-800">
              Printer Management
            </CardTitle>
            <CardDescription className="text-lg">
              Kelola koneksi printer Bluetooth dan pengaturan cetak
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Bluetooth Support Check */}
        {!isBluetoothSupported && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Browser Anda tidak mendukung Web Bluetooth API. Gunakan Chrome, Edge, atau browser modern lainnya untuk fitur ini.
            </AlertDescription>
          </Alert>
        )}

        {isBluetoothSupported && !isBluetoothEnabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Bluetooth tidak aktif. Pastikan Bluetooth perangkat Anda dalam keadaan aktif.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Bluetooth className="w-4 h-4" />
              Koneksi
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pengaturan
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Test Print
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Connection Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Status Koneksi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${connectedDevice ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="font-medium">
                        {connectedDevice ? `Terhubung: ${connectedDevice.name}` : 'Tidak terhubung'}
                      </span>
                    </div>
                    {connectedDevice && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={disconnectDevice}
                        data-testid="button-disconnect"
                      >
                        Putuskan
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Bluetooth Support:</span>
                      <div className="flex items-center gap-2">
                        {isBluetoothSupported ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {isBluetoothSupported ? 'Didukung' : 'Tidak didukung'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bluetooth Status:</span>
                      <div className="flex items-center gap-2">
                        {isBluetoothEnabled ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-orange-500" />
                        )}
                        <span className="text-sm">
                          {isBluetoothEnabled ? 'Aktif' : 'Tidak aktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Cari Printer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={scanForDevices}
                    disabled={!isBluetoothSupported || !isBluetoothEnabled || isScanning}
                    className="w-full"
                    data-testid="button-scan-devices"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Mencari...
                      </>
                    ) : (
                      <>
                        <Bluetooth className="w-4 h-4 mr-2" />
                        Cari Printer Bluetooth
                      </>
                    )}
                  </Button>

                  {availableDevices.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Printer Tersedia:</Label>
                      {availableDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${device.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{device.type} Printer</div>
                            </div>
                          </div>
                          {!device.connected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => connectToDevice(device.id)}
                              disabled={isConnecting}
                              data-testid={`button-connect-${device.id}`}
                            >
                              {isConnecting ? 'Menghubungkan...' : 'Hubungkan'}
                            </Button>
                          ) : (
                            <span className="text-sm text-green-600 font-medium">Terhubung</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Cetak</CardTitle>
                <CardDescription>
                  Konfigurasi format dan pengaturan printer thermal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paperWidth">Lebar Kertas</Label>
                    <Select 
                      value={printSettings.paperWidth} 
                      onValueChange={(value) => setPrintSettings(prev => ({...prev, paperWidth: value}))}
                    >
                      <SelectTrigger data-testid="select-paper-width">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm</SelectItem>
                        <SelectItem value="80mm">80mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Ukuran Font</Label>
                    <Select 
                      value={printSettings.fontSize} 
                      onValueChange={(value) => setPrintSettings(prev => ({...prev, fontSize: value}))}
                    >
                      <SelectTrigger data-testid="select-font-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10px">Kecil (10px)</SelectItem>
                        <SelectItem value="12px">Normal (12px)</SelectItem>
                        <SelectItem value="14px">Besar (14px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alignment">Perataan Teks</Label>
                    <Select 
                      value={printSettings.alignment} 
                      onValueChange={(value) => setPrintSettings(prev => ({...prev, alignment: value}))}
                    >
                      <SelectTrigger data-testid="select-alignment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Kiri</SelectItem>
                        <SelectItem value="center">Tengah</SelectItem>
                        <SelectItem value="right">Kanan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="encoding">Encoding</Label>
                    <Select 
                      value={printSettings.encoding} 
                      onValueChange={(value) => setPrintSettings(prev => ({...prev, encoding: value}))}
                    >
                      <SelectTrigger data-testid="select-encoding">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Print Tab */}
          <TabsContent value="test" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Test Print</CardTitle>
                  <CardDescription>
                    Edit dan cetak dokumen test untuk memverifikasi koneksi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testText">Konten Test Print</Label>
                    <Textarea
                      id="testText"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Masukkan teks yang ingin dicetak..."
                      className="min-h-[300px] font-mono text-sm"
                      data-testid="textarea-test-content"
                    />
                  </div>
                  <Button
                    onClick={printTest}
                    disabled={!connectedDevice}
                    className="w-full bg-green-600 hover:bg-green-700"
                    data-testid="button-print-test"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak Test
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    Pratinjau dokumen dengan pengaturan saat ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-4 shadow-inner">
                    <pre 
                      className="whitespace-pre-wrap text-xs font-mono"
                      style={{ 
                        fontSize: printSettings.fontSize, 
                        textAlign: printSettings.alignment as any,
                        lineHeight: printSettings.lineSpacing 
                      }}
                    >
                      {formatReceiptText(testText)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                data-testid="button-login"
              >
                Login Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}