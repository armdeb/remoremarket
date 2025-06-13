import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Send, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { DisputeMessage } from '~/lib/disputes';

interface DisputeChatProps {
  messages: DisputeMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onSendEvidence: (content: string) => Promise<void>;
  currentUserId: string;
  loading?: boolean;
  disabled?: boolean;
}

export function DisputeChat({ 
  messages, 
  onSendMessage, 
  onSendEvidence, 
  currentUserId,
  loading = false,
  disabled = false
}: DisputeChatProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || disabled) return;

    try {
      setSending(true);
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    if (sending || disabled) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0] && result.assets[0].base64) {
        setSending(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await onSendEvidence(base64Image);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item, index }: { item: DisputeMessage; index: number }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    const isAdminMessage = item.is_admin_message;
    const showDate = index === 0 || new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
    
    if (isAdminMessage) {
      return (
        <>
          {showDate && (
            <View style={styles.dateContainer}>
              <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(item.created_at)}
              </ThemedText>
            </View>
          )}
          <View style={[styles.systemMessageContainer, { backgroundColor: colors.info + '10' }]}>
            <ThemedText style={[styles.systemMessageText, { color: colors.info }]}>
              {item.content}
            </ThemedText>
            <ThemedText style={[styles.messageTime, { color: colors.textSecondary }]}>
              {formatTime(item.created_at)}
            </ThemedText>
          </View>
        </>
      );
    }

    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </ThemedText>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
        ]}>
          {!isCurrentUser && item.sender?.profile_picture && (
            <Image 
              source={{ uri: item.sender.profile_picture }}
              style={styles.avatar}
            />
          )}
          {!isCurrentUser && !item.sender?.profile_picture && (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.avatarText}>
                {item.sender?.nickname?.charAt(0).toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
          <View style={[
            styles.messageBubble,
            isCurrentUser 
              ? [styles.currentUserBubble, { backgroundColor: colors.primary }]
              : [styles.otherUserBubble, { backgroundColor: colors.surface }]
          ]}>
            {!isCurrentUser && (
              <ThemedText style={[styles.senderName, { color: colors.primary }]}>
                {item.sender?.nickname || 'Unknown'}
              </ThemedText>
            )}
            
            {item.content.startsWith('data:image/') ? (
              <Image 
                source={{ uri: item.content }}
                style={styles.messageImage}
                resizeMode="contain"
              />
            ) : (
              <ThemedText style={[
                styles.messageText,
                isCurrentUser ? { color: '#FFFFFF' } : { color: colors.text }
              ]}>
                {item.content}
              </ThemedText>
            )}
            
            <ThemedText style={[
              styles.messageTime,
              isCurrentUser ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: colors.textSecondary }
            ]}>
              {formatTime(item.created_at)}
            </ThemedText>
          </View>
        </View>
      </>
    );
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={styles.loadingText}>Loading messages...</ThemedText>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={pickImage}
                disabled={sending || disabled}
              >
                <Camera size={24} color={disabled ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                editable={!disabled}
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  (sending || !newMessage.trim() || disabled) && { opacity: 0.5 }
                ]}
                onPress={handleSendMessage}
                disabled={sending || !newMessage.trim() || disabled}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
  messagesList: {
    padding: 16,
    paddingBottom: 32,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  currentUserBubble: {
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    maxWidth: '90%',
  },
  systemMessageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});