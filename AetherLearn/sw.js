const CACHE_NAME = 'aetherlearn-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/login.html',
  '/login.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js',
  'https://api.dicebear.com/6.x/bottts/svg?seed=aether'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Resources
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it can only be used once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // Don't cache if the URL has certain keywords
              if (!event.request.url.includes('chrome-extension') &&
                  !event.request.url.includes('socket.io')) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-learning-progress') {
    event.waitUntil(
      // Sync learning progress when online
      syncLearningProgress()
    );
  }
});

// Push Notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Course'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AetherLearn Update', options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Function to sync learning progress
const syncLearningProgress = async () => {
  try {
    const response = await fetch('/api/sync-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Get progress data from IndexedDB
        progress: await getProgressFromIndexedDB()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sync progress');
    }

    // Clear synced data from IndexedDB
    await clearSyncedProgress();
  } catch (error) {
    console.error('Error syncing progress:', error);
    throw error;
  }
};

// IndexedDB functions
const getProgressFromIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AetherLearn', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('progress', 'readonly');
      const store = tx.objectStore('progress');
      const getRequest = store.getAll();

      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
};

const clearSyncedProgress = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AetherLearn', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('progress', 'readwrite');
      const store = tx.objectStore('progress');
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
};