import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../lib/supabase';

// GET disputes for the current user
export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
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

    // Get URL parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const orderId = url.searchParams.get('orderId');

    // Build query
    let query = supabase
      .from('disputes')
      .select(`
        *,
        order:orders(
          id, 
          total_amount, 
          status,
          item:items(id, title, images),
          buyer:profiles!orders_buyer_id_fkey(id, nickname, profile_picture),
          seller:profiles!orders_seller_id_fkey(id, nickname, profile_picture)
        )
      `)
      .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get unread message counts for each dispute
    const disputesWithUnread = await Promise.all(
      (data || []).map(async (dispute) => {
        const { count } = await supabase
          .from('dispute_messages')
          .select('*', { count: 'exact', head: true })
          .eq('dispute_id', dispute.id)
          .neq('sender_id', user.id)
          .is('read_at', null);

        return {
          ...dispute,
          unread_count: count || 0,
        };
      })
    );

    return new Response(JSON.stringify(disputesWithUnread), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get disputes',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST to create a new dispute
export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { order_id, type, description, evidence } = await request.json();
    
    // Validate required fields
    if (!order_id || !type || !description) {
      return new Response(JSON.stringify({ error: 'order_id, type, and description are required' }), {
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

    // Check if the order exists and user is involved
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', order_id)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .single();

    if (orderError) {
      return new Response(JSON.stringify({ error: 'Order not found or you are not involved in this order' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if dispute already exists for this order
    const { count, error: disputeCountError } = await supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', order_id);

    if (disputeCountError) throw disputeCountError;

    if (count && count > 0) {
      return new Response(JSON.stringify({ error: 'A dispute already exists for this order' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine who is being reported (if buyer reports, it's the seller, and vice versa)
    const reporterId = user.id;
    const reportedId = reporterId === order.buyer_id ? order.seller_id : order.buyer_id;

    // Create the dispute
    const { data: dispute, error } = await supabase
      .from('disputes')
      .insert({
        order_id,
        reporter_id: reporterId,
        reported_id: reportedId,
        type,
        description,
        status: 'open',
        priority: 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    // Add evidence if provided
    if (evidence && Array.isArray(evidence) && evidence.length > 0) {
      const evidenceData = evidence.map(item => ({
        dispute_id: dispute.id,
        user_id: reporterId,
        evidence_type: item.evidence_type,
        content: item.content,
      }));

      const { error: evidenceError } = await supabase
        .from('dispute_evidence')
        .insert(evidenceData);

      if (evidenceError) throw evidenceError;
    }

    // Add initial system message
    await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: dispute.id,
        sender_id: reporterId,
        content: `Dispute opened: ${type.replace(/_/g, ' ')}`,
        is_admin_message: true,
      });

    // Update order status to 'disputed'
    await supabase
      .from('orders')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    return new Response(JSON.stringify(dispute), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create dispute',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}