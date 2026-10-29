import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Register PWA service worker and automatically apply updates in production builds
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
        onRegisteredSW(swUrl, registration) {
          if (!registration) return;

          const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          const LAST_CHECK_KEY = 'fuelshare_sw_last_update_check';

          const checkForUpdates = async (force = false) => {
            if (registration.installing || !navigator.onLine) return;

            const now = Date.now();
            const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
            if (!force && now - lastCheck < ONE_WEEK_MS) return;

            try {
              const resp = await fetch(swUrl, {
                cache: 'no-store',
                headers: {
                  cache: 'no-store',
                  'cache-control': 'no-cache',
                },
              });
              if (resp?.status === 200) {
                localStorage.setItem(LAST_CHECK_KEY, String(now));
                await registration.update();
              }
            } catch {
              // Ignore transient network errors during update check
            }
          };

          // Record initial registration check if not set, or run if a week has passed
          if (!localStorage.getItem(LAST_CHECK_KEY)) {
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
          } else {
            checkForUpdates();
          }

          // Check for updates once a week
          setInterval(() => checkForUpdates(true), ONE_WEEK_MS);

          // When the installed PWA is brought to the foreground, check if 7 days have passed
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkForUpdates();
            }
          });
        },
      });
    })
    .catch(() => {
      // Ignore SW registration errors in non-supported environments
    });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
