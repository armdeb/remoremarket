import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  MessageSquare,
  Search,
  Filter,
  User,
  Calendar,
  Flag,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService, AdminDispute } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function AdminDisputesScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<AdminDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'investigating' | 'resolved'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [resolvingDispute, setResolvingDispute] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  useEffect(() => {
    if (params.id && disputes.length > 0) {
      const dispute = disputes.find(d => d.id === params.id);
      if (dispute) {
        setSelectedDispute(dispute);
        setShowDisputeModal(true);
      }
    }
  }, [params.id, disputes]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const { disputes } = await AdminService.getDisputes(
        searchQuery,
        filterStatus === 'all' ? undefined : filterStatus,
        filterPriority === 'all' ? undefined : filterPriority,
        sortBy,
        sortOrder
      );
      setDisputes(disputes);
      setFilteredDisputes(disputes);
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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      const filtered = disputes.filter(dispute => 
        dispute.order.item.title.toLowerCase().includes(text.toLowerCase()) ||
        dispute.order.buyer.nickname.toLowerCase().includes(text.toLowerCase()) ||
        dispute.order.seller.nickname.toLowerCase().includes(text.toLowerCase()) ||
        dispute.id.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDisputes(filtered);
    } else {
      setFilteredDisputes(disputes);
    }
  };

  const applyFilters = () => {
    let filtered = [...disputes];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(dispute => dispute.status === filterStatus);
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(dispute => dispute.priority === filterPriority);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return sortOrder === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return sortOrder === 'asc'
          ? priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
          : priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      }
      return 0;
    });
    
    setFilteredDisputes(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filterStatus, filterPriority, sortBy, sortOrder, disputes]);

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    
    if (!resolution.trim()) {
      Alert.alert('Error', 'Please provide a resolution description');
      return;
    }

    try {
      setResolvingDispute(true);
      await AdminService.resolveDispute(
        selectedDispute.id, 
        resolution,
        refundAmount ? parseFloat(refundAmount) : undefined
      );
      
      // Update local state
      const updatedDisputes = disputes.map(d => 
        d.id === selectedDispute.id 
          ? { 
              ...d, 
              status: 'resolved', 
              resolved_at: new Date().toISOString(),
              resolution
            } 
          : d
      );
      
      setDisputes(updatedDisputes);
      applyFilters();
      
      setShowDisputeModal(false);
      setResolution('');
      setRefundAmount('');
      
      Alert.alert('Success', 'Dispute resolved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve dispute');
    } finally {
      setResolvingDispute(false);
    }
  };

  const handleUpdatePriority = async (disputeId: string, priority: 'low' | 'medium' | 'high') => {
    try {
      await AdminService.updateDisputePriority(disputeId, priority);
      
      // Update local state
      const updatedDisputes = disputes.map(d => 
        d.id === disputeId ? { ...d, priority } : d
      );
      
      setDisputes(updatedDisputes);
      applyFilters();
      
      if (selectedDispute?.id === disputeId) {
        setSelectedDispute({ ...selectedDispute, priority });
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to update priority');
    }
  };

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
      case 'open': return colors.error;
      case 'investigating': return colors.warning;
      case 'resolved': return colors.success;
      case 'closed': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getDisputeTypeLabel = (type: string) => {
    switch (type) {
      case 'item_not_received': return 'Item Not Received';
      case 'item_not_as_described': return 'Not As Described';
      case 'payment_issue': return 'Payment Issue';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const renderDispute = ({ item }: { item: AdminDispute }) => (
    <TouchableOpacity
      style={[styles.disputeCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        setSelectedDispute(item);
        setShowDisputeModal(true);
      }}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <View style={styles.disputeTitle}>
            <AlertTriangle size={16} color={getStatusColor(item.status)} />
            <ThemedText style={styles.disputeId}>#{item.id.substring(0, 8)}</ThemedText>
          </View>
          <View style={styles.disputeBadges}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </ThemedText>
            </View>
            <TouchableOpacity 
              style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}
              onPress={() => {
                Alert.alert(
                  'Update Priority',
                  'Select a new priority level:',
                  [
                    { text: 'Low', onPress: () => handleUpdatePriority(item.id, 'low') },
                    { text: 'Medium', onPress: () => handleUpdatePriority(item.id, 'medium') },
                    { text: 'High', onPress: () => handleUpdatePriority(item.id, 'high') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            >
              <ThemedText style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority}
              </ThemedText>
              <ChevronDown size={12} color={getPriorityColor(item.priority)} />
            </TouchableOpacity>
          </View>
        </View>
        <ThemedText style={[styles.disputeDate, { color: colors.textSecondary }]}>
          {formatDate(item.created_at)}
        </ThemedText>
      </View>

      <View style={styles.disputeContent}>
        <ThemedText style={styles.disputeType}>
          {getDisputeTypeLabel(item.type)}
        </ThemedText>
        <ThemedText style={styles.itemTitle} numberOfLines={1}>
          {item.order.item.title}
        </ThemedText>
        <ThemedText style={[styles.disputeParties, { color: colors.textSecondary }]}>
          {item.order.buyer.nickname} vs {item.order.seller.nickname}
        </ThemedText>
        <ThemedText style={[styles.disputeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </ThemedText>
      </View>

      <View style={[styles.disputeFooter, { borderTopColor: colors.border }]}>
        <View style={styles.orderInfo}>
          <ThemedText style={[styles.orderAmount, { color: colors.primary }]}>
            ${item.order.item.price.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.timeInfo}>
          <Clock size={12} color={colors.textSecondary} />
          <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
            {item.resolved_at ? 'Resolved' : 'Open'}
          </ThemedText>
        </View>
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
          <ThemedText style={styles.headerTitle}>Dispute Management</ThemedText>
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={colors.primary} />
            {(filterStatus !== 'all' || filterPriority !== 'all') && (
              <View style={styles.filterBadge}>
                <ThemedText style={styles.filterBadgeText}>
                  {(filterStatus !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0)}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search disputes..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {showFilters && (
          <View style={[styles.filtersContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.filterRow}>
              <ThemedText style={styles.filterLabel}>Status:</ThemedText>
              <View style={styles.filterOptions}>
                {['all', 'open', 'investigating', 'resolved'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      filterStatus === status && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setFilterStatus(status as any)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      filterStatus === status && { color: '#FFFFFF' },
                      filterStatus !== status && { color: colors.textSecondary },
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <ThemedText style={styles.filterLabel}>Priority:</ThemedText>
              <View style={styles.filterOptions}>
                {['all', 'low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterOption,
                      filterPriority === priority && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setFilterPriority(priority as any)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      filterPriority === priority && { color: '#FFFFFF' },
                      filterPriority !== priority && { color: colors.textSecondary },
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <ThemedText style={styles.filterLabel}>Sort by:</ThemedText>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sortBy === 'created_at' && { borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    if (sortBy === 'created_at') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('created_at');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <ThemedText style={[
                    styles.sortOptionText,
                    sortBy === 'created_at' && { color: colors.primary },
                  ]}>
                    Date
                  </ThemedText>
                  {sortBy === 'created_at' && (
                    sortOrder === 'asc' ? (
                      <ChevronUp size={16} color={colors.primary} />
                    ) : (
                      <ChevronDown size={16} color={colors.primary} />
                    )
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    sortBy === 'priority' && { borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    if (sortBy === 'priority') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('priority');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <ThemedText style={[
                    styles.sortOptionText,
                    sortBy === 'priority' && { color: colors.primary },
                  ]}>
                    Priority
                  </ThemedText>
                  {sortBy === 'priority' && (
                    sortOrder === 'asc' ? (
                      <ChevronUp size={16} color={colors.primary} />
                    ) : (
                      <ChevronDown size={16} color={colors.primary} />
                    )
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <AlertTriangle size={20} color={colors.error} />
            <View style={styles.statContent}>
              <ThemedText style={styles.statValue}>
                {filteredDisputes.filter(d => d.status === 'open').length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                Open
              </ThemedText>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Clock size={20} color={colors.warning} />
            <View style={styles.statContent}>
              <ThemedText style={styles.statValue}>
                {filteredDisputes.filter(d => d.status === 'investigating').length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                Investigating
              </ThemedText>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <CheckCircle size={20} color={colors.success} />
            <View style={styles.statContent}>
              <ThemedText style={styles.statValue}>
                {filteredDisputes.filter(d => d.status === 'resolved').length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                Resolved
              </ThemedText>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading disputes...</ThemedText>
          </View>
        ) : filteredDisputes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={64} color={colors.textSecondary} />
            <ThemedText style={styles.emptyTitle}>No disputes found</ThemedText>
            <ThemedText style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              {searchQuery 
                ? "No disputes match your search criteria" 
                : "There are no active disputes at this time"}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredDisputes}
            renderItem={renderDispute}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {/* Dispute Detail Modal */}
        <Modal
          visible={showDisputeModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDisputeModal(false)}
        >
          {selectedDispute && (
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Dispute Details</ThemedText>
                <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.disputeDetails}>
                  <View style={styles.disputeStatusHeader}>
                    <View style={[
                      styles.modalStatusBadge, 
                      { backgroundColor: getStatusColor(selectedDispute.status) + '20' }
                    ]}>
                      <ThemedText style={[
                        styles.modalStatusText, 
                        { color: getStatusColor(selectedDispute.status) }
                      ]}>
                        {selectedDispute.status}
                      </ThemedText>
                    </View>
                    
                    <TouchableOpacity 
                      style={[
                        styles.priorityBadge, 
                        { backgroundColor: getPriorityColor(selectedDispute.priority) + '20' }
                      ]}
                      onPress={() => {
                        Alert.alert(
                          'Update Priority',
                          'Select a new priority level:',
                          [
                            { text: 'Low', onPress: () => handleUpdatePriority(selectedDispute.id, 'low') },
                            { text: 'Medium', onPress: () => handleUpdatePriority(selectedDispute.id, 'medium') },
                            { text: 'High', onPress: () => handleUpdatePriority(selectedDispute.id, 'high') },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <ThemedText style={[
                        styles.priorityText, 
                        { color: getPriorityColor(selectedDispute.priority) }
                      ]}>
                        {selectedDispute.priority}
                      </ThemedText>
                      <ChevronDown size={12} color={getPriorityColor(selectedDispute.priority)} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Dispute ID
                    </ThemedText>
                    <ThemedText style={styles.detailValue}>
                      #{selectedDispute.id.substring(0, 8)}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Type
                    </ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {getDisputeTypeLabel(selectedDispute.type)}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Item
                    </ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {selectedDispute.order.item.title}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Price
                    </ThemedText>
                    <ThemedText style={[styles.detailValue, { color: colors.primary }]}>
                      ${selectedDispute.order.item.price.toFixed(2)}
                    </ThemedText>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Buyer
                    </ThemedText>
                    <View style={styles.userBadge}>
                      <User size={14} color={colors.info} />
                      <ThemedText style={styles.detailValue}>
                        {selectedDispute.order.buyer.nickname}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Seller
                    </ThemedText>
                    <View style={styles.userBadge}>
                      <User size={14} color={colors.warning} />
                      <ThemedText style={styles.detailValue}>
                        {selectedDispute.order.seller.nickname}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Reported By
                    </ThemedText>
                    <View style={styles.userBadge}>
                      <Flag size={14} color={colors.error} />
                      <ThemedText style={styles.detailValue}>
                        {selectedDispute.order.buyer.nickname}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Date Reported
                    </ThemedText>
                    <View style={styles.userBadge}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <ThemedText style={styles.detailValue}>
                        {formatDate(selectedDispute.created_at)}
                      </ThemedText>
                    </View>
                  </View>

                  {selectedDispute.resolved_at && (
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Date Resolved
                      </ThemedText>
                      <View style={styles.userBadge}>
                        <Calendar size={14} color={colors.success} />
                        <ThemedText style={styles.detailValue}>
                          {formatDate(selectedDispute.resolved_at)}
                        </ThemedText>
                      </View>
                    </View>
                  )}

                  <View style={styles.descriptionSection}>
                    <ThemedText style={[styles.descriptionTitle, { color: colors.textSecondary }]}>
                      Description
                    </ThemedText>
                    <ThemedText style={styles.descriptionText}>
                      {selectedDispute.description}
                    </ThemedText>
                  </View>

                  {selectedDispute.evidence && (
                    <View style={styles.evidenceSection}>
                      <ThemedText style={styles.evidenceTitle}>Evidence</ThemedText>
                      
                      {selectedDispute.evidence.buyer_evidence && selectedDispute.evidence.buyer_evidence.length > 0 && (
                        <View style={styles.evidenceGroup}>
                          <ThemedText style={[styles.evidenceSubtitle, { color: colors.info }]}>
                            Buyer Evidence
                          </ThemedText>
                          <View style={styles.evidenceLinks}>
                            {selectedDispute.evidence.buyer_evidence.map((link, index) => (
                              <TouchableOpacity 
                                key={index}
                                style={[styles.evidenceLink, { backgroundColor: colors.info + '10' }]}
                                onPress={() => Alert.alert("View Evidence", "This would open the evidence image in a full screen viewer.")}
                              >
                                <ThemedText style={[styles.evidenceLinkText, { color: colors.info }]}>
                                  Evidence #{index + 1}
                                </ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                      
                      {selectedDispute.evidence.seller_evidence && selectedDispute.evidence.seller_evidence.length > 0 && (
                        <View style={styles.evidenceGroup}>
                          <ThemedText style={[styles.evidenceSubtitle, { color: colors.warning }]}>
                            Seller Evidence
                          </ThemedText>
                          <View style={styles.evidenceLinks}>
                            {selectedDispute.evidence.seller_evidence.map((link, index) => (
                              <TouchableOpacity 
                                key={index}
                                style={[styles.evidenceLink, { backgroundColor: colors.warning + '10' }]}
                                onPress={() => Alert.alert("View Evidence", "This would open the evidence image in a full screen viewer.")}
                              >
                                <ThemedText style={[styles.evidenceLinkText, { color: colors.warning }]}>
                                  Evidence #{index + 1}
                                </ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {selectedDispute.resolution && (
                    <View style={styles.resolutionSection}>
                      <ThemedText style={styles.resolutionTitle}>Resolution</ThemedText>
                      <View style={[styles.resolutionBox, { backgroundColor: colors.success + '10' }]}>
                        <CheckCircle size={16} color={colors.success} />
                        <ThemedText style={styles.resolutionText}>
                          {selectedDispute.resolution}
                        </ThemedText>
                      </View>
                    </View>
                  )}

                  {selectedDispute.status !== 'resolved' && (
                    <View style={styles.resolutionSection}>
                      <ThemedText style={styles.resolutionTitle}>Resolve Dispute</ThemedText>
                      <TextInput
                        style={[styles.resolutionInput, { 
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        }]}
                        placeholder="Enter resolution details..."
                        placeholderTextColor={colors.textSecondary}
                        value={resolution}
                        onChangeText={setResolution}
                        multiline
                        numberOfLines={4}
                      />
                      
                      <View style={styles.refundContainer}>
                        <ThemedText style={styles.refundLabel}>Refund Amount (Optional)</ThemedText>
                        <View style={[styles.refundInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <ThemedText style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</ThemedText>
                          <TextInput
                            style={[styles.refundInput, { color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textSecondary}
                            value={refundAmount}
                            onChangeText={setRefundAmount}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.resolveButton, { backgroundColor: colors.success }]}
                        onPress={handleResolveDispute}
                        disabled={resolvingDispute}
                      >
                        {resolvingDispute ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <CheckCircle size={20} color="#FFFFFF" />
                            <ThemedText style={styles.resolveButtonText}>
                              Resolve Dispute
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </ThemedView>
          )}
        </Modal>
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
  filterButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  filterOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sortOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  disputeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  disputeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  disputeDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  disputeContent: {
    marginBottom: 12,
  },
  disputeType: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  disputeParties: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  disputeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  disputeDetails: {
    marginBottom: 32,
  },
  disputeStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descriptionSection: {
    marginTop: 20,
  },
  descriptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  evidenceSection: {
    marginTop: 24,
  },
  evidenceTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  evidenceGroup: {
    marginBottom: 16,
  },
  evidenceSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  evidenceLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidenceLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  evidenceLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  resolutionSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  resolutionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  resolutionBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  resolutionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 20,
  },
  resolutionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 100,
  },
  refundContainer: {
    marginBottom: 16,
  },
  refundLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  refundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  refundInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});