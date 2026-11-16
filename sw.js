const CACHE_VERSION=new URL(self.location.href).searchParams.get("v")||"unversioned";
const CACHE_NAME="daily-life-shell-"+CACHE_VERSION;
const APP_SHELL=[  "./",
  "./action-first.css",
  "./action-first.js",
  "./assets/michelle-equestria-avatar.webp?v=20261112-facepony1",
  "./avatar-wardrobe.css",
  "./avatar-wardrobe.js",
  "./bank-exit-plan.js",
  "./budget-coach.js",
  "./budget-forecast-2026.js",
  "./candy-doodles.svg",
  "./candy-theme.css",
  "./capacity-planner.css",
  "./capacity-planner.js",
  "./chase-balance.css",
  "./chase-balance.js",
  "./chat-checkin.css",
  "./chat-checkin.js",
  "./chat-share.js",
  "./cloud.js",
  "./compact-ui.css",
  "./completion-feedback.css",
  "./completion-feedback.js",
  "./connected-life-map.css",
  "./daily-coach.js",
  "./daily-life-colorful-icon.svg",
  "./daily-life-garden-app-192.png",
  "./daily-life-garden-app-512.png",
  "./daily-life-garden-app.svg",
  "./daily-life-notification-badge.png",
  "./daily-life-pastel-icon.svg",
  "./daily-life-rainbow-192.png?v=20261114-rainbow-refresh1",
  "./daily-life-rainbow-512.png",
  "./daily-life-rose-192.png",
  "./daily-life-rose-512.png",
  "./day-flow-corrections.js",
  "./dolly-room-model.css",
  "./dolly-room-model.js",
  "./electricity-insights.js",
  "./finance-cloud.js",
  "./finance-roadmap.css",
  "./finance-roadmap.js",
  "./food-tabs.js",
  "./gmail-settings.js",
  "./habit-focus.css",
  "./habit-focus.js",
  "./hobby-weekly.js",
  "./holiday-gifts.css",
  "./holiday-gifts.js",
  "./home-area-projects.js",
  "./home-hub.css",
  "./home-hub.js",
  "./home-operator.css",
  "./home-operator.js",
  "./house-robot.js",
  "./house-room-artwork.js",
  "./house-visual-map.css",
  "./house-visual-map.js",
  "./household-map-compact.css",
  "./household-map-details.css",
  "./household-map-layout.css",
  "./household-map-scroll.css",
  "./icon.svg",
  "./index.html",
  "./inventory-goals.css",
  "./inventory-goals.js",
  "./inventory-photo-review.js",
  "./joyful-ui.css",
  "./life-insights.css",
  "./life-insights.js",
  "./life-map.css",
  "./life-map.js",
  "./life-orchestrator.css",
  "./life-orchestrator.js",
  "./life-sim-ui.css",
  "./life-sim-ui.js",
  "./life-system.css",
  "./life-system.js",
  "./life-tools.css",
  "./life-tools.js",
  "./manifest.webmanifest",
  "./mobile-layout-repair.css",
  "./modal-form-readability.css",
  "./money-clarity.js",
  "./money-fix.js",
  "./monster-high-collection.css",
  "./monster-high-collection.js",
  "./paper-import.js",
  "./paper-studio.css",
  "./paper-studio.js",
  "./parenting-psychology-lessons.js",
  "./photo-inbox.css",
  "./photo-inbox.js",
  "./planner-reliability.js",
  "./practice-proof.js",
  "./push-notifications.js",
  "./rainbow-theme-cleanup.css",
  "./readability-fix.css",
  "./reading-wheel-fixes.js",
  "./savings-lab.js",
  "./schedule-photo-import.js",
  "./second-floor-miniatures.css",
  "./second-floor-miniatures.js",
  "./settings-tabs.js",
  "./sharing.js",
  "./spirituality.js",
  "./ssd-route-capture.js",
  "./ssd-weekly-pay.js",
  "./styles.css",
  "./sync-status.css",
  "./sync-status.js",
  "./task-lifecycle.js",
  "./task-ui.js",
  "./text-inbox.js",
  "./today-guidance.css",
  "./ui-quiet-mobile.css",
  "./vault.js",
  "./visual-density.css",
  "./visual-hubs.css",
  "./visual-hubs.js",
  "./week-pilot.css",
  "./week-pilot.js",
  "./workday-focus.js",
  "./workday-protection.js"
];

