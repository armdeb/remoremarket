import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Review, ReviewsService } from '~/lib/reviews';
import { ReviewStats } from '~/components/ReviewStats';
import { ReviewsList } from '~/components/ReviewsList';
import { ReviewForm } from '~/components/ReviewForm';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function UserReviewsScreen() {
  const { userId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [userName, setUserName] = useState('User');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState('');

  useEffect(() => {
    loadUserName();
  }, [userId]);

  const loadUserName = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserName(data.nickname);
      }
    } catch (error) {
      console.error('Load user name error:', error);
    }
  };

  const handleReviewSubmit = (review: Review) => {
    setShowReviewForm(false);
    Alert.alert('Success', 'Review submitted successfully');
    // Refresh the reviews list
    // This would typically be handled by the ReviewsList component's refresh mechanism
  };

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

  const handleReply = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setShowResponseForm(true);
  };

  const handleResponseSubmit = async () => {
    if (!selectedReviewId || !responseContent.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      await ReviewsService.createResponse({
        review_id: selectedReviewId,
        content: responseContent.trim()
      });
      
      setShowResponseForm(false);
      setSelectedReviewId(null);
      setResponseContent('');
      Alert.alert('Success', 'Response submitted successfully');
      // Refresh the reviews list
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit response');
    }
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
          <ThemedText style={styles.headerTitle}>{userName}'s Reviews</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ReviewStats userId={userId as string} />
        
        <ReviewsList 
          userId={userId as string}
          onReply={handleReply}
          onEdit={handleEditReview}
          onDelete={handleDeleteReview}
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

        {/* Response Form Modal */}
        <Modal
          visible={showResponseForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowResponseForm(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.responseFormContainer}>
              <View style={styles.responseFormHeader}>
                <ThemedText style={styles.responseFormTitle}>Reply to Review</ThemedText>
                <TouchableOpacity onPress={() => setShowResponseForm(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.responseInput, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="Write your response..."
                placeholderTextColor={colors.textSecondary}
                value={responseContent}
                onChangeText={setResponseContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <View style={styles.responseFormFooter}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowResponseForm(false)}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitResponseButton, { backgroundColor: colors.primary }]}
                  onPress={handleResponseSubmit}
                >
                  <ThemedText style={styles.submitResponseButtonText}>Submit</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  responseFormContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  responseFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  responseFormTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  responseInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 120,
    marginBottom: 16,
  },
  responseFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  submitResponseButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitResponseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});