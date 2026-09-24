import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Capture Chrome's install event at module-load time instead of waiting for a
// component useEffect. This prevents a fast beforeinstallprompt event from
// being missed while React is mounting.
let capturedInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>();

function publishInstallPrompt(event: BeforeInstallPromptEvent | null) {
  capturedInstallPrompt = event;
  installPromptSubscribers.forEach((subscriber) => subscriber(event));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    publishInstallPrompt(event as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    publishInstallPrompt(null);
  });
}

function isNativeAppRuntime() {
  const capacitor = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;

  return (
    capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && /android/i.test(window.navigator.userAgent))
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedInstallPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const isStandalone =
      isNativeAppRuntime() ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Sync with an event that may already have fired before this component mounted.
    setDeferredPrompt(capturedInstallPrompt);
    const subscriber = (event: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(event);
      if (!event && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches
      )) {
        setIsInstalled(true);
      }
    };
    installPromptSubscribers.add(subscriber);

    const handleAppInstalled = () => setIsInstalled(true);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      installPromptSubscribers.delete(subscriber);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt ?? capturedInstallPrompt;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    // A deferred prompt can only be used once, regardless of the user's choice.
    publishInstallPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen request denied or not supported:', e);
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isFullscreen,
    toggleFullscreen,
    install,
  };
}
