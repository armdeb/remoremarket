import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { X, ExternalLink, CheckCircle, AlertCircle, DollarSign, Shield } from 'lucide-react-native';
import { StripeConnectService, StripeAccount } from '~/lib/stripe-connect';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface StripeConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export function StripeConnectModal({ visible, onClose, onConnected }: StripeConnectModalProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccount | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (visible) {
      loadAccountStatus();
    }
  }, [visible]);

  const loadAccountStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await StripeConnectService.getAccountStatus();
      setAccountStatus(status);
    } catch (error) {
      console.error('Load account status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      await StripeConnectService.createAccount();
      await loadAccountStatus();
      Alert.alert('Success', 'Stripe account created! Please complete the onboarding process.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setLoading(true);
      const { url } = await StripeConnectService.getOnboardingLink();
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        // Refresh status when user returns
        setTimeout(() => {
          loadAccountStatus();
        }, 2000);
      } else {
        Alert.alert('Error', 'Cannot open onboarding link');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      setLoading(true);
      const { url } = await StripeConnectService.getDashboardLink();
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open dashboard link');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to open dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!accountStatus?.connected) {
      return <DollarSign size={48} color={colors.textSecondary} />;
    }
    
    if (accountStatus.payouts_enabled) {
      return <CheckCircle size={48} color={colors.success} />;
    }
    
    return <AlertCircle size={48} color={colors.warning} />;
  };

  const getStatusTitle = () => {
    if (!accountStatus?.connected) {
      return 'Connect Your Bank Account';
    }
    
    if (accountStatus.payouts_enabled) {
      return 'Account Connected';
    }
    
    return 'Complete Setup Required';
  };

  const getStatusDescription = () => {
    if (!accountStatus?.connected) {
      return 'Connect your bank account to receive payments from sales. This is required to sell items on Remore.';
    }
    
    if (accountStatus.payouts_enabled) {
      return 'Your account is fully set up and ready to receive payments. You can manage your account settings through the Stripe dashboard.';
    }
    
    return 'Your account needs additional information to enable payouts. Please complete the onboarding process.';
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
          <Text style={styles.title}>Seller Payments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {checkingStatus ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Checking account status...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statusContainer}>
                <View style={styles.iconContainer}>
                  {getStatusIcon()}
                </View>
                <Text style={styles.statusTitle}>{getStatusTitle()}</Text>
                <Text style={styles.statusDescription}>{getStatusDescription()}</Text>
              </View>

              {accountStatus?.connected && accountStatus.requirements && (
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Requirements</Text>
                  
                  {accountStatus.requirements.currently_due.length > 0 && (
                    <View style={styles.requirementSection}>
                      <Text style={[styles.requirementLabel, { color: colors.error }]}>
                        Currently Due ({accountStatus.requirements.currently_due.length})
                      </Text>
                      {accountStatus.requirements.currently_due.map((req, index) => (
                        <Text key={index} style={styles.requirementItem}>
                          • {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      ))}
                    </View>
                  )}

                  {accountStatus.requirements.eventually_due.length > 0 && (
                    <View style={styles.requirementSection}>
                      <Text style={[styles.requirementLabel, { color: colors.warning }]}>
                        Eventually Due ({accountStatus.requirements.eventually_due.length})
                      </Text>
                      {accountStatus.requirements.eventually_due.slice(0, 3).map((req, index) => (
                        <Text key={index} style={styles.requirementItem}>
                          • {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      ))}
                      {accountStatus.requirements.eventually_due.length > 3 && (
                        <Text style={styles.requirementItem}>
                          • And {accountStatus.requirements.eventually_due.length - 3} more...
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Benefits of Connecting</Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Shield size={20} color={colors.success} />
                    <Text style={styles.benefitText}>Secure payments powered by Stripe</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <DollarSign size={20} color={colors.success} />
                    <Text style={styles.benefitText}>Fast payouts to your bank account</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <CheckCircle size={20} color={colors.success} />
                    <Text style={styles.benefitText}>Track earnings and manage taxes</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {!accountStatus?.connected ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <ExternalLink size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          ) : !accountStatus.payouts_enabled ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.warning }]}
              onPress={handleStartOnboarding}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                  <ExternalLink size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={() => {
                  onConnected?.();
                  onClose();
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenDashboard}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Dashboard</Text>
                    <ExternalLink size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  requirementsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  requirementSection: {
    marginBottom: 16,
  },
  requirementLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.text,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});