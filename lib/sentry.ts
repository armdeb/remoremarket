
import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
  Sentry.init({
    dsn: 'SENTRY_DSN_HERE',
    tracesSampleRate: 1.0,
  });
};
