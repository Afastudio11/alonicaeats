import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Phone, Users, Clock, MoreHorizontal, ChevronLeft, ChevronRight, Search, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, parse } from "date-fns";
import { id } from "date-fns/locale";
import type { Reservation } from "@shared/schema";

// Time slots from 9 AM to 9 PM
const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", 
  "14:00", "15:00", "16:00", "17:00", "18:00", 
  "19:00", "20:00", "21:00"
];

export default function ReservationsSection() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "log">("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ reservationId, status }: { reservationId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/reservations/${reservationId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({
        title: "Status reservasi berhasil diupdate",
        description: "Status reservasi telah diperbarui",
      });
    },
    onError: () => {
      toast({
        title: "Gagal update status",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    },
  });

  // Filter reservations for selected date
  const filteredReservations = useMemo(() => {
    const filtered = reservations.filter(reservation => {
      const reservationDateStr = format(reservation.reservationDate, 'yyyy-MM-dd');
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const dateMatch = reservationDateStr === selectedDateStr;
      
      if (!dateMatch) return false;
      
      // Status filter
      const statusMatch = statusFilter === "all" || reservation.status === statusFilter;
      if (!statusMatch) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          reservation.customerName.toLowerCase().includes(query) ||
          reservation.phoneNumber.includes(query)
        );
      }
      
      return true;
    });
    
    return filtered;
  }, [reservations, selectedDate, statusFilter, searchQuery]);

  // Group reservations by time slot
  const reservationsByTime = useMemo(() => {
    const grouped: Record<string, Reservation[]> = {};
    
    filteredReservations.forEach(reservation => {
      // Safely extract time - use reservationTime if available, otherwise default to "09:00"
      const time = reservation.reservationTime 
        ? reservation.reservationTime.substring(0, 5)
        : format(reservation.reservationDate, 'HH:mm');
      
      if (!grouped[time]) {
        grouped[time] = [];
      }
      grouped[time].push(reservation);
    });
    
    return grouped;
  }, [filteredReservations]);

  const handleReservationUpdate = (reservationId: string, status: string) => {
    updateReservationMutation.mutate({ reservationId, status });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-blue-100 text-blue-700 border-blue-200",
      confirmed: "bg-green-100 text-green-700 border-green-200", 
      completed: "bg-purple-100 text-purple-700 border-purple-200",
      cancelled: "bg-red-100 text-red-700 border-red-200"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Menunggu",
      confirmed: "Dikonfirmasi",
      completed: "Selesai", 
      cancelled: "Dibatalkan"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const previousDay = () => setSelectedDate(prev => addDays(prev, -1));
  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const totalAppointments = filteredReservations.length;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Memuat reservasi...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
            Reservasi
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama atau nomor telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 h-9"
              data-testid="input-search-reservations"
            />
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "log")} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="calendar" className="text-xs px-3" data-testid="tab-calendar-view">Kalender</TabsTrigger>
              <TabsTrigger value="log" className="text-xs px-3" data-testid="tab-log-view">Log Riwayat</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Settings Icon */}
          <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-settings">
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Avatar */}
          <div className="flex items-center space-x-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Admin</span>
          </div>
        </div>
      </div>

      {/* Sub-header with Calendar Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-background rounded-lg border border-border px-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={previousDay}
              className="h-8 w-8"
              data-testid="button-previous-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="px-3 py-1 min-w-[200px] text-center">
              <span className="text-sm font-semibold text-foreground" data-testid="text-selected-date">
                {format(selectedDate, 'EEE, dd MMM yyyy', { locale: id })}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={nextDay}
              className="h-8 w-8"
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={goToToday}
            className="h-8 text-xs"
            data-testid="button-go-today"
          >
            Hari Ini
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span data-testid="text-total-appointments">
              <strong className="text-foreground">{totalAppointments}</strong> total reservasi
            </span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 text-xs" data-testid="button-filters">
            Filter
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Time Grid Header */}
          <div className="grid grid-cols-[80px_1fr] border-b border-border sticky top-0 bg-background z-10">
            <div className="border-r border-border p-3">
              <span className="text-xs font-medium text-muted-foreground">GMT+07:00</span>
            </div>
            <div className="p-3">
              <span className="text-sm font-medium text-foreground">
                {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
              </span>
            </div>
          </div>

          {/* Time Slots */}
          <div className="grid grid-cols-[80px_1fr]">
            <div className="border-r border-border">
              {TIME_SLOTS.map((time) => (
                <div 
                  key={time} 
                  className="h-24 border-b border-border px-3 py-2 text-right"
                >
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
              ))}
            </div>

            {/* Appointment Slots */}
            <div className="relative">
              {TIME_SLOTS.map((time, index) => (
                <div 
                  key={time} 
                  className="h-24 border-b border-border relative"
                  data-testid={`slot-${time}`}
                >
                  {reservationsByTime[time]?.map((reservation, resIndex) => (
                    <Card
                      key={reservation.id}
                      className={`absolute left-2 right-2 top-1 p-3 border-l-4 ${getStatusColor(reservation.status)} hover:shadow-md transition-shadow cursor-pointer`}
                      style={{ 
                        top: `${resIndex * 60 + 4}px`,
                        zIndex: resIndex + 1
                      }}
                      data-testid={`card-reservation-${reservation.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-foreground truncate" data-testid={`text-customer-${reservation.id}`}>
                              {reservation.customerName}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4" data-testid={`badge-status-${reservation.id}`}>
                              {getStatusLabel(reservation.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {reservation.reservationTime}
                            </span>
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {reservation.guestCount} tamu
                            </span>
                          </div>
                          {reservation.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate" data-testid={`text-notes-${reservation.id}`}>
                              {reservation.notes}
                            </p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6 -mr-1"
                              disabled={updateReservationMutation.isPending}
                              data-testid={`button-actions-${reservation.id}`}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reservation.status === 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => handleReservationUpdate(reservation.id, 'confirmed')}
                                data-testid={`button-confirm-${reservation.id}`}
                              >
                                Konfirmasi
                              </DropdownMenuItem>
                            )}
                            {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                              <DropdownMenuItem 
                                onClick={() => handleReservationUpdate(reservation.id, 'completed')}
                                data-testid={`button-complete-${reservation.id}`}
                              >
                                Selesai
                              </DropdownMenuItem>
                            )}
                            {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                              <DropdownMenuItem 
                                onClick={() => handleReservationUpdate(reservation.id, 'cancelled')}
                                className="text-red-600"
                                data-testid={`button-cancel-${reservation.id}`}
                              >
                                Batalkan
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
