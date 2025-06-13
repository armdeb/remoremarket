import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DollarSign, Tag, Package, Info, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { ItemsService, CreateItemData } from '~/lib/items';
import { ImageUploader } from '~/components/ImageUploader';
import { LoadingOverlay } from '~/components/LoadingOverlay';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';

const CONDITIONS = [
  { id: 'new-with-tags', label: 'New with tags', description: 'Brand new, never worn' },
  { id: 'like-new', label: 'Like new', description: 'Excellent condition, barely used' },
  { id: 'very-good', label: 'Very good', description: 'Minor signs of wear' },
  { id: 'good', label: 'Good', description: 'Some signs of wear' },
  { id: 'fair', label: 'Fair', description: 'Noticeable wear but still functional' },
];

const CATEGORIES = [
  { id: 'women', label: 'Women', icon: '👚' },
  { id: 'men', label: 'Men', icon: '👔' },
  { id: 'kids', label: 'Kids', icon: '👶' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'bags', label: 'Bags', icon: '👜' },
  { id: 'accessories', label: 'Accessories', icon: '💍' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

export default function SellScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    brand: '',
    size: '',
    condition: '',
    category: '',
    images: [] as string[],
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    const price = parseFloat(formData.price);
    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(price) || price <= 0) {
      newErrors.price = 'Price must be a valid number greater than 0';
    } else if (price > 10000) {
      newErrors.price = 'Price must be less than $10,000';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand is required';
    }

    if (!formData.size) {
      newErrors.size = 'Size is required';
    }

    if (!formData.condition) {
      newErrors.condition = 'Condition is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'At least one photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Please fix the errors', 'Check the form for any missing or invalid information');
      return;
    }

    try {
      setLoading(true);
      setUploadingImages(true);

      // Upload images first
      const uploadedImageUrls = await ItemsService.uploadImages(formData.images);
      setUploadingImages(false);

      // Create item data
      const itemData: CreateItemData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        brand: formData.brand.trim(),
        size: formData.size,
        condition: formData.condition,
        category: formData.category,
        images: uploadedImageUrls,
      };

      // Create the item
      const newItem = await ItemsService.createItem(itemData);

      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        brand: '',
        size: '',
        condition: '',
        category: '',
        images: [],
      });
      setErrors({});

      Alert.alert(
        'Item Listed Successfully! 🎉',
        'Your item is now live and visible to buyers.',
        [
          {
            text: 'View Item',
            onPress: () => router.push(`/item/${newItem.id}`),
          },
          {
            text: 'List Another',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(
        'Failed to List Item',
        error instanceof Error ? error.message : 'Please try again later'
      );
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
              <ThemedText style={[styles.logoText, { color: colors.primary }]}>R</ThemedText>
            </View>
            <ThemedText style={[styles.headerTitle, { color: colors.primary }]}>Sell an Item</ThemedText>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Image Upload Section */}
            <View style={styles.section}>
              <ImageUploader
                images={formData.images}
                onImagesChange={(images) => updateFormData('images', images.join(','))}
                maxImages={8}
                disabled={loading}
              />
              {errors.images && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.images}</Text>
              )}
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={20} color={colors.primary} />
                <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Title *</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.title ? colors.error : colors.border,
                      color: colors.text,
                    }
                  ]}
                  placeholder="e.g. Vintage Levi's Denim Jacket"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.title}
                  onChangeText={(text) => updateFormData('title', text)}
                  maxLength={100}
                  editable={!loading}
                />
                <View style={styles.inputFooter}>
                  {errors.title && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.title}</Text>
                  )}
                  <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                    {formData.title.length}/100
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Description *</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.description ? colors.error : colors.border,
                      color: colors.text,
                    }
                  ]}
                  placeholder="Describe your item, its condition, measurements, and any flaws..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.description}
                  onChangeText={(text) => updateFormData('description', text)}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  textAlignVertical="top"
                  editable={!loading}
                />
                <View style={styles.inputFooter}>
                  {errors.description && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.description}</Text>
                  )}
                  <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                    {formData.description.length}/1000
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Price *</ThemedText>
                  <View style={[
                    styles.priceInput,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: errors.price ? colors.error : colors.border,
                    }
                  ]}>
                    <DollarSign size={20} color={colors.primary} />
                    <TextInput
                      style={[styles.priceTextInput, { color: colors.text }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={formData.price}
                      onChangeText={(text) => updateFormData('price', text)}
                      keyboardType="decimal-pad"
                      editable={!loading}
                    />
                  </View>
                  {errors.price && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.price}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Brand *</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: errors.brand ? colors.error : colors.border,
                        color: colors.text,
                      }
                    ]}
                    placeholder="e.g. Zara"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.brand}
                    onChangeText={(text) => updateFormData('brand', text)}
                    editable={!loading}
                  />
                  {errors.brand && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.brand}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Category & Details */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Tag size={20} color={colors.primary} />
                <ThemedText style={styles.sectionTitle}>Category & Details</ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Category *</ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.optionsScroll}
                  contentContainerStyle={styles.optionsContent}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.optionButton,
                        { 
                          backgroundColor: formData.category === cat.id ? colors.primary : colors.surface,
                          borderColor: formData.category === cat.id ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => updateFormData('category', cat.id)}
                      disabled={loading}
                    >
                      <Text style={styles.optionIcon}>{cat.icon}</Text>
                      <ThemedText style={[
                        styles.optionText,
                        { color: formData.category === cat.id ? '#FFFFFF' : colors.textSecondary }
                      ]}>
                        {cat.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.category && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.category}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Size *</ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.optionsScroll}
                  contentContainerStyle={styles.optionsContent}
                >
                  {SIZES.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeButton,
                        { 
                          backgroundColor: formData.size === size ? colors.primary : colors.surface,
                          borderColor: formData.size === size ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => updateFormData('size', size)}
                      disabled={loading}
                    >
                      <ThemedText style={[
                        styles.sizeText,
                        { color: formData.size === size ? '#FFFFFF' : colors.text }
                      ]}>
                        {size}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.size && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.size}</Text>
                )}
              </View>
            </View>

            {/* Condition */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Package size={20} color={colors.primary} />
                <ThemedText style={styles.sectionTitle}>Condition *</ThemedText>
              </View>

              <View style={styles.conditionsContainer}>
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[
                      styles.conditionButton,
                      { 
                        backgroundColor: formData.condition === cond.id ? colors.primary + '20' : colors.surface,
                        borderColor: formData.condition === cond.id ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => updateFormData('condition', cond.id)}
                    disabled={loading}
                  >
                    <View style={styles.conditionContent}>
                      <View style={styles.conditionHeader}>
                        <ThemedText style={[
                          styles.conditionTitle,
                          { color: formData.condition === cond.id ? colors.primary : colors.text }
                        ]}>
                          {cond.label}
                        </ThemedText>
                        {formData.condition === cond.id && (
                          <CheckCircle size={20} color={colors.primary} />
                        )}
                      </View>
                      <ThemedText style={[styles.conditionDescription, { color: colors.textSecondary }]}>
                        {cond.description}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.condition && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.condition}</Text>
              )}
            </View>
          </ScrollView>

          {/* Bottom Bar */}
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { 
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.7 : 1,
                }
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <ThemedText style={styles.submitButtonText}>
                {loading ? 'Listing Item...' : 'List Item'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <LoadingOverlay 
          visible={uploadingImages} 
          message="Uploading images..." 
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
  header: {
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
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  priceTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  optionsScroll: {
    flexGrow: 0,
  },
  optionsContent: {
    gap: 8,
    paddingRight: 16,
  },
  optionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    gap: 4,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  sizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  conditionsContainer: {
    gap: 12,
  },
  conditionButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  conditionContent: {
    gap: 4,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  conditionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  bottomBar: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});