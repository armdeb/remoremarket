import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { FollowButton } from './FollowButton';

interface UserListItemProps {
  user: {
    id: string;
    nickname: string;
    profile_picture?: string;
    followers_count?: number;
    following_count?: number;
    is_following?: boolean;
  };
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  showFollowButton?: boolean;
  currentUserId?: string | null;
}

export function UserListItem({ 
  user, 
  onFollowChange,
  showFollowButton = true,
  currentUserId
}: UserListItemProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const handleFollowChange = (isFollowing: boolean) => {
    onFollowChange?.(user.id, isFollowing);
  };

  const navigateToProfile = () => {
    router.push(`/user/${user.id}`);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={navigateToProfile}
    >
      <View style={styles.userInfo}>
        {user.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.avatarText}>
              {user.nickname.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        
        <View style={styles.userDetails}>
          <ThemedText style={styles.nickname}>{user.nickname}</ThemedText>
          
          {(user.followers_count !== undefined || user.following_count !== undefined) && (
            <View style={styles.statsContainer}>
              {user.followers_count !== undefined && (
                <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>
                  {user.followers_count} {user.followers_count === 1 ? 'follower' : 'followers'}
                </ThemedText>
              )}
              
              {user.followers_count !== undefined && user.following_count !== undefined && (
                <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
              )}
              
              {user.following_count !== undefined && (
                <ThemedText style={[styles.statText, { color: colors.textSecondary }]}>
                  {user.following_count} following
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </View>
      
      {showFollowButton && user.id !== currentUserId && (
        <FollowButton 
          userId={user.id}
          isFollowing={user.is_following || false}
          onFollowChange={handleFollowChange}
          size="small"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
});