import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Review, ReviewsService } from '~/lib/reviews';
import { ReviewsList } from '~/components/ReviewsList';
import { ReviewForm } from '~/components/ReviewForm';
import { useAuth } from '~/contexts/AuthContext';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function MyReviewsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const handleEditReview = (review: Review) => {
    setSelectedReview(review);
    setShowReviewForm(true);
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ReviewsService.deleteReview(reviewId);
              Alert.alert('Success', 'Review deleted successfully');
              // Refresh the reviews list
              // This would typically be handled by the ReviewsList component's refresh mechanism
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete review');
            }
          }
        }
      ]
    );
  };

  const handleReviewSubmit = (review: Review) => {
    setShowReviewForm(false);
    setSelectedReview(null);
    Alert.alert('Success', 'Review updated successfully');
    // Refresh the reviews list
    // This would typically be handled by the ReviewsList component's refresh mechanism
  };

  const styles = createStyles(colors);

  if (!user) {
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
            <ThemedText style={styles.headerTitle}>My Reviews</ThemedText>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.notAuthenticatedContainer}>
            <ThemedText style={styles.notAuthenticatedText}>
              Please sign in to view your reviews
            </ThemedText>
            <TouchableOpacity 
              style={[styles.signInButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <ThemedText style={styles.signInButtonText}>Sign In</ThemedText>
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
          <ThemedText style={styles.headerTitle}>My Reviews</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ReviewsList 
          reviewerId={user.id}
          onEdit={handleEditReview}
          onDelete={handleDeleteReview}
          showReviewee={true}
        />

        {/* Review Form Modal */}
        <ReviewForm
          visible={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setSelectedReview(null);
          }}
          onSubmit={handleReviewSubmit}
          orderId={selectedReview?.order_id || ''}
          revieweeId={selectedReview?.reviewee_id || ''}
          initialData={selectedReview || undefined}
          isEdit={!!selectedReview}
          reviewId={selectedReview?.id}
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
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notAuthenticatedText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  signInButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});