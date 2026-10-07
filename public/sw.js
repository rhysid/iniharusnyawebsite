self.addEventListener('install', (event) => {
    console.log('Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
    // Biarin fetch berjalan normal ke server / API
    event.respondWith(fetch(event.request));
});
