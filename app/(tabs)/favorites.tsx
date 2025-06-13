import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Heart, ShoppingBag, MapPin } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const itemWidth = (width - 45) / 2;

interface FavoriteItem {
  id: string;
  title: string;
  price: number;
  image: string;
  brand: string;
  size: string;
  location: string;
}

const mockFavorites: FavoriteItem[] = [
  {
    id: '1',
    title: 'Vintage Denim Jacket',
    price: 45,
    image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Levi\'s',
    size: 'M',
    location: 'New York',
  },
  {
    id: '3',
    title: 'Designer Handbag',
    price: 125,
    image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Coach',
    size: 'One Size',
    location: 'Chicago',
  },
  {
    id: '5',
    title: 'Classic White Sneakers',
    price: 65,
    image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Nike',
    size: '8',
    location: 'Seattle',
  },
];

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(mockFavorites);

  const removeFavorite = (itemId: string) => {
    setFavorites(prevFavorites => 
      prevFavorites.filter(item => item.id !== itemId)
    );
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
        >
          <Heart size={20} color="#FF6B47" fill="#FF6B47" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemBrand}>{item.brand} • {item.size}</Text>
        <View style={styles.locationContainer}>
          <MapPin size={12} color="#9CA3AF" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Heart size={80} color="#E5E7EB" />
      </View>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>
        Items you heart will appear here so you can easily find them later
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)/')}
      >
        <ShoppingBag size={20} color="#ffffff" />
        <Text style={styles.browseButtonText}>Start Browsing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        {favorites.length > 0 && (
          <Text style={styles.itemCount}>{favorites.length} items</Text>
        )}
      </View>

      {favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9ACD32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#6B2C91',
  },
  itemCount: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  listContainer: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: itemWidth,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: itemWidth * 1.3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    padding: 12,
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#9ACD32',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9ACD32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#9ACD32',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});