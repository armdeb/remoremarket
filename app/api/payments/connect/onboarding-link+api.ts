import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { refresh_url, return_url } = await request.json();

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

    // Get user's Stripe account ID
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet?.stripe_account_id) {
      return new Response(JSON.stringify({ error: 'Stripe account not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: wallet.stripe_account_id,
      refresh_url: refresh_url || `${process.env.EXPO_PUBLIC_API_URL}/stripe/refresh`,
      return_url: return_url || `${process.env.EXPO_PUBLIC_API_URL}/stripe/return`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({
      url: accountLink.url,
      expires_at: accountLink.expires_at,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create onboarding link error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create onboarding link',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}