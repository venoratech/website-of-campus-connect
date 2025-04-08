// app/api/delete-user/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Get authenticated user session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check current user's role
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 403 }
      );
    }
    
    // Only admins, super_admins can delete users
    if (!['admin', 'super_admin'].includes(currentUserProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Check if trying to delete a super_admin (only super_admin can delete super_admin)
    if (currentUserProfile.role !== 'super_admin') {
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (targetUser?.role === 'super_admin') {
        return NextResponse.json(
          { error: 'Only a super admin can delete another super admin' },
          { status: 403 }
        );
      }
    }
    
    // First, delete the profile
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileDeleteError) {
      return NextResponse.json(
        { error: `Failed to delete user profile: ${profileDeleteError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}