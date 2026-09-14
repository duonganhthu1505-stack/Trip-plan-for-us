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

// Android WebView can occasionally swallow the final click on the last item in
// the mobile drawer. Capture the Settings pointer event early and forward it to
// the existing desktop Settings button, which already owns the real React
// navigation handler. This keeps one source of truth for navigation state.
if (isCapacitorWebView) {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#mobile-menu-tab-settings')) return;

      const settingsButton = document.getElementById('nav-settings-btn');
      if (settingsButton instanceof HTMLButtonElement) {
        event.preventDefault();
        settingsButton.click();
      }
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
