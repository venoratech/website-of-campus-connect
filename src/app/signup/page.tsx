// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // The role is hardcoded to 'vendor' and never changes
  const VENDOR_ROLE = 'vendor' as const;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError('Please fill all required fields');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Signing up with role:', VENDOR_ROLE);
      
      // Store the role in localStorage as a backup
      localStorage.setItem('intended_role', VENDOR_ROLE);
      
      // Always pass 'vendor' as the role, never use a variable
      const { error: signUpError } = await signUp(email, password, 'vendor');
      
      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Show success message
        alert('Registration successful! Please check your email to confirm your account.');
        router.push('/login');
      }
    } catch (err: unknown) {
      const errorMessage = isErrorWithMessage(err) ? err.message : 'An error occurred during signup';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1 bg-white">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">Create a Vendor Account</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Enter your details to create your vendor account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 bg-white">
            {error && (
              <div className="bg-gray-100 p-3 rounded-md border border-gray-300">
                <p className="text-gray-800 text-sm font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-800 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-800 font-medium">Password</Label>
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
              <Label htmlFor="confirmPassword" className="text-gray-800 font-medium">Confirm Password</Label>
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
            <div className="space-y-2">
              <Label htmlFor="role" className="text-gray-800 font-medium">Account Type</Label>
              <div className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 font-medium">
                Vendor
              </div>
              {/* Triple-ensure that role is vendor */}
              <input type="hidden" name="role" value="vendor" id="role" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 bg-white">
            <Button 
              type="submit" 
              className="w-full bg-gray-800 hover:bg-black text-white" 
              disabled={isLoading}
            >
              {isLoading ? "Creating vendor account..." : "Create vendor account"}
            </Button>
            <div className="text-sm text-center text-gray-600">
              Already have an account?{' '}
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