import { supabase } from './supabase';

export interface DashboardStats {
  revenue: {
    total: number;
    change: number;
    chartData?: { date: string; value: number }[];
  };
  users: {
    total: number;
    change: number;
    newUsers: number;
    activeUsers: number;
    retentionRate: number;
  };
  items: {
    total: number;
    change: number;
    activeItems: number;
    soldItems: number;
    removedItems: number;
  };
  orders: {
    total: number;
    change: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  };
  disputes: {
    active: number;
    resolved: number;
    resolution_time_avg: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    time: string;
    value: string;
    color: string;
    type: 'user' | 'order' | 'item' | 'dispute' | 'payment';
    entity_id?: string;
  }>;
  topCategories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topSellers: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  phone?: string;
  profile_picture?: string;
  first_name?: string;
  last_name?: string;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at?: string;
  last_login?: string;
  items_count: number;
  orders_count: number;
  total_spent: number;
  total_earned?: number;
  verification: {
    email_verified: boolean;
    phone_verified: boolean;
    identity_verified: boolean;
  };
  flags?: {
    suspicious_activity: boolean;
    reported_count: number;
  };
}

export interface AdminItem {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  brand: string;
  category: string;
  condition: string;
  status: 'active' | 'sold' | 'removed' | 'flagged';
  seller: {
    id: string;
    nickname: string;
    profile_picture?: string;
    rating?: number;
  };
  created_at: string;
  updated_at?: string;
  reports_count: number;
  views_count?: number;
  likes_count?: number;
  flags?: {
    prohibited_item: boolean;
    counterfeit: boolean;
    inappropriate: boolean;
    misleading: boolean;
  };
}

export interface AdminOrder {
  id: string;
  item: {
    id: string;
    title: string;
    price: number;
    images: string[];
  };
  buyer: {
    id: string;
    nickname: string;
    email: string;
  };
  seller: {
    id: string;
    nickname: string;
    email: string;
  };
  rider?: {
    id: string;
    nickname: string;
    phone?: string;
  };
  total_amount: number;
  platform_fee: number;
  seller_amount?: number;
  status: string;
  payment_status?: string;
  delivery_status?: string;
  created_at: string;
  updated_at?: string;
  payment_intent_id?: string;
  delivery_details?: {
    pickup_time?: string;
    delivery_time?: string;
    pickup_address?: string;
    delivery_address?: string;
    tracking_id?: string;
  };
}

export interface AdminDispute {
  id: string;
  order_id: string;
  order: {
    item: {
      title: string;
      price: number;
    };
    buyer: {
      nickname: string;
    };
    seller: {
      nickname: string;
    };
  };
  reporter_id: string;
  reported_id: string;
  type: 'item_not_received' | 'item_not_as_described' | 'payment_issue' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  resolution?: string;
  assigned_to?: string;
  evidence?: {
    buyer_evidence: string[];
    seller_evidence: string[];
  };
  resolution_time?: number; // in hours
}

export interface AdminSettings {
  platform: {
    autoModeration: boolean;
    maintenanceMode: boolean;
    newUserRegistration: boolean;
    itemAutoApproval: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    disputeAutoAssignment: boolean;
  };
  fees: {
    transactionFee: number;
    listingFee: number;
    payoutFee: number;
  };
  delivery: {
    apiEnabled: boolean;
    apiKey: string;
    webhookUrl?: string;
  };
}

