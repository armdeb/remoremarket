import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { supabase } from '../../../../lib/supabase';

// GET review statistics for a user
export async function GET(request: ExpoRequest, { params }: { params: { userId: string } }): Promise<ExpoResponse> {
  try {
    const userId = params.userId;
    
    // Get user profile with rating info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('average_rating, review_count')
      .eq('id', userId)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get rating distribution
    const { data: ratingDistribution, error: distributionError } = await supabase.rpc(
      'get_rating_distribution',
      { user_uuid: userId }
    );

    if (distributionError) throw distributionError;

    // Format distribution as an object
    const distribution: { [key: number]: number } = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    if (ratingDistribution) {
      ratingDistribution.forEach((item: any) => {
        distribution[item.rating] = parseInt(item.count);
      });
    }

    // Get category ratings (item_accuracy, communication, shipping_speed)
    const { data: categoryRatings, error: categoryError } = await supabase.rpc(
      'get_category_ratings',
      { user_uuid: userId }
    );

    if (categoryError) throw categoryError;

    return new Response(JSON.stringify({
      average_rating: profile.average_rating,
      review_count: profile.review_count,
      rating_distribution: distribution,
      category_ratings: categoryRatings || {
        item_accuracy: null,
        communication: null,
        shipping_speed: null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get user review stats error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get user review stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}