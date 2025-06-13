import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Code,
  Key,
  Truck,
  Shield,
  RefreshCw,
  Globe,
  Webhook,
  Server,
  FileJson,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { DeliveryApiDocs } from '~/components/DeliveryApiDocs';
import { AdminService } from '~/lib/admin';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';
import * as Clipboard from 'expo-clipboard';

export default function DeliveryApiScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [apiEnabled, setApiEnabled] = useState(true);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAdminSettings();
      setSettings(data);
      setApiEnabled(data.delivery.apiEnabled);
      setWebhookUrl(data.delivery.webhookUrl || '');
    } catch (error) {
      console.error('Load settings error:', error);
      Alert.alert('Error', 'Failed to load API settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleApi = (value: boolean) => {
    if (!value) {
      Alert.alert(
        "Disable API",
        "Are you sure you want to disable the delivery API? This will prevent external rider apps from accessing your delivery system.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Disable", 
            style: "destructive",
            onPress: async () => {
              try {
                setApiEnabled(false);
                if (settings) {
                  const updatedSettings = {
                    ...settings,
                    delivery: {
                      ...settings.delivery,
                      apiEnabled: false
                    }
                  };
                  await AdminService.updateAdminSettings(updatedSettings);
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to update API status');
                setApiEnabled(true);
              }
            }
          }
        ]
      );
    } else {
      setApiEnabled(true);
      if (settings) {
        const updatedSettings = {
          ...settings,
          delivery: {
            ...settings.delivery,
            apiEnabled: true
          }
        };
        AdminService.updateAdminSettings(updatedSettings).catch(() => {
          Alert.alert('Error', 'Failed to update API status');
          setApiEnabled(false);
        });
      }
    }
  };
  
  const handleRegenerateKey = () => {
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
              if (settings) {
                const updatedSettings = {
                  ...settings,
                  delivery: {
                    ...settings.delivery,
                    apiKey: newKey
                  }
                };
                await AdminService.updateAdminSettings(updatedSettings);
                setSettings(updatedSettings);
              }
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

  const handleSaveWebhook = async () => {
    try {
      if (settings) {
        const updatedSettings = {
          ...settings,
          delivery: {
            ...settings.delivery,
            webhookUrl
          }
        };
        await AdminService.updateAdminSettings(updatedSettings);
        setSettings(updatedSettings);
        Alert.alert("Success", "Webhook URL has been updated");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update webhook URL");
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const openSwaggerDocs = () => {
    Alert.alert("Swagger UI", "In a production environment, this would open the Swagger UI documentation for your API.");
  };
  
  const styles = createStyles(colors);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={styles.loadingText}>Loading API settings...</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Delivery API</ThemedText>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={openSwaggerDocs}
          >
            <FileJson size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>API Status</ThemedText>
            </View>
            
            <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <ThemedText style={styles.statusLabel}>API Access</ThemedText>
                  <ThemedText style={[styles.statusDescription, { color: colors.textSecondary }]}>
                    Enable or disable external API access
                  </ThemedText>
                </View>
                <Switch
                  value={apiEnabled}
                  onValueChange={handleToggleApi}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <ThemedText style={styles.statusLabel}>API Key</ThemedText>
                  <View style={styles.apiKeyContainer}>
                    <ThemedText style={[styles.apiKey, { color: colors.textSecondary }]}>
                      {settings?.delivery.apiKey}
                    </ThemedText>
                    <TouchableOpacity 
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(settings?.delivery.apiKey)}
                    >
                      {copiedText === settings?.delivery.apiKey ? (
                        <Check size={16} color={colors.success} />
                      ) : (
                        <Copy size={16} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity 
                  style={[styles.regenerateButton, { backgroundColor: colors.error + '20' }]}
                  onPress={handleRegenerateKey}
                  disabled={isRegeneratingKey || !apiEnabled}
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

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <ThemedText style={styles.statusLabel}>Webhook URL</ThemedText>
                  <ThemedText style={[styles.statusDescription, { color: colors.textSecondary }]}>
                    URL to receive delivery status updates
                  </ThemedText>
                </View>
              </View>
              <View style={styles.webhookInputContainer}>
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
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveWebhook}
                >
                  <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Server size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>API Endpoints</ThemedText>
            </View>
            
            <View style={[styles.endpointsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.endpoint}>
                <View style={styles.endpointHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: colors.info + '20' }]}>
                    <ThemedText style={[styles.methodText, { color: colors.info }]}>GET</ThemedText>
                  </View>
                  <ThemedText style={styles.endpointPath}>/deliveries/pending</ThemedText>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard('/deliveries/pending')}
                  >
                    {copiedText === '/deliveries/pending' ? (
                      <Check size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.endpointDescription, { color: colors.textSecondary }]}>
                  Get all pending deliveries that need to be assigned to a rider
                </ThemedText>
              </View>

              <View style={styles.endpoint}>
                <View style={styles.endpointHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: colors.info + '20' }]}>
                    <ThemedText style={[styles.methodText, { color: colors.info }]}>GET</ThemedText>
                  </View>
                  <ThemedText style={styles.endpointPath}>/deliveries/assigned</ThemedText>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard('/deliveries/assigned')}
                  >
                    {copiedText === '/deliveries/assigned' ? (
                      <Check size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.endpointDescription, { color: colors.textSecondary }]}>
                  Get all deliveries assigned to the authenticated rider
                </ThemedText>
              </View>

              <View style={styles.endpoint}>
                <View style={styles.endpointHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: colors.success + '20' }]}>
                    <ThemedText style={[styles.methodText, { color: colors.success }]}>POST</ThemedText>
                  </View>
                  <ThemedText style={styles.endpointPath}>/deliveries/:id/assign</ThemedText>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard('/deliveries/:id/assign')}
                  >
                    {copiedText === '/deliveries/:id/assign' ? (
                      <Check size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.endpointDescription, { color: colors.textSecondary }]}>
                  Assign a delivery to the authenticated rider
                </ThemedText>
              </View>

              <View style={styles.endpoint}>
                <View style={styles.endpointHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: colors.warning + '20' }]}>
                    <ThemedText style={[styles.methodText, { color: colors.warning }]}>PUT</ThemedText>
                  </View>
                  <ThemedText style={styles.endpointPath}>/deliveries/:id/status</ThemedText>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => copyToClipboard('/deliveries/:id/status')}
                  >
                    {copiedText === '/deliveries/:id/status' ? (
                      <Check size={16} color={colors.success} />
                    ) : (
                      <Copy size={16} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <ThemedText style={[styles.endpointDescription, { color: colors.textSecondary }]}>
                  Update the status of a delivery
                </ThemedText>
              </View>

              <TouchableOpacity 
                style={[styles.viewAllButton, { borderColor: colors.primary }]}
                onPress={() => router.push('/admin/delivery-api/docs')}
              >
                <ThemedText style={[styles.viewAllButtonText, { color: colors.primary }]}>
                  View Full API Documentation
                </ThemedText>
                <ExternalLink size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color={colors.primary} />
              <ThemedText style={styles.sectionTitle}>Rider App Integration</ThemedText>
            </View>
            
            <View style={[styles.integrationCard, { backgroundColor: colors.surface }]}>
              <ThemedText style={styles.integrationTitle}>How It Works</ThemedText>
              <ThemedText style={[styles.integrationDescription, { color: colors.textSecondary }]}>
                The Delivery API allows external rider apps to:
              </ThemedText>
              
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                  <ThemedText style={styles.featureText}>View pending deliveries</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                  <ThemedText style={styles.featureText}>Assign deliveries to riders</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                  <ThemedText style={styles.featureText}>Update delivery status in real-time</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                  <ThemedText style={styles.featureText}>Verify pickup and delivery with QR codes</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                  <ThemedText style={styles.featureText}>Track delivery location history</ThemedText>
                </View>
              </View>
              
              <View style={[styles.securityNote, { backgroundColor: colors.warning + '10' }]}>
                <Shield size={16} color={colors.warning} />
                <ThemedText style={[styles.securityText, { color: colors.textSecondary }]}>
                  Keep your API key secure. It provides access to your delivery system.
                </ThemedText>
              </View>

              <TouchableOpacity 
                style={[styles.downloadButton, { backgroundColor: colors.primary }]}
                onPress={() => Alert.alert("Sample App", "In a production environment, this would download a sample rider app template.")}
              >
                <Download size={16} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Download Sample App</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.section, { marginBottom: 100 }]}>
            <DeliveryApiDocs />
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
  headerButton: {
    padding: 8,
    borderRadius: 8,
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
  statusCard: {
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  apiKey: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
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
  webhookInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  webhookInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  endpointsCard: {
    borderRadius: 12,
    padding: 16,
  },
  endpoint: {
    marginBottom: 16,
  },
  endpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  methodText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  endpointPath: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  endpointDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 40,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  integrationCard: {
    borderRadius: 12,
    padding: 16,
  },
  integrationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  integrationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  securityNote: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 18,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});