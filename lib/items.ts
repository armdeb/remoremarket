import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export interface CreateItemData {
  title: string;
  description: string;
  price: number;
  brand: string;
  size: string;
  condition: string;
  category: string;
  images: string[];
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  brand: string;
  size: string;
  condition: string;
  category: string;
  seller_id: string;
  status: 'active' | 'sold' | 'removed';
  created_at: string;
  updated_at: string;
}

export class ItemsService {
  // Upload image to Supabase Storage
  static async uploadImage(uri: string, fileName: string): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = fileName.split('.').pop();
      const filePath = `items/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Upload multiple images
  static async uploadImages(imageUris: string[]): Promise<string[]> {
    try {
      const uploadPromises = imageUris.map((uri, index) => {
        const fileName = `image-${index}.jpg`;
        return this.uploadImage(uri, fileName);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple image upload error:', error);
      throw new Error('Failed to upload images');
    }
  }

  // Create new item
  static async createItem(itemData: CreateItemData): Promise<Item> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('items')
        .insert({
          title: itemData.title,
          description: itemData.description,
          price: itemData.price,
          brand: itemData.brand,
          size: itemData.size,
          condition: itemData.condition,
          category: itemData.category,
          images: itemData.images,
          seller_id: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create item error:', error);
      throw error;
    }
  }

  // Get user's items
  static async getUserItems(): Promise<Item[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user items error:', error);
      throw error;
    }
  }

  // Update item
  static async updateItem(itemId: string, updates: Partial<CreateItemData>): Promise<Item> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('seller_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update item error:', error);
      throw error;
    }
  }

  // Delete item
  static async deleteItem(itemId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('items')
        .update({ status: 'removed' })
        .eq('id', itemId)
        .eq('seller_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete item error:', error);
      throw error;
    }
  }

  // Get all active items
  static async getActiveItems(limit: number = 20, offset: number = 0): Promise<Item[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          seller:profiles!items_seller_id_fkey(nickname, profile_picture)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get active items error:', error);
      throw error;
    }
  }

  // Search items
  static async searchItems(query: string, filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    brand?: string;
  }): Promise<Item[]> {
    try {
      let queryBuilder = supabase
        .from('items')
        .select(`
          *,
          seller:profiles!items_seller_id_fkey(nickname, profile_picture)
        `)
        .eq('status', 'active');

      // Text search
      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`);
      }

      // Apply filters
      if (filters?.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }
      if (filters?.minPrice) {
        queryBuilder = queryBuilder.gte('price', filters.minPrice);
      }
      if (filters?.maxPrice) {
        queryBuilder = queryBuilder.lte('price', filters.maxPrice);
      }
      if (filters?.condition) {
        queryBuilder = queryBuilder.eq('condition', filters.condition);
      }
      if (filters?.brand) {
        queryBuilder = queryBuilder.ilike('brand', `%${filters.brand}%`);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search items error:', error);
      throw error;
    }
  }
}