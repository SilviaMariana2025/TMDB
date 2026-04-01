const CACHE_NAME = "series-app-v2";
const DATA_CACHE_NAME = "series-data-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://cdn-icons-png.flaticon.com/512/732/732228.png",
  "https://cdn-icons-png.flaticon.com/512/5968/5968756.png",
  "https://cdn-icons-png.flaticon.com/512/5968/5968885.png",
  "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
  "https://s3.amazonaws.com/arc-wordpress-client-uploads/infobae-wp/wp-content/uploads/2019/05/23190023/twilight-zone-4.jpg",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
  "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
  "https://via.placeholder.com/200x300?text=Actor" // 👉 fallback imagen
];

// 🔹 INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// 🔹 ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 🔹 FETCH (EL ÚNICO 🔥)
self.addEventListener("fetch", event => {

  const request = event.request;
  const url = request.url;

  // 1. ❌ EXCLUIR YOUTUBE
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. 🖼️ IMÁGENES (ACTORES, POSTERS, ETC) → CACHE FIRST
  if (request.destination === "image" || url.includes("image.tmdb.org")) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchRes => {

          return caches.open(DATA_CACHE_NAME).then(cache => {
            cache.put(request, fetchRes.clone());
            return fetchRes;
          });

        }).catch(() => {
          // 👉 fallback si no hay internet
          return caches.match("https://via.placeholder.com/200x300?text=Actor");
        });
      })
    );
    return;
  }

  // 3. 📡 API TMDB → NETWORK FIRST
  if (url.includes("api.themoviedb.org")) {
    event.respondWith(
      fetch(request)
        .then(response => {

          if (response.status === 200) {
            const clone = response.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 4. 🌐 ARCHIVOS GENERALES → CACHE FIRST
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchRes => {

        return caches.open(CACHE_NAME).then(cache => {
          if (request.method === "GET") {
            cache.put(request, fetchRes.clone());
          }
          return fetchRes;
        });

      }).catch(() => {
        return caches.match("./index.html");
      });
    })
  );

});