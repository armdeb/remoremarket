export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          nickname: string;
          phone?: string;
          profile_picture?: string;
          first_name?: string;
          last_name?: string;
          phone_verified: boolean;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nickname: string;
          phone?: string;
          profile_picture?: string;
          first_name?: string;
          last_name?: string;
          phone_verified?: boolean;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nickname?: string;
          phone?: string;
          profile_picture?: string;
          first_name?: string;
          last_name?: string;
          phone_verified?: boolean;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
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
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          price: number;
          images: string[];
          brand: string;
          size: string;
          condition: string;
          category: string;
          seller_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          images?: string[];
          brand?: string;
          size?: string;
          condition?: string;
          category?: string;
          seller_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          item_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          buyer_id?: string;
          seller_id?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'image' | 'offer' | 'system';
          offer_amount?: number;
          read_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'image' | 'offer' | 'system';
          offer_amount?: number;
          read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'text' | 'image' | 'offer' | 'system';
          offer_amount?: number;
          read_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          item_id: string;
          buyer_id: string;
          seller_id: string;
          total_amount: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          buyer_id: string;
          seller_id: string;
          total_amount: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          buyer_id?: string;
          seller_id?: string;
          total_amount?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_schedules: {
        Row: {
          id: string;
          order_id: string;
          pickup_time_slot?: string;
          delivery_time_slot?: string;
          pickup_address?: string;
          delivery_address?: string;
          pickup_instructions?: string;
          delivery_instructions?: string;
          pickup_scheduled_at?: string;
          delivery_scheduled_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          pickup_time_slot?: string;
          delivery_time_slot?: string;
          pickup_address?: string;
          delivery_address?: string;
          pickup_instructions?: string;
          delivery_instructions?: string;
          pickup_scheduled_at?: string;
          delivery_scheduled_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          pickup_time_slot?: string;
          delivery_time_slot?: string;
          pickup_address?: string;
          delivery_address?: string;
          pickup_instructions?: string;
          delivery_instructions?: string;
          pickup_scheduled_at?: string;
          delivery_scheduled_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_qr_codes: {
        Row: {
          id: string;
          order_id: string;
          type: 'pickup' | 'delivery';
          qr_code: string;
          verification_code: string;
          user_id: string;
          scanned_at?: string;
          scanned_by?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          type: 'pickup' | 'delivery';
          qr_code: string;
          verification_code: string;
          user_id: string;
          scanned_at?: string;
          scanned_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          type?: 'pickup' | 'delivery';
          qr_code?: string;
          verification_code?: string;
          user_id?: string;
          scanned_at?: string;
          scanned_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_unread_message_count: {
        Args: {
          user_uuid: string;
        };
        Returns: number;
      };
    };
    Enums: {
      message_type: 'text' | 'image' | 'offer' | 'system';
    };
  };
}