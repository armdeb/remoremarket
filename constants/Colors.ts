export const Colors = {
  light: {
    primary: '#8B5A3C',
    secondary: '#A3E635',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  dark: {
    primary: '#A3E635',
    secondary: '#8B5A3C',
    background: '#1A1A1A',
    surface: '#2D2D2D',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
};

export const getColors = (colorScheme: 'light' | 'dark') => Colors[colorScheme];