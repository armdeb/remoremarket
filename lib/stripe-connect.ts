import { supabase } from './supabase';

export interface StripeAccount {
  connected: boolean;
  account_id: string | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  business_profile?: {
    name?: string;
    url?: string;
  };
  country?: string;
}

export class StripeConnectService {
  private static baseUrl = process.env.EXPO_PUBLIC_API_URL;

  // Create Stripe Connect account
  static async createAccount(country: string = 'US'): Promise<StripeAccount> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/connect/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ country }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Stripe account');
      }

      return await response.json();
    } catch (error) {
      console.error('Create Stripe account error:', error);
      throw error;
    }
  }

  // Get onboarding link
  static async getOnboardingLink(returnUrl?: string, refreshUrl?: string): Promise<{ url: string; expires_at: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/connect/onboarding-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          return_url: returnUrl,
          refresh_url: refreshUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create onboarding link');
      }

      return await response.json();
    } catch (error) {
      console.error('Get onboarding link error:', error);
      throw error;
    }
  }

  // Get account status
  static async getAccountStatus(): Promise<StripeAccount> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/connect/account-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get account status');
      }

      return await response.json();
    } catch (error) {
      console.error('Get account status error:', error);
      throw error;
    }
  }

  // Get dashboard link
  static async getDashboardLink(): Promise<{ url: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/payments/connect/dashboard-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dashboard link');
      }

      return await response.json();
    } catch (error) {
      console.error('Get dashboard link error:', error);
      throw error;
    }
  }
}