import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { 
  MessageCircle, 
  ShoppingBag, 
  Star, 
  AlertTriangle, 
  Megaphone, 
  UserPlus, 
  ArrowDown, 
  DollarSign, 
  Bell,
  Check
} from 'lucide-react-native';
import { Notification, NotificationType } from '~/lib/notifications';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
}

export function NotificationItem({ 
  notification, 
  onPress, 
  onMarkAsRead,
  onDelete 
}: NotificationItemProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={24} color={colors.info} />;
      case 'order_update':
        return <ShoppingBag size={24} color={colors.primary} />;
      case 'review':
        return <Star size={24} color={colors.warning} />;
      case 'dispute':
        return <AlertTriangle size={24} color={colors.error} />;
      case 'promotion':
        return <Megaphone size={24} color={colors.secondary} />;
      case 'follow':
        return <UserPlus size={24} color={colors.success} />;
      case 'price_drop':
        return <ArrowDown size={24} color={colors.success} />;
      case 'item_sold':
        return <ShoppingBag size={24} color={colors.success} />;
      case 'payment':
        return <DollarSign size={24} color={colors.primary} />;
      case 'system':
      default:
        return <Bell size={24} color={colors.textSecondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleNotificationPress = () => {
    // Mark as read if not already read
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type and data
    onPress(notification);
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && { backgroundColor: colors.primary + '10' }
      ]}
      onPress={handleNotificationPress}
    >
      <View style={styles.iconContainer}>
        {getNotificationIcon(notification.type)}
        {!notification.is_read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {notification.title}
          </ThemedText>
          <ThemedText style={[styles.time, { color: colors.textSecondary }]}>
            {formatDate(notification.created_at)}
          </ThemedText>
        </View>
        
        <ThemedText style={styles.message} numberOfLines={2}>
          {notification.message}
        </ThemedText>
      </View>
      
      <View style={styles.actionsContainer}>
        {!notification.is_read ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => onMarkAsRead(notification.id)}
          >
            <Check size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    marginRight: 16,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  actionsContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});