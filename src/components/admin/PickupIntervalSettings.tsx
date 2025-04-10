// components/admin/PickupIntervalSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Clock, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PickupIntervalSettings() {
  const { profile } = useAuth();
  const [interval, setInterval] = useState<number | string>(15);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPickupInterval = async () => {
      if (!profile || profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== "vendor_manager") {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('system_configurations')
          .select('value')
          .eq('key', 'pickup_interval')
          .single();
        
        if (error) {
          // If not found, we'll use the default value
          if (error.code === 'PGRST116') {
            setInterval(15);
            return;
          }
          
          console.error('Error fetching pickup interval:', error);
          toast({
            title: 'Error',
            description: 'Failed to load pickup interval settings',
            variant: 'destructive',
          });
          return;
        }
        
        setInterval(data.value.minutes || 15);
      } catch (error) {
        console.error('Error in fetch operation:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPickupInterval();
  }, [profile]);

  const handleSave = async () => {
    if (!profile || profile.role !== 'admin' && profile.role !== "super_admin"&& profile.role !== "vendor_manager") {
      toast({
        title: 'Permission Denied',
        description: 'You must be an admin to change these settings',
        variant: 'destructive',
      });
      return;
    }
    
    // Convert interval to number if it's a string or empty
    const intervalValue = typeof interval === 'string' 
      ? (interval === '' ? 15 : parseInt(interval) || 15) 
      : interval;
    
    if (intervalValue < 5 || intervalValue > 60) {
      toast({
        title: 'Validation Error',
        description: 'Pickup interval must be between 5 and 60 minutes',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // First check if the record exists
      const { data: existingConfig } = await supabase
        .from('system_configurations')
        .select('id')
        .eq('key', 'pickup_interval')
        .maybeSingle();
      
      let updateError;
      
      if (!existingConfig) {
        // Insert new configuration if it doesn't exist
        const { error: insertError } = await supabase
          .from('system_configurations')
          .insert({
            key: 'pickup_interval',
            value: { minutes: intervalValue },
            updated_at: new Date().toISOString()
          });
        
        updateError = insertError;
      } else {
        // Update existing configuration
        const { error: updateConfigError } = await supabase
          .from('system_configurations')
          .update({
            value: { minutes: intervalValue },
            updated_at: new Date().toISOString()
          })
          .eq('key', 'pickup_interval');
        
        updateError = updateConfigError;
      }
      
      if (updateError) {
        throw updateError;
      }
      
      // Update the displayed value to the saved value
      setInterval(intervalValue);
      
      toast({
        title: 'Success',
        description: 'Pickup interval updated successfully',
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating pickup interval:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pickup interval',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show a different UI for non-admin users
  if (!profile || profile.role !== 'admin'&& profile.role !== "super_admin"&& profile.role !== "vendor_manager") {
    return null; // Don't show anything to non-admins
  }

  return (
    <Card className="border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-black">Pickup Time Interval</CardTitle>
        <Clock className="h-4 w-4 text-black" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set the interval in minutes between pickup time slots (e.g., 15 min = 9:00, 9:15, 9:30...)
            </p>
            
            {isEditing ? (
              <div className="space-y-2">
                <Label htmlFor="interval" className="text-black">Interval (minutes)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="interval"
                    type="number"
                    value={interval}
                    onChange={(e) => {
                      // Allow empty input during editing
                      if (e.target.value === '') {
                        setInterval('');
                      } else {
                        setInterval(parseInt(e.target.value) || 15);
                      }
                    }}
                    min={5}
                    max={60}
                    className="w-20 text-black border-gray-300"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                  <div className="flex justify-end space-x-4 ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset to the current value and exit edit mode
                        setInterval(typeof interval === 'string' ? 15 : interval);
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                      className="text-black border-black hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-black">
                    {typeof interval === 'string' ? 
                      (interval === '' ? '15' : interval) : 
                      interval}
                  </span>
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="text-black border-black hover:bg-gray-100"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              <p>This setting controls the time intervals shown in the cart checkout for food orders.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}