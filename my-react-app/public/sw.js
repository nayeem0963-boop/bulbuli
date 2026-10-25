/*
 * Bulbuli service worker.
 *
 * Deliberately small: it only steps in for page navigations, going to the network as usual
 * and showing /offline.html if there's no connection. Game files, images and Supabase calls
 * are never touched, so a new deploy is always picked up straight away.
 *
 * Having a real fetch handler is also what lets Chrome/Edge offer the "Install app" prompt.
 * Bump CACHE when offline.html changes.
 */
const CACHE = 'bulbuli-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('bulbuli-offline-') && key !== CACHE).map((key) => caches.delete(key)))
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return // everything else: the browser as normal

  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse
      if (preloaded) return preloaded
      return await fetch(event.request)
    } catch {
      return (await caches.match(OFFLINE_URL)) ?? Response.error()
    }
  })())
})
