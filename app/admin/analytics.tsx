import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  Calendar,
  BarChart3,
  Download,
  Share2,
  PieChart,
  LineChart,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';
import { AnalyticsChart } from '~/components/AnalyticsChart';

const { width } = Dimensions.get('window');

export default function AdminAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders' | 'users' | 'items'>('revenue');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAnalytics(timeRange, ['revenue', 'orders', 'users', 'items']);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Load analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number) => {
    return value >= 0 ? colors.success : colors.error;
  };

  const getChangeIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const formatChartDate = (dateStr: string) => {
    if (timeRange === '7d' || timeRange === '30d') {
      // Format as "Jun 15"
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeRange === '90d') {
      // Format as "Week 24"
      if (dateStr.includes('W')) {
        const [year, week] = dateStr.split('-W');
        return `Week ${week}`;
      }
      return dateStr;
    } else {
      // Format as "Jun 2024"
      const [year, month] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const exportAnalytics = () => {
    // In a real app, this would generate and download a report
    alert('Analytics report will be exported and emailed to you.');
  };

  const shareAnalytics = () => {
    // In a real app, this would share the analytics dashboard
    alert('Share link copied to clipboard.');
  };

  const styles = createStyles(colors);

  if (loading && !analyticsData) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading analytics data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Analytics</ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
              onPress={exportAnalytics}
            >
              <Download size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
              onPress={shareAnalytics}
            >
              <Share2 size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeRangeSelector}>
          {['7d', '30d', '90d', '1y'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeRange(range as any)}
            >
              <ThemedText style={[
                styles.timeRangeText,
                timeRange === range && { color: '#FFFFFF' },
                timeRange !== range && { color: colors.textSecondary },
              ]}>
                {range}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Metric Selector */}
          <View style={styles.metricSelector}>
            <TouchableOpacity
              style={[
                styles.metricButton,
                activeMetric === 'revenue' && styles.activeMetricButton,
                activeMetric === 'revenue' && { borderColor: colors.primary }
              ]}
              onPress={() => setActiveMetric('revenue')}
            >
              <DollarSign size={20} color={activeMetric === 'revenue' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                styles.metricButtonText,
                activeMetric === 'revenue' && { color: colors.primary }
              ]}>
                Revenue
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.metricButton,
                activeMetric === 'orders' && styles.activeMetricButton,
                activeMetric === 'orders' && { borderColor: colors.primary }
              ]}
              onPress={() => setActiveMetric('orders')}
            >
              <ShoppingCart size={20} color={activeMetric === 'orders' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                styles.metricButtonText,
                activeMetric === 'orders' && { color: colors.primary }
              ]}>
                Orders
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.metricButton,
                activeMetric === 'users' && styles.activeMetricButton,
                activeMetric === 'users' && { borderColor: colors.primary }
              ]}
              onPress={() => setActiveMetric('users')}
            >
              <Users size={20} color={activeMetric === 'users' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                styles.metricButtonText,
                activeMetric === 'users' && { color: colors.primary }
              ]}>
                Users
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.metricButton,
                activeMetric === 'items' && styles.activeMetricButton,
                activeMetric === 'items' && { borderColor: colors.primary }
              ]}
              onPress={() => setActiveMetric('items')}
            >
              <Package size={20} color={activeMetric === 'items' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                styles.metricButtonText,
                activeMetric === 'items' && { color: colors.primary }
              ]}>
                Items
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Chart Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                {activeMetric === 'revenue' && <DollarSign size={20} color={colors.primary} />}
                {activeMetric === 'orders' && <ShoppingCart size={20} color={colors.primary} />}
                {activeMetric === 'users' && <Users size={20} color={colors.primary} />}
                {activeMetric === 'items' && <Package size={20} color={colors.primary} />}
                <ThemedText style={styles.sectionTitle}>
                  {activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)} Overview
                </ThemedText>
              </View>
              <View style={styles.chartLegend}>
                <LineChart size={16} color={colors.primary} />
                <ThemedText style={[styles.legendText, { color: colors.primary }]}>
                  {timeRange === '7d' ? 'Daily' : 
                   timeRange === '30d' ? 'Daily' : 
                   timeRange === '90d' ? 'Weekly' : 'Monthly'}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
              {loading ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <>
                  <View style={styles.chartHeader}>
                    <View style={styles.chartMetric}>
                      <ThemedText style={styles.chartMetricValue}>
                        {activeMetric === 'revenue' 
                          ? formatCurrency(analyticsData?.revenue?.total || 0)
                          : analyticsData?.[activeMetric]?.total?.toLocaleString() || '0'}
                      </ThemedText>
                      <View style={styles.changeContainer}>
                        {React.createElement(getChangeIcon(10), {
                          size: 16,
                          color: getChangeColor(10),
                        })}
                        <ThemedText style={[
                          styles.changeText,
                          { color: getChangeColor(10) }
                        ]}>
                          {formatPercentage(10)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.chartPeriod}>
                      <Calendar size={16} color={colors.textSecondary} />
                      <ThemedText style={[styles.chartPeriodText, { color: colors.textSecondary }]}>
                        {timeRange === '7d' ? 'Last 7 days' : 
                         timeRange === '30d' ? 'Last 30 days' : 
                         timeRange === '90d' ? 'Last 90 days' : 'Last 12 months'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.chartContainer}>
                    <AnalyticsChart 
                      data={analyticsData?.[activeMetric]?.chartData || []}
                      height={200}
                      width={width - 80}
                      color={colors.primary}
                      formatX={formatChartDate}
                      formatY={activeMetric === 'revenue' ? (val: number) => `$${val}` : undefined}
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Key Metrics</ThemedText>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <Users size={24} color={colors.success} />
                <ThemedText style={styles.metricValue}>
                  {analyticsData?.users?.total?.toLocaleString() || '0'}
                </ThemedText>
                <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Total Users
                </ThemedText>
                <ThemedText style={[styles.metricSubtext, { color: colors.success }]}>
                  +{analyticsData?.users?.newUsers || 0} new
                </ThemedText>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <Package size={24} color={colors.info} />
                <ThemedText style={styles.metricValue}>
                  {analyticsData?.items?.activeItems?.toLocaleString() || '0'}
                </ThemedText>
                <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Active Items
                </ThemedText>
                <ThemedText style={[styles.metricSubtext, { color: colors.info }]}>
                  {analyticsData?.items?.soldItems || 0} sold
                </ThemedText>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <ShoppingCart size={24} color={colors.warning} />
                <ThemedText style={styles.metricValue}>
                  {analyticsData?.orders?.total?.toLocaleString() || '0'}
                </ThemedText>
                <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Total Orders
                </ThemedText>
                <ThemedText style={[styles.metricSubtext, { color: colors.success }]}>
                  {analyticsData?.orders?.completedOrders || 0} completed
                </ThemedText>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <DollarSign size={24} color={colors.primary} />
                <ThemedText style={styles.metricValue}>
                  {formatCurrency(analyticsData?.revenue?.total || 0)}
                </ThemedText>
                <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Total Revenue
                </ThemedText>
                <View style={styles.metricChangeContainer}>
                  {React.createElement(getChangeIcon(10), {
                    size: 14,
                    color: getChangeColor(10),
                  })}
                  <ThemedText style={[styles.metricChangeText, { color: getChangeColor(10) }]}>
                    {formatPercentage(10)}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Top Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <PieChart size={20} color={colors.primary} />
                <ThemedText style={styles.sectionTitle}>Top Categories</ThemedText>
              </View>
            </View>
            <View style={[styles.categoriesCard, { backgroundColor: colors.surface }]}>
              {analyticsData?.topCategories?.map((category: any, index: number) => (
                <View key={category.name} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                  </View>
                  <View style={styles.categoryStats}>
                    <ThemedText style={styles.categoryPercent}>{category.value}%</ThemedText>
                    <View style={styles.categoryBar}>
                      <View 
                        style={[
                          styles.categoryBarFill, 
                          { 
                            backgroundColor: category.color,
                            width: `${category.value}%`
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Top Sellers */}
          <View style={[styles.section, { marginBottom: 100 }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Users size={20} color={colors.primary} />
                <ThemedText style={styles.sectionTitle}>Top Sellers</ThemedText>
              </View>
            </View>
            <View style={[styles.sellersCard, { backgroundColor: colors.surface }]}>
              {analyticsData?.topSellers?.map((seller: any, index: number) => (
                <View key={seller.id} style={styles.sellerItem}>
                  <View style={styles.sellerRank}>
                    <ThemedText style={[styles.rankNumber, { color: colors.primary }]}>
                      #{index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.sellerInfo}>
                    <ThemedText style={styles.sellerName}>{seller.name}</ThemedText>
                    <ThemedText style={[styles.sellerStats, { color: colors.textSecondary }]}>
                      {seller.sales} sales
                    </ThemedText>
                  </View>
                  <View style={styles.sellerRevenue}>
                    <ThemedText style={[styles.revenueValue, { color: colors.success }]}>
                      {formatCurrency(seller.revenue)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  metricSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  activeMetricButton: {
    backgroundColor: colors.surface,
  },
  metricButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
  },
  chartLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  chartMetric: {
    flex: 1,
  },
  chartMetricValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  chartPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartPeriodText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  metricChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metricChangeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  categoriesCard: {
    padding: 20,
    borderRadius: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  categoryStats: {
    alignItems: 'flex-end',
    flex: 1,
  },
  categoryPercent: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  categoryBar: {
    width: 80,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sellersCard: {
    padding: 20,
    borderRadius: 16,
  },
  sellerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  sellerStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  sellerRevenue: {
    alignItems: 'flex-end',
  },
  revenueValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});