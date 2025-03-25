// app/api/admin/pickup-settings/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for improved authentication handling

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Authorization error:', profileError || 'User is not an admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get the pickup interval setting
    const { data, error } = await supabase
      .from('system_configurations')
      .select('value')
      .eq('key', 'pickup_interval')
      .single();
    
    if (error) {
      // If the setting doesn't exist yet, return default value
      if (error.code === 'PGRST116') {
        return NextResponse.json({ interval: 15 });
      }
      
      console.error('Error fetching pickup interval:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ interval: data.value.minutes });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Authorization error:', profileError || 'User is not an admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get the interval from request body
    const { minutes } = await request.json();
    
    if (typeof minutes !== 'number' || minutes < 5 || minutes > 60) {
      return NextResponse.json({ error: 'Invalid interval. Must be between 5 and 60 minutes.' }, { status: 400 });
    }
    
    // Check if the configuration exists
    const { data: existingConfig } = await supabase
      .from('system_configurations')
      .select('id')
      .eq('key', 'pickup_interval')
      .maybeSingle();
    
    let updateError;
    
    if (!existingConfig) {
      // Insert new configuration if it doesn't exist
      const { error: insertError } = await supabase
        .from('system_configurations')
        .insert({
          key: 'pickup_interval',
          value: { minutes },
          updated_at: new Date().toISOString()
        });
      
      updateError = insertError;
    } else {
      // Update existing configuration
      const { error: updateConfigError } = await supabase
        .from('system_configurations')
        .update({
          value: { minutes },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'pickup_interval');
      
      updateError = updateConfigError;
    }
    
    if (updateError) {
      console.error('Error updating pickup interval:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, interval: minutes });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}