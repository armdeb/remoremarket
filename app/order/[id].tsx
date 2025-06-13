import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Package, Star, MessageCircle, Truck, ShieldAlert } from 'lucide-react-native';
import { OrderService } from '~/lib/orders';
import { ReviewsService } from '~/lib/reviews';
import { DisputeService } from '~/lib/disputes';
import { ReviewForm } from '~/components/ReviewForm';
import { ReviewCard } from '~/components/ReviewCard';
import { DisputeForm } from '~/components/DisputeForm';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [canDispute, setCanDispute] = useState(false);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderData = await OrderService.getOrderById(id as string);
      setOrder(orderData);
      
      // Check if the user can review this order
      const { canReview: canReviewOrder, revieweeId: revieweeIdResult } = 
        await ReviewsService.canReviewOrder(id as string);
      setCanReview(canReviewOrder);
      setRevieweeId(revieweeIdResult || null);
      
      // Check if the user can open a dispute for this order
      const canDisputeOrder = await DisputeService.canOpenDispute(id as string);
      setCanDispute(canDisputeOrder);
      
      // Load reviews for this order
      const response = await fetch(`/api/reviews?orderId=${id}`);
      if (response.ok) {
        const reviewsData = await response.json();
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error('Load order error:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = (review: any) => {
    setShowReviewForm(false);
    Alert.alert('Success', 'Review submitted successfully');
    // Refresh the order and reviews
    loadOrder();
  };

  const handleDisputeSubmit = async (data: any) => {
    try {
      await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          order_id: id,
          ...data
        }),
      });
      
      Alert.alert(
        'Dispute Opened',
        'Your dispute has been submitted. We will review it and get back to you soon.',
        [
          {
            text: 'View Dispute',
            onPress: () => router.push('/disputes'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      
      // Refresh order to update status
      loadOrder();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit dispute');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'paid': return colors.info;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      case 'disputed': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Payment';
      case 'paid': return 'Paid';
      case 'pickup_scheduled': return 'Pickup Scheduled';
      case 'picked_up': return 'Picked Up';
      case 'delivery_scheduled': return 'Delivery Scheduled';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      case 'disputed': return 'Disputed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading order details...</ThemedText>
      </ThemedView>
    );
  }

  if (!order) {
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
            <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.notFoundContainer}>
            <ThemedText style={styles.notFoundText}>Order not found</ThemedText>
            <TouchableOpacity 
              style={[styles.backToOrdersButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <ThemedText style={styles.backToOrdersButtonText}>Back to Orders</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Order #{order.id.substring(0, 8)}</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.orderStatusSection}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusLabel(order.status)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.orderDate, { color: colors.textSecondary }]}>
              Ordered on {formatDate(order.created_at)}
            </ThemedText>
          </View>

          <View style={[styles.itemSection, { backgroundColor: colors.surface }]}>
            <View style={styles.itemHeader}>
              <Package size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Item</ThemedText>
            </View>
            
            <View style={styles.itemDetails}>
              {order.item.images && order.item.images[0] && (
                <Image source={{ uri: order.item.images[0] }} style={styles.itemImage} />
              )}
              <View style={styles.itemInfo}>
                <ThemedText style={styles.itemTitle}>{order.item.title}</ThemedText>
                <View style={styles.itemMeta}>
                  <ThemedText style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                    {order.item.brand} • {order.item.size} • {order.item.condition}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.itemPrice, { color: colors.primary }]}>
                  ${order.total_amount.toFixed(2)}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.partiesSection, { backgroundColor: colors.surface }]}>
            <View style={styles.partyContainer}>
              <ThemedText style={[styles.partyLabel, { color: colors.textSecondary }]}>Seller</ThemedText>
              <View style={styles.partyInfo}>
                {order.seller.profile_picture ? (
                  <Image source={{ uri: order.seller.profile_picture }} style={styles.partyAvatar} />
                ) : (
                  <View style={[styles.partyAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <ThemedText style={styles.partyAvatarText}>
                      {order.seller.nickname.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.partyName}>{order.seller.nickname}</ThemedText>
              </View>
            </View>
            
            <View style={styles.partyContainer}>
              <ThemedText style={[styles.partyLabel, { color: colors.textSecondary }]}>Buyer</ThemedText>
              <View style={styles.partyInfo}>
                {order.buyer.profile_picture ? (
                  <Image source={{ uri: order.buyer.profile_picture }} style={styles.partyAvatar} />
                ) : (
                  <View style={[styles.partyAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <ThemedText style={styles.partyAvatarText}>
                      {order.buyer.nickname.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.partyName}>{order.buyer.nickname}</ThemedText>
              </View>
            </View>
          </View>

          {order.status === 'completed' && (
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsSectionHeader}>
                <View style={styles.reviewsTitle}>
                  <Star size={20} color={colors.warning} />
                  <ThemedText style={styles.sectionTitle}>Reviews</ThemedText>
                </View>
                
                {canReview && (
                  <TouchableOpacity 
                    style={[styles.writeReviewButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowReviewForm(true)}
                  >
                    <ThemedText style={styles.writeReviewButtonText}>Write Review</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              
              {reviews.length > 0 ? (
                reviews.map(review => (
                  <ReviewCard 
                    key={review.id} 
                    review={review}
                    showActions={false}
                  />
                ))
              ) : (
                <ThemedView style={[styles.noReviewsContainer, { backgroundColor: colors.surface }]}>
                  <ThemedText style={styles.noReviewsText}>No reviews yet</ThemedText>
                  {canReview && (
                    <ThemedText style={[styles.noReviewsSubtext, { color: colors.textSecondary }]}>
                      Be the first to leave a review
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            </View>
          )}

          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/conversation/${order.conversation_id || 'new'}?itemId=${order.item_id}&sellerId=${order.seller_id}`)}
            >
              <MessageCircle size={20} color={colors.primary} />
              <ThemedText style={styles.actionButtonText}>Message</ThemedText>
            </TouchableOpacity>
            
            {(order.status === 'paid' || order.status === 'pickup_scheduled') && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/delivery/${order.id}`)}
              >
                <Truck size={20} color={colors.primary} />
                <ThemedText style={styles.actionButtonText}>Delivery Details</ThemedText>
              </TouchableOpacity>
            )}
            
            {canDispute && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                onPress={() => setShowDisputeForm(true)}
              >
                <ShieldAlert size={20} color={colors.error} />
                <ThemedText style={[styles.actionButtonText, { color: colors.error }]}>Open Dispute</ThemedText>
              </TouchableOpacity>
            )}
            
            {order.status === 'disputed' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                onPress={() => router.push('/disputes')}
              >
                <ShieldAlert size={20} color={colors.error} />
                <ThemedText style={[styles.actionButtonText, { color: colors.error }]}>View Dispute</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Review Form Modal */}
        <ReviewForm
          visible={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          onSubmit={handleReviewSubmit}
          orderId={id as string}
          revieweeId={revieweeId || ''}
        />

        {/* Dispute Form Modal */}
        <DisputeForm
          visible={showDisputeForm}
          onClose={() => setShowDisputeForm(false)}
          onSubmit={handleDisputeSubmit}
          orderId={id as string}
        />
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
    padding: 16,
  },
  orderStatusSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  itemSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  itemDetails: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  itemMeta: {
    marginBottom: 8,
  },
  itemMetaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  partiesSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  partyContainer: {
    marginBottom: 16,
  },
  partyLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  partyAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partyAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  partyName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  reviewsSection: {
    marginBottom: 16,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  writeReviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  writeReviewButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  noReviewsContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  noReviewsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  actionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    minWidth: '45%',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  backToOrdersButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToOrdersButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});