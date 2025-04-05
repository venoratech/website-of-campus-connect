// app/dashboard/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, FoodOrder, FoodVendor } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatTime, formatPrice } from '@/lib/utils';
import { 
  Eye, 
  ArrowRight, 
  Check, 
  Coffee, 
  Clock, 
  CheckCircle, 
  XCircle,

} from 'lucide-react';
import useInterval from '@/lib/useInterval';
import { CashierInvitations } from '../../../components/cashier/CashierInvitations';
import Image from 'next/image';

// Original interfaces preserved...
interface MenuItemRaw {
  id?: string;
  name?: string;
  image_url?: string;
}

interface OrderItemRaw {
  id?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  special_instructions?: string;
  menu_items?: MenuItemRaw | MenuItemRaw[];
}

interface CustomerRaw {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface MenuItem {
  id: string;
  name: string;
  image_url: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
  menu_items: MenuItem;
}

interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

type OrderWithDetails = {
  order: FoodOrder;
  orderItems: OrderItem[];
  customer: Customer | null;
  vendorName: string;
};

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Helper functions preserved...
const convertMenuItems = (menuItemsArray: MenuItemRaw | MenuItemRaw[]): MenuItem => {
  if (Array.isArray(menuItemsArray)) {
    const firstItem = menuItemsArray[0] || {};
    return {
      id: firstItem.id || '',
      name: firstItem.name || '',
      image_url: firstItem.image_url || ''
    };
  }
  
  return {
    id: menuItemsArray?.id || '',
    name: menuItemsArray?.name || '',
    image_url: menuItemsArray?.image_url || ''
  };
};

const convertOrderItem = (item: OrderItemRaw): OrderItem => {
  return {
    id: item.id || '',
    quantity: item.quantity || 0,
    unit_price: item.unit_price || 0,
    subtotal: item.subtotal || 0,
    special_instructions: item.special_instructions,
    menu_items: convertMenuItems(item.menu_items || {})
  };
};

const convertCustomer = (customer: CustomerRaw | null): Customer | null => {
  if (!customer) return null;
  
  return {
    id: customer.id || '',
    email: customer.email || '',
    first_name: customer.first_name || '',
    last_name: customer.last_name || ''
  };
};

export default function OrdersPage() {
  const { profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [showInvitations, setShowInvitations] = useState(true);



  const fetchData = async () => {
    try {
      setError(null);
      
      // Handle vendor role
      if (profile?.role === 'vendor') {
        const { data: vendorData, error: vendorError } = await supabase
          .from('food_vendors')
          .select('*')
          .eq('profile_id', profile.id)
          .single();
        
        if (vendorError) {
          if (vendorError.code === 'PGRST116') {
            setError('Please set up your vendor profile first');
            return;
          }
          throw vendorError;
        }
        
        setVendor(vendorData);
        await fetchOrdersForVendor(vendorData.id);
      } 
      // Handle cashier role
      else if (profile?.role === 'cashier') {
        // Get the cashier's associated vendor using the new function
        const { data, error: vendorError } = await supabase
          .rpc('get_cashier_vendor', { p_cashier_id: profile.id });
        
        if (vendorError || !data.success) {
          // If no vendor is associated, we don't show an error - the invitations component will handle it
          if (data?.message === 'Cashier is not associated with any vendor') {
            setShowInvitations(true);
          } else {
            setError(vendorError?.message || data?.message || 'You are not associated with any vendor');
          }
          return;
        }
        
        // We have a vendor, so we can hide the invitations
        setShowInvitations(false);
        
        const vendorData = data.vendor;
        setVendor(vendorData);
        await fetchOrdersForVendor(vendorData.id);
      }
      // Handle admin role
      else if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        const { data: ordersData, error: ordersError } = await supabase
          .from('food_orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (ordersError) throw ordersError;
        
        const ordersWithDetails: OrderWithDetails[] = await Promise.all(
          ordersData.map(async (order) => {
            const { data: customerData } = await supabase
              .from('profiles')
              .select('id, email, first_name, last_name')
              .eq('id', order.customer_id)
              .single();
            
            const { data: vendorData } = await supabase
              .from('food_vendors')
              .select('vendor_name')
              .eq('id', order.vendor_id)
              .single();
            
            const { data: orderItemsData } = await supabase
              .from('order_items')
              .select(`
                id, quantity, unit_price, subtotal, special_instructions,
                menu_items (id, name, image_url)
              `)
              .eq('order_id', order.id);
            
            return {
              order,
              orderItems: (orderItemsData || []).map(convertOrderItem),
              customer: convertCustomer(customerData),
              vendorName: vendorData?.vendor_name || 'Unknown Vendor'
            };
          })
        );
        
        setOrders(ordersWithDetails);
        setLastFetchTime(new Date());
      } else {
        setError('You do not have permission to view orders');
      }
    } catch (err: unknown) {
      const errorMessage = isErrorWithMessage(err) ? err.message : 'Error fetching orders';
      setError(errorMessage);
      console.error(err);
    }
  };

  // Helper function to fetch orders for a specific vendor
  const fetchOrdersForVendor = async (vendorId: string) => {
    const { data: ordersData, error: ordersError } = await supabase
      .from('food_orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    
    if (ordersError) throw ordersError;
    
    const ordersWithDetails: OrderWithDetails[] = await Promise.all(
      ordersData.map(async (order) => {
        const { data: customerData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', order.customer_id)
          .single();
        
        const { data: orderItemsData } = await supabase
          .from('order_items')
          .select(`
            id, quantity, unit_price, subtotal, special_instructions,
            menu_items (id, name, image_url)
          `)
          .eq('order_id', order.id);
        
        return {
          order,
          orderItems: (orderItemsData || []).map(convertOrderItem),
          customer: convertCustomer(customerData),
          vendorName: vendor?.vendor_name || 'Unknown Vendor'
        };
      })
    );
    
    setOrders(ordersWithDetails);
    setLastFetchTime(new Date());
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(() => {
    if (profile) {
      fetchData();
    }
  }, 30000);

  const handleViewOrder = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setViewOrderOpen(true);
  };

  const handleUpdateOrderStatus = async (order: FoodOrder, newStatus: string) => {
    // Only ask for confirmation on cancellation
    if (newStatus === 'cancelled' && !viewOrderOpen && !confirm(`Are you sure you want to reject order #${order.order_number}?`)) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate that newStatus is one of the allowed values
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const { error: updateError } = await supabase
        .from('food_orders')
        .update({ 
          status: newStatus as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      setSuccess(`Order #${order.order_number} status updated to ${newStatus}`);

      setOrders(orders.map(o => 
        o.order.id === order.id 
          ? { 
              ...o, 
              order: { 
                ...o.order, 
                status: newStatus as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
              } 
            } 
          : o
      ));

      if (selectedOrder && selectedOrder.order.id === order.id) {
        setSelectedOrder({
          ...selectedOrder,
          order: { 
            ...selectedOrder.order, 
            status: newStatus as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          }
        });
      }
    } catch (err: unknown) {
      const errorMessage = isErrorWithMessage(err) ? err.message : 'Error updating order status';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick accept order - changes status from pending to confirmed
  const handleAcceptOrder = async (order: FoodOrder) => {
    if (order.status !== 'pending') {
      setError("Only pending orders can be accepted");
      return;
    }
    
    await handleUpdateOrderStatus(order, 'confirmed');
  };
  
  // Quick reject order - changes status to cancelled
  const handleRejectOrder = async (order: FoodOrder) => {
    if (order.status !== 'pending') {
      setError("Only pending orders can be rejected");
      return;
    }
    
    if (confirm(`Are you sure you want to reject order #${order.order_number}?`)) {
      await handleUpdateOrderStatus(order, 'cancelled');
    }
  };

  // Handle when a cashier accepts an invitation
  const handleInvitationResponded = () => {
    // Refresh data after a short delay
    setTimeout(() => {
      fetchData();
    }, 1000);
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'pending': 'confirmed',
      'confirmed': 'preparing',
      'preparing': 'ready',
      'ready': 'completed'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'border-yellow-400 bg-yellow-50 text-yellow-700', label: 'Pending', icon: <Clock className="h-3 w-3 mr-1" /> },
      'confirmed': { color: 'border-blue-400 bg-blue-50 text-blue-700', label: 'Confirmed', icon: <Check className="h-3 w-3 mr-1" /> },
      'preparing': { color: 'border-purple-400 bg-purple-50 text-purple-700', label: 'Preparing', icon: <Coffee className="h-3 w-3 mr-1" /> },
      'ready': { color: 'border-orange-400 bg-orange-50 text-orange-700', label: 'Ready for Pickup', icon: <Check className="h-3 w-3 mr-1" /> },
      'completed': { color: 'border-green-400 bg-green-50 text-green-700', label: 'Completed', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      'cancelled': { color: 'border-red-400 bg-red-50 text-red-700', label: 'Cancelled', icon: <XCircle className="h-3 w-3 mr-1" /> }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'border-blue-400 bg-blue-50 text-blue-700', label: status, icon: null };
    return (
      <Badge className={`${config.color} border flex items-center`}>
        {config.icon}
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getQuickActions = (orderData: OrderWithDetails) => {
    const status = orderData.order.status;
    const actions = [];
    
    // Add Accept/Reject buttons for pending orders
    if (status === 'pending') {
      actions.push(
        <Button
          key="accept"
          variant="ghost"
          size="sm"
          onClick={() => handleAcceptOrder(orderData.order)}
          disabled={isSubmitting}
          className="text-green-600 hover:bg-green-50 hover:text-green-700"
          title="Accept Order"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Accept
        </Button>
      );
      
      actions.push(
        <Button
          key="reject"
          variant="ghost"
          size="sm"
          onClick={() => handleRejectOrder(orderData.order)}
          disabled={isSubmitting}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          title="Reject Order"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      );
      
      return actions;
    }
    
    // Add "Next Status" button if applicable
    const nextStatus = getNextStatus(status);
    if (nextStatus) {
      const nextStatusLabels = {
        'confirmed': { text: 'Start Prep', icon: <Coffee className="h-4 w-4 mr-1" /> },
        'preparing': { text: 'Ready', icon: <Check className="h-4 w-4 mr-1" /> },
        'ready': { text: 'Complete', icon: <CheckCircle className="h-4 w-4 mr-1" /> },
      };
      
      const label = nextStatusLabels[nextStatus as keyof typeof nextStatusLabels];
      
      actions.push(
        <Button
          key="next-status"
          variant="ghost"
          size="sm"
          onClick={() => handleUpdateOrderStatus(orderData.order, nextStatus)}
          disabled={isSubmitting}
          className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          title={`Mark as ${nextStatus}`}
        >
          {label ? label.icon : <ArrowRight className="h-4 w-4 mr-1" />}
          {label ? label.text : nextStatus}
        </Button>
      );
    }
    
    return actions;
  };

  const filteredOrders = orders.filter(o => {
    const orderMatchesSearch = 
      o.order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const orderMatchesStatus = statusFilter === 'all' || o.order.status === statusFilter;
    return orderMatchesSearch && orderMatchesStatus;
  });



  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  // For cashiers with no vendor assignment, show invitations only
  if (profile?.role === 'cashier' && !vendor && showInvitations) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-black">Order Management</h1>
        <p className="text-black">
          You currently aren&apos;t associated with any vendor. Accept an invitation to start managing orders.
        </p>
        
        {profile?.id && <CashierInvitations userId={profile.id} onInvitationResponded={handleInvitationResponded} />}
        
        <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
          <h2 className="text-xl font-semibold text-black mb-2">No Vendor Assignment</h2>
          <p className="text-gray-600 mb-4">You need to be assigned to a vendor before you can manage orders.</p>
          <p className="text-gray-600">
            If you don&apos;t see any invitations above, please contact a vendor to invite you.
          </p>
        </div>
      </div>
    );
  }

  // Updated access check to include cashier role
  const hasAccess = profile?.role === 'vendor' || profile?.role === 'admin' || 
                    profile?.role === 'super_admin' || profile?.role === 'cashier';
  
  // For vendor and cashier roles, check if vendor data is available
  const needsVendorSetup = (profile?.role === 'vendor' || profile?.role === 'cashier') && !vendor;

  if (!hasAccess || needsVendorSetup) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">
          {!hasAccess 
            ? "You do not have permission to view this page." 
            : profile?.role === 'vendor' 
              ? "You need to set up your vendor profile first." 
              : "You are not associated with any vendor. Please contact an administrator."}
        </p>
        {profile?.role === 'vendor' && (
          <Button className="mt-4 bg-gray-800 hover:bg-black text-white" asChild>
            <a href="/dashboard/vendor-profile">Set Up Vendor Profile</a>
          </Button>
        )}
      </div>
    );
  }

  const orderStatusCounts = {
    pending: orders.filter(o => o.order.status === 'pending').length,
    confirmed: orders.filter(o => o.order.status === 'confirmed').length,
    preparing: orders.filter(o => o.order.status === 'preparing').length,
    ready: orders.filter(o => o.order.status === 'ready').length,
    completed: orders.filter(o => o.order.status === 'completed').length,
    cancelled: orders.filter(o => o.order.status === 'cancelled').length
  };

  const LastRefreshed = () => lastFetchTime ? (
    <p className="text-sm text-black">
      Last refreshed: {formatTime(lastFetchTime.toISOString())} ({formatDate(lastFetchTime.toISOString())})
    </p>
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Order Management</h1>
        <div className="flex justify-between items-center">
          <p className="text-black">
            {profile.role === 'admin' || profile.role === 'super_admin' 
              ? 'View and manage all orders'
              : `Manage orders for ${vendor?.vendor_name}`}
          </p>
          <LastRefreshed />
        </div>
      </div>

      {/* Show invitations for cashiers if there are any */}
      {profile?.role === 'cashier' && profile?.id && 
        <CashierInvitations userId={profile.id} onInvitationResponded={handleInvitationResponded} />
      }

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md border border-green-300">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Interactive Status Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card 
          className={`border-gray-300 ${statusFilter === 'all' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">All Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orders.length}</div>
            <p className="text-xs text-black mt-1">Click to view all orders</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-300 ${statusFilter === 'pending' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.pending}</div>
            <p className="text-xs text-black mt-1">Waiting for confirmation</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-300 ${statusFilter === 'confirmed' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('confirmed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Confirmed</CardTitle>
            <Check className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.confirmed}</div>
            <p className="text-xs text-black mt-1">Ready to prepare</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-300 ${statusFilter === 'preparing' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('preparing')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Preparing</CardTitle>
            <Coffee className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.preparing}</div>
            <p className="text-xs text-black mt-1">In progress</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-300 ${statusFilter === 'ready' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('ready')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Ready</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.ready}</div>
            <p className="text-xs text-black mt-1">Ready for pickup</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-300 ${statusFilter === 'completed' ? 'ring-2 ring-gray-800' : ''} cursor-pointer transition-all hover:bg-gray-50 hover:shadow`}
          onClick={() => setStatusFilter('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.completed}</div>
            <p className="text-xs text-black mt-1">Delivered to customer</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-black">Orders</h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white text-black border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">All Statuses</SelectItem>
                <SelectItem value="pending" className="text-black">Pending</SelectItem>
                <SelectItem value="confirmed" className="text-black">Confirmed</SelectItem>
                <SelectItem value="preparing" className="text-black">Preparing</SelectItem>
                <SelectItem value="ready" className="text-black">Ready</SelectItem>
                <SelectItem value="completed" className="text-black">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-black">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/3">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-black border-gray-300"
            />
          </div>
        </div>

        <Card className="border-gray-300">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Order #</TableHead>
                  <TableHead className="text-black">Customer</TableHead>
                  {(profile.role === 'admin' || profile.role === 'super_admin') && 
                    <TableHead className="text-black">Vendor</TableHead>
                  }
                  <TableHead className="text-black">Date</TableHead>
                  <TableHead className="text-black">Total</TableHead>
                  <TableHead className="text-black">Payment</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-black" colSpan={2}>Items & Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={(profile.role === 'admin' || profile.role === 'super_admin') ? 9 : 8} 
                      className="text-center py-8 text-black"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((orderData) => (
                    <TableRow key={orderData.order.id} className="border-gray-200">
                      <TableCell className="font-medium text-black">{orderData.order.order_number}</TableCell>
                      <TableCell className="text-black">
                        {orderData.customer ? (
                          <div>
                            <p>{orderData.customer.first_name} {orderData.customer.last_name}</p>
                            <p className="text-xs text-black">{orderData.customer.email}</p>
                          </div>
                        ) : (
                          'Unknown Customer'
                        )}
                      </TableCell>
                      {(profile.role === 'admin' || profile.role === 'super_admin') && 
                        <TableCell className="text-black">{orderData.vendorName}</TableCell>
                      }
                      <TableCell className="text-black">
                        <div>
                          <p>{formatDate(orderData.order.created_at)}</p>
                          <p className="text-xs text-black">{formatTime(orderData.order.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-black">{formatPrice(orderData.order.total)}</TableCell>
                      <TableCell className="text-black">
                        {orderData.order.payment_method ? (
                          <Badge variant="outline" className="bg-gray-50">
                            {orderData.order.payment_method}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(orderData.order.status)}</TableCell>
                      <TableCell className="text-black">
                        <div className="flex flex-wrap gap-1 py-1 max-w-md">
                          {orderData.orderItems.map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center bg-white rounded-md border border-gray-100 shadow-sm p-1"
                              title={`${item.menu_items.name}: ${item.quantity}x ${formatPrice(item.unit_price)}`}
                            >
                              <div className="h-8 w-8 relative flex-shrink-0 mr-1 bg-gray-100 rounded overflow-hidden">
                                {item.menu_items?.image_url ? (
                                  <Image 
                                    src={item.menu_items.image_url}
                                    alt={item.menu_items.name}
                                    fill
                                    sizes="32px"
                                    style={{ objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full w-full bg-gray-200">
                                    <Coffee className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                <div className="absolute -right-1 -bottom-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                  {item.quantity}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <p className="text-xs font-medium truncate max-w-[80px]">{item.menu_items.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col space-y-1">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {getQuickActions(orderData)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(orderData)}
                            className="text-gray-600 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={viewOrderOpen} onOpenChange={setViewOrderOpen}>
        <DialogContent className="max-w-3xl bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Order Details #{selectedOrder?.order.order_number}</DialogTitle>
            <DialogDescription className="text-black">
              Order placed on {selectedOrder && formatDate(selectedOrder.order.created_at)} at {selectedOrder && formatTime(selectedOrder.order.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-black">Customer Information</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-black"><span className="font-medium">Name:</span> {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}</p>
                    <p className="text-black"><span className="font-medium">Email:</span> {selectedOrder.customer?.email}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-black">Order Status</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium mr-2 text-black">Status:</span> 
                      {getStatusBadge(selectedOrder.order.status)}
                    </div>
                    {selectedOrder.order.payment_status && (
                      <p className="text-black"><span className="font-medium">Payment Status:</span> {selectedOrder.order.payment_status}</p>
                    )}
                    {selectedOrder.order.payment_method && (
                      <p className="text-black"><span className="font-medium">Payment Method:</span> {selectedOrder.order.payment_method}</p>
                    )}
                  </div>
                  
                  {/* Quick status update buttons in the modal */}
                  {['pending', 'confirmed', 'preparing', 'ready'].includes(selectedOrder.order.status) && (
                    <div className="mt-3 border-t pt-3">
                      <h4 className="text-sm font-medium text-black mb-2">Update Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'confirmed')}
                              disabled={isSubmitting}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept Order
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this order?")) {
                                  handleUpdateOrderStatus(selectedOrder.order, 'cancelled');
                                }
                              }}
                              disabled={isSubmitting}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject Order
                            </Button>
                          </>
                        )}
                        
                        {selectedOrder.order.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'preparing')}
                            disabled={isSubmitting}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Coffee className="h-4 w-4 mr-1" />
                            Start Preparing
                          </Button>
                        )}
                        
                        {selectedOrder.order.status === 'preparing' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'ready')}
                            disabled={isSubmitting}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Mark Ready
                          </Button>
                        )}
                        
                        {selectedOrder.order.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'completed')}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete Order
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-black">Order Items</h3>
                <div className="mt-2 border border-gray-300 rounded-md">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-black w-[60px]"></TableHead>
                        <TableHead className="text-black">Item</TableHead>
                        <TableHead className="text-right text-black">Qty</TableHead>
                        <TableHead className="text-right text-black">Price</TableHead>
                        <TableHead className="text-right text-black">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.orderItems.map((item) => (
                        <TableRow key={item.id} className="border-gray-200">
                          <TableCell className="p-1">
                            <div className="h-12 w-12 relative rounded overflow-hidden bg-gray-100">
                              {item.menu_items?.image_url ? (
                                <Image 
                                  src={item.menu_items.image_url}
                                  alt={item.menu_items.name}
                                  fill
                                  sizes="48px"
                                  style={{ objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full">
                                  <Coffee className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-black">
                            <div>
                              <p className="font-medium">{item.menu_items?.name}</p>
                              {item.special_instructions && (
                                <p className="text-xs text-black">Note: {item.special_instructions}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-black">{item.quantity}</TableCell>
                          <TableCell className="text-right text-black">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right text-black">{formatPrice(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-between text-black">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-black">
                  <span>Tax:</span>
                  <span>{formatPrice(selectedOrder.order.tax)}</span>
                </div>
                {selectedOrder.order.tip > 0 && (
                  <div className="flex justify-between text-black">
                    <span>Tip:</span>
                    <span>{formatPrice(selectedOrder.order.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold mt-2 text-black">
                  <span>Total:</span>
                  <span>{formatPrice(selectedOrder.order.total)}</span>
                </div>
              </div>

              {selectedOrder.order.special_instructions && (
                <div>
                  <h3 className="text-sm font-medium text-black">Special Instructions</h3>
                  <p className="mt-1 p-2 bg-gray-50 rounded border border-gray-300 text-black">{selectedOrder.order.special_instructions}</p>
                </div>
              )}

              {selectedOrder.order.scheduled_pickup_time && (
                <div>
                  <h3 className="text-sm font-medium text-black">Scheduled Pickup</h3>
                  <p className="mt-1 text-black">{formatDate(selectedOrder.order.scheduled_pickup_time)} at {formatTime(selectedOrder.order.scheduled_pickup_time)}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-6">
                {selectedOrder.order.status !== 'completed' && selectedOrder.order.status !== 'cancelled' && (
                  <>
                    {selectedOrder.order.status === 'pending' && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this order?")) {
                            handleUpdateOrderStatus(selectedOrder.order, 'cancelled');
                            setViewOrderOpen(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Cancel Order
                      </Button>
                    )}
                  </>
                )}
                <Button
                  onClick={() => setViewOrderOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}