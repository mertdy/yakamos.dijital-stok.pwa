export const ENV = {
  // PostHog
  POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY || 'phc_PLACEHOLDER_TOKEN',
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',

  // Firebase
  FIREBASE_API_KEY:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyASR3_u_z9SLk77L0YDuJAhkDKI-YP1cJo',
  FIREBASE_AUTH_DOMAIN:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'dijital-stokk.firebaseapp.com',
  FIREBASE_PROJECT_ID:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dijital-stokk',
  FIREBASE_STORAGE_BUCKET:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'dijital-stokk.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '526702915988',
  FIREBASE_APP_ID:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:526702915988:web:5ba3d31447d83fab8d9f81',
  FIREBASE_MEASUREMENT_ID:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-3VGSXRNWW1',

  // Test User for E2E
  TEST_USER_EMAIL:
    import.meta.env.VITE_TEST_USER_EMAIL || 'test@dijitalstok.com',
  TEST_USER_PASSWORD: import.meta.env.VITE_TEST_USER_PASSWORD || 'test1234'
};
