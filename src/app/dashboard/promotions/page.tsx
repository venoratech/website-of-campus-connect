// app/dashboard/promotions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate } from '@/lib/utils';
import { PlusCircle, Edit, Trash } from 'lucide-react';

interface Promotion {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  code: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  usage_limit: number | null;
  current_usage: number;
  created_at: string;
  updated_at: string;
}

interface Vendor {
  id: string;
  profile_id: string;
  vendor_name: string;
  [key: string]: string | number | boolean | null | undefined; // Specify possible value types
}

export default function PromotionsPage() {
  const { profile, isLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isAddingPromotion, setIsAddingPromotion] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [code, setCode] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [usageLimit, setUsageLimit] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== 'vendor') {
        setError('Only vendors can access this page');
        return;
      }

      // Fetch vendor details
      const { data: vendorData, error: vendorError } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('profile_id', profile.id)
        .single();
      
      if (vendorError) {
        if (vendorError.code === 'PGRST116') {
          setError('Please set up your vendor profile first');
        } else {
          setError('Error fetching vendor profile');
        }
        return;
      }

      setVendor(vendorData);

      // Fetch promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('start_date', { ascending: false });
      
      if (promotionsError) {
        setError('Error fetching promotions');
        console.error(promotionsError);
      } else {
        setPromotions(promotionsData || []);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setCode('');
    setMinOrderAmount('');
    setMaxDiscountAmount('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setUsageLimit('');
    setEditingPromotionId(null);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotionId(promotion.id);
    
    setName(promotion.name);
    setDescription(promotion.description || '');
    setDiscountType(promotion.discount_type);
    setDiscountValue(promotion.discount_value.toString());
    setCode(promotion.code || '');
    setMinOrderAmount(promotion.min_order_amount?.toString() || '');
    setMaxDiscountAmount(promotion.max_discount_amount?.toString() || '');
    
    // Format dates for input
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setStartDate(formatDateForInput(promotion.start_date));
    setEndDate(formatDateForInput(promotion.end_date));
    
    setIsActive(promotion.is_active);
    setUsageLimit(promotion.usage_limit?.toString() || '');
    
    setIsAddingPromotion(true);
  };

  const handleSavePromotion = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!name || !discountValue || !startDate) {
      setError('Please fill all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!vendor) {
        throw new Error('Vendor information is missing');
      }

      const promotionData = {
        vendor_id: vendor.id,
        name,
        description: description || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        code: code || null,
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        max_discount_amount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: isActive,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
      };

      if (editingPromotionId) {
        // Update existing promotion
        const { error: updateError } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotionId);
        
        if (updateError) throw updateError;
        
        setSuccess('Promotion updated successfully');
        
        // Update local state
        setPromotions(promotions.map(promo => 
          promo.id === editingPromotionId ? { 
            ...promo, 
            ...promotionData, 
            updated_at: new Date().toISOString() 
          } as Promotion : promo
        ));
      } else {
        // Create new promotion
        const { data, error: insertError } = await supabase
          .from('promotions')
          .insert({
            ...promotionData,
            current_usage: 0
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        setSuccess('Promotion created successfully');
        
        // Update local state
        if (data) {
          setPromotions([data, ...promotions]);
        }
      }

      // Reset form
      resetForm();
      setIsAddingPromotion(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving promotion');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setSuccess('Promotion deleted successfully');
      
      // Update local state
      setPromotions(promotions.filter(promo => promo.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error deleting promotion');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = promotion.end_date ? new Date(promotion.end_date) : null;
    
    if (!promotion.is_active) {
      return <Badge className="bg-gray-500">Inactive</Badge>;
    }
    
    if (now < startDate) {
      return <Badge className="bg-yellow-500">Scheduled</Badge>;
    }
    
    if (endDate && now > endDate) {
      return <Badge className="bg-red-500">Expired</Badge>;
    }
    
    if (promotion.usage_limit && promotion.current_usage >= promotion.usage_limit) {
      return <Badge className="bg-purple-500">Limit Reached</Badge>;
    }
    
    return <Badge className="bg-green-500">Active</Badge>;
  };

  const formatDiscountValue = (promotion: Promotion) => {
    if (promotion.discount_type === 'percentage') {
      return `${promotion.discount_value}%`;
    } else {
      return formatPrice(promotion.discount_value);
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-black">Promotions</h1>
        <Card className="border-gray-300">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-black">Vendor Profile Required</h2>
              <p className="text-black">You need to set up your vendor profile before managing promotions.</p>
              <Button asChild className="bg-gray-800 hover:bg-black text-white">
                <a href="/dashboard/vendor-profile">Set Up Vendor Profile</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Promotions</h1>
          <p className="text-black">
            Create and manage special offers for your customers
          </p>
        </div>
        <Dialog open={isAddingPromotion} onOpenChange={setIsAddingPromotion}>
          <DialogTrigger asChild>
            <Button className="bg-gray-800 hover:bg-black text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md md:max-w-xl bg-white text-black border-gray-300">
            <DialogHeader>
              <DialogTitle className="text-black">{editingPromotionId ? 'Edit' : 'Create'} Promotion</DialogTitle>
              <DialogDescription className="text-black">
                Set up a special offer for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-black font-medium">Promotion Name*</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Summer Sale"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-black font-medium">Promo Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SUMMER25"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Special discount for the summer season"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType" className="text-black font-medium">Discount Type*</Label>
                  <Select
                    value={discountType}
                    onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed_amount')}
                  >
                    <SelectTrigger id="discountType" className="bg-white text-black border-gray-300">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="percentage" className="text-black">Percentage</SelectItem>
                      <SelectItem value="fixed_amount" className="text-black">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discountValue" className="text-black font-medium">
                    Discount Value* ({discountType === 'percentage' ? '%' : '$'})
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '25' : '10.00'}
                    min="0"
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minOrderAmount" className="text-black font-medium">Minimum Order Amount</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="20.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxDiscountAmount" className="text-black font-medium">Maximum Discount Amount</Label>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="50.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-black font-medium">Start Date*</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-black font-medium">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usageLimit" className="text-black font-medium">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="100"
                    min="0"
                  />
                </div>
                
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="text-black border-gray-300"
                    />
                    <Label htmlFor="isActive" className="text-black">Active</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsAddingPromotion(false);
                }}
                className="border-gray-300 text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSavePromotion} 
                disabled={isSubmitting}
                className="bg-gray-800 hover:bg-black text-white"
              >
                {isSubmitting ? 'Saving...' : (editingPromotionId ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {promotions.length === 0 ? (
        <Card className="border-gray-300">
          <CardContent className="p-6 text-center">
            <p className="text-black">No promotions yet. Create your first promotion!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-300">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Name</TableHead>
                  <TableHead className="text-black">Discount</TableHead>
                  <TableHead className="text-black">Code</TableHead>
                  <TableHead className="text-black">Period</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-black">Usage</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => (
                  <TableRow key={promotion.id} className="border-gray-200">
                    <TableCell className="font-medium text-black">{promotion.name}</TableCell>
                    <TableCell className="text-black">{formatDiscountValue(promotion)}</TableCell>
                    <TableCell className="text-black">{promotion.code || '-'}</TableCell>
                    <TableCell className="text-black">
                      <div>
                        <p>From: {formatDate(promotion.start_date)}</p>
                        {promotion.end_date && (
                          <p>To: {formatDate(promotion.end_date)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(promotion)}</TableCell>
                    <TableCell className="text-black">
                      {promotion.current_usage}
                      {promotion.usage_limit ? ` / ${promotion.usage_limit}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPromotion(promotion)}
                        className="text-black hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePromotion(promotion.id)}
                        className="text-black hover:bg-gray-100"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}