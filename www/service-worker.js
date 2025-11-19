const CACHE_NAME = 'portfolio-v1';
const MAX_ITEMS = 100; // Limit by count to approximate 30MB

// Assets to precache
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/p2p-cdn.js',
    '/dht-peer.js'
];

// Install: Precache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Cleanup
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

// Fetch: Cache First Strategy
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // HTML: Network First
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Assets: Cache First
    event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        limitCacheSize(CACHE_NAME, MAX_ITEMS);
        return response;
    } catch (error) {
        return caches.match(request);
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        limitCacheSize(CACHE_NAME, MAX_ITEMS);
        return networkResponse;
    } catch (error) {
        // Optional: Return offline placeholder
        return new Response('Offline', { status: 503 });
    }
}

// LRU Eviction Logic
async function limitCacheSize(name, size) {
    const cache = await caches.open(name);
    const keys = await cache.keys();

    if (keys.length > size) {
        // Delete the oldest (first in array)
        await cache.delete(keys[0]);
        // Recursively check again
        limitCacheSize(name, size);
    }
}
