import { Text, type TextProps } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const color = lightColor || darkColor || colors.text;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? { fontSize: 16, fontFamily: 'Inter-Regular' } : undefined,
        type === 'title' ? { fontSize: 32, fontFamily: 'Inter-Bold' } : undefined,
        type === 'defaultSemiBold' ? { fontSize: 16, fontFamily: 'Inter-SemiBold' } : undefined,
        type === 'subtitle' ? { fontSize: 20, fontFamily: 'Inter-SemiBold' } : undefined,
        type === 'link' ? { fontSize: 16, fontFamily: 'Inter-Medium', color: colors.primary } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}