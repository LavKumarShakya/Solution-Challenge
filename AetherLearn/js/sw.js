const CACHE_NAME = 'aetherlearn-v1';
const CHAT_DB_NAME = 'aetherlearn-chat';
const CHAT_STORE_NAME = 'chat-messages';
const ASSETS = [
    '/',
    '/index.html',
    '/courses.html',
    '/ai-assistant.html',
    '/topics.html',
    '/resources.html',
    '/login.html',
    '/styles.css',
    '/script.js',
    '/login.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.addAll(ASSETS);
                }),
            // Initialize chat database
            initChatDB()
        ])
    );
});

// Initialize IndexedDB for chat storage
const initChatDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CHAT_DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
                db.createObjectStore(CHAT_STORE_NAME, { keyPath: 'timestamp' });
            }
        };

        request.onsuccess = () => resolve();
    });
};

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Handle chat operations
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'STORE_CHAT_MESSAGE':
            await storeChatMessage(data);
            break;
        case 'GET_CHAT_MESSAGES':
            const messages = await getChatMessages();
            event.source.postMessage({
                type: 'CHAT_MESSAGES',
                data: messages
            });
            break;
        case 'CLEAR_CHAT':
            await clearChatMessages();
            break;
    }
});

// Store chat message in IndexedDB
const storeChatMessage = async (message) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CHAT_DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CHAT_STORE_NAME);
            
            store.put({
                ...message,
                timestamp: Date.now()
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
    });
};

// Get all chat messages
const getChatMessages = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CHAT_DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(CHAT_STORE_NAME, 'readonly');
            const store = tx.objectStore(CHAT_STORE_NAME);
            const getRequest = store.getAll();

            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
};

// Clear all chat messages
const clearChatMessages = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CHAT_DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CHAT_STORE_NAME);
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        };
    });
};

// Fetch Strategy: Cache First, Network Fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    })
                    .catch(() => {
                        return caches.match('/offline.html');
                    });
            })
    );
});