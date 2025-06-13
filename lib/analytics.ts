
import posthog from 'posthog-react-native';

export const initAnalytics = () => {
  posthog.init('POSTHOG_API_KEY', {
    host: 'https://app.posthog.com',
    captureApplicationLifecycleEvents: true,
    captureInAppPurchases: true,
  });
};

export const trackEvent = (name: string, properties = {}) => {
  posthog.capture(name, properties);
};
