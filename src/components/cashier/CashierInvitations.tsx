// Add this component to the orders page
// Import this in app/dashboard/orders/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Invitation {
  id: string;
  vendor_id: string;
  vendor_name: string;
  invited_by: string;
  inviter_name: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface CashierInvitationsProps {
  userId: string;
  onInvitationResponded?: () => void;
}

// Define types for Supabase foreign key relationships
interface VendorData {
  vendor_name: string;
}

interface InviterProfile {
  first_name: string;
  last_name: string;
}

export function CashierInvitations({ userId, onInvitationResponded }: CashierInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cashier_invitations')
        .select(`
          id,
          vendor_id,
          invited_by,
          status,
          created_at,
          food_vendors:vendor_id (vendor_name),
          profiles:invited_by (first_name, last_name)
        `)
        .eq('cashier_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      const formattedInvitations = data.map((invitation) => {
        const vendor = invitation.food_vendors as unknown as VendorData;
        const inviter = invitation.profiles as unknown as InviterProfile;
        return {
          id: invitation.id,
          vendor_id: invitation.vendor_id,
          vendor_name: vendor.vendor_name,
          invited_by: invitation.invited_by,
          inviter_name: `${inviter.first_name} ${inviter.last_name}`,
          status: invitation.status,
          created_at: invitation.created_at
        };
      });

      setInvitations(formattedInvitations);
    } catch (err: unknown) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Error fetching invitations');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchInvitations();
    }
  }, [userId, fetchInvitations]);

  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    setIsResponding(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error } = await supabase.rpc('respond_to_invitation', {
        p_invitation_id: invitationId,
        p_accept: accept
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to respond to invitation');
      }
      
      setSuccess(data.message || (accept ? 'Invitation accepted!' : 'Invitation declined'));
      
      // Remove the invitation from the list
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
      
      // Notify parent component
      if (onInvitationResponded) {
        onInvitationResponded();
      }
      
      // If accepted, reload the page after a short delay to refresh the orders
      if (accept) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: unknown) {
      console.error('Error responding to invitation:', err);
      setError(err instanceof Error ? err.message : 'Error responding to invitation');
    } finally {
      setIsResponding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if there are no invitations
  }

  return (
    <Card className="mb-6 border-yellow-300 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Pending Cashier Invitations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 p-3 rounded-md mb-4 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 p-3 rounded-md mb-4 border border-green-200">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}
        
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-black">
                    Invitation from {invitation.vendor_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Invited by {invitation.inviter_name} {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                  Pending
                </Badge>
              </div>
              
              <div className="mt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInvitationResponse(invitation.id, false)}
                  disabled={isResponding}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleInvitationResponse(invitation.id, true)}
                  disabled={isResponding}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}