import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { ArrowLeft, Send, DollarSign, Image as ImageIcon } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { MessagingService, Message, Conversation } from '../../lib/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      loadConversation();
      loadMessages();
      markMessagesAsRead();

      // Subscribe to real-time updates
      const channel = MessagingService.subscribeToMessages(
        id as string,
        handleMessageUpdate
      );
      setRealtimeChannel(channel);
    }

    return () => {
      if (realtimeChannel) {
        MessagingService.unsubscribe(realtimeChannel);
      }
    };
  }, [id]);

  const loadConversation = async () => {
    try {
      const conversations = await MessagingService.getConversations();
      const conv = conversations.find(c => c.id === id);
      setConversation(conv || null);
    } catch (error) {
      console.error('Load conversation error:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await MessagingService.getMessages(id as string);
      setMessages(data);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await MessagingService.markMessagesAsRead(id as string);
    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  };

  const handleMessageUpdate = (payload: any) => {
    console.log('Message update:', payload);
    if (payload.eventType === 'INSERT') {
      setMessages(prev => [...prev, payload.new]);
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    markMessagesAsRead();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      await MessagingService.sendMessage({
        conversation_id: id as string,
        content: newMessage.trim(),
        message_type: 'text',
      });
      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid offer amount');
      return;
    }

    try {
      setSending(true);
      await MessagingService.sendOffer(id as string, amount);
      setOfferAmount('');
      setShowOfferInput(false);
    } catch (error) {
      console.error('Send offer error:', error);
      Alert.alert('Error', 'Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  const acceptOffer = async (messageId: string) => {
    Alert.alert(
      'Accept Offer',
      'Are you sure you want to accept this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await MessagingService.acceptOffer(messageId);
              Alert.alert('Success', 'Offer accepted! Proceeding to payment.');
            } catch (error) {
              console.error('Accept offer error:', error);
              Alert.alert('Error', 'Failed to accept offer');
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        setSending(true);
        await MessagingService.sendMessage({
          conversation_id: id as string,
          content: result.assets[0].uri,
          message_type: 'image',
        });
      } catch (error) {
        console.error('Send image error:', error);
        Alert.alert('Error', 'Failed to send image');
      } finally {
        setSending(false);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOtherUser = () => {
    if (!conversation) return null;
    return conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
    const otherUser = getOtherUser();

    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        {showAvatar && !isMyMessage && (
          <View style={styles.messageAvatar}>
            {otherUser?.profile_picture ? (
              <Image source={{ uri: otherUser.profile_picture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherUser?.nickname?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !showAvatar && !isMyMessage && styles.messageWithoutAvatar,
        ]}>
          {item.message_type === 'image' ? (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          ) : item.message_type === 'offer' ? (
            <View style={styles.offerContainer}>
              <View style={styles.offerHeader}>
                <DollarSign size={16} color="#9ACD32" />
                <Text style={styles.offerTitle}>Offer</Text>
              </View>
              <Text style={styles.offerAmount}>${item.offer_amount}</Text>
              {!isMyMessage && (
                <TouchableOpacity
                  style={styles.acceptOfferButton}
                  onPress={() => acceptOffer(item.id)}
                >
                  <Text style={styles.acceptOfferText}>Accept Offer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : item.message_type === 'system' ? (
            <Text style={styles.systemMessage}>{item.content}</Text>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
              {item.content}
            </Text>
          )}

          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherUser = getOtherUser();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#6B2C91" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otherUser?.profile_picture ? (
            <Image source={{ uri: otherUser.profile_picture }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {otherUser?.nickname?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherUser?.nickname || 'Unknown User'}</Text>
            <Text style={styles.headerItem}>{conversation.item?.title}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.itemButton}
          onPress={() => router.push(`/item/${conversation.item_id}`)}
        >
          <Text style={styles.itemButtonText}>View Item</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Offer Input */}
      {showOfferInput && (
        <View style={styles.offerInputContainer}>
          <Text style={styles.offerInputTitle}>Make an Offer</Text>
          <View style={styles.offerInputRow}>
            <View style={styles.offerInputWrapper}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.offerInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.sendOfferButton}
              onPress={sendOffer}
              disabled={sending}
            >
              <Text style={styles.sendOfferText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelOfferButton}
              onPress={() => setShowOfferInput(false)}
            >
              <Text style={styles.cancelOfferText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <ImageIcon size={24} color="#9ACD32" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.offerButton} 
            onPress={() => setShowOfferInput(!showOfferInput)}
          >
            <DollarSign size={24} color="#9ACD32" />
          </TouchableOpacity>

          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9ACD32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  headerItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  itemButton: {
    backgroundColor: '#9ACD32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9ACD32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: '#9ACD32',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  systemMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  offerContainer: {
    alignItems: 'center',
    padding: 8,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#9ACD32',
    marginLeft: 4,
  },
  offerAmount: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  acceptOfferButton: {
    backgroundColor: '#9ACD32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptOfferText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  offerInputContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  offerInputTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  offerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offerInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#9ACD32',
    marginRight: 4,
  },
  offerInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    paddingVertical: 12,
  },
  sendOfferButton: {
    backgroundColor: '#9ACD32',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendOfferText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  cancelOfferButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelOfferText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  offerButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    backgroundColor: '#9ACD32',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});