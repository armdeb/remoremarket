import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Heart, MapPin } from 'lucide-react-native';
import { SocialService, SocialFeedItem } from '~/lib/social';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const { width } = Dimensions.get('window');
const itemWidth = (width - 45) / 2;

interface SocialFeedProps {
  onEmptyFeed?: () => void;
}

export function SocialFeed({ onEmptyFeed }: SocialFeedProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [items, setItems] = useState<SocialFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async (refresh = false) => {
    try {
      if (refresh) {
        setOffset(0);
        setHasMore(true);
      }
      
      if (!hasMore && !refresh) return;
      
      const currentOffset = refresh ? 0 : offset;
      setLoading(true);
      
      const feedItems = await SocialService.getSocialFeed(20, currentOffset);
      
      if (refresh) {
        setItems(feedItems);
      } else {
        setItems(prev => [...prev, ...feedItems]);
      }
      
      setOffset(currentOffset + feedItems.length);
      setHasMore(feedItems.length === 20);
      
      if (feedItems.length === 0 && currentOffset === 0) {
        onEmptyFeed?.();
      }
    } catch (error) {
      console.error('Load social feed error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems(true);
  };

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  const renderItem = ({ item }: { item: SocialFeedItem }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: colors.background }]}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.images[0] || 'https://via.placeholder.com/300' }} style={styles.itemImage} />
        <TouchableOpacity
          style={[styles.favoriteButton, { backgroundColor: colors.background }]}
          onPress={() => toggleFavorite(item.id)}
        >
          <Heart
            size={20}
            color={favorites.has(item.id) ? colors.error : colors.textSecondary}
            fill={favorites.has(item.id) ? colors.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemInfo}>
        <ThemedText style={[styles.itemPrice, { color: colors.primary }]}>${item.price}</ThemedText>
        <ThemedText style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.itemBrand, { color: colors.textSecondary }]}>
          {item.brand} • {item.size}
        </ThemedText>
        
        <TouchableOpacity 
          style={styles.sellerContainer}
          onPress={() => router.push(`/user/${item.seller_id}`)}
        >
          {item.seller_profile_picture ? (
            <Image source={{ uri: item.seller_profile_picture }} style={styles.sellerAvatar} />
          ) : (
            <View style={[styles.sellerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.sellerAvatarText}>
                {item.seller_nickname.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText style={[styles.sellerName, { color: colors.textSecondary }]}>
            {item.seller_nickname}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading && !refreshing) return null;
    
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          No items from people you follow
        </ThemedText>
        <ThemedText style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Follow more sellers to see their items here
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.listContainer}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      onEndReached={() => loadItems()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyComponent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 15,
    flexGrow: 1,
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
    marginBottom: 8,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  sellerAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  sellerAvatarText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  sellerName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});