'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Eye, Plus, Pencil, Trash2, Calendar } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  target_audience: 'all' | 'students' | 'vendors' | 'staff';
  created_at: string;
  updated_at: string;
  published_at?: string;
  expiry_date?: string;
  created_by: string;
}

export default function ContentManagerPage() {
  const { profile, isLoading } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    status: 'draft',
    expiry_date: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock data
  useEffect(() => {
    if (!profile || (profile.role !== 'content_manager' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
      setError('You do not have sufficient permissions to access this page');
      return;
    }

    // Simulate fetching announcements
    const mockAnnouncements: Announcement[] = [
      {
        id: '1',
        title: 'Campus Food Festival Next Week',
        content: 'Join us for the annual Campus Food Festival on Friday. All vendors will be offering special discounts and there will be live music performances.',
        status: 'published',
        target_audience: 'all',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Admin',
      },
      {
        id: '2',
        title: 'System Maintenance Notice',
        content: 'The marketplace will be undergoing maintenance this Saturday from 2 AM to 4 AM. During this time, the website and app will be temporarily unavailable.',
        status: 'published',
        target_audience: 'all',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'System',
      },
      {
        id: '3',
        title: 'Vendor Application Deadline Extended',
        content: 'Due to high demand, we have extended the deadline for vendor applications to the end of the month. Please complete your application if you're interested in becoming a vendor.',
        status: 'draft',
        target_audience: 'vendors',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Admin',
      },
      {
        id: '4',
        title: 'New Payment Methods Available',
        content: 'We are pleased to announce that we now support additional payment methods including Apple Pay and Google Pay for a more convenient ordering experience.',
        status: 'archived',
        target_audience: 'students',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Admin',
      }
    ];

    setAnnouncements(mockAnnouncements);
  }, [profile]);

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setViewDialogOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setNewAnnouncement({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      status: announcement.status,
      expiry_date: announcement.expiry_date || ''
    });
    setEditDialogOpen(true);
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleCreateAnnouncement = () => {
    setSelectedAnnouncement(null);
    setNewAnnouncement({
      title: '',
      content: '',
      target_audience: 'all',
      status: 'draft',
      expiry_date: ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);
    setSuccess(null);

    // Add or update announcement
    if (selectedAnnouncement) {
      // Update existing announcement
      const updatedAnnouncements = announcements.map(a => 
        a.id === selectedAnnouncement.id ? {
          ...a, 
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          status: newAnnouncement.status as Announcement['status'],
          target_audience: newAnnouncement.target_audience as Announcement['target_audience'],
          updated_at: new Date().toISOString(),
          expiry_date: newAnnouncement.expiry_date || undefined,
          published_at: newAnnouncement.status === 'published' && !a.published_at ? 
            new Date().toISOString() : a.published_at
        } : a
      );
      setAnnouncements(updatedAnnouncements);
      setSuccess('Announcement updated successfully');
    } else {
      // Create new announcement
      const newId = (announcements.length + 1).toString();
      const now = new Date().toISOString();
      const newAnnouncementObj: Announcement = {
        id: newId,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        status: newAnnouncement.status as Announcement['status'],
        target_audience: newAnnouncement.target_audience as Announcement['target_audience'],
        created_at: now,
        updated_at: now,
        published_at: newAnnouncement.status === 'published' ? now : undefined,
        expiry_date: newAnnouncement.expiry_date || undefined,
        created_by: profile?.first_name || 'Admin',
      };
      
      setAnnouncements([newAnnouncementObj, ...announcements]);
      setSuccess('Announcement created successfully');
    }
    
    setEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedAnnouncement) return;
    
    // Remove announcement
    setAnnouncements(announcements.filter(a => a.id !== selectedAnnouncement.id));
    setDeleteDialogOpen(false);
    setSuccess('Announcement deleted successfully');
  };

  const handlePublish = (announcement: Announcement) => {
    const updatedAnnouncements = announcements.map(a => 
      a.id === announcement.id ? {
        ...a, 
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : a
    );
    setAnnouncements(updatedAnnouncements);
    setSuccess('Announcement published successfully');
  };

  const handleArchive = (announcement: Announcement) => {
    const updatedAnnouncements = announcements.map(a => 
      a.id === announcement.id ? {
        ...a, 
        status: 'archived',
        updated_at: new Date().toISOString()
      } : a
    );
    setAnnouncements(updatedAnnouncements);
    setSuccess('Announcement archived successfully');
  };

  // Filter announcements based on search query and status
  const filteredAnnouncements = announcements.filter(announcement => {
    const searchMatches = 
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.target_audience.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatches = statusFilter === 'all' || announcement.status === statusFilter;
    
    return searchMatches && statusMatches;
  });

  // Helper for status badge styling
  const getStatusBadgeStyles = (status: Announcement['status']): string => {
    switch (status) {
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-300 border';
      case 'published': return 'bg-green-50 text-green-700 border-green-300 border';
      case 'archived': return 'bg-gray-50 text-gray-700 border-gray-300 border';
      default: return 'bg-gray-50 text-gray-700 border-gray-300 border';
    }
  };

  if (isLoading) {
    return <div className="text-black p-4">Loading...</div>;
  }

  // Check if user has appropriate permissions to access this page
  const canAccessContentManager = profile && (
    profile.role === 'content_manager' || 
    profile.role === 'admin' || 
    profile.role === 'super_admin'
  );

  if (!canAccessContentManager) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">You do not have permission to access this page.</p>
      </div>
    );
  }

  // Stats for announcements
  const announcementStats = {
    draft: announcements.filter(a => a.status === 'draft').length,
    published: announcements.filter(a => a.status === 'published').length,
    archived: announcements.filter(a => a.status === 'archived').length,
    total: announcements.length
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mt-4">Content Management</h1>
        <p className="text-black text-sm sm:text-base">
          Manage announcements and notifications for the marketplace
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
            <CardTitle className="text-sm font-medium text-black">Draft</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-yellow-600">{announcementStats.draft}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Published</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-green-600">{announcementStats.published}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Archived</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-gray-600">{announcementStats.archived}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-300">
          <CardHeader className="pb-2 pt-4 px-3">
            <CardTitle className="text-sm font-medium text-black">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="text-xl font-bold text-black">{announcementStats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg sm:text-xl font-semibold text-black">Announcements</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white text-black border-gray-300 h-9 max-w-sm"
          />
          
          <Button 
            onClick={handleCreateAnnouncement}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Announcements Table */}
      <Card className="border-gray-300">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-black">Title</TableHead>
                <TableHead className="text-black">Audience</TableHead>
                <TableHead className="text-black">Status</TableHead>
                <TableHead className="text-black">Created</TableHead>
                <TableHead className="text-black hide-on-mobile">Expires</TableHead>
                <TableHead className="text-right text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-black">
                    No announcements found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id} className="border-gray-200">
                    <TableCell className="font-medium text-black">
                      {announcement.title}
                      <p className="text-gray-500 text-xs truncate max-w-xs">{announcement.content.substring(0, 100)}...</p>
                    </TableCell>
                    <TableCell className="text-black capitalize">{announcement.target_audience}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeStyles(announcement.status)}>
                        {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-black">{formatDate(announcement.created_at)}</TableCell>
                    <TableCell className="text-black hide-on-mobile">
                      {announcement.expiry_date ? formatDate(announcement.expiry_date) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewAnnouncement(announcement)}
                          className="text-black hover:bg-gray-100 h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAnnouncement(announcement)}
                          className="text-black hover:bg-gray-100 h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAnnouncement(announcement)}
                          className="text-red-600 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Announcement Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">{selectedAnnouncement?.title}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Created by {selectedAnnouncement?.created_by} on {selectedAnnouncement?.created_at && formatDate(selectedAnnouncement.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusBadgeStyles(selectedAnnouncement?.status || 'draft')}>
                {selectedAnnouncement?.status.charAt(0).toUpperCase() + selectedAnnouncement?.status.slice(1)}
              </Badge>
              
              <Badge variant="outline" className="capitalize">
                Target: {selectedAnnouncement?.target_audience}
              </Badge>
              
              {selectedAnnouncement?.expiry_date && (
                <Badge variant="outline" className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Expires: {formatDate(selectedAnnouncement.expiry_date)}
                </Badge>
              )}
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50 whitespace-pre-wrap">
              {selectedAnnouncement?.content}
            </div>
            
            <div className="flex justify-between items-center pt-4">
              {selectedAnnouncement?.status === 'draft' && (
                <Button
                  onClick={() => {
                    handlePublish(selectedAnnouncement);
                    setViewDialogOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Publish Now
                </Button>
              )}
              
              {selectedAnnouncement?.status === 'published' && (
                <Button
                  onClick={() => {
                    handleArchive(selectedAnnouncement);
                    setViewDialogOpen(false);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Archive
                </Button>
              )}
              
              <Button
                onClick={() => setViewDialogOpen(false)}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">
              {selectedAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedAnnouncement 
                ? 'Make changes to the announcement' 
                : 'Create a new announcement for the marketplace'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Title</label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="bg-white text-black border-gray-300"
                placeholder="Enter announcement title"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Content</label>
              <Textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                className="bg-white text-black border-gray-300 h-32"
                placeholder="Enter announcement content"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Target Audience</label>
                <select
                  value={newAnnouncement.target_audience}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, target_audience: e.target.value})}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="all">All Users</option>
                  <option value="students">Students</option>
                  <option value="vendors">Vendors</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Status</label>
                <select
                  value={newAnnouncement.status}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, status: e.target.value})}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish Now</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Expiry Date (Optional)</label>
              <Input
                type="date"
                value={newAnnouncement.expiry_date ? new Date(newAnnouncement.expiry_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, expiry_date: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                className="bg-white text-black border-gray-300"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAnnouncement}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {selectedAnnouncement ? 'Save Changes' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90%] bg-white text-black border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-black">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAnnouncement && (
            <div>
              <p className="font-medium text-black">{selectedAnnouncement.title}</p>
              <p className="text-sm text-gray-500 truncate">{selectedAnnouncement.content.substring(0, 100)}...</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-300 text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 