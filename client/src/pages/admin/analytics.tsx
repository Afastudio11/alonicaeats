import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, BarChart3, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Order } from "@shared/schema";

const TIME_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

export default function AnalyticsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Calculate analytics based on orders
  const analytics = calculateAnalytics(orders, selectedPeriod);

  const generatePDFReport = async () => {
    try {
      setIsGeneratingPdf(true);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38); // Primary red color
      doc.text('ALONICA RESTAURANT', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Sales Analytics Report', pageWidth / 2, 35, { align: 'center' });
      
      // Period and date info
      doc.setFontSize(12);
      const currentDate = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 50);
      doc.text(`Generated: ${currentDate}`, 20, 60);
      
      // KPI Summary
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('Key Performance Indicators', 20, 80);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Revenue: ${formatCurrency(analytics.totalRevenue)} (+${analytics.revenueGrowth}%)`, 20, 95);
      doc.text(`Total Orders: ${analytics.totalOrders} (+${analytics.ordersGrowth}%)`, 20, 105);
      doc.text(`Average Order Value: ${formatCurrency(analytics.averageOrderValue)} (-${analytics.aovChange}%)`, 20, 115);
      doc.text(`Peak Hour: ${analytics.peakHour} (${analytics.peakHourOrders} orders)`, 20, 125);
      
      // Top Menu Items Table
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('Top Menu Items', 20, 145);
      
      const topItemsData = analytics.topItems.map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.orders.toString()
      ]);
      
      (doc as any).autoTable({
        startY: 155,
        head: [['Rank', 'Menu Item', 'Orders']],
        body: topItemsData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 },
      });
      
      // Daily Sales Data Table
      const finalY = (doc as any).lastAutoTable.finalY || 200;
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('Daily Sales Breakdown', 20, finalY + 20);
      
      const dailySalesTableData = analytics.dailySalesData.map(item => [
        item.date,
        formatCurrency(item.revenue)
      ]);
      
      (doc as any).autoTable({
        startY: finalY + 30,
        head: [['Date', 'Revenue']],
        body: dailySalesTableData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 },
      });
      
      // Hourly Orders Pattern Table
      const finalY1 = (doc as any).lastAutoTable.finalY || 280;
      
      // Check if we need a new page
      if (finalY1 > 220) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text('Hourly Orders Pattern', 20, 30);
        
        const hourlyOrdersTableData = analytics.hourlyOrdersData.map(item => [
          `${item.hour}:00`,
          item.orders.toString()
        ]);
        
        (doc as any).autoTable({
          startY: 40,
          head: [['Hour', 'Orders']],
          body: hourlyOrdersTableData,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 40 }
          }
        });
      } else {
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text('Hourly Orders Pattern', 20, finalY1 + 20);
        
        const hourlyOrdersTableData = analytics.hourlyOrdersData.map(item => [
          `${item.hour}:00`,
          item.orders.toString()
        ]);
        
        (doc as any).autoTable({
          startY: finalY1 + 30,
          head: [['Hour', 'Orders']],
          body: hourlyOrdersTableData,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 40 }
          }
        });
      }
      
      // Payment Methods
      const finalY2 = (doc as any).lastAutoTable.finalY || 280;
      if (finalY2 > 250) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text('Payment Method Distribution', 20, 30);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Cash: ${analytics.paymentMethods.cash}%`, 20, 45);
        doc.text(`QRIS: ${analytics.paymentMethods.qris}%`, 20, 55);
      } else {
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text('Payment Method Distribution', 20, finalY2 + 20);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Cash: ${analytics.paymentMethods.cash}%`, 20, finalY2 + 35);
        doc.text(`QRIS: ${analytics.paymentMethods.qris}%`, 20, finalY2 + 45);
      }
      
      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
        doc.text('Generated by Alonica POS System', 20, doc.internal.pageSize.height - 10);
      }
      
      // Save the PDF
      const filename = `alonica-sales-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast({
        title: "PDF Generated Successfully",
        description: `Sales report downloaded as ${filename}`,
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex space-x-1 bg-muted rounded-xl p-1">
          {TIME_PERIODS.map((period) => (
            <div key={period.value} className="h-10 w-20 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="alonica-card p-6 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Download Button */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-muted rounded-xl p-1 w-fit">
          {TIME_PERIODS.map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className={selectedPeriod === period.value ? "bg-white text-primary" : ""}
              data-testid={`button-period-${period.value}`}
            >
              {period.label}
            </Button>
          ))}
        </div>
        
        <Button
          onClick={generatePDFReport}
          disabled={isGeneratingPdf || isLoading}
          className="flex items-center gap-2"
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4" />
          {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="alonica-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-revenue">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span data-testid="stat-revenue-growth">+{analytics.revenueGrowth}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="alonica-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-orders-analytics">
              {analytics.totalOrders}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span data-testid="stat-orders-growth">+{analytics.ordersGrowth}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="alonica-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-order-value">
              {formatCurrency(analytics.averageOrderValue)}
            </div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              <span data-testid="stat-aov-change">-{analytics.aovChange}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="alonica-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-peak-hour">
              {analytics.peakHour}
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid="stat-peak-orders">
              {analytics.peakHourOrders} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* REAL CHARTS WITH LIVE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="alonica-card">
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} tickFormatter={(value) => formatCurrency(value).replace('Rp. ', '')} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="alonica-card">
          <CardHeader>
            <CardTitle>Hourly Orders Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.hourlyOrdersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    formatter={(value) => [`${value} orders`, 'Orders']}
                    labelFormatter={(label) => `Hour: ${label}:00`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#dc2626" 
                    strokeWidth={3}
                    dot={{ fill: '#dc2626', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="alonica-card">
          <CardHeader>
            <CardTitle>Top Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm font-medium text-primary">{item.orders} orders</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="alonica-card">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Cash</span>
                <span className="text-sm font-medium text-primary">{analytics.paymentMethods.cash}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">QRIS</span>
                <span className="text-sm font-medium text-primary">{analytics.paymentMethods.qris}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function calculateAnalytics(orders: Order[], period: string) {
  // Filter orders based on period
  const now = new Date();
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    switch (period) {
      case 'daily':
        return orderDate.toDateString() === now.toDateString();
      case 'weekly':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return orderDate >= weekStart;
      case 'monthly':
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate hourly distribution
  const hourlyOrders = new Array(24).fill(0);
  filteredOrders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourlyOrders[hour]++;
  });

  const peakHourIndex = hourlyOrders.indexOf(Math.max(...hourlyOrders));
  const peakHour = `${peakHourIndex.toString().padStart(2, '0')}:00`;
  const peakHourOrders = hourlyOrders[peakHourIndex];

  // Calculate top items
  const itemCounts: Record<string, { name: string; orders: number }> = {};
  filteredOrders.forEach(order => {
    if (Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        if (itemCounts[item.name]) {
          itemCounts[item.name].orders += item.quantity;
        } else {
          itemCounts[item.name] = { name: item.name, orders: item.quantity };
        }
      });
    }
  });

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  // Calculate payment method distribution
  const cashOrders = filteredOrders.filter(order => order.paymentMethod === 'cash').length;
  const qrisOrders = filteredOrders.filter(order => order.paymentMethod === 'qris').length;
  const total = cashOrders + qrisOrders;

  const paymentMethods = {
    cash: total > 0 ? Math.round((cashOrders / total) * 100) : 0,
    qris: total > 0 ? Math.round((qrisOrders / total) * 100) : 0
  };

  // Generate chart data for Daily Sales Trend
  const dailySalesData = [];
  const days = period === 'monthly' ? 30 : (period === 'weekly' ? 7 : 1);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    
    const dayOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.toDateString() === date.toDateString();
    });
    
    const revenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
    dailySalesData.push({ date: dateStr, revenue });
  }

  // Generate chart data for Hourly Orders Pattern
  const hourlyOrdersData = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    hourlyOrdersData.push({
      hour: hourStr,
      orders: hourlyOrders[hour] || 0
    });
  }

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    peakHour,
    peakHourOrders,
    topItems,
    paymentMethods,
    dailySalesData,
    hourlyOrdersData,
    // Mock growth percentages for demo
    revenueGrowth: 12.5,
    ordersGrowth: 8.2,
    aovChange: 2.1
  };
}
