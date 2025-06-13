import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '~/lib/supabase';
import { AuthService, SignUpData, LoginData } from '~/lib/auth';
import { Session, User } from '@supabase/supabase-js';

interface UserProfile {
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
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  signUp: (userData: SignUpData) => Promise<void>;
  signIn: (loginData: LoginData) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setInitializing(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setInitializing(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      const profile = await AuthService.getCurrentUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Load user profile error:', error);
    } finally {
      setInitializing(false);
    }
  };

  const signUp = async (userData: SignUpData) => {
    try {
      setLoading(true);
      await AuthService.signUpWithEmail(userData);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (loginData: LoginData) => {
    try {
      setLoading(true);
      const { user: authUser } = await AuthService.signInWithEmail(loginData);
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await AuthService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signUp, 
      signIn, 
      signOut, 
      loading,
      initializing
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}