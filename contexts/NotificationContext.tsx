import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationService, Notification, NotificationType } from '~/lib/notifications';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  loadNotifications: (refresh?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  createTestNotification: (type: NotificationType, title: string, message: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      
      // Subscribe to real-time notifications
      const channel = NotificationService.subscribeToNotifications(handleNewNotification);
      setRealtimeChannel(channel);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      if (realtimeChannel) {
        NotificationService.unsubscribe();
      }
    };
  }, [user]);

  const handleNewNotification = (notification: Notification) => {
    // Add new notification to the list
    setNotifications(prev => [notification, ...prev]);
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
  };

  const loadNotifications = async (refresh = false) => {
    if (!user) return;
    
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await NotificationService.getNotifications();
      setNotifications(data);
      
      // Also refresh unread count
      await loadUnreadCount();
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if needed
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await NotificationService.deleteAllNotifications();
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Delete all notifications error:', error);
    }
  };

  const createTestNotification = async (type: NotificationType, title: string, message: string) => {
    try {
      await NotificationService.createTestNotification(type, title, message);
      // The real-time subscription will handle updating the UI
    } catch (error) {
      console.error('Create test notification error:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshing,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        createTestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}