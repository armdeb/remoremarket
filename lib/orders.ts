import { supabase } from './supabase';

export interface Order {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  rider_id?: string;
  total_amount: number;
  platform_fee: number;
  seller_amount: number;
  status: string;
  payment_intent_id?: string;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    title: string;
    price: number;
    images: string[];
    brand: string;
    size: string;
    condition: string;
    status: string;
  };
  buyer: {
    id: string;
    nickname: string;
    profile_picture?: string;
    created_at: string;
  };
  seller: {
    id: string;
    nickname: string;
    profile_picture?: string;
    created_at: string;
  };
  rider?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
}

export class OrderService {
  // Get order by ID
  static async getOrderById(orderId: string): Promise<Order> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          item:items(*),
          buyer:profiles!orders_buyer_id_fkey(id, nickname, profile_picture, created_at),
          seller:profiles!orders_seller_id_fkey(id, nickname, profile_picture, created_at),
          rider:profiles(id, nickname, profile_picture)
        `)
        .eq('id', orderId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  // Get orders for current user (as buyer or seller)
  static async getUserOrders(role?: 'buyer' | 'seller'): Promise<Order[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('orders')
        .select(`
          *,
          item:items(id, title, price, images, brand, size, condition, status),
          buyer:profiles!orders_buyer_id_fkey(id, nickname, profile_picture),
          seller:profiles!orders_seller_id_fkey(id, nickname, profile_picture)
        `);

      if (role === 'buyer') {
        query = query.eq('buyer_id', user.id);
      } else if (role === 'seller') {
        query = query.eq('seller_id', user.id);
      } else {
        query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user orders error:', error);
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(orderId: string, reason: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if order exists and belongs to user
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id, seller_id')
        .eq('id', orderId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      // Only allow cancellation of pending or paid orders
      if (!['pending', 'paid'].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Add cancellation reason to order history
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          action: 'cancelled',
          notes: reason,
          created_by: user.id,
        });

      // If order was paid, refund the buyer
      if (order.status === 'paid') {
        // Refund logic would go here
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  // Mark order as completed (by buyer)
  static async completeOrder(orderId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if order exists and user is the buyer
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id')
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      // Only allow completion of delivered orders
      if (order.status !== 'delivered') {
        throw new Error('Order cannot be marked as completed at this stage');
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Add completion to order history
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          action: 'completed',
          notes: 'Order marked as completed by buyer',
          created_by: user.id,
        });

      // Release escrow funds to seller
      await supabase.rpc('release_escrow_funds', { p_order_id: orderId });
    } catch (error) {
      console.error('Complete order error:', error);
      throw error;
    }
  }

  // Request refund (by buyer)
  static async requestRefund(orderId: string, reason: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if order exists and user is the buyer
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id')
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      // Only allow refund requests for paid, picked_up, or delivered orders
      if (!['paid', 'pickup_scheduled', 'picked_up', 'delivery_scheduled', 'delivered'].includes(order.status)) {
        throw new Error('Refund cannot be requested at this stage');
      }

      // Create dispute
      const { error: disputeError } = await supabase
        .from('disputes')
        .insert({
          order_id: orderId,
          reporter_id: user.id,
          reported_id: null, // Will be set by admin
          type: 'refund_request',
          description: reason,
          status: 'open',
          priority: 'medium',
        });

      if (disputeError) throw disputeError;

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'disputed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Add refund request to order history
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          action: 'refund_requested',
          notes: reason,
          created_by: user.id,
        });
    } catch (error) {
      console.error('Request refund error:', error);
      throw error;
    }
  }
}