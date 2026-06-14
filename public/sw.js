// Notre Foyer — Service Worker (vanilla, no Workbox)
// Rôle : permettre l'installation PWA (écran d'accueil iOS/Android).
// Pas de notifications push.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
