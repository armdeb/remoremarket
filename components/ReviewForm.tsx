import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { CreateReviewData, ReviewsService } from '../lib/reviews';

interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (review: any) => void;
  orderId: string;
  revieweeId: string;
  initialData?: Partial<CreateReviewData>;
  isEdit?: boolean;
  reviewId?: string;
}

export function ReviewForm({ 
  visible, 
  onClose, 
  onSubmit, 
  orderId, 
  revieweeId,
  initialData,
  isEdit = false,
  reviewId
}: ReviewFormProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [content, setContent] = useState(initialData?.content || '');
  const [itemAccuracy, setItemAccuracy] = useState(initialData?.item_accuracy || 0);
  const [communication, setCommunication] = useState(initialData?.communication || 0);
  const [shippingSpeed, setShippingSpeed] = useState(initialData?.shipping_speed || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      setLoading(true);
      
      const reviewData: CreateReviewData = {
        order_id: orderId,
        reviewee_id: revieweeId,
        rating,
        content: content.trim() || undefined,
        item_accuracy: itemAccuracy || undefined,
        communication: communication || undefined,
        shipping_speed: shippingSpeed || undefined,
      };

      let result;
      
      if (isEdit && reviewId) {
        result = await ReviewsService.updateReview(reviewId, reviewData);
      } else {
        result = await ReviewsService.createReview(reviewData);
      }
      
      onSubmit(result);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!isEdit) {
      setRating(0);
      setContent('');
      setItemAccuracy(0);
      setCommunication(0);
      setShippingSpeed(0);
    }
  };

  const renderStarRating = (
    currentRating: number, 
    setRatingFunction: (rating: number) => void,
    size: number = 32
  ) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRatingFunction(star)}
          >
            <Star
              size={size}
              color={star <= currentRating ? colors.warning : colors.border}
              fill={star <= currentRating ? colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {isEdit ? 'Edit Review' : 'Write a Review'}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.overallRating}>
            <ThemedText style={styles.sectionTitle}>Overall Rating</ThemedText>
            <View style={styles.ratingContainer}>
              {renderStarRating(rating, setRating)}
              {rating > 0 && (
                <ThemedText style={[styles.ratingLabel, { color: colors.warning }]}>
                  {getRatingLabel(rating)}
                </ThemedText>
              )}
            </View>
          </View>

          <View style={styles.detailedRatings}>
            <ThemedText style={styles.sectionTitle}>Rate Details (Optional)</ThemedText>
            
            <View style={styles.ratingRow}>
              <ThemedText style={styles.ratingTitle}>Item Accuracy</ThemedText>
              {renderStarRating(itemAccuracy, setItemAccuracy, 24)}
            </View>
            
            <View style={styles.ratingRow}>
              <ThemedText style={styles.ratingTitle}>Communication</ThemedText>
              {renderStarRating(communication, setCommunication, 24)}
            </View>
            
            <View style={styles.ratingRow}>
              <ThemedText style={styles.ratingTitle}>Shipping Speed</ThemedText>
              {renderStarRating(shippingSpeed, setShippingSpeed, 24)}
            </View>
          </View>

          <View style={styles.reviewContent}>
            <ThemedText style={styles.sectionTitle}>Review (Optional)</ThemedText>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Share your experience with this seller..."
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <ThemedText style={styles.submitButtonText}>
              {loading ? 'Submitting...' : (isEdit ? 'Update Review' : 'Submit Review')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overallRating: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  detailedRatings: {
    marginBottom: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  reviewContent: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 120,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});