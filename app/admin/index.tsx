import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Activity,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Code,
  Settings as SettingsIcon,
  BarChart3,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService, DashboardStats } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadDashboardStats();
  }, [timeRange]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getDashboardStats(timeRange);
      setStats(data);
    } catch (error) {
      console.error('Load dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
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
    return value >= 0 ? ArrowUpRight : ArrowDownRight;
  };

  const styles = createStyles(colors);

  if (loading && !stats) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading dashboard data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Platform Overview
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.timeRangeButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                const ranges: Array<'7d' | '30d' | '90d' | '1y'> = ['7d', '30d', '90d', '1y'];
                const currentIndex = ranges.indexOf(timeRange);
                const nextIndex = (currentIndex + 1) % ranges.length;
                setTimeRange(ranges[nextIndex]);
              }}
            >
              <Calendar size={16} color={colors.primary} />
              <ThemedText style={[styles.timeRangeText, { color: colors.primary }]}>
                {timeRange === '7d' ? 'Last 7 days' : 
                 timeRange === '30d' ? 'Last 30 days' : 
                 timeRange === '90d' ? 'Last 90 days' : 'Last 12 months'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/admin/settings')}
            >
              <SettingsIcon size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: colors.primary + '20' }]}>
                  <DollarSign size={24} color={colors.primary} />
                </View>
                <View style={styles.metricChange}>
                  {stats && (
                    <>
                      {React.createElement(getChangeIcon(stats.revenue.change), {
                        size: 16,
                        color: getChangeColor(stats.revenue.change),
                      })}
                      <ThemedText style={[
                        styles.metricChangeText,
                        { color: getChangeColor(stats.revenue.change) }
                      ]}>
                        {formatPercentage(stats.revenue.change)}
                      </ThemedText>
                    </>
                  )}
                </View>
              </View>
              <ThemedText style={styles.metricValue}>
                {stats ? formatCurrency(stats.revenue.total) : '$0'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Total Revenue
              </ThemedText>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: colors.success + '20' }]}>
                  <Users size={24} color={colors.success} />
                </View>
                <View style={styles.metricChange}>
                  {stats && (
                    <>
                      {React.createElement(getChangeIcon(stats.users.change), {
                        size: 16,
                        color: getChangeColor(stats.users.change),
                      })}
                      <ThemedText style={[
                        styles.metricChangeText,
                        { color: getChangeColor(stats.users.change) }
                      ]}>
                        {formatPercentage(stats.users.change)}
                      </ThemedText>
                    </>
                  )}
                </View>
              </View>
              <ThemedText style={styles.metricValue}>
                {stats?.users.total.toLocaleString() || '0'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Total Users
              </ThemedText>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: colors.info + '20' }]}>
                  <Package size={24} color={colors.info} />
                </View>
                <View style={styles.metricChange}>
                  {stats && (
                    <>
                      {React.createElement(getChangeIcon(stats.items.change), {
                        size: 16,
                        color: getChangeColor(stats.items.change),
                      })}
                      <ThemedText style={[
                        styles.metricChangeText,
                        { color: getChangeColor(stats.items.change) }
                      ]}>
                        {formatPercentage(stats.items.change)}
                      </ThemedText>
                    </>
                  )}
                </View>
              </View>
              <ThemedText style={styles.metricValue}>
                {stats?.items.activeItems.toLocaleString() || '0'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Active Items
              </ThemedText>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: colors.warning + '20' }]}>
                  <ShoppingCart size={24} color={colors.warning} />
                </View>
                <View style={styles.metricChange}>
                  {stats && (
                    <>
                      {React.createElement(getChangeIcon(stats.orders.change), {
                        size: 16,
                        color: getChangeColor(stats.orders.change),
                      })}
                      <ThemedText style={[
                        styles.metricChangeText,
                        { color: getChangeColor(stats.orders.change) }
                      ]}>
                        {formatPercentage(stats.orders.change)}
                      </ThemedText>
                    </>
                  )}
                </View>
              </View>
              <ThemedText style={styles.metricValue}>
                {stats?.orders.total.toLocaleString() || '0'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Total Orders
              </ThemedText>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/users')}
              >
                <Users size={32} color={colors.primary} />
                <ThemedText style={styles.actionTitle}>Manage Users</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  View and moderate users
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/items')}
              >
                <Package size={32} color={colors.success} />
                <ThemedText style={styles.actionTitle}>Review Items</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Moderate listings
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/orders')}
              >
                <ShoppingCart size={32} color={colors.info} />
                <ThemedText style={styles.actionTitle}>Track Orders</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Monitor transactions
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/disputes')}
              >
                <AlertTriangle size={32} color={colors.error} />
                <ThemedText style={styles.actionTitle}>Handle Disputes</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Resolve conflicts
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/delivery-api')}
              >
                <Code size={32} color={colors.warning} />
                <ThemedText style={styles.actionTitle}>Delivery API</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Manage rider integration
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/admin/analytics')}
              >
                <BarChart3 size={32} color={colors.secondary} />
                <ThemedText style={styles.actionTitle}>Analytics</ThemedText>
                <ThemedText style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  View platform metrics
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
              <TouchableOpacity onPress={() => router.push('/admin/analytics')}>
                <ThemedText style={[styles.viewAllText, { color: colors.primary }]}>
                  View All
                </ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.activityCard, { backgroundColor: colors.surface }]}>
              {stats?.recentActivity.map((activity, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.activityItem}
                  onPress={() => {
                    if (activity.type === 'user') {
                      router.push(`/admin/users?id=${activity.entity_id}`);
                    } else if (activity.type === 'order') {
                      router.push(`/admin/orders?id=${activity.entity_id}`);
                    } else if (activity.type === 'item') {
                      router.push(`/admin/items?id=${activity.entity_id}`);
                    } else if (activity.type === 'dispute') {
                      router.push(`/admin/disputes?id=${activity.entity_id}`);
                    }
                  }}
                >
                  <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                    <Eye size={16} color={activity.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <ThemedText style={styles.activityTitle}>{activity.title}</ThemedText>
                    <ThemedText style={[styles.activityTime, { color: colors.textSecondary }]}>
                      {activity.time}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.activityValue, { color: activity.color }]}>
                    {activity.value}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Platform Health */}
          <View style={[styles.section, { marginBottom: 100 }]}>
            <ThemedText style={styles.sectionTitle}>Platform Health</ThemedText>
            <View style={[styles.healthCard, { backgroundColor: colors.surface }]}>
              <View style={styles.healthMetric}>
                <View style={styles.healthHeader}>
                  <ThemedText style={styles.healthLabel}>System Status</ThemedText>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                </View>
                <ThemedText style={[styles.healthValue, { color: colors.success }]}>
                  Operational
                </ThemedText>
              </View>

              <View style={[styles.healthDivider, { backgroundColor: colors.border }]} />

              <View style={styles.healthMetric}>
                <View style={styles.healthHeader}>
                  <ThemedText style={styles.healthLabel}>Active Disputes</ThemedText>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: stats && stats.disputes.active > 5 ? colors.error : colors.success }
                  ]} />
                </View>
                <ThemedText style={[
                  styles.healthValue, 
                  { color: stats && stats.disputes.active > 5 ? colors.error : colors.success }
                ]}>
                  {stats?.disputes.active || 0}
                </ThemedText>
              </View>

              <View style={[styles.healthDivider, { backgroundColor: colors.border }]} />

              <View style={styles.healthMetric}>
                <View style={styles.healthHeader}>
                  <ThemedText style={styles.healthLabel}>Response Time</ThemedText>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: stats && stats.disputes.resolution_time_avg > 48 ? colors.warning : colors.success }
                  ]} />
                </View>
                <ThemedText style={[
                  styles.healthValue, 
                  { color: stats && stats.disputes.resolution_time_avg > 48 ? colors.warning : colors.success }
                ]}>
                  {stats ? `${stats.disputes.resolution_time_avg} hours` : 'N/A'}
                </ThemedText>
              </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  settingsButton: {
    padding: 12,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
  },
  metricCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  activityValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  healthCard: {
    borderRadius: 16,
    padding: 20,
  },
  healthMetric: {
    flex: 1,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  healthValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  healthDivider: {
    height: 1,
    marginVertical: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});