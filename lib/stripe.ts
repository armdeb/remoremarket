import { supabase } from './supabase';

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'escrow_hold' | 'escrow_release' | 'payout';
  amount: number;
  description: string;
  reference_id?: string;
  reference_type?: 'order' | 'payout' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_spent: number;
  stripe_account_id?: string;
  created_at: string;
  updated_at: string;
}

export class StripeService {
  private static baseUrl = process.env.EXPO_PUBLIC_API_URL;

  // Create payment intent for item purchase
  static async createPaymentIntent(itemId: string, amount: number): Promise<PaymentIntent> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${this.baseUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          item_id: itemId,
          amount: amount * 100, // Convert to cents
          currency: 'usd',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw error;
    }
  }

  // Confirm payment and create order
  static async confirmPayment(paymentIntentId: string, itemId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          item_id: itemId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Confirm payment error:', error);
      throw error;
    }
  }

  // Get user wallet
  static async getUserWallet(): Promise<UserWallet> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Create wallet if it doesn't exist
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_spent: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        return newWallet;
      }

      return data;
    } catch (error) {
      console.error('Get user wallet error:', error);
      throw error;
    }
  }

  // Get wallet transactions
  static async getWalletTransactions(limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      throw error;
    }
  }

  // Add funds to wallet
  static async addFundsToWallet(amount: number): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/add-funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add funds');
      }

      return await response.json();
    } catch (error) {
      console.error('Add funds error:', error);
      throw error;
    }
  }

  // Request payout
  static async requestPayout(amount: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request payout');
      }

      return await response.json();
    } catch (error) {
      console.error('Request payout error:', error);
      throw error;
    }
  }

  // Pay with wallet balance
  static async payWithWallet(itemId: string, amount: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/pay-with-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          item_id: itemId,
          amount: amount * 100, // Convert to cents
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to pay with wallet');
      }

      return await response.json();
    } catch (error) {
      console.error('Pay with wallet error:', error);
      throw error;
    }
  }
}