import { supabase } from './supabase';

export interface Dispute {
  id: string;
  order_id: string;
  reporter_id: string;
  reported_id: string;
  type: 'item_not_received' | 'item_not_as_described' | 'payment_issue' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    total_amount: number;
    status: string;
    item: {
      id: string;
      title: string;
      images: string[];
    };
    buyer: {
      id: string;
      nickname: string;
      profile_picture?: string;
    };
    seller: {
      id: string;
      nickname: string;
      profile_picture?: string;
    };
  };
  evidence?: DisputeEvidence[];
  messages?: DisputeMessage[];
  unread_count?: number;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  user_id: string;
  evidence_type: 'image' | 'document' | 'text';
  content: string;
  created_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  content: string;
  is_admin_message: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
}

export interface CreateDisputeData {
  order_id: string;
  type: 'item_not_received' | 'item_not_as_described' | 'payment_issue' | 'other';
  description: string;
  evidence?: {
    evidence_type: 'image' | 'document' | 'text';
    content: string;
  }[];
}

export class DisputeService {
  // Create a new dispute
  static async createDispute(data: CreateDisputeData): Promise<Dispute> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get order details to determine the reported user
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('buyer_id, seller_id')
        .eq('id', data.order_id)
        .single();

      if (orderError) throw new Error('Order not found');

      // Determine who is being reported (if buyer reports, it's the seller, and vice versa)
      const reporterId = user.id;
      const reportedId = reporterId === order.buyer_id ? order.seller_id : order.buyer_id;

      // Create the dispute
      const { data: dispute, error } = await supabase
        .from('disputes')
        .insert({
          order_id: data.order_id,
          reporter_id: reporterId,
          reported_id: reportedId,
          type: data.type,
          description: data.description,
          status: 'open',
          priority: 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      // Add evidence if provided
      if (data.evidence && data.evidence.length > 0) {
        const evidenceData = data.evidence.map(item => ({
          dispute_id: dispute.id,
          user_id: reporterId,
          evidence_type: item.evidence_type,
          content: item.content,
        }));

        const { error: evidenceError } = await supabase
          .from('dispute_evidence')
          .insert(evidenceData);

        if (evidenceError) throw evidenceError;
      }

      // Add initial system message
      await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: dispute.id,
          sender_id: reporterId,
          content: `Dispute opened: ${data.type.replace(/_/g, ' ')}`,
          is_admin_message: true,
        });

      // Update order status to 'disputed'
      await supabase
        .from('orders')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('id', data.order_id);

      return dispute;
    } catch (error) {
      console.error('Create dispute error:', error);
      throw error;
    }
  }

  // Get dispute by ID
  static async getDisputeById(disputeId: string): Promise<Dispute> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get dispute with related data
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          order:orders(
            id, 
            total_amount, 
            status,
            item:items(id, title, images),
            buyer:profiles!orders_buyer_id_fkey(id, nickname, profile_picture),
            seller:profiles!orders_seller_id_fkey(id, nickname, profile_picture)
          ),
          evidence:dispute_evidence(*)
        `)
        .eq('id', disputeId)
        .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
        .single();

      if (error) throw error;

      // Get messages separately
      const { data: messages, error: messagesError } = await supabase
        .from('dispute_messages')
        .select(`
          *,
          sender:profiles(id, nickname, profile_picture)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Mark unread messages as read
      await supabase
        .from('dispute_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('dispute_id', disputeId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      return {
        ...data,
        messages: messages || [],
      };
    } catch (error) {
      console.error('Get dispute error:', error);
      throw error;
    }
  }

  // Get disputes for current user
  static async getUserDisputes(): Promise<Dispute[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          order:orders(
            id, 
            total_amount, 
            status,
            item:items(id, title, images),
            buyer:profiles!orders_buyer_id_fkey(id, nickname, profile_picture),
            seller:profiles!orders_seller_id_fkey(id, nickname, profile_picture)
          )
        `)
        .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unread message counts for each dispute
      const disputesWithUnread = await Promise.all(
        (data || []).map(async (dispute) => {
          const { count } = await supabase
            .from('dispute_messages')
            .select('*', { count: 'exact', head: true })
            .eq('dispute_id', dispute.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...dispute,
            unread_count: count || 0,
          };
        })
      );

      return disputesWithUnread;
    } catch (error) {
      console.error('Get user disputes error:', error);
      throw error;
    }
  }

  // Add evidence to a dispute
  static async addEvidence(disputeId: string, evidenceType: 'image' | 'document' | 'text', content: string): Promise<DisputeEvidence> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if dispute exists and user is involved
      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .select('id, reporter_id, reported_id, status')
        .eq('id', disputeId)
        .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
        .single();

      if (disputeError) throw new Error('Dispute not found or you do not have access');
      if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new Error('Cannot add evidence to a resolved or closed dispute');
      }

      // Add evidence
      const { data, error } = await supabase
        .from('dispute_evidence')
        .insert({
          dispute_id: disputeId,
          user_id: user.id,
          evidence_type: evidenceType,
          content: content,
        })
        .select()
        .single();

      if (error) throw error;

      // Add system message about new evidence
      await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          content: `New ${evidenceType} evidence added`,
          is_admin_message: true,
        });

      return data;
    } catch (error) {
      console.error('Add evidence error:', error);
      throw error;
    }
  }

  // Send a message in a dispute
  static async sendMessage(disputeId: string, content: string): Promise<DisputeMessage> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if dispute exists and user is involved
      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .select('id, reporter_id, reported_id, status')
        .eq('id', disputeId)
        .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
        .single();

      if (disputeError) throw new Error('Dispute not found or you do not have access');
      if (dispute.status === 'closed') {
        throw new Error('Cannot send messages in a closed dispute');
      }

      // Send message
      const { data, error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          content: content,
          is_admin_message: false,
        })
        .select(`
          *,
          sender:profiles(id, nickname, profile_picture)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  // Get unread message count for current user
  static async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('dispute_messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .in('dispute_id', 
          supabase
            .from('disputes')
            .select('id')
            .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
        );

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  // Check if user can open a dispute for an order
  static async canOpenDispute(orderId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if order exists and user is involved
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id, seller_id')
        .eq('id', orderId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (orderError) return false;

      // Check if dispute already exists
      const { count, error: disputeError } = await supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId);

      if (disputeError) return false;

      // Can open dispute if:
      // 1. User is involved in the order
      // 2. Order status is appropriate (paid, delivered, etc.)
      // 3. No dispute exists yet
      const validStatuses = ['paid', 'pickup_scheduled', 'picked_up', 'delivery_scheduled', 'delivered', 'completed'];
      return (
        (order.buyer_id === user.id || order.seller_id === user.id) &&
        validStatuses.includes(order.status) &&
        count === 0
      );
    } catch (error) {
      console.error('Can open dispute error:', error);
      return false;
    }
  }
}