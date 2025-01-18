const CACHE_NAME = 'vpbank-cache-v2'; // Phiên bản cache (nên cập nhật mỗi khi thay đổi code)
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/gh/cferdinandi/smooth-scroll/dist/smooth-scroll.polyfills.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  // ... các tài nguyên khác (CSS, JS, images) bạn muốn cache
  // Ví dụ:
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/screenshot-mobile-1.webp',
  '/screenshot-desktop-1.webp',
  'https://via.placeholder.com/150x40.webp/09f/fff?text=Mr.Q+Ideas',
  'https://via.placeholder.com/600x400.webp/09f/fff?text=SENID+x+VPBank',
  'https://via.placeholder.com/300x200.webp/09f/fff?text=SENID+x+VPBank',
  'https://via.placeholder.com/900x600.webp/09f/fff?text=SENID+x+VPBank',
  'https://via.placeholder.com/1920x800.webp/09f/fff?text=Mo+The+VPBank+Online'
];

// Cache font files from Google Fonts
const fontCacheName = 'google-fonts-cache';
const fontCacheUrls = [
  'https://fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Caching app shell...');
          return cache.addAll(urlsToCache);
        }),
      caches.open(fontCacheName)
        .then(cache => {
          console.log('Caching Google Fonts...');
          return cache.addAll(fontCacheUrls.map(url => new Request(url, { mode: 'cors', credentials: 'omit' })));
        })
    ]).then(() => {
      console.log('Service Worker installed and caching completed.');
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME && cacheName !== fontCacheName;
        }).map((cacheName) => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            if (event.request.url.startsWith('https://fonts.gstatic.com')) {
              // Cache Google Fonts
              caches.open(fontCacheName)
                .then(cache => {
                  console.log('Caching Google Font:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            } else {
              // Cache other resources
              caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
      })
  );
});

// Network then Cache Strategy for Google Fonts
self.addEventListener('fetch', event => {
  if (fontCacheUrls.some(url => event.request.url.startsWith(url))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(fontCacheName).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
