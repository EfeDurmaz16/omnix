const CACHE_NAME = 'omnix-v1.2.0';
const RUNTIME_CACHE = 'omnix-runtime';
const API_CACHE = 'omnix-api';
const MODELS_CACHE = 'omnix-models';

// Files to cache for offline functionality
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/agents',
  '/models',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/models',
  '/api/conversations',
  '/api/usage'
];

// Install event - precache essential files
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE && 
                     cacheName !== API_CACHE &&
                     cacheName !== MODELS_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests with appropriate strategies
  if (request.method === 'GET') {
    // API requests - Network First with cache fallback
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    }
    // Static assets - Cache First
    else if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(handleStaticAssets(request));
    }
    // App shell - Cache First with network fallback
    else if (isAppShell(url.pathname)) {
      event.respondWith(handleAppShell(request));
    }
    // Default - Network First
    else {
      event.respondWith(handleDefault(request));
    }
  }
  // POST requests - Chat and other mutations
  else if (request.method === 'POST') {
    event.respondWith(handlePostRequest(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for specific endpoints
    if (networkResponse.ok && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator to cached responses
      const response = cachedResponse.clone();
      response.headers.set('X-Cache-Status', 'offline');
      return response;
    }
    
    // Return offline page for critical failures
    if (url.pathname.startsWith('/api/chat')) {
      return new Response(JSON.stringify({
        error: 'Offline - Please check your connection',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets with cache first strategy
async function handleStaticAssets(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle app shell requests
async function handleAppShell(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version and update in background
    updateInBackground(request);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to offline page
    return caches.match('/offline');
  }
}

// Handle default requests
async function handleDefault(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful navigation requests
    if (networkResponse.ok && request.mode === 'navigate') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Handle POST requests with offline queue
async function handlePostRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Queue for retry when online
    if (request.url.includes('/api/chat')) {
      await queueOfflineRequest(request);
      return new Response(JSON.stringify({
        id: 'offline_' + Date.now(),
        content: 'Your message has been queued and will be sent when you\'re back online.',
        offline: true,
        queued: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Background update function
async function updateInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('[SW] Background update failed:', error);
  }
}

// Check if URL is part of app shell
function isAppShell(pathname) {
  const appShellPaths = ['/', '/dashboard', '/agents', '/models', '/chat'];
  return appShellPaths.includes(pathname) || pathname.startsWith('/api/');
}

// Queue offline requests
async function queueOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  // Store in IndexedDB for persistence
  const db = await openOfflineDB();
  const tx = db.transaction(['requests'], 'readwrite');
  const store = tx.objectStore('requests');
  await store.add(requestData);
}

// IndexedDB setup for offline queue
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('omnix-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processOfflineQueue());
  }
});

// Process offline queue when back online
async function processOfflineQueue() {
  const db = await openOfflineDB();
  const tx = db.transaction(['requests'], 'readwrite');
  const store = tx.objectStore('requests');
  const requests = await store.getAll();
  
  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (response.ok) {
        await store.delete(requestData.id);
        console.log('[SW] Offline request processed:', requestData.url);
      }
    } catch (error) {
      console.log('[SW] Failed to process offline request:', error);
    }
  }
}

// Handle push notifications for agent updates
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/aspendos-icon.svg',
    badge: '/aspendos-icon.svg',
    data: data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    renotify: true,
    tag: data.tag || 'omnix-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'OmniX', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Message handling for client communication
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker loaded successfully'); 