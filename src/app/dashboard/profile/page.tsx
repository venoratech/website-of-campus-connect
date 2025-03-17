// app/dashboard/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Camera } from 'lucide-react';

// Define the profile update data interface
interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_image_url: string;
  student_id?: string;
  graduation_year?: number | null;
}

export default function ProfilePage() {
  const { profile, user, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [studentId, setStudentId] = useState('');
  const [graduationYear, setGraduationYear] = useState<number | ''>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhoneNumber(profile.phone_number || '');
      setProfileImageUrl(profile.profile_image_url || '');
      
      if (profile.role === 'student') {
        setStudentId(profile.student_id || '');
        setGraduationYear(profile.graduation_year || '');
      }
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: ProfileUpdateData = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        profile_image_url: profileImageUrl,
      };

      // Add student-specific fields if needed
      if (profile?.role === 'student') {
        updateData.student_id = studentId;
        updateData.graduation_year = graduationYear || null;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating profile');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-black">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">Profile Settings</h1>
        <p className="text-black">
          Manage your personal information and settings
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

      <Card className="border-gray-300">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-black">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black font-medium">Email</Label>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-black" />
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-gray-50 text-black border-gray-300"
                />
              </div>
              <p className="text-xs text-black">
                Your email address is used for login and cannot be changed
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-black font-medium">First Name</Label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-black" />
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    className="text-black border-gray-300"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-black font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your last name"
                  className="text-black border-gray-300"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-black font-medium">Phone Number</Label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-black" />
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Your phone number"
                  className="text-black border-gray-300"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profileImageUrl" className="text-black font-medium">Profile Image URL</Label>
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4 text-black" />
                <Input
                  id="profileImageUrl"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  placeholder="https://example.com/profile.jpg"
                  className="text-black border-gray-300"
                />
              </div>
              <p className="text-xs text-black">
                Link to an image for your profile (upload to a service like Cloudinary first)
              </p>
            </div>
            
            {profile?.role === 'student' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-black font-medium">Student ID</Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Your student ID"
                    className="text-black border-gray-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="graduationYear" className="text-black font-medium">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Expected graduation year"
                    className="text-black border-gray-300"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label className="text-black font-medium">Account Type</Label>
              <div className="p-2 bg-gray-50 rounded-md border border-gray-300">
                <p className="text-black capitalize">{profile?.role || 'User'}</p>
              </div>
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
        </form>
      </Card>
    </div>
  );
}