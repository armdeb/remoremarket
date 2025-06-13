import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { useNotifications } from '~/contexts/NotificationContext';
import { NotificationBadge } from './NotificationBadge';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface NotificationIconProps {
  size?: number;
  color?: string;
  badgeSize?: 'small' | 'medium' | 'large';
}

export function NotificationIcon({ 
  size = 24, 
  color,
  badgeSize = 'small'
}: NotificationIconProps) {
  const { unreadCount } = useNotifications();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/notifications')}
    >
      <Bell size={size} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <NotificationBadge size={badgeSize} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});