import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { MessagingService } from '../../lib/messaging';

export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (conversationId) {
      // Get messages for specific conversation
      const messages = await MessagingService.getMessages(conversationId, limit, offset);
      return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Get all conversations
      const conversations = await MessagingService.getConversations();
      return new Response(JSON.stringify({ conversations }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Messages API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body = await request.json();
    const { conversation_id, content, message_type, offer_amount } = body;

    if (!conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID and content are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const message = await MessagingService.sendMessage({
      conversation_id,
      content,
      message_type: message_type || 'text',
      offer_amount,
    });

    return new Response(JSON.stringify({ message }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send message API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function PUT(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body = await request.json();
    const { conversation_id, action } = body;

    if (!conversation_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID and action are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'mark_read') {
      await MessagingService.markMessagesAsRead(conversation_id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Update message API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}