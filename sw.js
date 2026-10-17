const CACHE = 'ikhtiar-foundation-v0.1.0';
const BASE = new URL('./', self.registration.scope);
const CORE = ['./','./index.html','./src/styles.css','./src/app.js','./manifest.webmanifest','./assets/brand/logo-mark.png','./assets/brand/icon-192.png','./assets/brand/icon-512.png'].map(p=>new URL(p, BASE).toString());
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const u=new URL(req.url);
 // Auth and database requests never enter the offline cache.
 if(u.origin!==self.location.origin)return;
 if(u.pathname.endsWith('/config.js')) return;
 if(req.mode==='navigate'){
   event.respondWith(fetch(req).catch(()=>caches.match(new URL('./index.html',BASE).toString())));
   return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
