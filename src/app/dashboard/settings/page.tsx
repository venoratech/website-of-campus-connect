// app/dashboard/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, Lock, Bell, User, Mail } from 'lucide-react';

export default function SettingsPage() {
  const { profile, user, isLoading } = useAuth();
  
  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketplaceUpdates, setMarketplaceUpdates] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (profile?.id) {
          // In a real app, you'd fetch user settings from a settings table
          // For now, we'll use default values
          // The code below is a placeholder for how you might implement this
          
          /* const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', profile.id)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setEmailNotifications(data.email_notifications);
            setOrderUpdates(data.order_updates);
            setMarketplaceUpdates(data.marketplace_updates);
            setMessageNotifications(data.message_notifications);
          } */
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    
    loadSettings();
  }, [profile]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsSubmitting(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // In a real app with Supabase Auth, you'd use their auth API for this
      // This is a placeholder implementation
      
      /* const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error; */
      
      // Since we can't really change the password in this demo, show success
      setSuccess('Password updated successfully');
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error updating password');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, you'd save to a settings table in your Supabase DB
      // This is a placeholder implementation
      
      /* const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: profile?.id,
          email_notifications: emailNotifications,
          order_updates: orderUpdates,
          marketplace_updates: marketplaceUpdates,
          message_notifications: messageNotifications,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error; */
      
      // Since we're not actually saving in this demo, show success
      setSuccess('Notification settings updated');
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Settings</h1>
        <p className="text-black">
          Manage your account settings and preferences
        </p>
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

      <Tabs defaultValue="account" className="space-y-4">
      <TabsList className="bg-gray-100">
  <TabsTrigger 
    value="account" 
    className="text-black data-[state=active]:text-black data-[state=active]:bg-white"
  >
    Account
  </TabsTrigger>
  <TabsTrigger 
    value="password" 
    className="text-black data-[state=active]:text-black data-[state=active]:bg-white"
  >
    Password
  </TabsTrigger>
  <TabsTrigger 
    value="notifications" 
    className="text-black data-[state=active]:text-black data-[state=active]:bg-white"
  >
    Notifications
  </TabsTrigger>
</TabsList>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Account Information</CardTitle>
              <CardDescription className="text-black">
                View and manage your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-black mr-2" />
                  <Label className="text-black">Account Type</Label>
                </div>
                <div className="px-6 py-2 bg-gray-50 rounded-md border border-gray-300">
                  <span className="capitalize text-black">{profile?.role}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-black mr-2" />
                  <Label className="text-black">Email Address</Label>
                </div>
                <div className="px-6 py-2 bg-gray-50 rounded-md border border-gray-300">
                  <span className="text-black">{user?.email}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-black">Created On</Label>
                  <div className="px-6 py-2 bg-gray-50 rounded-md border border-gray-300">
                    <span className="text-black">{formatDate(profile?.created_at || '')}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-black">Last Updated</Label>
                  <div className="px-6 py-2 bg-gray-50 rounded-md border border-gray-300">
                    <span className="text-black">{formatDate(profile?.updated_at || '')}</span>
                  </div>
                </div>
              </div>
              
              {profile?.role === 'vendor' && (
                <div className="space-y-1">
                  <div className="flex items-center">
                    <ShieldCheck className="h-4 w-4 text-black mr-2" />
                    <Label className="text-black">Vendor Status</Label>
                  </div>
                  <div className="px-6 py-2 bg-gray-50 rounded-md border border-gray-300">
                    {profile.is_approved ? (
                      <span className="text-green-600 font-medium">Approved</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Pending Approval</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Password Tab */}
        <TabsContent value="password">
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Change Password</CardTitle>
              <CardDescription className="text-black">
                Update your password
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 text-black mr-2" />
                    <Label htmlFor="currentPassword" className="text-black">Current Password</Label>
                  </div>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-black">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-black">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gray-800 hover:bg-black text-white"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Notification Preferences</CardTitle>
              <CardDescription className="text-black">
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 text-black" />
                    <Label htmlFor="emailNotifications" className="text-black">Email Notifications</Label>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="border-t border-gray-300 pt-4 space-y-4">
                  <div className="flex items-center justify-between pl-6">
                    <Label htmlFor="orderUpdates" className="text-black">Order Status Updates</Label>
                    <Switch
                      id="orderUpdates"
                      checked={orderUpdates}
                      onCheckedChange={setOrderUpdates}
                      disabled={!emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pl-6">
                    <Label htmlFor="marketplaceUpdates" className="text-black">Marketplace Activity</Label>
                    <Switch
                      id="marketplaceUpdates"
                      checked={marketplaceUpdates}
                      onCheckedChange={setMarketplaceUpdates}
                      disabled={!emailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pl-6">
                    <Label htmlFor="messageNotifications" className="text-black">New Messages</Label>
                    <Switch
                      id="messageNotifications"
                      checked={messageNotifications}
                      onCheckedChange={setMessageNotifications}
                      disabled={!emailNotifications}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveNotificationSettings} 
                disabled={isSubmitting}
                className="bg-gray-800 hover:bg-black text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}