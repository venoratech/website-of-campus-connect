'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

import {
  ChevronLeft,
  Globe,
  Image as ImageIcon,
  Trash2,
  Eye,
  X,
  Check,
  Search,
} from 'lucide-react';


export default function PopupAnnouncementForm() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const isEditing = !!params?.id;
  const popupId = params?.id as string;

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showOncePerUser, setShowOncePerUser] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  
  // Multiple college selection
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  
  // Image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // State for colleges dropdown
  const [colleges, setColleges] = useState<College[]>([]);
  
  // Loading and error states
  const [formLoading, setFormLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch colleges for the dropdown
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .order('name');

        if (error) throw error;
        setColleges(data || []);
      } catch (err) {
        console.error('Error fetching colleges:', err);
        setError('Failed to load colleges. Please try again.');
      }
    };

    fetchColleges();
  }, []);

  // If editing, fetch the popup announcement data
  useEffect(() => {
    if (isEditing && popupId) {
      const fetchPopupAnnouncement = async () => {
        try {
          setInitialLoading(true);
          
          // Fetch the popup announcement base data
          const { data, error } = await supabase
            .from('popup_announcements')
            .select('*')
            .eq('id', popupId)
            .single();

          if (error) throw error;

          if (data) {
            setTitle(data.title || '');
            setSubtitle(data.subtitle || '');
            setContent(data.content || '');
            setButtonText(data.button_text || '');
            setButtonLink(data.button_link || '');
            setIsActive(data.is_active || false);
            setShowOncePerUser(data.show_once_per_user);
            
            // Format dates for input
            if (data.start_date) {
              const startDate = new Date(data.start_date);
              setStartDate(startDate.toISOString().slice(0, 16));
            }
            
            if (data.end_date) {
              const endDate = new Date(data.end_date);
              setEndDate(endDate.toISOString().slice(0, 16));
            }
            
            setIsGlobal(data.is_global || false);
            setImageUrl(data.image_url || null);
            setPreviewUrl(data.image_url || null);
            
            // If there's a direct college_id, add it to selectedColleges
            if (data.college_id) {
              setSelectedColleges([data.college_id]);
            } else if (!data.is_global) {
              // Otherwise, fetch associated colleges from the junction table
              const { data: collegeData, error: collegeError } = await supabase
                .from('popup_announcement_colleges')
                .select('college_id')
                .eq('popup_id', popupId);
                
              if (!collegeError && collegeData && collegeData.length > 0) {
                setSelectedColleges(collegeData.map(item => item.college_id));
              }
            }
          }
        } catch (err) {
          console.error('Error fetching popup announcement:', err);
          setError('Failed to load popup announcement. Please try again.');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchPopupAnnouncement();
    } else {
      // For new announcements, set the start date to now by default
      const now = new Date();
      setStartDate(now.toISOString().slice(0, 16));
    }
  }, [isEditing, popupId]);

  // Redirect if not an admin
  useEffect(() => {
    if (!isLoading && profile && profile.role !== 'admin'&& profile.role !== 'super_admin'&& profile.role !== 'content_manager') {
      router.push('/dashboard');
    }
  }, [isLoading, profile, router]);

  if (isLoading || initialLoading) {
    return <div className="text-center p-8 text-black">Loading...</div>;
  }

  if (!profile || profile.role !== 'admin'&& profile.role !== 'super_admin'&& profile.role !== 'content_manager') {
    return null;
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Toggle college selection
  const toggleCollegeSelection = (collegeId: string) => {
    if (selectedColleges.includes(collegeId)) {
      // Remove college from selection
      setSelectedColleges(selectedColleges.filter(id => id !== collegeId));
    } else {
      // Add college to selection
      setSelectedColleges([...selectedColleges, collegeId]);
    }
  };

  // Filter colleges based on search query
  const filteredColleges = colleges.filter(college => 
    college.name.toLowerCase().includes(collegeSearchQuery.toLowerCase())
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (!isGlobal && selectedColleges.length === 0) {
      setError('Please select at least one college or make the popup global');
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      let finalImageUrl = imageUrl;

      // Handle image upload if a new file was selected
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('popup-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('popup-images')
          .getPublicUrl(fileName);

        finalImageUrl = urlData.publicUrl;
      }

      const popupData = {
        title,
        subtitle: subtitle || null,
        content,
        image_url: finalImageUrl,
        button_text: buttonText || null,
        button_link: buttonLink || null,
        is_active: isActive,
        show_once_per_user: showOncePerUser,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        college_id: null, // We'll use the junction table instead
        is_global: isGlobal,
        target_audience: ['all']
      };

      if (isEditing) {
        // Update existing popup
        const { error: updateError } = await supabase
          .from('popup_announcements')
          .update({
            ...popupData,
            updated_at: new Date().toISOString()
          })
          .eq('id', popupId);

        if (updateError) throw updateError;

        // Update college associations if not global
        if (!isGlobal) {
          // First delete all existing college associations
          const { error: deleteError } = await supabase
            .from('popup_announcement_colleges')
            .delete()
            .eq('popup_id', popupId);
            
          if (deleteError) throw deleteError;
          
          // Then insert new college associations
          if (selectedColleges.length > 0) {
            const collegeAssociations = selectedColleges.map(collegeId => ({
              popup_id: popupId,
              college_id: collegeId
            }));
            
            const { error: insertError } = await supabase
              .from('popup_announcement_colleges')
              .insert(collegeAssociations);
              
            if (insertError) throw insertError;
          }
        }

        toast({
          title: "Popup Announcement Updated",
          description: "Your popup announcement has been successfully updated.",
        });
      } else {
        // Create new popup
        const { data: newPopup, error: insertError } = await supabase
          .from('popup_announcements')
          .insert({
            ...popupData,
            created_by: profile.id
          })
          .select();

        if (insertError) throw insertError;

        // Insert college associations if not global
        if (!isGlobal && newPopup && newPopup.length > 0) {
          const newPopupId = newPopup[0].id;
          
          if (selectedColleges.length > 0) {
            const collegeAssociations = selectedColleges.map(collegeId => ({
              popup_id: newPopupId,
              college_id: collegeId
            }));
            
            const { error: associationError } = await supabase
              .from('popup_announcement_colleges')
              .insert(collegeAssociations);
              
            if (associationError) throw associationError;
          }
        }

        toast({
          title: "Popup Announcement Created",
          description: "Your popup announcement has been successfully created.",
        });
      }

      router.push('/dashboard/popup-announcements');
    } catch (err) {
      console.error('Error saving popup announcement:', err);
      setError('Failed to save popup announcement. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Preview component
  const PopupPreview = () => {
    // Format selected college names for display
    const selectedCollegeNames = selectedColleges
      .map(id => colleges.find(c => c.id === id)?.name || '')
      .filter(name => name !== '');
      
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-50" onClick={() => setPreviewOpen(false)} />
        <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden">
          <div className="flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-black">Popup Preview</h2>
              <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm">
                {/* Image */}
                {previewUrl && (
                  <div className="mb-4">
                    <Image
                      src={previewUrl}
                      alt={title}
                      width={400}
                      height={200}
                      className="w-full h-auto object-cover rounded-md"
                    />
                  </div>
                )}
                
                {/* Title and subtitle */}
                <div className="mb-3">
                  <h3 className="text-xl font-bold text-black">{title}</h3>
                  {subtitle && (
                    <p className="text-gray-600 mt-1">{subtitle}</p>
                  )}
                </div>
                
                {/* Content */}
                <div className="mb-4 text-black">
                  {content}
                </div>
                
                {/* Button (if specified) */}
                {buttonText && (
                  <div className="mt-4">
                    <Button className="w-full">
                      {buttonText}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Popup details */}
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Status:</strong> {isActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Show once per user:</strong> {showOncePerUser ? 'Yes' : 'No'}</p>
                <p><strong>Audience:</strong> {isGlobal 
                  ? 'Global (All colleges)' 
                  : selectedCollegeNames.length > 0 
                    ? `${selectedCollegeNames.length} colleges selected: ${selectedCollegeNames.join(', ')}` 
                    : 'No colleges selected'
                }</p>
                <p><strong>Start date:</strong> {startDate ? new Date(startDate).toLocaleString() : 'Not set'}</p>
                {endDate && <p><strong>End date:</strong> {new Date(endDate).toLocaleString()}</p>}
              </div>
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <Button onClick={() => setPreviewOpen(false)}>Close Preview</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/popup-announcements')}
          className="mr-2 text-black"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-black">
          {isEditing ? 'Edit Popup Announcement' : 'Create Popup Announcement'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-300 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-black">Popup Details</CardTitle>
          <CardDescription className="text-black">
            {isEditing 
              ? 'Edit the details of this popup announcement'
              : 'Create a new popup announcement to display to users'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Basic Information */}
              <div>
                <Label htmlFor="title" className="text-black">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter popup title"
                  required
                  className="text-black"
                />
              </div>

              <div>
                <Label htmlFor="subtitle" className="text-black">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional subtitle"
                  className="text-black"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-black">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the popup content"
                  rows={4}
                  required
                  className="text-black"
                />
              </div>

              {/* Image Upload */}
              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <h3 className="text-lg font-medium text-black">Popup Image</h3>
                </div>

                {previewUrl && (
                  <div className="relative">
                    <Image
                      src={previewUrl}
                      alt="Popup image preview"
                      width={400}
                      height={200}
                      className="w-full h-auto max-h-60 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                        if (isEditing) {
                          setImageUrl(null);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div>
                  <Label htmlFor="image-upload" className="text-black">
                    {previewUrl ? 'Replace image' : 'Upload an image (optional)'}
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-black"
                  />
                </div>
              </div>

              {/* Button Options */}
              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-black">Button (Optional)</h3>
                </div>

                <div>
                  <Label htmlFor="button-text" className="text-black">Button Text</Label>
                  <Input
                    id="button-text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="E.g., Learn More, Get Started"
                    className="text-black"
                  />
                </div>

                <div>
                  <Label htmlFor="button-link" className="text-black">Button Link</Label>
                  <Input
                    id="button-link"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="https://example.com"
                    className="text-black"
                  />
                </div>
              </div>

              {/* Date and Visibility Settings */}
              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-black">Visibility Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date" className="text-black">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="text-black"
                    />
                  </div>

                  <div>
                    <Label htmlFor="end-date" className="text-black">End Date (Optional)</Label>
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-black"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked === true)}
                  />
                  <Label htmlFor="is-active" className="text-black">
                    Active (popup will be shown to users)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-once"
                    checked={showOncePerUser}
                    onCheckedChange={(checked) => setShowOncePerUser(checked === true)}
                  />
                  <Label htmlFor="show-once" className="text-black">
                    Show once per user
                  </Label>
                </div>
              </div>

              {/* Audience Settings - Updated for multiple college selection */}
              <div className="border p-4 rounded-md space-y-4">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <h3 className="text-lg font-medium text-black">Audience</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-global"
                    checked={isGlobal}
                    onCheckedChange={(checked) => {
                      setIsGlobal(checked === true);
                      if (checked === true) {
                        setSelectedColleges([]);
                      }
                    }}
                  />
                  <Label htmlFor="is-global" className="text-black">
                    Global (show to all colleges)
                  </Label>
                </div>

                {!isGlobal && (
                  <div className="mt-4">
                    <Label className="text-black mb-2 block">
                      Select Colleges *
                    </Label>
                    
                    {/* Search input for colleges */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search colleges..."
                        value={collegeSearchQuery}
                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                        className="pl-10 text-black"
                      />
                    </div>
                    
                    {/* Selected college count */}
                    <div className="mb-2 text-sm text-gray-500">
                      {selectedColleges.length} {selectedColleges.length === 1 ? 'college' : 'colleges'} selected
                    </div>
                    
                    {/* College selection list */}
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {filteredColleges.length > 0 ? (
                        filteredColleges.map(college => (
                          <div 
                            key={college.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer ${
                              selectedColleges.includes(college.id) ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => toggleCollegeSelection(college.id)}
                          >
                            <span className="text-black">{college.name}</span>
                            {selectedColleges.includes(college.id) && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-500 text-center">
                          No colleges found
                        </div>
                      )}
                    </div>
                    
                    {/* Helper text */}
                    {selectedColleges.length === 0 && !isGlobal && (
                      <div className="mt-2 text-sm text-red-500">
                        Please select at least one college or make the popup global
                      </div>
                    )}
                    
                    {/* Actions for college selection */}
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedColleges([])}
                        disabled={selectedColleges.length === 0}
                      >
                        Clear All
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedColleges(colleges.map(c => c.id))}
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!title}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/popup-announcements')}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={formLoading || (!isGlobal && selectedColleges.length === 0)}
              >
                {formLoading ? 'Saving...' : isEditing ? 'Update Popup' : 'Create Popup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewOpen && <PopupPreview />}
    </div>
  );
}