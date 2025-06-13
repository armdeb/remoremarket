import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../../lib/supabase';

// POST to create a response to a review
export async function POST(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const reviewId = params.id;
    const { content } = await request.json();
    
    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
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

    // Check if the review exists and is about the user
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, reviewee_id')
      .eq('id', reviewId)
      .single();

    if (reviewError) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (review.reviewee_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only respond to reviews about you' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if a response already exists
    const { data: existingResponse } = await supabase
      .from('review_responses')
      .select('id')
      .eq('review_id', reviewId)
      .eq('responder_id', user.id)
      .maybeSingle();

    if (existingResponse) {
      return new Response(JSON.stringify({ error: 'You have already responded to this review' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the response
    const { data, error } = await supabase
      .from('review_responses')
      .insert({
        review_id: reviewId,
        responder_id: user.id,
        content,
      })
      .select(`
        *,
        responder:profiles!review_responses_responder_id_fkey(id, nickname, profile_picture)
      `)
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create response error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create response',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT to update a response
export async function PUT(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const responseId = params.id;
    const { content } = await request.json();
    
    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
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

    // Check if the response exists and belongs to the user
    const { data: existingResponse, error: responseError } = await supabase
      .from('review_responses')
      .select('id, responder_id')
      .eq('id', responseId)
      .single();

    if (responseError) {
      return new Response(JSON.stringify({ error: 'Response not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existingResponse.responder_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only update your own responses' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the response
    const { data, error } = await supabase
      .from('review_responses')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select(`
        *,
        responder:profiles!review_responses_responder_id_fkey(id, nickname, profile_picture)
      `)
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update response error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update response',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE a response
export async function DELETE(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const responseId = params.id;
    
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

    // Check if the response exists and belongs to the user
    const { data: existingResponse, error: responseError } = await supabase
      .from('review_responses')
      .select('id, responder_id')
      .eq('id', responseId)
      .single();

    if (responseError) {
      return new Response(JSON.stringify({ error: 'Response not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (existingResponse.responder_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only delete your own responses' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the response
    const { error } = await supabase
      .from('review_responses')
      .delete()
      .eq('id', responseId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete response error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete response',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}