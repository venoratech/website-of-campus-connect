'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Eye, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Define interfaces
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
}

interface VendorApplication {
  id: string;
  profile: Profile;
  created_at: string;
  updated_at?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deactivated';
  notes?: string;
  business_name: string;
  business_description: string;
  location: string;
  college_id: string;
  college_name: string;
  deactivation_reason?: string;
}

export default function VendorManagerPage() {
  const { profile, isLoading } = useAuth();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorApplication | null>(null);
  const [viewVendorOpen, setViewVendorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  useEffect(() => {
    const fetchVendors = async () => {
      if (!profile || (profile.role !== 'vendor_manager' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
        setError('You do not have sufficient permissions to access this page');
        return;
      }

      try {
        // Fetch vendor profiles
        const { data: vendorProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vendor')
          .order('created_at', { ascending: false });
          
        if (profilesError) throw profilesError;

        // Fetch college data
        const { data: colleges, error: collegesError } = await supabase
          .from('colleges')
          .select('*');
          
        if (collegesError) throw collegesError;

        // Fetch food vendor details
        const { data: foodVendors, error: vendorsError } = await supabase
          .from('food_vendors')
          .select('*');
          
        if (vendorsError) throw vendorsError;

        // Process data
        const pendingApplications: VendorApplication[] = [];
        const approvedVendors: VendorApplication[] = [];

        vendorProfiles.forEach(profile => {
          const vendorDetails = foodVendors.find(v => v.profile_id === profile.id);
          const college = vendorDetails ? colleges.find(c => c.id === vendorDetails.college_id) : null;
          
          // Determine status based on profile approval and vendor active status
          let status: VendorApplication['status'] = 'pending';
          
          if (profile.is_approved) {
            if (vendorDetails && vendorDetails.is_active === false) {
              status = 'deactivated';
            } else {
              status = 'approved';
            }
          } else if (profile.rejection_reason) {
            status = 'rejected';
          }
          
          const vendorData: VendorApplication = {
            id: vendorDetails?.id || profile.id,
            profile,
            status,
            created_at: profile.created_at,
            updated_at: vendorDetails?.updated_at,
            business_name: profile.business_name || 'Unnamed Business',
            business_description: profile.business_description || 'No description provided',
            location: vendorDetails?.location || 'Unknown',
            college_id: vendorDetails?.college_id || '',
            college_name: college?.name || 'Not assigned',
            deactivation_reason: vendorDetails?.deactivation_reason
          };

          if (status === 'pending') {
            pendingApplications.push(vendorData);
          } else {
            approvedVendors.push(vendorData);
          }
        });

        setApplications(pendingApplications);
        setVendors(approvedVendors);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching vendors';
        setError(errorMessage);
        console.error(err);
      }
    };

    if (!isLoading) fetchVendors();
  }, [profile, isLoading]);

  const handleViewVendor = (vendor: VendorApplication) => {
    setSelectedVendor(vendor);
    setViewVendorOpen(true);
  };

  const handleApproveVendor = async (vendor: VendorApplication) => {
    if (!vendor) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update profile is_approved field
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', vendor.profile.id);
        
      if (updateError) throw updateError;
      
      // Move from applications to vendors in our state
      const updatedVendor = { ...vendor, status: 'approved' as const };
      setApplications(applications.filter(a => a.id !== vendor.id));
      setVendors([updatedVendor, ...vendors]);
      
      if (selectedVendor && selectedVendor.id === vendor.id) {
        setSelectedVendor(updatedVendor);
      }
      
      setSuccess(`Vendor "${vendor.business_name}" has been approved`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error approving vendor';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowRejection = (vendor: VendorApplication) => {
    setSelectedVendor(vendor);
    setRejectionNotes('');
    setShowRejectionDialog(true);
  };

  const handleRejectVendor = async () => {
    if (!selectedVendor) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update profile with rejection
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_approved: false,
          rejection_reason: rejectionNotes || 'Application rejected by administrator'
        })
        .eq('id', selectedVendor.profile.id);
        
      if (updateError) throw updateError;
      
      // Remove from our applications state
      setApplications(applications.filter(a => a.id !== selectedVendor.id));
      
      setSuccess(`Vendor "${selectedVendor.business_name}" has been rejected`);
      setShowRejectionDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error rejecting vendor';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter vendors based on search query
  const filteredApplications = applications.filter(app => 
    app.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.profile.first_name && app.profile.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (app.profile.last_name && app.profile.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredVendors = vendors.filter(vendor => 
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendor.profile.first_name && vendor.profile.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.profile.last_name && vendor.profile.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add function to handle deactivation
  const handleOpenDeactivateDialog = (vendor: VendorApplication) => {
    setSelectedVendor(vendor);
    setDeactivateReason('');
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateVendor = async () => {
    if (!selectedVendor) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Attempting to deactivate vendor:', selectedVendor.id);
      
      // Perform a simple update to just the is_active field
      const { error: updateError } = await supabase
        .from('food_vendors')
        .update({ is_active: false })
        .eq('id', selectedVendor.id);
        
      if (updateError) {
        console.error('Update error details:', updateError);
        throw updateError;
      }
      
      // If we want to track deactivation reason (optional), store in a note field
      if (deactivateReason) {
        try {
          // Try to add a note about deactivation
          await supabase
            .from('vendor_notes')
            .insert({
              vendor_id: selectedVendor.id,
              note: `Deactivation: ${deactivateReason}`,
              created_by: profile?.id
            })
            .single();
        } catch (noteError) {
          // Just log the error but continue since the main operation succeeded
          console.warn('Could not save deactivation note:', noteError);
        }
      }
      
      // Update local state for UI feedback
      const updatedVendor: VendorApplication = { 
        ...selectedVendor,
        status: 'deactivated',
        deactivation_reason: deactivateReason || undefined
      };
      
      setVendors(currentVendors => 
        currentVendors.map(v => v.id === selectedVendor.id ? updatedVendor : v)
      );
      
      setDeactivateDialogOpen(false);
      setSuccess('Vendor deactivated successfully');
      setIsSubmitting(false);
    } catch (error: unknown) {
      console.error('Full error deactivating vendor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to deactivate vendor: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  // Simplify the reactivation function to match
  const handleReactivateVendor = async (vendorId: string) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Only update the is_active field
      const { error: updateError } = await supabase
        .from('food_vendors')
        .update({ is_active: true })
        .eq('id', vendorId);
        
      if (updateError) throw updateError;
      
      // Update local state for UI feedback
      const vendor = vendors.find(v => v.id === vendorId);
      
      if (vendor) {
        const updatedVendor: VendorApplication = {
          ...vendor,
          status: 'approved',
          deactivation_reason: undefined
        };
        
        setVendors(currentVendors => 
          currentVendors.map(v => v.id === vendorId ? updatedVendor : v)
        );
      }
      
      setSuccess('Vendor reactivated successfully');
      setIsSubmitting(false);
    } catch (error: unknown) {
      console.error('Error reactivating vendor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to reactivate vendor: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  // Expand status badge styling for deactivated status
  const getStatusBadgeStyles = (status: VendorApplication['status']): string => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'rejected': return 'bg-orange-50 text-orange-700 border-orange-300 border';
      case 'deactivated': return 'bg-red-50 text-red-700 border-red-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessVendorManagement = profile && (
    profile.role === 'vendor_manager' || 
    profile.role === 'admin' || 
    profile.role === 'super_admin'
  );

  if (!canAccessVendorManagement) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-300">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black flex justify-between items-center">
            <span>Vendor Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-300">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 text-green-700 bg-green-100 rounded-md border border-green-300">
              {success}
            </div>
          )}
          
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4 border-gray-300 bg-white text-black"
          />

          <Tabs defaultValue="approved" className="mt-2">
            <TabsList className="mb-4 border-b border-gray-200 bg-white">
              <TabsTrigger value="pending" className="text-black">
                Pending Applications ({applications.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-black">
                Approved Vendors ({vendors.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No pending applications found
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.id} className="border-b border-gray-200">
                        <TableCell className="font-medium text-black">{app.business_name}</TableCell>
                        <TableCell className="text-black">
                          {app.profile.email}<br />
                          {app.profile.first_name} {app.profile.last_name}
                        </TableCell>
                        <TableCell className="text-black">{formatDate(app.created_at)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeStyles(app.status)}>
                            {app.status === 'approved' ? 'Approved' : app.status === 'pending' ? 'Pending Review' : app.status === 'rejected' ? 'Rejected' : 'Deactivated'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVendor(app)}
                              className="text-black hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveVendor(app)}
                              disabled={isSubmitting}
                              className="text-green-700 hover:bg-green-50 hover:text-green-800"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowRejection(app)}
                              disabled={isSubmitting}
                              className="text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="approved">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No approved vendors found
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id} className="border-b border-gray-200">
                        <TableCell className="font-medium text-black">{vendor.business_name}</TableCell>
                        <TableCell className="text-black">
                          {vendor.profile.email}<br />
                          {vendor.profile.first_name} {vendor.profile.last_name}
                        </TableCell>
                        <TableCell className="text-black">{vendor.location}</TableCell>
                        <TableCell className="text-black">{vendor.college_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVendor(vendor)}
                              className="text-black hover:bg-gray-100 h-8"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            
                            {vendor.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeactivateDialog(vendor)}
                                disabled={isSubmitting}
                                className="text-red-700 hover:bg-red-50 hover:text-red-800 h-8"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Deactivate
                              </Button>
                            )}
                            
                            {vendor.status === 'deactivated' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivateVendor(vendor.id)}
                                disabled={isSubmitting}
                                className="text-green-700 hover:bg-green-50 hover:text-green-800 h-8"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={viewVendorOpen} onOpenChange={setViewVendorOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[90%] bg-white text-black border-gray-300">
          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-black">{selectedVendor.business_name}</h3>
                <Badge className={getStatusBadgeStyles(selectedVendor.status)}>
                  {selectedVendor.status === 'approved' ? 'Approved' : selectedVendor.status === 'pending' ? 'Pending Review' : selectedVendor.status === 'rejected' ? 'Rejected' : 'Deactivated'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                  <p className="text-black">
                    {selectedVendor.profile.first_name} {selectedVendor.profile.last_name}<br/>
                    {selectedVendor.profile.email}<br/>
                    {selectedVendor.profile.phone_number || 'No phone number'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Business Details</h3>
                  <p className="text-black">
                    <strong>College:</strong> {selectedVendor.college_name}<br/>
                    <strong>Location:</strong> {selectedVendor.location}<br/>
                    <strong>Created:</strong> {formatDate(selectedVendor.created_at)}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Business Description</h3>
                <p className="text-black mt-1">{selectedVendor.business_description}</p>
              </div>
              
              {selectedVendor.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="text-black mt-1">{selectedVendor.notes}</p>
                </div>
              )}

              {selectedVendor.status === 'deactivated' && (
                <div className="space-y-2 mt-3">
                  <h3 className="text-sm font-medium text-red-700">Deactivation Reason</h3>
                  <div className="text-sm p-3 border border-red-300 rounded-md bg-red-50 text-red-800">
                    {selectedVendor.deactivation_reason || "No reason provided"}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="space-x-2">
                  {selectedVendor?.status === 'approved' && (
                    <Button
                      onClick={() => {
                        setViewVendorOpen(false);
                        handleOpenDeactivateDialog(selectedVendor);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Deactivate Vendor
                    </Button>
                  )}
                  
                  {selectedVendor?.status === 'deactivated' && (
                    <Button
                      onClick={() => {
                        handleReactivateVendor(selectedVendor.id);
                        setViewVendorOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reactivate Vendor
                    </Button>
                  )}
                </div>
                
                <Button
                  onClick={() => setViewVendorOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Reject Vendor Application</DialogTitle>
            <DialogDescription className="text-gray-500">
              Please provide a reason for rejecting this vendor application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Rejection Notes</label>
              <Textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Please explain why this application is being rejected..."
                className="bg-white text-black border-gray-300 resize-none h-32"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              disabled={isSubmitting}
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectVendor}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Deactivate Vendor</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to deactivate {selectedVendor?.business_name}? This will prevent them from operating on the marketplace.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Reason for Deactivation (Optional)</label>
              <Textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="You may provide a reason for deactivation..."
                className="bg-white text-black border-gray-300 resize-none h-32"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
              disabled={isSubmitting}
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivateVendor}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Deactivate Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 