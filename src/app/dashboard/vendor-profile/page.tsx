// app/dashboard/vendor-profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, FoodVendor } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Phone, Mail, Globe, Camera } from 'lucide-react';

interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: '08:00', close: '17:00', closed: false },
  tuesday: { open: '08:00', close: '17:00', closed: false },
  wednesday: { open: '08:00', close: '17:00', closed: false },
  thursday: { open: '08:00', close: '17:00', closed: false },
  friday: { open: '08:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '15:00', closed: false },
  sunday: { open: '10:00', close: '15:00', closed: true },
};

export default function VendorProfilePage() {
  const { profile, isLoading } = useAuth();
  const [vendor, setVendor] = useState<FoodVendor | null>(null);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  // New state for file uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== 'vendor') {
        setError('Only vendors can access this page');
        return;
      }

      // Fetch colleges
      const { data: collegesData } = await supabase
        .from('colleges')
        .select('id, name');
      
      if (collegesData) {
        setColleges(collegesData);
      }

      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('profile_id', profile.id)
        .single();
      
      if (vendorError && vendorError.code !== 'PGRST116') {
        setError('Error fetching vendor profile');
        console.error(vendorError);
        return;
      }

      if (vendorData) {
        setVendor(vendorData);
        setVendorName(vendorData.vendor_name);
        setDescription(vendorData.description || '');
        setLocation(vendorData.location);
        setCollegeId(vendorData.college_id);
        setPrepTime(vendorData.average_preparation_time || '');
        setLogoUrl(vendorData.logo_url || '');
        setBannerUrl(vendorData.banner_url || '');
        
        if (vendorData.business_hours) {
          setBusinessHours(vendorData.business_hours as BusinessHours);
        }
      }
    };

    if (profile) {
      fetchData();
    }
  }, [profile]);

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>, field: 'logo' | 'banner') => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      if (field === 'logo') setLogoFile(files[0]);
      else setBannerFile(files[0]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
    if (event.target.files && event.target.files.length > 0) {
      if (field === 'logo') setLogoFile(event.target.files[0]);
      else setBannerFile(event.target.files[0]);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `public/${fileName}`; // Path inside the bucket

    console.log('Uploading file:', filePath);
    const { data, error } = await supabase.storage
      .from('menu-images') // Use the same bucket as menu items, or create 'vendor-images'
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error details:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('Upload successful, getting public URL:', data.path);
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Validate form
    if (!vendorName || !location || !collegeId) {
      setError('Please fill all required fields');
      setIsSubmitting(false);
      return;
    }

    let newLogoUrl = logoUrl;
    let newBannerUrl = bannerUrl;

    try {
      // Handle logo upload
      if (logoFile) {
        newLogoUrl = await uploadImage(logoFile);
      }

      // Handle banner upload
      if (bannerFile) {
        newBannerUrl = await uploadImage(bannerFile);
      }

      // Prepare data
      const vendorData = {
        profile_id: profile?.id,
        vendor_name: vendorName,
        description,
        location,
        college_id: collegeId,
        average_preparation_time: prepTime || null,
        logo_url: newLogoUrl || null,
        banner_url: newBannerUrl || null,
        business_hours: businessHours,
      };

      if (vendor) {
        // Update existing vendor
        const { error: updateError } = await supabase
          .from('food_vendors')
          .update(vendorData)
          .eq('id', vendor.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new vendor
        const { error: insertError } = await supabase
          .from('food_vendors')
          .insert(vendorData);
        
        if (insertError) throw insertError;
      }

      setSuccess('Vendor profile saved successfully');
      
      // Refetch vendor data
      const { data: updatedVendor } = await supabase
        .from('food_vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();
      
      if (updatedVendor) {
        setVendor(updatedVendor);
        setLogoUrl(updatedVendor.logo_url || '');
        setBannerUrl(updatedVendor.banner_url || '');
        setLogoFile(null); // Reset file after successful upload
        setBannerFile(null); // Reset file after successful upload
      }
    } catch (err: any) {
      setError(err.message || 'Error saving vendor profile');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessHoursChange = (
    day: keyof BusinessHours,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  if (profile?.role !== 'vendor') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-black">Only vendors can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Vendor Profile</h1>
        <p className="text-black">
          Manage your business information and settings
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

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendorName" className="text-black font-medium">Business Name*</Label>
                <Input
                  id="vendorName"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Your business name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your business"
                  rows={4}
                  className="border-gray-300 bg-white text-black"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location" className="text-black font-medium">Location on Campus*</Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-black" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where is your business located"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collegeId" className="text-black font-medium">College*</Label>
                <Select
                  value={collegeId}
                  onValueChange={setCollegeId}
                >
                  <SelectTrigger className="border-gray-300 bg-white text-black">
                    <SelectValue placeholder="Select a college" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black">
                    {colleges.map((college) => (
                      <SelectItem key={college.id} value={college.id} className="text-black">
                        {college.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prepTime" className="text-black font-medium">Average Preparation Time (minutes)</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-black" />
                  <Input
                    id="prepTime"
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="15"
                    min="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media and Links */}
          <Card className="border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Media and Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black font-medium">Logo Upload</Label>
                <div
                  className="border-2 border-dashed border-gray-300 p-4 rounded-md text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleFileDrop(e, 'logo')}
                  onClick={() => document.getElementById('logoUpload')?.click()}
                >
                  {logoFile ? (
                    <p className="text-black">{logoFile.name}</p>
                  ) : logoUrl ? (
                    <p className="text-black">Existing logo: {logoUrl.split('/').pop()}</p>
                  ) : (
                    <p className="text-black">Drag and drop a logo here, or click to select a file</p>
                  )}
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'logo')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-black font-medium">Banner Upload</Label>
                <div
                  className="border-2 border-dashed border-gray-300 p-4 rounded-md text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleFileDrop(e, 'banner')}
                  onClick={() => document.getElementById('bannerUpload')?.click()}
                >
                  {bannerFile ? (
                    <p className="text-black">{bannerFile.name}</p>
                  ) : bannerUrl ? (
                    <p className="text-black">Existing banner: {bannerUrl.split('/').pop()}</p>
                  ) : (
                    <p className="text-black">Drag and drop a banner here, or click to select a file</p>
                  )}
                  <input
                    id="bannerUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'banner')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="md:col-span-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-black">Business Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="space-y-2 p-3 border border-gray-300 rounded-md">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize text-black font-medium">{day}</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`${day}-closed`}
                          checked={businessHours[day].closed}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'closed', e.target.checked)
                          }
                          className="text-black"
                        />
                        <Label htmlFor={`${day}-closed`} className="text-sm text-black">Closed</Label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`${day}-open`} className="text-xs text-black">Open</Label>
                        <Input
                          id={`${day}-open`}
                          type="time"
                          value={businessHours[day].open}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'open', e.target.value)
                          }
                          disabled={businessHours[day].closed}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${day}-close`} className="text-xs text-black">Close</Label>
                        <Input
                          id={`${day}-close`}
                          type="time"
                          value={businessHours[day].close}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'close', e.target.value)
                          }
                          disabled={businessHours[day].closed}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="ml-auto bg-gray-800 hover:bg-black text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}