import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Flag,
  Trash2,
  CheckCircle,
  DollarSign,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService, AdminItem } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function AdminItemsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'flagged' | 'removed'>('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await AdminService.getItems();
      setItems(data);
    } catch (error) {
      console.error('Load items error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAction = async (itemId: string, action: 'approve' | 'flag' | 'remove') => {
    const actionText = action === 'approve' ? 'approve' : action === 'flag' ? 'flag' : 'remove';
    
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionText} this item?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'remove' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await AdminService.moderateItem(itemId, action);
              await loadItems();
              Alert.alert('Success', `Item ${actionText}d successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${actionText} item`);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.seller.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'flagged': return colors.warning;
      case 'removed': return colors.error;
      case 'sold': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const renderItem = ({ item }: { item: AdminItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        setSelectedItem(item);
        setShowItemModal(true);
      }}
    >
      <View style={styles.itemHeader}>
        <Image 
          source={{ uri: item.images[0] || 'https://via.placeholder.com/80' }} 
          style={styles.itemImage} 
        />
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText style={[styles.itemBrand, { color: colors.textSecondary }]}>
            {item.brand} • {item.category}
          </ThemedText>
          <View style={styles.itemMeta}>
            <ThemedText style={[styles.itemPrice, { color: colors.primary }]}>
              ${item.price.toFixed(2)}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedItem(item);
            setShowItemModal(true);
          }}
        >
          <MoreVertical size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemFooter}>
        <View style={styles.sellerInfo}>
          {item.seller.profile_picture ? (
            <Image source={{ uri: item.seller.profile_picture }} style={styles.sellerAvatar} />
          ) : (
            <View style={[styles.sellerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.sellerAvatarText}>
                {item.seller.nickname.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText style={[styles.sellerName, { color: colors.textSecondary }]}>
            by {item.seller.nickname}
          </ThemedText>
        </View>
        <ThemedText style={[styles.itemDate, { color: colors.textSecondary }]}>
          {formatDate(item.created_at)}
        </ThemedText>
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
          <ThemedText style={styles.headerTitle}>Item Management</ThemedText>
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
              placeholder="Search items..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filterTabs}>
          {['all', 'active', 'flagged', 'removed'].map((status) => (
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

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Item Detail Modal */}
        <Modal
          visible={showItemModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowItemModal(false)}
        >
          {selectedItem && (
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Item Details</ThemedText>
                <TouchableOpacity onPress={() => setShowItemModal(false)}>
                  <ThemedText style={[styles.modalClose, { color: colors.primary }]}>
                    Done
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <Image 
                  source={{ uri: selectedItem.images[0] || 'https://via.placeholder.com/300' }} 
                  style={styles.modalImage} 
                />
                
                <View style={styles.itemDetails}>
                  <ThemedText style={styles.modalItemTitle}>{selectedItem.title}</ThemedText>
                  <ThemedText style={[styles.modalItemPrice, { color: colors.primary }]}>
                    ${selectedItem.price.toFixed(2)}
                  </ThemedText>
                  
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Brand
                      </ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedItem.brand}</ThemedText>
                    </View>
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Category
                      </ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedItem.category}</ThemedText>
                    </View>
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Condition
                      </ThemedText>
                      <ThemedText style={styles.detailValue}>{selectedItem.condition}</ThemedText>
                    </View>
                    <View style={styles.detailItem}>
                      <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Status
                      </ThemedText>
                      <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedItem.status) + '20' }]}>
                        <ThemedText style={[styles.modalStatusText, { color: getStatusColor(selectedItem.status) }]}>
                          {selectedItem.status}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.descriptionSection}>
                    <ThemedText style={styles.descriptionTitle}>Description</ThemedText>
                    <ThemedText style={[styles.descriptionText, { color: colors.textSecondary }]}>
                      {selectedItem.description}
                    </ThemedText>
                  </View>

                  <View style={styles.actionSection}>
                    <ThemedText style={styles.actionSectionTitle}>Actions</ThemedText>
                    
                    <View style={styles.actionButtons}>
                      {selectedItem.status !== 'active' && (
                        <TouchableOpacity
                          style={[styles.actionItem, { backgroundColor: colors.success + '20' }]}
                          onPress={() => {
                            setShowItemModal(false);
                            handleItemAction(selectedItem.id, 'approve');
                          }}
                        >
                          <CheckCircle size={20} color={colors.success} />
                          <ThemedText style={[styles.actionText, { color: colors.success }]}>
                            Approve
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                      
                      {selectedItem.status !== 'flagged' && (
                        <TouchableOpacity
                          style={[styles.actionItem, { backgroundColor: colors.warning + '20' }]}
                          onPress={() => {
                            setShowItemModal(false);
                            handleItemAction(selectedItem.id, 'flag');
                          }}
                        >
                          <Flag size={20} color={colors.warning} />
                          <ThemedText style={[styles.actionText, { color: colors.warning }]}>
                            Flag Item
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={[styles.actionItem, { backgroundColor: colors.error + '20' }]}
                        onPress={() => {
                          setShowItemModal(false);
                          handleItemAction(selectedItem.id, 'remove');
                        }}
                      >
                        <Trash2 size={20} color={colors.error} />
                        <ThemedText style={[styles.actionText, { color: colors.error }]}>
                          Remove Item
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
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
  actionButton: {
    padding: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  sellerAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sellerAvatarText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  sellerName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  itemDate: {
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
  modalClose: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  itemDetails: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  modalItemPrice: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  descriptionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  actionSection: {
    marginBottom: 40,
  },
  actionSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});