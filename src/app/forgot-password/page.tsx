// app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      // Set the redirect URL that the user will be sent to after clicking the reset link
      const resetPasswordURL = `${window.location.origin}/reset-password`;
      
      // Request password reset from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordURL,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password reset instructions have been sent to your email address. Please check your inbox.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1 bg-white">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">Forgot Password</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 bg-white">
            {error && (
              <div className="bg-red-50 p-3 rounded-md border border-red-300">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 p-3 rounded-md border border-green-300">
                <p className="text-green-800 text-sm font-medium">{success}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-800 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                disabled={!!success}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 bg-white">
            <Button 
              type="submit" 
              className="w-full bg-gray-800 hover:bg-black text-white" 
              disabled={isLoading || !!success}
            >
              {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
            <div className="text-sm text-center text-gray-600">
              Remember your password?{' '}
              <Link href="/login" className="text-gray-800 font-medium hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}