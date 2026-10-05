const CACHE_NAME="daily-life-shell-20261005-tasklist1";
const APP_SHELL=[
  "./",
  "./index.html",
  "./styles.css",
  "./compact-ui.css",
  "./joyful-ui.css",
  "./life-system.css",
  "./life-orchestrator.css",
  "./home-operator.css",
  "./week-pilot.css",
  "./life-tools.css",
  "./capacity-planner.css",
  "./visual-density.css",
  "./readability-fix.css",
  "./cloud.js",
  "./sharing.js",
  "./finance-cloud.js",
  "./spirituality.js",
  "./vault.js",
  "./budget-coach.js",
  "./settings-tabs.js",
  "./food-tabs.js",
  "./daily-coach.js",
  "./house-robot.js",
  "./savings-lab.js",
  "./life-system.js",
  "./life-orchestrator.js",
  "./home-operator.js",
  "./week-pilot.js",
  "./life-tools.js",
  "./capacity-planner.js",
  "./money-fix.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./daily-life-pastel-icon.svg",
  "./daily-life-colorful-icon.svg",
  "./daily-life-rainbow-512.png",
  "./daily-life-rainbow-192.png",
  "./daily-life-rose-192.png",
  "./daily-life-rose-512.png",
  "./botanical-corners.svg",
  "./botanical-bg.svg",
  "./botanical-sprig.svg"
];

const LOCAL_ASSET_PATHS=new Set(APP_SHELL.filter(x=>x!=="./").map(x=>new URL(x,self.location).pathname));

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(async url=>{
      const response=await fetch(url,{cache:"reload"});
      if(response.ok)await cache.put(new URL(url,self.location).pathname,response.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith("daily-life-shell-")&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request){
  try{
    const fresh=await fetch(request);
    if(fresh.ok){
      const cache=await caches.open(CACHE_NAME);
      await cache.put(new URL("./index.html",self.location).pathname,fresh.clone());
    }
    return fresh;
  }catch{
    const cache=await caches.open(CACHE_NAME);
    return (await cache.match(new URL("./index.html",self.location).pathname)) ||
           (await cache.match(new URL("./",self.location).pathname)) ||
           new Response("Daily Life is offline and the app shell has not been cached yet.",{status:503,headers:{"Content-Type":"text/plain"}});
  }
}

async function staticAssetResponse(request,url,event){
  // A new version URL must never receive an older cached version while online.
  const key=url.pathname+url.search;
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(key);
  const refresh=fetch(request).then(async response=>{
    if(response.ok)await cache.put(key,response.clone());
    return response;
  }).catch(()=>null);
  event.waitUntil(refresh.then(()=>{}));
  if(cached){
    return cached;
  }
  return (await refresh) || (await cache.match(url.pathname)) || new Response("",{status:504});
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(LOCAL_ASSET_PATHS.has(url.pathname)){
    event.respondWith(staticAssetResponse(request,url,event));
  }
});
