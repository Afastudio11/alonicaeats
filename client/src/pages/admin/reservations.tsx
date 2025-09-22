import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Phone, Users, Clock, MoreHorizontal, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, startOfDay, endOfDay, isWithinInterval, isSameDay, parse } from "date-fns";
import { id } from "date-fns/locale";
import type { Reservation } from "@shared/schema";

export default function ReservationsSection() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Filter reservations based on selected date and status
  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      // Use string comparison to avoid timezone issues
      const reservationDate = parse(reservation.reservationDate as string, 'yyyy-MM-dd', new Date());
      const reservationDateStr = format(reservationDate, 'yyyy-MM-dd');
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const dateMatch = reservationDateStr === selectedDateStr;
      const statusMatch = statusFilter === "all" || reservation.status === statusFilter;
      
      return dateMatch && statusMatch;
    });
  }, [reservations, selectedDate, statusFilter]);

  // Group reservations by date for upcoming days view
  const upcomingReservations = useMemo(() => {
    const today = new Date();
    const startRange = startOfDay(today);
    const endRange = endOfDay(addDays(today, 6)); // Today + next 6 days
    
    return reservations.filter(reservation => {
      const reservationDate = parse(reservation.reservationDate as string, 'yyyy-MM-dd', new Date());
      return isWithinInterval(reservationDate, { start: startRange, end: endRange });
    }).reduce((acc, reservation) => {
      const reservationDate = parse(reservation.reservationDate as string, 'yyyy-MM-dd', new Date());
      const dateKey = format(reservationDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(reservation);
      return acc;
    }, {} as Record<string, Reservation[]>);
  }, [reservations]);

  const handleReservationUpdate = (reservationId: string, status: string) => {
    updateReservationMutation.mutate({ reservationId, status });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800", 
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800"
    };
    
    const statusLabels = {
      pending: "Menunggu",
      confirmed: "Dikonfirmasi",
      completed: "Selesai", 
      cancelled: "Dibatalkan"
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors]} data-testid={`badge-status-${status}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const previousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const nextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" data-testid="text-page-title">Kelola Reservasi</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Memuat reservasi...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" data-testid="text-page-title">Kelola Reservasi</h2>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
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
        </div>
      </div>

      {/* Date Navigator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={previousDay}
              data-testid="button-previous-day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold" data-testid="text-selected-date">
                {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToToday}
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="button-go-today"
              >
                Kembali ke hari ini
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextDay}
              data-testid="button-next-day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reservasi — {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })} ({filteredReservations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-reservations">
              Tidak ada reservasi untuk tanggal ini
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => (
                <Card key={reservation.id} className="p-4" data-testid={`card-reservation-${reservation.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-semibold text-lg" data-testid={`text-customer-${reservation.id}`}>
                            {reservation.customerName}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              <span data-testid={`text-phone-${reservation.id}`}>{reservation.phoneNumber}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              <span data-testid={`text-guests-${reservation.id}`}>{reservation.guestCount} tamu</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span data-testid={`text-time-${reservation.id}`}>{reservation.reservationTime}</span>
                            </div>
                          </div>
                          {reservation.notes && (
                            <p className="text-sm text-muted-foreground mt-2" data-testid={`text-notes-${reservation.id}`}>
                              <strong>Catatan:</strong> {reservation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusBadge(reservation.status)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={updateReservationMutation.isPending}
                            data-testid={`button-actions-${reservation.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {reservation.status === 'pending' && (
                            <DropdownMenuItem 
                              onClick={() => handleReservationUpdate(reservation.id, 'confirmed')}
                              disabled={updateReservationMutation.isPending}
                              data-testid={`button-confirm-${reservation.id}`}
                            >
                              Konfirmasi
                            </DropdownMenuItem>
                          )}
                          {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                            <DropdownMenuItem 
                              onClick={() => handleReservationUpdate(reservation.id, 'completed')}
                              disabled={updateReservationMutation.isPending}
                              data-testid={`button-complete-${reservation.id}`}
                            >
                              Selesai
                            </DropdownMenuItem>
                          )}
                          {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                            <DropdownMenuItem 
                              onClick={() => handleReservationUpdate(reservation.id, 'cancelled')}
                              disabled={updateReservationMutation.isPending}
                              className="text-red-600"
                              data-testid={`button-cancel-${reservation.id}`}
                            >
                              Batalkan
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Reservasi 7 Hari Kedepan</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(upcomingReservations).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-upcoming">
              Tidak ada reservasi dalam 7 hari kedepan
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(upcomingReservations).map(([dateKey, dayReservations]) => (
                <div 
                  key={dateKey} 
                  className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedDate(parse(dateKey, 'yyyy-MM-dd', new Date()))}
                  data-testid={`card-day-${dateKey}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold" data-testid={`text-date-${dateKey}`}>
                        {format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, dd MMMM yyyy', { locale: id })}
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-count-${dateKey}`}>
                        {dayReservations.length} reservasi
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {dayReservations.slice(0, 3).map((reservation, index) => (
                        <Badge 
                          key={reservation.id} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-preview-${reservation.id}`}
                        >
                          {reservation.reservationTime}
                        </Badge>
                      ))}
                      {dayReservations.length > 3 && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-more-${dateKey}`}>
                          +{dayReservations.length - 3}
                        </Badge>
                      )}
                    </div>
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