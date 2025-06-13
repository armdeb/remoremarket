import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function LoadingSpinner({ size = 'large', color }: LoadingSpinnerProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});