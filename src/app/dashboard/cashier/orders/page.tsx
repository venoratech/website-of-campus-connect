'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Eye, CheckCircle, Clock, CreditCard, XCircle, ShoppingBag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define interfaces
interface Order {
  id: string;
  user_id: string;
  vendor_id: string;
  order_items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  pickup_time: string | null;
  vendor_name: string;
  user_name: string;
  user_email: string;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  item_name: string;
  special_instructions?: string;
}

export default function CashierOrdersPage() {
  const { profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Count orders by status
  const orderCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  useEffect(() => {
    const fetchOrders = async () => {
      // Check for cashier or admin privileges
      if (!profile || (profile.role !== 'cashier' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
        setError('You do not have sufficient permissions to access this page');
        return;
      }

      try {
        // Fetch orders with vendor and user info
        const { data, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            vendors:vendor_id (vendor_name),
            users:user_id (first_name, last_name, email)
          `)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // Process and transform the orders data
        const processedOrders = data.map((order) => ({
          ...order,
          vendor_name: order.vendors?.vendor_name || 'Unknown Vendor',
          user_name: `${order.users?.first_name || ''} ${order.users?.last_name || ''}`.trim() || 'Unknown User',
          user_email: order.users?.email || 'unknown@example.com',
        }));

        setOrders(processedOrders);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching orders';
        setError(errorMessage);
        console.error(err);
      }
    };

    if (!isLoading) fetchOrders();
  }, [profile, isLoading]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!orderId) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update order status in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      setSuccess(`Order status updated to ${newStatus}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating order status';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newStatus: Order['payment_status']) => {
    if (!orderId) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update payment status in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);
        
      if (updateError) throw updateError;
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, payment_status: newStatus } : order
      ));
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: newStatus });
      }
      
      setSuccess(`Payment status updated to ${newStatus}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating payment status';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter orders based on search query and status filter
  const filteredOrders = orders.filter(order => {
    const searchMatches = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_email.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatches = statusFilter === 'all' || order.status === statusFilter;
    
    return searchMatches && statusMatches;
  });

  // Helper function for status badge styling
  const getStatusBadgeStyles = (status: Order['status']): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'accepted': return 'bg-blue-50 text-blue-700 border-blue-300 border';
      case 'preparing': return 'bg-indigo-50 text-indigo-700 border-indigo-300 border';
      case 'ready': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'completed': return 'bg-purple-50 text-purple-700 border-purple-300 border';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  // Helper function for payment status badge styling
  const getPaymentBadgeStyles = (status: Order['payment_status']): string => {
    switch (status) {
      case 'paid': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'failed': return 'bg-red-50 text-red-700 border-red-300 border';
      case 'refunded': return 'bg-purple-50 text-purple-700 border-purple-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessOrderManagement = profile && (
    profile.role === 'cashier' || 
    profile.role === 'admin' || 
    profile.role === 'super_admin'
  );

  if (!canAccessOrderManagement) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Order Management</h1>
        <p className="text-black text-sm sm:text-base">
          Process orders, update status, and manage payments
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md border border-red-300">
          <p className="text-red-800 font-medium text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-3 rounded-md border border-green-300">
          <p className="text-green-800 font-medium text-sm">{success}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Pending</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-yellow-600">{orderCounts.pending}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Preparing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-indigo-600">{orderCounts.preparing}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Ready</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-green-600">{orderCounts.ready}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Completed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-purple-600">{orderCounts.completed}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-red-600">{orderCounts.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg sm:text-xl font-semibold text-black">Orders</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-white text-black border-gray-300 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
              <SelectItem value="all" className="text-black">All Orders</SelectItem>
              <SelectItem value="pending" className="text-yellow-700">Pending</SelectItem>
              <SelectItem value="accepted" className="text-blue-700">Accepted</SelectItem>
              <SelectItem value="preparing" className="text-indigo-700">Preparing</SelectItem>
              <SelectItem value="ready" className="text-green-700">Ready</SelectItem>
              <SelectItem value="completed" className="text-purple-700">Completed</SelectItem>
              <SelectItem value="cancelled" className="text-red-700">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white text-black border-gray-300 h-9 text-sm"
          />
        </div>
      </div>

      {/* Order Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <OrdersTable 
            orders={filteredOrders} 
            onViewOrder={handleViewOrder} 
            onUpdateStatus={handleUpdateOrderStatus} 
            onUpdatePayment={handleUpdatePaymentStatus}
            getStatusBadgeStyles={getStatusBadgeStyles}
            getPaymentBadgeStyles={getPaymentBadgeStyles}
            isSubmitting={isSubmitting}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <OrdersTable 
            orders={filteredOrders.filter(order => 
              ['pending', 'accepted', 'preparing', 'ready'].includes(order.status)
            )} 
            onViewOrder={handleViewOrder} 
            onUpdateStatus={handleUpdateOrderStatus} 
            onUpdatePayment={handleUpdatePaymentStatus}
            getStatusBadgeStyles={getStatusBadgeStyles}
            getPaymentBadgeStyles={getPaymentBadgeStyles}
            isSubmitting={isSubmitting}
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <OrdersTable 
            orders={filteredOrders.filter(order => 
              ['completed', 'cancelled'].includes(order.status)
            )} 
            onViewOrder={handleViewOrder} 
            onUpdateStatus={handleUpdateOrderStatus} 
            onUpdatePayment={handleUpdatePaymentStatus}
            getStatusBadgeStyles={getStatusBadgeStyles}
            getPaymentBadgeStyles={getPaymentBadgeStyles}
            isSubmitting={isSubmitting}
          />
        </TabsContent>
      </Tabs>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Order Details</DialogTitle>
            <DialogDescription className="text-black">
              Order #{selectedOrder?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-sm font-medium text-black">Status</h3>
                  <Badge className={getStatusBadgeStyles(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-black">Payment</h3>
                  <Badge className={getPaymentBadgeStyles(selectedOrder.payment_status)}>
                    {selectedOrder.payment_status.charAt(0).toUpperCase() + selectedOrder.payment_status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">Order Information</h3>
                <div className="text-sm text-black">
                  <p><span className="font-medium">Vendor:</span> {selectedOrder.vendor_name}</p>
                  <p><span className="font-medium">Customer:</span> {selectedOrder.user_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.user_email}</p>
                  <p><span className="font-medium">Ordered:</span> {formatDate(selectedOrder.created_at)}</p>
                  <p><span className="font-medium">Pickup Time:</span> {selectedOrder.pickup_time ? 
                    formatDate(selectedOrder.pickup_time) : 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">Order Items</h3>
                <Card className="border-gray-200">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-black">Item</TableHead>
                          <TableHead className="text-black text-right">Qty</TableHead>
                          <TableHead className="text-black text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.order_items.map((item) => (
                          <TableRow key={item.id} className="border-gray-200">
                            <TableCell className="font-medium text-black">
                              {item.item_name}
                              {item.special_instructions && (
                                <p className="text-xs text-gray-500">Note: {item.special_instructions}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-black">{item.quantity}</TableCell>
                            <TableCell className="text-right text-black">${(item.price * item.quantity).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-gray-300">
                          <TableCell colSpan={2} className="font-bold text-black text-right">Total:</TableCell>
                          <TableCell className="text-right font-bold text-black">${selectedOrder.total_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      disabled={selectedOrder.status === status || isSubmitting}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, status as Order['status'])}
                      className={`${
                        selectedOrder.status === status 
                          ? 'bg-gray-100 text-gray-700 border-gray-300' 
                          : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">Update Payment</h3>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'paid', 'failed', 'refunded'].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      disabled={selectedOrder.payment_status === status || isSubmitting}
                      onClick={() => handleUpdatePaymentStatus(selectedOrder.id, status as Order['payment_status'])}
                      className={`${
                        selectedOrder.payment_status === status 
                          ? 'bg-gray-100 text-gray-700 border-gray-300' 
                          : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setOrderDetailsOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Orders Table Component
interface OrdersTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onUpdatePayment: (orderId: string, status: Order['payment_status']) => void;
  getStatusBadgeStyles: (status: Order['status']) => string;
  getPaymentBadgeStyles: (status: Order['payment_status']) => string;
  isSubmitting: boolean;
}

function OrdersTable({ 
  orders, 
  onViewOrder, 
  onUpdateStatus, 
  onUpdatePayment,
  getStatusBadgeStyles,
  getPaymentBadgeStyles,
  isSubmitting 
}: OrdersTableProps) {
  return (
    <Card className="border-gray-300">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-black">Order ID</TableHead>
                <TableHead className="text-black">Customer</TableHead>
                <TableHead className="text-black">Vendor</TableHead>
                <TableHead className="text-black">Amount</TableHead>
                <TableHead className="text-black">Status</TableHead>
                <TableHead className="text-black">Payment</TableHead>
                <TableHead className="text-black">Date</TableHead>
                <TableHead className="text-right text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-black">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="border-gray-200">
                    <TableCell className="font-medium text-black">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-black">{order.user_name}</TableCell>
                    <TableCell className="text-black">{order.vendor_name}</TableCell>
                    <TableCell className="text-black">${order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeStyles(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentBadgeStyles(order.payment_status)}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-black">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewOrder(order)}
                        className="text-black hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* Quick action buttons for specific status changes */}
                      {order.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdateStatus(order.id, 'accepted')}
                          className="text-blue-600 hover:bg-blue-50"
                          title="Accept Order"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {order.status === 'accepted' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdateStatus(order.id, 'preparing')}
                          className="text-indigo-600 hover:bg-indigo-50"
                          title="Mark as Preparing"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {order.status === 'preparing' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdateStatus(order.id, 'ready')}
                          className="text-green-600 hover:bg-green-50"
                          title="Mark as Ready"
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {order.status === 'ready' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdateStatus(order.id, 'completed')}
                          className="text-purple-600 hover:bg-purple-50"
                          title="Mark as Completed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Payment mark as paid button */}
                      {order.payment_status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdatePayment(order.id, 'paid')}
                          className="text-green-600 hover:bg-green-50"
                          title="Mark as Paid"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Cancel button for pending or accepted orders */}
                      {(order.status === 'pending' || order.status === 'accepted') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSubmitting}
                          onClick={() => onUpdateStatus(order.id, 'cancelled')}
                          className="text-red-600 hover:bg-red-50"
                          title="Cancel Order"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 