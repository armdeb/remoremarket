import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

// GET a specific review
export async function GET(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const reviewId = params.id;
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(id, nickname, profile_picture),
        reviewee:profiles!reviews_reviewee_id_fkey(id, nickname, profile_picture),
        order:orders(id, item:items(id, title, images)),
        responses:review_responses(
          id, 
          review_id, 
          responder_id, 
          content, 
          created_at, 
          updated_at,
          responder:profiles!review_responses_responder_id_fkey(id, nickname, profile_picture)
        )
      `)
      .eq('id', reviewId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Review not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get review error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get review',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT to update a review
export async function PUT(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const reviewId = params.id;
    const updates = await request.json();
    
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

    // Check if the review exists and belongs to the user
    const { data: existingReview, error: reviewError } = await supabase
      .from('reviews')
      .select('id, reviewer_id')
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existingReview.reviewer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only update your own reviews' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the updates
    const { rating, content, item_accuracy, communication, shipping_speed } = updates;
    
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the review
    const { data, error } = await supabase
      .from('reviews')
      .update({
        rating,
        content,
        item_accuracy,
        communication,
        shipping_speed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update review error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update review',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE a review
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

    // Check if the review exists and belongs to the user
    const { data: existingReview, error: reviewError } = await supabase
      .from('reviews')
      .select('id, reviewer_id')
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existingReview.reviewer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only delete your own reviews' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the review
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete review',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}