import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../lib/supabase';

// GET promotions for the current user
export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
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

    // Get URL parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const itemId = url.searchParams.get('itemId');

    // Build query
    let query = supabase
      .from('promotions')
      .select(`
        *,
        plan:promotion_plans(*),
        item:items(id, title, images)
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get promotions error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get promotions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST to create a new promotion
export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { item_id, plan_id, payment_method } = await request.json();
    
    // Validate required fields
    if (!item_id || !plan_id || !payment_method) {
      return new Response(JSON.stringify({ error: 'item_id, plan_id, and payment_method are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate payment method
    if (!['wallet', 'card', 'credits'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
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

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('promotion_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError) {
      return new Response(JSON.stringify({ error: 'Promotion plan not found or inactive' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if item exists and belongs to user
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, seller_id, status, is_promoted')
      .eq('id', item_id)
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .single();

    if (itemError) {
      return new Response(JSON.stringify({ error: 'Item not found or not available for promotion' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (item.is_promoted) {
      return new Response(JSON.stringify({ error: 'Item is already promoted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate end time
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + plan.duration_hours * 60 * 60 * 1000);

    // Create promotion
    const { data: promotion, error: promotionError } = await supabase
      .from('promotions')
      .insert({
        item_id,
        seller_id: user.id,
        plan_id,
        status: 'pending', // Will be set to active after payment
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select()
      .single();

    if (promotionError) throw promotionError;

    // For wallet payment, we would process it here
    // For card payment, we would create a payment intent
    // For now, we'll simulate a successful wallet payment
    
    // Record transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('promotion_transactions')
      .insert({
        promotion_id: promotion.id,
        user_id: user.id,
        amount: plan.price,
        payment_method,
        status: payment_method === 'wallet' ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // If wallet payment, activate promotion immediately
    if (payment_method === 'wallet') {
      await supabase
        .from('promotions')
        .update({ status: 'active' })
        .eq('id', promotion.id);

      // Update item
      await supabase
        .from('items')
        .update({ 
          is_promoted: true,
          promotion_id: promotion.id,
          promotion_expires_at: endTime.toISOString()
        })
        .eq('id', item_id);

      return new Response(JSON.stringify({
        ...promotion,
        status: 'active',
        transaction
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ...promotion,
      transaction,
      // For card payments, we would include payment_intent details here
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create promotion',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}