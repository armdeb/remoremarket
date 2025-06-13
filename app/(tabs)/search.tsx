import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Search, Filter, X, Clock, TrendingUp } from '@expo/vector-icons';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const popularSearches = [
    'Vintage jeans',
    'Designer bags',
    'Nike sneakers',
    'Summer dresses',
    'Leather jackets',
    'Vintage t-shirts',
  ];

  const recentSearches = [
    'Zara dress',
    'Coach bag',
    'Vintage denim',
    'Nike Air Force',
  ];

  const brands = [
    'Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Levi\'s',
    'Coach', 'Gucci', 'Prada', 'Vintage', 'Handmade',
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const conditions = ['New with tags', 'Very good', 'Good', 'Satisfactory'];
  const priceRanges = ['Under $20', '$20-50', '$50-100', '$100-200', 'Over $200'];

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setSelectedFilters([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.headerTitle}>Search</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for items, brands..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#9ACD32" />
          {selectedFilters.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedFilters.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Active Filters */}
        {selectedFilters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Filters</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filtersContainer}>
              {selectedFilters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={styles.activeFilter}
                  onPress={() => toggleFilter(filter)}
                >
                  <Text style={styles.activeFilterText}>{filter}</Text>
                  <X size={16} color="#ffffff" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Searches */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color="#6B7280" />
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>
            <View style={styles.searchList}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchItem}
                  onPress={() => setSearchQuery(search)}
                >
                  <Text style={styles.searchItemText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Popular Searches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color="#9ACD32" />
            <Text style={styles.sectionTitle}>Trending Searches</Text>
          </View>
          <View style={styles.tagsContainer}>
            {popularSearches.map((search) => (
              <TouchableOpacity
                key={search}
                style={styles.trendingTag}
                onPress={() => setSearchQuery(search)}
              >
                <Text style={styles.trendingTagText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brands */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brands</Text>
          <View style={styles.tagsContainer}>
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.filterTag,
                  selectedFilters.includes(brand) && styles.filterTagActive,
                ]}
                onPress={() => toggleFilter(brand)}
              >
                <Text
                  style={[
                    styles.filterTagText,
                    selectedFilters.includes(brand) && styles.filterTagTextActive,
                  ]}
                >
                  {brand}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sizes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sizes</Text>
          <View style={styles.tagsContainer}>
            {sizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.filterTag,
                  selectedFilters.includes(size) && styles.filterTagActive,
                ]}
                onPress={() => toggleFilter(size)}
              >
                <Text
                  style={[
                    styles.filterTagText,
                    selectedFilters.includes(size) && styles.filterTagTextActive,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condition</Text>
          <View style={styles.tagsContainer}>
            {conditions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.filterTag,
                  selectedFilters.includes(condition) && styles.filterTagActive,
                ]}
                onPress={() => toggleFilter(condition)}
              >
                <Text
                  style={[
                    styles.filterTagText,
                    selectedFilters.includes(condition) && styles.filterTagTextActive,
                  ]}
                >
                  {condition}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.tagsContainer}>
            {priceRanges.map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterTag,
                  selectedFilters.includes(range) && styles.filterTagActive,
                ]}
                onPress={() => toggleFilter(range)}
              >
                <Text
                  style={[
                    styles.filterTagText,
                    selectedFilters.includes(range) && styles.filterTagTextActive,
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B47',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  clearButton: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF6B47',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9ACD32',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeFilterText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  searchList: {
    gap: 8,
  },
  searchItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  trendingTagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#D97706',
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
  },
  filterTagActive: {
    backgroundColor: '#6B2C91',
    borderColor: '#6B2C91',
  },
  filterTagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterTagTextActive: {
    color: '#ffffff',
  },
});