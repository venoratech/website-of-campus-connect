// src/components/admin/TaxRateSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PencilIcon, CheckIcon, XIcon, RefreshCwIcon } from 'lucide-react';

const TaxRateSettings = () => {
  const [taxRate, setTaxRate] = useState<string>('');
  const [taxDescription, setTaxDescription] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTaxRate();
  }, []);

  const fetchTaxRate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('system_configurations')
        .select('value')
        .eq('key', 'tax_rate')
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const percentage = data.value.percentage || 8.25;
        const description = data.value.description || 'Service Fees';
        
        setTaxRate(percentage.toString());
        setTaxDescription(description);
      }
    } catch (err) {
      console.error('Error fetching tax rate:', err);
      setError('Failed to load tax rate settings. Using default values.');
      
      // Set default values if fetch fails
      setTaxRate('8.25');
      setTaxDescription('Service Fees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate input
    if (!taxRate.trim()) {
      setError('Tax rate cannot be empty');
      return;
    }
    
    const parsedRate = parseFloat(taxRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setError('Please enter a valid tax rate between 0 and 100');
      return;
    }
    
    if (!taxDescription.trim()) {
      setError('Description cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('system_configurations')
        .update({
          value: { 
            percentage: parsedRate, 
            description: taxDescription 
          },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'tax_rate');
        
      if (error) {
        throw error;
      }
      
      setSuccess('Tax rate settings updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating tax rate:', err);
      setError('Failed to update tax rate settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-gray-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-black">Tax Rate Settings</CardTitle>
        {!isEditing ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <span className="sr-only">Edit</span>
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </Button>
        ) : (
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <span className="sr-only">Cancel</span>
              <XIcon className="h-4 w-4 text-gray-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleSave}
              disabled={isSaving}
            >
              <span className="sr-only">Save</span>
              <CheckIcon className="h-4 w-4 text-green-600" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCwIcon className="h-5 w-5 mr-2 text-gray-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading tax settings...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Tax Rate (%)</p>
                {isEditing ? (
                  <Input
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="max-w-[120px] h-8 text-right"
                    placeholder="8.25"
                  />
                ) : (
                  <p className="text-sm font-semibold text-black">{taxRate}%</p>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700">Display Name</p>
                {isEditing ? (
                  <Input
                    value={taxDescription}
                    onChange={(e) => setTaxDescription(e.target.value)}
                    className="max-w-[200px] h-8 text-right"
                    placeholder="Service Fees"
                  />
                ) : (
                  <p className="text-sm font-semibold text-black">{taxDescription}</p>
                )}
              </div>
            </div>
            
            <div className="pt-2 text-xs text-gray-500">
              <p>This tax rate is applied to the subtotal of all food orders. It will appear on the customer receipt as &quot;{taxDescription}&quot;.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxRateSettings;