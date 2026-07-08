import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASR3_u_z9SLk77L0YDuJAhkDKI-YP1cJo",
  authDomain: "dijital-stokk.firebaseapp.com",
  projectId: "dijital-stokk",
  storageBucket: "dijital-stokk.firebasestorage.app",
  messagingSenderId: "526702915988",
  appId: "1:526702915988:web:5ba3d31447d83fab8d9f81",
  measurementId: "G-3VGSXRNWW1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with Offline Persistence (Multi-tab support)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  ignoreUndefinedProperties: true
});
