import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface AnalyticsChartProps {
  data: Array<{ date: string; value: number }>;
  height: number;
  width: number;
  color: string;
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  showLabels?: boolean;
  showGrid?: boolean;
}

export function AnalyticsChart({
  data,
  height,
  width,
  color,
  formatX = (val) => val,
  formatY = (val) => val.toString(),
  showLabels = true,
  showGrid = true,
}: AnalyticsChartProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height, width }]}>
        <ThemedText style={styles.noDataText}>No data available</ThemedText>
      </View>
    );
  }

  // Find min and max values
  const values = data.map(item => item.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue;

  // Calculate chart dimensions
  const chartWidth = width - 60; // Leave space for Y-axis labels
  const chartHeight = height - 40; // Leave space for X-axis labels
  const barWidth = Math.max(2, (chartWidth / data.length) * 0.6);
  const barSpacing = (chartWidth / data.length) * 0.4;

  // Calculate Y-axis ticks
  const numYTicks = 5;
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    return minValue + (valueRange * i) / (numYTicks - 1);
  });

  // Calculate X-axis ticks (show fewer labels for readability)
  const xTickInterval = Math.max(1, Math.ceil(data.length / 6));
  const xTicks = data.filter((_, i) => i % xTickInterval === 0).map(item => item.date);

  // Calculate bar heights and positions
  const bars = data.map((item, index) => {
    const barHeight = valueRange === 0 
      ? 0 
      : ((item.value - minValue) / valueRange) * chartHeight;
    
    return {
      x: index * (barWidth + barSpacing) + 30, // 30px offset for Y-axis
      y: chartHeight - barHeight + 10, // 10px offset for X-axis
      width: barWidth,
      height: barHeight,
      value: item.value,
      date: item.date,
    };
  });

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { height, width }]}>
      {/* Y-axis labels */}
      {showLabels && (
        <View style={styles.yAxis}>
          {yTicks.map((tick, index) => (
            <View key={`y-${index}`} style={[styles.yTickContainer, { bottom: (chartHeight * index) / (numYTicks - 1) + 10 }]}>
              <ThemedText style={[styles.yTickLabel, { color: colors.textSecondary }]}>
                {formatY(tick)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        {showGrid && yTicks.map((tick, index) => (
          <View 
            key={`grid-${index}`} 
            style={[
              styles.gridLine, 
              { 
                bottom: (chartHeight * index) / (numYTicks - 1) + 10,
                backgroundColor: colors.border,
                width: chartWidth
              }
            ]} 
          />
        ))}

        {/* Bars */}
        {bars.map((bar, index) => (
          <View
            key={`bar-${index}`}
            style={[
              styles.bar,
              {
                left: bar.x,
                bottom: bar.y > chartHeight + 10 ? chartHeight + 10 : bar.y,
                width: bar.width,
                height: bar.height <= 0 ? 1 : bar.height,
                backgroundColor: color,
              },
            ]}
          />
        ))}
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View style={styles.xAxis}>
          {xTicks.map((tick, index) => {
            const tickIndex = data.findIndex(item => item.date === tick);
            return (
              <ThemedText
                key={`x-${index}`}
                style={[
                  styles.xTickLabel,
                  {
                    left: tickIndex * (barWidth + barSpacing) + 30 + barWidth / 2,
                    color: colors.textSecondary,
                  },
                ]}
              >
                {formatX(tick)}
              </ThemedText>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  noDataText: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    justifyContent: 'space-between',
  },
  yTickContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
  },
  yTickLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
  },
  chartArea: {
    position: 'absolute',
    left: 30,
    top: 0,
    right: 0,
    bottom: 30,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    height: 1,
  },
  bar: {
    position: 'absolute',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  xAxis: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
  },
  xTickLabel: {
    position: 'absolute',
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    width: 60,
    marginLeft: -30,
  },
});