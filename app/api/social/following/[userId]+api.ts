import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: ExpoRequest, { params }: { params: { userId: string } }): Promise<ExpoResponse> {
  try {
    const userId = params.userId;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current user (if authenticated)
    const authHeader = request.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    // Get following
    const { data, error } = await supabase
      .from('followers')
      .select(`
        followed:profiles!followers_followed_id_fkey(
          id, nickname, profile_picture, followers_count, following_count, created_at
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Format the response
    const following = data.map(item => ({
      ...item.followed,
      is_following: userId === currentUserId, // If viewing own following list, user is following all of them
    }));

    // If authenticated and not viewing own following list, check which users the current user is following
    if (currentUserId && userId !== currentUserId) {
      const followingIds = following.map(f => f.id);
      if (followingIds.length > 0) {
        const { data: followingData } = await supabase
          .from('followers')
          .select('followed_id')
          .eq('follower_id', currentUserId)
          .in('followed_id', followingIds);

        const followingSet = new Set((followingData || []).map(f => f.followed_id));
        
        // Update is_following flag
        following.forEach(followedUser => {
          followedUser.is_following = followingSet.has(followedUser.id);
        });
      }
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (countError) {
      throw countError;
    }

    return new Response(JSON.stringify({ 
      following,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get following error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get following',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}