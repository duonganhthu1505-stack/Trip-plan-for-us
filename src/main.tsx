import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { NativeUpdateBanner } from './components/NativeUpdateBanner';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

// Keep the installed web PWA in sync with the latest deploy.
// Capacitor serves the bundled app from https://localhost; service workers
// are not needed there and can fail inside Android WebView, causing a black screen.
const isCapacitorWebView = window.location.hostname === 'localhost';

if (!isCapacitorWebView) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      void registration.update().catch((error) => {
        console.warn('PWA service worker update failed:', error);
      });

      window.setInterval(() => {
        void registration.update().catch((error) => {
          console.warn('PWA service worker update failed:', error);
        });
      }, 60_000);
    },
    onRegisterError(error) {
      console.warn('PWA service worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
      <NativeUpdateBanner />
    </LanguageProvider>
  </StrictMode>,
);
