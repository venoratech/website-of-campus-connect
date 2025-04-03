'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { College } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  MoreVertical,
  Eye,
  Power,
  Globe,
  School,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  ChevronLeft,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PopupAnnouncement {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  show_once_per_user: boolean;
  start_date: string;
  end_date: string | null;
  college_id: string | null;
  is_global: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  target_audience: string[];
  // Optional nested objects from your query
  creator?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  college?: {
    name: string;
  };
  // For multiple colleges
  colleges?: Array<{ college_id: string; college_name?: string }>;
  // Derived fields for display
  creator_name?: string;
  college_name?: string | null;
}

export default function PopupAnnouncementsPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  const [popupAnnouncements, setPopupAnnouncements] = useState<PopupAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allColleges, setAllColleges] = useState<College[]>([]);

  // State for modal
  const [selectedPopup, setSelectedPopup] = useState<PopupAnnouncement | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Fetch colleges for reference
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .order('name');

        if (error) throw error;
        setAllColleges(data || []);
      } catch (err) {
        console.error('Error fetching colleges:', err);
      }
    };

    fetchColleges();
  }, []);

  // Fetch popup announcements
  useEffect(() => {
    const fetchPopupAnnouncements = async () => {
      try {
        setLoading(true);
        
        // Fetch popup announcements with joined data
        const { data, error } = await supabase
          .from('popup_announcements')
          .select(`
            *,
            creator:profiles(first_name, last_name, email),
            college:colleges(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process the data for display
        const processedPopups: PopupAnnouncement[] = [];
        
        for (const popup of data as PopupAnnouncement[]) {
          const creator = popup.creator;
          const college = popup.college;
          
          // Create base popup object
          const processedPopup: PopupAnnouncement = {
            ...popup,
            creator_name: creator
              ? creator.first_name && creator.last_name
                ? `${creator.first_name} ${creator.last_name}`
                : creator.email
              : 'Unknown',
            college_name: college ? college.name : null,
            colleges: [], // Initialize empty array for multiple colleges
          };
          
          // If it's not global and doesn't have a direct college_id, fetch associated colleges
          if (!popup.is_global && !popup.college_id) {
            const { data: collegeAssociations, error: collegeError } = await supabase
              .from('popup_announcement_colleges')
              .select('college_id')
              .eq('popup_id', popup.id);
              
            if (!collegeError && collegeAssociations) {
              // Map college IDs to college objects with names
              processedPopup.colleges = collegeAssociations.map(association => {
                const collegeInfo = allColleges.find(c => c.id === association.college_id);
                return {
                  college_id: association.college_id,
                  college_name: collegeInfo?.name
                };
              });
            }
          }
          
          processedPopups.push(processedPopup);
        }

        setPopupAnnouncements(processedPopups);
      } catch (err) {
        console.error('Error fetching popup announcements:', err);
        setError('Failed to load popup announcements. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (allColleges.length > 0) {
      fetchPopupAnnouncements();
    }
  }, [allColleges]);

  // Redirect if not an admin
  useEffect(() => {
    if (!isLoading && profile && profile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isLoading, profile, router]);

  if (isLoading || loading) {
    return <div className="text-center p-8 text-black">Loading...</div>;
  }

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  // Delete handlers
  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('popup_announcements').delete().eq('id', deleteId);
      if (error) throw error;
      setPopupAnnouncements(popupAnnouncements.filter((item) => item.id !== deleteId));
      alert('Popup announcement deleted successfully.');
    } catch (err) {
      console.error('Error deleting popup announcement:', err);
      setError('Failed to delete popup announcement. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  // Toggle active status
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('popup_announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      
      setPopupAnnouncements(
        popupAnnouncements.map((item) =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        )
      );
      
      alert(`Popup announcement ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) {
      console.error('Error updating popup status:', err);
      setError('Failed to update popup status. Please try again.');
    }
  };

  // Render audience helper
  const getAudienceDisplay = (popup: PopupAnnouncement) => {
    if (popup.is_global) {
      return (
        <div className="flex items-center text-black">
          <Globe className="h-4 w-4 mr-1" />
          <span>All Colleges</span>
        </div>
      );
    }
    
    if (popup.college_id) {
      return (
        <div className="flex items-center text-black">
          <School className="h-4 w-4 mr-1" />
          <span>{popup.college_name || 'Specific College'}</span>
        </div>
      );
    }
    
    if (popup.colleges && popup.colleges.length > 0) {
      return (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center text-black">
            <School className="h-4 w-4 mr-1" />
            <span>Multiple Colleges</span>
          </div>
          <div className="text-xs text-black">
            {popup.colleges.length} {popup.colleges.length === 1 ? 'college' : 'colleges'} selected
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-black">
        <School className="h-4 w-4 mr-1" />
        <span>No target specified</span>
      </div>
    );
  };

  // Render status badges helper
  const getStatusBadges = (popup: PopupAnnouncement) => {
    const badges = [];
    
    if (popup.is_active) {
      badges.push(
        <Badge key="active" variant="outline" className="bg-green-100 text-black">
          Active
        </Badge>
      );
    } else {
      badges.push(
        <Badge key="inactive" variant="outline" className="bg-gray-100 text-black">
          Inactive
        </Badge>
      );
    }
    
    const now = new Date();
    const startDate = new Date(popup.start_date);
    const endDate = popup.end_date ? new Date(popup.end_date) : null;
    
    if (startDate > now) {
      badges.push(
        <Badge key="scheduled" variant="outline" className="bg-purple-100 text-black border-purple-300">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    }

    if (endDate && endDate < now) {
      badges.push(
        <Badge key="expired" variant="outline" className="bg-red-100 text-black border-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (endDate) {
      badges.push(
        <Badge key="expires" variant="outline" className="bg-orange-100 text-black border-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          Expires
        </Badge>
      );
    }
    
    if (popup.show_once_per_user) {
      badges.push(
        <Badge key="once" variant="outline" className="bg-blue-100 text-black border-blue-300">
          Show Once
        </Badge>
      );
    }

    return badges;
  };

  // Preview popup handler
  const handlePreview = (popup: PopupAnnouncement) => {
    setSelectedPopup(popup);
    setPreviewModalOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/announcements')}
          className="mr-2 text-black"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Announcements
        </Button>
        <h1 className="text-2xl font-bold text-black">Popup Announcements</h1>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/dashboard/popup-announcements/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Popup
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-black">All Popup Announcements</CardTitle>
          <CardDescription className="text-black">
            Manage popup announcements shown to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {popupAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-black">No popup announcements found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="text-black font-medium">Title</TableCell>
                  <TableCell className="text-black">Audience</TableCell>
                  <TableCell className="text-black">Status</TableCell>
                  <TableCell className="text-black">Date Range</TableCell>
                  <TableCell className="text-black text-right">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popupAnnouncements.map((popup) => (
                  <TableRow key={popup.id}>
                    <TableCell className="text-black font-medium">
                      {popup.title}
                      {popup.subtitle && (
                        <div className="text-xs text-gray-500 mt-1">
                          {popup.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getAudienceDisplay(popup)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">{getStatusBadges(popup)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-black">
                        From: {formatDate(popup.start_date)}
                      </div>
                      {popup.end_date && (
                        <div className="text-xs text-black">
                          To: {formatDate(popup.end_date)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(popup)}>
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="text-black">Preview</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/popup-announcements/edit/${popup.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            <span className="text-black">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleActive(popup.id, popup.is_active)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            <span className="text-black">
                              {popup.is_active ? 'Deactivate' : 'Activate'}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDelete(popup.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            <span className="text-black">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-black">
              This will permanently delete the popup announcement.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {previewModalOpen && selectedPopup && (
        <PopupPreviewModal 
          popup={selectedPopup} 
          onClose={() => setPreviewModalOpen(false)}
          allColleges={allColleges}
        />
      )}
    </div>
  );
}

interface PopupPreviewModalProps {
  popup: PopupAnnouncement;
  onClose: () => void;
  allColleges: College[];
}

function PopupPreviewModal({ popup, onClose, allColleges }: PopupPreviewModalProps) {
  // Format audience display for preview
  const formatAudienceDisplay = () => {
    if (popup.is_global) {
      return 'Global (All colleges)';
    }
    
    if (popup.college_id) {
      return popup.college_name || 'Specific College';
    }
    
    if (popup.colleges && popup.colleges.length > 0) {
      // Get college names
      const collegeNames = popup.colleges
        .map(c => c.college_name || allColleges.find(col => col.id === c.college_id)?.name || 'Unknown')
        .sort();
      
      return `${popup.colleges.length} colleges selected: ${collegeNames.join(', ')}`;
    }
    
    return 'No target specified';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Modal overlay */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} aria-hidden="true" />
      
      {/* Modal content - preview of how the popup would look */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex flex-col">
          {/* Header with close button */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold text-black">Popup Preview</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Popup content preview */}
          <div className="p-6">
            <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm">
              {/* Image */}
              {popup.image_url && (
                <div className="mb-4">
                  <Image
                    src={popup.image_url}
                    alt={popup.title}
                    width={400}
                    height={200}
                    className="w-full h-auto object-cover rounded-md"
                  />
                </div>
              )}
              
              {/* Title and subtitle */}
              <div className="mb-3">
                <h3 className="text-xl font-bold text-black">{popup.title}</h3>
                {popup.subtitle && (
                  <p className="text-gray-600 mt-1">{popup.subtitle}</p>
                )}
              </div>
              
              {/* Content */}
              <div className="mb-4 text-black">
                {popup.content}
              </div>
              
              {/* Button (if specified) */}
              {popup.button_text && (
                <div className="mt-4">
                  <Button className="w-full">
                    {popup.button_text}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Popup details */}
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Status:</strong> {popup.is_active ? 'Active' : 'Inactive'}</p>
              <p><strong>Show once per user:</strong> {popup.show_once_per_user ? 'Yes' : 'No'}</p>
              <p><strong>Audience:</strong> {formatAudienceDisplay()}</p>
              <p><strong>Date range:</strong> {formatDate(popup.start_date)} {popup.end_date ? `to ${formatDate(popup.end_date)}` : 'onwards'}</p>
            </div>
          </div>
          
          {/* Footer with close button */}
          <div className="border-t p-4 flex justify-end">
            <Button onClick={onClose}>Close Preview</Button>
          </div>
        </div>
      </div>
    </div>
  );
}