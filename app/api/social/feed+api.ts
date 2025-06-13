import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

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

    // Get social feed
    const { data, error } = await supabase.rpc('get_social_feed', {
      user_uuid: user.id,
      limit_val: limit,
      offset_val: offset,
    });

    if (error) {
      throw error;
    }

    // Get total count of items in feed
    const { count, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('seller_id', 
        supabase
          .from('followers')
          .select('followed_id')
          .eq('follower_id', user.id)
      );

    if (countError) {
      throw countError;
    }

    return new Response(JSON.stringify({ 
      items: data || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get social feed error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get social feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}