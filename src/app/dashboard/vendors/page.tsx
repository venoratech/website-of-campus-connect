// app/dashboard/vendors/page.tsx
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
import { Eye, CheckCircle, XCircle, User, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define interfaces for our data types
interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_approved: boolean;
  role: string;
  business_name?: string | null;
  business_description?: string | null;
  created_at: string;
  [key: string]: unknown; // Changed from any to unknown
}

interface College {
  id: string;
  name: string;
}

interface FoodVendor {
  id: string;
  profile_id: string;
  vendor_name: string;
  description: string | null;
  location: string;
  college_id: string;
  is_active: boolean;
  created_at: string;
  college?: College;
  profile?: Profile;
  [key: string]: unknown; // Changed from any to unknown
}

export default function VendorsPage() {
  const { profile, isLoading } = useAuth();
  const [vendors, setVendors] = useState<FoodVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<FoodVendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewVendorOpen, setViewVendorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Edit form state
  const [editVendorName, setEditVendorName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIsApproved, setEditIsApproved] = useState(false);
  const [editIsActive, setEditIsActive] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      if (profile?.role !== 'admin') {
        // Redirect or show error if not an admin
        setError('Only administrators can access this page');
        return;
      }

      try {
        // First get all users with vendor role from profiles table
        const { data: vendorProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vendor')
          .order('created_at', { ascending: false });
          
        if (profilesError) throw profilesError;
        
        // Get all vendor details from food_vendors table
        const { data: foodVendors, error: vendorsError } = await supabase
          .from('food_vendors')
          .select(`
            *,
            college:college_id (name)
          `);
          
        if (vendorsError) throw vendorsError;

        // Also get all vendor profiles that don't have food_vendors records yet
        // Get profiles that are not in the food_vendors table
        const vendorProfilesOnly = vendorProfiles.filter(
          profile => !foodVendors.some(vendor => vendor.profile_id === profile.id)
        );
        
        // Combine both data sets
        const combinedVendors = [
          // Food vendors with full details
          ...foodVendors.map(vendor => {
            const profile = vendorProfiles.find(p => p.id === vendor.profile_id);
            return {
              ...vendor,
              profile: profile || { email: 'Unknown', role: 'vendor' }
            };
          }),
          // Vendor profiles without food_vendor records
          ...vendorProfilesOnly.map(profile => ({
            id: null,
            profile_id: profile.id,
            vendor_name: profile.business_name || 'Incomplete Profile',
            description: profile.business_description || null,
            is_active: false,
            profile
          }))
        ] as FoodVendor[];
        
        setVendors(combinedVendors);
      } catch (err: unknown) {
        console.error('Error fetching vendors:', err);
        setError(err instanceof Error ? err.message : 'Error fetching vendors');
      }
    };
    
    if (profile) {
      fetchVendors();
    }
  }, [profile]);

  const handleViewVendor = (vendor: FoodVendor) => {
    setSelectedVendor(vendor);
    setViewVendorOpen(true);
    setIsEditing(false);
  };

  const handleEditVendor = () => {
    if (!selectedVendor) return;
    
    setEditVendorName(selectedVendor.vendor_name || '');
    setEditDescription(selectedVendor.description || '');
    setEditLocation(selectedVendor.location || '');
    setEditIsApproved(selectedVendor.profile?.is_approved || false);
    setEditIsActive(selectedVendor.is_active || false);
    setIsEditing(true);
  };

  const handleSaveVendor = async () => {
    if (!selectedVendor || profile?.role !== 'admin') return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Update profile is_approved field
      if (selectedVendor.profile) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ is_approved: editIsApproved })
          .eq('id', selectedVendor.profile.id);
          
        if (profileUpdateError) throw profileUpdateError;
      }
      
      // Update food_vendor record if it exists
      if (selectedVendor.id) {
        const { error: vendorUpdateError } = await supabase
          .from('food_vendors')
          .update({
            vendor_name: editVendorName,
            description: editDescription,
            location: editLocation,
            is_active: editIsActive
          })
          .eq('id', selectedVendor.id);
          
        if (vendorUpdateError) throw vendorUpdateError;
      }
      
      setSuccess('Vendor updated successfully');
      
      // Update local state
      setVendors(vendors.map(v => {
        if ((v.id && v.id === selectedVendor.id) || 
            (v.profile && selectedVendor.profile && v.profile.id === selectedVendor.profile.id)) {
          
          const updatedVendor = { ...v };
          
          // Update profile data
          if (updatedVendor.profile && selectedVendor.profile) {
            updatedVendor.profile.is_approved = editIsApproved;
          }
          
          // Update vendor data
          if (updatedVendor.id) {
            updatedVendor.vendor_name = editVendorName;
            updatedVendor.description = editDescription;
            updatedVendor.location = editLocation;
            updatedVendor.is_active = editIsActive;
          }
          
          return updatedVendor;
        }
        return v;
      }));
      
      // Update selected vendor
      setSelectedVendor({
        ...selectedVendor,
        vendor_name: editVendorName,
        description: editDescription,
        location: editLocation,
        is_active: editIsActive,
        profile: selectedVendor.profile ? {
          ...selectedVendor.profile,
          is_approved: editIsApproved
        } : undefined
      });
      
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating vendor');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveVendor = async (vendorProfile: Profile) => {
    if (!confirm('Are you sure you want to approve this vendor?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', vendorProfile.id);

      if (updateError) throw updateError;

      setSuccess(`Vendor ${vendorProfile.business_name || vendorProfile.email} approved successfully`);

      // Update local state
      setVendors(vendors.map(v => {
        if (v.profile_id === vendorProfile.id || (v.profile && v.profile.id === vendorProfile.id)) {
          if (v.profile) {
            return {
              ...v,
              profile: { ...v.profile, is_approved: true }
            };
          } else {
            return {
              ...v,
              is_approved: true
            };
          }
        }
        return v;
      }));
      
      // Update selected vendor if it's the one that was approved
      if (selectedVendor && 
          (selectedVendor.profile_id === vendorProfile.id || 
           (selectedVendor.profile && selectedVendor.profile.id === vendorProfile.id))) {
        setSelectedVendor({
          ...selectedVendor,
          profile: selectedVendor.profile ? {
            ...selectedVendor.profile,
            is_approved: true
          } : undefined
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error approving vendor');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectVendor = async (vendorProfile: Profile) => {
    if (!confirm('Are you sure you want to reject this vendor? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', vendorProfile.id);

      if (updateError) throw updateError;

      setSuccess(`Vendor ${vendorProfile.business_name || vendorProfile.email} rejected`);

      // Update local state
      setVendors(vendors.map(v => {
        if (v.profile_id === vendorProfile.id || (v.profile && v.profile.id === vendorProfile.id)) {
          if (v.profile) {
            return {
              ...v,
              profile: { ...v.profile, is_approved: false }
            };
          } else {
            return {
              ...v,
              is_approved: false
            };
          }
        }
        return v;
      }));
      
      // Update selected vendor if it's the one that was rejected
      if (selectedVendor && 
          (selectedVendor.profile_id === vendorProfile.id || 
           (selectedVendor.profile && selectedVendor.profile.id === vendorProfile.id))) {
        setSelectedVendor({
          ...selectedVendor,
          profile: selectedVendor.profile ? {
            ...selectedVendor.profile,
            is_approved: false
          } : undefined
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error rejecting vendor');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVendorStatus = async (vendor: FoodVendor) => {
    if (!vendor.id) {
      setError('Cannot toggle status for vendor without a complete profile');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newStatus = !vendor.is_active;
      const { error: updateError } = await supabase
        .from('food_vendors')
        .update({ is_active: newStatus })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      setSuccess(`Vendor ${vendor.vendor_name} ${newStatus ? 'activated' : 'deactivated'} successfully`);

      // Update local state
      setVendors(vendors.map(v => 
        v.id === vendor.id ? { ...v, is_active: newStatus } : v
      ));
      
      // Update selected vendor if it's the one that was toggled
      if (selectedVendor && selectedVendor.id === vendor.id) {
        setSelectedVendor({
          ...selectedVendor,
          is_active: newStatus
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling vendor status');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const profileEmail = vendor.profile ? vendor.profile.email : '';
    const vendorName = vendor.vendor_name || '';
    const businessName = vendor.profile && vendor.profile.business_name ? vendor.profile.business_name : '';
    
    const searchLower = searchQuery.toLowerCase();
    const searchMatches = (
      profileEmail.toLowerCase().includes(searchLower) ||
      vendorName.toLowerCase().includes(searchLower) ||
      businessName.toLowerCase().includes(searchLower)
    );
    
    // Apply status filter
    let statusMatches = true;
    if (statusFilter === 'active') {
      statusMatches = !!vendor.is_active;
    } else if (statusFilter === 'inactive') {
      statusMatches = !!vendor.id && vendor.is_active === false;
    } else if (statusFilter === 'pending') {
      statusMatches = !!vendor.profile && vendor.profile.is_approved === false;
    } else if (statusFilter === 'incomplete') {
      statusMatches = !vendor.id && vendor.profile !== undefined;
    }
    
    return searchMatches && statusMatches;
  });

  const pendingApprovalCount = vendors.filter(v => 
    v.profile && v.profile.is_approved === false
  ).length;

  const getVendorStatus = (vendor: FoodVendor) => {
    if (!vendor.profile) return 'Unknown';
    
    if (vendor.profile.is_approved === false) {
      return <Badge className="border-yellow-400 bg-yellow-50 text-yellow-700 border">Pending Approval</Badge>;
    }
    
    if (!vendor.id) {
      return <Badge className="border-purple-400 bg-purple-50 text-purple-700 border">Incomplete Profile</Badge>;
    }
    
    if (vendor.is_active) {
      return <Badge className="border-green-400 bg-green-50 text-green-700 border">Active</Badge>;
    } else {
      return <Badge className="border-red-400 bg-red-50 text-red-700 border">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Vendor Management</h1>
        <p className="text-black">
          Manage vendors and approve new applications
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Total Vendors</CardTitle>
            <User className="h-4 w-4 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{vendors.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Pending Approval</CardTitle>
            <User className="h-4 w-4 text-yellow-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{pendingApprovalCount}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Active Vendors</CardTitle>
            <User className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{vendors.filter(v => v.is_active).length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-black">Inactive Vendors</CardTitle>
            <User className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{vendors.filter(v => v.id && !v.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-black">Vendors</h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white text-black border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all" className="text-black">All Statuses</SelectItem>
                <SelectItem value="active" className="text-black">Active</SelectItem>
                <SelectItem value="inactive" className="text-black">Inactive</SelectItem>
                <SelectItem value="pending" className="text-black">Pending Approval</SelectItem>
                <SelectItem value="incomplete" className="text-black">Incomplete Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/3">
            <Input
              placeholder="Search vendors..."
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
                  <TableHead className="text-black">Business Name</TableHead>
                  <TableHead className="text-black">Email</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-black">Registered</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-black">
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id || vendor.profile_id} className="border-gray-200">
                      <TableCell className="font-medium text-black">
                        {vendor.vendor_name || vendor.profile?.business_name || 'Unnamed Vendor'}
                      </TableCell>
                      <TableCell className="text-black">{vendor.profile?.email || 'Unknown'}</TableCell>
                      <TableCell>
                        {getVendorStatus(vendor)}
                      </TableCell>
                      <TableCell className="text-black">
                        {formatDate(vendor.created_at || vendor.profile?.created_at || '')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewVendor(vendor)}
                          className="text-black hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {vendor.profile && vendor.profile.is_approved === false && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApproveVendor(vendor.profile!)}
                              disabled={isSubmitting}
                              className="text-black hover:bg-gray-100"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRejectVendor(vendor.profile!)}
                              disabled={isSubmitting}
                              className="text-black hover:bg-gray-100"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {vendor.id && vendor.profile && vendor.profile.is_approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVendorStatus(vendor)}
                            disabled={isSubmitting}
                            className="text-black hover:bg-gray-100"
                          >
                            {vendor.is_active ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
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

      {/* Vendor Details Dialog */}
      <Dialog open={viewVendorOpen} onOpenChange={setViewVendorOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">{isEditing ? 'Edit Vendor' : 'Vendor Details'}</DialogTitle>
            <DialogDescription className="text-black">
              {isEditing ? 'Update vendor information' : 'View detailed information about this vendor'}
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Business Name</label>
                    <Input
                      value={editVendorName}
                      onChange={(e) => setEditVendorName(e.target.value)}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Email</label>
                    <Input 
                      value={selectedVendor.profile?.email || ''} 
                      disabled 
                      className="bg-gray-50 text-black border-gray-300" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Description</label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black">Location</label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Approval Status</label>
                      <div className="flex items-center h-10 space-x-2">
                        <input
                          type="checkbox"
                          id="isApproved"
                          checked={editIsApproved}
                          onChange={(e) => setEditIsApproved(e.target.checked)}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isApproved" className="text-black">Approved</label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-black">Active Status</label>
                      <div className="flex items-center h-10 space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="h-4 w-4 text-black border-gray-300"
                        />
                        <label htmlFor="isActive" className="text-black">Active</label>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-black">Business Information</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-black">
                          <span className="font-medium">Name:</span> {selectedVendor.vendor_name || selectedVendor.profile?.business_name || 'Not provided'}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Email:</span> {selectedVendor.profile?.email || 'Not provided'}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Phone:</span> {selectedVendor.profile?.phone_number || 'Not provided'}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Description:</span> {selectedVendor.description || selectedVendor.profile?.business_description || 'Not provided'}
                        </p>
                        {selectedVendor.location && (
                          <p className="text-black">
                            <span className="font-medium">Location:</span> {selectedVendor.location}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-black">Account Information</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-black">
                          <span className="font-medium">Status:</span>{' '}
                          {getVendorStatus(selectedVendor)}
                        </p>
                        {selectedVendor.college && (
                          <p className="text-black">
                            <span className="font-medium">College:</span> {selectedVendor.college.name}
                          </p>
                        )}
                        <p className="text-black">
                          <span className="font-medium">Registration Date:</span>{' '}
                          {formatDate(selectedVendor.created_at || selectedVendor.profile?.created_at || '')}
                        </p>
                        <p className="text-black">
                          <span className="font-medium">Approval Status:</span>{' '}
                          {selectedVendor.profile?.is_approved ? (
                            <span className="text-green-700 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" /> Approved
                            </span>
                          ) : (
                            <span className="text-yellow-700 flex items-center">
                              <XCircle className="h-4 w-4 mr-1" /> Pending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <DialogFooter className="mt-6">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      className="border-gray-300 text-black hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveVendor} 
                      disabled={isSubmitting}
                      className="bg-gray-800 hover:bg-black text-white"
                    >
                      {isSubmitting ? 
                        'Saving...' : 'Save Changes'
                      }
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setViewVendorOpen(false)}
                      className="border-gray-300 text-black hover:bg-gray-100"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={handleEditVendor}
                      className="bg-gray-800 hover:bg-black text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {selectedVendor.profile && selectedVendor.profile.is_approved === false && (
                      <Button
                        onClick={() => {
                          handleApproveVendor(selectedVendor.profile!);
                          setViewVendorOpen(false);
                        }}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    {selectedVendor.id && (
                      <Button
                        onClick={() => {
                          toggleVendorStatus(selectedVendor);
                          setViewVendorOpen(false);
                        }}
                        disabled={isSubmitting}
                        variant={selectedVendor.is_active ? "destructive" : "default"}
                        className={selectedVendor.is_active ? 
                          "bg-red-600 hover:bg-red-700 text-white" : 
                          "bg-green-600 hover:bg-green-700 text-white"
                        }
                      >
                        {selectedVendor.is_active ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}