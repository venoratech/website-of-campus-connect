// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatPrice } from '@/lib/utils';
import { Users, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';

// Define interfaces for data structures
interface FoodOrder {
  id: string;
  vendor_id: string;
  created_at: string;
  status: string;
  total: number;
}

interface WeeklyChartData {
  name: string;
  orders: number;
}

interface StatusChartData {
  name: string;
  value: number;
  percentage: number;
}

// Helper to group orders by day of week
const getDayOfWeek = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Order data transform function
const transformOrdersToWeeklyData = (orders: FoodOrder[]): WeeklyChartData[] => {
  // Initialize counts for all days of the week
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const initialCounts = daysOfWeek.reduce((acc, day) => {
    acc[day] = 0;
    return acc;
  }, {} as Record<string, number>);

  // Count orders by day of week
  orders.forEach(order => {
    const day = getDayOfWeek(order.created_at);
    initialCounts[day] += 1;
  });

  // Convert to array format for chart
  return daysOfWeek.map(day => ({
    name: day,
    orders: initialCounts[day]
  }));
};

// Status data transform function
const transformOrdersByStatus = (orders: FoodOrder[]): StatusChartData[] => {
  // Count orders by status
  const statusCounts: Record<string, number> = {};
  
  orders.forEach(order => {
    const status = order.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Calculate percentages and format for pie chart
  const total = orders.length;
  return Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    percentage: Math.round((count / total) * 100)
  }));
};

// Colors for the pie chart
const STATUS_COLORS = {
  'pending': '#3B82F6',     // Blue
  'confirmed': '#10B981',   // Green
  'preparing': '#F59E0B',   // Yellow/Orange
  'ready': '#EC4899',       // Pink
  'completed': '#8B5CF6',   // Purple
  'cancelled': '#EF4444'    // Red
};

export default function Dashboard() {
  const { profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [weeklyOrderData, setWeeklyOrderData] = useState<WeeklyChartData[]>([]);
  const [statusData, setStatusData] = useState<StatusChartData[]>([]);
  const [prevMonthOrders, setPrevMonthOrders] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (profile?.role === 'vendor') {
          // First get the vendor id
          const { data: vendorData } = await supabase
            .from('food_vendors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();
          
          if (!vendorData) return;
          
          // Get all orders for this vendor
          const { data: ordersData } = await supabase
            .from('food_orders')
            .select('*')
            .eq('vendor_id', vendorData.id)
            .order('created_at', { ascending: false });
          
          if (ordersData) {
            setOrders(ordersData);
            
            // Calculate total revenue (only from completed orders)
            const completedOrders = ordersData.filter(order => order.status === 'completed');
            const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
            setTotalRevenue(revenue);
            
            // Transform for weekly chart
            setWeeklyOrderData(transformOrdersToWeeklyData(ordersData));
            
            // Transform for status pie chart
            setStatusData(transformOrdersByStatus(ordersData));
            
            // Calculate previous month stats for comparison
            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            
            const lastMonthOrders = ordersData.filter(order => {
              const orderDate = new Date(order.created_at);
              return orderDate >= lastMonth && orderDate < thisMonth;
            });
            
            setPrevMonthOrders(lastMonthOrders.length);
            
            const lastMonthCompletedOrders = lastMonthOrders.filter(order => order.status === 'completed');
            const lastMonthRevenue = lastMonthCompletedOrders.reduce((sum, order) => sum + order.total, 0);
            setPrevMonthRevenue(lastMonthRevenue);
          }
        }
        // Add similar logic for admin with aggregated data across all vendors
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  // Calculate month-over-month changes
  const currentMonthOrders = orders.length - prevMonthOrders;
  const orderChangePercent = prevMonthOrders > 0 ? Math.round((currentMonthOrders / prevMonthOrders) * 100) : 0;
  
  const currentMonthRevenue = totalRevenue - prevMonthRevenue;
  const revenueChangePercent = prevMonthRevenue > 0 ? Math.round((currentMonthRevenue / prevMonthRevenue) * 100) : 0;

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
        <p className="text-black">
          Welcome back, {profile?.first_name || 'User'}!
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{orders.length}</div>
            <p className="text-xs text-black">
              {orderChangePercent > 0 ? '+' : ''}{orderChangePercent}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {formatPrice(totalRevenue)}
            </div>
            <p className="text-xs text-black">
              {revenueChangePercent > 0 ? '+' : ''}{revenueChangePercent}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Average Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {formatPrice(orders.length > 0 ? totalRevenue / orders.filter(o => o.status === 'completed').length : 0)}
            </div>
            <p className="text-xs text-black">Per completed order</p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {orders.length > 0 ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 0}%
            </div>
            <p className="text-xs text-black">Of all orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Orders This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyOrderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#000" />
                  <YAxis stroke="#000" />
                  <Tooltip contentStyle={{ color: '#000' }} />
                  <Bar dataKey="orders" fill="#333" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#000"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name.toLowerCase() as keyof typeof STATUS_COLORS] || '#000'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ color: '#000' }} />
                  <Legend formatter={(value) => <span style={{ color: '#000' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}