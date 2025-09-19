import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Eye, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Customer {
  name: string;
  tableNumber: string;
  orderCount: number;
  totalSpent: number;
  lastVisit: Date;
  status: 'active' | 'completed';
}

export default function CustomerSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get orders data to create customer summary
  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
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
    </div>
  );
}