import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

// POST to confirm a promotion payment
export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { promotion_id, payment_intent_id } = await request.json();
    
    // Validate required fields
    if (!promotion_id || !payment_intent_id) {
      return new Response(JSON.stringify({ error: 'promotion_id and payment_intent_id are required' }), {
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

    // Check if promotion exists and belongs to user
    const { data: promotion, error: promotionError } = await supabase
      .from('promotions')
      .select('id, seller_id, status, item_id')
      .eq('id', promotion_id)
      .eq('seller_id', user.id)
      .eq('status', 'pending')
      .single();

    if (promotionError) {
      return new Response(JSON.stringify({ error: 'Promotion not found or not in pending status' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update transaction status
    const { error: transactionError } = await supabase
      .from('promotion_transactions')
      .update({ 
        status: 'completed',
        payment_intent_id
      })
      .eq('promotion_id', promotion_id)
      .eq('user_id', user.id);

    if (transactionError) throw transactionError;

    // Activate promotion
    const { error } = await supabase
      .from('promotions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', promotion_id);

    if (error) throw error;

    // Update item
    await supabase
      .from('items')
      .update({ 
        is_promoted: true,
        promotion_id: promotion_id,
        promotion_expires_at: promotion.end_time
      })
      .eq('id', promotion.item_id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Promotion payment confirmed and activated'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Confirm promotion payment error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to confirm promotion payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}