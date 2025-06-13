import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../../lib/supabase';

// POST to mark a review as helpful
export async function POST(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const reviewId = params.id;
    
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

    // Check if the review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the user has already marked this review as helpful
    const { data: existingVote } = await supabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingVote) {
      return new Response(JSON.stringify({ error: 'You have already marked this review as helpful' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mark the review as helpful
    const { error } = await supabase
      .from('review_helpful_votes')
      .insert({
        review_id: reviewId,
        user_id: user.id,
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mark review as helpful error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to mark review as helpful',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE to remove helpful mark from a review
export async function DELETE(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const reviewId = params.id;
    
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

    // Remove the helpful mark
    const { error } = await supabase
      .from('review_helpful_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Remove helpful mark error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to remove helpful mark',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}