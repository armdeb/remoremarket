import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { item_id, amount, currency = 'usd' } = await request.json();

    if (!item_id || !amount) {
      return new Response(JSON.stringify({ error: 'Item ID and amount are required' }), {
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

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*, seller:profiles!items_seller_id_fkey(*)')
      .eq('id', item_id)
      .eq('status', 'active')
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Item not found or not available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify amount matches item price
    if (amount !== Math.round(item.price * 100)) {
      return new Response(JSON.stringify({ error: 'Amount does not match item price' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        item_id,
        buyer_id: user.id,
        seller_id: item.seller_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment intent in database
    await supabase
      .from('payment_intents')
      .insert({
        id: paymentIntent.id,
        user_id: user.id,
        item_id,
        amount: amount / 100,
        currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      });

    return new Response(JSON.stringify({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: amount / 100,
      currency,
      status: paymentIntent.status,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}