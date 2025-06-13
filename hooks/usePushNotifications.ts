import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { supabase } from '../supabase/client';
import { Alert, Platform } from 'react-native';

export default function usePushNotifications(userId?: string) {
  useEffect(() => {
    const register = async () => {
      if (!Device.isDevice || !userId) return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission required', 'Enable push notifications to get alerts.');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      await supabase
        .from('users')
        .update({ expo_push_token: token })
        .eq('id', userId);
    };

    register();
  }, [userId]);
}