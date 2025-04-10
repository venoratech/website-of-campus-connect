// app/dashboard/reviews/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Star, User } from 'lucide-react';
import Image from 'next/image';

// Define interfaces for our data types
interface Rating {
  id: string;
  order_id: string;
  customer_id: string;
  vendor_id: string;
  food_rating: number;
  service_rating: number;
  comment: string | null;
  vendor_reply: string | null;
  replied_at: string | null;
  created_at: string;
  customer?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  };
  order?: {
    order_number: string;
  };
}

export default function VendorReviewsPage() {
  const { profile, isLoading } = useAuth();
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [selectedReview, setSelectedReview] = useState<Rating | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        let query;
        
        if (profile?.role === 'vendor') {
          if (!profile?.id) {
            setError('Profile ID not found');
            return;
          }
          
          // Get vendor's ID from food_vendors table
          const { data: vendorData, error: vendorError } = await supabase
            .from('food_vendors')
            .select('id')
            .eq('profile_id', profile.id)
            .single();
            
          if (vendorError) throw vendorError;
          
          if (!vendorData) {
            setError('Vendor profile not found');
            return;
          }
          
          // Get reviews for this vendor
          query = supabase
            .from('food_order_ratings')
            .select(`
              *,
              customer:customer_id(id, email, first_name, last_name, profile_image_url),
              order:order_id(order_number)
            `)
            .eq('vendor_id', vendorData.id)
            .order('created_at', { ascending: false });
        } else if (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'vendor_manager') {
          // Admins can see all reviews
          query = supabase
            .from('food_order_ratings')
            .select(`
              *,
              customer:customer_id(id, email, first_name, last_name, profile_image_url),
              order:order_id(order_number)
            `)
            .order('created_at', { ascending: false });
        } else {
          setError('You do not have permission to view this page');
          return;
        }
        
        const { data, error: reviewsError } = await query;
        
        if (reviewsError) throw reviewsError;
        
        setReviews(data || []);
        
        // Calculate average rating
        if (data && data.length > 0) {
          const totalRating = data.reduce((sum, review) => sum + (review.food_rating + review.service_rating) / 2, 0);
          setAverageRating(totalRating / data.length);
        }
      } catch (err: unknown) {
        console.error('Error fetching reviews:', err);
        setError(err instanceof Error ? err.message : 'Error fetching reviews');
      }
    };
    
    if (profile) {
      fetchReviews();
    }
  }, [profile]);

  const handleReplyClick = (review: Rating) => {
    setSelectedReview(review);
    setReplyText(review.vendor_reply || '');
    setReplyDialogOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !profile) return;  // Add null check for profile
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
  
    try {
      console.log('Starting reply submission for review:', selectedReview.id);
      console.log('Reply text:', replyText);
  
      // Rest of the function remains the same
      const { data: vendorData, error: vendorError } = await supabase
        .from('food_vendors')
        .select('id')
        .eq('profile_id', profile.id)  // Now TypeScript knows profile is not null
        .single();
      
      if (vendorError) {
        console.error('Error fetching vendor data:', vendorError);
        throw new Error('Could not verify vendor permissions: ' + vendorError.message);
      }
      
      if (!vendorData) {
        throw new Error('No vendor profile found for current user');
      }
      
      console.log('Vendor verified:', vendorData.id);
      
      // Check if this vendor owns this review
      const { data: reviewCheck, error: reviewCheckError } = await supabase
        .from('food_order_ratings')
        .select('id')
        .eq('id', selectedReview.id)
        .eq('vendor_id', vendorData.id)
        .single();
      
      if (reviewCheckError) {
        console.error('Error verifying review ownership:', reviewCheckError);
        throw new Error('Could not verify review ownership: ' + reviewCheckError.message);
      }
      
      if (!reviewCheck) {
        throw new Error('You do not have permission to reply to this review');
      }
      
      console.log('Review ownership verified');
      
      // Now try the update with explicit debugging
      const updateData = { 
        vendor_reply: replyText,
        replied_at: new Date().toISOString()
      };
      
      console.log('Sending update with data:', updateData);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('food_order_ratings')
        .update(updateData)
        .eq('id', selectedReview.id)
        .select();
      
      console.log('Update response:', { data: updateResult, error: updateError });
      
      if (updateError) {
        throw updateError;
      }
      
      setSuccess('Reply submitted successfully');
      
      // Update local state
      setReviews(reviews.map(review => 
        review.id === selectedReview.id 
          ? { 
              ...review, 
              vendor_reply: replyText,
              replied_at: new Date().toISOString()
            } 
          : review
      ));
      
      setReplyDialogOpen(false);
    } catch (err) {
      console.error('Full error object:', err);
      
      // More detailed error reporting
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        const errorString = JSON.stringify(err);
        setError(errorString !== '{}' ? errorString : 'Database error occurred. Please check console for details.');
      } else {
        setError('Unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReply = async (review: Rating) => {
    if (!confirm("Are you sure you want to delete this reply?")) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Deleting reply for review:', review.id);
      
      const { data, error } = await supabase.rpc(
        'reply_to_review',
        {
          review_id: review.id,
          reply_text: '', // Can be any value, will be ignored
          delete_reply: true
        }
      );
      
      console.log('Delete response:', { data, error });
      
      if (error) throw error;
      
      if (data) {
        setSuccess('Reply deleted successfully');
        
        // Update local state
        setReviews(reviews.map(r => 
          r.id === review.id 
            ? { 
                ...r, 
                vendor_reply: null,
                replied_at: null
              } 
            : r
        ));
      } else {
        setError('Failed to delete reply');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        const errorString = JSON.stringify(err);
        setError(errorString !== '{}' ? errorString : 'Database error deleting reply');
      } else {
        setError('Unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (profile?.role !== 'vendor' && profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.role !== 'vendor_manager') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Customer Reviews</h1>
        <p className="text-black">
          View and respond to customer feedback
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{reviews.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {averageRating.toFixed(1)} / 5
            </div>
            <div className="flex mt-1">
              {renderStars(Math.round(averageRating))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Reviews Replied</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {reviews.filter(r => r.vendor_reply).length} / {reviews.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-black">Review List</h2>
        
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border border-gray-300 text-center">
            <p className="text-black">No reviews found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="border-gray-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        {review.customer?.profile_image_url ? (
                          <Image 
                            src={review.customer.profile_image_url} 
                            alt="Customer" 
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-black">
                          {review.customer?.first_name && review.customer?.last_name 
                            ? `${review.customer.first_name} ${review.customer.last_name}`
                            : review.customer?.email || 'Customer'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Order #{review.order?.order_number} • {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">Food</p>
                        <div className="flex">
                          {renderStars(review.food_rating)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Service</p>
                        <div className="flex">
                          {renderStars(review.service_rating)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {review.comment && (
                    <div className="mb-4 bg-gray-50 p-4 rounded-md">
                      <p className="text-black">{review.comment}</p>
                    </div>
                  )}
                  
                  {review.vendor_reply && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-1">Your Reply:</p>
                      <div className="bg-blue-50 p-4 rounded-md">
                        <p className="text-black">{review.vendor_reply}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Replied on {formatDate(review.replied_at || '')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleReplyClick(review)}
                      variant="outline"
                      className="border-gray-300 text-black hover:bg-gray-100"
                    >
                      {review.vendor_reply ? 'Edit Reply' : 'Reply'}
                    </Button>
                    {review.vendor_reply && (
                      <Button
                        onClick={() => handleDeleteReply(review)}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50 ml-2"
                      >
                        Delete Reply
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">
              Reply to Review
            </DialogTitle>
            <DialogDescription className="text-black">
              Respond to the customer&apos;s feedback. Be polite and professional.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex mb-2">
                  <div className="mr-4">
                    <p className="text-sm text-gray-500">Food</p>
                    <div className="flex">
                      {renderStars(selectedReview.food_rating)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <div className="flex">
                      {renderStars(selectedReview.service_rating)}
                    </div>
                  </div>
                </div>
                {selectedReview.comment && (
                  <p className="text-black">{selectedReview.comment}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Your Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response here..."
                  className="min-h-[120px] bg-white text-black border-gray-300"
                />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setReplyDialogOpen(false)}
                  className="border-gray-300 text-black hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReply} 
                  disabled={isSubmitting || !replyText.trim()}
                  className="bg-gray-800 hover:bg-black text-white"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Reply'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}