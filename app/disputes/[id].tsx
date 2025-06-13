import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { DisputeService, Dispute, DisputeMessage } from '~/lib/disputes';
import { DisputeChat } from '~/components/DisputeChat';
import { useAuth } from '~/contexts/AuthContext';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadDispute();
  }, [id]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      const data = await DisputeService.getDisputeById(id as string);
      setDispute(data);
    } catch (error) {
      console.error('Load dispute error:', error);
      Alert.alert('Error', 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!dispute) return;
    
    try {
      setSending(true);
      const newMessage = await DisputeService.sendMessage(dispute.id, content);
      setDispute(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMessage]
        };
      });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendEvidence = async (content: string) => {
    if (!dispute) return;
    
    try {
      setSending(true);
      await DisputeService.addEvidence(dispute.id, 'image', content);
      // Reload dispute to get updated evidence and messages
      await loadDispute();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add evidence');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.error;
      case 'investigating': return colors.warning;
      case 'resolved': return colors.success;
      case 'closed': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={20} color={getStatusColor(status)} />;
      case 'investigating': return <Clock size={20} color={getStatusColor(status)} />;
      case 'resolved': return <CheckCircle size={20} color={getStatusColor(status)} />;
      case 'closed': return <ShieldAlert size={20} color={getStatusColor(status)} />;
      default: return <AlertTriangle size={20} color={getStatusColor(status)} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading dispute details...</ThemedText>
      </ThemedView>
    );
  }

  if (!dispute) {
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
            <ThemedText style={styles.headerTitle}>Dispute Details</ThemedText>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.notFoundContainer}>
            <ThemedText style={styles.notFoundText}>Dispute not found</ThemedText>
            <TouchableOpacity 
              style={[styles.backToDisputesButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/disputes')}
            >
              <ThemedText style={styles.backToDisputesButtonText}>Back to Disputes</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

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
          <ThemedText style={styles.headerTitle}>Dispute #{dispute.id.substring(0, 8)}</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          <View style={styles.disputeInfo}>
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + '20' }]}>
                {getStatusIcon(dispute.status)}
                <ThemedText style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
                  {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
                </ThemedText>
              </View>
              <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
                Opened on {formatDate(dispute.created_at)}
              </ThemedText>
            </View>

            <TouchableOpacity 
              style={[styles.orderCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/order/${dispute.order_id}`)}
            >
              <View style={styles.orderHeader}>
                <ThemedText style={styles.orderTitle}>Order Details</ThemedText>
                <ThemedText style={[styles.orderIdText, { color: colors.textSecondary }]}>
                  #{dispute.order_id.substring(0, 8)}
                </ThemedText>
              </View>
              
              <View style={styles.orderContent}>
                {dispute.order?.item.images && dispute.order.item.images[0] && (
                  <Image 
                    source={{ uri: dispute.order.item.images[0] }} 
                    style={styles.itemImage} 
                  />
                )}
                <View style={styles.orderDetails}>
                  <ThemedText style={styles.itemTitle} numberOfLines={2}>
                    {dispute.order?.item.title}
                  </ThemedText>
                  <ThemedText style={[styles.disputeType, { color: colors.primary }]}>
                    Issue: {dispute.type.replace(/_/g, ' ')}
                  </ThemedText>
                  <ThemedText style={[styles.orderAmount, { color: colors.primary }]}>
                    ${dispute.order?.total_amount.toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            {dispute.status === 'resolved' && dispute.resolution && (
              <View style={[styles.resolutionCard, { backgroundColor: colors.success + '10' }]}>
                <View style={styles.resolutionHeader}>
                  <CheckCircle size={20} color={colors.success} />
                  <ThemedText style={[styles.resolutionTitle, { color: colors.success }]}>
                    Resolution
                  </ThemedText>
                </View>
                <ThemedText style={styles.resolutionText}>
                  {dispute.resolution}
                </ThemedText>
                {dispute.resolved_at && (
                  <ThemedText style={[styles.resolutionDate, { color: colors.textSecondary }]}>
                    Resolved on {formatDate(dispute.resolved_at)}
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          <View style={styles.chatContainer}>
            <ThemedText style={styles.chatTitle}>Messages</ThemedText>
            <DisputeChat
              messages={dispute.messages || []}
              onSendMessage={handleSendMessage}
              onSendEvidence={handleSendEvidence}
              currentUserId={user?.id || ''}
              loading={loading}
              disabled={dispute.status === 'closed'}
            />
          </View>
        </View>
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  disputeInfo: {
    padding: 16,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  orderContent: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  disputeType: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  resolutionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resolutionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  resolutionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  resolutionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
  },
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    padding: 16,
    paddingBottom: 8,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  backToDisputesButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backToDisputesButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});