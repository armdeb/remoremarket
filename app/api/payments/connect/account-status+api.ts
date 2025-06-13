import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    // Get user's Stripe account ID
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet?.stripe_account_id) {
      return new Response(JSON.stringify({ 
        connected: false,
        account_id: null,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(wallet.stripe_account_id);

    return new Response(JSON.stringify({
      connected: true,
      account_id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
      business_profile: account.business_profile,
      country: account.country,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get account status error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get account status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}