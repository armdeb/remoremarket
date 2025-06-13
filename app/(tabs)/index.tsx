import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Filter, Grid3X3, Heart, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { ThemedView } from '~/components/ThemedView';
import { ThemedText } from '~/components/ThemedText';
import { SocialFeed } from '~/components/SocialFeed';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';

const { width, height } = Dimensions.get('window');
const itemWidth = (width - 45) / 2;

interface Item {
  id: string;
  title: string;
  price: number;
  image: string;
  brand: string;
  size: string;
  condition: string;
  seller: string;
  location: string;
  isFavorite?: boolean;
  isPromoted?: boolean;
}

const mockItems: Item[] = [
  {
    id: '1',
    title: 'Vintage Denim Jacket',
    price: 45,
    image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Levi\'s',
    size: 'M',
    condition: 'Good',
    seller: 'Sarah M.',
    location: 'New York',
    isPromoted: true,
  },
  {
    id: '2',
    title: 'Summer Floral Dress',
    price: 32,
    image: 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Zara',
    size: 'S',
    condition: 'Excellent',
    seller: 'Emma K.',
    location: 'Los Angeles',
  },
  {
    id: '3',
    title: 'Designer Handbag',
    price: 125,
    image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Coach',
    size: 'One Size',
    condition: 'Like New',
    seller: 'Lisa R.',
    location: 'Chicago',
    isPromoted: true,
  },
  {
    id: '4',
    title: 'Cozy Knit Sweater',
    price: 28,
    image: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'H&M',
    size: 'L',
    condition: 'Good',
    seller: 'Anna P.',
    location: 'Miami',
  },
  {
    id: '5',
    title: 'Classic White Sneakers',
    price: 65,
    image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Nike',
    size: '8',
    condition: 'Excellent',
    seller: 'Mike D.',
    location: 'Seattle',
  },
  {
    id: '6',
    title: 'Silk Blouse',
    price: 38,
    image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Massimo Dutti',
    size: 'M',
    condition: 'Good',
    seller: 'Jennifer L.',
    location: 'Boston',
  }
];

const categories = [
  { id: 'all', name: 'All', icon: '👗' },
  { id: 'women', name: 'Women', icon: '👚' },
  { id: 'men', name: 'Men', icon: '👔' },
  { id: 'shoes', name: 'Shoes', icon: '👟' },
  { id: 'bags', name: 'Bags', icon: '👜' },
  { id: 'accessories', name: 'Accessories', icon: '💍' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [items, setItems] = useState<Item[]>(mockItems);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedMode, setFeedMode] = useState<'discover' | 'following'>('discover');

  const toggleFavorite = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, isFavorite: !item.isFavorite }
          : item
      )
    );
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: colors.background }, item.isPromoted && { borderColor: colors.secondary, borderWidth: 2 }]}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      {item.isPromoted && (
        <View style={[styles.promotedBadge, { backgroundColor: colors.secondary }]}>
          <ThemedText style={[styles.promotedText, { color: colors.primary }]}>FEATURED</ThemedText>
        </View>
      )}
      
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <TouchableOpacity
          style={[styles.favoriteButton, { backgroundColor: colors.background }]}
          onPress={() => toggleFavorite(item.id)}
        >
          <Heart
            size={20}
            color={item.isFavorite ? colors.error : colors.textSecondary}
            fill={item.isFavorite ? colors.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemInfo}>
        <ThemedText style={[styles.itemPrice, { color: colors.primary }]}>${item.price}</ThemedText>
        <ThemedText style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.itemBrand, { color: colors.textSecondary }]}>{item.brand} • {item.size}</ThemedText>
        <View style={styles.locationContainer}>
          <MapPin size={12} color={colors.textSecondary} />
          <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>{item.location}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
                <ThemedText style={[styles.logoText, { color: colors.primary }]}>R</ThemedText>
              </View>
              <ThemedText style={[styles.appName, { color: colors.primary }]}>Remore</ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]}>
                <Filter size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]}>
                <Grid3X3 size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.feedToggle}>
            <TouchableOpacity
              style={[
                styles.feedToggleButton,
                feedMode === 'discover' && { 
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                }
              ]}
              onPress={() => setFeedMode('discover')}
            >
              <ThemedText style={[
                styles.feedToggleText,
                feedMode === 'discover' && { color: colors.primary, fontFamily: 'Inter-Bold' }
              ]}>
                Discover
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.feedToggleButton,
                feedMode === 'following' && { 
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                }
              ]}
              onPress={() => setFeedMode('following')}
            >
              <ThemedText style={[
                styles.feedToggleText,
                feedMode === 'following' && { color: colors.primary, fontFamily: 'Inter-Bold' }
              ]}>
                Following
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {feedMode === 'discover' && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: selectedCategory === category.id ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <ThemedText style={[
                    styles.categoryText,
                    { color: selectedCategory === category.id ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {category.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {feedMode === 'discover' ? (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <SocialFeed 
            onEmptyFeed={() => setFeedMode('discover')}
          />
        )}
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
    backgroundColor: colors.background,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  feedToggle: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  feedToggleButton: {
    paddingVertical: 12,
    marginRight: 24,
  },
  feedToggleText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  categoriesContainer: {
    paddingBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 15,
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  listContainer: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    width: itemWidth,
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
    position: 'relative',
  },
  promotedBadge: {
    position: 'absolute',
    top: -1,
    left: -1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  promotedText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
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
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
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
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
  },
});