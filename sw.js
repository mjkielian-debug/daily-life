const CACHE_VERSION=new URL(self.location.href).searchParams.get("v")||"unversioned";
const CACHE_NAME="daily-life-shell-"+CACHE_VERSION;
const APP_SHELL=[
  "./",
  "./index.html",
  "./push-notifications.js",
  "./text-inbox.js",
  "./gmail-settings.js",
  "./completion-feedback.js",
  "./workday-focus.js",
  "./schedule-photo-import.js",
  "./workday-protection.js",
  "./sync-status.js",
  "./second-floor-miniatures.js",
  "./reading-wheel-fixes.js",
  "./task-lifecycle.js",
  "./day-flow-corrections.js",
  "./planner-reliability.js",
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
  "./visual-hubs.css",
  "./life-sim-ui.css",
  "./life-sim-ui.js",
  "./chat-checkin.css",
  "./chat-checkin.js",
  "./chat-share.js",
  "./inventory-goals.js",
  "./paper-studio.js",
  "./paper-import.js",
  "./house-room-artwork.js",
  "./house-visual-map.js",
  "./photo-inbox.js",
  "./home-area-projects.js",
  "./inventory-photo-review.js",
  "./house-visual-map.css",
  "./dolly-room-model.css",
  "./dolly-room-model.js",
  "./photo-inbox.css",
  "./avatar-wardrobe.js",
  "./avatar-wardrobe.css",
  "./paper-studio.css",
  "./practice-proof.js",
  "./life-insights.js",
  "./life-map.js",
  "./life-map.css",
  "./ui-quiet-mobile.css",
  "./home-hub.css",
  "./home-hub.js",
  "./assets/michelle-equestria-avatar.webp?v=20261112-facepony1",
  "./electricity-insights.js",
  "./life-insights.css",
  "./bank-exit-plan.js",
  "./finance-roadmap.js",
  "./finance-roadmap.css",
  "./action-first.js",
  "./action-first.css",
  "./today-guidance.css",
  "./budget-forecast-2026.js",
  "./mobile-layout-repair.css",
  "./modal-form-readability.css",
  "./inventory-goals.css",
  "./visual-hubs.js",
  "./habit-focus.js",
  "./habit-focus.css",
  "./completion-feedback.css",
  "./sync-status.css",
  "./household-map-compact.css",
  "./household-map-layout.css",
  "./household-map-details.css",
  "./household-map-scroll.css",
  "./second-floor-miniatures.css",
  "./monster-high-collection.css",
  "./monster-high-collection.js",
  "./money-clarity.js",
  "./hobby-weekly.js",
  "./holiday-gifts.js",
  "./holiday-gifts.css",
  "./ssd-route-capture.js",
  "./ssd-weekly-pay.js",
  "./chase-balance.js",
  "./chase-balance.css",
  "./readability-fix.css",
  "./rainbow-theme-cleanup.css",
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
  "./task-ui.js",
  "./parenting-psychology-lessons.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./daily-life-garden-app.svg",
  "./daily-life-garden-app-192.png",
  "./daily-life-garden-app-512.png",
  "./daily-life-notification-badge.png",
  "./daily-life-pastel-icon.svg",
  "./daily-life-colorful-icon.svg",
  "./daily-life-rainbow-512.png",
  "./daily-life-rainbow-192.png?v=20261114-rainbow-refresh1",
  "./daily-life-rose-192.png",
  "./daily-life-rose-512.png",
  "./candy-theme.css",
  "./candy-doodles.svg"
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
