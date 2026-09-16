import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

// Restore the locally selected theme before React paints the app.
const savedTheme = localStorage.getItem('our-travel-planner-theme');
if (savedTheme === 'dark') {
  document.documentElement.dataset.theme = 'dark';
} else {
  document.documentElement.dataset.theme = 'light';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);