import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export interface SignUpData {
  email: string;
  password: string;
  nickname: string;
  phone: string;
  profilePicture?: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  // Check if nickname is unique in real-time
  static async checkNicknameAvailability(nickname: string): Promise<boolean> {
    if (!nickname || nickname.length < 3) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned, nickname is available
        return true;
      }
      
      return false; // Nickname exists
    } catch (error) {
      console.error('Error checking nickname:', error);
      return false;
    }
  }

  // Sign up with email and password
  static async signUpWithEmail(userData: SignUpData) {
    try {
      // First check if nickname is available
      const isNicknameAvailable = await this.checkNicknameAvailability(userData.nickname);
      if (!isNicknameAvailable) {
        throw new Error('Nickname is already taken');
      }

      // Check if phone number is already used
      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('phone')
        .eq('phone', userData.phone)
        .single();

      if (existingPhone) {
        throw new Error('Phone number is already registered');
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            nickname: userData.nickname,
            phone: userData.phone,
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: userData.email,
            nickname: userData.nickname.toLowerCase(),
            phone: userData.phone,
            profile_picture: userData.profilePicture,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone_verified: false,
            email_verified: false,
            created_at: new Date().toISOString(),
          });

        if (profileError) throw profileError;

        // Send SMS verification
        await this.sendPhoneVerification(userData.phone);
      }

      return authData;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  static async signInWithEmail(loginData: LoginData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }



  // Apple Sign In (iOS only)
  static async signInWithApple() {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;

        // Create profile if needed
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            const nickname = await this.generateUniqueNickname(credential.email || '');
            
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: credential.email,
                nickname: nickname,
                first_name: credential.fullName?.givenName,
                last_name: credential.fullName?.familyName,
                email_verified: true,
                phone_verified: false,
                created_at: new Date().toISOString(),
              });
          }
        }

        return data;
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error) {
      console.error('Apple sign in error:', error);
      throw error;
    }
  }

  // Generate unique nickname from email
  static async generateUniqueNickname(email: string): Promise<string> {
    const baseNickname = email.split('@')[0].toLowerCase();
    let nickname = baseNickname;
    let counter = 1;

    while (!(await this.checkNicknameAvailability(nickname))) {
      nickname = `${baseNickname}${counter}`;
      counter++;
    }

    return nickname;
  }

  // Send phone verification SMS
  static async sendPhoneVerification(phoneNumber: string): Promise<string> {
    try {
      const response = await fetch('/api/auth/send-sms-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification SMS');
      }

      return data.verificationCode;
    } catch (error) {
      console.error('SMS verification error:', error);
      throw error;
    }
  }

  // Verify phone number with SMS code
  static async verifyPhoneNumber(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, code }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify phone number');
      }

      // Update profile to mark phone as verified
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ phone_verified: true })
          .eq('id', user.id);
      }

      return data.verified;
    } catch (error) {
      console.error('Phone verification error:', error);
      throw error;
    }
  }

  // Sign out
  static async signOut() {
    try {
      // Sign out from Google if signed in
      

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user profile
  static async getCurrentUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }
}