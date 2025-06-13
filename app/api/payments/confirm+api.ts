import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { payment_intent_id, item_id } = await request.json();

    if (!payment_intent_id || !item_id) {
      return new Response(JSON.stringify({ error: 'Payment intent ID and item ID are required' }), {
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

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', item_id)
      .eq('status', 'active')
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Item not found or not available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate platform fee (5%)
    const totalAmount = paymentIntent.amount / 100;
    const platformFee = totalAmount * 0.05;
    const sellerAmount = totalAmount - platformFee;

    // Start transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        item_id,
        buyer_id: user.id,
        seller_id: item.seller_id,
        total_amount: totalAmount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        payment_intent_id,
        status: 'paid',
      })
      .select()
      .single();

    if (orderError) {
      throw new Error('Failed to create order');
    }

    // Update item status to sold
    await supabase
      .from('items')
      .update({ status: 'sold' })
      .eq('id', item_id);

    // Add funds to seller's wallet (in escrow)
    await supabase.rpc('add_wallet_transaction', {
      p_user_id: item.seller_id,
      p_type: 'escrow_hold',
      p_amount: sellerAmount,
      p_description: `Sale of ${item.title}`,
      p_reference_id: order.id,
      p_reference_type: 'order',
    });

    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({ status: 'succeeded' })
      .eq('id', payment_intent_id);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      message: 'Payment confirmed and order created',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to confirm payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}