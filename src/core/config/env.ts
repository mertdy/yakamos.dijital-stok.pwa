const envSource = (
  typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
) as Record<string, string>;

export const ENV = {
  // PostHog
  POSTHOG_KEY:
    envSource.VITE_POSTHOG_KEY ||
    'phc_vUmP4ZWBQTEV8VWSKdKDDeCWjGa2DYhrdXnWU78GjdJK',
  POSTHOG_HOST: envSource.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',

  // Firebase
  FIREBASE_API_KEY:
    envSource.VITE_FIREBASE_API_KEY ||
    'AIzaSyASR3_u_z9SLk77L0YDuJAhkDKI-YP1cJo',
  FIREBASE_AUTH_DOMAIN:
    envSource.VITE_FIREBASE_AUTH_DOMAIN || 'dijital-stokk.firebaseapp.com',
  FIREBASE_PROJECT_ID: envSource.VITE_FIREBASE_PROJECT_ID || 'dijital-stokk',
  FIREBASE_STORAGE_BUCKET:
    envSource.VITE_FIREBASE_STORAGE_BUCKET ||
    'dijital-stokk.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID:
    envSource.VITE_FIREBASE_MESSAGING_SENDER_ID || '526702915988',
  FIREBASE_APP_ID:
    envSource.VITE_FIREBASE_APP_ID ||
    '1:526702915988:web:5ba3d31447d83fab8d9f81',
  FIREBASE_MEASUREMENT_ID:
    envSource.VITE_FIREBASE_MEASUREMENT_ID || 'G-3VGSXRNWW1',

  // Test User for E2E
  TEST_USER_EMAIL: envSource.VITE_TEST_USER_EMAIL || 'test@dijitalstok.com',
  TEST_USER_PASSWORD: envSource.VITE_TEST_USER_PASSWORD || 'test1234',
  TEST_USER_2_EMAIL:
    envSource.VITE_TEST_USER_2_EMAIL || 'test2@dijitalstok.com',
  TEST_USER_2_PASSWORD: envSource.VITE_TEST_USER_2_PASSWORD || 'qweQWE123'
};
