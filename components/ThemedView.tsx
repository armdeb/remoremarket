import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const backgroundColor = lightColor || darkColor || colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}