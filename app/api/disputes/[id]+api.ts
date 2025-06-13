import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

// GET a specific dispute
export async function GET(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const disputeId = params.id;
    
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
    
    // Get dispute with related data
    const { data, error } = await supabase
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
        ),
        evidence:dispute_evidence(*)
      `)
      .eq('id', disputeId)
      .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Dispute not found or you do not have access' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Get messages separately
    const { data: messages, error: messagesError } = await supabase
      .from('dispute_messages')
      .select(`
        *,
        sender:profiles(id, nickname, profile_picture)
      `)
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Mark unread messages as read
    await supabase
      .from('dispute_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('dispute_id', disputeId)
      .neq('sender_id', user.id)
      .is('read_at', null);

    // Get status history
    const { data: statusHistory, error: historyError } = await supabase
      .from('dispute_status_history')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    return new Response(JSON.stringify({
      ...data,
      messages: messages || [],
      status_history: statusHistory || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get dispute error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get dispute',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST to add evidence or send a message
export async function POST(request: ExpoRequest, { params }: { params: { id: string } }): Promise<ExpoResponse> {
  try {
    const disputeId = params.id;
    const body = await request.json();
    const { type, content, evidence_type } = body;
    
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

    // Check if dispute exists and user is involved
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('id, reporter_id, reported_id, status')
      .eq('id', disputeId)
      .or(`reporter_id.eq.${user.id},reported_id.eq.${user.id}`)
      .single();

    if (disputeError) {
      return new Response(JSON.stringify({ error: 'Dispute not found or you do not have access' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (dispute.status === 'closed') {
      return new Response(JSON.stringify({ error: 'Dispute is closed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different types of POST requests
    if (type === 'evidence') {
      if (!evidence_type || !content) {
        return new Response(JSON.stringify({ error: 'Evidence type and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add evidence
      const { data: newEvidence, error } = await supabase
        .from('dispute_evidence')
        .insert({
          dispute_id: disputeId,
          user_id: user.id,
          evidence_type,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Add system message about new evidence
      await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          content: `New ${evidence_type} evidence added`,
          is_admin_message: true,
        });

      return new Response(JSON.stringify(newEvidence), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (type === 'message') {
      if (!content) {
        return new Response(JSON.stringify({ error: 'Message content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Send message
      const { data: newMessage, error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          content,
          is_admin_message: false,
        })
        .select(`
          *,
          sender:profiles(id, nickname, profile_picture)
        `)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(newMessage), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid request type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Dispute action error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}