import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Phone, Users, Clock, ChevronLeft, ChevronRight, Search, Settings, User, X, CheckCircle2, Circle, XCircle, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, addWeeks, addMonths, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay, isBefore, startOfDay, isAfter } from "date-fns";
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
  const [dateRangeMode, setDateRangeMode] = useState<"day" | "week" | "month">("day");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    select: (data) => data.map(reservation => ({
      ...reservation,
      reservationDate: new Date(reservation.reservationDate),
      createdAt: new Date(reservation.createdAt)
    }))
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ reservationId, status }: { reservationId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/reservations/${reservationId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({
        title: "Reservation status updated",
        description: "The reservation status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update status",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Filter reservations for selected date range
  const filteredReservations = useMemo(() => {
    const filtered = reservations.filter(reservation => {
      // Date range filter based on mode
      let dateMatch = false;
      const reservationDate = reservation.reservationDate;
      
      if (dateRangeMode === "day") {
        dateMatch = isSameDay(reservationDate, selectedDate);
      } else if (dateRangeMode === "week") {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        dateMatch = isWithinInterval(reservationDate, { start: weekStart, end: weekEnd });
      } else if (dateRangeMode === "month") {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        dateMatch = isWithinInterval(reservationDate, { start: monthStart, end: monthEnd });
      }
      
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
  }, [reservations, selectedDate, dateRangeMode, statusFilter, searchQuery]);

  // Get upcoming reservations (future reservations, sorted by date)
  const upcomingReservations = useMemo(() => {
    const now = new Date();
    return reservations
      .filter(r => 
        (isAfter(r.reservationDate, startOfDay(now)) || isSameDay(r.reservationDate, now)) &&
        r.status !== 'cancelled' &&
        r.status !== 'completed'
      )
      .sort((a, b) => a.reservationDate.getTime() - b.reservationDate.getTime())
      .slice(0, 10); // Show only 10 upcoming
  }, [reservations]);

  const handleReservationUpdate = (reservationId: string, status: string) => {
    updateReservationMutation.mutate({ reservationId, status });
    if (selectedReservation?.id === reservationId) {
      setSelectedReservation(prev => prev ? { ...prev, status: status as any } : null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "border-blue-500",
      confirmed: "border-green-500", 
      completed: "border-purple-500",
      cancelled: "border-red-500"
    };
    return colors[status as keyof typeof colors] || "border-gray-300";
  };

  const getStatusBgColor = (status: string) => {
    const colors = {
      pending: "bg-blue-100 text-blue-700",
      confirmed: "bg-green-100 text-green-700", 
      completed: "bg-purple-100 text-purple-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed", 
      cancelled: "Cancelled"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const previousPeriod = () => {
    if (dateRangeMode === "day") setSelectedDate(prev => addDays(prev, -1));
    else if (dateRangeMode === "week") setSelectedDate(prev => addWeeks(prev, -1));
    else if (dateRangeMode === "month") setSelectedDate(prev => addMonths(prev, -1));
  };
  
  const nextPeriod = () => {
    if (dateRangeMode === "day") setSelectedDate(prev => addDays(prev, 1));
    else if (dateRangeMode === "week") setSelectedDate(prev => addWeeks(prev, 1));
    else if (dateRangeMode === "month") setSelectedDate(prev => addMonths(prev, 1));
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get days to display based on mode
  const displayDays = useMemo(() => {
    if (dateRangeMode === "day") {
      return [selectedDate];
    } else if (dateRangeMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [selectedDate, dateRangeMode]);

  // Group reservations by date and time
  const reservationsByDateAndTime = useMemo(() => {
    const grouped: Record<string, Record<string, Reservation[]>> = {};
    
    filteredReservations.forEach(reservation => {
      const dateKey = format(reservation.reservationDate, 'yyyy-MM-dd');
      const time = reservation.reservationTime 
        ? reservation.reservationTime.substring(0, 5)
        : format(reservation.reservationDate, 'HH:mm');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][time]) {
        grouped[dateKey][time] = [];
      }
      grouped[dateKey][time].push(reservation);
    });
    
    return grouped;
  }, [filteredReservations]);

  // Mini calendar for sidebar
  const currentMonth = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedDate]);

  const getDaysInWeeks = (days: Date[]) => {
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    // Add empty days at the start
    const firstDay = days[0];
    const dayOfWeek = firstDay.getDay();
    const startPadding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    for (let i = 0; i < startPadding; i++) {
      week.push(new Date(0)); // Placeholder
    }
    
    days.forEach(day => {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });
    
    // Add empty days at the end
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(new Date(0)); // Placeholder
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const weekRows = getDaysInWeeks(currentMonth);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading reservations...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-background flex flex-col">
        {/* Appointment Calendar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Appointment Calendar</h2>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground"
                onClick={goToToday}
                data-testid="button-today"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedDate(addMonths(selectedDate, -1))}
                className="h-8 w-8"
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                className="h-8 w-8"
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Mini Calendar */}
          <div className="space-y-2">
            <div className="text-center text-sm font-medium text-foreground mb-2">
              {format(selectedDate, 'MMMM yyyy')}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>
            {weekRows.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  const isPlaceholder = day.getTime() === 0;
                  const isToday = !isPlaceholder && isSameDay(day, new Date());
                  const isSelected = !isPlaceholder && isSameDay(day, selectedDate);
                  const hasReservations = !isPlaceholder && reservations.some(r => isSameDay(r.reservationDate, day));
                  
                  return (
                    <button
                      key={dayIndex}
                      onClick={() => !isPlaceholder && setSelectedDate(day)}
                      disabled={isPlaceholder}
                      className={`
                        h-8 w-8 rounded-full text-xs font-medium transition-colors relative
                        ${isPlaceholder ? 'invisible' : ''}
                        ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                        ${isToday && !isSelected ? 'border-2 border-primary text-primary' : ''}
                        ${!isSelected && !isToday ? 'hover:bg-muted text-foreground' : ''}
                      `}
                      data-testid={`calendar-day-${!isPlaceholder ? format(day, 'yyyy-MM-dd') : ''}`}
                    >
                      {!isPlaceholder && format(day, 'd')}
                      {hasReservations && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Reservations List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Upcoming Reservations</h3>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6"
              data-testid="button-more-options"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {upcomingReservations.length > 0 ? (
              upcomingReservations.map((reservation) => (
                <Card
                  key={reservation.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: reservation.status === 'pending' ? '#3b82f6' : '#22c55e' }}
                  onClick={() => setSelectedReservation(reservation)}
                  data-testid={`upcoming-reservation-${reservation.id}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {reservation.customerName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-foreground">
                        {reservation.reservationTime?.substring(0, 5)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(reservation.reservationDate, 'MMM dd')}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No upcoming reservations
              </div>
            )}
          </div>
          
          {upcomingReservations.length > 0 && (
            <Button 
              variant="default" 
              className="w-full mt-4"
              data-testid="button-see-all"
            >
              See All
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-background rounded-lg border border-border px-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={previousPeriod}
                className="h-8 w-8"
                data-testid="button-previous-period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="px-3 py-1 min-w-[200px] text-center">
                <span className="text-sm font-semibold text-foreground" data-testid="text-selected-date">
                  {format(selectedDate, 'MMMM yyyy')}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={nextPeriod}
                className="h-8 w-8"
                data-testid="button-next-period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 text-xs"
              data-testid="button-today-main"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "log")} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="calendar" className="text-xs px-3" data-testid="tab-calendar-view">
                  <Calendar className="h-3 w-3 mr-1" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="log" className="text-xs px-3" data-testid="tab-log-view">
                  <List className="h-3 w-3 mr-1" />
                  Log
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center space-x-2">
              <Button
                variant={dateRangeMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRangeMode("day")}
                className="h-8 text-xs"
                data-testid="button-daily"
              >
                Daily
              </Button>
              <Button
                variant={dateRangeMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRangeMode("week")}
                className="h-8 text-xs"
                data-testid="button-weekly"
              >
                Weekly
              </Button>
              <Button
                variant={dateRangeMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRangeMode("month")}
                className="h-8 text-xs"
                data-testid="button-monthly"
              >
                Monthly
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid / Log View */}
        <div className="flex-1 overflow-auto bg-muted/10">
          {viewMode === "log" ? (
            /* Log View - List of all reservations */
            <div className="p-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {filteredReservations.length > 0 ? (
                  filteredReservations
                    .sort((a, b) => b.reservationDate.getTime() - a.reservationDate.getTime())
                    .map((reservation) => (
                      <Card
                        key={reservation.id}
                        className={`p-4 border-l-4 ${getStatusColor(reservation.status)} hover:shadow-md transition-shadow cursor-pointer`}
                        onClick={() => setSelectedReservation(reservation)}
                        data-testid={`log-reservation-${reservation.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-base font-semibold text-foreground">
                                {reservation.customerName}
                              </h3>
                              <Badge className={`text-xs ${getStatusBgColor(reservation.status)}`}>
                                {getStatusLabel(reservation.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1.5" />
                                {format(reservation.reservationDate, 'EEE, MMM dd, yyyy')}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1.5" />
                                {reservation.reservationTime}
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1.5" />
                                {reservation.guestCount} {reservation.guestCount === 1 ? 'guest' : 'guests'}
                              </span>
                              <span className="flex items-center">
                                <Phone className="h-4 w-4 mr-1.5" />
                                {reservation.phoneNumber}
                              </span>
                            </div>
                            {reservation.notes && (
                              <p className="mt-2 text-sm text-muted-foreground italic">
                                Note: {reservation.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No reservations found for the selected filters
                  </div>
                )}
              </div>
            </div>
          ) : dateRangeMode === "day" ? (
            <div className="min-w-[800px] h-full">
              {/* Time Grid Header */}
              <div className="grid border-b border-border sticky top-0 bg-background z-10" style={{ gridTemplateColumns: `100px repeat(${displayDays.length}, 1fr)` }}>
                <div className="border-r border-border p-3">
                  <span className="text-xs font-medium text-muted-foreground">GMT+8</span>
                </div>
                {displayDays.map((day) => (
                  <div key={day.toISOString()} className="p-3 border-r border-border last:border-r-0">
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {format(day, 'dd')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <div className="grid" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
                <div className="border-r border-border bg-background">
                  {TIME_SLOTS.map((time) => (
                    <div 
                      key={time} 
                      className="h-12 border-b border-border px-2 py-1 text-right flex items-center justify-end"
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">{time}</span>
                    </div>
                  ))}
                </div>

                {/* Appointment Slots for each day */}
                {displayDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  return (
                    <div key={dateKey} className="border-r border-border last:border-r-0">
                      {TIME_SLOTS.map((time) => (
                        <div 
                          key={`${dateKey}-${time}`} 
                          className="h-12 border-b border-border relative bg-background hover:bg-muted/20 transition-colors"
                          data-testid={`slot-${dateKey}-${time}`}
                        >
                          {reservationsByDateAndTime[dateKey]?.[time]?.map((reservation, resIndex) => (
                            <Card
                              key={reservation.id}
                              className={`absolute left-0.5 right-0.5 p-1.5 border-l-4 ${getStatusBgColor(reservation.status)} hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(reservation.status)}`}
                              style={{ 
                                top: `${resIndex * 36 + 2}px`,
                                zIndex: resIndex + 1
                              }}
                              onClick={() => setSelectedReservation(reservation)}
                              data-testid={`card-reservation-${reservation.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[11px] font-semibold truncate leading-tight" data-testid={`text-customer-${reservation.id}`}>
                                    {reservation.customerName}
                                  </h4>
                                  <div className="flex items-center space-x-1.5 text-[9px] mt-0.5">
                                    <span className="flex items-center">
                                      <Clock className="h-2 w-2 mr-0.5" />
                                      {reservation.reservationTime?.substring(0, 5)}
                                    </span>
                                    <span className="flex items-center">
                                      <Users className="h-2 w-2 mr-0.5" />
                                      {reservation.guestCount}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className={`grid gap-4 ${dateRangeMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
                {displayDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayReservations = Object.values(reservationsByDateAndTime[dateKey] || {}).flat();
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <Card 
                      key={dateKey} 
                      className={`overflow-hidden ${isToday ? 'ring-2 ring-primary' : ''}`}
                      data-testid={`date-card-${dateKey}`}
                    >
                      <div className={`p-3 text-center border-b ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                        <div className="text-xs font-medium uppercase tracking-wide mb-1">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-2xl font-bold">
                          {format(day, 'dd')}
                        </div>
                        <div className="text-xs opacity-80">
                          {format(day, 'MMM')}
                        </div>
                      </div>
                      <div className="p-2 min-h-[120px] max-h-[300px] overflow-y-auto">
                        {dayReservations.length > 0 ? (
                          <div className="space-y-2">
                            {dayReservations.map((reservation) => (
                              <Card
                                key={reservation.id}
                                className={`p-2 border-l-4 ${getStatusBgColor(reservation.status)} ${getStatusColor(reservation.status)} hover:shadow-md transition-shadow cursor-pointer`}
                                onClick={() => setSelectedReservation(reservation)}
                                data-testid={`card-reservation-${reservation.id}`}
                              >
                                <h4 className="text-xs font-semibold truncate" data-testid={`text-customer-${reservation.id}`}>
                                  {reservation.customerName}
                                </h4>
                                <div className="flex items-center space-x-2 text-[10px] mt-1">
                                  <span className="flex items-center">
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    {reservation.reservationTime}
                                  </span>
                                  <span className="flex items-center">
                                    <Users className="h-2.5 w-2.5 mr-0.5" />
                                    {reservation.guestCount}
                                  </span>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-4">
                            No reservations
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reservation Detail Dialog */}
      <Dialog open={selectedReservation !== null} onOpenChange={(open) => !open && setSelectedReservation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Reservation Details</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="flex items-center space-x-3 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedReservation.customerName}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 mr-1" />
                    {selectedReservation.phoneNumber}
                  </div>
                </div>
              </div>

              {/* Reservation Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">
                    {format(selectedReservation.reservationDate, 'EEEE, MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">
                    {selectedReservation.reservationTime}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="font-medium text-foreground flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedReservation.guestCount} {selectedReservation.guestCount === 1 ? 'guest' : 'guests'}
                  </span>
                </div>
                {selectedReservation.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Notes</span>
                    <p className="text-foreground bg-muted/50 p-2 rounded">{selectedReservation.notes}</p>
                  </div>
                )}
              </div>

              {/* Progress Tracker */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-4 text-foreground">Progress Status</h4>
                <div className="relative pl-4">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-6">
                    {/* Pending */}
                    <div className="flex items-start space-x-3 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                        selectedReservation.status === 'pending' ? 'bg-blue-500 text-white border-blue-500' :
                        selectedReservation.status === 'cancelled' ? 'bg-gray-300 text-gray-500 border-gray-300' :
                        'bg-green-500 text-white border-green-500'
                      }`}>
                        {selectedReservation.status === 'pending' ? (
                          <Circle className="h-4 w-4 fill-current" />
                        ) : selectedReservation.status === 'cancelled' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="text-sm font-semibold text-foreground">Pending</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Reservation received</div>
                      </div>
                    </div>

                    {/* Confirmed */}
                    <div className="flex items-start space-x-3 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                        selectedReservation.status === 'confirmed' ? 'bg-green-500 text-white border-green-500' :
                        selectedReservation.status === 'completed' ? 'bg-green-500 text-white border-green-500' :
                        selectedReservation.status === 'cancelled' ? 'bg-gray-300 text-gray-500 border-gray-300' :
                        'bg-background text-gray-400 border-gray-200'
                      }`}>
                        {(selectedReservation.status === 'confirmed' || selectedReservation.status === 'completed') ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : selectedReservation.status === 'cancelled' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="text-sm font-semibold text-foreground">Confirmed</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Reservation confirmed</div>
                      </div>
                    </div>

                    {/* Completed or Cancelled */}
                    <div className="flex items-start space-x-3 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                        selectedReservation.status === 'completed' ? 'bg-purple-500 text-white border-purple-500' :
                        selectedReservation.status === 'cancelled' ? 'bg-red-500 text-white border-red-500' :
                        'bg-background text-gray-400 border-gray-200'
                      }`}>
                        {selectedReservation.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : selectedReservation.status === 'cancelled' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="text-sm font-semibold text-foreground">
                          {selectedReservation.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selectedReservation.status === 'cancelled' ? 'Reservation cancelled' : 'Service completed'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t border-border">
                {selectedReservation.status === 'pending' && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => handleReservationUpdate(selectedReservation.id, 'confirmed')}
                      disabled={updateReservationMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-reservation"
                    >
                      Confirm
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReservationUpdate(selectedReservation.id, 'cancelled')}
                      disabled={updateReservationMutation.isPending}
                      className="flex-1"
                      data-testid="button-cancel-reservation"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {selectedReservation.status === 'confirmed' && (
                  <>
                    <Button 
                      variant="default"
                      onClick={() => handleReservationUpdate(selectedReservation.id, 'completed')}
                      disabled={updateReservationMutation.isPending}
                      className="flex-1"
                      data-testid="button-complete-reservation"
                    >
                      Complete
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReservationUpdate(selectedReservation.id, 'cancelled')}
                      disabled={updateReservationMutation.isPending}
                      className="flex-1"
                      data-testid="button-cancel-reservation"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {(selectedReservation.status === 'completed' || selectedReservation.status === 'cancelled') && (
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedReservation(null)}
                    className="flex-1"
                    data-testid="button-close"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
