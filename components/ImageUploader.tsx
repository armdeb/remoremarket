import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploader({ 
  images, 
  onImagesChange, 
  maxImages = 8, 
  disabled = false 
}: ImageUploaderProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum photos reached', `You can add up to ${maxImages} photos`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const newImages = [...images, result.assets[0].uri];
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum photos reached', `You can add up to ${maxImages} photos`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImages = [...images, result.assets[0].uri];
        onImagesChange(newImages);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos ({images.length}/{maxImages})</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add up to {maxImages} photos. The first photo will be your cover photo.
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Photo Button */}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.primary, backgroundColor: colors.surface }]}
          onPress={showImageOptions}
          disabled={disabled || images.length >= maxImages}
        >
          {uploading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Camera size={32} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                Add Photo
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Image Previews */}
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            
            {/* Remove Button */}
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.error }]}
              onPress={() => removeImage(index)}
              disabled={disabled}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Cover Badge */}
            {index === 0 && (
              <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.coverText}>COVER</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {images.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Camera size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            No photos added yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add photos to showcase your item
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  addButton: {
    width: 120,
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coverText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});