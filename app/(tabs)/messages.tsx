import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Search, MessageCircle, Clock } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MessagingService, Conversation } from '../../lib/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
    
    if (user) {
      // Subscribe to real-time updates
      const channel = MessagingService.subscribeToConversations(
        user.id,
        handleConversationUpdate
      );
      setRealtimeChannel(channel);
    }

    return () => {
      if (realtimeChannel) {
        MessagingService.unsubscribe(realtimeChannel);
      }
    };
  }, [user]);

  const loadConversations = async () => {
    try {
      const data = await MessagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await MessagingService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Load unread count error:', error);
    }
  };

  const handleConversationUpdate = (payload: any) => {
    console.log('Conversation update:', payload);
    loadConversations();
    loadUnreadCount();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    await loadUnreadCount();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await MessagingService.searchConversations(query);
        setConversations(results);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      loadConversations();
    }
  };

  const formatTime = (dateString: string) => {
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

  const getOtherUser = (conversation: Conversation) => {
    return conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherUser(item);
    const isUnread = (item.unread_count || 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.unreadConversation]}
        onPress={() => router.push(`/conversation/${item.id}`)}
      >
        <View style={styles.conversationContent}>
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            {otherUser?.profile_picture ? (
              <Image source={{ uri: otherUser.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherUser?.nickname?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          {/* Conversation Info */}
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={[styles.userName, isUnread && styles.unreadText]}>
                {otherUser?.nickname || 'Unknown User'}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(item.last_message_at)}
              </Text>
            </View>

            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.item?.title || 'Item not found'}
            </Text>

            {item.last_message && (
              <View style={styles.lastMessageContainer}>
                <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
                  {item.last_message.message_type === 'offer' 
                    ? `💰 ${item.last_message.content}`
                    : item.last_message.content
                  }
                </Text>
                {isUnread && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Item Image */}
          {item.item?.images?.[0] && (
            <Image source={{ uri: item.item.images[0] }} style={styles.itemImage} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MessageCircle size={80} color="#E5E7EB" />
      </View>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation by messaging sellers about items you're interested in
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/')}
      >
        <Text style={styles.browseButtonText}>Browse Items</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.headerUnreadBadge}>
            <Text style={styles.headerUnreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Conversations List */}
      {conversations.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9ACD32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  headerUnreadBadge: {
    backgroundColor: '#FF6B47',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  headerUnreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  listContainer: {
    paddingBottom: 100,
  },
  conversationItem: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadConversation: {
    backgroundColor: '#F0FDF4',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9ACD32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B47',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  unreadText: {
    fontFamily: 'Inter-Bold',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF6B47',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: '#9ACD32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#9ACD32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});