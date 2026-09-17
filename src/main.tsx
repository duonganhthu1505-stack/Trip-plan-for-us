import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

const THEME_KEY = 'our-travel-planner-theme';
const savedTheme = localStorage.getItem(THEME_KEY);
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

// Small global theme control. It is intentionally independent from trip data
// and Firebase so the preference stays local to each device/browser.
const themeButton = document.createElement('button');
themeButton.type = 'button';
themeButton.className = 'global-theme-toggle';
themeButton.setAttribute('aria-label', 'Bật/tắt chế độ tối');
themeButton.title = 'Sáng / Tối';

const refreshThemeButton = () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeButton.textContent = isDark ? '☀️' : '🌙';
  themeButton.setAttribute('aria-pressed', String(isDark));
};

refreshThemeButton();
themeButton.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  refreshThemeButton();
});
document.body.appendChild(themeButton);