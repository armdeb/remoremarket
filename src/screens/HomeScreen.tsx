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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
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
  isFavorite?: boolean;
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
    seller: 'Sarah M.'
  },
  {
    id: '2',
    title: 'Summer Floral Dress',
    price: 32,
    image: 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Zara',
    size: 'S',
    condition: 'Excellent',
    seller: 'Emma K.'
  },
  {
    id: '3',
    title: 'Designer Handbag',
    price: 125,
    image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Coach',
    size: 'One Size',
    condition: 'Like New',
    seller: 'Lisa R.'
  },
  {
    id: '4',
    title: 'Cozy Knit Sweater',
    price: 28,
    image: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'H&M',
    size: 'L',
    condition: 'Good',
    seller: 'Anna P.'
  },
  {
    id: '5',
    title: 'Classic White Sneakers',
    price: 65,
    image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Nike',
    size: '8',
    condition: 'Excellent',
    seller: 'Mike D.'
  },
  {
    id: '6',
    title: 'Silk Blouse',
    price: 38,
    image: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=2',
    brand: 'Massimo Dutti',
    size: 'M',
    condition: 'Good',
    seller: 'Jennifer L.'
  }
];

export default function HomeScreen() {
  const [items, setItems] = useState<Item[]>(mockItems);
  const navigation = useNavigation();

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
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ItemDetail' as never, { item } as never)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={item.isFavorite ? '#FF6B6B' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemBrand}>{item.brand} • {item.size}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="grid-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
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
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: itemWidth * 1.3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    fontWeight: 'bold',
    color: '#14B8A6',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemBrand: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});