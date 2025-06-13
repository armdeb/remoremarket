import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '~/contexts/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is admin (in a real app, this would check user role)
    if (!user || !isAdmin(user)) {
      router.replace('/');
    }
  }, [user]);

  // Mock admin check - in production, check user role from database
  const isAdmin = (user: any) => {
    return user?.email?.includes('admin') || user?.id === 'admin-user-id';
  };

  if (!user || !isAdmin(user)) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="items" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="delivery-api" />
    </Stack>
  );
}