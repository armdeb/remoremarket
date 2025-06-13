import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Filter } from 'lucide-react-native';
import { Review, ReviewsService } from '../lib/reviews';
import { ReviewCard } from './ReviewCard';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ReviewsListProps {
  userId?: string;
  reviewerId?: string;
  orderId?: string;
  onReply?: (reviewId: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
  showReviewee?: boolean;
}

export function ReviewsList({ 
  userId, 
  reviewerId, 
  orderId,
  onReply,
  onEdit,
  onDelete,
  showActions = true,
  showReviewee = false
}: ReviewsListProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, [userId, reviewerId, orderId, filterRating]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      let fetchedReviews: Review[] = [];
      
      if (userId) {
        fetchedReviews = await ReviewsService.getUserReviews(userId);
      } else if (reviewerId) {
        fetchedReviews = await ReviewsService.getReviewsByUser(reviewerId);
      } else if (orderId) {
        // Fetch reviews for a specific order
        const response = await fetch(`/api/reviews?orderId=${orderId}`);
        if (response.ok) {
          fetchedReviews = await response.json();
        }
      }

      // Apply rating filter if set
      if (filterRating !== null) {
        fetchedReviews = fetchedReviews.filter(review => review.rating === filterRating);
      }

      setReviews(fetchedReviews);
    } catch (error) {
      console.error('Load reviews error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const renderFilterButton = (rating: number | null, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterRating === rating && { backgroundColor: colors.primary },
        { borderColor: colors.border }
      ]}
      onPress={() => setFilterRating(rating)}
    >
      <ThemedText style={[
        styles.filterButtonText,
        filterRating === rating && { color: '#FFFFFF' }
      ]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  const styles = createStyles(colors);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filtersContainer}>
        <ThemedText style={styles.filtersTitle}>Filter by:</ThemedText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {renderFilterButton(null, 'All')}
          {[5, 4, 3, 2, 1].map(rating => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.filterButton,
                filterRating === rating && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setFilterRating(rating)}
            >
              <View style={styles.filterStars}>
                <ThemedText style={[
                  styles.filterButtonText,
                  filterRating === rating && { color: '#FFFFFF' }
                ]}>
                  {rating}
                </ThemedText>
                <Star 
                  size={14} 
                  color={filterRating === rating ? '#FFFFFF' : colors.warning}
                  fill={filterRating === rating ? '#FFFFFF' : colors.warning}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No reviews found</ThemedText>
          {filterRating !== null && (
            <TouchableOpacity
              style={[styles.clearFilterButton, { backgroundColor: colors.primary }]}
              onPress={() => setFilterRating(null)}
            >
              <ThemedText style={styles.clearFilterText}>Clear Filter</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={({ item }) => (
            <ReviewCard 
              review={item} 
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              showActions={showActions}
              showReviewee={showReviewee}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
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
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
  },
  clearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  filtersScrollContent: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filterStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});