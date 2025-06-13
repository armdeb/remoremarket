import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Plus, ArrowUpRight, ArrowDownLeft, DollarSign, CreditCard, Settings, ExternalLink } from 'lucide-react-native';
import { StripeService, UserWallet, WalletTransaction } from '~/lib/stripe';
import { StripeConnectService, StripeAccount } from '~/lib/stripe-connect';
import { StripeConnectModal } from '~/components/StripeConnectModal';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletData, transactionsData, accountStatus] = await Promise.all([
        StripeService.getUserWallet(),
        StripeService.getWalletTransactions(),
        StripeConnectService.getAccountStatus(),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData);
      setStripeAccount(accountStatus);
    } catch (error) {
      console.error('Load wallet data error:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleAddFunds = () => {
    Alert.prompt(
      'Add Funds',
      'Enter amount to add to your wallet:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (amount) => {
            if (amount && !isNaN(parseFloat(amount))) {
              try {
                const paymentIntent = await StripeService.addFundsToWallet(parseFloat(amount));
                Alert.alert(
                  'Payment Required',
                  'In a real app, this would open Stripe\'s payment sheet to add funds.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Simulate Success',
                      onPress: () => {
                        Alert.alert('Success', 'Funds added successfully!');
                        loadWalletData();
                      },
                    },
                  ]
                );
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add funds');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handlePayout = () => {
    if (!wallet || wallet.available_balance <= 0) {
      Alert.alert('Error', 'No funds available for payout');
      return;
    }

    if (!stripeAccount?.payouts_enabled) {
      Alert.alert(
        'Setup Required',
        'You need to complete your Stripe account setup before requesting payouts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Now', onPress: () => setShowConnectModal(true) },
        ]
      );
      return;
    }

    Alert.prompt(
      'Request Payout',
      `Available balance: $${wallet.available_balance.toFixed(2)}\nEnter amount to withdraw:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async (amount) => {
            if (amount && !isNaN(parseFloat(amount))) {
              const payoutAmount = parseFloat(amount);
              if (payoutAmount > wallet.available_balance) {
                Alert.alert('Error', 'Amount exceeds available balance');
                return;
              }
              try {
                await StripeService.requestPayout(payoutAmount);
                Alert.alert('Success', 'Payout requested successfully!');
                loadWalletData();
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Failed to request payout');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'credit': return 'Added Funds';
      case 'debit': return 'Purchase';
      case 'escrow_hold': return 'Sale (Pending)';
      case 'escrow_release': return 'Sale Completed';
      case 'payout': return 'Payout';
      default: return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'escrow_release':
        return <ArrowDownLeft size={20} color={colors.success} />;
      case 'debit':
      case 'payout':
        return <ArrowUpRight size={20} color={colors.error} />;
      case 'escrow_hold':
        return <DollarSign size={20} color={colors.warning} />;
      default:
        return <DollarSign size={20} color={colors.textSecondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading wallet...</ThemedText>
      </ThemedView>
    );
  }

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
              <ThemedText style={[styles.logoText, { color: colors.primary }]}>R</ThemedText>
            </View>
            <ThemedText style={[styles.appName, { color: colors.primary }]}>Wallet</ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowConnectModal(true)}
          >
            <Settings size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Wallet Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
            <View style={styles.balanceHeader}>
              <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
              <CreditCard size={24} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.balanceAmount}>
              ${wallet?.available_balance.toFixed(2) || '0.00'}
            </ThemedText>
            {wallet && wallet.pending_balance > 0 && (
              <ThemedText style={styles.pendingBalance}>
                ${wallet.pending_balance.toFixed(2)} pending
              </ThemedText>
            )}
          </View>

          {/* Stripe Connect Status */}
          {stripeAccount && (
            <View style={[styles.connectStatusCard, { backgroundColor: colors.surface }]}>
              <View style={styles.connectStatusHeader}>
                <ThemedText style={styles.connectStatusTitle}>Seller Account</ThemedText>
                {stripeAccount.payouts_enabled ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: colors.success }]}>
                      Connected
                    </ThemedText>
                  </View>
                ) : stripeAccount.connected ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: colors.warning }]}>
                      Setup Required
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: colors.error + '20' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: colors.error }]}>
                      Not Connected
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={[styles.connectStatusDescription, { color: colors.textSecondary }]}>
                {stripeAccount.payouts_enabled 
                  ? 'Your account is ready to receive payments'
                  : stripeAccount.connected
                    ? 'Complete setup to enable payouts'
                    : 'Connect your bank account to receive payments'
                }
              </ThemedText>
              <TouchableOpacity
                style={[styles.connectButton, { borderColor: colors.primary }]}
                onPress={() => setShowConnectModal(true)}
              >
                <ThemedText style={[styles.connectButtonText, { color: colors.primary }]}>
                  {stripeAccount.payouts_enabled ? 'Manage Account' : 'Setup Account'}
                </ThemedText>
                <ExternalLink size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handleAddFunds}
            >
              <Plus size={24} color={colors.primary} />
              <ThemedText style={[styles.actionButtonText, { color: colors.primary }]}>
                Add Funds
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handlePayout}
              disabled={!wallet || wallet.available_balance <= 0}
            >
              <ArrowUpRight size={24} color={wallet && wallet.available_balance > 0 ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                styles.actionButtonText,
                { color: wallet && wallet.available_balance > 0 ? colors.primary : colors.textSecondary }
              ]}>
                Withdraw
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Wallet Stats */}
          {wallet && (
            <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: colors.success }]}>
                  ${wallet.total_earned.toFixed(2)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Earned
                </ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: colors.error }]}>
                  ${wallet.total_spent.toFixed(2)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Spent
                </ThemedText>
              </View>
            </View>
          )}

          {/* Transaction History */}
          <View style={styles.transactionsSection}>
            <ThemedText style={styles.sectionTitle}>Recent Transactions</ThemedText>
            
            {transactions.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <DollarSign size={48} color={colors.textSecondary} />
                <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No transactions yet
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.transactionsList, { backgroundColor: colors.surface }]}>
                {transactions.map((transaction, index) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      {getTransactionIcon(transaction.type)}
                    </View>
                    <View style={styles.transactionDetails}>
                      <ThemedText style={styles.transactionTitle}>
                        {formatTransactionType(transaction.type)}
                      </ThemedText>
                      <ThemedText style={[styles.transactionDescription, { color: colors.textSecondary }]}>
                        {transaction.description}
                      </ThemedText>
                      <ThemedText style={[styles.transactionDate, { color: colors.textSecondary }]}>
                        {formatDate(transaction.created_at)}
                      </ThemedText>
                    </View>
                    <View style={styles.transactionAmount}>
                      <ThemedText style={[
                        styles.transactionAmountText,
                        {
                          color: transaction.amount > 0 ? colors.success : colors.error
                        }
                      ]}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </ThemedText>
                      <View style={[
                        styles.transactionStatus,
                        {
                          backgroundColor: transaction.status === 'completed' 
                            ? colors.success 
                            : transaction.status === 'failed'
                              ? colors.error
                              : colors.warning
                        }
                      ]}>
                        <ThemedText style={styles.transactionStatusText}>
                          {transaction.status}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <StripeConnectModal
          visible={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnected={() => loadWalletData()}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pendingBalance: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  connectStatusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  connectStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectStatusTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  connectStatusDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  connectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  statsCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  transactionsSection: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  transactionsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  transactionStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});