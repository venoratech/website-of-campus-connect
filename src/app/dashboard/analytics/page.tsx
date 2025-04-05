// app/dashboard/analytics/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "recharts";
import { formatPrice } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define interfaces for data structures
interface Vendor {
  id: string;
  vendor_name: string;
  profile_id: string;
}

interface SalesDataPoint {
  date: string;
  amount: number;
}

interface OrdersDataPoint {
  date: string;
  count: number;
}

interface ItemsDataPoint {
  name: string;
  value: number;
}

interface OrderRecord {
  id: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string;
  vendor_id: string;
  [key: string]: unknown;
}

interface RetentionData {
  retention_rate: number;
  current_active: number;
  previous_active: number;
  retained: number;
}

interface TopVendor {
  vendor_id: string;
  vendor_name: string;
  total_sales: number;
  order_count: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

type TimeRange = "week" | "month" | "quarter" | "year";

export default function AnalyticsPage() {
  const { profile, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [activeTab, setActiveTab] = useState("sales");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [ordersData, setOrdersData] = useState<OrdersDataPoint[]>([]);
  const [itemsData, setItemsData] = useState<ItemsDataPoint[]>([]);
  const [customerRetention, setCustomerRetention] =
    useState<RetentionData | null>(null);
  const [vendorRetention, setVendorRetention] = useState<RetentionData | null>(
    null
  );
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch vendors for admin filter
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        if (
          profile?.role === "admin" ||
          profile?.role === "super_admin" ||
          profile?.role === "analytics_manager"
        ) {
          const { data: vendorsData, error: vendorsError } = await supabase
            .from("food_vendors")
            .select("id, vendor_name, profile_id")
            .eq("is_active", true)
            .order("vendor_name", { ascending: true });

          if (vendorsError) throw vendorsError;
          setVendors(vendorsData || []);
        }
      } catch (err: unknown) {
        console.error("Error fetching vendors:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    if (profile) fetchVendors();
  }, [profile]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoadingData(true);
      setError(null);

      try {
        let vendorId = "";

        // Determine vendor filter
        if (profile?.role === "vendor") {
          const { data: vendorData } = await supabase
            .from("food_vendors")
            .select("id")
            .eq("profile_id", profile.id)
            .single();
          if (vendorData) vendorId = vendorData.id;
          else throw new Error("Vendor profile not found");
        } else if (
          (profile?.role === "admin" ||
            profile?.role === "super_admin" ||
            profile?.role === "analytics_manager") &&
          vendorFilter !== "all"
        ) {
          vendorId = vendorFilter;
        }

        // Calculate date ranges
        const now = new Date();
        const durationDays = { week: 7, month: 30, quarter: 90, year: 365 }[
          timeRange
        ];
        const startDate = new Date(
          now.getTime() - durationDays * 24 * 60 * 60 * 1000
        );
        const previousStart = new Date(
          startDate.getTime() - durationDays * 24 * 60 * 60 * 1000
        );

        const startDateString = startDate.toISOString();
        const previousStartString = previousStart.toISOString();
        const nowString = now.toISOString();

        // Fetch orders
        let ordersQuery = supabase
          .from("food_orders")
          .select("*, food_vendors(vendor_name)")
          .gte("created_at", startDateString)
          .order("created_at", { ascending: true });

        if (vendorId) ordersQuery = ordersQuery.eq("vendor_id", vendorId);

        const { data: orders, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;

        // Process orders data
        const processedData = processOrdersData(orders || [], timeRange);
        setSalesData(processedData.sales);
        setOrdersData(processedData.orders);

        // Fetch popular items
        const orderIds = orders?.map((o) => o.id) || [];
        if (orderIds.length > 0) {
          const { data: popularItems, error: itemsError } = await supabase
            .from("order_items")
            .select("quantity, menu_items!inner(id, name, vendor_id)")
            .in("order_id", orderIds);

          if (itemsError) throw itemsError;

          const itemsMap = new Map<string, number>();
          popularItems?.forEach((item) => {
            const menuItem = Array.isArray(item.menu_items)
              ? item.menu_items[0]
              : item.menu_items;
            if (menuItem) {
              const itemName = menuItem.name || "Unknown Item";
              const current = itemsMap.get(itemName) || 0;
              itemsMap.set(itemName, current + item.quantity);
            }
          });

          const topItems = Array.from(itemsMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
          setItemsData(topItems);
        } else {
          setItemsData([]);
        }

        // Fetch retention and top vendors for admins when "all vendors" is selected
        if (
          profile?.role === "admin" ||
          profile?.role === "super_admin" ||
          profile?.role === "analytics_manager"
        ) {
          const [customerRetentionData, vendorRetentionData, topVendorsData] =
            await Promise.all([
              supabase.rpc("get_customer_retention", {
                start_date: startDateString,
                end_date: nowString,
                previous_start: previousStartString,
              }),
              supabase.rpc("get_vendor_retention", {
                start_date: startDateString,
                end_date: nowString,
                previous_start: previousStartString,
              }),
              vendorFilter === "all"
                ? supabase.rpc("get_top_vendors", {
                    start_date: startDateString,
                    end_date: nowString,
                    limit_count: 5,
                  })
                : Promise.resolve({ data: [] }),
            ]);

          setCustomerRetention(customerRetentionData.data);
          setVendorRetention(vendorRetentionData.data);
          setTopVendors(topVendorsData.data || []);
        } else {
          setCustomerRetention(null);
          setVendorRetention(null);
          setTopVendors([]);
        }
      } catch (err: unknown) {
        console.error("Error fetching analytics data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoadingData(false);
      }
    };

    if (
      profile &&
      (profile.role === "admin" ||
        profile.role === "vendor" ||
        profile.role === "super_admin" ||
        profile.role === "analytics_manager")
    ) {
      fetchAnalyticsData();
    }
  }, [profile, timeRange, vendorFilter]);

  // Process orders data for charts
  const processOrdersData = (orders: OrderRecord[], range: string) => {
    const salesByDate = new Map<string, number>();
    const ordersByDate = new Map<string, number>();
    const dateFormat: "day" | "month" =
      range === "quarter" || range === "year" ? "month" : "day";

    orders.forEach((order) => {
      if (order.status !== "cancelled") {
        const date = new Date(order.created_at);
        const key =
          dateFormat === "day"
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                "0"
              )}-${String(date.getDate()).padStart(2, "0")}`
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                "0"
              )}`;

        salesByDate.set(key, (salesByDate.get(key) || 0) + order.total);
        ordersByDate.set(key, (ordersByDate.get(key) || 0) + 1);
      }
    });

    const salesData = Array.from(salesByDate.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ordersData = Array.from(ordersByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { sales: salesData, orders: ordersData };
  };

  // Memoized calculations
  const totalSales = useMemo(
    () => salesData.reduce((sum, item) => sum + item.amount, 0),
    [salesData]
  );
  const totalOrders = useMemo(
    () => ordersData.reduce((sum, item) => sum + item.count, 0),
    [ordersData]
  );
  const averageOrderValue = useMemo(
    () => (totalOrders > 0 ? totalSales / totalOrders : 0),
    [totalSales, totalOrders]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return timeRange === "week" || timeRange === "month"
      ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  };

  if (isLoading) return <div className="text-black">Loading...</div>;

  if (
    profile?.role !== "admin" &&
    profile?.role !== "vendor" &&
    profile?.role !== "super_admin" &&
    profile?.role !== "analytics_manager"
  ) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">
          You do not have permission to view analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">
          Analytics Dashboard
        </h1>
        <p className="text-black">
          {profile.role === "admin" && vendorFilter === "all"
            ? "View aggregated performance metrics across all vendors"
            : "View performance metrics and trends"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
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

          {(profile.role === "admin" ||
            profile.role === "super_admin" ||
            profile.role === "analytics_manager") && (
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[200px] border-gray-300 text-black">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loadingData ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black">
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {formatPrice(totalSales)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black">
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {totalOrders}
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-black">
                  Average Order Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {formatPrice(averageOrderValue)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs
            defaultValue={activeTab}
            onValueChange={setActiveTab}
            className="text-black"
          >
            <TabsList className="mb-4 bg-gray-100">
              <TabsTrigger
                value="sales"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                Sales Trends
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
              >
                Order Volume
              </TabsTrigger>
              {itemsData.length > 0 && (
                <TabsTrigger
                  value="items"
                  className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
                >
                  Popular Items
                </TabsTrigger>
              )}
              {customerRetention && (
                <TabsTrigger
                  value="students"
                  className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
                >
                  Student Analytics
                </TabsTrigger>
              )}
              {topVendors.length > 0 && (
                <TabsTrigger
                  value="vendors"
                  className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
                >
                  Vendor Performance
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="sales">
              <Card className="border-gray-300">
                <CardHeader>
                  <CardTitle className="text-black">Sales Trend</CardTitle>
                  <CardDescription className="text-black">
                    {(profile.role === "admin" ||
                      profile.role === "super_admin" ||
                      profile.role === "analytics_manager") &&
                    vendorFilter === "all"
                      ? "Aggregated sales across all vendors"
                      : ""}{" "}
                    {timeRange === "week" && "for the past 7 days"}
                    {timeRange === "month" && "for the past 30 days"}
                    {timeRange === "quarter" && "for the past 3 months"}
                    {timeRange === "year" && "for the past year"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {salesData.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      No sales data available
                    </div>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#000000"
                          />
                          <YAxis
                            tickFormatter={(value) =>
                              formatPrice(Number(value))
                            }
                            stroke="#000000"
                          />
                          <Tooltip
                            formatter={(value) => [
                              formatPrice(Number(value)),
                              "Sales",
                            ]}
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card className="border-gray-300">
                <CardHeader>
                  <CardTitle className="text-black">Order Volume</CardTitle>
                  <CardDescription className="text-black">
                    {(profile.role === "admin" ||
                      profile.role === "super_admin" ||
                      profile.role === "analytics_manager") &&
                    vendorFilter === "all"
                      ? "Aggregated order volume across all vendors"
                      : ""}{" "}
                    {timeRange === "week" && "for the past 7 days"}
                    {timeRange === "month" && "for the past 30 days"}
                    {timeRange === "quarter" && "for the past 3 months"}
                    {timeRange === "year" && "for the past year"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersData.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      No order data available
                    </div>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#000000"
                          />
                          <YAxis tickFormatter={(value) => `${value}`} stroke="#000000" />
                          <Tooltip formatter={(value) => [`${value} ${Number(value) === 1 ? 'Item' : 'Items'}`, 'Count']} labelFormatter={formatDate} />
                          <Legend />
                          <Bar dataKey="count" name="Orders" fill="#000000" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {itemsData.length > 0 && (
              <TabsContent value="items">
                <Card className="border-gray-300">
                  <CardHeader>
                    <CardTitle className="text-black">Popular Items</CardTitle>
                    <CardDescription className="text-black">
                      {(profile.role === "admin" ||
                        profile.role === "super_admin" ||
                        profile.role === "analytics_manager") &&
                      vendorFilter === "all"
                        ? "Most ordered items across all vendors"
                        : "Most ordered items"}{" "}
                      for the selected period
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
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {itemsData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              `${value} ordered`,
                              "Quantity",
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {customerRetention && (
              <TabsContent value="students">
                <Card className="border-gray-300">
                  <CardHeader>
                    <CardTitle className="text-black">
                      Student Analytics
                    </CardTitle>
                    <CardDescription className="text-black">
                      Key metrics for student engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Active Students
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {customerRetention.current_active}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Retention Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {customerRetention.retention_rate.toFixed(2)}%
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Average Orders per Student
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {customerRetention.current_active > 0
                              ? (
                                  totalOrders / customerRetention.current_active
                                ).toFixed(2)
                              : "0"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Average Spending per Student
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {customerRetention.current_active > 0
                              ? formatPrice(
                                  totalSales / customerRetention.current_active
                                )
                              : formatPrice(0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {topVendors.length > 0 && (
              <TabsContent value="vendors">
                <Card className="border-gray-300">
                  <CardHeader>
                    <CardTitle className="text-black">
                      Vendor Performance
                    </CardTitle>
                    <CardDescription className="text-black">
                      Top vendors and retention metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Active Vendors
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {vendorRetention?.current_active || 0}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-black">
                            Retention Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-black">
                            {vendorRetention?.retention_rate.toFixed(2) || 0}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-black">
                        Top Vendors by Sales
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topVendors}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="vendor_name" stroke="#000000" />
                            <YAxis
                              tickFormatter={(value) =>
                                formatPrice(Number(value))
                              }
                              stroke="#000000"
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatPrice(Number(value)),
                                "Sales",
                              ]}
                            />
                            <Legend />
                            <Bar
                              dataKey="total_sales"
                              name="Total Sales"
                              fill="#000000"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
