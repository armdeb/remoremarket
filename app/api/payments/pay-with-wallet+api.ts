import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { item_id, amount } = await request.json();

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

    // Verify amount matches item price
    const totalAmount = amount / 100;
    if (totalAmount !== item.price) {
      return new Response(JSON.stringify({ error: 'Amount does not match item price' }), {
        status: 400,
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

    // Check if user has sufficient balance
    if (wallet.available_balance < totalAmount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient wallet balance',
        available_balance: wallet.available_balance,
        required_amount: totalAmount,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate platform fee (5%)
    const platformFee = totalAmount * 0.05;
    const sellerAmount = totalAmount - platformFee;

    // Use database transaction to ensure consistency
    const { data, error } = await supabase.rpc('process_wallet_payment', {
      p_buyer_id: user.id,
      p_seller_id: item.seller_id,
      p_item_id: item_id,
      p_total_amount: totalAmount,
      p_platform_fee: platformFee,
      p_seller_amount: sellerAmount,
    });

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: data.order_id,
      message: 'Payment completed with wallet balance',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Pay with wallet error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process wallet payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}