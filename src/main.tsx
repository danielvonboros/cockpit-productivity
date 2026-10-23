import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import App from './App';
import { ToastProvider } from './components/Toast';
import { getData } from './data/store';
import { applyTheme, resolveTheme } from './themes';
import './themes/themes.css';
import './index.css';

// Apply the saved theme before the first render, so a new tab never flashes the default
applyTheme(resolveTheme(getData().settings.theme, window.matchMedia('(prefers-color-scheme: dark)').matches));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
