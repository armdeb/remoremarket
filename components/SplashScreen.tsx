import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

const { width, height } = Dimensions.get('window');

export function SplashScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
          <ThemedText style={[styles.logoText, { color: colors.primary }]}>
            R
          </ThemedText>
        </View>
        <ThemedText style={[styles.appName, { color: '#FFFFFF' }]}>
          Remore
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: '#FFFFFF', opacity: 0.8 }]}>
          Sell. Buy. Love.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
  },
  appName: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
  },
});