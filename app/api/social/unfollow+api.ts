import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

export async function DELETE(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
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

    // Delete follow relationship
    const { error: unfollowError } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', userId);

    if (unfollowError) {
      throw unfollowError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully unfollowed user'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to unfollow user',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}