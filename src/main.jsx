import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/club-theme.css';
import './index.css';
import App from './App.jsx';
import { AppProviders } from './providers/AppProviders.jsx';
import faviconPng from './assets/favicon.ico/android-icon-36x36.png';

const link = document.querySelector("link[rel='icon']") || document.createElement('link');
link.setAttribute('rel', 'icon');
link.setAttribute('type', 'image/png');
link.setAttribute('href', faviconPng);
if (!link.parentNode) document.head.appendChild(link);

const shortcut =
  document.querySelector("link[rel='shortcut icon']") || document.createElement('link');
shortcut.setAttribute('rel', 'shortcut icon');
shortcut.setAttribute('type', 'image/png');
shortcut.setAttribute('href', faviconPng);
if (!shortcut.parentNode) document.head.appendChild(shortcut);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
