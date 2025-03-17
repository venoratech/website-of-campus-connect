// app/api/deactivate-user/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }
    
    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    
    // This will bypass any RLS policies and update the user's status
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Admin user deactivation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deactivate-user API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}