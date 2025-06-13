import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Star, ThumbsUp, MessageSquare, MoreVertical } from 'lucide-react-native';
import { Review, ReviewsService } from '../lib/reviews';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ReviewCardProps {
  review: Review;
  onReply?: (reviewId: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
  showReviewee?: boolean;
}

export function ReviewCard({ 
  review, 
  onReply, 
  onEdit, 
  onDelete, 
  showActions = true,
  showReviewee = false
}: ReviewCardProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [isHelpful, setIsHelpful] = useState(review.is_helpful || false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count || 0);
  const [showOptions, setShowOptions] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleHelpfulToggle = async () => {
    try {
      if (isHelpful) {
        await ReviewsService.removeHelpfulMark(review.id);
        setIsHelpful(false);
        setHelpfulCount(prev => prev - 1);
      } else {
        await ReviewsService.markReviewAsHelpful(review.id);
        setIsHelpful(true);
        setHelpfulCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Helpful toggle error:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            color={star <= rating ? colors.warning : colors.border}
            fill={star <= rating ? colors.warning : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.reviewer?.profile_picture ? (
            <Image source={{ uri: review.reviewer.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.avatarText}>
                {review.reviewer?.nickname?.charAt(0).toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
          <View style={styles.userDetails}>
            <ThemedText style={styles.userName}>
              {review.reviewer?.nickname || 'Anonymous'}
            </ThemedText>
            <View style={styles.ratingRow}>
              {renderStars(review.rating)}
              <ThemedText style={[styles.date, { color: colors.textSecondary }]}>
                {formatDate(review.created_at)}
              </ThemedText>
            </View>
          </View>
        </View>
        
        {showActions && (
          <View style={styles.headerActions}>
            {onEdit && onDelete && (
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => setShowOptions(!showOptions)}
              >
                <MoreVertical size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {showOptions && (
        <View style={[styles.optionsMenu, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              setShowOptions(false);
              onEdit && onEdit(review);
            }}
          >
            <ThemedText>Edit Review</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              setShowOptions(false);
              onDelete && onDelete(review.id);
            }}
          >
            <ThemedText style={{ color: colors.error }}>Delete Review</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {showReviewee && review.reviewee && (
        <View style={styles.revieweeInfo}>
          <ThemedText style={[styles.revieweeLabel, { color: colors.textSecondary }]}>
            Review for:
          </ThemedText>
          <View style={styles.revieweeContainer}>
            {review.reviewee.profile_picture ? (
              <Image source={{ uri: review.reviewee.profile_picture }} style={styles.revieweeAvatar} />
            ) : (
              <View style={[styles.revieweeAvatarPlaceholder, { backgroundColor: colors.secondary }]}>
                <ThemedText style={styles.revieweeAvatarText}>
                  {review.reviewee.nickname.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
            <ThemedText style={styles.revieweeName}>
              {review.reviewee.nickname}
            </ThemedText>
          </View>
        </View>
      )}

      {review.order?.item && (
        <View style={styles.itemInfo}>
          <ThemedText style={[styles.itemLabel, { color: colors.textSecondary }]}>
            Item purchased:
          </ThemedText>
          <View style={styles.itemContainer}>
            {review.order.item.images && review.order.item.images[0] && (
              <Image source={{ uri: review.order.item.images[0] }} style={styles.itemImage} />
            )}
            <ThemedText style={styles.itemTitle} numberOfLines={1}>
              {review.order.item.title}
            </ThemedText>
          </View>
        </View>
      )}

      {review.content && (
        <ThemedText style={styles.content}>
          {review.content}
        </ThemedText>
      )}

      {(review.item_accuracy || review.communication || review.shipping_speed) && (
        <View style={styles.ratingCategories}>
          {review.item_accuracy && (
            <View style={styles.ratingCategory}>
              <ThemedText style={[styles.ratingCategoryLabel, { color: colors.textSecondary }]}>
                Item Accuracy
              </ThemedText>
              <View style={styles.ratingCategoryStars}>
                {renderStars(review.item_accuracy)}
              </View>
            </View>
          )}
          
          {review.communication && (
            <View style={styles.ratingCategory}>
              <ThemedText style={[styles.ratingCategoryLabel, { color: colors.textSecondary }]}>
                Communication
              </ThemedText>
              <View style={styles.ratingCategoryStars}>
                {renderStars(review.communication)}
              </View>
            </View>
          )}
          
          {review.shipping_speed && (
            <View style={styles.ratingCategory}>
              <ThemedText style={[styles.ratingCategoryLabel, { color: colors.textSecondary }]}>
                Shipping Speed
              </ThemedText>
              <View style={styles.ratingCategoryStars}>
                {renderStars(review.shipping_speed)}
              </View>
            </View>
          )}
        </View>
      )}

      {review.responses && review.responses.length > 0 && (
        <View style={[styles.responseContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.responseHeader}>
            {review.responses[0].responder?.profile_picture ? (
              <Image source={{ uri: review.responses[0].responder.profile_picture }} style={styles.responseAvatar} />
            ) : (
              <View style={[styles.responseAvatarPlaceholder, { backgroundColor: colors.secondary }]}>
                <ThemedText style={styles.responseAvatarText}>
                  {review.responses[0].responder?.nickname?.charAt(0).toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
            <View style={styles.responseHeaderText}>
              <ThemedText style={styles.responderName}>
                {review.responses[0].responder?.nickname || 'Seller'}
              </ThemedText>
              <ThemedText style={[styles.responseDate, { color: colors.textSecondary }]}>
                {formatDate(review.responses[0].created_at)}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.responseContent}>
            {review.responses[0].content}
          </ThemedText>
        </View>
      )}

      {showActions && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.helpfulButton}
            onPress={handleHelpfulToggle}
          >
            <ThumbsUp 
              size={16} 
              color={isHelpful ? colors.primary : colors.textSecondary}
              fill={isHelpful ? colors.primary : 'transparent'}
            />
            <ThemedText style={[
              styles.helpfulText, 
              isHelpful && { color: colors.primary }
            ]}>
              Helpful ({helpfulCount})
            </ThemedText>
          </TouchableOpacity>

          {onReply && !review.responses?.length && review.reviewee_id === review.reviewer_id && (
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => onReply(review.id)}
            >
              <MessageSquare size={16} color={colors.primary} />
              <ThemedText style={[styles.replyText, { color: colors.primary }]}>
                Reply
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  headerActions: {
    justifyContent: 'center',
  },
  moreButton: {
    padding: 4,
  },
  optionsMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  optionItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  revieweeInfo: {
    marginBottom: 12,
  },
  revieweeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  revieweeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revieweeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  revieweeAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  revieweeAvatarText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  revieweeName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  content: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 16,
  },
  ratingCategories: {
    marginBottom: 16,
  },
  ratingCategory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingCategoryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  ratingCategoryStars: {
    flexDirection: 'row',
  },
  responseContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  responseAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  responseAvatarText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  responseHeaderText: {
    flex: 1,
  },
  responderName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  responseDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  responseContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  helpfulText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  replyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});