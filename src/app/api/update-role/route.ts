// app/api/update-role/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await req.json();
    
    if (!userId || !role || !['student', 'vendor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
    }
    
    // Create admin client with service role key (has bypass RLS capabilities)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    
    // This will bypass any RLS policies and force update the user's role
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId);
      
    if (error) {
      console.error('Admin role update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-role API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}