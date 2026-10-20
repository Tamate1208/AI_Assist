import { useState, useEffect, useCallback } from 'react';

/**
 * ⚙️ 和田（Core Logic）実装: 『AI_Assist』向けオフラインファースト永続化フック
 * 電波のない場所やリロード時でもデータを確実に保護する
 */
export function useOfflineStorage<T>(storageKey: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`[OfflineStorage] 読み込みフォールバック (${storageKey}):`, error);
      return initialValue;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

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

  const saveValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(storageKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`[OfflineStorage] 保存エラー (${storageKey}):`, error);
    }
  }, [storageKey, storedValue]);

  return { value: storedValue, saveValue, isOnline };
}
