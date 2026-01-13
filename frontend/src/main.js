import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import 'bootstrap';
import './styles/main.scss';

const app = createApp(App);
app.use(router);
app.mount('#app');

// Service worker registreren voor offline fallback op de tablet
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registratie mislukt:', err);
    });
  });
}
