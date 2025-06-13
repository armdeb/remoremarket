import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, Camera, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface DisputeFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'item_not_received' | 'item_not_as_described' | 'payment_issue' | 'other';
    description: string;
    evidence: { evidence_type: 'image' | 'text'; content: string }[];
  }) => Promise<void>;
  orderId: string;
}

export function DisputeForm({ visible, onClose, onSubmit, orderId }: DisputeFormProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [type, setType] = useState<'item_not_received' | 'item_not_as_described' | 'payment_issue' | 'other'>('item_not_received');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<{ evidence_type: 'image' | 'text'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setType('item_not_received');
    setDescription('');
    setEvidence([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the issue');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        type,
        description: description.trim(),
        evidence,
      });
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setEvidence([...evidence, { evidence_type: 'image', content: base64Image }]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Open Dispute</ThemedText>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoBox}>
            <AlertCircle size={20} color={colors.warning} />
            <ThemedText style={[styles.infoText, { color: colors.textSecondary }]}>
              Opening a dispute will pause the order process. Our team will review your case and help resolve the issue.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>What's the issue?</ThemedText>
            <View style={styles.typeOptions}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'item_not_received' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setType('item_not_received')}
              >
                <ThemedText style={[
                  styles.typeOptionText,
                  type === 'item_not_received' && { color: colors.primary }
                ]}>
                  Item Not Received
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'item_not_as_described' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setType('item_not_as_described')}
              >
                <ThemedText style={[
                  styles.typeOptionText,
                  type === 'item_not_as_described' && { color: colors.primary }
                ]}>
                  Item Not As Described
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'payment_issue' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setType('payment_issue')}
              >
                <ThemedText style={[
                  styles.typeOptionText,
                  type === 'payment_issue' && { color: colors.primary }
                ]}>
                  Payment Issue
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  type === 'other' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setType('other')}
              >
                <ThemedText style={[
                  styles.typeOptionText,
                  type === 'other' && { color: colors.primary }
                ]}>
                  Other Issue
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Describe the issue</ThemedText>
            <TextInput
              style={[styles.descriptionInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Please provide details about the issue..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Add Evidence (Optional)</ThemedText>
            <View style={styles.evidenceButtons}>
              <TouchableOpacity 
                style={[styles.evidenceButton, { backgroundColor: colors.surface }]}
                onPress={pickImage}
              >
                <Camera size={20} color={colors.primary} />
                <ThemedText style={styles.evidenceButtonText}>Add Photo</ThemedText>
              </TouchableOpacity>
            </View>

            {evidence.length > 0 && (
              <View style={styles.evidenceList}>
                {evidence.map((item, index) => (
                  <View key={index} style={[styles.evidenceItem, { backgroundColor: colors.surface }]}>
                    {item.evidence_type === 'image' && (
                      <Image source={{ uri: item.content }} style={styles.evidenceImage} />
                    )}
                    <TouchableOpacity 
                      style={[styles.removeButton, { backgroundColor: colors.error }]}
                      onPress={() => removeEvidence(index)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Dispute</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 120,
  },
  evidenceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  evidenceButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  evidenceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  evidenceItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  submitButton: {
    flex: 2,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});