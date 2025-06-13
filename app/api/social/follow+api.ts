import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent following yourself
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot follow yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followed_id', userId)
      .maybeSingle();

    if (existingFollow) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Already following this user',
        alreadyFollowing: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from('followers')
      .insert({
        follower_id: user.id,
        followed_id: userId,
      });

    if (followError) {
      throw followError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully followed user'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Follow user error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to follow user',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}