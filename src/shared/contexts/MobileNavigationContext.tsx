import { createContext, useContext } from 'react';

interface MobileNavigationContextValue {
  openMobileNavigation: () => void;
}

export const MobileNavigationContext =
  createContext<MobileNavigationContextValue | null>(null);

export const useMobileNavigation = () => {
  const context = useContext(MobileNavigationContext);

  if (!context) {
    throw new Error(
      'useMobileNavigation must be used within MobileNavigationContext'
    );
  }

  return context;
};
