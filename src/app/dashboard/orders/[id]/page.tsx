'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPrice } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
  menu_item_id: string;
  menu_item: {
    id: string;
    name: string;
    image_url: string;
  };
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  tip: number;
  created_at: string;
  updated_at: string;
  vendor: {
    vendor_name: string;
  };
  items: OrderItem[];
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc(
          'get_order_details_for_support',
          { order_id: id }
        );

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Order not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 text-black">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Order Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 relative">
                      {item.menu_item?.image_url ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/public/${item.menu_item.image_url}`}
                          alt={item.menu_item.name || 'Menu item'}
                          className="rounded-lg object-cover"
                          fill
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-black">{item.menu_item?.name || 'Unknown Item'}</h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity || 0}
                      </p>
                      {item.special_instructions && (
                        <p className="text-sm text-gray-600">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-black">{formatPrice(item.subtotal || 0)}</p>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.unit_price || 0)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number</span>
                <span className="font-medium text-black">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge
                  variant={
                    order.status === 'completed'
                      ? 'secondary'
                      : order.status === 'cancelled'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vendor</span>
                <span className="font-medium text-black">{order.vendor.vendor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-black">
                  {formatDate(order.created_at)}
                </span>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-black">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-black">{formatPrice(order.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-black">Total</span>
                  <span className="text-black">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 