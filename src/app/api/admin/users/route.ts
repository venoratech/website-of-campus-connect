// app/api/admin/users/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {  // Removed the unused parameter
  // Create the Supabase client with an async cookies function
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ 
    cookies: () => Promise.resolve(cookieStore) 
  });
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rest of the handler remains the same...
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }
    
    return NextResponse.json({ users });
  } catch (err) {
    console.error('Unexpected error in users API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}