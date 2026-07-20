import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'dijital-stok-theme';

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
};

/** Applies the saved theme before React renders to prevent a visible flash. */
export const initializeThemeMode = () => {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
};

export const useThemeMode = () => {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    void getDoc(doc(db, 'userPreferences', user.uid)).then(snapshot => {
      const savedTheme = snapshot.data()?.theme;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        localStorage.setItem(THEME_STORAGE_KEY, savedTheme);
        applyTheme(savedTheme);
        setThemeState(savedTheme);
      }
    });
  }, []);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    setThemeState(nextTheme);
    const user = auth.currentUser;
    if (user) {
      void setDoc(
        doc(db, 'userPreferences', user.uid),
        { theme: nextTheme },
        { merge: true }
      );
    }
  }, []);

  return { theme, setTheme, isDark: theme === 'dark' };
};
