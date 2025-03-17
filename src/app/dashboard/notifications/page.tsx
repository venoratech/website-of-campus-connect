// app/dashboard/notifications/page.tsx
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
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils';
import { Bell, Check, ExternalLink } from 'lucide-react';

interface NotificationData {
  order_id?: string;
  conversation_id?: string;
  transaction_id?: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { profile, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile?.id)
          .order('created_at', { ascending: false });
        
        if (notificationsError) throw notificationsError;
        
        setNotifications(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching notifications';
        setError(errorMessage);
        console.error(err);
      }
    };

    if (profile) {
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      setIsMarkingRead(true);
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error marking notification as read';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingRead(true);
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false);
      
      if (updateError) throw updateError;
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setSuccess('All notifications marked as read');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error marking all notifications as read';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.startsWith('order_status_')) {
      return <Bell className="h-5 w-5 text-blue-500" />;
    } else if (type === 'new_order') {
      return <Bell className="h-5 w-5 text-green-500" />;
    } else if (type === 'new_message') {
      return <Bell className="h-5 w-5 text-purple-500" />;
    } else if (type.startsWith('transaction_')) {
      return <Bell className="h-5 w-5 text-orange-500" />;
    } else {
      return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationUrl = (notification: Notification) => {
    const { type, data } = notification;
    
    if (type.startsWith('order_status_') || type === 'new_order') {
      return `/dashboard/orders?id=${data?.order_id}`;
    } else if (type === 'new_message') {
      return `/dashboard/messages?conversation=${data?.conversation_id}`;
    } else if (type.startsWith('transaction_')) {
      return `/dashboard/marketplace?transaction=${data?.transaction_id}`;
    }
    
    return '#';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Notifications</h1>
          <p className="text-black">
            Stay updated with your latest activities
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={isMarkingRead}
            className="border-gray-300 text-black hover:bg-gray-100"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
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

      <Card className="border-gray-300">
        <CardHeader className="py-4">
          <CardTitle className="text-black">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-black">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>You don&apos;t have any notifications yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Type</TableHead>
                  <TableHead className="text-black">Message</TableHead>
                  <TableHead className="text-black">Date</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow 
                    key={notification.id}
                    className={!notification.is_read ? 'bg-blue-50' : 'border-gray-200'}
                  >
                    <TableCell className="text-black">
                      <div className="flex items-center">
                        {getNotificationIcon(notification.type)}
                        <span className="ml-2 capitalize text-black">
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <Badge className="ml-2 bg-blue-500">New</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-black">{notification.message}</TableCell>
                    <TableCell className="text-black">
                      <div>
                        <div>{formatDate(notification.created_at)}</div>
                        <div className="text-xs text-black">
                          {formatTime(notification.created_at)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-gray-300 text-black hover:bg-gray-100"
                        >
                          <a href={getNotificationUrl(notification)}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification)}
                            disabled={isMarkingRead}
                            className="border-gray-300 text-black hover:bg-gray-100"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}