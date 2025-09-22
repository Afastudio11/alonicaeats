import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Eye, Filter, Calendar, Clock, Phone, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Customer {
  name: string;
  tableNumber: string;
  orderCount: number;
  totalSpent: number;
  lastVisit: Date;
  status: 'active' | 'completed';
}

interface Reservation {
  id: string;
  customerName: string;
  phoneNumber: string;
  guestCount: number;
  reservationDate: string;
  reservationTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({
        title: "Reservasi berhasil dibuat",
        description: "Reservasi telah ditambahkan ke sistem",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Gagal membuat reservasi",
        description: "Terjadi kesalahan saat membuat reservasi",
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
              <FormLabel>Nama Customer</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama customer" {...field} data-testid="input-customer-name" />
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
                <Input placeholder="08xxxxxxxxxx" {...field} data-testid="input-phone-number" />
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
                  data-testid="input-guest-count"
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
                  placeholder="Catatan khusus untuk reservasi"
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={createReservationMutation.isPending}
            data-testid="button-submit-reservation"
          >
            {createReservationMutation.isPending ? "Menyimpan..." : "Simpan Reservasi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CustomerSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const { toast } = useToast();

  // Get orders data to create customer summary
  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Get reservations data
  const { data: reservations = [], isLoading: isLoadingReservations } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Mutation to update reservation status
  const updateReservationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/reservations/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("sessionToken")}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update reservation status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({
        title: "Status reservasi berhasil diubah",
        description: "Status reservasi telah diperbarui",
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal mengubah status",
        description: "Terjadi kesalahan saat mengubah status reservasi",
        variant: "destructive",
      });
    },
  });

  // Process orders to create customer data
  const customers: Customer[] = orders.reduce((acc: Customer[], order) => {
    const existingCustomer = acc.find(c => 
      c.name === order.customerName && c.tableNumber === order.tableNumber
    );

    if (existingCustomer) {
      existingCustomer.orderCount += 1;
      existingCustomer.totalSpent += order.total;
      if (new Date(order.createdAt) > existingCustomer.lastVisit) {
        existingCustomer.lastVisit = new Date(order.createdAt);
      }
      // Update status to active if any order is not completed
      if (order.status !== 'completed') {
        existingCustomer.status = 'active';
      }
    } else {
      acc.push({
        name: order.customerName,
        tableNumber: order.tableNumber,
        orderCount: 1,
        totalSpent: order.total,
        lastVisit: new Date(order.createdAt),
        status: order.status === 'completed' ? 'completed' : 'active'
      });
    }
    
    return acc;
  }, []);

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by last visit (most recent first)
  filteredCustomers.sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / customers.reduce((sum, c) => sum + c.orderCount, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Track customer orders and activity</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-active-customers">
                  {activeCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-customers">
                  {totalCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-revenue">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="text-primary text-2xl">₨</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-avg-order">
                  {formatCurrency(avgOrderValue)}
                </p>
              </div>
              <div className="text-orange-600 text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer List
          </CardTitle>
          <CardDescription>
            Monitor customer activity and order history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer List */}
          <div className="space-y-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {customers.length === 0 ? "No customers found" : "No customers match your search"}
              </div>
            ) : (
              filteredCustomers.map((customer, index) => (
                <div 
                  key={`${customer.name}-${customer.tableNumber}-${index}`}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`customer-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{customer.name}</h3>
                        <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                          {customer.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Table {customer.tableNumber} • {customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(customer.lastVisit)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reservations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <div>
                <CardTitle>Reservations</CardTitle>
                <CardDescription>Manage customer reservations</CardDescription>
              </div>
            </div>
            <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-reservation">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Reservasi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Buat Reservasi Baru</DialogTitle>
                </DialogHeader>
                <ReservationForm onClose={() => setReservationDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReservations ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada reservasi
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div 
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`reservation-${reservation.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{reservation.customerName}</h3>
                        <Badge 
                          variant={
                            reservation.status === 'confirmed' ? 'default' :
                            reservation.status === 'pending' ? 'secondary' :
                            reservation.status === 'completed' ? 'secondary' : 'destructive'
                          }
                        >
                          {reservation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{reservation.phoneNumber}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{reservation.guestCount} tamu</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(new Date(reservation.reservationDate))} {reservation.reservationTime}</span>
                        </div>
                      </div>
                      {reservation.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {reservation.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {reservation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReservationStatusMutation.mutate({ id: reservation.id, status: 'confirmed' })}
                          disabled={updateReservationStatusMutation.isPending}
                          data-testid={`button-confirm-${reservation.id}`}
                        >
                          Konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateReservationStatusMutation.mutate({ id: reservation.id, status: 'cancelled' })}
                          disabled={updateReservationStatusMutation.isPending}
                          data-testid={`button-cancel-${reservation.id}`}
                        >
                          Batal
                        </Button>
                      </>
                    )}
                    {reservation.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateReservationStatusMutation.mutate({ id: reservation.id, status: 'completed' })}
                        disabled={updateReservationStatusMutation.isPending}
                        data-testid={`button-complete-${reservation.id}`}
                      >
                        Selesai
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}