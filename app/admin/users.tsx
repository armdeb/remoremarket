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
  Shield,
  Ban,
  Mail,
  Phone,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService, AdminUser } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function AdminUsersScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await AdminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await AdminService.moderateUser(userId, action);
              await loadUsers();
              Alert.alert('Success', `User ${action}d successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
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
      case 'suspended': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const renderUser = ({ item }: { item: AdminUser }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: colors.surface }]}
      onPress={() => {
        setSelectedUser(item);
        setShowUserModal(true);
      }}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          {item.profile_picture ? (
            <Image source={{ uri: item.profile_picture }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.userAvatarText}>
                {item.nickname.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.userDetails}>
            <ThemedText style={styles.userName}>{item.nickname}</ThemedText>
            <ThemedText style={[styles.userEmail, { color: colors.textSecondary }]}>
              {item.email}
            </ThemedText>
            <View style={styles.userMeta}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </ThemedText>
              </View>
              <ThemedText style={[styles.joinDate, { color: colors.textSecondary }]}>
                Joined {formatDate(item.created_at)}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedUser(item);
            setShowUserModal(true);
          }}
        >
          <MoreVertical size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {item.items_count}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Items
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.success }]}>
            {item.orders_count}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Orders
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.warning }]}>
            ${item.total_spent.toFixed(0)}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
            Spent
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
          <ThemedText style={styles.headerTitle}>User Management</ThemedText>
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
              placeholder="Search users..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filterTabs}>
          {['all', 'active', 'suspended'].map((status) => (
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
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* User Detail Modal */}
        <Modal
          visible={showUserModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowUserModal(false)}
        >
          {selectedUser && (
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>User Details</ThemedText>
                <TouchableOpacity onPress={() => setShowUserModal(false)}>
                  <ThemedText style={[styles.modalClose, { color: colors.primary }]}>
                    Done
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.userProfile}>
                  {selectedUser.profile_picture ? (
                    <Image source={{ uri: selectedUser.profile_picture }} style={styles.modalAvatar} />
                  ) : (
                    <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                      <ThemedText style={styles.modalAvatarText}>
                        {selectedUser.nickname.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.modalUserName}>{selectedUser.nickname}</ThemedText>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedUser.status) + '20' }]}>
                    <ThemedText style={[styles.modalStatusText, { color: getStatusColor(selectedUser.status) }]}>
                      {selectedUser.status}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.userInfoSection}>
                  <View style={styles.infoItem}>
                    <Mail size={20} color={colors.textSecondary} />
                    <View style={styles.infoContent}>
                      <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
                        Email
                      </ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedUser.email}</ThemedText>
                    </View>
                  </View>

                  {selectedUser.phone && (
                    <View style={styles.infoItem}>
                      <Phone size={20} color={colors.textSecondary} />
                      <View style={styles.infoContent}>
                        <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
                          Phone
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>{selectedUser.phone}</ThemedText>
                      </View>
                    </View>
                  )}

                  <View style={styles.infoItem}>
                    <Calendar size={20} color={colors.textSecondary} />
                    <View style={styles.infoContent}>
                      <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
                        Member Since
                      </ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {formatDate(selectedUser.created_at)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <DollarSign size={20} color={colors.textSecondary} />
                    <View style={styles.infoContent}>
                      <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
                        Total Spent
                      </ThemedText>
                      <ThemedText style={styles.infoValue}>
                        ${selectedUser.total_spent.toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.actionSection}>
                  <ThemedText style={styles.actionSectionTitle}>Actions</ThemedText>
                  
                  {selectedUser.status === 'active' ? (
                    <TouchableOpacity
                      style={[styles.actionItem, { backgroundColor: colors.error + '20' }]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUserAction(selectedUser.id, 'suspend');
                      }}
                    >
                      <Ban size={20} color={colors.error} />
                      <ThemedText style={[styles.actionText, { color: colors.error }]}>
                        Suspend User
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionItem, { backgroundColor: colors.success + '20' }]}
                      onPress={() => {
                        setShowUserModal(false);
                        handleUserAction(selectedUser.id, 'activate');
                      }}
                    >
                      <Shield size={20} color={colors.success} />
                      <ThemedText style={[styles.actionText, { color: colors.success }]}>
                        Activate User
                      </ThemedText>
                    </TouchableOpacity>
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
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  joinDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  actionButton: {
    padding: 8,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  statLabel: {
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
  },
  userProfile: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  modalUserName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
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
  userInfoSection: {
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  actionSection: {
    marginBottom: 40,
  },
  actionSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
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