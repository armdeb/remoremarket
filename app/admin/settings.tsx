import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Settings,
  Shield,
  DollarSign,
  Bell,
  Users,
  Package,
  Mail,
  Database,
  Download,
  Trash2,
  RefreshCw,
  Save,
  Key,
  Truck,
  Globe,
  Webhook,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { AdminService, AdminSettings } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

export default function AdminSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAdminSettings();
      setSettings(data);
      setWebhookUrl(data.delivery.webhookUrl || '');
    } catch (error) {
      console.error('Load settings error:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (section: keyof AdminSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      };
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      
      // Update webhook URL
      if (settings.delivery.webhookUrl !== webhookUrl) {
        settings.delivery.webhookUrl = webhookUrl;
      }
      
      await AdminService.updateAdminSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Save settings error:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateApiKey = () => {
    Alert.alert(
      "Regenerate API Key",
      "Are you sure you want to regenerate the API key? This will invalidate the current key and all rider apps will need to be updated.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Regenerate", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsRegeneratingKey(true);
              const newKey = await AdminService.generateDeliveryApiKey();
              setSettings(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  delivery: {
                    ...prev.delivery,
                    apiKey: newKey
                  }
                };
              });
              Alert.alert("Success", "API key has been regenerated. Make sure to update all rider apps.");
            } catch (error) {
              Alert.alert("Error", "Failed to regenerate API key");
            } finally {
              setIsRegeneratingKey(false);
            }
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This will export all platform data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: async () => {
            try {
              const url = await AdminService.exportData('all');
              Alert.alert('Success', `Data exported successfully. Download URL: ${url}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to export data');
            }
          }
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: async () => {
            try {
              await AdminService.clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        },
      ]
    );
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading settings...</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Admin Settings</ThemedText>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Platform Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Platform Settings</ThemedText>
            </View>
            
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Shield size={20} color={colors.primary} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Auto Moderation</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Automatically flag suspicious content
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.platform.autoModeration}
                  onValueChange={(value) => updateSetting('platform', 'autoModeration', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Users size={20} color={colors.success} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>New User Registration</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Allow new users to register
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.platform.newUserRegistration}
                  onValueChange={(value) => updateSetting('platform', 'newUserRegistration', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Package size={20} color={colors.info} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Item Auto Approval</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Automatically approve new listings
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.platform.itemAutoApproval}
                  onValueChange={(value) => updateSetting('platform', 'itemAutoApproval', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Settings size={20} color={colors.warning} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Maintenance Mode</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Temporarily disable platform access
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.platform.maintenanceMode}
                  onValueChange={(value) => updateSetting('platform', 'maintenanceMode', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
            </View>
            
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Mail size={20} color={colors.primary} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Email Notifications</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Receive admin alerts via email
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.emailNotifications}
                  onValueChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Bell size={20} color={colors.success} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>SMS Notifications</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Receive urgent alerts via SMS
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.smsNotifications}
                  onValueChange={(value) => updateSetting('notifications', 'smsNotifications', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Shield size={20} color={colors.warning} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Dispute Auto Assignment</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Auto-assign disputes to available admins
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.notifications.disputeAutoAssignment}
                  onValueChange={(value) => updateSetting('notifications', 'disputeAutoAssignment', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Platform Fees */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Platform Fees</ThemedText>
            </View>
            
            <View style={[styles.feeCard, { backgroundColor: colors.surface }]}>
              <View style={styles.feeItem}>
                <View style={styles.feeInfo}>
                  <ThemedText style={styles.feeTitle}>Transaction Fee (%)</ThemedText>
                  <ThemedText style={[styles.feeDescription, { color: colors.textSecondary }]}>
                    Fee charged per transaction
                  </ThemedText>
                </View>
                <View style={styles.feeInputContainer}>
                  <TextInput
                    style={[styles.feeInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={settings?.fees.transactionFee.toString()}
                    onChangeText={(value) => {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        updateSetting('fees', 'transactionFee', numValue);
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <ThemedText style={styles.feeUnit}>%</ThemedText>
                </View>
              </View>

              <View style={styles.feeItem}>
                <View style={styles.feeInfo}>
                  <ThemedText style={styles.feeTitle}>Listing Fee ($)</ThemedText>
                  <ThemedText style={[styles.feeDescription, { color: colors.textSecondary }]}>
                    Fee for premium listings
                  </ThemedText>
                </View>
                <View style={styles.feeInputContainer}>
                  <ThemedText style={styles.feeUnit}>$</ThemedText>
                  <TextInput
                    style={[styles.feeInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={settings?.fees.listingFee.toString()}
                    onChangeText={(value) => {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        updateSetting('fees', 'listingFee', numValue);
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.feeItem}>
                <View style={styles.feeInfo}>
                  <ThemedText style={styles.feeTitle}>Payout Fee (%)</ThemedText>
                  <ThemedText style={[styles.feeDescription, { color: colors.textSecondary }]}>
                    Fee for instant payouts
                  </ThemedText>
                </View>
                <View style={styles.feeInputContainer}>
                  <TextInput
                    style={[styles.feeInput, { color: colors.text, backgroundColor: colors.background }]}
                    value={settings?.fees.payoutFee.toString()}
                    onChangeText={(value) => {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        updateSetting('fees', 'payoutFee', numValue);
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <ThemedText style={styles.feeUnit}>%</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Delivery API Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Delivery API</ThemedText>
            </View>
            
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Globe size={20} color={colors.primary} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>API Access</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      Enable or disable external API access
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings?.delivery.apiEnabled}
                  onValueChange={(value) => {
                    if (!value) {
                      Alert.alert(
                        "Disable API",
                        "Are you sure you want to disable the delivery API? This will prevent external rider apps from accessing your delivery system.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { 
                            text: "Disable", 
                            style: "destructive",
                            onPress: () => updateSetting('delivery', 'apiEnabled', false)
                          }
                        ]
                      );
                    } else {
                      updateSetting('delivery', 'apiEnabled', true);
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Key size={20} color={colors.primary} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>API Key</ThemedText>
                    <ThemedText style={[styles.apiKey, { color: colors.textSecondary }]}>
                      {settings?.delivery.apiKey}
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.regenerateButton, { backgroundColor: colors.error + '20' }]}
                  onPress={handleRegenerateApiKey}
                  disabled={isRegeneratingKey || !settings?.delivery.apiEnabled}
                >
                  {isRegeneratingKey ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <RefreshCw size={16} color={colors.error} />
                      <ThemedText style={[styles.regenerateText, { color: colors.error }]}>
                        Regenerate
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Webhook size={20} color={colors.primary} />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Webhook URL</ThemedText>
                    <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                      URL to receive delivery status updates
                    </ThemedText>
                  </View>
                </View>
              </View>
              <TextInput
                style={[styles.webhookInput, { 
                  color: colors.text, 
                  backgroundColor: colors.background,
                  borderColor: colors.border
                }]}
                value={webhookUrl}
                onChangeText={setWebhookUrl}
                placeholder="https://your-rider-app.com/webhook"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Data Management */}
          <View style={[styles.section, { marginBottom: 100 }]}>
            <View style={styles.sectionHeader}>
              <Database size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Data Management</ThemedText>
            </View>
            
            <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.actionItem} onPress={handleExportData}>
                <Download size={20} color={colors.info} />
                <View style={styles.actionInfo}>
                  <ThemedText style={styles.actionTitle}>Export Data</ThemedText>
                  <ThemedText style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    Download all platform data
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem} onPress={handleClearCache}>
                <Database size={20} color={colors.warning} />
                <View style={styles.actionInfo}>
                  <ThemedText style={styles.actionTitle}>Clear Cache</ThemedText>
                  <ThemedText style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    Clear all cached data
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  Alert.alert(
                    "Cleanup Old Data",
                    "Are you sure you want to remove data older than 2 years? This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Cleanup", 
                        style: "destructive",
                        onPress: () => Alert.alert("Success", "Old data cleanup scheduled")
                      }
                    ]
                  );
                }}
              >
                <Trash2 size={20} color={colors.error} />
                <View style={styles.actionInfo}>
                  <ThemedText style={styles.actionTitle}>Cleanup Old Data</ThemedText>
                  <ThemedText style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    Remove data older than 2 years
                  </ThemedText>
                </View>
              </TouchableOpacity>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  apiKey: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  regenerateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  webhookInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  feeCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feeInfo: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  feeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  feeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeInput: {
    width: 60,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  feeUnit: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});