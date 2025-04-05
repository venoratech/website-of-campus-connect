'use client';

import { useEffect, useState, useMemo } from 'react';
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

interface DailyChartData {
  date: string;
  orders: number;
}

interface StatusChartData {
  name: string;
  value: number;
  percentage: number;
}

// Transform orders to daily data for the last 7 days
const transformOrdersToDailyData = (orders: FoodOrder[]): DailyChartData[] => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  return last7Days.map(date => ({
    date,
    orders: orders.filter(order => order.created_at.split('T')[0] === date).length
  }));
};

// Transform orders by status
const transformOrdersByStatus = (orders: FoodOrder[]): StatusChartData[] => {
  const statusCounts: Record<string, number> = {};
  orders.forEach(order => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  const total = orders.length;
  return Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  }));
};

const STATUS_COLORS = {
  'pending': '#3B82F6',
  'confirmed': '#10B981',
  'preparing': '#F59E0B',
  'ready': '#EC4899',
  'completed': '#8B5CF6',
  'cancelled': '#EF4444'
};

export default function Dashboard() {
  const { profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<FoodOrder[]>([]);

  // Fetch data based on user role
  useEffect(() => {
    const fetchData = async () => {
      try {
        let ordersData: FoodOrder[] = [];
        if (profile?.role === 'vendor') {
          const { data: vendorData } = await supabase
            .from('food_vendors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

          if (vendorData) {
            const { data } = await supabase
              .from('food_orders')
              .select('*')
              .eq('vendor_id', vendorData.id)
              .order('created_at', { ascending: false });
            ordersData = data || [];
          }
        } else if (profile?.role === 'admin'|| profile?.role === 'super_admin') {
          const { data } = await supabase
            .from('food_orders')
            .select('*')
            .order('created_at', { ascending: false });
          ordersData = data || [];
        }
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const thisMonthStart = useMemo(() => new Date(year, month, 1), [year, month]); // Line 125
  const lastMonthStart = useMemo(() => new Date(year, month - 1, 1), [year, month]); // Line 126
  const thisMonthOrders = useMemo(() => 
    orders.filter(order => new Date(order.created_at) >= thisMonthStart), 
    [orders, thisMonthStart]
  );

  const lastMonthOrders = useMemo(() => 
    orders.filter(order => {
      const date = new Date(order.created_at);
      return date >= lastMonthStart && date < thisMonthStart;
    }), 
    [orders, lastMonthStart, thisMonthStart]
  );

  const thisMonthTotalOrders = thisMonthOrders.length;
  const lastMonthTotalOrders = lastMonthOrders.length;
  const orderChangePercent = lastMonthTotalOrders > 0 
    ? Math.round(((thisMonthTotalOrders - lastMonthTotalOrders) / lastMonthTotalOrders) * 100) 
    : 0;

  const thisMonthCompletedOrders = thisMonthOrders.filter(o => o.status === 'completed');
  const thisMonthRevenue = thisMonthCompletedOrders.reduce((sum, o) => sum + o.total, 0);
  const lastMonthCompletedOrders = lastMonthOrders.filter(o => o.status === 'completed');
  const lastMonthRevenue = lastMonthCompletedOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueChangePercent = lastMonthRevenue > 0 
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
    : 0;

  const averageOrderValue = thisMonthCompletedOrders.length > 0 
    ? thisMonthRevenue / thisMonthCompletedOrders.length 
    : 0;

  const completionRate = thisMonthOrders.length > 0 
    ? Math.round((thisMonthCompletedOrders.length / thisMonthOrders.length) * 100) 
    : 0;

  // Compute chart data
  const dailyOrderData = useMemo(() => transformOrdersToDailyData(orders), [orders]);
  const statusData = useMemo(() => transformOrdersByStatus(orders), [orders]);

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
        {(profile?.role === 'admin' || profile?.role==='super_admin') && (
          <p className="text-black mt-2">Showing aggregated analytics for all vendors</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Orders (This Month)</CardTitle>
            <ShoppingBag className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{thisMonthTotalOrders}</div>
            <p className="text-xs text-black">
              {orderChangePercent > 0 ? '+' : ''}{orderChangePercent}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Revenue (This Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{formatPrice(thisMonthRevenue)}</div>
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
            <div className="text-2xl font-bold text-black">{formatPrice(averageOrderValue)}</div>
            <p className="text-xs text-black">Per completed order this month</p>
          </CardContent>
        </Card>

        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{completionRate}%</div>
            <p className="text-xs text-black">Of this month&apos;s orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Orders (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" stroke="#000" />
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