const LOCAL_ASSET_PATHS=new Set(APP_SHELL.filter(x=>x!=="./").map(x=>new URL(x,self.location).pathname));

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const required=["./index.html","./cloud.js","./styles.css","./candy-theme.css","./candy-doodles.svg"];
    await Promise.all(required.map(async url=>{
      const response=await fetch(url,{cache:"reload"});
      if(!response.ok)throw new Error("Required app file failed: "+url+" ("+response.status+")");
      await cache.put(new URL(url,self.location).pathname,response.clone());
    }));
    await Promise.allSettled(APP_SHELL.filter(url=>!required.includes(url)).map(async url=>{
      const response=await fetch(url,{cache:"reload"});
      if(response.ok)await cache.put(new URL(url,self.location).pathname,response.clone());
    }));
  })());
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="ACTIVATE_NOW")event.waitUntil(self.skipWaiting());
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
    const fresh=await fetch(request,{cache:"no-store"});
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
  const refresh=fetch(request,{cache:"no-cache"}).then(async response=>{
    if(response.ok)await cache.put(key,response.clone());
    return response.ok?response:null;
  }).catch(()=>null);
  event.waitUntil(refresh.then(()=>{}));
  return (await refresh) || cached || (await cache.match(url.pathname)) || new Response("",{status:504});
}

self.addEventListener("push",event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text?.()||""}}
  const title=String(payload.title||"Daily Life");
  const options={
    body:String(payload.body||"A Daily Life reminder is due."),
    icon:"./daily-life-garden-app-192.png",
    badge:"./daily-life-notification-badge.png",
    tag:String(payload.tag||"daily-life-reminder"),
    renotify:true,
    silent:false,
    vibrate:[200,100,200],
    data:{url:String(payload.url||"./")}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"./",self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if(client.url.startsWith(self.location.origin)){
        await client.focus();
        if("navigate" in client&&client.url!==target)await client.navigate(target);
        return;
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
const SHARED_CHAT_CACHE="daily-life-chat-shares-v1";
async function receiveSharedChat(request){
  try{
    const form=await request.formData();
    const text=[form.get("text"),form.get("url"),form.get("title")]
      .filter(x=>typeof x==="string"&&x.trim()).join("\n").trim().slice(0,10000);
    if(!text)return Response.redirect(new URL("./",self.location).href,303);
    const id=self.crypto.randomUUID();
    const cache=await caches.open(SHARED_CHAT_CACHE);
    const uri=new URL("./__daily_life_share__/"+id,self.location).href;
    await cache.put(uri,new Response(JSON.stringify({text,createdAt:Date.now()}),{
      headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
    }));
    // Retain only a small, temporary local queue. No conversation text is
    // sent to a server before user confirmation.
    const keys=await cache.keys();
    const old=keys.slice(0,Math.max(0,keys.length-10));
    await Promise.all(old.map(key=>cache.delete(key)));
    return Response.redirect(new URL("./?review_chat="+encodeURIComponent(id),self.location).href,303);
  }catch(error){
    return new Response("Daily Life could not receive this shared text. Open Daily Life and use Review shared ChatGPT text.",{
      status:400,headers:{"Content-Type":"text/plain"}
    });
  }
}
self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const appRoot=new URL("./",self.location).pathname;
  if(request.method==="POST"&&url.pathname===appRoot&&url.searchParams.has("chat_share_target")){
    event.respondWith(receiveSharedChat(request));
    return;
  }
  if(request.method!=="GET")return;


  if(request.mode==="navigate"){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(LOCAL_ASSET_PATHS.has(url.pathname)){
    event.respondWith(staticAssetResponse(request,url,event));
  }
});
