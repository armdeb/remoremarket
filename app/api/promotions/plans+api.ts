import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../lib/supabase';

// GET all active promotion plans
export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { data, error } = await supabase
      .from('promotion_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get promotion plans error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get promotion plans',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}