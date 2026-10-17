/* IKHTIAR PWA v0.3.0 — network-first for app shell, safe offline fallback. */
const CACHE='ikhtiar-app-v0.3.0';
const BASE=new URL('./',self.registration.scope);
const CORE=['./','./index.html','./src/styles.css?v=0.3.0','./src/app.js?v=0.3.0','./src/career.js?v=0.3.0','./src/portfolio.js?v=0.3.0','./manifest.webmanifest','./assets/brand/logo-mark.png','./assets/brand/icon-192.png','./assets/brand/icon-512.png'].map(p=>new URL(p,BASE).toString());
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ikhtiar-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const u=new URL(req.url);if(u.origin!==self.location.origin)return;
 if(u.pathname.endsWith('/config.js'))return;
 const isShell=req.mode==='navigate'||u.pathname.endsWith('/src/app.js')||u.pathname.endsWith('/src/styles.css')||u.pathname.endsWith('/src/career.js')||u.pathname.endsWith('/src/portfolio.js')||u.pathname.endsWith('/index.html');
 if(isShell){event.respondWith((async()=>{
  try{const response=await fetch(req,{cache:'no-store'});if(response.ok){const c=await caches.open(CACHE);await c.put(req,response.clone());}return response;}
  catch{const c=await caches.open(CACHE);return (await c.match(req))||(req.mode==='navigate'?await c.match(new URL('./index.html',BASE).toString()):undefined)||Response.error();}
 })());return;}
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
