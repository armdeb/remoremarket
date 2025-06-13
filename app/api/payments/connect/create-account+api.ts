import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { country = 'US', type = 'express' } = await request.json();

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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has a Stripe account
    const { data: wallet } = await supabase
      .from('wallets')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (wallet?.stripe_account_id) {
      return new Response(JSON.stringify({ 
        error: 'Stripe account already exists',
        account_id: wallet.stripe_account_id,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type,
      country,
      email: profile.email,
      business_type: 'individual',
      individual: {
        email: profile.email,
        first_name: profile.first_name || undefined,
        last_name: profile.last_name || undefined,
        phone: profile.phone || undefined,
      },
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });

    // Update wallet with Stripe account ID
    await supabase
      .from('wallets')
      .upsert({
        user_id: user.id,
        stripe_account_id: account.id,
        available_balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_spent: 0,
      });

    return new Response(JSON.stringify({
      account_id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create Stripe account error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create Stripe account',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}