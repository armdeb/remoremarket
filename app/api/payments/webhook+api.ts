import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
      
      case 'transfer.failed':
        await handleTransferFailed(event.data.object as Stripe.Transfer);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { metadata } = paymentIntent;
    
    if (metadata.type === 'wallet_topup') {
      // Add funds to user wallet
      await supabase.rpc('add_wallet_transaction', {
        p_user_id: metadata.user_id,
        p_type: 'credit',
        p_amount: paymentIntent.amount / 100,
        p_description: 'Wallet top-up',
        p_reference_id: paymentIntent.id,
        p_reference_type: 'payment',
      });
    }

    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({ status: 'succeeded' })
      .eq('id', paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({ status: 'failed' })
      .eq('id', paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  try {
    // Update wallet transaction status to completed
    await supabase
      .from('wallet_transactions')
      .update({ status: 'completed' })
      .eq('reference_id', transfer.id)
      .eq('reference_type', 'payout');

  } catch (error) {
    console.error('Error handling transfer.created:', error);
  }
}

async function handleTransferFailed(transfer: Stripe.Transfer) {
  try {
    // Update wallet transaction status to failed and refund the amount
    const { data: transaction } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('reference_id', transfer.id)
      .eq('reference_type', 'payout')
      .single();

    if (transaction) {
      // Mark original transaction as failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      // Refund the amount back to wallet
      await supabase.rpc('add_wallet_transaction', {
        p_user_id: transaction.user_id,
        p_type: 'credit',
        p_amount: Math.abs(transaction.amount),
        p_description: 'Payout failed - refund',
        p_reference_id: transfer.id,
        p_reference_type: 'refund',
      });
    }

  } catch (error) {
    console.error('Error handling transfer.failed:', error);
  }
}