// app/dashboard/orders/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Check, 
  Coffee, 
  Clock, 
  CheckCircle, 
  XCircle,
  Volume2,
  VolumeX,
  CalendarClock
} from 'lucide-react';
import useInterval from '@/lib/useInterval';
import { CashierInvitations } from '../../../components/cashier/CashierInvitations';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

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

// Time slot types
type TimeSlot = {
  label: string;
  startTime: string;
  endTime: string;
};

type OrderStatus = FoodOrder['status'];


// Time filter options
type TimeFilterOption = 'all' | 'upcoming' | 'past' | 'slot';

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

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

// Generate time slots (30-minute intervals)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const startHour = 6; // 6:00 AM
  const endHour = 24; // 12:00 AM

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = new Date(now);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);
      
      const startLabel = formatTime(startTime.toISOString());
      const endLabel = formatTime(endTime.toISOString());
      
      slots.push({
        label: `${startLabel} - ${endLabel}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });
    }
  }
  
  return slots;
};

export default function OrdersPage() {
  const { profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('all');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [showInvitations, setShowInvitations] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('orderSoundEnabled') !== 'false';
    }
    return true;
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  const orderAudioRef = useRef<HTMLAudioElement | null>(null);
  const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const fetchOrdersForVendorRef = useRef<(vendorId: string, previousPendingCount: number) => Promise<void>>(() => Promise.resolve());
  const updateOrdersAndTimeRef = useRef<(ordersWithDetails: OrderWithDetails[], previousPendingCount: number) => void>(() => {});

  // Generate time slots when component mounts
  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Audio) {
      orderAudioRef.current = new Audio('/sounds/service-bell-ring-14610.mp3');
      if (orderAudioRef.current) {
        orderAudioRef.current.load();
        orderAudioRef.current.volume = 0.7;
      }
    }
    return () => {
      if (orderAudioRef.current) {
        orderAudioRef.current.pause();
        orderAudioRef.current = null;
      }
    };
  }, []);

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderSoundEnabled', enabled.toString());
    }
    if (enabled && orderAudioRef.current) {
      const testAudio = orderAudioRef.current.cloneNode() as HTMLAudioElement;
      testAudio.volume = 0.3;
      testAudio.play().catch(err => console.error('Error playing test sound:', err));
    }
  };

  const playOrderSound = useCallback(() => {
    if (!orderAudioRef.current || !soundEnabled) return;
    try {
      const soundToPlay = orderAudioRef.current.cloneNode() as HTMLAudioElement;
      soundToPlay.volume = 0.7;
      soundToPlay.play().catch(err => {
        console.error('Error playing notification sound:', err);
      });
    } catch (err) {
      console.error('Failed to play notification sound:', err);
    }
  }, [soundEnabled]);

  const updateOrdersAndTime = useCallback((ordersWithDetails: OrderWithDetails[], previousPendingCount: number) => {
    const currentPendingCount = ordersWithDetails.filter(o => o.order.status === 'pending').length;
    
    if (lastFetchTime && currentPendingCount > previousPendingCount && soundEnabled) {
      playOrderSound();
    }
    
    setOrders(ordersWithDetails);
    setLastFetchTime(new Date());
  }, [lastFetchTime, soundEnabled, playOrderSound]);

  const fetchOrdersForVendor = useCallback(async (vendorId: string, previousPendingCount: number) => {
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
    
    updateOrdersAndTime(ordersWithDetails, previousPendingCount);
  }, [vendor, updateOrdersAndTime]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const previousPendingCount = orders.filter(o => o.order.status === 'pending').length;
      
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
        await fetchOrdersForVendor(vendorData.id, previousPendingCount);
      } else if (profile?.role === 'cashier') {
        const { data, error: vendorError } = await supabase
          .rpc('get_cashier_vendor', { p_cashier_id: profile.id });
        
        if (vendorError || !data.success) {
          if (data?.message === 'Cashier is not associated with any vendor') {
            setShowInvitations(true);
          } else {
            setError(vendorError?.message || data?.message || 'You are not associated with any vendor');
          }
          return;
        }
        
        setShowInvitations(false);
        const vendorData = data.vendor;
        setVendor(vendorData);
        await fetchOrdersForVendor(vendorData.id, previousPendingCount);
      } else if (profile?.role === 'admin' || profile?.role === 'super_admin') {
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
        
        updateOrdersAndTime(ordersWithDetails, previousPendingCount);
      } else {
        setError('You do not have permission to view orders');
      }
    } catch (err: unknown) {
      const errorMessage = isErrorWithMessage(err) ? err.message : 'Error fetching orders';
      setError(errorMessage);
      console.error(err);
    }
  }, [profile, orders, fetchOrdersForVendor, updateOrdersAndTime]);

  // Update refs when functions change
  useEffect(() => {
    fetchDataRef.current = fetchData;
    fetchOrdersForVendorRef.current = fetchOrdersForVendor;
    updateOrdersAndTimeRef.current = updateOrdersAndTime;
  }, [fetchData, fetchOrdersForVendor, updateOrdersAndTime]);

  // Initial data fetch
  useEffect(() => {
    if (profile) {
      fetchDataRef.current?.();
    }
  }, [profile]);

  // Periodic refresh
  useInterval(() => {
    if (profile) {
      fetchDataRef.current?.();
    }
  }, 30000);

  const handleViewOrder = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setViewOrderOpen(true);
  };

// Since FoodOrder is already properly defined in lib/supabase.ts, 
// we need to make sure we're using it correctly in our component




// Update the handleUpdateOrderStatus function to use the correct type
const handleUpdateOrderStatus = async (order: FoodOrder, newStatus: OrderStatus) => {
  if (newStatus === 'cancelled' && !viewOrderOpen && !confirm(`Are you sure you want to reject order #${order.order_number}?`)) {
    return;
  }
  
  setIsSubmitting(true);
  setError(null);
  setSuccess(null);

  try {
    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Update UI immediately to provide feedback
    const updatedAt = new Date().toISOString();
    
    // Update local state to reflect the changes immediately
    setOrders(prevOrders => 
      prevOrders.map(orderData => {
        if (orderData.order.id === order.id) {
          return {
            ...orderData,
            order: {
              ...orderData.order,
              status: newStatus,
              updated_at: updatedAt
            }
          };
        }
        return orderData;
      })
    );
    
    // If we're viewing a specific order, update that as well
    if (selectedOrder?.order.id === order.id) {
      setSelectedOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          order: {
            ...prev.order,
            status: newStatus,
            updated_at: updatedAt
          }
        };
      });
    }
    
    // Then perform the actual API call
    const { error } = await supabase
      .from('food_orders')
      .update({ 
        status: newStatus,
        updated_at: updatedAt
      })
      .eq('id', order.id);
    
    if (error) {
      // If the API call fails, revert the UI changes and show the error
      throw error;
    }

    setSuccess(`Order #${order.order_number} status updated to ${newStatus}`);
  } catch (err: unknown) {
    // Revert UI changes if API call failed
    await fetchDataRef.current?.();
    
    const errorMessage = isErrorWithMessage(err) ? err.message : 'Error updating order status';
    setError(errorMessage);
    console.error(err);
  } finally {
    setIsSubmitting(false);
  }
};
  

  const handleAcceptOrder = async (order: FoodOrder) => {
    if (order.status !== 'pending') {
      setError("Only pending orders can be accepted");
      return;
    }
    
    await handleUpdateOrderStatus(order, 'confirmed');
  };
  
  const handleRejectOrder = async (order: FoodOrder) => {
    if (order.status !== 'pending') {
      setError("Only pending orders can be rejected");
      return;
    }
    
    if (confirm(`Are you sure you want to reject order #${order.order_number}?`)) {
      await handleUpdateOrderStatus(order, 'cancelled');
    }
  };

  const handleInvitationResponded = () => {
    setTimeout(() => {
      fetchDataRef.current?.();
    }, 1000);
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      'pending': 'confirmed',
      'confirmed': 'preparing',
      'preparing': 'ready',
      'ready': 'completed',
      'completed': null,
      'cancelled': null
    };
    return statusFlow[currentStatus];
  };
  

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Pending', 
        icon: <Clock className="h-3.5 w-3.5 mr-1.5" /> 
      },
      'confirmed': { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: 'Confirmed', 
        icon: <Check className="h-3.5 w-3.5 mr-1.5" /> 
      },
      'preparing': { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        label: 'Preparing', 
        icon: <Coffee className="h-3.5 w-3.5 mr-1.5" /> 
      },
      'ready': { 
        color: 'bg-orange-100 text-orange-800 border-orange-200', 
        label: 'Ready for Pickup', 
        icon: <Check className="h-3.5 w-3.5 mr-1.5" /> 
      },
      'completed': { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        label: 'Completed', 
        icon: <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> 
      },
      'cancelled': { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        label: 'Cancelled', 
        icon: <XCircle className="h-3.5 w-3.5 mr-1.5" /> 
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      label: status, 
      icon: null 
    };
    return (
      <Badge className={`${config.color} border rounded-full px-3 py-1 text-sm font-medium flex items-center shadow-sm`}>
        {config.icon}
        <span>{config.label}</span>
      </Badge>
    );
  };

  // Helper function to check if an order is in a time slot
  const isOrderInTimeSlot = (order: FoodOrder, slot: TimeSlot): boolean => {
    if (!order.scheduled_pickup_time) return false;
    
    const pickupTime = new Date(order.scheduled_pickup_time).getTime();
    const slotStart = new Date(slot.startTime).getTime();
    const slotEnd = new Date(slot.endTime).getTime();
    
    return pickupTime >= slotStart && pickupTime < slotEnd;
  };

  // Helper function to check if an order is upcoming or past
  const isOrderUpcoming = (order: FoodOrder): boolean => {
    if (!order.scheduled_pickup_time) return false;
    
    const now = new Date().getTime();
    const pickupTime = new Date(order.scheduled_pickup_time).getTime();
    
    return pickupTime > now;
  };

  const filteredOrders = orders.filter(o => {
    const orderMatchesSearch = 
      o.order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const orderMatchesStatus = statusFilter === 'all' || o.order.status === statusFilter;
    
    // Apply time filter
    let orderMatchesTimeFilter = true;
    
    if (timeFilter === 'upcoming') {
      orderMatchesTimeFilter = isOrderUpcoming(o.order);
    } else if (timeFilter === 'past') {
      orderMatchesTimeFilter = !isOrderUpcoming(o.order) && !!o.order.scheduled_pickup_time;
    } else if (timeFilter === 'slot' && selectedTimeSlot) {
      const selectedSlot = timeSlots.find(slot => slot.label === selectedTimeSlot);
      orderMatchesTimeFilter = selectedSlot ? isOrderInTimeSlot(o.order, selectedSlot) : true;
    }
    
    return orderMatchesSearch && orderMatchesStatus && orderMatchesTimeFilter;
  });

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

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

  const hasAccess = profile?.role === 'vendor' || profile?.role === 'admin' || 
                    profile?.role === 'super_admin' || profile?.role === 'cashier';
  
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

  // Count upcoming orders
  const upcomingOrdersCount = orders.filter(o => isOrderUpcoming(o.order)).length;

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
          <div className="flex items-center space-x-4">
            {(profile?.role === 'vendor' || profile?.role === 'cashier') && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sound-mode" 
                  checked={soundEnabled}
                  onCheckedChange={handleToggleSound}
                />
                <Label htmlFor="sound-mode" className="text-black cursor-pointer text-sm flex items-center gap-1">
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  Order alerts
                  {soundEnabled ? (
                    <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">ON</span>
                  ) : (
                    <span className="ml-1 text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">OFF</span>
                  )}
                </Label>
              </div>
            )}
            <LastRefreshed />
          </div>
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card 
          className={`border-gray-200 ${statusFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">All Orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
            <p className="text-xs text-gray-500 mt-1">Click to view all orders</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-200 ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orderStatusCounts.pending}</div>
            <p className="text-xs text-gray-500 mt-1">Waiting for confirmation</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-200 ${statusFilter === 'confirmed' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('confirmed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Confirmed</CardTitle>
            <Check className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orderStatusCounts.confirmed}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to prepare</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-200 ${statusFilter === 'preparing' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('preparing')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Preparing</CardTitle>
            <Coffee className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orderStatusCounts.preparing}</div>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-200 ${statusFilter === 'ready' ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('ready')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Ready</CardTitle>
            <Check className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orderStatusCounts.ready}</div>
            <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`border-gray-200 ${statusFilter === 'completed' ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => setStatusFilter('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{orderStatusCounts.completed}</div>
            <p className="text-xs text-gray-500 mt-1">Delivered to customer</p>
          </CardContent>
        </Card>
        
        {/* Upcoming Orders Card */}
        <Card 
          className={`border-gray-200 ${timeFilter === 'upcoming' ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'} cursor-pointer transition-all duration-200`}
          onClick={() => {
            setTimeFilter(prev => prev === 'upcoming' ? 'all' : 'upcoming');
            setSelectedTimeSlot('');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-700">Upcoming</CardTitle>
            <CalendarClock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-gray-900">{upcomingOrdersCount}</div>
            <p className="text-xs text-gray-500 mt-1">Future pickup times</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white text-gray-700 border-gray-200 hover:border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all" className="text-gray-700">All Statuses</SelectItem>
                <SelectItem value="pending" className="text-gray-700">Pending</SelectItem>
                <SelectItem value="confirmed" className="text-gray-700">Confirmed</SelectItem>
                <SelectItem value="preparing" className="text-gray-700">Preparing</SelectItem>
                <SelectItem value="ready" className="text-gray-700">Ready</SelectItem>
                <SelectItem value="completed" className="text-gray-700">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-gray-700">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Time Filter */}
            <Select 
              value={timeFilter} 
              onValueChange={(value: TimeFilterOption) => {
                setTimeFilter(value);
                if (value !== 'slot') setSelectedTimeSlot('');
              }}
            >
              <SelectTrigger className="w-[160px] bg-white text-gray-700 border-gray-200 hover:border-gray-300">
                <SelectValue placeholder="Time Filter" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all" className="text-gray-700">All Times</SelectItem>
                <SelectItem value="upcoming" className="text-gray-700">Upcoming Pickups</SelectItem>
                <SelectItem value="past" className="text-gray-700">Past Pickups</SelectItem>
                <SelectItem value="slot" className="text-gray-700">Specific Time Slot</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Time Slot Selector - Only show when "Specific Time Slot" is selected */}
            {timeFilter === 'slot' && (
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger className="w-[180px] bg-white text-gray-700 border-gray-200 hover:border-gray-300">
                  <SelectValue placeholder="Select Time Slot" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[200px] overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.label} value={slot.label} className="text-gray-700">
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="w-1/3">
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-gray-700 border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        <Card className="border-gray-300">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black font-bold">Order #</TableHead>
                  <TableHead className="text-black font-bold">Customer</TableHead>
                  <TableHead className="text-black font-bold">Pickup Time</TableHead>
                  <TableHead className="text-black font-bold">Items</TableHead>
                  <TableHead className="text-black font-bold">Notes</TableHead>
                  <TableHead className="text-black font-bold">Total</TableHead>
                  <TableHead className="text-black font-bold">Status</TableHead>
                  <TableHead className="text-black font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={8} 
                      className="text-center py-8 text-black"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((orderData) => (
                    <TableRow 
                      key={orderData.order.id} 
                      className={`border-gray-200 ${orderData.order.special_instructions ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <TableCell className="font-medium text-black">
                        <div className="text-lg">{orderData.order.order_number}</div>
                        <div className="text-xs text-gray-500">{formatDate(orderData.order.created_at)} {formatTime(orderData.order.created_at)}</div>
                      </TableCell>
                      
                      <TableCell className="text-black">
                        {orderData.customer ? (
                          <div>
                            <p className="font-medium">{orderData.customer.first_name} {orderData.customer.last_name}</p>
                            {orderData.order.payment_method && (
                              <Badge variant="outline" className="mt-1 bg-gray-50 text-xs">
                                {orderData.order.payment_method}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          'Unknown Customer'
                        )}
                      </TableCell>
                      
                      <TableCell className="text-black">
                        {orderData.order.scheduled_pickup_time ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-800">{formatTime(orderData.order.scheduled_pickup_time)}</span>
                            <span className="text-xs">{formatDate(orderData.order.scheduled_pickup_time)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Not scheduled</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-black">
                        <div className="flex flex-wrap gap-1 py-1">
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
                              <span className="text-xs font-medium truncate max-w-[60px]">{item.menu_items.name}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-black">
                        {orderData.order.special_instructions ? (
                          <div className="px-2 py-1 bg-red-50 border border-red-100 rounded text-red-800 text-xs max-w-[200px] max-h-[80px] overflow-auto">
                            {orderData.order.special_instructions}
                          </div>
                        ) : orderData.orderItems.some(item => item.special_instructions) ? (
                          <div className="px-2 py-1 bg-orange-50 border border-orange-100 rounded text-orange-800 text-xs max-w-[200px] max-h-[80px] overflow-auto">
                            {orderData.orderItems
                              .filter(item => item.special_instructions)
                              .map((item, idx) => (
                                <div key={item.id || idx} className="mb-1">
                                  {item.special_instructions}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-black font-medium">
                        {formatPrice(orderData.order.total)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(orderData.order.status)}
                          {orderData.order.status === 'pending' && (
                            <span className="text-xs text-red-600 font-medium animate-pulse">
                              Needs attention!
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex flex-col space-y-2">
                          {orderData.order.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptOrder(orderData.order)}
                                disabled={isSubmitting}
                                className="bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Accept</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectOrder(orderData.order)}
                                disabled={isSubmitting}
                                className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          )}
                          
                          {getNextStatus(orderData.order.status) && orderData.order.status !== 'pending' && (
  <Button
    size="sm"
    onClick={() => {
      const nextStatus = getNextStatus(orderData.order.status);
      if (nextStatus) {
        handleUpdateOrderStatus(orderData.order, nextStatus);
      }
    }}
    disabled={isSubmitting}
    className={`
      ${orderData.order.status === 'confirmed' ? 'bg-purple-500 hover:bg-purple-600' : 
       orderData.order.status === 'preparing' ? 'bg-orange-500 hover:bg-orange-600' : 
       orderData.order.status === 'ready' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} 
      text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5
    `}
  >
    {orderData.order.status === 'confirmed' && <Coffee className="h-4 w-4" />}
    {orderData.order.status === 'preparing' && <Check className="h-4 w-4" />}
    {orderData.order.status === 'ready' && <CheckCircle className="h-4 w-4" />}
    
    {orderData.order.status === 'confirmed' && 'Start Preparing'}
    {orderData.order.status === 'preparing' && 'Mark Ready'}
    {orderData.order.status === 'ready' && 'Complete Order'}
  </Button>
)}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(orderData)}
                            className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 flex items-center justify-center gap-1.5"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Details</span>
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
                  {['pending', 'confirmed', 'preparing', 'ready'].includes(selectedOrder.order.status) && (
                    <div className="mt-3 border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Update Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'confirmed')}
                              disabled={isSubmitting}
                              className="bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Accept Order</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this order?")) {
                                  handleUpdateOrderStatus(selectedOrder.order, 'cancelled');
                                }
                              }}
                              disabled={isSubmitting}
                              className="bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject Order</span>
                            </Button>
                          </>
                        )}
                        {selectedOrder.order.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'preparing')}
                            disabled={isSubmitting}
                            className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                          >
                            <Coffee className="h-4 w-4" />
                            <span>Start Preparing</span>
                          </Button>
                        )}
                        {selectedOrder.order.status === 'preparing' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'ready')}
                            disabled={isSubmitting}
                            className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            <span>Mark Ready</span>
                          </Button>
                        )}
                        {selectedOrder.order.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'completed')}
                            disabled={isSubmitting}
                            className="bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Complete Order</span>
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
                  <span>Service Fees:</span>
                  <span>{formatPrice(selectedOrder.order.tax)}</span>
                </div>

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
              
              <div className="flex justify-end gap-2 mt-6 flex-wrap">
                {selectedOrder.order.status !== 'completed' && selectedOrder.order.status !== 'cancelled' && (
                  <>
                    {/* Status flow buttons */}
                    {selectedOrder.order.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'confirmed')}
                          disabled={isSubmitting}
                          className="bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Accept Order</span>
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel this order?")) {
                              handleUpdateOrderStatus(selectedOrder.order, 'cancelled');
                            }
                          }}
                          disabled={isSubmitting}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel Order
                        </Button>
                      </>
                    )}
                    
                    {selectedOrder.order.status === 'confirmed' && (
                      <Button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'preparing')}
                        disabled={isSubmitting}
                        className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Coffee className="h-4 w-4" />
                        <span>Start Preparing</span>
                      </Button>
                    )}
                    
                    {selectedOrder.order.status === 'preparing' && (
                      <Button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'ready')}
                        disabled={isSubmitting}
                        className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        <span>Mark Ready</span>
                      </Button>
                    )}
                    
                    {selectedOrder.order.status === 'ready' && (
                      <Button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.order, 'completed')}
                        disabled={isSubmitting}
                        className="bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete Order</span>
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