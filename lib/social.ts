import { supabase } from './supabase';
import { Share } from 'react-native';

export interface FollowUser {
  id: string;
  nickname: string;
  profile_picture?: string;
  followers_count: number;
  following_count: number;
  created_at: string;
  is_following?: boolean;
}

export interface SocialFeedItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  brand: string;
  size: string;
  condition: string;
  category: string;
  seller_id: string;
  status: string;
  created_at: string;
  seller_nickname: string;
  seller_profile_picture?: string;
}

export class SocialService {
  // Follow a user
  static async followUser(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('followed_id', userId)
        .maybeSingle();

      if (existingFollow) {
        return true; // Already following
      }

      // Create follow relationship
      const { error } = await supabase
        .from('followers')
        .insert({
          follower_id: user.id,
          followed_id: userId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Follow user error:', error);
      throw error;
    }
  }

  // Unfollow a user
  static async unfollowUser(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('followed_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Unfollow user error:', error);
      throw error;
    }
  }

  // Check if current user is following another user
  static async isFollowing(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase.rpc('is_following', {
        follower_uuid: user.id,
        followed_uuid: userId,
      });

      return data || false;
    } catch (error) {
      console.error('Is following error:', error);
      return false;
    }
  }

  // Get social feed (items from followed users)
  static async getSocialFeed(limit: number = 20, offset: number = 0): Promise<SocialFeedItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_social_feed', {
        user_uuid: user.id,
        limit_val: limit,
        offset_val: offset,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get social feed error:', error);
      throw error;
    }
  }

  // Get followers of a user
  static async getFollowers(userId: string, limit: number = 20, offset: number = 0): Promise<FollowUser[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .from('followers')
        .select(`
          follower:profiles!followers_follower_id_fkey(
            id, nickname, profile_picture, followers_count, following_count, created_at
          )
        `)
        .eq('followed_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Format the response
      const followers = data.map(item => ({
        ...item.follower,
        is_following: false, // Will be updated below if needed
      }));

      // If authenticated, check which users the current user is following
      if (currentUserId) {
        const followerIds = followers.map(f => f.id);
        if (followerIds.length > 0) {
          const { data: followingData } = await supabase
            .from('followers')
            .select('followed_id')
            .eq('follower_id', currentUserId)
            .in('followed_id', followerIds);

          const followingSet = new Set((followingData || []).map(f => f.followed_id));
          
          // Update is_following flag
          followers.forEach(follower => {
            follower.is_following = followingSet.has(follower.id);
          });
        }
      }

      return followers;
    } catch (error) {
      console.error('Get followers error:', error);
      throw error;
    }
  }

  // Get users that a user is following
  static async getFollowing(userId: string, limit: number = 20, offset: number = 0): Promise<FollowUser[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .from('followers')
        .select(`
          followed:profiles!followers_followed_id_fkey(
            id, nickname, profile_picture, followers_count, following_count, created_at
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Format the response
      const following = data.map(item => ({
        ...item.followed,
        is_following: userId === currentUserId, // If viewing own following list, user is following all of them
      }));

      // If authenticated and not viewing own following list, check which users the current user is following
      if (currentUserId && userId !== currentUserId) {
        const followingIds = following.map(f => f.id);
        if (followingIds.length > 0) {
          const { data: followingData } = await supabase
            .from('followers')
            .select('followed_id')
            .eq('follower_id', currentUserId)
            .in('followed_id', followingIds);

          const followingSet = new Set((followingData || []).map(f => f.followed_id));
          
          // Update is_following flag
          following.forEach(followedUser => {
            followedUser.is_following = followingSet.has(followedUser.id);
          });
        }
      }

      return following;
    } catch (error) {
      console.error('Get following error:', error);
      throw error;
    }
  }

  // Share an item
  static async shareItem(itemId: string, title: string): Promise<void> {
    try {
      const url = `${process.env.EXPO_PUBLIC_APP_URL || 'https://remore.app'}/item/${itemId}`;
      
      await Share.share({
        message: `Check out this item on Remore: ${title}\n${url}`,
        url: url,
        title: `Remore: ${title}`,
      });
    } catch (error) {
      console.error('Share item error:', error);
      throw error;
    }
  }
}