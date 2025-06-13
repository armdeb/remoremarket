import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Clock, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { DisputeService, Dispute } from '~/lib/disputes';
import { useAuth } from '~/contexts/AuthContext';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from '~/components/ThemedText';
import { ThemedView } from '~/components/ThemedView';

export default function DisputesScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'investigating' | 'resolved'>('all');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const data = await DisputeService.getUserDisputes();
      setDisputes(data);
    } catch (error) {
      console.error('Load disputes error:', error);
      Alert.alert('Error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.error;
      case 'investigating': return colors.warning;
      case 'resolved': return colors.success;
      case 'closed': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={20} color={getStatusColor(status)} />;
      case 'investigating': return <Clock size={20} color={getStatusColor(status)} />;
      case 'resolved': return <CheckCircle size={20} color={getStatusColor(status)} />;
      case 'closed': return <ShieldAlert size={20} color={getStatusColor(status)} />;
      default: return <AlertTriangle size={20} color={getStatusColor(status)} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredDisputes = activeFilter === 'all' 
    ? disputes 
    : disputes.filter(dispute => dispute.status === activeFilter);

  const renderDispute = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={[styles.disputeCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/disputes/${item.id}`)}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <View style={styles.disputeTitle}>
            {getStatusIcon(item.status)}
            <ThemedText style={styles.disputeId}>#{item.id.substring(0, 8)}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.disputeDate, { color: colors.textSecondary }]}>
          {formatDate(item.created_at)}
        </ThemedText>
      </View>

      <View style={styles.disputeContent}>
        <ThemedText style={styles.disputeType}>
          {item.type.replace(/_/g, ' ')}
        </ThemedText>
        <ThemedText style={styles.itemTitle} numberOfLines={1}>
          {item.order?.item.title}
        </ThemedText>
        <ThemedText style={[styles.disputeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </ThemedText>
      </View>

      {item.unread_count > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.unreadText}>
            {item.unread_count} new {item.unread_count === 1 ? 'message' : 'messages'}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => {
    if (loading && !refreshing) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <ShieldAlert size={64} color={colors.textSecondary} />
        <ThemedText style={styles.emptyTitle}>No disputes found</ThemedText>
        <ThemedText style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          {activeFilter !== 'all' 
            ? `You don't have any ${activeFilter} disputes`
            : "You haven't opened any disputes yet"}
        </ThemedText>
      </View>
    );
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>My Disputes</ThemedText>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === 'all' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveFilter('all')}
            >
              <ThemedText style={[
                styles.filterText,
                activeFilter === 'all' && { color: '#FFFFFF' }
              ]}>
                All
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === 'open' && { backgroundColor: colors.error }
              ]}
              onPress={() => setActiveFilter('open')}
            >
              <AlertTriangle size={16} color={activeFilter === 'open' ? '#FFFFFF' : colors.error} />
              <ThemedText style={[
                styles.filterText,
                activeFilter === 'open' && { color: '#FFFFFF' }
              ]}>
                Open
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === 'investigating' && { backgroundColor: colors.warning }
              ]}
              onPress={() => setActiveFilter('investigating')}
            >
              <Clock size={16} color={activeFilter === 'investigating' ? '#FFFFFF' : colors.warning} />
              <ThemedText style={[
                styles.filterText,
                activeFilter === 'investigating' && { color: '#FFFFFF' }
              ]}>
                Investigating
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === 'resolved' && { backgroundColor: colors.success }
              ]}
              onPress={() => setActiveFilter('resolved')}
            >
              <CheckCircle size={16} color={activeFilter === 'resolved' ? '#FFFFFF' : colors.success} />
              <ThemedText style={[
                styles.filterText,
                activeFilter === 'resolved' && { color: '#FFFFFF' }
              ]}>
                Resolved
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading disputes...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredDisputes}
            renderItem={renderDispute}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={renderEmptyComponent}
          />
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  disputeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  disputeId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  disputeDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  disputeContent: {
    marginBottom: 8,
  },
  disputeType: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  disputeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  unreadBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});