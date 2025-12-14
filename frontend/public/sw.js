// Service Worker para EDUCA+ Curionópolis PWA
const CACHE_NAME = 'educa-plus-v1';
const STATIC_CACHE = 'educa-static-v1';
const DYNAMIC_CACHE = 'educa-dynamic-v1';

// Recursos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando recursos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') return;

  // Ignorar requisições para API (exceto para offline)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respostas de API bem-sucedidas para uso offline
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Tentar retornar do cache se offline
          return caches.match(request);
        })
    );
    return;
  }

  // Para recursos estáticos: Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Atualizar cache em background
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          });
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Para navegação: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Retornar página offline se disponível
          if (request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Escutar mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push Notifications (preparação para Fase 2)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do EDUCA+',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('EDUCA+ Curionópolis', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clique na notificação:', event.notification.tag);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
