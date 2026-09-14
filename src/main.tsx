import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

// Keep the installed PWA in sync with the latest Netlify deploy.
// - Register immediately when the app starts.
// - Ask the browser to check for a newer service worker every minute.
// - With registerType: 'autoUpdate' in vite.config.ts, a new version is
//   activated automatically and the app reloads onto the latest build.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    // Check once right away, then keep checking while the app stays open.
    void registration.update();

    window.setInterval(() => {
      void registration.update();
    }, 60_000);
  },
  onRegisterError(error) {
    console.warn('PWA service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
