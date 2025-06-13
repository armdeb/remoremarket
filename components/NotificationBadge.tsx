import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNotifications } from '~/contexts/NotificationContext';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export function NotificationBadge({ size = 'medium' }: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  if (unreadCount === 0) {
    return null;
  }

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return {
          width: 16,
          height: 16,
          fontSize: 10,
          minWidth: 16,
        };
      case 'large':
        return {
          width: 24,
          height: 24,
          fontSize: 14,
          minWidth: 24,
        };
      default: // medium
        return {
          width: 20,
          height: 20,
          fontSize: 12,
          minWidth: 20,
        };
    }
  };

  const badgeSize = getBadgeSize();
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: colors.error,
      borderRadius: badgeSize.width / 2,
      width: displayCount.length > 1 ? undefined : badgeSize.width,
      height: badgeSize.height,
      minWidth: badgeSize.minWidth,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: displayCount.length > 1 ? 4 : 0,
    },
    text: {
      color: '#FFFFFF',
      fontSize: badgeSize.fontSize,
      fontFamily: 'Inter-Bold',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.badge}>
      <ThemedText style={styles.text}>{displayCount}</ThemedText>
    </View>
  );
}