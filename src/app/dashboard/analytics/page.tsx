// app/dashboard/analytics/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatPrice } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const { profile, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('sales');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [vendors, setVendors] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        if (profile?.role === 'admin') {
          const { data: vendorsData, error: vendorsError } = await supabase
            .from('food_vendors')
            .select('id, vendor_name, profile_id')
            .eq('is_active', true);

          if (vendorsError) throw vendorsError;
          setVendors(vendorsData || []);
        }
      } catch (err: any) {
        console.error('Error fetching vendors:', err);
        setError(err.message);
      }
    };

    if (profile) {
      fetchVendors();
    }
  }, [profile]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        let vendorId = '';
        
        // Determine which vendor's data to fetch
        if (profile?.role === 'vendor') {
          // If the user is a vendor, only show their data
          const { data: vendorData } = await supabase
            .from('food_vendors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();
          
          if (vendorData) {
            vendorId = vendorData.id;
          } else {
            throw new Error('Vendor profile not found');
          }
        } else if (profile?.role === 'admin' && vendorFilter !== 'all') {
          // If admin has selected a specific vendor
          vendorId = vendorFilter;
        }

        // Get the date range
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate.setDate(now.getDate() - 7);
        }

        const startDateString = startDate.toISOString();

        // Fetch orders data
        let query = supabase
          .from('food_orders')
          .select('*')
          .gte('created_at', startDateString)
          .order('created_at', { ascending: true });
        
        if (vendorId) {
          query = query.eq('vendor_id', vendorId);
        }

        const { data: orders, error: ordersError } = await query;
        
        if (ordersError) throw ordersError;

        // Process data for analytics
        const processedData = processOrdersData(orders || [], timeRange);
        setSalesData(processedData.sales);
        setOrdersData(processedData.orders);

        // Fetch popular items
        if (vendorId) {
          const { data: popularItems, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              menu_items (id, name),
              quantity
            `)
            .in('order_id', orders?.map(o => o.id) || []);
          
          if (itemsError) throw itemsError;

          // Aggregate items data
          const itemsMap = new Map();
          popularItems?.forEach(item => {
            const itemName = item.menu_items?.[0]?.name || 'Unknown Item';
            const current = itemsMap.get(itemName) || 0;
            itemsMap.set(itemName, current + item.quantity);
          });

          const topItems = Array.from(itemsMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
          
          setItemsData(topItems);
        }
      } catch (err: any) {
        console.error('Error fetching analytics data:', err);
        setError(err.message);
      }
    };

    if (profile && (profile.role === 'admin' || profile.role === 'vendor')) {
      fetchAnalyticsData();
    }
  }, [profile, timeRange, vendorFilter]);

  const processOrdersData = (orders: any[], range: string) => {
    // Group the orders by date
    const salesByDate = new Map();
    const ordersByDate = new Map();
    
    let dateFormat: 'day' | 'month' = 'day';
    if (range === 'quarter' || range === 'year') {
      dateFormat = 'month';
    }

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const date = new Date(order.created_at);
        let key = '';
        
        if (dateFormat === 'day') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        // Add to sales
        const currentSales = salesByDate.get(key) || 0;
        salesByDate.set(key, currentSales + order.total);
        
        // Add to orders count
        const currentOrders = ordersByDate.get(key) || 0;
        ordersByDate.set(key, currentOrders + 1);
      }
    });

    // Convert to array format for charts
    const salesData = Array.from(salesByDate.entries()).map(([date, amount]) => ({
      date,
      amount
    }));

    const ordersData = Array.from(ordersByDate.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Sort by date
    salesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    ordersData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      sales: salesData,
      orders: ordersData
    };
  };

  const totalSales = useMemo(() => {
    return salesData.reduce((sum, item) => sum + item.amount, 0);
  }, [salesData]);

  const totalOrders = useMemo(() => {
    return ordersData.reduce((sum, item) => sum + item.count, 0);
  }, [ordersData]);

  const averageOrderValue = useMemo(() => {
    return totalOrders > 0 ? totalSales / totalOrders : 0;
  }, [totalSales, totalOrders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (timeRange === 'week' || timeRange === 'month') {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (profile?.role !== 'admin' && profile?.role !== 'vendor') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Analytics Dashboard</h1>
        <p className="text-black">
          View performance metrics and trends
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px] border-gray-300 text-black">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 90 days</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          {profile.role === 'admin' && (
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[200px] border-gray-300 text-black">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{formatPrice(totalSales)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{formatPrice(averageOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="text-black">
        <TabsList className="mb-4 bg-gray-100">
          <TabsTrigger value="sales" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Sales Trends</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Order Volume</TabsTrigger>
          {itemsData.length > 0 && <TabsTrigger value="items" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Popular Items</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="sales">
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Sales Trend</CardTitle>
              <CardDescription className="text-black">
                {timeRange === 'week' && 'Daily sales for the past 7 days'}
                {timeRange === 'month' && 'Daily sales for the past 30 days'}
                {timeRange === 'quarter' && 'Monthly sales for the past 3 months'}
                {timeRange === 'year' && 'Monthly sales for the past year'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={salesData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="#000000"
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                      stroke="#000000"
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Sales']}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Sales"
                      stroke="#000000"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders">
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Order Volume</CardTitle>
              <CardDescription className="text-black">
                {timeRange === 'week' && 'Daily order volume for the past 7 days'}
                {timeRange === 'month' && 'Daily order volume for the past 30 days'}
                {timeRange === 'quarter' && 'Monthly order volume for the past 3 months'}
                {timeRange === 'year' && 'Monthly order volume for the past year'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ordersData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      stroke="#000000"
                    />
                    <YAxis stroke="#000000" />
                    <Tooltip 
                      formatter={(value) => [`${value}`, 'Orders']}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Orders"
                      fill="#000000"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {itemsData.length > 0 && (
          <TabsContent value="items">
            <Card className="border-gray-300">
              <CardHeader>
                <CardTitle className="text-black">Popular Items</CardTitle>
                <CardDescription className="text-black">
                  Most ordered items for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={itemsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {itemsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} ordered`, 'Quantity']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}