import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

// GET a specific promotion
export async function GET(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const promotionId = params.id;
    
    // Get user from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        plan:promotion_plans(*),
        item:items(id, title, images)
      `)
      .eq('id', promotionId)
      .eq('seller_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Promotion not found or you do not have access' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('promotion_transactions')
      .select('*')
      .eq('promotion_id', promotionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!transactionError) {
      return new Response(JSON.stringify({
        ...data,
        transaction
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get promotion error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get promotion',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT to update a promotion (cancel)
export async function PUT(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const promotionId = params.id;
    const { action } = await request.json();
    
    if (action !== 'cancel') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Get user from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if promotion exists and belongs to user
    const { data: promotion, error: promotionError } = await supabase
      .from('promotions')
      .select('id, seller_id, status')
      .eq('id', promotionId)
      .eq('seller_id', user.id)
      .single();

    if (promotionError) {
      return new Response(JSON.stringify({ error: 'Promotion not found or you do not have access' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (promotion.status !== 'active' && promotion.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Promotion cannot be cancelled' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update promotion status
    const { error } = await supabase
      .from('promotions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', promotionId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update promotion',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}