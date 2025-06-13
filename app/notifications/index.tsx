import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Trash2, CheckCheck, Bell } from 'lucide-react-native';
import { useNotifications } from '~/contexts/NotificationContext';
import { Notification } from '~/lib/notifications';
import { NotificationItem } from '~/components/NotificationItem';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    refreshing, 
    loadNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    deleteAllNotifications 
  } = useNotifications();
  const [showActions, setShowActions] = useState(false);

  const handleNotificationPress = (notification: Notification) => {
    // Navigate based on notification type and data
    switch (notification.type) {
      case 'message':
        if (notification.data?.conversation_id) {
          router.push(`/conversation/${notification.data.conversation_id}`);
        }
        break;
      case 'order_update':
        if (notification.data?.order_id) {
          router.push(`/order/${notification.data.order_id}`);
        }
        break;
      case 'review':
        if (notification.data?.review_id) {
          router.push(`/reviews/${notification.data.review_id}`);
        }
        break;
      case 'dispute':
        if (notification.data?.dispute_id) {
          router.push(`/disputes/${notification.data.dispute_id}`);
        }
        break;
      case 'promotion':
        if (notification.data?.promotion_id) {
          router.push(`/promotions/${notification.data.promotion_id}`);
        }
        break;
      case 'follow':
        if (notification.data?.user_id) {
          router.push(`/user/${notification.data.user_id}`);
        }
        break;
      case 'price_drop':
      case 'item_sold':
        if (notification.data?.item_id) {
          router.push(`/item/${notification.data.item_id}`);
        }
        break;
      case 'payment':
        router.push('/(tabs)/wallet');
        break;
      default:
        // For system notifications or when no specific navigation is needed
        break;
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: deleteAllNotifications
        }
      ]
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={handleNotificationPress}
      onMarkAsRead={markAsRead}
      onDelete={deleteNotification}
    />
  );

  const renderEmptyComponent = () => {
    if (loading && !refreshing) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Bell size={64} color={colors.textSecondary} />
        <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          When you receive notifications, they'll appear here
        </ThemedText>
      </View>
    );
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          <TouchableOpacity
            style={styles.actionsButton}
            onPress={() => setShowActions(!showActions)}
          >
            <ThemedText style={[styles.actionsButtonText, { color: colors.primary }]}>
              {showActions ? 'Done' : 'Actions'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {showActions && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={20} color={unreadCount === 0 ? colors.textSecondary : colors.primary} />
              <ThemedText style={[
                styles.actionButtonText,
                { color: unreadCount === 0 ? colors.textSecondary : colors.text }
              ]}>
                Mark All as Read
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handleClearAll}
              disabled={notifications.length === 0}
            >
              <Trash2 size={20} color={notifications.length === 0 ? colors.textSecondary : colors.error} />
              <ThemedText style={[
                styles.actionButtonText,
                { color: notifications.length === 0 ? colors.textSecondary : colors.error }
              ]}>
                Clear All
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading notifications...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyComponent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => loadNotifications(true)} 
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  actionsButton: {
    padding: 8,
  },
  actionsButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
});