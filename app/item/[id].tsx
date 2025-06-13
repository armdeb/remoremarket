import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ArrowLeft, Heart, Share2, MessageCircle, Star, MapPin, Shield } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PaymentModal } from '~/components/PaymentModal';
import { StripeService } from '~/lib/stripe';
import { SocialService } from '~/lib/social';
import { ReviewStats } from '~/components/ReviewStats';
import { FollowButton } from '~/components/FollowButton';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';
import { useAuth } from '~/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userWallet, setUserWallet] = useState<any>(null);
  const [isFollowingSeller, setIsFollowingSeller] = useState(false);

  // Mock item data - in a real app, this would be fetched based on the ID
  const item = {
    id: id as string,
    title: 'Vintage Denim Jacket',
    price: 45,
    originalPrice: 89,
    images: [
      'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2',
      'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2',
      'https://images.pexels.com/photos/1598509/pexels-photo-1598509.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2',
    ],
    brand: 'Levi\'s',
    size: 'M',
    condition: 'Good',
    description: 'This beautiful vintage denim jacket is in good condition. Perfect for any occasion, this piece combines style and comfort. From a smoke-free home and carefully stored. Some minor signs of wear that add to its vintage charm.',
    seller: {
      id: 'seller-123',
      name: 'Sarah M.',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.8,
      reviewCount: 127,
      responseTime: '< 1 hour',
      location: 'New York, NY',
    },
    category: 'Women',
    material: 'Cotton Denim',
    color: 'Blue',
    measurements: {
      chest: '42 cm',
      length: '58 cm',
      sleeves: '60 cm',
    },
    tags: ['vintage', 'denim', 'casual', 'spring'],
    views: 234,
    likes: 18,
    postedDate: '2 days ago',
  };

  useEffect(() => {
    loadUserWallet();
    checkIfFollowingSeller();
  }, []);

  const loadUserWallet = async () => {
    try {
      const wallet = await StripeService.getUserWallet();
      setUserWallet(wallet);
    } catch (error) {
      console.error('Load wallet error:', error);
    }
  };

  const checkIfFollowingSeller = async () => {
    try {
      if (user && item.seller.id) {
        const isFollowing = await SocialService.isFollowing(item.seller.id);
        setIsFollowingSeller(isFollowing);
      }
    } catch (error) {
      console.error('Check if following seller error:', error);
    }
  };

  const handleBuyNow = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (orderId: string) => {
    setShowPaymentModal(false);
    Alert.alert(
      'Purchase Successful!',
      'Your order has been placed successfully. You will receive delivery details soon.',
      [
        {
          text: 'View Order',
          onPress: () => {
            // Navigate to order details
            router.push(`/order/${orderId}`);
          },
        },
        {
          text: 'Continue Shopping',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleShareItem = async () => {
    try {
      await SocialService.shareItem(item.id, item.title);
    } catch (error) {
      console.error('Share item error:', error);
    }
  };

  const handleFollowChange = (isFollowing: boolean) => {
    setIsFollowingSeller(isFollowing);
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
              onPress={handleShareItem}
            >
              <Share2 size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Heart
                size={24}
                color={isFavorite ? colors.error : colors.primary}
                fill={isFavorite ? colors.error : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image Gallery */}
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
            >
              {item.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.mainImage} />
              ))}
            </ScrollView>
            
            {/* Image Indicators */}
            <View style={styles.imageIndicators}>
              {item.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    selectedImageIndex === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>

            {/* Discount Badge */}
            <View style={[styles.discountBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.discountText}>
                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            {/* Price Section */}
            <View style={styles.priceSection}>
              <View style={styles.priceContainer}>
                <ThemedText style={[styles.price, { color: colors.primary }]}>${item.price}</ThemedText>
                <ThemedText style={[styles.originalPrice, { color: colors.textSecondary }]}>${item.originalPrice}</ThemedText>
              </View>
              <View style={[styles.conditionBadge, { backgroundColor: colors.success + '20' }]}>
                <ThemedText style={[styles.conditionText, { color: colors.success }]}>{item.condition}</ThemedText>
              </View>
            </View>

            {/* Title and Brand */}
            <ThemedText style={styles.title}>{item.title}</ThemedText>
            <ThemedText style={[styles.brand, { color: colors.primary }]}>{item.brand}</ThemedText>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <ThemedText style={styles.statNumber}>{item.views}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>views</ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText style={styles.statNumber}>{item.likes}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>likes</ThemedText>
              </View>
              <ThemedText style={[styles.postedDate, { color: colors.textSecondary }]}>Posted {item.postedDate}</ThemedText>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsSection}>
              <ThemedText style={styles.sectionTitle}>Details</ThemedText>
              <View style={styles.detailsGrid}>
                <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Size</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.size}</ThemedText>
                </View>
                <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.category}</ThemedText>
                </View>
                <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Material</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.material}</ThemedText>
                </View>
                <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Color</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.color}</ThemedText>
                </View>
              </View>
            </View>

            {/* Measurements */}
            <View style={styles.measurementsSection}>
              <ThemedText style={styles.sectionTitle}>Measurements</ThemedText>
              <View style={styles.measurementsGrid}>
                {Object.entries(item.measurements).map(([key, value]) => (
                  <View key={key} style={[styles.measurementItem, { backgroundColor: colors.surface }]}>
                    <ThemedText style={[styles.measurementLabel, { color: colors.textSecondary }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</ThemedText>
                    <ThemedText style={styles.measurementValue}>{value}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.sectionTitle}>Description</ThemedText>
              <ThemedText style={[styles.descriptionText, { color: colors.textSecondary }]}>{item.description}</ThemedText>
            </View>

            {/* Tags */}
            <View style={styles.tagsSection}>
              <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
              <View style={styles.tagsContainer}>
                {item.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.info + '20' }]}>
                    <ThemedText style={[styles.tagText, { color: colors.info }]}>#{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Seller Section */}
            <View style={styles.sellerSection}>
              <ThemedText style={styles.sectionTitle}>Seller</ThemedText>
              <View style={[styles.sellerInfo, { backgroundColor: colors.surface }]}>
                <Image source={{ uri: item.seller.avatar }} style={styles.sellerAvatar} />
                <View style={styles.sellerDetails}>
                  <ThemedText style={styles.sellerName}>{item.seller.name}</ThemedText>
                  <TouchableOpacity 
                    style={styles.ratingContainer}
                    onPress={() => router.push(`/reviews/${item.seller.id}`)}
                  >
                    <Star size={16} color={colors.warning} fill={colors.warning} />
                    <ThemedText style={[styles.rating, { color: colors.textSecondary }]}>
                      {item.seller.rating} ({item.seller.reviewCount} reviews)
                    </ThemedText>
                  </TouchableOpacity>
                  <View style={styles.sellerMeta}>
                    <View style={styles.responseTime}>
                      <Shield size={14} color={colors.success} />
                      <ThemedText style={[styles.responseTimeText, { color: colors.success }]}>
                        Responds {item.seller.responseTime}
                      </ThemedText>
                    </View>
                    <View style={styles.locationContainer}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
                        {item.seller.location}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                
                {user && user.id !== item.seller.id && (
                  <FollowButton 
                    userId={item.seller.id}
                    isFollowing={isFollowingSeller}
                    onFollowChange={handleFollowChange}
                    size="small"
                  />
                )}
              </View>
              
              {/* Seller Reviews Preview */}
              <View style={styles.sellerReviewsPreview}>
                <View style={styles.sellerReviewsHeader}>
                  <ThemedText style={styles.sellerReviewsTitle}>Reviews</ThemedText>
                  <TouchableOpacity 
                    style={styles.viewAllReviewsButton}
                    onPress={() => router.push(`/reviews/${item.seller.id}`)}
                  >
                    <ThemedText style={[styles.viewAllReviewsText, { color: colors.primary }]}>
                      View All
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                
                <ReviewStats userId={item.seller.id} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.messageButton, { borderColor: colors.primary }]}>
            <MessageCircle size={20} color={colors.primary} />
            <ThemedText style={[styles.messageButtonText, { color: colors.primary }]}>Message</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buyButton, { backgroundColor: colors.primary }]}
            onPress={handleBuyNow}
          >
            <ThemedText style={styles.buyButtonText}>Buy Now</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          item={{
            id: item.id,
            title: item.title,
            price: item.price,
            seller_id: item.seller.id,
          }}
          userWallet={userWallet}
          onPaymentSuccess={handlePaymentSuccess}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  mainImage: {
    width: width,
    height: height * 0.5,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  content: {
    padding: 20,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  originalPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textDecorationLine: 'line-through',
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  brand: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  postedDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 'auto',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  measurementsSection: {
    marginBottom: 24,
  },
  measurementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  measurementLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sellerSection: {
    marginBottom: 24,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  sellerMeta: {
    gap: 4,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  viewProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewProfileText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  sellerReviewsPreview: {
    marginTop: 16,
  },
  sellerReviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerReviewsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  viewAllReviewsButton: {
    padding: 4,
  },
  viewAllReviewsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});