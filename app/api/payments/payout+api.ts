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
      return new Response(JSON.stringify({ error: 'Minimum payout amount is $1.00' }), {
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

    // Get user wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payoutAmount = amount / 100;

    // Check if user has sufficient balance
    if (wallet.available_balance < payoutAmount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient wallet balance',
        available_balance: wallet.available_balance,
        requested_amount: payoutAmount,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user has Stripe Connect account
    if (!wallet.stripe_account_id) {
      return new Response(JSON.stringify({ 
        error: 'Stripe Connect account required for payouts',
        message: 'Please complete your payout setup first',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Create Stripe transfer to connected account
      const transfer = await stripe.transfers.create({
        amount,
        currency: 'usd',
        destination: wallet.stripe_account_id,
        metadata: {
          user_id: user.id,
          type: 'payout',
        },
      });

      // Record the payout transaction
      await supabase.rpc('add_wallet_transaction', {
        p_user_id: user.id,
        p_type: 'payout',
        p_amount: -payoutAmount,
        p_description: `Payout to bank account`,
        p_reference_id: transfer.id,
        p_reference_type: 'payout',
      });

      return new Response(JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        amount: payoutAmount,
        message: 'Payout initiated successfully',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (stripeError: any) {
      console.error('Stripe transfer error:', stripeError);
      return new Response(JSON.stringify({ 
        error: 'Failed to process payout',
        details: stripeError.message,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Payout error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process payout',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}