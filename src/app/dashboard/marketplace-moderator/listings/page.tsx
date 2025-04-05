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
import { Eye, CheckCircle, XCircle, Flag, Filter } from 'lucide-react';
import Image from 'next/image';

// Define interfaces
interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  vendor_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  rejection_reason?: string;
  report_count?: number;
}

export default function MarketplaceModeratorPage() {
  const { profile, isLoading } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [viewItemOpen, setViewItemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!profile || (profile.role !== 'marketplace_moderator' && 
                       profile.role !== 'admin' && 
                       profile.role !== 'super_admin')) {
        setError('You do not have sufficient permissions to access this page');
        return;
      }

      try {
        // Fetch menu items with vendor information
        const { data, error: menuItemsError } = await supabase
          .from('menu_items')
          .select(`
            *,
            vendors:vendor_id (vendor_name)
          `)
          .order('created_at', { ascending: false });

        if (menuItemsError) throw menuItemsError;

        // Add moderation status (in a real app, this would be a column in the database)
        // Here we're simulating it with random values
        const processedItems = data.map((item): MenuItem => {
          // Randomly assign statuses for demonstration
          const statuses: Array<'pending' | 'approved' | 'rejected' | 'flagged'> = 
            ['pending', 'approved', 'approved', 'approved', 'flagged', 'rejected'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          
          return {
            ...item,
            vendor_name: item.vendors?.vendor_name || 'Unknown Vendor',
            status: randomStatus,
            report_count: randomStatus === 'flagged' ? Math.floor(Math.random() * 5) + 1 : 0
          };
        });

        setMenuItems(processedItems);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error fetching menu items';
        setError(errorMessage);
        console.error(err);
      }
    };

    if (!isLoading) fetchMenuItems();
  }, [profile, isLoading]);

  const handleViewItem = (item: MenuItem) => {
    setSelectedItem(item);
    setViewItemOpen(true);
  };

  const handleApproveItem = async (item: MenuItem) => {
    if (!item) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, update the item's status in the database
      // For demo purposes, we're just updating the UI state
      const updatedItems = menuItems.map(menuItem => 
        menuItem.id === item.id ? { ...menuItem, status: 'approved' as const } : menuItem
      );
      
      setMenuItems(updatedItems);
      
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem({ ...selectedItem, status: 'approved' });
      }
      
      setSuccess(`Item "${item.name}" has been approved`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error approving item';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowRejection = (item: MenuItem) => {
    setSelectedItem(item);
    setRejectionReason('');
    setShowRejectionDialog(true);
  };

  const handleRejectItem = async () => {
    if (!selectedItem) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, update the item's status in the database
      // For demo purposes, we're just updating the UI state
      const updatedItems = menuItems.map(menuItem => 
        menuItem.id === selectedItem.id 
          ? { ...menuItem, status: 'rejected' as const, rejection_reason: rejectionReason } 
          : menuItem
      );
      
      setMenuItems(updatedItems);
      
      setSelectedItem({ ...selectedItem, status: 'rejected', rejection_reason: rejectionReason });
      setSuccess(`Item "${selectedItem.name}" has been rejected`);
      setShowRejectionDialog(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error rejecting item';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagItem = async (item: MenuItem) => {
    if (!item) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, update the item's status in the database
      // For demo purposes, we're just updating the UI state
      const updatedItems = menuItems.map(menuItem => 
        menuItem.id === item.id 
          ? { ...menuItem, status: 'flagged' as const, report_count: (menuItem.report_count || 0) + 1 } 
          : menuItem
      );
      
      setMenuItems(updatedItems);
      
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem({ 
          ...selectedItem, 
          status: 'flagged',
          report_count: (selectedItem.report_count || 0) + 1 
        });
      }
      
      setSuccess(`Item "${item.name}" has been flagged for review`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error flagging item';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter menu items based on search query and status filter
  const filteredItems = menuItems.filter(item => {
    const searchMatches = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatches = statusFilter === 'all' || item.status === statusFilter;
    
    return searchMatches && statusMatches;
  });

  // Counts by status for stat cards
  const statusCounts = {
    pending: menuItems.filter(item => item.status === 'pending').length,
    approved: menuItems.filter(item => item.status === 'approved').length,
    rejected: menuItems.filter(item => item.status === 'rejected').length,
    flagged: menuItems.filter(item => item.status === 'flagged').length
  };

  // Format price to 2 decimal places
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Helper function for status badge styling
  const getStatusBadgeStyles = (status: MenuItem['status']): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'approved': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-300 border';
      case 'flagged': return 'bg-orange-50 text-orange-700 border-orange-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessMarketplaceModeration = profile && (
    profile.role === 'marketplace_moderator' || 
    profile.role === 'admin' || 
    profile.role === 'super_admin'
  );

  if (!canAccessMarketplaceModeration) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Marketplace Moderation</h1>
        <p className="text-black text-sm sm:text-base">
          Review and moderate marketplace listings
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-3 rounded-md border border-red-300">
          <p className="text-red-800 font-medium text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-3 rounded-md border border-green-300">
          <p className="text-green-800 font-medium text-sm">{success}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Pending Review</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-yellow-600">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Approved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-green-600">{statusCounts.approved}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Flagged</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-orange-600">{statusCounts.flagged}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Rejected</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-red-600">{statusCounts.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg sm:text-xl font-semibold text-black">Listings</h2>
          <Button variant="outline" size="sm" className="flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-black border-none focus:outline-none text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
            </select>
          </Button>
        </div>
        
        <div>
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white text-black border-gray-300 h-9 text-sm"
          />
        </div>
      </div>

      {/* Listings Table */}
      <Card className="border-gray-300">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Item Name</TableHead>
                  <TableHead className="text-black">Vendor</TableHead>
                  <TableHead className="text-black">Price</TableHead>
                  <TableHead className="text-black">Created</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-black">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="border-gray-200">
                      <TableCell className="font-medium text-black">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-black">{item.vendor_name}</TableCell>
                      <TableCell className="text-black">{formatPrice(item.price)}</TableCell>
                      <TableCell className="text-black">{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeStyles(item.status)}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          {item.status === 'flagged' && item.report_count 
                            ? ` (${item.report_count})` 
                            : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewItem(item)}
                          className="text-black hover:bg-gray-100"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {item.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleApproveItem(item)}
                            className="text-green-600 hover:bg-green-50"
                            title="Approve Item"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {item.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleShowRejection(item)}
                            className="text-red-600 hover:bg-red-50"
                            title="Reject Item"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {item.status !== 'flagged' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleFlagItem(item)}
                            className="text-orange-600 hover:bg-orange-50"
                            title="Flag for Review"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Item Details Dialog */}
      <Dialog open={viewItemOpen} onOpenChange={setViewItemOpen}>
        <DialogContent className="sm:max-w-lg max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Listing Details</DialogTitle>
            <DialogDescription className="text-black">
              Review menu item information
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-black">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-500">{selectedItem.vendor_name}</p>
                </div>
                <Badge className={getStatusBadgeStyles(selectedItem.status)}>
                  {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  {selectedItem.status === 'flagged' && selectedItem.report_count 
                    ? ` (${selectedItem.report_count})` 
                    : ''}
                </Badge>
              </div>

              {selectedItem.image_url && (
                <div className="relative h-48 w-full">
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="rounded-md"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-black">Description</h4>
                <p className="text-sm text-black">{selectedItem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-black">Price</h4>
                  <p className="text-sm text-black">{formatPrice(selectedItem.price)}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-black">Available</h4>
                  <p className="text-sm text-black">{selectedItem.is_available ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {selectedItem.status === 'rejected' && selectedItem.rejection_reason && (
                <div className="space-y-2 bg-red-50 p-3 rounded-md border border-red-200">
                  <h4 className="text-sm font-medium text-red-800">Rejection Reason</h4>
                  <p className="text-sm text-red-800">{selectedItem.rejection_reason}</p>
                </div>
              )}

              {selectedItem.status === 'flagged' && (
                <div className="space-y-2 bg-orange-50 p-3 rounded-md border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-800">Reported Content</h4>
                  <p className="text-sm text-orange-800">
                    This item has been reported {selectedItem.report_count} time(s) by users for potentially 
                    violating marketplace rules.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                {selectedItem.status !== 'approved' && (
                  <Button
                    variant="outline"
                    onClick={() => handleApproveItem(selectedItem)}
                    disabled={isSubmitting}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                
                {selectedItem.status !== 'rejected' && (
                  <Button
                    variant="outline"
                    onClick={() => handleShowRejection(selectedItem)}
                    disabled={isSubmitting}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
                
                {selectedItem.status !== 'flagged' && (
                  <Button
                    variant="outline"
                    onClick={() => handleFlagItem(selectedItem)}
                    disabled={isSubmitting}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Flag
                  </Button>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setViewItemOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Reject Marketplace Item</DialogTitle>
            <DialogDescription className="text-black">
              Please provide a reason for rejecting this item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium text-black">
                Rejection Reason
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this item is being rejected..."
                className="w-full min-h-[100px] p-2 border border-gray-300 rounded-md text-black"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectionDialog(false)}
                className="border-gray-300 text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectItem}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject Item
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 