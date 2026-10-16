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
function mapSketch(f,m){
 const isFirst=f==="First floor";
 const viewBox=/^\d+ \d+ \d+ \d+$/.test(str(m.viewBox||""))?m.viewBox:"0 0 380 503";
 const limits=viewBox.split(" ").map(Number);
 const paths=arr(m.zones).filter(z=>okId(z.id)&&okPath(z.path)).map(z=>{
  const x=Number(z.cx)||0,y=Number(z.cy)||0,onclick=act(f,z);
  return '<g class="hvm-zone" role="button" tabindex="0" onclick="'+onclick+
  '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+onclick+'}" aria-label="Open '+h(z.name)+'">'+
  '<path d="'+h(z.path)+'" fill="'+color(z.color)+'" stroke="#6e6478" stroke-width="3" stroke-linejoin="round"/>'+
  '<text class="hvm-room-name" text-anchor="middle" x="'+Math.max(limits[0],Math.min(limits[0]+limits[2],x))+'" y="'+Math.max(limits[1],Math.min(limits[1]+limits[3],y))+'">'+h(z.short||z.name)+'</text></g>';
 }).join("");
 const pins=arr(m.annotations).filter(a=>a&&okId(a.id)&&Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.y))&&floors.includes(a.targetFloor)).map(a=>{
  const x=Number(a.x),y=Number(a.y),on="houseVisualFollowLink('"+a.targetFloor+"')";
  if(x<limits[0]||x>limits[0]+limits[2]||y<limits[1]||y>limits[1]+limits[3])return "";
  return '<g class="hvm-annotation" role="button" tabindex="0" aria-label="'+h(a.note||a.label||"Open linked floor")+'" onclick="'+on+
   '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+on+'}">'+
   '<rect x="'+(x-39)+'" y="'+(y-15)+'" width="78" height="30" rx="14" fill="#fff9e8" stroke="#8053a7" stroke-width="2"/>'+
   '<text x="'+x+'" y="'+(y+5)+'" class="hvm-annotation-label" text-anchor="middle">'+h(a.label||"↑ next")+'</text></g>';
 }).join("");
 const backing=isFirst?'<rect x="16" y="9" width="348" height="480" rx="18" fill="#faf7fb" stroke="#d7cede" stroke-width="2"/>':
 '<rect x="55" y="186" width="430" height="572" rx="17" fill="#fcf9ff" stroke="#ded4e8" stroke-width="2"/>';
 const entry=isFirst?'<path d="M185 466v-13m0 13h45" stroke="#302d49" stroke-width="3"/>'+
 '<text x="220" y="482" text-anchor="middle" class="hvm-entry-label">Front door · street</text>':"";
 return '<div class="hvm-sketch"><div class="hvm-sketch-heading"><strong>'+h(f)+' layout</strong><span>Tap a colored area</span></div>'+
 '<svg class="hvm-drawing" viewBox="'+viewBox+'" role="group" aria-label="Approximate room zone diagram based on the original robot-vacuum screenshot. Not measured.">'+
 backing+paths+pins+entry+'</svg>'+
 '<p class="hvm-disclaimer">Schematic traced from your original screenshot; orientation preserved. Room outlines are approximate, not measured walls, and the diagram is not a navigation or safety plan.</p></div>';
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
function connect(m){
 const c=arr(m.connections).filter(x=>x&&x.label&&x.from&&x.to);
 if(!c.length)return "";
 return '<section class="hvm-connections" aria-label="House connection routes"><strong>How these spaces connect</strong>'+
 c.map(x=>'<div class="hvm-connection"><b>'+h(x.label)+'</b>'+
 '<div class="hvm-route"><span class="hvm-route-end">⌂ '+h(x.from)+'</span>'+
 arr(x.via).map(v=>'<div class="hvm-route-step"><span class="hvm-step-rail" aria-hidden="true">↓</span><span>'+h(v)+'</span></div>').join("")+
 '<span class="hvm-route-end">⌂ '+h(x.to)+'</span></div>'+
 (x.status?'<p>'+h(x.status)+'</p>':"")+'</div>').join("")+'</section>';
}
function draw(f,m){
 const work=arr(m.flow).map(x=>'<div class="hvm-flow-line"><b>'+h(x.from)+'</b><span>→</span><b>'+h(x.to)+'</b>'+
 '<small>'+h(x.status)+'</small></div>').join("");
 const todo=arr(m.pending)[0];
 const original=okPhoto(m.sourcePhotoId)?'<button type="button" class="btn hvm-source-photo" onclick="photoInboxView(&#39;'+m.sourcePhotoId+'&#39;,&#39;map&#39;)">📷 See original robot-vacuum screenshot</button>':"";
 return '<div class="hvm-rendered">'+(m.kind==="schematic"?mapSketch(f,m):directory(f,m))+
 '<p class="hvm-disclaimer">'+h(m.summary||"")+'</p>'+
 original+
 connect(m)+
 (work?'<section class="hvm-flow"><strong>↗ Where things went</strong>'+work+'</section>':"")+
 (todo?'<div class="hvm-next"><b>Next mapping step</b><p>'+h(todo)+'</p>'+
 '<button class="btn primary small" type="button" onclick="openPhotoInbox(&#39;house_map&#39;,&#39;&#39;,&#39;'+f+'&#39;)">+ Add room photos</button></div>':"")+
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
window.houseVisualFollowLink=function(target){
 if(!floors.includes(target))return;
 if(typeof openHouseFloorMap==="function"){openHouseFloorMap(target);return}
 if(typeof homeSetMapFloor==="function"){homeSetMapFloor(target)}
};
window.houseVisualInventoryOpen=function(f,id){
 const z=zone(f,id);if(!z)return;
 const room=localRoom(f,z);
 if(room&&typeof homeOpenRoomInventory==="function"){homeOpenRoomInventory(room.id);return}
 if(typeof openInventoryRoom==="function")openInventoryRoom("",f);
};
function trackedRoomTasks(f,z,room){
 const name=String(z.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 return (state.tasks||[]).filter(t=>{
  if(t.paused||t.duplicateHidden||t.waitingForFunds)return false;
  const assigned=String(t.homeRoomId||t.roomId||"");
  if(assigned)return !!room&&assigned===String(room.id);
  const label=String(t.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  return String(t.category||"").toLowerCase()==="home"&&name&&(" "+label+" ").includes(" "+name+" ");
 });
}
window.houseVisualCompleteTask=async function(taskId,f,zoneId){
 const t=(state.tasks||[]).find(x=>String(x.id)===String(taskId));if(!t||t.done)return;
 await toggleTask(taskId,true);
 window.houseVisualOpenZone(f,zoneId);
};
window.houseVisualOpenZone=function(f,id){
 if(!floors.includes(f)||!okId(id)||typeof modal!=="function")return;
 const z=zone(f,id);if(!z)return;
 const photos=arr(z.photos).filter(okPhoto);
 const room=localRoom(f,z),tasks=trackedRoomTasks(f,z,room),finished=tasks.filter(t=>t.done),pendingTasks=tasks.filter(t=>!t.done),pct=tasks.length?Math.round(finished.length/tasks.length*100):null;
 const locIds=new Set((state.inventoryLocations||[]).filter(x=>room&&x.roomId===room.id).map(x=>x.id));
 const inventory=room?(state.inventoryItems||[]).filter(x=>x.roomId===room.id||locIds.has(x.locationId)):[];
 const progress='<div class="hvm-task-progress"><div><b>'+(pct===null?"Not assessed":pct+"%")+'</b><small>'+(pct===null?"No room tasks saved yet":finished.length+" / "+tasks.length+" tasks complete")+'</small></div>'+
 '<div class="hvm-task-meter"><i style="width:'+(pct||0)+'%"></i></div><small>Task progress only; not a cleanliness rating.</small></div>'+
 '<div class="hvm-task-list"><b>What needs doing · '+pendingTasks.length+'</b>'+
 (pendingTasks.length?pendingTasks.slice(0,12).map(t=>'<div class="hvm-task-row"><span>'+h(t.title)+'</span><button class="btn small primary" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Done</button></div>').join(""):'<p>No unfinished tracked room tasks yet.</p>')+'</div>'+
 '<div class="hvm-room-inventory"><b>Confirmed inventory · '+inventory.length+' item types</b>'+
 (inventory.length?inventory.slice(0,14).map(x=>'<p>'+h(x.name)+(x.quantity!=null?' · '+h(x.quantity):'')+'</p>').join(""):'<p>No local inventory recorded here yet; this does not mean the room is empty.</p>')+'</div>';

 const spots=arr(z.markers).map(p=>'<div class="hvm-detail-marker"><b>'+h(p.label)+'</b><small>'+h(p.status||"")+'</small>'+
 (p.note?'<p>'+h(p.note)+'</p>':"")+'</div>').join("");
 const markup='<div class="hvm-zone-detail">'+progress+'<details class="hvm-context"><summary>Map observations and landmarks</summary><p>'+h(z.notes||"")+'</p>'+
 (spots?'<div class="hvm-detail-markers"><strong>Mapped spots</strong>'+spots+'</div>':"")+
 '</details>'+
 '<div class="hvm-detail-photos"><strong>Reference photos ('+photos.length+')</strong>'+
 (photos.length?photos.map((p,i)=>'<button type="button" class="hvm-photo-button" onclick="photoInboxView(&#39;'+p+'&#39;,&#39;map&#39;)">📷 Open photo '+(i+1)+' ›</button>').join(""):'<p>No photos assigned to this room yet.</p>')+'</div>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">'+
 (localRoom(f,z)?"Open room inventory":"+ Add room inventory")+'</button>'+
 '<button class="btn" onclick="openHouseFloorMap(&#39;'+f+'&#39;)">← Floor map</button></div></div>';
 modal(z.name+" · "+f,markup,"Close",closeModal);
};
})();
