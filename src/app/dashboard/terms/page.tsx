// app/dashboard/terms/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, PlusCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { TermsForm } from '@/components/admin/TermsForm';
import { TermsStatistics } from '@/components/admin/TermsStatistics';
import { TermsPreview } from '@/components/admin/TermsPreview';

// Define types for database response structures
type RawTermsData = {
  id: string;
  title: string;
  content: string;
  type: string;
  version: number;
  is_current: boolean;
  college_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  colleges?: {
    name: string | null;
  };
};

type TermsAndConditions = {
  id: string;
  title: string;
  content: string;
  type: string;
  version: number;
  is_current: boolean;
  college_id: string | null;
  college_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export default function TermsAdminPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [terms, setTerms] = useState<TermsAndConditions[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTerms, setActiveTerms] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermsAndConditions | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'preview'>('create');

  useEffect(() => {
    if (!isLoading && (!user || profile?.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, profile, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch terms and conditions with college names
        const { data: termsData, error: termsError } = await supabase
          .from('terms_and_conditions')
          .select(`
            *,
            colleges(name)
          `)
          .order('updated_at', { ascending: false });
          
        if (termsError) throw termsError;
        
        // Transform the data to include college_name
        const formattedTerms = (termsData as RawTermsData[]).map((term) => ({
          ...term,
          college_name: term.colleges?.name || 'Global'
        }));
        
        setTerms(formattedTerms || []);
        
        if (formattedTerms.length > 0) {
          setActiveTerms(formattedTerms[0].id);
          setSelectedTerm(formattedTerms[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user && profile?.role === 'admin') {
      fetchData();
    }
  }, [user, profile]);

  const handleTabChange = (termsId: string) => {
    setActiveTerms(termsId);
    const selected = terms.find(t => t.id === termsId) || null;
    setSelectedTerm(selected);
  };
  
  const handleCreateNew = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };
  
  const handleEdit = (term: TermsAndConditions) => {
    setSelectedTerm(term);
    setDialogMode('edit');
    setDialogOpen(true);
  };
  
  const handlePreview = (term: TermsAndConditions) => {
    setSelectedTerm(term);
    setDialogMode('preview');
    setDialogOpen(true);
  };
  
  const refreshTerms = async () => {
    try {
      // Reload the data
      const { data: termsData, error: termsError } = await supabase
        .from('terms_and_conditions')
        .select(`
          *,
          colleges(name)
        `)
        .order('updated_at', { ascending: false });
        
      if (termsError) throw termsError;
      
      // Transform the data to include college_name
      const formattedTerms = (termsData as RawTermsData[]).map((term) => ({
        ...term,
        college_name: term.colleges?.name || 'Global'
      }));
      
      setTerms(formattedTerms || []);
      
      // If we don't have an active term, set the first one
      if (formattedTerms.length > 0 && !activeTerms) {
        setActiveTerms(formattedTerms[0].id);
        setSelectedTerm(formattedTerms[0]);
      } else if (activeTerms) {
        // Update the selected term if it's active
        const selected = formattedTerms.find(t => t.id === activeTerms) || null;
        setSelectedTerm(selected);
      }
    } catch (error) {
      console.error('Error refreshing terms:', error);
    }
  };
  
  const handleFormSuccess = async (newTermsId?: string) => {
    await refreshTerms();
    
    // If we have a new terms ID, select it
    if (newTermsId) {
      setActiveTerms(newTermsId);
      const selected = terms.find(t => t.id === newTermsId) || null;
      setSelectedTerm(selected);
    }
    
    setDialogOpen(false);
  };
  
  const setTermAsCurrent = async (termsId: string) => {
    try {
      const { error } = await supabase.rpc('set_current_terms_version', {
        terms_id: termsId
      });
      
      if (error) throw error;
      
      await refreshTerms();
      
      toast({
        title: 'Success',
        description: 'Terms version has been set as current.',
      });
    } catch (error) {
      console.error('Error setting current version:', error);
      toast({
        title: 'Error',
        description: 'Failed to update current version. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-black">Terms and Conditions Management</h1>
        <Button onClick={handleCreateNew} className="text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>
      
      {terms.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-black">
              <p className="mb-4">No terms and conditions found. Create your first one to get started.</p>
              <Button onClick={handleCreateNew} className="text-white">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Terms and Conditions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTerms || undefined} onValueChange={handleTabChange} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="w-full overflow-x-auto flex-wrap">
              {terms.map((term) => (
                <TabsTrigger key={term.id} value={term.id} className="relative text-black">
                  {term.title}
                  {term.is_current && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {terms.map((term) => (
            <TabsContent key={term.id} value={term.id} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Card className="h-full">
                    <div className="flex items-center justify-between p-6 pb-2">
                      <div>
                        <h2 className="text-xl font-semibold text-black">{term.title}</h2>
                        <p className="text-sm text-black">
                          Version {term.version} | Type: {term.type} | 
                          {term.college_id ? ` College: ${term.college_name}` : ' Global'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(term)}
                          className="text-black border-black hover:bg-gray-100"
                        >
                          Preview
                        </Button>
                        {!term.is_current && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setTermAsCurrent(term.id)}
                            className="text-black border-black hover:bg-gray-100"
                          >
                            Set as Current
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(term)}
                          className="text-black border-black hover:bg-gray-100"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="border rounded-md p-4 mt-4 h-[250px] overflow-y-auto bg-gray-50">
                        <div className="whitespace-pre-wrap text-sm text-black">
                          {term.content}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-between text-sm text-black">
                        <span>Created: {new Date(term.created_at).toLocaleDateString()}</span>
                        <span>Last Updated: {new Date(term.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
                
                <div className="md:w-1/3">
                  <TermsStatistics termsId={term.id} />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      
      {/* Dialog for Create/Edit/Preview */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogMode === 'preview' ? "max-w-4xl" : "max-w-5xl"}>
          <DialogHeader>
            <DialogTitle className="text-black">
              {dialogMode === 'create' && 'Create New Terms and Conditions'}
              {dialogMode === 'edit' && 'Edit Terms and Conditions'}
              {dialogMode === 'preview' && 'Terms and Conditions Preview'}
            </DialogTitle>
          </DialogHeader>
          
          {dialogMode === 'preview' && selectedTerm && (
            <TermsPreview terms={selectedTerm} />
          )}
          
          {(dialogMode === 'create' || dialogMode === 'edit') && (
            <TermsForm
              initialData={dialogMode === 'edit' ? selectedTerm || undefined : undefined}
              userId={user?.id || ''}
              onSuccessAction={handleFormSuccess}
              onCancelAction={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}