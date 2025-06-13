import { supabase } from './supabase';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
}

export interface DeliveryStatusUpdate {
  status: 'assigned' | 'en_route_to_pickup' | 'at_pickup' | 'picked_up' | 'en_route_to_delivery' | 'at_delivery' | 'delivered' | 'failed';
  notes?: string;
  verification_code?: string;
  location?: DeliveryLocation;
}

export interface DeliveryHistoryItem {
  id: string;
  status: string;
  notes?: string;
  location?: string;
  created_at: string;
  created_by: string;
}

export class DeliveryApiService {
  private static baseUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delivery-api`;
  
  /**
   * Get all pending deliveries that need to be assigned to riders
   */
  static async getPendingDeliveries() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pending deliveries');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get pending deliveries error:', error);
      throw error;
    }
  }
  
  /**
   * Get deliveries assigned to the current rider
   */
  static async getAssignedDeliveries() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/assigned`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch assigned deliveries');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get assigned deliveries error:', error);
      throw error;
    }
  }
  
  /**
   * Get details for a specific delivery
   */
  static async getDeliveryDetails(deliveryId: string) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/${deliveryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch delivery details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get delivery details error:', error);
      throw error;
    }
  }
  
  /**
   * Assign a delivery to the current rider
   */
  static async assignDelivery(deliveryId: string) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/${deliveryId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign delivery');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Assign delivery error:', error);
      throw error;
    }
  }
  
  /**
   * Update the status of a delivery
   */
  static async updateDeliveryStatus(deliveryId: string, update: DeliveryStatusUpdate) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update delivery status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update delivery status error:', error);
      throw error;
    }
  }
  
  /**
   * Get the status history for a delivery
   */
  static async getDeliveryHistory(deliveryId: string): Promise<DeliveryHistoryItem[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${this.baseUrl}/deliveries/${deliveryId}/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch delivery history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get delivery history error:', error);
      throw error;
    }
  }
  
  /**
   * Register as a rider (for external rider app)
   */
  static async registerRider(vehicleType: string, licensePlate: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase.rpc('register_rider', {
        p_profile_id: user.id,
        p_vehicle_type: vehicleType,
        p_license_plate: licensePlate,
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Register rider error:', error);
      throw error;
    }
  }
}