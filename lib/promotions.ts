import { supabase } from './supabase';
import { StripeService } from './stripe';

export interface PromotionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_hours: number;
  features: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  item_id: string;
  seller_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  plan?: PromotionPlan;
  item?: {
    id: string;
    title: string;
    images: string[];
  };
}

export interface PromotionTransaction {
  id: string;
  promotion_id: string;
  user_id: string;
  amount: number;
  payment_method: 'wallet' | 'card' | 'credits';
  payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export class PromotionService {
  // Get all available promotion plans
  static async getPromotionPlans(): Promise<PromotionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('promotion_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get promotion plans error:', error);
      throw error;
    }
  }

  // Get promotions for current user
  static async getUserPromotions(): Promise<Promotion[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          plan:promotion_plans(*),
          item:items(id, title, images)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user promotions error:', error);
      throw error;
    }
  }

  // Get promotion by ID
  static async getPromotionById(promotionId: string): Promise<Promotion> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          plan:promotion_plans(*),
          item:items(id, title, images)
        `)
        .eq('id', promotionId)
        .eq('seller_id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get promotion error:', error);
      throw error;
    }
  }

  // Create a new promotion
  static async createPromotion(itemId: string, planId: string, paymentMethod: 'wallet' | 'card' | 'credits'): Promise<Promotion> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('promotion_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single();

      if (planError) throw new Error('Promotion plan not found or inactive');

      // Check if item exists and belongs to user
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, seller_id, status, is_promoted')
        .eq('id', itemId)
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .single();

      if (itemError) throw new Error('Item not found or not available for promotion');
      if (item.is_promoted) throw new Error('Item is already promoted');

      // Calculate end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + plan.duration_hours * 60 * 60 * 1000);

      // Start transaction
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert({
          item_id: itemId,
          seller_id: user.id,
          plan_id: planId,
          status: 'pending', // Will be set to active after payment
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (promotionError) throw promotionError;

      // Process payment based on method
      let paymentResult;
      if (paymentMethod === 'wallet') {
        // Pay with wallet
        paymentResult = await StripeService.payWithWallet(itemId, plan.price);
      } else if (paymentMethod === 'card') {
        // Create payment intent for card payment
        paymentResult = await StripeService.createPaymentIntent(itemId, plan.price);
      } else {
        // Credits payment would be handled here
        throw new Error('Credits payment method not implemented');
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('promotion_transactions')
        .insert({
          promotion_id: promotion.id,
          user_id: user.id,
          amount: plan.price,
          payment_method: paymentMethod,
          payment_intent_id: paymentResult.id,
          status: paymentMethod === 'wallet' ? 'completed' : 'pending',
        });

      if (transactionError) throw transactionError;

      // If wallet payment, activate promotion immediately
      if (paymentMethod === 'wallet') {
        await supabase
          .from('promotions')
          .update({ status: 'active' })
          .eq('id', promotion.id);

        promotion.status = 'active';
      }

      return promotion;
    } catch (error) {
      console.error('Create promotion error:', error);
      throw error;
    }
  }

  // Cancel a promotion
  static async cancelPromotion(promotionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if promotion exists and belongs to user
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .select('id, seller_id, status')
        .eq('id', promotionId)
        .eq('seller_id', user.id)
        .single();

      if (promotionError) throw new Error('Promotion not found');
      if (promotion.status !== 'active' && promotion.status !== 'pending') {
        throw new Error('Promotion cannot be cancelled');
      }

      // Update promotion status
      const { error } = await supabase
        .from('promotions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId);

      if (error) throw error;

      // Note: Refunds would be handled separately if needed
    } catch (error) {
      console.error('Cancel promotion error:', error);
      throw error;
    }
  }

  // Confirm promotion payment (for card payments)
  static async confirmPromotionPayment(promotionId: string, paymentIntentId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if promotion exists and belongs to user
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .select('id, seller_id, status, item_id')
        .eq('id', promotionId)
        .eq('seller_id', user.id)
        .eq('status', 'pending')
        .single();

      if (promotionError) throw new Error('Promotion not found or not in pending status');

      // Update transaction status
      const { error: transactionError } = await supabase
        .from('promotion_transactions')
        .update({ 
          status: 'completed',
          payment_intent_id: paymentIntentId
        })
        .eq('promotion_id', promotionId)
        .eq('user_id', user.id);

      if (transactionError) throw transactionError;

      // Activate promotion
      const { error } = await supabase
        .from('promotions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', promotionId);

      if (error) throw error;

      // Update item
      await supabase
        .from('items')
        .update({ 
          is_promoted: true,
          promotion_id: promotionId,
          promotion_expires_at: promotion.end_time
        })
        .eq('id', promotion.item_id);
    } catch (error) {
      console.error('Confirm promotion payment error:', error);
      throw error;
    }
  }

  // Get promotion transactions for current user
  static async getPromotionTransactions(): Promise<PromotionTransaction[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('promotion_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get promotion transactions error:', error);
      throw error;
    }
  }

  // Check if an item can be promoted
  static async canPromoteItem(itemId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('items')
        .select('id, seller_id, status, is_promoted')
        .eq('id', itemId)
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) return false;
      return !data.is_promoted;
    } catch (error) {
      console.error('Can promote item error:', error);
      return false;
    }
  }
}