import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Settings, Star, MapPin, Calendar, Package, Heart, MessageCircle, Share2, UserPlus, Users } from 'lucide-react-native';
import { useAuth } from '~/contexts/AuthContext';
import { ReviewStats } from '~/components/ReviewStats';
import { SocialService } from '~/lib/social';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 3;

export default function ProfileScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [activeTab, setActiveTab] = useState<'selling' | 'sold'>('selling');
  const [refreshing, setRefreshing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  useEffect(() => {
    if (user) {
      loadSocialCounts();
    }
  }, [user]);

  const loadSocialCounts = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('followers_count, following_count')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
      }
    } catch (error) {
      console.error('Load social counts error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSocialCounts();
    setRefreshing(false);
  };
  
  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
              <ThemedText style={[styles.logoText, { color: colors.primary }]}>R</ThemedText>
            </View>
            <ThemedText style={[styles.headerTitle, { color: colors.primary }]}>Profile</ThemedText>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color={colors.primary} />
          </TouchableOpacity>
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
                uri: user?.profile_picture || 
                'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=2' 
              }} 
              style={styles.avatar} 
            />
            <ThemedText style={styles.userName}>{user?.nickname || 'User'}</ThemedText>
            <ThemedText style={[styles.userHandle, { color: colors.textSecondary }]}>
              @{user?.nickname?.toLowerCase().replace(/\s+/g, '_') || 'user'}
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
                Joined {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </ThemedText>
            </View>

            {/* Social Stats */}
            <View style={styles.socialStatsContainer}>
              <TouchableOpacity 
                style={styles.socialStat}
                onPress={() => router.push(`/social/followers/${user?.id}`)}
              >
                <ThemedText style={styles.socialStatNumber}>{followersCount}</ThemedText>
                <ThemedText style={[styles.socialStatLabel, { color: colors.textSecondary }]}>
                  Followers
                </ThemedText>
              </TouchableOpacity>
              
              <View style={[styles.socialDivider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity 
                style={styles.socialStat}
                onPress={() => router.push(`/social/following/${user?.id}`)}
              >
                <ThemedText style={styles.socialStatNumber}>{followingCount}</ThemedText>
                <ThemedText style={[styles.socialStatLabel, { color: colors.textSecondary }]}>
                  Following
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Reviews Section */}
            <TouchableOpacity 
              style={styles.reviewsContainer}
              onPress={() => router.push(`/reviews/${user?.id}`)}
            >
              {user?.id && <ReviewStats userId={user.id} />}
              <ThemedText style={[styles.viewAllReviews, { color: colors.primary }]}>
                View all reviews
              </ThemedText>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/reviews/my-reviews')}
              >
                <Star size={20} color={colors.warning} />
                <ThemedText style={styles.actionButtonText}>My Reviews</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/(tabs)/favorites')}
              >
                <Heart size={20} color={colors.error} />
                <ThemedText style={styles.actionButtonText}>Favorites</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                onPress={() => SocialService.shareItem('profile', user?.nickname || 'User Profile')}
              >
                <Share2 size={20} color={colors.primary} />
                <ThemedText style={styles.actionButtonText}>Share</ThemedText>
              </TouchableOpacity>
            </View>
            
            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/social/followers/${user?.id}`)}
              >
                <UserPlus size={20} color={colors.primary} />
                <ThemedText style={styles.socialButtonText}>Followers</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/social/following/${user?.id}`)}
              >
                <Users size={20} color={colors.primary} />
                <ThemedText style={styles.socialButtonText}>Following</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
});