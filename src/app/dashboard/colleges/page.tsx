// app/dashboard/colleges/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, College } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { PlusCircle, Edit, Trash, Building, MapPin } from 'lucide-react';

export default function CollegesPage() {
  const { profile, isLoading } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [isAddingCollege, setIsAddingCollege] = useState(false);
  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchColleges = async () => {
      if (profile?.role !== 'admin') {
        setError('Only administrators can access this page');
        return;
      }

      try {
        const { data, error: collegesError } = await supabase
          .from('colleges')
          .select('*')
          .order('name');
        
        if (collegesError) throw collegesError;
        
        setColleges(data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching colleges');
        console.error(err);
      }
    };

    if (profile) {
      fetchColleges();
    }
  }, [profile]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setCountry('');
    setLogoUrl('');
    setWebsiteUrl('');
    setEditingCollegeId(null);
  };

  const handleEditCollege = (college: College) => {
    setEditingCollegeId(college.id);
    
    setName(college.name);
    setAddress(college.address);
    setCity(college.city);
    setState(college.state);
    setZipCode(college.zip_code);
    setCountry(college.country);
    setLogoUrl(college.logo_url || '');
    setWebsiteUrl(college.website_url || '');
    
    setIsAddingCollege(true);
  };

  const handleSaveCollege = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!name || !address || !city || !state || !zipCode || !country) {
      setError('Please fill all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const collegeData = {
        name,
        address,
        city,
        state,
        zip_code: zipCode,
        country,
        logo_url: logoUrl || null,
        website_url: websiteUrl || null,
      };

      if (editingCollegeId) {
        // Update existing college
        const { error: updateError } = await supabase
          .from('colleges')
          .update(collegeData)
          .eq('id', editingCollegeId);
        
        if (updateError) throw updateError;
        
        setSuccess('College updated successfully');
        
        // Update local state
        setColleges(colleges.map(college => 
          college.id === editingCollegeId ? { ...college, ...collegeData } : college
        ));
      } else {
        // Create new college
        const { data, error: insertError } = await supabase
          .from('colleges')
          .insert(collegeData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        setSuccess('College added successfully');
        
        // Update local state
        if (data) {
          setColleges([...colleges, data]);
        }
      }

      // Reset form
      resetForm();
      setIsAddingCollege(false);
    } catch (err: any) {
      setError(err.message || 'Error saving college');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollege = async (id: string) => {
    if (!confirm('Are you sure you want to delete this college? This action will affect all associated records.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('colleges')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setSuccess('College deleted successfully');
      
      // Update local state
      setColleges(colleges.filter(college => college.id !== id));
    } catch (err: any) {
      setError(err.message || 'Error deleting college');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredColleges = colleges.filter(college =>
    college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    college.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    college.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    college.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Colleges</h1>
          <p className="text-black">
            Manage colleges and educational institutions
          </p>
        </div>
        <Dialog open={isAddingCollege} onOpenChange={setIsAddingCollege}>
          <DialogTrigger asChild>
            <Button className="bg-gray-800 hover:bg-black text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add College
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white text-black border-gray-300">
            <DialogHeader>
              <DialogTitle className="text-black">{editingCollegeId ? 'Edit' : 'Add'} College</DialogTitle>
              <DialogDescription className="text-black">
                Enter the details for the educational institution
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black font-medium">College Name*</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="University of..."
                  required
                  className="bg-white text-black border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-black font-medium">Address*</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 University Ave"
                  required
                  className="bg-white text-black border-gray-300"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-black font-medium">City*</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="College Town"
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-black font-medium">State/Province*</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CA"
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-black font-medium">Zip/Postal Code*</Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="90210"
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-black font-medium">Country*</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="USA"
                    required
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-black font-medium">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="bg-white text-black border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="websiteUrl" className="text-black font-medium">Website URL</Label>
                <Input
                  id="websiteUrl"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://university.edu"
                  className="bg-white text-black border-gray-300"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsAddingCollege(false);
                }}
                className="border-gray-300 text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveCollege} 
                disabled={isSubmitting}
                className="bg-gray-800 hover:bg-black text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save College'}
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

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-black">All Colleges</h2>
          <Badge className="border-blue-400 bg-blue-50 text-blue-700 border">{colleges.length}</Badge>
        </div>
        <div className="w-1/3">
          <Input
            placeholder="Search colleges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white text-black border-gray-300"
          />
        </div>
      </div>

      {filteredColleges.length === 0 ? (
        <Card className="border-gray-300">
          <CardContent className="p-6 text-center">
            <p className="text-black">No colleges found. Add your first college!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-300">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-black">Name</TableHead>
                  <TableHead className="text-black">Location</TableHead>
                  <TableHead className="text-black">Website</TableHead>
                  <TableHead className="text-black">Added</TableHead>
                  <TableHead className="text-right text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.map((college) => (
                  <TableRow key={college.id} className="border-gray-200">
                    <TableCell className="font-medium flex items-center text-black">
                      {college.logo_url && (
                        <img 
                          src={college.logo_url} 
                          alt={`${college.name} logo`} 
                          className="h-8 w-8 rounded mr-2 object-contain"
                        />
                      )}
                      <span>{college.name}</span>
                    </TableCell>
                    <TableCell className="text-black">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-black mr-1" />
                        <span>{college.city}, {college.state}, {college.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-black">
                      {college.website_url ? (
                        <a 
                          href={college.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          Visit site
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-black">{formatDate(college.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCollege(college)}
                        className="text-black hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCollege(college.id)}
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