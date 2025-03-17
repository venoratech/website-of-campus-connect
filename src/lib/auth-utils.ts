// lib/auth-utils.ts
import { createClient } from '@supabase/supabase-js';

// Create a helper function to verify if a token is valid
// Note: This can only be used server-side with the service role key
export async function verifyResetToken(token: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  try {
    // Create an admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Verify the token - this is a simplified example
    // In a real implementation, you would use a more specific method
    // This approach just checks if the token is associated with a user
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return false;
  }
}

// This is a client-side function to configure the password reset
export function getPasswordResetRedirectUrl() {
  // Make sure this matches the path in your app
  return `${window.location.origin}/reset-password`;
}