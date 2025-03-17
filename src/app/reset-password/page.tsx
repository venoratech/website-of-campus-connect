// app/reset-password/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// Create a wrapper component that uses searchParams
function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'verifying' | 'valid' | 'invalid'>('verifying');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the token from the URL query params
  const token = searchParams.get('token');
  
  // On page load, verify the token
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        setError('Missing password reset token');
        return;
      }

      try {
        // Verify the token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });

        if (error) {
          console.error('Error verifying token:', error);
          setTokenStatus('invalid');
          setError('Invalid or expired reset token. Please request a new password reset link.');
          return;
        }

        setTokenStatus('valid');
      } catch (err) {
        console.error('Exception verifying token:', err);
        setTokenStatus('invalid');
        setError('Failed to verify reset token. Please request a new password reset link.');
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tokenStatus !== 'valid') {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }

      setSuccess('Your password has been successfully reset. You can now log in with your new password.');
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please request a new reset link.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (tokenStatus === 'verifying') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-gray-200">
          <CardContent className="space-y-4 bg-white p-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
            <p className="text-center text-gray-600">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1 bg-white">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">Reset Password</CardTitle>
          <CardDescription className="text-center text-gray-600">
            {tokenStatus === 'valid' ? 'Enter your new password below' : 'Password Reset Link'}
          </CardDescription>
        </CardHeader>

        {tokenStatus === 'invalid' ? (
          <CardContent className="space-y-4 bg-white">
            <div className="bg-red-50 p-3 rounded-md border border-red-300">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
            <Button 
              onClick={() => router.push('/forgot-password')}
              className="w-full bg-gray-800 hover:bg-black text-white"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        ) : (
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
                <Label htmlFor="password" className="text-gray-800 font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-gray-300 bg-white text-gray-900"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-800 font-medium">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-gray-300 bg-white text-gray-900"
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
                {isLoading ? "Updating Password..." : "Reset Password"}
              </Button>
              
              <div className="text-sm text-center text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="text-gray-800 font-medium hover:underline">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-gray-200">
          <CardContent className="space-y-4 bg-white p-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
            <p className="text-center text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}