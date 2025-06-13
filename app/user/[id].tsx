import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, Calendar, Star, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useAuth } from '~/contexts/AuthContext';
import { ReviewStats } from '~/components/ReviewStats';
import { FollowButton } from '~/components/FollowButton';
import { SocialService } from '~/lib/social';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

const { width } = Dimensions.get('window');
const itemWidth = (width - 45) / 2;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'reviews'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProfile();
    loadItems();
    checkIfFollowing();
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('seller_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      setItems(data || []);
    } catch (error) {
      console.error('Load items error:', error);
    }
  };

  const checkIfFollowing = async () => {
    try {
      if (user && id) {
        const isFollowing = await SocialService.isFollowing(id as string);
        setIsFollowing(isFollowing);
      }
    } catch (error) {
      console.error('Check if following error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadItems(), checkIfFollowing()]);
    setRefreshing(false);
  };

  const handleFollowChange = (isFollowing: boolean) => {
    setIsFollowing(isFollowing);
    // Update follower count in profile
    if (profile) {
      setProfile({
        ...profile,
        followers_count: isFollowing 
          ? (profile.followers_count || 0) + 1 
          : Math.max(0, (profile.followers_count || 0) - 1)
      });
    }
  };

  const handleShareProfile = async () => {
    try {
      await SocialService.shareItem(`user/${id}`, profile?.nickname || 'User Profile');
    } catch (error) {
      console.error('Share profile error:', error);
    }
  };

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: colors.background }]}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }} 
          style={styles.itemImage} 
        />
        <TouchableOpacity
          style={[styles.favoriteButton, { backgroundColor: colors.background }]}
          onPress={() => toggleFavorite(item.id)}
        >
          <Heart
            size={20}
            color={favorites.has(item.id) ? colors.error : colors.textSecondary}
            fill={favorites.has(item.id) ? colors.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemInfo}>
        <ThemedText style={[styles.itemPrice, { color: colors.primary }]}>${item.price}</ThemedText>
        <ThemedText style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.itemBrand, { color: colors.textSecondary }]}>
          {item.brand} • {item.size}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyItems = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No items listed yet</ThemedText>
    </View>
  );

  const styles = createStyles(colors);

  if (!profile && !loading) {
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
            <ThemedText style={styles.headerTitle}>User Profile</ThemedText>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.notFoundContainer}>
            <ThemedText style={styles.notFoundText}>User not found</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Profile Info */}
          <View style={styles.profileSection}>
            <Image 
              source={{ 
                uri: profile?.profile_picture || 
                'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2' 
              }} 
              style={styles.avatar} 
            />
            <ThemedText style={styles.userName}>{profile?.nickname || 'User'}</ThemedText>
            <ThemedText style={[styles.userHandle, { color: colors.textSecondary }]}>
              @{profile?.nickname?.toLowerCase().replace(/\s+/g, '_') || 'user'}
            </ThemedText>
            
            <View style={styles.locationContainer}>
              <MapPin size={16} color={colors.textSecondary} />
              <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
                New York, NY
              </ThemedText>
            </View>
            
            <View style={styles.joinContainer}>
              <Calendar size={16} color={colors.textSecondary} />
              <ThemedText style={[styles.joinText, { color: colors.textSecondary }]}>
                Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </ThemedText>
            </View>

            {/* Social Stats */}
            <View style={styles.socialStatsContainer}>
              <TouchableOpacity 
                style={styles.socialStat}
                onPress={() => router.push(`/social/followers/${id}`)}
              >
                <ThemedText style={styles.socialStatNumber}>{profile?.followers_count || 0}</ThemedText>
                <ThemedText style={[styles.socialStatLabel, { color: colors.textSecondary }]}>
                  Followers
                </ThemedText>
              </TouchableOpacity>
              
              <View style={[styles.socialDivider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity 
                style={styles.socialStat}
                onPress={() => router.push(`/social/following/${id}`)}
              >
                <ThemedText style={styles.socialStatNumber}>{profile?.following_count || 0}</ThemedText>
                <ThemedText style={[styles.socialStatLabel, { color: colors.textSecondary }]}>
                  Following
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Follow/Message Buttons */}
            {user && user.id !== id && (
              <View style={styles.actionButtonsContainer}>
                <FollowButton 
                  userId={id as string}
                  isFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                  size="medium"
                />
                
                <TouchableOpacity 
                  style={[styles.messageButton, { borderColor: colors.primary }]}
                  onPress={() => router.push(`/conversation/new?userId=${id}`)}
                >
                  <MessageCircle size={20} color={colors.primary} />
                  <ThemedText style={[styles.messageButtonText, { color: colors.primary }]}>
                    Message
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.shareButton, { backgroundColor: colors.surface }]}
                  onPress={handleShareProfile}
                >
                  <Share2 size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Reviews Section */}
            <TouchableOpacity 
              style={styles.reviewsContainer}
              onPress={() => router.push(`/reviews/${id}`)}
            >
              <ReviewStats userId={id as string} />
              <ThemedText style={[styles.viewAllReviews, { color: colors.primary }]}>
                View all reviews
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'items' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setActiveTab('items')}
            >
              <ThemedText style={[
                styles.tabText,
                activeTab === 'items' && { color: colors.primary, fontFamily: 'Inter-Bold' }
              ]}>
                Items ({items.length})
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'reviews' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setActiveTab('reviews')}
            >
              <ThemedText style={[
                styles.tabText,
                activeTab === 'reviews' && { color: colors.primary, fontFamily: 'Inter-Bold' }
              ]}>
                Reviews ({profile?.review_count || 0})
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'items' && (
            <View style={styles.itemsContainer}>
              {items.length === 0 ? (
                renderEmptyItems()
              ) : (
                <FlatList
                  data={items}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  contentContainerStyle={styles.itemsGrid}
                  columnWrapperStyle={styles.itemsRow}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
          
          {activeTab === 'reviews' && (
            <View style={styles.reviewsTabContainer}>
              <TouchableOpacity 
                style={[styles.viewAllReviewsButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/reviews/${id}`)}
              >
                <ThemedText style={styles.viewAllReviewsButtonText}>
                  View All Reviews
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  joinText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  socialStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
  },
  socialStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  socialStatNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  socialStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  socialDivider: {
    width: 1,
    height: 40,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  shareButton: {
    padding: 10,
    borderRadius: 8,
  },
  reviewsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  viewAllReviews: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  itemsContainer: {
    paddingBottom: 40,
  },
  itemsGrid: {
    padding: 15,
  },
  itemsRow: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: itemWidth,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: itemWidth * 1.3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    padding: 12,
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  reviewsTabContainer: {
    padding: 20,
    alignItems: 'center',
  },
  viewAllReviewsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewAllReviewsButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});