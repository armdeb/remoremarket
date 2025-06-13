import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'message' 
  | 'order_update' 
  | 'review' 
  | 'dispute' 
  | 'promotion' 
  | 'follow' 
  | 'price_drop' 
  | 'item_sold' 
  | 'payment' 
  | 'system';

export class NotificationService {
  private static realtimeChannel: RealtimeChannel | null = null;

  // Get all notifications for current user
  static async getNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Delete all notifications
  static async deleteAllNotifications(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete all notifications error:', error);
      throw error;
    }
  }

  // Subscribe to real-time notifications
  static subscribeToNotifications(
    onNotification: (notification: Notification) => void
  ): RealtimeChannel {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    this.realtimeChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return this.realtimeChannel;
  }

  // Unsubscribe from real-time notifications
  static unsubscribe(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // Create a test notification (for development purposes)
  static async createTestNotification(type: NotificationType, title: string, message: string): Promise<Notification> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type,
          title,
          message,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create test notification error:', error);
      throw error;
    }
  }
}