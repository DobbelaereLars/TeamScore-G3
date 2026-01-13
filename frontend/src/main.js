import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import 'bootstrap';
import './styles/main.scss';

const app = createApp(App);
app.use(router);
app.mount('#app');

// Backend health-check voor de tablet-routes
const HEALTH_URL = '/health';
const CHECK_INTERVAL_MS = 5000;

async function checkBackendAndMaybeRedirect() {
  try {
    // Als de iPad zelf geen netwerk heeft, doen we hier niets;
    // de service worker/offline pagina vangt dat op bij navigatie.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);

    const res = await fetch(HEALTH_URL, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const currentPath = router.currentRoute.value.fullPath;
      if (currentPath.startsWith('/tablet')) {
        window.location.href = '/offline.html';
      }
    }
  } catch (err) {
    const currentPath = router.currentRoute.value.fullPath;
    if (currentPath.startsWith('/tablet')) {
      window.location.href = '/offline.html';
    }
  }
}

// Eerste check kort na load en daarna periodiek voor "realtime" gedrag op de iPad
setTimeout(checkBackendAndMaybeRedirect, 1000);
setInterval(checkBackendAndMaybeRedirect, CHECK_INTERVAL_MS);

// Service worker registreren voor offline fallback op de tablet
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registratie mislukt:', err);
    });
  });
}
