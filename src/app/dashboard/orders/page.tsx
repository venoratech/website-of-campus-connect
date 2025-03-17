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
import { Eye, ArrowRight, Check, Coffee, Clock } from 'lucide-react';
import useInterval from '@/lib/useInterval';


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

// Convert types for Supabase query results
const convertMenuItems = (menuItemsArray: MenuItemRaw | MenuItemRaw[]): MenuItem => {
  // If menu_items is an array (as in the error message), extract first item
  if (Array.isArray(menuItemsArray)) {
    const firstItem = menuItemsArray[0] || {};
    return {
      id: firstItem.id || '',
      name: firstItem.name || '',
      image_url: firstItem.image_url || ''
    };
  }
  
  // If it's already an object, ensure it has the right shape
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

  const fetchData = async () => {
    try {
      setError(null);
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
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('food_orders')
          .select('*')
          .eq('vendor_id', vendorData.id)
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
              vendorName: vendorData.vendor_name
            };
          })
        );
        
        setOrders(ordersWithDetails);
        setLastFetchTime(new Date());
      } else if (profile?.role === 'admin') {
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
    if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
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
      'pending': { color: 'border-yellow-400 bg-yellow-50 text-yellow-700', label: 'Pending' },
      'confirmed': { color: 'border-blue-400 bg-blue-50 text-blue-700', label: 'Confirmed' },
      'preparing': { color: 'border-purple-400 bg-purple-50 text-purple-700', label: 'Preparing' },
      'ready': { color: 'border-orange-400 bg-orange-50 text-orange-700', label: 'Ready for Pickup' },
      'completed': { color: 'border-green-400 bg-green-50 text-green-700', label: 'Completed' },
      'cancelled': { color: 'border-red-400 bg-red-50 text-red-700', label: 'Cancelled' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'border-blue-400 bg-blue-50 text-blue-700', label: status };
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
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

  if ((profile?.role !== 'vendor' && profile?.role !== 'admin') || (profile?.role === 'vendor' && !vendor)) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to view this page or need to set up your vendor profile first.</p>
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
            {profile.role === 'vendor' ? 'Manage your customer orders' : 'View and manage all orders'}
          </p>
          <LastRefreshed />
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className={`border-gray-300 ${statusFilter === 'all' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">All Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orders.length}</div>
            <Button 
              variant="ghost" 
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('all')}
            >
              View orders
            </Button>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-300 ${statusFilter === 'pending' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.pending}</div>
            <Button 
              variant="ghost"
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('pending')}
            >
              View orders
            </Button>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-300 ${statusFilter === 'confirmed' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Confirmed</CardTitle>
            <Check className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.confirmed}</div>
            <Button 
              variant="ghost" 
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('confirmed')}
            >
              View orders
            </Button>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-300 ${statusFilter === 'preparing' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Preparing</CardTitle>
            <Coffee className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.preparing}</div>
            <Button 
              variant="ghost" 
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('preparing')}
            >
              View orders
            </Button>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-300 ${statusFilter === 'ready' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Ready</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.ready}</div>
            <Button 
              variant="ghost" 
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('ready')}
            >
              View orders
            </Button>
          </CardContent>
        </Card>
        
        <Card className={`border-gray-300 ${statusFilter === 'completed' ? 'ring-2 ring-gray-800' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Completed</CardTitle>
            <Check className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-black">{orderStatusCounts.completed}</div>
            <Button 
              variant="ghost" 
              className="w-full justify-start p-0 h-auto text-xs text-black"
              onClick={() => setStatusFilter('completed')}
            >
              View orders
            </Button>
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
                  {profile.role === 'admin' && <TableHead className="text-black">Vendor</TableHead>}
                  <TableHead className="text-black">Date</TableHead>
                  <TableHead className="text-black">Total</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={profile.role === 'admin' ? 7 : 6} className="text-center py-8 text-black">
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
                      {profile.role === 'admin' && <TableCell className="text-black">{orderData.vendorName}</TableCell>}
                      <TableCell className="text-black">
                        <div>
                          <p>{formatDate(orderData.order.created_at)}</p>
                          <p className="text-xs text-black">{formatTime(orderData.order.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-black">{formatPrice(orderData.order.total)}</TableCell>
                      <TableCell>{getStatusBadge(orderData.order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewOrder(orderData)}
                          className="text-black hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {['pending', 'confirmed', 'preparing', 'ready'].includes(orderData.order.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateOrderStatus(orderData.order, getNextStatus(orderData.order.status) || '')}
                            disabled={isSubmitting}
                            className="text-black hover:bg-gray-100"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
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
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-black">Order Items</h3>
                <div className="mt-2 border border-gray-300 rounded-md">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-black">Item</TableHead>
                        <TableHead className="text-right text-black">Qty</TableHead>
                        <TableHead className="text-right text-black">Price</TableHead>
                        <TableHead className="text-right text-black">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.orderItems.map((item) => (
                        <TableRow key={item.id} className="border-gray-200">
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
              <div className="flex justify-end space-x-2">
                {selectedOrder.order.status !== 'completed' && selectedOrder.order.status !== 'cancelled' && (
                  <>
                    {selectedOrder.order.status === 'pending' && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleUpdateOrderStatus(selectedOrder.order, 'cancelled');
                          setViewOrderOpen(false);
                        }}
                        disabled={isSubmitting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Cancel Order
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        const nextStatus = getNextStatus(selectedOrder.order.status);
                        if (nextStatus) {
                          handleUpdateOrderStatus(selectedOrder.order, nextStatus);
                        }
                      }}
                      disabled={isSubmitting || !getNextStatus(selectedOrder.order.status)}
                      className="bg-gray-800 hover:bg-black text-white"
                    >
                      {getNextStatus(selectedOrder.order.status) === 'confirmed' && 'Confirm Order'}
                      {getNextStatus(selectedOrder.order.status) === 'preparing' && 'Start Preparing'}
                      {getNextStatus(selectedOrder.order.status) === 'ready' && 'Mark Ready'}
                      {getNextStatus(selectedOrder.order.status) === 'completed' && 'Complete Order'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}