import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Star } from 'lucide-react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ReviewStatsProps {
  userId: string;
}

interface ReviewStats {
  average_rating: number | null;
  review_count: number;
  rating_distribution: {
    [key: number]: number;
  };
  category_ratings?: {
    item_accuracy: number | null;
    communication: number | null;
    shipping_speed: number | null;
  };
}

export function ReviewStats({ userId }: ReviewStatsProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews/stats/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to load review stats');
      }
    } catch (error) {
      console.error('Load review stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null, size: number = 16) => {
    if (rating === null) return null;
    
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= rating ? colors.warning : colors.border}
            fill={star <= rating ? colors.warning : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats || stats.review_count === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noReviewsText}>No reviews yet</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.ratingContainer}>
          <ThemedText style={styles.ratingNumber}>
            {stats.average_rating?.toFixed(1) || '0.0'}
          </ThemedText>
          {renderStars(stats.average_rating, 20)}
        </View>
        <ThemedText style={styles.reviewCount}>
          {stats.review_count} {stats.review_count === 1 ? 'review' : 'reviews'}
        </ThemedText>
      </View>

      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map((rating) => (
          <View key={rating} style={styles.distributionRow}>
            <View style={styles.distributionLabel}>
              <ThemedText style={styles.distributionNumber}>{rating}</ThemedText>
              <Star 
                size={14} 
                color={colors.warning}
                fill={colors.warning}
              />
            </View>
            <View style={styles.distributionBarContainer}>
              <View 
                style={[
                  styles.distributionBar, 
                  { 
                    width: `${calculatePercentage(stats.rating_distribution[rating], stats.review_count)}%`,
                    backgroundColor: colors.primary
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.distributionCount}>
              {stats.rating_distribution[rating]}
            </ThemedText>
          </View>
        ))}
      </View>

      {stats.category_ratings && (
        <View style={styles.categoryRatings}>
          <ThemedText style={styles.categoryTitle}>Rating Details</ThemedText>
          
          {stats.category_ratings.item_accuracy !== null && (
            <View style={styles.categoryRow}>
              <ThemedText style={styles.categoryLabel}>Item Accuracy</ThemedText>
              <View style={styles.categoryRating}>
                {renderStars(stats.category_ratings.item_accuracy)}
                <ThemedText style={styles.categoryValue}>
                  {stats.category_ratings.item_accuracy.toFixed(1)}
                </ThemedText>
              </View>
            </View>
          )}
          
          {stats.category_ratings.communication !== null && (
            <View style={styles.categoryRow}>
              <ThemedText style={styles.categoryLabel}>Communication</ThemedText>
              <View style={styles.categoryRating}>
                {renderStars(stats.category_ratings.communication)}
                <ThemedText style={styles.categoryValue}>
                  {stats.category_ratings.communication.toFixed(1)}
                </ThemedText>
              </View>
            </View>
          )}
          
          {stats.category_ratings.shipping_speed !== null && (
            <View style={styles.categoryRow}>
              <ThemedText style={styles.categoryLabel}>Shipping Speed</ThemedText>
              <View style={styles.categoryRating}>
                {renderStars(stats.category_ratings.shipping_speed)}
                <ThemedText style={styles.categoryValue}>
                  {stats.category_ratings.shipping_speed.toFixed(1)}
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  distributionContainer: {
    marginBottom: 20,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    marginRight: 8,
  },
  distributionNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginRight: 4,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 4,
  },
  distributionCount: {
    width: 30,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
    marginLeft: 8,
  },
  categoryRatings: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  categoryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});