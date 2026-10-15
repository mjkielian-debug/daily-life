/* Private Daily Life house map.
   Personal names, layout, landmarks and photo IDs come from owner-only Supabase records,
   not from this public source file. No measured geometry is inferred. */
(function(){
"use strict";
const floors=["Basement","First floor","Second floor","Third floor"];
const cache=new Map(),pending=new Map();
const str=x=>String(x??"");
const h=x=>str(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const okId=x=>/^[a-z][a-z0-9_]{0,39}$/.test(str(x));
const okPhoto=x=>/^[a-f0-9-]{36}$/i.test(str(x));
const okPath=x=>/^[MLHVZCSQTAmlhvzcsqta0-9.,\s-]{1,800}$/.test(str(x));
const color=x=>/^#[0-9a-f]{6}$/i.test(str(x))?x:"#d5dce9";
const arr=x=>Array.isArray(x)?x:[];
function who(){try{return typeof cloudUser==="function"?cloudUser():null}catch(e){return null}}
function online(){return typeof cloudClient!=="undefined"&&!!cloudClient&&!!who()}
function key(f){return who()?.id+"|"+f}
function get(f){return cache.get(key(f))}
function where(f){return Array.from(document.querySelectorAll(".hvm-root[data-floor]")).filter(e=>e.dataset.floor===f)}
function act(f,z){return "houseVisualOpenZone('"+f+"','"+z.id+"')"}
function facts(m){
 const b=arr(m.verified),n=arr(m.pending);
 return '<details class="hvm-facts"><summary>Confirmed details + what remains</summary><div class="hvm-fact-split">'+
 '<div><b>✓ Confirmed</b>'+b.map(t=>'<p>'+h(t)+'</p>').join("")+'</div>'+
 '<div><b>○ To verify</b>'+n.map(t=>'<p>'+h(t)+'</p>').join("")+'</div></div></details>';
}
function first(m){
 const paths=arr(m.zones).filter(z=>okId(z.id)&&okPath(z.path)).map(z=>{
  const n=Number(z.cx)||0,y=Number(z.cy)||0,onclick=act("First floor",z);
  return '<g class="hvm-zone" role="button" tabindex="0" onclick="'+onclick+
  '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+onclick+'}" aria-label="View '+h(z.name)+'">'+
  '<path d="'+h(z.path)+'" fill="'+color(z.color)+'" stroke="#6e6478" stroke-width="3" stroke-linejoin="round"/>'+
  '<text class="hvm-room-name" text-anchor="middle" x="'+Math.max(0,Math.min(375,n))+'" y="'+Math.max(0,Math.min(500,y))+'">'+h(z.short||z.name)+'</text></g>';
 }).join("");
 return '<div class="hvm-sketch"><div class="hvm-sketch-heading"><strong>First-floor layout</strong><span>Tap a colored room</span></div>'+
 '<svg class="hvm-drawing" viewBox="0 0 380 503" role="group" aria-label="Approximate first-floor map based on the robot-vacuum image; not to scale">'+
 '<rect x="16" y="9" width="348" height="480" rx="18" fill="#faf7fb" stroke="#d7cede" stroke-width="2"/>'+
 paths+'<path d="M185 466v-13m0 13h45" stroke="#302d49" stroke-width="3"/>'+
 '<text x="220" y="482" text-anchor="middle" class="hvm-entry-label">Front door · street</text></svg>'+
 '<p class="hvm-disclaimer">Shapes are approximate, preserving the robot map orientation. Open any room to see confirmed landmarks and photos.</p></div>';
}
function directory(f,m){
 return '<div class="hvm-directory"><div class="hvm-directory-heading"><strong>'+h(m.title||f)+'</strong><small>Room directory · not floor geometry</small></div>'+
 '<div class="hvm-directory-grid">'+arr(m.zones).filter(z=>okId(z.id)).map(z=>{
 const photos=arr(z.photos).filter(okPhoto);
 return '<button type="button" class="hvm-room-tile" style="--hvm-zone:'+color(z.color)+'" onclick="'+act(f,z)+'">'+
 '<span class="hvm-tile-mark" aria-hidden="true">⌂</span><b>'+h(z.name)+'</b>'+
 '<small>'+photos.length+' photo'+(photos.length===1?"":"s")+' · '+arr(z.markers).length+' landmarks</small>'+
 '<span class="hvm-tile-open">Open this location ›</span></button>';
 }).join("")+'</div><p class="hvm-disclaimer">Tiles are not positioned as actual walls or rooms. Room locations will be placed when orientation photos are available.</p></div>';
}
function draw(f,m){
 const work=arr(m.flow).map(x=>'<div class="hvm-flow-line"><b>'+h(x.from)+'</b><span>→</span><b>'+h(x.to)+'</b>'+
 '<small>'+h(x.status)+'</small></div>').join("");
 const todo=arr(m.pending)[0];
 return '<div class="hvm-rendered">'+(f==="First floor"&&m.kind==="schematic"?first(m):directory(f,m))+
 '<p class="hvm-disclaimer">'+h(m.summary||"")+'</p>'+
 (work?'<section class="hvm-flow"><strong>↗ Where things went</strong>'+work+'</section>':"")+
 (todo?'<div class="hvm-next"><b>Next mapping step</b><p>'+h(todo)+'</p>'+
 '<button class="btn primary small" type="button" onclick="openPhotoInbox(&#39;house_map&#39;)">+ Add room photos</button></div>':"")+
 facts(m)+'</div>';
}
function paint(f){
 const m=get(f),view=m?draw(f,m):(online()?"Loading your private layout…":"Sign in to Daily Life cloud to view your private map.");
 where(f).forEach(el=>{el.innerHTML=view;el.dataset.viewKey=key(f)});
}
window.houseVisualMapHtml=function(f){
 if(!floors.includes(f))f="First floor";
 Promise.resolve().then(()=>window.houseVisualMapHydrate(f)).catch(()=>{});
 return '<section class="hvm-root" data-floor="'+h(f)+'">'+
 (get(f)?draw(f,get(f)):(online()?"Loading private room map…":"Sign in to view your private room map."))+'</section>';
};
window.houseVisualMapHydrate=async function(f,force=false){
 if(!floors.includes(f))return;
 if(!online()){paint(f);return}
 const k=key(f);
 if(cache.has(k)&&!force){paint(f);return}
 if(pending.has(k))return pending.get(k);
 const job=(async()=>{
 try{
  const {data,error}=await cloudClient.from("life_entries").select("payload,updated_at")
   .eq("category","house_floor_map").eq("external_id","house-map:floor:"+f.toLowerCase().replace(/\s+/g,"-"))
   .eq("source","chatgpt").limit(1);
  if(error)throw error;
  if(key(f)!==k)return;
  const m=data?.[0]?.payload;
  if(!m||!Array.isArray(m.zones))throw new Error("No reviewed floor details yet.");
  cache.set(k,m);paint(f);
 }catch(e){
  where(f).forEach(el=>{el.innerHTML='<p class="hvm-disclaimer">Map could not load: '+h(e?.message||"Please retry")+
  '</p><button class="btn" onclick="houseVisualMapHydrate(&#39;'+f+'&#39;,true)">Retry loading</button>'});
 }finally{pending.delete(k)}
 })();
 pending.set(k,job);return job;
};
function zone(f,id){
 return arr(get(f)?.zones).find(z=>z.id===id)||null;
}
function localRoom(f,z){
 const n=x=>str(x).toLowerCase().replace(/[^a-z0-9]/g,"");
 return arr(typeof state==="undefined"?[]:state.houseRooms).find(r=>{
  if(str(r.floor)!==f)return false;
  const a=n(r.name),b=n(z.name),short=n(z.short||z.name);
  return a===b||(a.includes(short)&&short.length>3)||(b.includes(a)&&a.length>5);
 });
}
window.houseVisualInventoryOpen=function(f,id){
 const z=zone(f,id);if(!z)return;
 const room=localRoom(f,z);
 if(room&&typeof homeOpenRoomInventory==="function"){homeOpenRoomInventory(room.id);return}
 if(typeof openInventoryRoom==="function")openInventoryRoom("",f);
};
window.houseVisualOpenZone=function(f,id){
 if(!floors.includes(f)||!okId(id)||typeof modal!=="function")return;
 const z=zone(f,id);if(!z)return;
 const photos=arr(z.photos).filter(okPhoto);
 const spots=arr(z.markers).map(p=>'<div class="hvm-detail-marker"><b>'+h(p.label)+'</b><small>'+h(p.status||"")+'</small>'+
 (p.note?'<p>'+h(p.note)+'</p>':"")+'</div>').join("");
 const markup='<div class="hvm-zone-detail"><p>'+h(z.notes||"")+'</p>'+
 (spots?'<div class="hvm-detail-markers"><strong>Mapped spots</strong>'+spots+'</div>':"")+
 '<div class="hvm-detail-photos"><strong>Reference photos ('+photos.length+')</strong>'+
 (photos.length?photos.map((p,i)=>'<button type="button" class="hvm-photo-button" onclick="photoInboxView(&#39;'+p+'&#39;,&#39;map&#39;)">📷 Open photo '+(i+1)+' ›</button>').join(""):'<p>No photos assigned to this room yet.</p>')+'</div>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">'+
 (localRoom(f,z)?"Open room inventory":"+ Add room inventory")+'</button>'+
 '<button class="btn" onclick="openHouseFloorMap(&#39;'+f+'&#39;)">← Floor map</button></div></div>';
 modal(z.name+" · "+f,markup,"Close",closeModal);
};
})();
