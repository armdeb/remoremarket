import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  item?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    status: string;
  };
  buyer?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
  seller?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
  last_message?: {
    content: string;
    message_type: string;
    sender_id: string;
    created_at: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'offer' | 'system';
  offer_amount?: number;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
}

export interface SendMessageData {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'offer' | 'system';
  offer_amount?: number;
}

export class MessagingService {
  private static realtimeChannel: RealtimeChannel | null = null;

  // Get all conversations for current user
  static async getConversations(): Promise<Conversation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          item:items(id, title, price, images, status),
          buyer:profiles!conversations_buyer_id_fkey(id, nickname, profile_picture),
          seller:profiles!conversations_seller_id_fkey(id, nickname, profile_picture),
          last_message:messages(content, message_type, sender_id, created_at)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conversation) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...conversation,
            last_message: conversation.last_message?.[0] || null,
            unread_count: count || 0,
          };
        })
      );

      return conversationsWithUnread;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  }

  // Get or create conversation between buyer and seller for an item
  static async getOrCreateConversation(itemId: string, sellerId: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('item_id', itemId)
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .single();

      if (existingConversation) {
        return existingConversation.id;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          item_id: itemId,
          buyer_id: user.id,
          seller_id: sellerId,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send initial system message
      await this.sendMessage({
        conversation_id: newConversation.id,
        content: 'Conversation started',
        message_type: 'system',
      });

      return newConversation.id;
    } catch (error) {
      console.error('Get or create conversation error:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  static async getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, nickname, profile_picture)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  // Send a message
  static async sendMessage(messageData: SendMessageData): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: messageData.conversation_id,
          sender_id: user.id,
          content: messageData.content,
          message_type: messageData.message_type || 'text',
          offer_amount: messageData.offer_amount,
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

  // Mark messages as read
  static async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    } catch (error) {
      console.error('Mark messages as read error:', error);
      throw error;
    }
  }

  // Send an offer
  static async sendOffer(conversationId: string, amount: number): Promise<Message> {
    try {
      return await this.sendMessage({
        conversation_id: conversationId,
        content: `Offered $${amount}`,
        message_type: 'offer',
        offer_amount: amount,
      });
    } catch (error) {
      console.error('Send offer error:', error);
      throw error;
    }
  }

  // Accept an offer
  static async acceptOffer(messageId: string): Promise<void> {
    try {
      const { data: message } = await supabase
        .from('messages')
        .select('conversation_id, offer_amount')
        .eq('id', messageId)
        .single();

      if (!message) throw new Error('Message not found');

      // Send acceptance message
      await this.sendMessage({
        conversation_id: message.conversation_id,
        content: `Offer of $${message.offer_amount} accepted! Proceeding to payment.`,
        message_type: 'system',
      });

      // Here you would typically redirect to payment flow
    } catch (error) {
      console.error('Accept offer error:', error);
      throw error;
    }
  }

  // Get unread message count for current user
  static async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase.rpc('get_unread_message_count', {
        user_uuid: user.id,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  // Subscribe to real-time updates for conversations
  static subscribeToConversations(
    userId: string,
    onConversationUpdate: (conversation: any) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `buyer_id=eq.${userId},seller_id=eq.${userId}`,
        },
        onConversationUpdate
      )
      .subscribe();

    return channel;
  }

  // Subscribe to real-time updates for messages in a conversation
  static subscribeToMessages(
    conversationId: string,
    onMessageUpdate: (message: any) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        onMessageUpdate
      )
      .subscribe();

    return channel;
  }

  // Unsubscribe from real-time updates
  static unsubscribe(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  }

  // Delete a conversation (soft delete by marking as deleted)
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  }

  // Search conversations
  static async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          item:items(id, title, price, images, status),
          buyer:profiles!conversations_buyer_id_fkey(id, nickname, profile_picture),
          seller:profiles!conversations_seller_id_fkey(id, nickname, profile_picture)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .or(`item.title.ilike.%${query}%,buyer.nickname.ilike.%${query}%,seller.nickname.ilike.%${query}%`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search conversations error:', error);
      throw error;
    }
  }
}