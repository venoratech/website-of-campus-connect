// components/admin/TermsForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; // Using Checkbox instead of Switch
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

type College = {
  id: string;
  name: string;
};

// Define the form state with a more generic type
interface FormState {
  title: string;
  content: string;
  type: string;
  version: number;
  college_id: string | null;
  is_current: boolean; // Use boolean instead of specific literal type
}

type TermsFormProps = {
  initialData?: {
    id?: string;
    title: string;
    content: string;
    type: string;
    version: number;
    college_id: string | null;
    is_current: boolean;
  };
  userId: string;
  onSuccessAction?: (newTermsId?: string) => void;
  onCancelAction?: () => void;
};

export function TermsForm({ initialData, userId, onSuccessAction, onCancelAction }: TermsFormProps) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formState, setFormState] = useState<FormState>({
    title: initialData?.title || '',
    content: initialData?.content || '',
    type: initialData?.type || 'general',
    version: initialData?.version || 1,
    college_id: initialData?.college_id || null,
    is_current: initialData?.is_current || true,
  });
  const [fetchingColleges, setFetchingColleges] = useState(true);

  useEffect(() => {
    const loadColleges = async () => {
      try {
        const { data, error } = await supabase
          .from('colleges')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        setColleges(data || []);
      } catch (error) {
        console.error('Error loading colleges:', error);
        toast({
          title: 'Error',
          description: 'Failed to load colleges. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setFetchingColleges(false);
      }
    };
    
    loadColleges();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate form
      if (!formState.title.trim() || !formState.content.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Title and content are required.',
          variant: 'destructive',
        });
        return;
      }
      
      let termsId = initialData?.id;
      
      // Update existing terms
      if (termsId) {
        const { error } = await supabase
          .from('terms_and_conditions')
          .update({
            title: formState.title,
            content: formState.content,
            type: formState.type,
            version: formState.version,
            college_id: formState.college_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', termsId);
          
        if (error) throw error;
      } 
      // Insert new terms
      else {
        const { data, error } = await supabase
          .from('terms_and_conditions')
          .insert({
            title: formState.title,
            content: formState.content,
            type: formState.type,
            version: formState.version,
            college_id: formState.college_id,
            created_by: userId,
            is_current: false, // Initially set to false, update if needed
          })
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          termsId = data[0].id;
        }
      }
      
      // Set as current if requested
      if (formState.is_current && termsId) {
        const { error } = await supabase.rpc('set_current_terms_version', {
          terms_id: termsId
        });
        
        if (error) throw error;
      }
      
      toast({
        title: 'Success',
        description: initialData?.id ? 
          'Terms and conditions updated successfully.' : 
          'New terms and conditions created successfully.',
      });
      
      if (onSuccessAction) onSuccessAction(termsId);
    } catch (error) {
      console.error('Error saving terms:', error);
      toast({
        title: 'Error',
        description: 'Failed to save terms and conditions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingColleges) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-black">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-black">Title</Label>
          <Input
            id="title"
            value={formState.title}
            onChange={(e) => setFormState({...formState, title: e.target.value})}
            placeholder="e.g., General Terms of Service"
            required
            className="text-black"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type" className="text-black">Type</Label>
          <Select
            value={formState.type}
            onValueChange={(value) => setFormState({...formState, type: value})}
            required
          >
            <SelectTrigger id="type" className="text-black">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="text-black">
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="marketplace">Marketplace</SelectItem>
              <SelectItem value="food_service">Food Service</SelectItem>
              <SelectItem value="privacy">Privacy Policy</SelectItem>
              <SelectItem value="community">Community Guidelines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="version" className="text-black">Version</Label>
          <Input
            id="version"
            type="number"
            min="1"
            value={formState.version}
            onChange={(e) => setFormState({...formState, version: parseInt(e.target.value) || 1})}
            required
            className="text-black"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="college" className="text-black">College (Leave empty for global)</Label>
          <Select
            value={formState.college_id || "null"}
            onValueChange={(value) => setFormState({...formState, college_id: value === "null" ? null : value})}
          >
            <SelectTrigger id="college" className="text-black">
              <SelectValue placeholder="Global (All Colleges)" />
            </SelectTrigger>
            <SelectContent className="text-black">
              <SelectItem value="null">Global (All Colleges)</SelectItem>
              {colleges.map((college) => (
                <SelectItem key={college.id} value={college.id}>{college.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content" className="text-black">Content</Label>
        <Textarea
          id="content"
          value={formState.content}
          onChange={(e) => setFormState({...formState, content: e.target.value})}
          placeholder="Enter the full text of your terms and conditions here..."
          className="min-h-[300px] text-black"
          required
        />
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Using Checkbox with proper type handling */}
        <Checkbox
          id="is_current"
          checked={formState.is_current}
          onCheckedChange={(checked) => {
            if (checked === 'indeterminate') return;
            setFormState({...formState, is_current: checked});
          }}
        />
        <Label 
          htmlFor="is_current" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black"
        >
          Set as current version (will replace existing current version of same type{formState.college_id ? ' for this college' : ''})
        </Label>
      </div>
      
      {/* Updated form buttons with clearer styling */}
<div className="flex justify-end space-x-4 pt-6">
  <Button 
    type="button" 
    variant="outline" 
    onClick={onCancelAction} 
    disabled={loading}
    className="text-black border-black hover:bg-gray-100 px-6"
  >
    Cancel
  </Button>
  <Button 
    type="submit" 
    disabled={loading}
    className="bg-black text-white hover:bg-gray-800 px-8 font-medium shadow-md"
  >
    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {initialData?.id ? 'Update' : 'Create'}
  </Button>
</div>
    </form>
  );
}