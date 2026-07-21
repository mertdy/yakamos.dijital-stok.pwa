import { defineConfig } from 'vitest/config';

/**
 * Firestore security rules run in the Firebase Emulator, not jsdom.
 * Keeping this config separate prevents the emulator-only suite from being
 * included in the ordinary browser-unit-test command.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/core/firebase/firestore.rules.test.ts']
  }
});
