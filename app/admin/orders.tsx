import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService, AdminOrder } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function AdminOrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await AdminService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.buyer.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.seller.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'paid': return colors.info;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const renderOrder = ({ item }: { item: AdminOrder }) => (
    <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.surface }]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <ThemedText style={styles.orderId}>#{item.id.substring(0, 8)}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.orderDate, { color: colors.textSecondary }]}>
          {formatDate(item.created_at)}
        </ThemedText>
      </View>

      <View style={styles.orderContent}>
        <Image 
          source={{ uri: item.item.images[0] || 'https://via.placeholder.com/60' }} 
          style={styles.itemImage} 
        />
        <View style={styles.orderDetails}>
          <ThemedText style={styles.itemTitle} numberOfLines={2}>
            {item.item.title}
          </ThemedText>
          <View style={styles.orderMeta}>
            <View style={styles.userInfo}>
              <User size={14} color={colors.textSecondary} />
              <ThemedText style={[styles.userName, { color: colors.textSecondary }]}>
                {item.buyer.nickname} → {item.seller.nickname}
              </ThemedText>
            </View>
            <View style={styles.priceInfo}>
              <DollarSign size={16} color={colors.primary} />
              <ThemedText style={[styles.orderAmount, { color: colors.primary }]}>
                ${item.total_amount.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.feeInfo}>
          <ThemedText style={[styles.feeLabel, { color: colors.textSecondary }]}>
            Platform Fee:
          </ThemedText>
          <ThemedText style={[styles.feeAmount, { color: colors.success }]}>
            ${item.platform_fee.toFixed(2)}
          </ThemedText>
        </View>
        {item.payment_intent_id && (
          <ThemedText style={[styles.paymentId, { color: colors.textSecondary }]}>
            Payment: {item.payment_intent_id.substring(0, 12)}...
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(colors);

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
          <ThemedText style={styles.headerTitle}>Order Management</ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]}>
              <Filter size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search orders..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filterTabs}>
          {['all', 'pending', 'paid', 'completed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilterStatus(status as any)}
            >
              <ThemedText style={[
                styles.filterTabText,
                filterStatus === status && { color: '#FFFFFF' },
                filterStatus !== status && { color: colors.textSecondary },
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Package size={20} color={colors.primary} />
            <View style={styles.statContent}>
              <ThemedText style={styles.statValue}>{filteredOrders.length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                Orders
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <DollarSign size={20} color={colors.success} />
            <View style={styles.statContent}>
              <ThemedText style={styles.statValue}>
                ${filteredOrders.reduce((sum, order) => sum + order.platform_fee, 0).toFixed(0)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                Revenue
              </ThemedText>
            </View>
          </View>
        </View>

        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  orderContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  orderMeta: {
    gap: 6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  feeAmount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  paymentId: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
});