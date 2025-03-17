// app/api/update-user-profile/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, firstName, lastName, role, isApproved, isIdVerified } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }
    
    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    
    // This will bypass any RLS policies and update the user's profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role,
        is_approved: isApproved,
        is_id_verified: isIdVerified,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (error) {
      console.error('Admin profile update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('Error in update-user-profile API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}