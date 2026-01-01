// Service Worker DISABLED to prevent caching issues
// This service worker is currently disabled to ensure real-time updates

console.log('Service Worker: Caching disabled for development');

// Immediately unregister and clear all caches
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event - clearing all caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Deleting cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event - taking control');
  event.waitUntil(self.clients.claim());
});

// Pass through all requests without caching
self.addEventListener('fetch', (event) => {
  // Simply pass through to network, no caching
  event.respondWith(fetch(event.request));
});

const CACHE_NAME = '4h-cat-voting-v1-disabled';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/cats',
  '/api/votes',
  '/api/scores'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Default: network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request);
      })
  );
});

// Handle API requests with cache-first strategy for GET requests
function handleAPIRequest(request) {
  if (request.method === 'GET') {
    return caches.open(API_CACHE)
      .then((cache) => {
        return cache.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              // Return cached response and update in background
              fetchAndCache(request, cache);
              return cachedResponse;
            }
            
            // No cache, fetch from network
            return fetchAndCache(request, cache);
          });
      })
      .catch(() => {
        // Return offline response for API failures
        return new Response(
          JSON.stringify({ 
            error: 'Offline', 
            message: 'This feature is not available offline' 
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      });
  }
  
  // For non-GET requests, always try network first
  return fetch(request)
    .catch(() => {
      return new Response(
        JSON.stringify({ 
          error: 'Network Error', 
          message: 'Unable to complete this action offline' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    });
}

// Handle static assets with cache-first strategy
function handleStaticAsset(request) {
  return caches.open(STATIC_CACHE)
    .then((cache) => {
      return cache.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            });
        });
    });
}

// Handle navigation requests
function handleNavigation(request) {
  return fetch(request)
    .then((response) => {
      // Cache successful navigation responses
      if (response.status === 200) {
        caches.open(DYNAMIC_CACHE)
          .then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => {
      // Fallback to cached index.html for SPA routing
      return caches.match('/')
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Ultimate fallback - offline page
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>4H Cat Voting - Offline</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: #f5f5f5; 
                }
                .offline-message { 
                  background: white; 
                  padding: 30px; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                  max-width: 400px; 
                  margin: 0 auto; 
                }
                .retry-button { 
                  background: #1976d2; 
                  color: white; 
                  border: none; 
                  padding: 12px 24px; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  margin-top: 20px; 
                }
              </style>
            </head>
            <body>
              <div class="offline-message">
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button class="retry-button" onclick="window.location.reload()">
                  Retry
                </button>
              </div>
            </body>
            </html>`,
            {
              status: 200,
              statusText: 'OK',
              headers: { 'Content-Type': 'text/html' }
            }
          );
        });
    });
}

// Fetch and cache helper function
function fetchAndCache(request, cache) {
  return fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.error('Service Worker: Fetch failed', error);
      throw error;
    });
}

// Helper functions
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('appsync') ||
         url.hostname.includes('amazonaws.com');
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-votes') {
    event.waitUntil(syncOfflineVotes());
  }
  
  if (event.tag === 'background-sync-scores') {
    event.waitUntil(syncOfflineScores());
  }
});

// Sync offline votes when connection is restored
async function syncOfflineVotes() {
  try {
    const offlineVotes = await getOfflineData('votes');
    
    for (const vote of offlineVotes) {
      try {
        await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vote)
        });
        
        // Remove synced vote from offline storage
        await removeOfflineData('votes', vote.id);
      } catch (error) {
        console.error('Failed to sync vote:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync offline scores when connection is restored
async function syncOfflineScores() {
  try {
    const offlineScores = await getOfflineData('scores');
    
    for (const score of offlineScores) {
      try {
        await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(score)
        });
        
        // Remove synced score from offline storage
        await removeOfflineData('scores', score.id);
      } catch (error) {
        console.error('Failed to sync score:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// IndexedDB helpers for offline data storage
async function getOfflineData(type) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('4h-cat-voting-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readonly');
      const store = transaction.objectStore(type);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('votes')) {
        db.createObjectStore('votes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('scores')) {
        db.createObjectStore('scores', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineData(type, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('4h-cat-voting-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}