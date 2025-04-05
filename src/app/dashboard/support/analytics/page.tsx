// /dashboard/support/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  totalTickets: number;
  newTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  averageResolutionTime: number;
  ticketsByPriority: { name: string; value: number }[];
  ticketsByStatus: { name: string; value: number }[];
  ticketsOverTime: { date: string; count: number }[];
  ticketsByCategory: { name: string; value: number }[];
  topPerformers: TopPerformer[];
}

interface TopPerformer {
  id: string;
  name: string;
  email: string;
  profile_image_url: string | null;
  ticketsResolved: number;
  averageResolutionTime: number;
}

export default function SupportAnalyticsDashboard() {
  const { profile, isLoading } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [timeRange, setTimeRange] = useState('7');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Check if current user has permission to access analytics
  const hasPermission = 
    profile?.role === 'super_admin' || 
    profile?.role === 'admin' || 
    profile?.role === 'analytics_manager';

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];
  const STATUS_COLORS = {
    new: '#2563EB',
    in_progress: '#8B5CF6',
    resolved: '#10B981',
    closed: '#6B7280'
  };
  
  const PRIORITY_COLORS = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#10B981'
  };

  const fetchAnalyticsData = async () => {
    if (!profile?.id || !hasPermission) return;
    
    setIsLoadingData(true);
    setError(null);
    
    try {
      // Calculate the date range based on selected time period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));
      
      // Get all tickets within the date range
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          responses:ticket_responses(created_at, responder_id)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (ticketsError) throw ticketsError;
      
      // Get all support staff with support roles
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, profile_image_url')
        .in('role', ['super_admin', 'admin', 'user_support_admin']);
      
      if (staffError) throw staffError;
      
      // Process and transform the data for analytics
      const totalTickets = ticketsData.length;
      const newTickets = ticketsData.filter(t => t.status === 'new').length;
      const resolvedTickets = ticketsData.filter(t => t.status === 'resolved').length;
      const closedTickets = ticketsData.filter(t => t.status === 'closed').length;
      const inProgressTickets = ticketsData.filter(t => t.status === 'in_progress').length;
      
      // Calculate tickets by status
      const ticketsByStatus = [
        { name: 'New', value: newTickets },
        { name: 'In Progress', value: inProgressTickets },
        { name: 'Resolved', value: resolvedTickets },
        { name: 'Closed', value: closedTickets }
      ];
      
      // Calculate tickets by priority
      const urgentTickets = ticketsData.filter(t => t.priority === 'urgent').length;
      const highTickets = ticketsData.filter(t => t.priority === 'high').length;
      const mediumTickets = ticketsData.filter(t => t.priority === 'medium').length;
      const lowTickets = ticketsData.filter(t => t.priority === 'low').length;
      
      const ticketsByPriority = [
        { name: 'Urgent', value: urgentTickets },
        { name: 'High', value: highTickets },
        { name: 'Medium', value: mediumTickets },
        { name: 'Low', value: lowTickets }
      ];
      
      // Calculate tickets over time (by day)
      const ticketsOverTime: { [key: string]: number } = {};
      
      // Initialize all dates in range

      
      // Count tickets for each day
      ticketsData.forEach(ticket => {
        const ticketDate = new Date(ticket.created_at).toISOString().split('T')[0];
        if (ticketsOverTime[ticketDate] !== undefined) {
          ticketsOverTime[ticketDate]++;
        }
      });
      
      const ticketsOverTimeArray = Object.entries(ticketsOverTime).map(([date, count]) => ({
        date,
        count
      }));
      
      // Categories based on order or item relation
      const withOrderTickets = ticketsData.filter(t => t.related_order_id).length;
      const withItemTickets = ticketsData.filter(t => t.related_item_id && !t.related_order_id).length;
      const generalTickets = ticketsData.filter(t => !t.related_order_id && !t.related_item_id).length;
      
      const ticketsByCategory = [
        { name: 'Order Issues', value: withOrderTickets },
        { name: 'Item Issues', value: withItemTickets },
        { name: 'General Support', value: generalTickets }
      ];
      
      // Calculate top performers
      const performerStats: {[key: string]: {resolved: number, resolutionTimes: number[]}} = {};
      
      // Initialize for each staff member
      staffData.forEach(staff => {
        performerStats[staff.id] = { resolved: 0, resolutionTimes: [] };
      });
      
      // Calculate stats
      ticketsData.forEach(ticket => {
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          // Only count if assigned to someone
          if (ticket.assigned_to && performerStats[ticket.assigned_to]) {
            performerStats[ticket.assigned_to].resolved++;
            
            // If there are responses, calculate resolution time
            if (ticket.responses && ticket.responses.length > 0) {
              const createdAt = new Date(ticket.created_at).getTime();
              const resolvedAt = ticket.responses
               .filter((r: { responder_id: string; created_at: string }) => r.responder_id === ticket.assigned_to)
                .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              
              if (resolvedAt) {
                const resolutionTime = new Date(resolvedAt.created_at).getTime() - createdAt;
                performerStats[ticket.assigned_to].resolutionTimes.push(resolutionTime);
              }
            }
          }
        }
      });
      
      // Format top performers
      const topPerformers = staffData
        .map(staff => {
          const stats = performerStats[staff.id];
          const averageTime = stats.resolutionTimes.length > 0
            ? stats.resolutionTimes.reduce((sum, time) => sum + time, 0) / stats.resolutionTimes.length
            : 0;
            
          return {
            id: staff.id,
            name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
            email: staff.email,
            profile_image_url: staff.profile_image_url,
            ticketsResolved: stats.resolved,
            averageResolutionTime: averageTime / (1000 * 60 * 60) // Convert to hours
          };
        })
        .sort((a, b) => b.ticketsResolved - a.ticketsResolved)
        .slice(0, 5);
      
      // Calculate average resolution time in hours
      const allResolutionTimes: number[] = [];
      Object.values(performerStats).forEach(stats => {
        allResolutionTimes.push(...stats.resolutionTimes);
      });
      
      const averageResolutionTime = allResolutionTimes.length > 0
        ? (allResolutionTimes.reduce((sum, time) => sum + time, 0) / allResolutionTimes.length) / (1000 * 60 * 60)
        : 0;
      
      setAnalyticsData({
        totalTickets,
        newTickets,
        resolvedTickets,
        closedTickets,
        inProgressTickets,
        averageResolutionTime,
        ticketsByPriority,
        ticketsByStatus,
        ticketsOverTime: ticketsOverTimeArray,
        ticketsByCategory,
        topPerformers
      });
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading analytics data');
      console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (profile && hasPermission) {
      fetchAnalyticsData();
    }
  }, [profile, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (!hasPermission) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access support analytics.</p>
      </div>
    );
  }

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    }
    return `${hours.toFixed(1)} hours`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Support Analytics</h1>
          <p className="text-black">
            Overview of support ticket metrics and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-white text-black border-gray-300">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchAnalyticsData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 border border-gray-300">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-white text-black">
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-white text-black">
            Trends
          </TabsTrigger>
        </TabsList>
        
        {isLoadingData ? (
          <div className="flex justify-center items-center py-16 mt-6">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              <p className="text-black">Loading analytics data...</p>
            </div>
          </div>
        ) : !analyticsData ? (
          <div className="bg-gray-50 p-8 rounded-md border border-gray-200 text-center mt-6">
            <p className="text-gray-600">No data available for the selected time period.</p>
          </div>
        ) : (
          <>
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">Total Tickets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">{analyticsData.totalTickets}</div>
                    <p className="text-xs text-gray-500 mt-1">During selected period</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">Awaiting Response</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-black">{analyticsData.newTickets}</div>
                      <p className="text-xs text-gray-500 mt-1">New tickets</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">Avg Resolution Time</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-black">
                        {formatTime(analyticsData.averageResolutionTime)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Per ticket</p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-black">Resolution Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-black">
                        {analyticsData.totalTickets > 0 
                          ? `${Math.round((analyticsData.resolvedTickets + analyticsData.closedTickets) / analyticsData.totalTickets * 100)}%` 
                          : 'N/A'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Tickets resolved</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">Tickets by Status</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.ticketsByStatus}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsData.ticketsByStatus.map((entry, index) => (
                            <Cell 
                              key={`status-cell-${index}`} 
                              fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">Tickets by Priority</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.ticketsByPriority}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsData.ticketsByPriority.map((entry, index) => (
                            <Cell 
                              key={`priority-cell-${index}`} 
                              fill={Object.values(PRIORITY_COLORS)[index % Object.values(PRIORITY_COLORS).length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-black">Tickets by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.ticketsByCategory}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Tickets" fill="#8884d8">
                        {analyticsData.ticketsByCategory.map((entry, index) => (
                          <Cell key={`category-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="performance" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-black">Top Performers</CardTitle>
                  <CardDescription className="text-gray-600">
                    Support staff with the most resolved tickets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analyticsData.topPerformers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-800 font-medium">
                            {index + 1}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={performer.profile_image_url || undefined} alt={performer.name} />
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              {performer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-black">{performer.name}</p>
                            <p className="text-sm text-gray-500">{performer.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-12">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Tickets Resolved</p>
                            <p className="text-xl font-medium text-black">{performer.ticketsResolved}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Avg. Resolution Time</p>
                            <p className="text-xl font-medium text-black">
                              {formatTime(performer.averageResolutionTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {analyticsData.topPerformers.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No performance data available for the selected time period.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">Resolution Efficiency</CardTitle>
                    <CardDescription className="text-gray-600">
                      Tickets resolved vs total tickets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Resolved/Closed', value: analyticsData.resolvedTickets + analyticsData.closedTickets },
                            { name: 'Open/In Progress', value: analyticsData.newTickets + analyticsData.inProgressTickets }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#3B82F6" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">High Priority Resolution</CardTitle>
                    <CardDescription className="text-gray-600">
                      Urgent and high priority ticket resolution rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-center items-center h-[300px]">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-gray-200"
                          strokeWidth="10"
                          stroke="currentColor"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                        />
                        <circle
                          className="text-blue-600"
                          strokeWidth="10"
                          strokeDasharray={`${(analyticsData.resolvedTickets + analyticsData.closedTickets) / Math.max(1, (analyticsData.ticketsByPriority[0].value + analyticsData.ticketsByPriority[1].value)) * 251.2} 251.2`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="40"
                          cx="50"
                          cy="50"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold text-black">
                          {Math.round((analyticsData.resolvedTickets + analyticsData.closedTickets) / Math.max(1, (analyticsData.ticketsByPriority[0].value + analyticsData.ticketsByPriority[1].value)) * 100)}%
                        </p>
                        <p className="text-sm text-gray-500">resolved</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                      <p className="text-sm text-gray-500">Urgent + High Priority Tickets</p>
                      <p className="text-xl font-medium text-black">
                        {analyticsData.ticketsByPriority[0].value + analyticsData.ticketsByPriority[1].value} total
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-black">Ticket Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analyticsData.ticketsOverTime}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return `${d.getMonth()+1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="Tickets" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">Ticket Categories Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.ticketsByCategory}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 70, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Number of Tickets" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-black">Priority Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.ticketsByPriority}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 70, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Number of Tickets" fill="#8B5CF6">
                          {analyticsData.ticketsByPriority.map((entry, index) => (
                            <Cell key={`priority-bar-${index}`} fill={Object.values(PRIORITY_COLORS)[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}