import React, { useEffect, useState } from 'react';
import { WifiOff, Cloud } from 'lucide-react';

export const SyncIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200" title="Veriler çevrimdışı kaydediliyor">
        <WifiOff className="text-sm" />
        <span className="hidden sm:inline">Çevrimdışı Mod</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200" title="Bulut ile senkronize">
      <Cloud className="text-sm" />
      <span className="hidden sm:inline">Buluta Bağlı</span>
    </div>
  );
};
