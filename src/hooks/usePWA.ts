'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isOffline: boolean;
  hasUpdate: boolean;
  isLoading: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  supportsPWA: boolean;
}

interface PWAActions {
  install: () => Promise<boolean>;
  skipUpdate: () => void;
  applyUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  registerSW: () => Promise<void>;
  unregisterSW: () => Promise<boolean>;
  clearCache: () => Promise<void>;
  showInstallBanner: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    isOffline: false,
    hasUpdate: false,
    isLoading: true,
    isStandalone: false,
    installPrompt: null,
    supportsPWA: false
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<ServiceWorkerRegistration | null>(null);

  // Check PWA support and standalone mode
  useEffect(() => {
    const checkPWASupport = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');

      const supportsPWA = 'serviceWorker' in navigator && 'PushManager' in window;

      setState(prev => ({
        ...prev,
        isStandalone,
        supportsPWA,
        isInstalled: isStandalone,
        isLoading: false
      }));
    };

    checkPWASupport();
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        isOffline: !navigator.onLine
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: prompt
      }));
    };

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Service Worker registration
  const registerSW = useCallback(async (): Promise<void> => {
    if (!state.supportsPWA) {
      console.warn('PWA not supported in this browser');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      setRegistration(reg);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(reg);
              setState(prev => ({ ...prev, hasUpdate: true }));
            }
          });
        }
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
          setState(prev => ({ ...prev, hasUpdate: true }));
        }
      });

      console.log('✅ Service Worker registered successfully');
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }, [state.supportsPWA]);

  // Auto-register service worker
  useEffect(() => {
    if (state.supportsPWA && !registration) {
      registerSW();
    }
  }, [state.supportsPWA, registration, registerSW]);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.warn('No install prompt available');
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const choiceResult = await state.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [state.installPrompt]);

  // Apply update
  const applyUpdate = useCallback(async (): Promise<void> => {
    if (!updateAvailable) {
      console.warn('No update available');
      return;
    }

    try {
      // Skip waiting and claim clients
      if (updateAvailable.waiting) {
        updateAvailable.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Reload the page to activate new service worker
      window.location.reload();
    } catch (error) {
      console.error('Failed to apply update:', error);
    }
  }, [updateAvailable]);

  // Skip update
  const skipUpdate = useCallback(() => {
    setState(prev => ({ ...prev, hasUpdate: false }));
    setUpdateAvailable(null);
  }, []);

  // Check for updates manually
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!registration) {
      console.warn('No service worker registration found');
      return;
    }

    try {
      await registration.update();
      console.log('✅ Checked for service worker updates');
    } catch (error) {
      console.error('❌ Update check failed:', error);
    }
  }, [registration]);

  // Unregister service worker
  const unregisterSW = useCallback(async (): Promise<boolean> => {
    if (!registration) {
      return false;
    }

    try {
      const success = await registration.unregister();
      if (success) {
        setRegistration(null);
        console.log('✅ Service Worker unregistered');
      }
      return success;
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
      return false;
    }
  }, [registration]);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<void> => {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
    }
  }, []);

  // Show install banner (for custom install prompts)
  const showInstallBanner = useCallback(() => {
    if (state.isInstallable && state.installPrompt) {
      // Custom install banner logic
      const banner = document.createElement('div');
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="banner-content">
          <h3>Install OmniX</h3>
          <p>Add to your home screen for the best experience</p>
          <button id="install-btn">Install</button>
          <button id="dismiss-btn">Dismiss</button>
        </div>
      `;
      
      document.body.appendChild(banner);

      // Handle install button click
      banner.querySelector('#install-btn')?.addEventListener('click', () => {
        install();
        banner.remove();
      });

      // Handle dismiss button click
      banner.querySelector('#dismiss-btn')?.addEventListener('click', () => {
        banner.remove();
      });

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (banner.parentNode) {
          banner.remove();
        }
      }, 10000);
    }
  }, [state.isInstallable, state.installPrompt, install]);

  return {
    ...state,
    install,
    skipUpdate,
    applyUpdate,
    checkForUpdates,
    registerSW,
    unregisterSW,
    clearCache,
    showInstallBanner
  };
}

// PWA Hook with notifications
export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/aspendos-icon.svg',
        badge: '/aspendos-icon.svg',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }, [permission, requestPermission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification
  };
} 