// components/admin/TermsPreview.tsx
'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type TermsPreviewProps = {
  terms: {
    id: string;
    title: string;
    content: string;
    type: string;
    version: number;
    is_current: boolean;
    college_id: string | null;
    college_name?: string;
    created_at: string;
    updated_at: string;
  };
};

export function TermsPreview({ terms }: TermsPreviewProps) {
  const [hasChecked, setHasChecked] = React.useState(false);

  // In an actual implementation, we would handle the acceptance logic here
  const handleAccept = () => {
    // Mock acceptance function
    console.log('User accepted terms:', terms.id);
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-black">{terms.title}</CardTitle>
            <CardDescription className="text-black">
              Version {terms.version} - Last updated: {formatDate(terms.updated_at)}
            </CardDescription>
          </div>
          {terms.is_current && (
            <Badge className="bg-green-500" variant="secondary">
              Current Version
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="border rounded-md p-4 my-4 max-h-96 overflow-y-auto bg-gray-50 text-black">
          {terms.content.includes('#') || terms.content.includes('*') ? (
            <div className="prose prose-sm max-w-none text-black">
              <ReactMarkdown>{terms.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm text-black">{terms.content}</div>
          )}
        </div>
        
        <div className="flex items-start space-x-2 mt-6">
          <Checkbox
            id="accept-preview"
            checked={hasChecked}
            onCheckedChange={(checked) => setHasChecked(checked as boolean)}
            className="mt-1"
          />
          <Label
            htmlFor="accept-preview"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black"
          >
            I have read and agree to the terms and conditions
          </Label>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="text-sm text-black border-black hover:bg-gray-100">
          Later
        </Button>
        <Button 
          disabled={!hasChecked}
          onClick={handleAccept}
          className="text-sm bg-primary text-white hover:bg-primary/90"
        >
          Accept
        </Button>
      </CardFooter>
    </Card>
  );
}