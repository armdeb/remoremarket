import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { amount } = await request.json();

    if (!amount || amount < 100) { // Minimum $1.00
      return new Response(JSON.stringify({ error: 'Minimum amount is $1.00' }), {
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

    // Create Stripe payment intent for wallet top-up
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        type: 'wallet_topup',
        user_id: user.id,
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
        amount: amount / 100,
        currency: 'usd',
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
        type: 'wallet_topup',
      });

    return new Response(JSON.stringify({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: amount / 100,
      currency: 'usd',
      status: paymentIntent.status,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Add funds error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to add funds',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}