export class AdminService {
  // Get dashboard statistics with time range filter
  static async getDashboardStats(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<DashboardStats> {
    try {
      // Calculate date ranges based on selected time range
      const endDate = new Date();
      const startDate = new Date();
      const previousStartDate = new Date();
      const previousEndDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          previousStartDate.setDate(endDate.getDate() - 14);
          previousEndDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          previousStartDate.setDate(endDate.getDate() - 60);
          previousEndDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          previousStartDate.setDate(endDate.getDate() - 180);
          previousEndDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          previousStartDate.setFullYear(endDate.getFullYear() - 2);
          previousEndDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Revenue stats
      const { data: currentRevenue } = await supabase
        .from('orders')
        .select('platform_fee, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('status', ['completed', 'delivered']);

      const { data: previousRevenue } = await supabase
        .from('orders')
        .select('platform_fee')
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString())
        .in('status', ['completed', 'delivered']);

      const currentRevenueTotal = currentRevenue?.reduce((sum, order) => sum + (order.platform_fee || 0), 0) || 0;
      const previousRevenueTotal = previousRevenue?.reduce((sum, order) => sum + (order.platform_fee || 0), 0) || 0;
      const revenueChange = previousRevenueTotal > 0 
        ? ((currentRevenueTotal - previousRevenueTotal) / previousRevenueTotal) * 100 
        : 0;

      // Generate chart data for revenue
      const revenueChartData = generateChartData(currentRevenue || [], timeRange);

      // User stats
      const { data: currentUserData, count: currentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const usersChange = previousUsers && previousUsers > 0 
        ? ((currentUsers || 0) - previousUsers) / previousUsers * 100 
        : 0;

      // Items stats
      const { data: currentItemsData, count: currentItems } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: previousItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      const { count: totalItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });

      const { count: activeItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: soldItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold');

      const { count: removedItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'removed');

      const itemsChange = previousItems && previousItems > 0 
        ? ((currentItems || 0) - previousItems) / previousItems * 100 
        : 0;

      // Orders stats
      const { data: currentOrdersData, count: currentOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: previousOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'paid', 'pickup_scheduled', 'delivery_scheduled']);

      const { count: completedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: cancelledOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['cancelled', 'refunded']);

      const ordersChange = previousOrders && previousOrders > 0 
        ? ((currentOrders || 0) - previousOrders) / previousOrders * 100 
        : 0;

      // Disputes stats
      const { count: activeDisputes } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating']);

      const { count: resolvedDisputes } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      // Calculate average resolution time (mock data for now)
      const resolutionTimeAvg = 24; // 24 hours average

      // Get top categories
      const { data: itemsByCategory } = await supabase
        .from('items')
        .select('category')
        .eq('status', 'active');

      const categoryCounts: Record<string, number> = {};
      itemsByCategory?.forEach(item => {
        if (item.category) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
      });

      const totalCategoryItems = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) || 1;
      
      const categoryColors = {
        'women': '#6B2C91',
        'men': '#10B981',
        'shoes': '#F59E0B',
        'bags': '#3B82F6',
        'accessories': '#EF4444',
        'kids': '#8B5CF6',
        'other': '#9CA3AF'
      };

      const topCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({
          name,
          value: Math.round((count / totalCategoryItems) * 100),
          color: categoryColors[name as keyof typeof categoryColors] || '#9CA3AF'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Get top sellers
      const { data: sellerData } = await supabase
        .from('orders')
        .select(`
          seller_id,
          seller:profiles!orders_seller_id_fkey(nickname),
          total_amount
        `)
        .eq('status', 'completed');

      const sellerStats: Record<string, { id: string, name: string, sales: number, revenue: number }> = {};
      
      sellerData?.forEach((order: any) => {
        const sellerId = order.seller_id;
        const sellerName = Array.isArray(order.seller) ? (order.seller[0]?.nickname || 'Unknown') : (order.seller?.nickname || 'Unknown');
        
        if (!sellerStats[sellerId]) {
          sellerStats[sellerId] = {
            id: sellerId,
            name: sellerName,
            sales: 0,
            revenue: 0
          };
        }
        
        sellerStats[sellerId].sales += 1;
        sellerStats[sellerId].revenue += order.total_amount || 0;
      });

      const topSellers = Object.values(sellerStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Recent activity (combine recent users, orders, items, disputes)
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, nickname, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentItems } = await supabase
        .from('items')
        .select('id, title, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and sort recent activity
      const recentActivity = [
        ...(recentUsers?.map(user => ({
          id: user.id,
          title: `New user: ${user.nickname}`,
          time: formatTimeAgo(new Date(user.created_at)),
          value: 'Registered',
          color: '#10B981',
          type: 'user' as const,
          entity_id: user.id
        })) || []),
        ...(recentOrders?.map(order => ({
          id: order.id,
          title: `Order #${order.id.substring(0, 8)}`,
          time: formatTimeAgo(new Date(order.created_at)),
          value: `$${order.total_amount.toFixed(2)}`,
          color: getOrderStatusColor(order.status),
          type: 'order' as const,
          entity_id: order.id
        })) || []),
        ...(recentItems?.map(item => ({
          id: item.id,
          title: `New item: ${item.title}`,
          time: formatTimeAgo(new Date(item.created_at)),
          value: item.status,
          color: getItemStatusColor(item.status),
          type: 'item' as const,
          entity_id: item.id
        })) || [])
      ]
      .sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      })
      .slice(0, 10);

      return {
        revenue: {
          total: currentRevenueTotal,
          change: revenueChange,
          chartData: revenueChartData,
        },
        users: {
          total: totalUsers || 0,
          change: usersChange,
          newUsers: currentUsers || 0,
          activeUsers: activeUsers || 0,
          retentionRate: totalUsers ? Math.round((activeUsers || 0) / totalUsers * 100) : 0,
        },
        items: {
          total: totalItems || 0,
          change: itemsChange,
          activeItems: activeItems || 0,
          soldItems: soldItems || 0,
          removedItems: removedItems || 0,
        },
        orders: {
          total: totalOrders || 0,
          change: ordersChange,
          pendingOrders: pendingOrders || 0,
          completedOrders: completedOrders || 0,
          cancelledOrders: cancelledOrders || 0,
        },
        disputes: {
          active: activeDisputes || 0,
          resolved: resolvedDisputes || 0,
          resolution_time_avg: resolutionTimeAvg,
        },
        recentActivity,
        topCategories,
        topSellers,
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  // Get all users with admin data
  static async getUsers(
    search?: string,
    status?: 'active' | 'suspended',
    sortBy: 'created_at' | 'nickname' | 'orders_count' | 'total_spent' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: AdminUser[], total: number }> {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          items:items(count),
          buyer_orders:orders!orders_buyer_id_fkey(count, total_amount),
          seller_orders:orders!orders_seller_id_fkey(count),
          wallet:wallets(total_earned)
        `, { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      // Apply status filter (in a real app, this would be a column in the profiles table)
      if (status) {
        // This is a mock implementation since we don't have a status column
        // In a real app, you would use: query = query.eq('status', status);
      }

      // Calculate pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Apply sorting
      let orderColumn = sortBy;
      if (sortBy === 'orders_count') {
        // This would require a more complex query in a real app
        orderColumn = 'created_at';
      } else if (sortBy === 'total_spent') {
        // This would require a more complex query in a real app
        orderColumn = 'created_at';
      }

      const { data, error, count } = await query
        .order(orderColumn, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      const users = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        phone: user.phone,
        profile_picture: user.profile_picture,
        first_name: user.first_name,
        last_name: user.last_name,
        status: 'active' as 'active', // In real app, this would come from user table
        created_at: user.created_at,
        updated_at: user.updated_at,
        items_count: user.items?.[0]?.count || 0,
        orders_count: (user.buyer_orders?.[0]?.count || 0) + (user.seller_orders?.[0]?.count || 0),
        total_spent: user.buyer_orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0,
        total_earned: user.wallet?.[0]?.total_earned || 0,
        verification: {
          email_verified: user.email_verified || false,
          phone_verified: user.phone_verified || false,
          identity_verified: false, // Mock data
        },
        flags: {
          suspicious_activity: false, // Mock data
          reported_count: 0, // Mock data
        }
      }));

      return { users, total: count || 0 };
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  // Get user details
  static async getUserDetails(userId: string): Promise<AdminUser> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          items:items(count),
          buyer_orders:orders!orders_buyer_id_fkey(count, total_amount),
          seller_orders:orders!orders_seller_id_fkey(count),
          wallet:wallets(total_earned)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        email: data.email,
        nickname: data.nickname,
        phone: data.phone,
        profile_picture: data.profile_picture,
        first_name: data.first_name,
        last_name: data.last_name,
        status: 'active', // In real app, this would come from user table
        created_at: data.created_at,
        updated_at: data.updated_at,
        items_count: data.items?.[0]?.count || 0,
        orders_count: (data.buyer_orders?.[0]?.count || 0) + (data.seller_orders?.[0]?.count || 0),
        total_spent: data.buyer_orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0,
        total_earned: data.wallet?.[0]?.total_earned || 0,
        verification: {
          email_verified: data.email_verified || false,
          phone_verified: data.phone_verified || false,
          identity_verified: false, // Mock data
        },
        flags: {
          suspicious_activity: false, // Mock data
          reported_count: 0, // Mock data
        }
      };
    } catch (error) {
      console.error('Get user details error:', error);
      throw error;
    }
  }

  // Moderate user (suspend, activate, delete)
  static async moderateUser(userId: string, action: 'suspend' | 'activate' | 'delete'): Promise<void> {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (error) throw error;
      } else {
        // In a real app, you would update a status field
        // For now, we'll just simulate the action
        console.log(`User ${userId} ${action}d`);
      }
    } catch (error) {
      console.error('Moderate user error:', error);
      throw error;
    }
  }

  // Get all items with admin data
  static async getItems(
    search?: string,
    status?: 'active' | 'flagged' | 'removed' | 'sold',
    category?: string,
    reportedOnly?: boolean,
    sortBy: 'created_at' | 'price' | 'title' | 'reports_count' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: AdminItem[], total: number }> {
    try {
      let query = supabase
        .from('items')
        .select(`
          *,
          seller:profiles!items_seller_id_fkey(id, nickname, profile_picture)
        `, { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);
      }

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Apply category filter
      if (category) {
        query = query.eq('category', category);
      }

      // Apply reported only filter (in a real app)
      if (reportedOnly) {
        // This would require a reports table in a real app
        // query = query.gt('reports_count', 0);
      }

      // Calculate pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Apply sorting
      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      const items = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        images: item.images || [],
        brand: item.brand,
        category: item.category,
        condition: item.condition,
        status: item.status,
        seller: {
          id: item.seller.id,
          nickname: item.seller.nickname,
          profile_picture: item.seller.profile_picture,
          rating: 4.5, // Mock data
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
        reports_count: Math.floor(Math.random() * 5), // Mock data
        views_count: Math.floor(Math.random() * 100), // Mock data
        likes_count: Math.floor(Math.random() * 20), // Mock data
        flags: {
          prohibited_item: false,
          counterfeit: false,
          inappropriate: false,
          misleading: false,
        }
      }));

      return { items, total: count || 0 };
    } catch (error) {
      console.error('Get items error:', error);
      throw error;
    }
  }

  // Get item details
  static async getItemDetails(itemId: string): Promise<AdminItem> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          seller:profiles!items_seller_id_fkey(id, nickname, profile_picture)
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images || [],
        brand: data.brand,
        category: data.category,
        condition: data.condition,
        status: data.status,
        seller: {
          id: data.seller.id,
          nickname: data.seller.nickname,
          profile_picture: data.seller.profile_picture,
          rating: 4.5, // Mock data
        },
        created_at: data.created_at,
        updated_at: data.updated_at,
        reports_count: Math.floor(Math.random() * 5), // Mock data
        views_count: Math.floor(Math.random() * 100), // Mock data
        likes_count: Math.floor(Math.random() * 20), // Mock data
        flags: {
          prohibited_item: false,
          counterfeit: false,
          inappropriate: false,
          misleading: false,
        }
      };
    } catch (error) {
      console.error('Get item details error:', error);
      throw error;
    }
  }

  // Moderate item (approve, flag, remove)
  static async moderateItem(itemId: string, action: 'approve' | 'flag' | 'remove'): Promise<void> {
    try {
      const status = action === 'approve' ? 'active' : action === 'flag' ? 'flagged' : 'removed';
      
      const { error } = await supabase
        .from('items')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      // Add to moderation history (in a real app)
      // await supabase
      //   .from('moderation_history')
      //   .insert({
      //     item_id: itemId,
      //     action,
      //     moderator_id: 'admin', // This would be the actual admin user ID
      //     created_at: new Date().toISOString()
      //   });
    } catch (error) {
      console.error('Moderate item error:', error);
      throw error;
    }
  }

  // Get all orders with admin data
  static async getOrders(
    search?: string,
    status?: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded',
    dateRange?: { start: string; end: string },
    sortBy: 'created_at' | 'total_amount' | 'status' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: AdminOrder[], total: number }> {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          item:items(id, title, price, images),
          buyer:profiles!orders_buyer_id_fkey(id, nickname, email),
          seller:profiles!orders_seller_id_fkey(id, nickname, email),
          rider:profiles(id, nickname, phone)
        `, { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`id.ilike.%${search}%,item.title.ilike.%${search}%,buyer.nickname.ilike.%${search}%,seller.nickname.ilike.%${search}%`);
      }

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Apply date range filter
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      // Calculate pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Apply sorting
      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;

      const orders = (data || []).map(order => ({
        id: order.id,
        item: {
          id: order.item.id,
          title: order.item.title,
          price: order.item.price,
          images: order.item.images || [],
        },
        buyer: {
          id: order.buyer.id,
          nickname: order.buyer.nickname,
          email: order.buyer.email,
        },
        seller: {
          id: order.seller.id,
          nickname: order.seller.nickname,
          email: order.seller.email,
        },
        rider: order.rider ? {
          id: order.rider.id,
          nickname: order.rider.nickname,
          phone: order.rider.phone,
        } : undefined,
        total_amount: order.total_amount,
        platform_fee: order.platform_fee || 0,
        seller_amount: order.seller_amount,
        status: order.status,
        payment_status: getPaymentStatus(order.status),
        delivery_status: getDeliveryStatus(order.status),
        created_at: order.created_at,
        updated_at: order.updated_at,
        payment_intent_id: order.payment_intent_id,
        delivery_details: {
          // This would come from a delivery_schedules table in a real app
          pickup_time: order.status === 'pickup_scheduled' ? '2025-06-15T14:00:00Z' : undefined,
          delivery_time: order.status === 'delivery_scheduled' ? '2025-06-16T14:00:00Z' : undefined,
          pickup_address: order.status === 'pickup_scheduled' ? '123 Seller St, New York, NY' : undefined,
          delivery_address: order.status === 'delivery_scheduled' ? '456 Buyer Ave, New York, NY' : undefined,
          tracking_id: order.status === 'picked_up' ? 'TRK' + Math.random().toString(36).substring(2, 10).toUpperCase() : undefined,
        }
      }));

      return { orders, total: count || 0 };
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  // Get order details
  static async getOrderDetails(orderId: string): Promise<AdminOrder> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          item:items(id, title, price, images),
          buyer:profiles!orders_buyer_id_fkey(id, nickname, email),
          seller:profiles!orders_seller_id_fkey(id, nickname, email),
          rider:profiles(id, nickname, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        item: {
          id: data.item.id,
          title: data.item.title,
          price: data.item.price,
          images: data.item.images || [],
        },
        buyer: {
          id: data.buyer.id,
          nickname: data.buyer.nickname,
          email: data.buyer.email,
        },
        seller: {
          id: data.seller.id,
          nickname: data.seller.nickname,
          email: data.seller.email,
        },
        rider: data.rider ? {
          id: data.rider.id,
          nickname: data.rider.nickname,
          phone: data.rider.phone,
        } : undefined,
        total_amount: data.total_amount,
        platform_fee: data.platform_fee || 0,
        seller_amount: data.seller_amount,
        status: data.status,
        payment_status: getPaymentStatus(data.status),
        delivery_status: getDeliveryStatus(data.status),
        created_at: data.created_at,
        updated_at: data.updated_at,
        payment_intent_id: data.payment_intent_id,
        delivery_details: {
          // This would come from a delivery_schedules table in a real app
          pickup_time: data.status === 'pickup_scheduled' ? '2025-06-15T14:00:00Z' : undefined,
          delivery_time: data.status === 'delivery_scheduled' ? '2025-06-16T14:00:00Z' : undefined,
          pickup_address: data.status === 'pickup_scheduled' ? '123 Seller St, New York, NY' : undefined,
          delivery_address: data.status === 'delivery_scheduled' ? '456 Buyer Ave, New York, NY' : undefined,
          tracking_id: data.status === 'picked_up' ? 'TRK' + Math.random().toString(36).substring(2, 10).toUpperCase() : undefined,
        }
      };
    } catch (error) {
      console.error('Get order details error:', error);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add to order history (in a real app)
      // await supabase
      //   .from('order_history')
      //   .insert({
      //     order_id: orderId,
      //     status,
      //     notes,
      //     created_by: 'admin', // This would be the actual admin user ID
      //     created_at: new Date().toISOString()
      //   });
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  // Get all disputes
  static async getDisputes(
    search?: string,
    status?: 'open' | 'investigating' | 'resolved' | 'closed',
    priority?: 'low' | 'medium' | 'high',
    sortBy: 'created_at' | 'priority' | 'status' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    page: number = 1,
    limit: number = 20
  ): Promise<{ disputes: AdminDispute[], total: number }> {
    try {
      // In a real app, this would query the disputes table
      // For now, we'll return mock data
      const mockDisputes: AdminDispute[] = [
        {
          id: '1',
          order_id: 'order-1',
          order: {
            item: {
              title: 'Vintage Denim Jacket',
              price: 45,
            },
            buyer: {
              nickname: 'john_doe',
            },
            seller: {
              nickname: 'sarah_style',
            },
          },
          reporter_id: 'user-1',
          reported_id: 'user-2',
          type: 'item_not_as_described',
          description: 'Item has significant wear not mentioned in description',
          status: 'open',
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assigned_to: 'admin-1',
          evidence: {
            buyer_evidence: ['https://example.com/evidence1.jpg'],
            seller_evidence: [],
          },
        },
        {
          id: '2',
          order_id: 'order-2',
          order: {
            item: {
              title: 'Designer Handbag',
              price: 125,
            },
            buyer: {
              nickname: 'emma_k',
            },
            seller: {
              nickname: 'lisa_r',
            },
          },
          reporter_id: 'user-3',
          reported_id: 'user-4',
          type: 'item_not_received',
          description: 'Item was never delivered despite payment',
          status: 'investigating',
          priority: 'high',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 43200000).toISOString(),
          assigned_to: 'admin-2',
          evidence: {
            buyer_evidence: ['https://example.com/evidence2.jpg'],
            seller_evidence: ['https://example.com/evidence3.jpg'],
          },
        },
        {
          id: '3',
          order_id: 'order-3',
          order: {
            item: {
              title: 'Leather Boots',
              price: 85,
            },
            buyer: {
              nickname: 'mike_j',
            },
            seller: {
              nickname: 'footwear_pro',
            },
          },
          reporter_id: 'user-5',
          reported_id: 'user-6',
          type: 'payment_issue',
          description: 'Payment was processed but order shows as pending',
          status: 'resolved',
          priority: 'medium',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          resolved_at: new Date(Date.now() - 86400000).toISOString(),
          resolution: 'Payment confirmed and order status updated',
          assigned_to: 'admin-1',
          resolution_time: 24,
        },
        {
          id: '4',
          order_id: 'order-4',
          order: {
            item: {
              title: 'Summer Dress',
              price: 38,
            },
            buyer: {
              nickname: 'fashion_lover',
            },
            seller: {
              nickname: 'summer_styles',
            },
          },
          reporter_id: 'user-7',
          reported_id: 'user-8',
          type: 'other',
          description: 'Seller is not responding to messages',
          status: 'open',
          priority: 'low',
          created_at: new Date(Date.now() - 43200000).toISOString(),
          updated_at: new Date(Date.now() - 43200000).toISOString(),
          assigned_to: 'admin-3',
        },
        {
          id: '5',
          order_id: 'order-5',
          order: {
            item: {
              title: 'Vintage Watch',
              price: 150,
            },
            buyer: {
              nickname: 'collector123',
            },
            seller: {
              nickname: 'vintage_finds',
            },
          },
          reporter_id: 'user-9',
          reported_id: 'user-10',
          type: 'item_not_as_described',
          description: 'Watch is not authentic as claimed in the listing',
          status: 'investigating',
          priority: 'high',
          created_at: new Date(Date.now() - 129600000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          assigned_to: 'admin-2',
          evidence: {
            buyer_evidence: ['https://example.com/evidence4.jpg', 'https://example.com/evidence5.jpg'],
            seller_evidence: ['https://example.com/evidence6.jpg'],
          },
        },
      ];

      // Filter disputes based on search, status, and priority
      let filteredDisputes = [...mockDisputes];
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredDisputes = filteredDisputes.filter(dispute => 
          dispute.order.item.title.toLowerCase().includes(searchLower) ||
          dispute.order.buyer.nickname.toLowerCase().includes(searchLower) ||
          dispute.order.seller.nickname.toLowerCase().includes(searchLower) ||
          dispute.id.toLowerCase().includes(searchLower)
        );
      }
      
      if (status) {
        filteredDisputes = filteredDisputes.filter(dispute => dispute.status === status);
      }
      
      if (priority) {
        filteredDisputes = filteredDisputes.filter(dispute => dispute.priority === priority);
      }

      // Sort disputes
      filteredDisputes.sort((a, b) => {
        if (sortBy === 'created_at') {
          return sortOrder === 'asc' 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'priority') {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return sortOrder === 'asc'
            ? priorityOrder[a.priority] - priorityOrder[b.priority]
            : priorityOrder[b.priority] - priorityOrder[a.priority];
        } else if (sortBy === 'status') {
          const statusOrder = { open: 0, investigating: 1, resolved: 2, closed: 3 };
          return sortOrder === 'asc'
            ? statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
            : statusOrder[b.status as keyof typeof statusOrder] - statusOrder[a.status as keyof typeof statusOrder];
        }
        return 0;
      });

      // Apply pagination
      const paginatedDisputes = filteredDisputes.slice((page - 1) * limit, page * limit);

      return { disputes: paginatedDisputes, total: filteredDisputes.length };
    } catch (error) {
      console.error('Get disputes error:', error);
      throw error;
    }
  }

  // Get dispute details
  static async getDisputeDetails(disputeId: string): Promise<AdminDispute> {
    try {
      // In a real app, this would query the disputes table
      // For now, we'll return mock data
      const mockDispute: AdminDispute = {
        id: disputeId,
        order_id: 'order-1',
        order: {
          item: {
            title: 'Vintage Denim Jacket',
            price: 45,
          },
          buyer: {
            nickname: 'john_doe',
          },
          seller: {
            nickname: 'sarah_style',
          },
        },
        reporter_id: 'user-1',
        reported_id: 'user-2',
        type: 'item_not_as_described',
        description: 'Item has significant wear not mentioned in description. The jacket has several tears and stains that were not disclosed in the listing. The seller claimed it was in "good" condition but its barely wearable. Ive attached photos showing the damage.',
        status: 'open',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assigned_to: 'admin-1',
        evidence: {
          buyer_evidence: [
            'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2',
            'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2'
          ],
          seller_evidence: [
            'https://images.pexels.com/photos/1598509/pexels-photo-1598509.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=2'
          ],
        },
      };

      return mockDispute;
    } catch (error) {
      console.error('Get dispute details error:', error);
      throw error;
    }
  }

  // Resolve dispute
  static async resolveDispute(disputeId: string, resolution: string, refundAmount?: number): Promise<void> {
    try {
      // In a real app, this would update the dispute in the database
      console.log(`Dispute ${disputeId} resolved: ${resolution}`);
      
      if (refundAmount) {
        console.log(`Refund amount: $${refundAmount}`);
        // Process refund logic would go here
      }
    } catch (error) {
      console.error('Resolve dispute error:', error);
      throw error;
    }
  }

  // Assign dispute to admin
  static async assignDispute(disputeId: string, adminId: string): Promise<void> {
    try {
      // In a real app, this would update the dispute in the database
      console.log(`Dispute ${disputeId} assigned to admin ${adminId}`);
    } catch (error) {
      console.error('Assign dispute error:', error);
      throw error;
    }
  }

  // Update dispute priority
  static async updateDisputePriority(disputeId: string, priority: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      // In a real app, this would update the dispute in the database
      console.log(`Dispute ${disputeId} priority updated to ${priority}`);
    } catch (error) {
      console.error('Update dispute priority error:', error);
      throw error;
    }
  }

  // Get admin settings
  static async getAdminSettings(): Promise<AdminSettings> {
    try {
      // In a real app, this would query the settings table
      // For now, we'll return mock data
      return {
        platform: {
          autoModeration: true,
          maintenanceMode: false,
          newUserRegistration: true,
          itemAutoApproval: false,
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: false,
          disputeAutoAssignment: true,
        },
        fees: {
          transactionFee: 5.0, // 5%
          listingFee: 2.99, // $2.99
          payoutFee: 1.5, // 1.5%
        },
        delivery: {
          apiEnabled: true,
          apiKey: "RIDER_API_KEY",
          webhookUrl: "https://rider-app.example.com/webhook",
        }
      };
    } catch (error) {
      console.error('Get admin settings error:', error);
      throw error;
    }
  }

  // Update admin settings
  static async updateAdminSettings(settings: Partial<AdminSettings>): Promise<void> {
    try {
      // In a real app, this would update the settings in the database
      console.log('Settings updated:', settings);
    } catch (error) {
      console.error('Update admin settings error:', error);
      throw error;
    }
  }

  // Generate new API key for delivery API
  static async generateDeliveryApiKey(): Promise<string> {
    try {
      // In a real app, this would generate and store a new API key
      const newApiKey = `RIDER_API_KEY_${Math.random().toString(36).substring(2, 10)}`;
      console.log('New API key generated:', newApiKey);
      return newApiKey;
    } catch (error) {
      console.error('Generate API key error:', error);
      throw error;
    }
  }

  // Get analytics data
  static async getAnalytics(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
    metrics: string[] = ['revenue', 'orders', 'users', 'items']
  ): Promise<any> {
    try {
      // Calculate date ranges based on selected time range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const result: any = {};

      // Get revenue data if requested
      if (metrics.includes('revenue')) {
        const { data: revenueData } = await supabase
          .from('orders')
          .select('created_at, platform_fee')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .in('status', ['completed', 'delivered']);

        result.revenue = {
          total: revenueData?.reduce((sum, order) => sum + (order.platform_fee || 0), 0) || 0,
          chartData: generateTimeSeriesData(revenueData || [], 'platform_fee', timeRange),
        };
      }

      // Get orders data if requested
      if (metrics.includes('orders')) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const ordersByStatus: Record<string, number> = {};
        ordersData?.forEach(order => {
          ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
        });

        result.orders = {
          total: ordersData?.length || 0,
          byStatus: ordersByStatus,
          chartData: generateTimeSeriesData(ordersData || [], 'count', timeRange),
        };
      }

      // Get users data if requested
      if (metrics.includes('users')) {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        result.users = {
          total: usersData?.length || 0,
          chartData: generateTimeSeriesData(usersData || [], 'count', timeRange),
        };
      }

      // Get items data if requested
      if (metrics.includes('items')) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const itemsByStatus: Record<string, number> = {};
        itemsData?.forEach(item => {
          itemsByStatus[item.status] = (itemsByStatus[item.status] || 0) + 1;
        });

        result.items = {
          total: itemsData?.length || 0,
          byStatus: itemsByStatus,
          chartData: generateTimeSeriesData(itemsData || [], 'count', timeRange),
        };
      }

      return result;
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  }

  // Export data (users, items, orders, etc.)
  static async exportData(dataType: 'users' | 'items' | 'orders' | 'disputes' | 'all'): Promise<string> {
    try {
      // In a real app, this would generate and return a download URL for the exported data
      console.log(`Exporting ${dataType} data...`);
      return `https://example.com/exports/${dataType}_${Date.now()}.csv`;
    } catch (error) {
      console.error('Export data error:', error);
      throw error;
    }
  }

  // Clear cache
  static async clearCache(): Promise<void> {
    try {
      // In a real app, this would clear the server cache
      console.log('Cache cleared');
    } catch (error) {
      console.error('Clear cache error:', error);
      throw error;
    }
  }
}

// Helper functions

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

function parseTimeAgo(timeAgo: string): number {
  const now = new Date().getTime();
  
  if (timeAgo.includes('second')) {
    const seconds = parseInt(timeAgo);
    return now - (seconds * 1000);
  }
  
  if (timeAgo.includes('minute')) {
    const minutes = parseInt(timeAgo);
    return now - (minutes * 60 * 1000);
  }
  
  if (timeAgo.includes('hour')) {
    const hours = parseInt(timeAgo);
    return now - (hours * 60 * 60 * 1000);
  }
  
  if (timeAgo.includes('day')) {
    const days = parseInt(timeAgo);
    return now - (days * 24 * 60 * 60 * 1000);
  }
  
  if (timeAgo.includes('month')) {
    const months = parseInt(timeAgo);
    return now - (months * 30 * 24 * 60 * 60 * 1000);
  }
  
  if (timeAgo.includes('year')) {
    const years = parseInt(timeAgo);
    return now - (years * 365 * 24 * 60 * 60 * 1000);
  }
  
  return now;
}

function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'paid': return '#3B82F6';
    case 'pickup_scheduled': return '#8B5CF6';
    case 'picked_up': return '#6366F1';
    case 'delivery_scheduled': return '#EC4899';
    case 'delivered': return '#10B981';
    case 'completed': return '#10B981';
    case 'cancelled': return '#EF4444';
    case 'refunded': return '#F97316';
    case 'disputed': return '#EF4444';
    default: return '#9CA3AF';
  }
}

function getItemStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#10B981';
    case 'sold': return '#3B82F6';
    case 'removed': return '#EF4444';
    case 'flagged': return '#F59E0B';
    default: return '#9CA3AF';
  }
}

function getPaymentStatus(orderStatus: string): string {
  switch (orderStatus) {
    case 'pending': return 'pending';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'refunded';
    default: return 'completed';
  }
}

function getDeliveryStatus(orderStatus: string): string {
  switch (orderStatus) {
    case 'pending':
    case 'paid': 
      return 'not_scheduled';
    case 'pickup_scheduled': 
      return 'pickup_scheduled';
    case 'picked_up': 
      return 'in_transit';
    case 'delivery_scheduled': 
      return 'delivery_scheduled';
    case 'delivered':
    case 'completed': 
      return 'delivered';
    case 'cancelled':
    case 'refunded': 
      return 'cancelled';
    default: 
      return 'unknown';
  }
}

function generateChartData(data: any[], timeRange: '7d' | '30d' | '90d' | '1y'): { date: string; value: number }[] {
  // Group data by date
  const groupedData: Record<string, number> = {};
  
  data.forEach(item => {
    const date = new Date(item.created_at);
    let dateKey: string;
    
    switch (timeRange) {
      case '7d':
        // Group by day for 7 days
        dateKey = date.toISOString().split('T')[0];
        break;
      case '30d':
        // Group by day for 30 days
        dateKey = date.toISOString().split('T')[0];
        break;
      case '90d':
        // Group by week for 90 days
        const weekNumber = Math.floor(date.getDate() / 7) + 1;
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-W${weekNumber}`;
        break;
      case '1y':
        // Group by month for 1 year
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      default:
        dateKey = date.toISOString().split('T')[0];
    }
    
    groupedData[dateKey] = (groupedData[dateKey] || 0) + (item.platform_fee || 0);
  });
  
  // Convert to array format for chart
  return Object.entries(groupedData).map(([date, value]) => ({
    date,
    value,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function generateTimeSeriesData(data: any[], valueField: string, timeRange: '7d' | '30d' | '90d' | '1y'): any[] {
  // Determine the grouping interval based on time range
  let interval: 'day' | 'week' | 'month';
  switch (timeRange) {
    case '7d':
      interval = 'day';
      break;
    case '30d':
      interval = 'day';
      break;
    case '90d':
      interval = 'week';
      break;
    case '1y':
      interval = 'month';
      break;
    default:
      interval = 'day';
  }

  // Generate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  // Generate all dates in the range
  const dateRange: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    let dateKey: string;
    
    switch (interval) {
      case 'day':
        dateKey = currentDate.toISOString().split('T')[0];
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        dateKey = `${currentDate.getFullYear()}-W${Math.floor(currentDate.getDate() / 7) + 1}`;
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
    
    dateRange.push(dateKey);
  }

  // Group data by date
  const groupedData: Record<string, number> = {};
  
  // Initialize all dates with zero
  dateRange.forEach(date => {
    groupedData[date] = 0;
  });
  
  // Populate with actual data
  data.forEach(item => {
    const date = new Date(item.created_at);
    let dateKey: string;
    
    switch (interval) {
      case 'day':
        dateKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        dateKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7) + 1}`;
        break;
      case 'month':
        dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
    }
    
    if (valueField === 'count') {
      groupedData[dateKey] = (groupedData[dateKey] || 0) + 1;
    } else {
      groupedData[dateKey] = (groupedData[dateKey] || 0) + (item[valueField] || 0);
    }
  });
  
  // Convert to array format for chart
  return Object.entries(groupedData).map(([date, value]) => ({
    date,
    value,
  })).sort((a, b) => a.date.localeCompare(b.date));
}