'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { College } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  RefreshCw,
  Globe,
  School,
  Pin,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Trash2,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';


interface Announcement {
  id: string;
  title: string;
  content: string;
  college_id: string | null;
  creator_id: string;
  has_media: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_pinned: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  target_audience: string[];
  is_global: boolean;
  // Add promo code fields
  has_promo?: boolean;
  promo_code?: string;
  promo_description?: string;
  // Optional nested objects from your query:
  creator?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  college?: {
    name: string;
  };
  // Derived fields for display
  creator_name?: string;
  college_name?: string | null;
  media?: { id: string; media_url: string; media_type: string; display_order?: number }[];
  links?: { id: string; link_url: string; link_title: string; display_order?: number }[];
  colleges?: { id: string; college_id: string; college_name?: string }[];
}

// Stats interface for the dashboard
interface AnnouncementStats {
  totalAnnouncements: number;
  activeAnnouncements: number;
  popupAnnouncements: number;
  activePopups: number;
}

export default function AnnouncementsPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Dashboard stats
  const [stats, setStats] = useState<AnnouncementStats>({
    totalAnnouncements: 0,
    activeAnnouncements: 0,
    popupAnnouncements: 0,
    activePopups: 0
  });

  // State for modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch announcements, colleges, and stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get colleges data locally for mapping purposes
        const { data: collegesData, error: collegesError } = await supabase
          .from('colleges')
          .select('*')
          .order('name');
        if (collegesError) throw collegesError;

        // Fetch announcements with nested data
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select(`
            *,
            creator:profiles(first_name, last_name, email),
            college:colleges(name),
            media:announcement_media(id, media_url, media_type),
            links:announcement_links(id, link_url, link_title),
            colleges:announcement_colleges(college_id)
          `)
          .order('created_at', { ascending: false });
        if (announcementsError) throw announcementsError;

        // Process the announcements data for display
        const processedAnnouncements = (announcementsData as Announcement[]).map(
          (announcement) => {
            const creator = announcement.creator;
            const college = announcement.college;
            return {
              ...announcement,
              creator_name: creator
                ? creator.first_name && creator.last_name
                  ? `${creator.first_name} ${creator.last_name}`
                  : creator.email
                : 'Unknown',
              college_name: college ? college.name : null,
              colleges: announcement.colleges?.map((item) => {
                const collegeInfo = (collegesData as College[] | undefined)?.find(
                  (c: College) => c.id === item.college_id
                );
                return {
                  ...item,
                  college_name: collegeInfo?.name,
                };
              }),
            };
          }
        );

        setAnnouncements(processedAnnouncements);

        // Fetch popup announcements count for stats
        const { count: popupCount } = await supabase
          .from('popup_announcements')
          .select('*', { count: 'exact', head: true });
        
        const { count: activePopupCount } = await supabase
          .from('popup_announcements')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Set dashboard stats
        setStats({
          totalAnnouncements: processedAnnouncements.length,
          activeAnnouncements: processedAnnouncements.filter(a => a.is_active).length,
          popupAnnouncements: popupCount || 0,
          activePopups: activePopupCount || 0
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load announcements. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Redirect if not an admin
  useEffect(() => {
    if (!isLoading && profile && profile.role !== 'admin'&& profile.role !== 'super_admin'&& profile.role !== 'content_manager') {
      router.push('/dashboard');
    }
  }, [isLoading, profile, router]);

  if (isLoading || loading) {
    return <div className="text-center p-8 text-black">Loading...</div>;
  }

  if (!profile || profile.role !== 'admin'&& profile.role !== 'super_admin'&& profile.role !== 'content_manager') {
    return null;
  }

  // Delete handlers for list
  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
      if (error) throw error;
      setAnnouncements(announcements.filter((item) => item.id !== deleteId));
      alert('Announcement deleted successfully.');
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      setAnnouncements(
        announcements.map((item) =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        )
      );
      alert(`Announcement ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) {
      console.error('Error updating announcement status:', err);
      alert('Failed to update announcement status. Please try again.');
    }
  };

  // Render audience helper
  const getAudienceDisplay = (announcement: Announcement) => {
    if (announcement.is_global) {
      return (
        <div className="flex items-center text-black">
          <Globe className="h-4 w-4 mr-1" />
          <span>All Colleges</span>
        </div>
      );
    }
    if (announcement.college_id) {
      return (
        <div className="flex items-center text-black">
          <School className="h-4 w-4 mr-1" />
          <span>{announcement.college_name || 'Specific College'}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center text-black">
          <School className="h-4 w-4 mr-1" />
          <span>Multiple Colleges</span>
        </div>
        <div className="text-xs text-black">
          {announcement.colleges?.length || 0} colleges selected
        </div>
      </div>
    );
  };

  // Render status badges helper
  const getStatusBadges = (announcement: Announcement) => {
    const badges = [];
    if (!announcement.is_active) {
      badges.push(
        <Badge key="inactive" variant="outline" className="bg-gray-100 text-black">
          Inactive
        </Badge>
      );
    }
    if (announcement.is_pinned) {
      badges.push(
        <Badge key="pinned" variant="secondary" className="bg-yellow-100 text-black border-yellow-300">
          <Pin className="h-3 w-3 mr-1" />
          Pinned
        </Badge>
      );
    }
    if (announcement.scheduled_at) {
      const scheduleDate = new Date(announcement.scheduled_at);
      if (scheduleDate > new Date()) {
        badges.push(
          <Badge key="scheduled" variant="outline" className="bg-purple-100 text-black border-purple-300">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      }
    }
    if (announcement.expires_at) {
      const expiryDate = new Date(announcement.expires_at);
      if (expiryDate < new Date()) {
        badges.push(
          <Badge key="expired" variant="outline" className="bg-red-100 text-black border-red-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="expires" variant="outline" className="bg-orange-100 text-black border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Expires
          </Badge>
        );
      }
    }
    if (announcement.has_media && announcement.media && announcement.media.length > 0) {
      badges.push(
        <Badge key="media" variant="outline" className="bg-blue-100 text-black border-blue-300">
          Media
        </Badge>
      );
    }
    // Add this badge for promo codes
    if (announcement.has_promo) {
      badges.push(
        <Badge key="promo" variant="outline" className="bg-green-100 text-black border-green-300">
          <Tag className="h-3 w-3 mr-1" />
          Promo
        </Badge>
      );
    }
    return badges;
  };

  // Open modal to view details
  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setModalOpen(true);
  };

  // Close modal handler
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAnnouncement(null);
  };

  // Dashboard stats display
  const AnnouncementDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Total Announcements</span>
            <span className="text-3xl font-bold text-black">{stats.totalAnnouncements}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Active Announcements</span>
            <span className="text-3xl font-bold text-black">{stats.activeAnnouncements}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Popup Announcements</span>
            <span className="text-3xl font-bold text-black">{stats.popupAnnouncements}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Active Popups</span>
            <span className="text-3xl font-bold text-black">{stats.activePopups}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Announcement management types
  const AnnouncementTypes = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-black text-lg">Feed Announcements</CardTitle>
          <CardDescription className="text-black">
            Manage announcements that appear in the news feed
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-black mb-4">
            Feed announcements are displayed in the user&apos;s news feed and can include media, links, and promo codes.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/announcements/create')}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Feed Announcement
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-black text-lg">Popup Announcements</CardTitle>
          <CardDescription className="text-black">
            Manage popup announcements shown to users
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-black mb-4">
            Popup announcements display as modal dialogs and are perfect for important notices, special promotions or alerts.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => router.push('/dashboard/popup-announcements')}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Popups
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Announcements Management</h1>
        <div className="flex space-x-2">
          <Button onClick={() => router.push('/dashboard/popup-announcements')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Popups
          </Button>
          <Button onClick={() => router.push('/dashboard/announcements/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300 mb-6">
          <p className="text-black">{error}</p>
        </div>
      )}

      <AnnouncementDashboard />
      <AnnouncementTypes />

      <Card>
        <CardHeader>
          <CardTitle className="text-black">Feed Announcements</CardTitle>
          <CardDescription className="text-black">
            Manage announcements sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-black">No announcements found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="text-black font-medium">Title</TableCell>
                  <TableCell className="text-black">Audience</TableCell>
                  <TableCell className="text-black">Status</TableCell>
                  <TableCell className="text-black">Created</TableCell>
                  <TableCell className="text-black text-right">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="text-black font-medium">
                      {announcement.title}
                      {announcement.links && announcement.links.length > 0 && (
                        <div className="text-xs text-black mt-1">
                          {announcement.links.length} link(s)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getAudienceDisplay(announcement)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">{getStatusBadges(announcement)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-black">{formatDate(announcement.created_at)}</div>
                      <div className="text-xs text-black">by {announcement.creator_name}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(announcement)}>
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="text-black">View</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleActive(announcement.id, announcement.is_active)}
                          >
                            {announcement.is_active ? (
                              <>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <span className="text-black">Deactivate</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                <span className="text-black">Activate</span>
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDelete(announcement.id)}>
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
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/popup-announcements')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Popup Announcements
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-black">
              This will permanently delete the announcement and all its associated media, links, and notifications.
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

      {/* Announcement Details Modal */}
      {modalOpen && selectedAnnouncement && (
        <AnnouncementModal
          announcement={selectedAnnouncement}
          onClose={handleCloseModal}
          onToggleActive={async () => {
            await toggleActive(selectedAnnouncement.id, selectedAnnouncement.is_active);
            setSelectedAnnouncement({
              ...selectedAnnouncement,
              is_active: !selectedAnnouncement.is_active,
            });
          }}
          onDelete={async () => {
            if (confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
              try {
                const { error } = await supabase
                  .from('announcements')
                  .delete()
                  .eq('id', selectedAnnouncement.id);
                if (error) throw error;
                setAnnouncements(announcements.filter((item) => item.id !== selectedAnnouncement.id));
                handleCloseModal();
              } catch (err) {
                console.error('Error deleting announcement:', err);
                alert('Failed to delete announcement');
              }
            }
          }}
        />
      )}
    </div>
  );
}

/**
 * AnnouncementModal
 * Displays full details, media, and links for a given announcement in a modal overlay.
 */
interface AnnouncementModalProps {
  announcement: Announcement;
  onClose: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function AnnouncementModal({ announcement, onClose, onToggleActive, onDelete }: AnnouncementModalProps) {
  // Render media items with Next.js Image for better LCP
  const renderMediaItems = () => {
    if (!announcement.media || announcement.media.length === 0) {
      return <div className="text-black">No media attached</div>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcement.media.map((item) => (
          <div key={item.id} className="border rounded-md overflow-hidden">
            {item.media_type === 'image' ? (
              <Fragment>
                <Image
                  src={item.media_url}
                  alt="Announcement media"
                  width={400}
                  height={160}
                  className="w-full h-40 object-cover"
                />
                <div className="p-2 flex justify-between items-center">
                  <span className="text-sm text-black">Image</span>
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-black"
                  >
                    View
                  </a>
                </div>
              </Fragment>
            ) : item.media_type === 'video' ? (
              <Fragment>
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  <span className="text-black">Video</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="text-sm text-black">Video</span>
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-black"
                  >
                    View
                  </a>
                </div>
              </Fragment>
            ) : (
              <Fragment>
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  <span className="text-black">File</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="text-sm text-black">File</span>
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-black"
                  >
                    View
                  </a>
                </div>
              </Fragment>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render links
  const renderLinks = () => {
    if (!announcement.links || announcement.links.length === 0) {
      return <div className="text-black">No links attached</div>;
    }
    return (
      <div className="space-y-2">
        {announcement.links.map((link) => (
          <div key={link.id} className="flex items-center border rounded-md p-2">
            <span className="font-medium mr-2 text-black">{link.link_title}:</span>
            <a
              href={link.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-black flex-1 truncate"
            >
              {link.link_url}
            </a>
          </div>
        ))}
      </div>
    );
  };

  // Helper for status badges in modal
  const getStatusBadges = () => {
    const badges = [];
    if (!announcement.is_active) {
      badges.push(
        <Badge key="inactive" variant="outline" className="bg-gray-100 text-black">
          Inactive
        </Badge>
      );
    } else {
      badges.push(
        <Badge key="active" variant="outline" className="bg-green-100 text-black">
          Active
        </Badge>
      );
    }
    if (announcement.is_pinned) {
      badges.push(
        <Badge key="pinned" variant="secondary" className="bg-yellow-100 text-black border-yellow-300">
          <Pin className="h-3 w-3 mr-1" />
          Pinned
        </Badge>
      );
    }
    if (announcement.scheduled_at) {
      const scheduleDate = new Date(announcement.scheduled_at);
      if (scheduleDate > new Date()) {
        badges.push(
          <Badge key="scheduled" variant="outline" className="bg-purple-100 text-black border-purple-300">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Scheduled for {formatDate(announcement.scheduled_at)}
          </Badge>
        );
      }
    }
    if (announcement.expires_at) {
      const expiryDate = new Date(announcement.expires_at);
      if (expiryDate < new Date()) {
        badges.push(
          <Badge key="expired" variant="outline" className="bg-red-100 text-black border-red-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired on {formatDate(announcement.expires_at)}
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="expires" variant="outline" className="bg-orange-100 text-black border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Expires on {formatDate(announcement.expires_at)}
          </Badge>
        );
      }
    }
    // Add promo badge
    if (announcement.has_promo) {
      badges.push(
        <Badge key="promo" variant="outline" className="bg-green-100 text-black border-green-300">
          <Tag className="h-3 w-3 mr-1" />
          Promo
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-black opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal content */}
      <div className="relative bg-white rounded-md shadow-lg max-w-4xl w-full mx-4 overflow-y-auto max-h-full">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl text-black">{announcement.title}</CardTitle>
                <CardDescription className="text-black">
                  Created on {formatDate(announcement.created_at)} at {formatTime(announcement.created_at)}
                </CardDescription>
              </div>
              <div className="flex space-x-2">{getStatusBadges()}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-black">
              {announcement.content}
            </div>
            
            {/* Promo code section */}
            {announcement.has_promo && (
              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Promo Code</h3>
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-black">{announcement.promo_code}</span>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Promo Code
                    </Badge>
                  </div>
                  {announcement.promo_description && (
                    <p className="text-black">{announcement.promo_description}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-2 text-black">Media</h3>
              {renderMediaItems()}
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2 text-black">Links</h3>
              {renderLinks()}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant={announcement.is_active ? 'destructive' : 'default'} onClick={onToggleActive}>
              {announcement.is_active ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-white">Deactivate</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Activate</span>
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="text-white">Delete</span>
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}