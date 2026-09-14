import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

// Keep the installed web PWA in sync with the latest deploy.
// Capacitor serves the bundled app from https://localhost; service workers
// are not needed there and can fail inside Android WebView, causing a black screen.
const isCapacitorWebView = window.location.hostname === 'localhost';

// Android WebView can occasionally swallow the final tap on the Settings item
// in the mobile drawer. Capture that pointer event early, then trigger the same
// mobile button's React click handler on the next task. This ensures we use the
// exact navigation path that also closes the drawer.
if (isCapacitorWebView) {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const settingsButton = target.closest('#mobile-menu-tab-settings');
      if (!(settingsButton instanceof HTMLButtonElement)) return;

      event.preventDefault();
      window.setTimeout(() => {
        settingsButton.click();
      }, 0);
    },
    true,
  );
}

if (!isCapacitorWebView) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Check once right away, then keep checking while the web PWA stays open.
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
    </LanguageProvider>
  </StrictMode>,
);
