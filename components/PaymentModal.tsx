import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CreditCard, Wallet, X } from 'lucide-react-native';
import { StripeService } from '~/lib/stripe';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
  };
  userWallet?: {
    available_balance: number;
  };
  onPaymentSuccess: (orderId: string) => void;
}

export function PaymentModal({ 
  visible, 
  onClose, 
  item, 
  userWallet, 
  onPaymentSuccess 
}: PaymentModalProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');

  const canPayWithWallet = userWallet && userWallet.available_balance >= item.price;

  const handlePayment = async () => {
    try {
      setLoading(true);

      if (paymentMethod === 'wallet') {
        // Pay with wallet balance
        const result = await StripeService.payWithWallet(item.id, item.price);
        onPaymentSuccess(result.order_id);
        Alert.alert('Success', 'Payment completed successfully!');
      } else {
        // Pay with card - create payment intent
        const paymentIntent = await StripeService.createPaymentIntent(item.id, item.price);
        
        // In a real app, you would integrate with Stripe's payment sheet here
        // For now, we'll simulate a successful payment
        Alert.alert(
          'Payment Required',
          'In a real app, this would open Stripe\'s payment sheet. For demo purposes, we\'ll simulate a successful payment.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Success',
              onPress: async () => {
                try {
                  const result = await StripeService.confirmPayment(paymentIntent.id, item.id);
                  onPaymentSuccess(result.order_id);
                  Alert.alert('Success', 'Payment completed successfully!');
                } catch (error) {
                  Alert.alert('Error', error instanceof Error ? error.message : 'Payment failed');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Purchase</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </View>

          <View style={styles.paymentMethods}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <CreditCard size={24} color={paymentMethod === 'card' ? colors.primary : colors.textSecondary} />
              <View style={styles.paymentOptionText}>
                <Text style={[
                  styles.paymentOptionTitle,
                  paymentMethod === 'card' && { color: colors.primary }
                ]}>
                  Credit/Debit Card
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay securely with your card
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'wallet' && styles.paymentOptionSelected,
                !canPayWithWallet && styles.paymentOptionDisabled,
              ]}
              onPress={() => canPayWithWallet && setPaymentMethod('wallet')}
              disabled={!canPayWithWallet}
            >
              <Wallet size={24} color={
                !canPayWithWallet 
                  ? colors.textSecondary 
                  : paymentMethod === 'wallet' 
                    ? colors.primary 
                    : colors.textSecondary
              } />
              <View style={styles.paymentOptionText}>
                <Text style={[
                  styles.paymentOptionTitle,
                  paymentMethod === 'wallet' && { color: colors.primary },
                  !canPayWithWallet && { color: colors.textSecondary }
                ]}>
                  Wallet Balance
                </Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {userWallet 
                    ? `Available: $${userWallet.available_balance.toFixed(2)}`
                    : 'No wallet found'
                  }
                </Text>
                {!canPayWithWallet && (
                  <Text style={[styles.paymentOptionSubtitle, { color: colors.error }]}>
                    Insufficient balance
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item Price</Text>
              <Text style={styles.summaryValue}>${item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>$0.00</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>${item.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.primary }]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay ${item.price.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  itemInfo: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  paymentMethods: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  summary: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.text,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});