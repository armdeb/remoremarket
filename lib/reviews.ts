import { supabase } from './supabase';

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  content?: string;
  item_accuracy?: number;
  communication?: number;
  shipping_speed?: number;
  helpful_count: number;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  reviewer?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
  reviewee?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
  order?: {
    id: string;
    item: {
      id: string;
      title: string;
      images: string[];
    };
  };
  responses?: ReviewResponse[];
  is_helpful?: boolean; // Whether the current user has marked this review as helpful
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  responder?: {
    id: string;
    nickname: string;
    profile_picture?: string;
  };
}

export interface CreateReviewData {
  order_id: string;
  reviewee_id: string;
  rating: number;
  content?: string;
  item_accuracy?: number;
  communication?: number;
  shipping_speed?: number;
}

export interface CreateResponseData {
  review_id: string;
  content: string;
}

export class ReviewsService {
  // Get reviews for a user
  static async getUserReviews(userId: string, limit: number = 20, offset: number = 0): Promise<Review[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, nickname, profile_picture),
          order:orders(id, item:items(id, title, images)),
          responses:review_responses(
            id, 
            review_id, 
            responder_id, 
            content, 
            created_at, 
            updated_at,
            responder:profiles!review_responses_responder_id_fkey(id, nickname, profile_picture)
          )
        `)
        .eq('reviewee_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Check if the current user has marked each review as helpful
      const reviewsWithHelpful = await Promise.all(
        (data || []).map(async (review) => {
          const { data: helpfulVote } = await supabase
            .from('review_helpful_votes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...review,
            is_helpful: !!helpfulVote,
          };
        })
      );

      return reviewsWithHelpful;
    } catch (error) {
      console.error('Get user reviews error:', error);
      throw error;
    }
  }

  // Get reviews written by a user
  static async getReviewsByUser(userId: string, limit: number = 20, offset: number = 0): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewee:profiles!reviews_reviewee_id_fkey(id, nickname, profile_picture),
          order:orders(id, item:items(id, title, images))
        `)
        .eq('reviewer_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get reviews by user error:', error);
      throw error;
    }
  }

  // Get a single review by ID
  static async getReviewById(reviewId: string): Promise<Review> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, nickname, profile_picture),
          reviewee:profiles!reviews_reviewee_id_fkey(id, nickname, profile_picture),
          order:orders(id, item:items(id, title, images)),
          responses:review_responses(
            id, 
            review_id, 
            responder_id, 
            content, 
            created_at, 
            updated_at,
            responder:profiles!review_responses_responder_id_fkey(id, nickname, profile_picture)
          )
        `)
        .eq('id', reviewId)
        .single();

      if (error) throw error;

      // Check if the current user has marked this review as helpful
      const { data: helpfulVote } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        ...data,
        is_helpful: !!helpfulVote,
      };
    } catch (error) {
      console.error('Get review by ID error:', error);
      throw error;
    }
  }

  // Create a new review
  static async createReview(reviewData: CreateReviewData): Promise<Review> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the order exists and is completed
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id, seller_id')
        .eq('id', reviewData.order_id)
        .single();

      if (orderError) throw new Error('Order not found');
      if (order.status !== 'completed') throw new Error('Order must be completed before leaving a review');

      // Determine if the user is the buyer or seller
      const isBuyer = order.buyer_id === user.id;
      const isSeller = order.seller_id === user.id;

      if (!isBuyer && !isSeller) throw new Error('You can only review orders you participated in');

      // Check if a review already exists for this order by this user
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', reviewData.order_id)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (existingReview) throw new Error('You have already reviewed this order');

      // Create the review
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          order_id: reviewData.order_id,
          reviewer_id: user.id,
          reviewee_id: reviewData.reviewee_id,
          rating: reviewData.rating,
          content: reviewData.content,
          item_accuracy: reviewData.item_accuracy,
          communication: reviewData.communication,
          shipping_speed: reviewData.shipping_speed,
          is_verified_purchase: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }

  // Update an existing review
  static async updateReview(reviewId: string, updates: Partial<CreateReviewData>): Promise<Review> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the review exists and belongs to the user
      const { data: existingReview, error: reviewError } = await supabase
        .from('reviews')
        .select('id, reviewer_id')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw new Error('Review not found');
      if (existingReview.reviewer_id !== user.id) throw new Error('You can only update your own reviews');

      // Update the review
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating: updates.rating,
          content: updates.content,
          item_accuracy: updates.item_accuracy,
          communication: updates.communication,
          shipping_speed: updates.shipping_speed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update review error:', error);
      throw error;
    }
  }

  // Delete a review
  static async deleteReview(reviewId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the review exists and belongs to the user
      const { data: existingReview, error: reviewError } = await supabase
        .from('reviews')
        .select('id, reviewer_id')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw new Error('Review not found');
      if (existingReview.reviewer_id !== user.id) throw new Error('You can only delete your own reviews');

      // Delete the review
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }

  // Create a response to a review
  static async createResponse(responseData: CreateResponseData): Promise<ReviewResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the review exists and is about the user
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('id, reviewee_id')
        .eq('id', responseData.review_id)
        .single();

      if (reviewError) throw new Error('Review not found');
      if (review.reviewee_id !== user.id) throw new Error('You can only respond to reviews about you');

      // Check if a response already exists
      const { data: existingResponse } = await supabase
        .from('review_responses')
        .select('id')
        .eq('review_id', responseData.review_id)
        .eq('responder_id', user.id)
        .maybeSingle();

      if (existingResponse) throw new Error('You have already responded to this review');

      // Create the response
      const { data, error } = await supabase
        .from('review_responses')
        .insert({
          review_id: responseData.review_id,
          responder_id: user.id,
          content: responseData.content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create response error:', error);
      throw error;
    }
  }

  // Update a response
  static async updateResponse(responseId: string, content: string): Promise<ReviewResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the response exists and belongs to the user
      const { data: existingResponse, error: responseError } = await supabase
        .from('review_responses')
        .select('id, responder_id')
        .eq('id', responseId)
        .single();

      if (responseError) throw new Error('Response not found');
      if (existingResponse.responder_id !== user.id) throw new Error('You can only update your own responses');

      // Update the response
      const { data, error } = await supabase
        .from('review_responses')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', responseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update response error:', error);
      throw error;
    }
  }

  // Delete a response
  static async deleteResponse(responseId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the response exists and belongs to the user
      const { data: existingResponse, error: responseError } = await supabase
        .from('review_responses')
        .select('id, responder_id')
        .eq('id', responseId)
        .single();

      if (responseError) throw new Error('Response not found');
      if (existingResponse.responder_id !== user.id) throw new Error('You can only delete your own responses');

      // Delete the response
      const { error } = await supabase
        .from('review_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete response error:', error);
      throw error;
    }
  }

  // Mark a review as helpful
  static async markReviewAsHelpful(reviewId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the review exists
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw new Error('Review not found');

      // Check if the user has already marked this review as helpful
      const { data: existingVote } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) throw new Error('You have already marked this review as helpful');

      // Mark the review as helpful
      const { error } = await supabase
        .from('review_helpful_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Mark review as helpful error:', error);
      throw error;
    }
  }

  // Remove helpful mark from a review
  static async removeHelpfulMark(reviewId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Remove the helpful mark
      const { error } = await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Remove helpful mark error:', error);
      throw error;
    }
  }

  // Check if a user can review an order
  static async canReviewOrder(orderId: string): Promise<{ canReview: boolean; revieweeId?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if the order exists and is completed
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_id, seller_id')
        .eq('id', orderId)
        .single();

      if (orderError) throw new Error('Order not found');
      if (order.status !== 'completed') return { canReview: false };

      // Determine if the user is the buyer or seller
      const isBuyer = order.buyer_id === user.id;
      const isSeller = order.seller_id === user.id;

      if (!isBuyer && !isSeller) return { canReview: false };

      // Check if a review already exists for this order by this user
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (existingReview) return { canReview: false };

      // Determine who can be reviewed
      const revieweeId = isBuyer ? order.seller_id : order.buyer_id;

      return { canReview: true, revieweeId };
    } catch (error) {
      console.error('Can review order error:', error);
      throw error;
    }
  }

  // Get review statistics for a user
  static async getUserReviewStats(userId: string): Promise<{
    average_rating: number | null;
    review_count: number;
    rating_distribution: { [key: number]: number };
  }> {
    try {
      // Get user profile with rating info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('average_rating, review_count')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get rating distribution
      const { data: ratingDistribution, error: distributionError } = await supabase
        .from('reviews')
        .select('rating, count')
        .eq('reviewee_id', userId)
        .eq('is_hidden', false)
        .group('rating');

      if (distributionError) throw distributionError;

      // Format distribution as an object
      const distribution: { [key: number]: number } = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };

      ratingDistribution.forEach(item => {
        distribution[item.rating] = parseInt(item.count);
      });

      return {
        average_rating: profile.average_rating,
        review_count: profile.review_count,
        rating_distribution: distribution
      };
    } catch (error) {
      console.error('Get user review stats error:', error);
      throw error;
    }
  }
}