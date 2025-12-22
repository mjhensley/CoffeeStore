/**
 * Grainhouse Coffee - Service Worker
 * Caches assets for offline access and faster repeat visits
 */

const CACHE_NAME = 'grainhouse-v2';
const RUNTIME_CACHE = 'grainhouse-runtime-v2';

// Assets to cache on install (App Shell) - MORE AGGRESSIVE
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/collections.html',
  '/subscribe.html',
  '/gear.html',
  '/cold-brew.html',
  '/our-story.html',
  '/styles.css',
  '/enhanced-ui.css',
  '/instant-load.js',
  '/performance.js',
  '/fingerprint.js',
  '/critical.css',
  '/favicon.svg',
  '/images/coffee.jpg',
];

// Install event - precache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except fonts)
  if (!url.origin.includes(self.location.origin) && 
      !url.origin.includes('fonts.googleapis.com') &&
      !url.origin.includes('fonts.gstatic.com')) {
    return;
  }

  // Skip API/function calls
  if (url.pathname.includes('/.netlify/functions/')) {
    return;
  }

  // Strategy: Cache First for static assets
  if (request.destination === 'image' || 
      request.destination === 'font' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy: Stale While Revalidate for HTML pages (faster perceived load)
  if (request.destination === 'document' || 
      url.pathname.endsWith('.html') ||
      url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache First strategy - great for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline placeholder for images
    if (request.destination === 'image') {
      return caches.match('/images/coffee.jpg');
    }
    throw error;
  }
}

// Network First strategy - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page
    return caches.match('/index.html');
  }
}

// Stale While Revalidate - serve cached, update in background
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(RUNTIME_CACHE).then(cache => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => null);

  return cachedResponse || fetchPromise;
}

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  // Retry failed order submissions
  const cache = await caches.open('failed-orders');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request.clone());
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      console.log('[SW] Failed to sync order, will retry');
    }
  }
}

// Push notifications (optional)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New update from Grainhouse Coffee',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Grainhouse Coffee', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

