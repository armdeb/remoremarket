import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '~/contexts/AuthContext';
import { LoadingSpinner } from '~/components/LoadingSpinner';

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}