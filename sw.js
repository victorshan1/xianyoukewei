/**
 * 乡村课堂 AI 助教 - Service Worker
 * 功能：离线缓存、资源预加载、离线提示
 */

const CACHE_NAME = 'rural-ai-cache-v1';
const STATIC_CACHE = 'rural-ai-static-v1';
const API_CACHE = 'rural-ai-api-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/router.js',
  '/js/storage.js',
  '/js/api.js',
  '/js/demo-data.js',
  '/js/echarts-helper.js',
  '/js/pages/lesson-plan.js',
  '/js/pages/student-profile.js',
  '/js/pages/class-overview.js',
  '/js/pages/practice.js',
  '/js/pages/wrong-book.js',
  '/js/pages/photo-qa.js',
  '/js/pages/report.js',
  '/pages/teacher/lesson-plan.html',
  '/pages/teacher/student-profile.html',
  '/pages/teacher/class-overview.html',
  '/pages/student/photo-qa.html',
  '/pages/student/practice.html',
  '/pages/student/wrong-book.html',
  '/pages/parent/report.html',
  'https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] 预缓存完成');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] 预缓存失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] 激活完成');
      return self.clients.claim();
    })
  );
});

// 拦截请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 静态资源：缓存优先
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset) || url.pathname === asset)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('[SW] 从缓存加载:', url.pathname);
            return response;
          }
          console.log('[SW] 从网络加载:', url.pathname);
          return fetch(event.request);
        })
        .catch(() => {
          console.log('[SW] 网络失败，返回缓存:', url.pathname);
          return caches.match('/index.html');
        })
    );
    return;
  }

  // API 请求：网络优先，失败时返回缓存
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] API 请求失败，尝试缓存:', url.pathname);
          return caches.match(event.request);
        })
    );
    return;
  }

  // 其他请求：网络优先
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// 监听消息 - 手动清理缓存
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHE') {
    console.log('[SW] 清理所有缓存');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('[SW] 缓存已清理');
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});
