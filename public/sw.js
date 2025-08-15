/* Minimal service worker to enable PWA install without altering network behavior */

self.addEventListener('install', (event) => {
  // Activate immediately on install
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim clients so SW controls pages right away
  event.waitUntil(self.clients.claim())
})

// Provide a no-op fetch handler to satisfy PWA install criteria
self.addEventListener('fetch', (event) => {
  // Do not intercept; let the browser handle network as usual
  return
})
