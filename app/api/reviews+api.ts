import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../lib/supabase';

// GET reviews for a user or by a user
export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const reviewerId = url.searchParams.get('reviewerId');
    const orderId = url.searchParams.get('orderId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!userId && !reviewerId && !orderId) {
      return new Response(JSON.stringify({ error: 'Either userId, reviewerId, or orderId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
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
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('reviewee_id', userId);
    }

    if (reviewerId) {
      query = query.eq('reviewer_id', reviewerId);
    }

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get user from auth header to check helpful votes
    const authHeader = request.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    // If authenticated, check if the user has marked each review as helpful
    let reviewsWithHelpful = data || [];
    
    if (currentUserId) {
      reviewsWithHelpful = await Promise.all(
        data.map(async (review) => {
          const { data: helpfulVote } = await supabase
            .from('review_helpful_votes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          return {
            ...review,
            is_helpful: !!helpfulVote,
          };
        })
      );
    }

    return new Response(JSON.stringify(reviewsWithHelpful), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get reviews',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST to create a new review
export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { order_id, reviewee_id, rating, content, item_accuracy, communication, shipping_speed } = await request.json();
    
    // Validate required fields
    if (!order_id || !reviewee_id || !rating) {
      return new Response(JSON.stringify({ error: 'order_id, reviewee_id, and rating are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
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

    // Check if the order exists and is completed
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', order_id)
      .single();

    if (orderError) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (order.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Order must be completed before leaving a review' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine if the user is the buyer or seller
    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return new Response(JSON.stringify({ error: 'You can only review orders you participated in' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the reviewee is the other party in the order
    if ((isBuyer && reviewee_id !== order.seller_id) || (isSeller && reviewee_id !== order.buyer_id)) {
      return new Response(JSON.stringify({ error: 'You can only review the other party in the order' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if a review already exists for this order by this user
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', order_id)
      .eq('reviewer_id', user.id)
      .maybeSingle();

    if (existingReview) {
      return new Response(JSON.stringify({ error: 'You have already reviewed this order' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the review
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        order_id,
        reviewer_id: user.id,
        reviewee_id,
        rating,
        content,
        item_accuracy,
        communication,
        shipping_speed,
        is_verified_purchase: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create review error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create review',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}