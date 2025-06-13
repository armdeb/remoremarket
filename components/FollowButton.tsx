import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { UserPlus, UserMinus } from 'lucide-react-native';
import { SocialService } from '~/lib/social';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export function FollowButton({ 
  userId, 
  isFollowing, 
  onFollowChange,
  size = 'medium',
  showText = true
}: FollowButtonProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    try {
      setLoading(true);
      
      if (following) {
        await SocialService.unfollowUser(userId);
        setFollowing(false);
      } else {
        await SocialService.followUser(userId);
        setFollowing(true);
      }
      
      onFollowChange?.(following ? false : true);
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          iconSize: 16,
          fontSize: 12,
        };
      case 'large':
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          iconSize: 24,
          fontSize: 16,
        };
      default: // medium
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          iconSize: 20,
          fontSize: 14,
        };
    }
  };

  const buttonSize = getButtonSize();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: following ? colors.surface : colors.primary,
          borderColor: following ? colors.border : colors.primary,
          borderWidth: following ? 1 : 0,
          paddingVertical: buttonSize.paddingVertical,
          paddingHorizontal: buttonSize.paddingHorizontal,
        }
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? colors.primary : '#FFFFFF'} />
      ) : (
        <>
          {following ? (
            <UserMinus size={buttonSize.iconSize} color={colors.primary} />
          ) : (
            <UserPlus size={buttonSize.iconSize} color="#FFFFFF" />
          )}
          
          {showText && (
            <ThemedText style={[
              styles.buttonText,
              { 
                color: following ? colors.primary : '#FFFFFF',
                fontSize: buttonSize.fontSize,
                marginLeft: 6,
              }
            ]}>
              {following ? 'Following' : 'Follow'}
            </ThemedText>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
  },
});