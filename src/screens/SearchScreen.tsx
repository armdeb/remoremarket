import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'women', name: 'Women', icon: 'woman-outline' },
    { id: 'men', name: 'Men', icon: 'man-outline' },
    { id: 'shoes', name: 'Shoes', icon: 'footsteps-outline' },
    { id: 'bags', name: 'Bags', icon: 'bag-outline' },
    { id: 'accessories', name: 'Accessories', icon: 'diamond-outline' },
  ];

  const recentSearches = [
    'Vintage denim jacket',
    'Nike sneakers',
    'Zara dress',
    'Coach bag',
    'H&M sweater',
  ];

  const popularTags = [
    'Vintage', 'Designer', 'Nike', 'Zara', 'H&M', 'Levi\'s',
    'Summer', 'Winter', 'Casual', 'Formal', 'Boho', 'Minimalist'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for items, brands..."
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.id ? '#ffffff' : '#6B7280'}
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {searchText.length === 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              {recentSearches.map((search, index) => (
                <TouchableOpacity key={index} style={styles.recentSearchItem}>
                  <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.recentSearchText}>{search}</Text>
                  <Ionicons name="arrow-up-outline" size={16} color="#9CA3AF" style={styles.fillIcon} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Tags</Text>
              <View style={styles.tagsContainer}>
                {popularTags.map((tag, index) => (
                  <TouchableOpacity key={index} style={styles.tagButton}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  categoriesSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    minWidth: 80,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#14B8A6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  fillIcon: {
    transform: [{ rotate: '45deg' }],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
  },
});