import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Star } from 'lucide-react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';

interface PromotionPlanCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  selected: boolean;
  onSelect: (id: string) => void;
  isPremium?: boolean;
}

export function PromotionPlanCard({
  id,
  name,
  description,
  price,
  duration,
  features,
  selected,
  onSelect,
  isPremium = false,
}: PromotionPlanCardProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && { borderColor: colors.primary, borderWidth: 2 },
        isPremium && { borderColor: colors.warning, borderWidth: isPremium && !selected ? 1 : 2 }
      ]}
      onPress={() => onSelect(id)}
    >
      {isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
          <Star size={12} color="#FFFFFF" />
          <ThemedText style={styles.premiumText}>BEST VALUE</ThemedText>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <ThemedText style={styles.name}>{name}</ThemedText>
          <ThemedText style={[styles.duration, { color: colors.textSecondary }]}>
            {formatDuration(duration)}
          </ThemedText>
        </View>
        {selected && (
          <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
            <Check size={16} color="#FFFFFF" />
          </View>
        )}
      </View>

      <ThemedText style={[styles.price, { color: colors.primary }]}>
        ${price.toFixed(2)}
      </ThemedText>

      <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </ThemedText>

      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
            <ThemedText style={styles.featureText}>{feature}</ThemedText>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 0,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});