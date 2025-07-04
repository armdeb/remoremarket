import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SocialService, FollowUser } from '~/lib/social';
import { UserListItem } from '~/components/UserListItem';
import { useAuth } from '~/contexts/AuthContext';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    loadFollowing();
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

  const loadFollowing = async (refresh = false) => {
    try {
      if (refresh) {
        setOffset(0);
        setHasMore(true);
      }
      
      if (!hasMore && !refresh) return;
      
      const currentOffset = refresh ? 0 : offset;
      setLoading(true);
      
      const result = await SocialService.getFollowing(userId as string, 20, currentOffset);
      
      if (refresh) {
        setFollowing(result);
      } else {
        setFollowing(prev => [...prev, ...result]);
      }
      
      setOffset(currentOffset + result.length);
      setHasMore(result.length === 20);
    } catch (error) {
      console.error('Load following error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowing(true);
  };

  const handleFollowChange = (followedId: string, isFollowing: boolean) => {
    // Update local state
    setFollowing(prev => 
      prev.map(followed => 
        followed.id === followedId 
          ? { ...followed, is_following: isFollowing }
          : followed
      )
    );
  };

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading && !refreshing) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          Not following anyone yet
        </ThemedText>
        <ThemedText style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          When {userId === user?.id ? 'you follow' : 'this user follows'} people, they'll appear here
        </ThemedText>
      </View>
    );
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
          <ThemedText style={styles.headerTitle}>
            {userName ? `${userName} is Following` : 'Following'}
          </ThemedText>
          <View style={styles.headerRight} />
        </View>

        <FlatList
          data={following}
          renderItem={({ item }) => (
            <UserListItem 
              user={item}
              onFollowChange={handleFollowChange}
              currentUserId={user?.id}
            />
          )}
          keyExtractor={(item) => item.id}
          onEndReached={() => loadFollowing()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});