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


function zoneBounds(path){
 const nums=(str(path).match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
 if(nums.length<4)return null;
 const xs=[],ys=[];
 for(let i=0;i+1<nums.length;i+=2){xs.push(nums[i]);ys.push(nums[i+1])}
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return {x:minX,y:minY,width:maxX-minX,height:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
}
function previewSource(f,z){
 if(f!=="Second floor")return null;
 if(z.id==="dolly"&&typeof window.dollyRoomMapPreviewSvg==="function"){
  const match=window.dollyRoomMapPreviewSvg().match(/<svg\b[^>]*viewBox=["']([^"']+)["'][^>]*>([\s\S]*?)<\/svg>/i);
  return match?{viewBox:match[1],markup:match[2],kind:"dolly"}:null;
 }
 const kind=/bath/i.test(z.name||"")?"bathroom":/hall/i.test(z.name||"")?"hallway":"";
 if(!kind||typeof window.dailyLifeMiniatureSvg!=="function")return null;
 const source=window.dailyLifeMiniatureSvg(kind);
 return source?{...source,kind}:null;
}
function previewMarkerIndex(z,item,kind){
 const aliases={
  bathroom:{tub:["bathtub","tub"],window:["window"],organizer:["organizer"],mat:["bath mat","mat"],storage:["storage basket","basket"],vent:["floor vent","vent"]},
  hallway:{stairs:["stairs"],railing:["railing"],bathroom:["bathroom door"],bedrooms:["bedroom door","bedrooms"],window:["window"],organizer:["organizer"],plants:["plants","shoes"]}
 };
 const wanted=aliases[kind]?.[item]||[item];
 const norm=value=>str(value).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 return arr(z.markers).findIndex(marker=>{
  const label=norm(marker?.label||marker?.name||marker?.id);
  return label&&wanted.some(alias=>{const key=norm(alias);return label===key||label.includes(key)});
 });
}
function inlineRoomPreview(f,z,bounds){
 const source=previewSource(f,z);
 if(!source||!bounds||bounds.width<48||bounds.height<48)return "";
 const view=String(source.viewBox||"").split(/\s+/).map(Number);
 if(view.length!==4||view[2]<=0||view[3]<=0)return "";
 const maxW=bounds.width*.97,maxH=bounds.height*.9;
 const scale=Math.min(maxW/view[2],maxH/view[3]);
 if(!Number.isFinite(scale)||scale<.16)return "";
 const width=view[2]*scale,height=view[3]*scale;
 const x=bounds.cx-width/2,y=bounds.y+Math.max(17,(bounds.height-height)/2+3);
 let contents=source.markup||"";
 if(source.kind==="bathroom"||source.kind==="hallway"){
  contents=contents.replace(/(<g class="dl-mini-item"[^>]*data-item="([^"]+)"[^>]*)>/g,(open,itemTag,item)=>{
   const index=previewMarkerIndex(z,item,source.kind);
   return index<0?open+">":open+
    ' onclick="event.stopPropagation();houseVisualInteractMarker(&#39;Second floor&#39;,&#39;'+z.id+'&#39;,'+index+')"'+
    ' onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();event.stopPropagation();houseVisualInteractMarker(&#39;Second floor&#39;,&#39;'+z.id+'&#39;,'+index+')}"'+
    '>'+""; 
  });
 }
 return '<svg class="hvm-inline-room-preview" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+width.toFixed(1)+'" height="'+height.toFixed(1)+'" viewBox="'+h(source.viewBox)+'" preserveAspectRatio="xMidYMid meet" aria-label="'+h(z.name)+' furniture preview" focusable="false" pointer-events="auto">'+contents+'</svg>';
}
function mapSketch(f,m){
 const isFirst=f==="First floor";
 const viewBox=/^\d+ \d+ \d+ \d+$/.test(str(m.viewBox||""))?m.viewBox:"0 0 380 503";
 const limits=viewBox.split(" ").map(Number);
 const zonePreviews=arr(m.zones).map(z=>[z.id,inlineRoomPreview(f,z,zoneBounds(z.path))]);
 const hasPreviews=zonePreviews.some(([,preview])=>!!preview);
 const paths=arr(m.zones).filter(z=>okId(z.id)&&okPath(z.path)).map(z=>{
  const bounds=zoneBounds(z.path),x=Number(z.cx)||0,y=Number(z.cy)||0,onclick=act(f,z);
  const preview=zonePreviews.find(([id])=>id===z.id)?.[1]||"";
  const labelX=preview&&bounds?bounds.cx:Math.max(limits[0],Math.min(limits[0]+limits[2],x));
  const labelY=preview&&bounds?bounds.y+14:Math.max(limits[1],Math.min(limits[1]+limits[3],y));
  return '<g class="hvm-zone'+(preview?' has-inline-preview':'')+'" role="button" tabindex="0" onclick="'+onclick+
  '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+onclick+'}" aria-label="Open '+h(z.name)+'">'+
  '<path d="'+h(z.path)+'" fill="'+color(z.color)+'" stroke="#6e6478" stroke-width="3" stroke-linejoin="round"/>'+
  preview+'<text class="hvm-room-name" text-anchor="middle" x="'+labelX.toFixed(1)+'" y="'+labelY.toFixed(1)+'">'+h(z.short||z.name)+'</text></g>';
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
 return '<div class="hvm-sketch"><div class="hvm-sketch-heading"><strong>'+h(f)+' layout</strong><span>'+(hasPreviews?"Room layouts shown inline · tap a room or mapped object":"Tap a colored area")+'</span></div>'+
 '<svg class="hvm-drawing'+(hasPreviews?' hvm-has-previews':'')+'" viewBox="'+viewBox+'" role="group" aria-label="Approximate room zone diagram with room previews based on saved room layouts.">'+
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
 const original=okPhoto(m.sourcePhotoId)?'<button type="button" class="btn hvm-source-photo" onclick="photoInboxView(&#39;'+m.sourcePhotoId+'&#39;,&#39;map&#39;)">📷 Original robot map</button>':"";
 // Keep the clickable layout and tasks up front. Mapping caveats and stair
 // route evidence are supporting reference material, not the main screen.
 const references='<div class="hvm-technical-detail">'+
 (m.summary?'<p class="hvm-disclaimer">'+h(m.summary)+'</p>':"")+
 original+connect(m)+
 (work?'<section class="hvm-flow"><strong>↗ Where things went</strong>'+work+'</section>':"")+
 (todo?'<div class="hvm-next"><b>Next mapping step</b><p>'+h(todo)+'</p>'+
 '<button class="btn small" type="button" onclick="openPhotoInbox(&#39;house_map&#39;,&#39;&#39;,&#39;'+f+'&#39;)">+ Add room photos</button></div>':"")+
 facts(m)+'</div>';
 return '<div class="hvm-rendered">'+(m.kind==="schematic"?mapSketch(f,m):directory(f,m))+
 '<details class="hvm-mapping-background"><summary>Mapping notes, stair connections and evidence ›</summary>'+
 references+'</details></div>';
}
function mappedRoomItems(room){
 if(!room)return [];
 const locIds=new Set(arr(state.inventoryLocations).filter(loc=>String(loc.roomId)===String(room.id)).map(loc=>String(loc.id)));
 return arr(state.inventoryItems).filter(x=>String(x.roomId)===String(room.id)||locIds.has(String(x.locationId)));
}
function mappedProgressCard(f,z,room){
 const tasks=trackedRoomTasks(f,z,room),done=tasks.filter(x=>x.done).length,percent=tasks.length?Math.round(100*done/tasks.length):null;
 const inventory=mappedRoomItems(room);
 const action=z?'houseVisualOpenZone(&#39;'+f+'&#39;,&#39;'+z.id+'&#39;)':
   'homeOpenRoomInventory(&#39;'+h(String(room.id||""))+'&#39;)';
 const title=z?z.name:room.name;
 return '<button type="button" class="household-room-progress" onclick="'+action+'">'+
 '<span><b>'+h(title)+'</b><small>'+(tasks.length?done+' / '+tasks.length+' tasks complete':'No room tasks recorded')+'</small>'+
 '<small>'+inventory.length+' confirmed item type'+(inventory.length===1?"":"s")+'</small></span>'+
 '<span><b>'+(percent===null?'—':percent+'%')+'</b>'+
 '<i aria-hidden="true"><em style="width:'+(percent||0)+'%"></em></i></span></button>';
}
function roomProgressHtml(f){
 const map=get(f),known=arr(map?.zones).filter(z=>z&&okId(z.id));
 const floorRooms=arr(state.houseRooms).filter(r=>str(r.floor)===f&&str(r.name).trim());
 const localUsed=new Set();
 const mapped=known.map(z=>{const room=localRoom(f,z);if(room)localUsed.add(str(room.id));return mappedProgressCard(f,z,room)});
 const localOnly=floorRooms.filter(r=>!localUsed.has(str(r.id))).map(room=>mappedProgressCard(f,null,room));
 const rows=mapped.concat(localOnly);
 if(rows.length)return '<div class="household-room-progress-grid">'+rows.join("")+'</div>'+
 '<p class="household-progress-disclaimer">Percentages show completed saved room tasks, not an overall cleanliness score. Unrecorded work stays unknown.</p>';
 return '<p class="household-progress-empty">'+
 (online()&&!map?'Loading mapped rooms…':'No room tasks or inventory locations are linked to this floor yet. You can tap the diagram or add a room.')+
 '</p>';
}
function floorTrackedTasks(f){
 const map=get(f),known=arr(map?.zones).filter(z=>z&&okId(z.id));
 const floorRooms=arr(state.houseRooms).filter(r=>str(r.floor)===f&&str(r.name).trim());
 const localUsed=new Set(),groups=known.map(z=>{const room=localRoom(f,z);if(room)localUsed.add(str(room.id));return trackedRoomTasks(f,z,room)});
 for(const room of floorRooms)if(!localUsed.has(str(room.id)))groups.push(trackedRoomTasks(f,null,room));
 const byId=new Map();
 for(const task of groups.flat())if(task?.id)byId.set(String(task.id),task);
 return [...byId.values()];
}
window.houseVisualFloorProgressHtml=function(f){
 const tasks=floorTrackedTasks(f),done=tasks.filter(task=>task.done).length;
 const percent=tasks.length?Math.round(done*100/tasks.length):null;
 const status=tasks.length?done+" of "+tasks.length+" room tasks complete":"No room tasks logged yet";
 const progress=percent===null
  ? '<span class="household-map-floor-progress-state">Start tracking ›</span>'
  : '<span class="household-map-floor-progress-meter"><b>'+percent+'%</b><i role="progressbar" aria-label="Room tasks complete" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><em style="width:'+percent+'%"></em></i></span>';
 const label="Open "+h(f)+" room progress"+(tasks.length?": "+done+" of "+tasks.length+" tasks complete":": no room tasks logged yet");
 return '<button type="button" class="household-map-floor-progress" aria-label="'+h(label)+'" onclick="householdOpenRoomProgress()">'+
  '<span class="household-map-floor-progress-copy"><b>'+h(f)+' progress</b><small>'+status+'</small></span>'+progress+'<span aria-hidden="true">›</span></button>';
};
window.houseVisualRoomProgressHtml=function(f){return roomProgressHtml(f)};
function refreshRoomProgress(f){
 document.querySelectorAll(".household-map-room-results[data-floor]").forEach(el=>{
  if(el.dataset.floor===f)el.innerHTML=roomProgressHtml(f);
 });
}

function paint(f){
 const m=get(f),view=m?draw(f,m):(online()?"Loading your private layout…":"Sign in to Daily Life cloud to view your private map.");
 where(f).forEach(el=>{el.innerHTML=view;el.dataset.viewKey=key(f)});
 refreshRoomProgress(f);
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
window.houseVisualOpenDollyModel=function(){
 if(typeof modal!=="function")return;
 if(typeof window.dollyRoomSceneHtml!=="function"){
  modal("Dolly's bedroom","<p>The interactive model has not loaded. Refresh Daily Life and try again.</p>","Close",closeModal);return;
 }
 try{
  modal("Dolly's interactive bedroom · Second floor",
   window.dollyRoomSceneHtml()+'<div class="actions"><button type="button" class="btn" onclick="houseVisualOpenZone(&#39;Second floor&#39;,&#39;dolly&#39;)">← Room details</button></div>',
   "Close",closeModal);
 }catch(e){modal("Dolly's bedroom","<p>Could not open the interactive model. Refresh Daily Life.</p>","Close",closeModal)}
};
window.houseVisualReturnToFloor=function(f){
 if(!floors.includes(f)||typeof modal!=="function")return;
 modal(f+" · Floor map",'<div class="hvm-floor-return">'+window.houseVisualMapHtml(f)+
 '<div class="actions"><button type="button" class="btn" onclick="closeModal()">Close map</button></div></div>',"Close",closeModal);
 Promise.resolve().then(()=>window.houseVisualMapHydrate(f)).catch(()=>{});
};
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
 const name=String(z?.name||room?.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 return (state.tasks||[]).filter(t=>{
  if(t.paused||t.duplicateHidden||t.waitingForFunds)return false;
  if(t.homeMapZoneId||t.homeMapFloor)return String(t.homeMapFloor||"")===f&&String(t.homeMapZoneId||"")===String(z?.id||"");
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
window.houseVisualAddZoneTask=function(f,id){
 const z=zone(f,id);if(!z||typeof openTask!=="function")return;
 const room=localRoom(f,z);
 openTask("","",false,{roomId:room?.id||"",floor:f,zoneId:id,roomName:z.name||"Room"});
};
function markerTaskKey(p,index){
 const id=str(p?.id||"").trim(),label=str(p?.label||"").trim();
 return "house-marker:"+(id||(label?label+"#"+index:"marker-"+index));
}
window.houseVisualAddMarkerTask=function(f,id,index){
 if(!floors.includes(f)||!okId(id)||typeof openTask!=="function")return;
 const z=zone(f,id),p=arr(z?.markers)[Number(index)];if(!z||!p)return;
 const room=localRoom(f,z),objectName=str(p.label||"Mapped object"),objectKey=markerTaskKey(p,index);
 closeModal();
 openTask("","",false,{roomId:room?.id||"",floor:f,zoneId:id,roomName:z.name||"Room",objectName,objectKey});
};
window.houseVisualInteractMarker=function(f,id,index){
 if(!floors.includes(f)||!okId(id)||typeof modal!=="function")return;
 const z=zone(f,id),p=arr(z?.markers)[Number(index)];if(!z||!p)return;
 const objectName=str(p.label||"Mapped object"),objectKey=markerTaskKey(p,index);
 const objectTasks=(state.tasks||[]).filter(t=>!t.duplicateHidden&&!t.paused&&String(t.homeMapFloor||"")===f&&String(t.homeMapZoneId||"")===id&&String(t.homeObjectKey||"")===objectKey);
 const taskList=objectTasks.length?objectTasks.map(t=>'<div class="hvm-object-task-row"><span><b>'+h(t.title||"Task")+'</b><small>'+(t.done?"✓ Complete":"Still to do")+'</small></span>'+(t.done?'':'<button class="btn small primary" type="button" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Done</button>')+'</div>').join(""):'<p class="muted small">No tasks are linked to this object yet.</p>';
 const details='<section class="hvm-object-detail"><span class="hvm-object-icon" aria-hidden="true">✦</span><div><small>IN THIS ROOM</small><h2>'+h(p.label||"Mapped object")+'</h2></div></section>'+
 (p.status?'<p class="hvm-object-status">'+h(p.status)+'</p>':"")+
 (p.note?'<div class="hvm-object-note">'+h(p.note)+'</div>':"")+
 '<section class="hvm-object-tasks"><div><b>Actions for '+h(objectName)+'</b><small>'+objectTasks.length+' linked task'+(objectTasks.length===1?"":"s")+'</small></div>'+taskList+'</section>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualAddMarkerTask(&#39;'+f+'&#39;,&#39;'+id+'&#39;,'+Number(index)+')">＋ Add task for this object</button>'+
 '<button class="btn" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">Open room inventory</button></div>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualOpenZone(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">← Back to room</button>'+
 '<button class="btn" type="button" onclick="houseVisualReturnToFloor(&#39;'+f+'&#39;)">⌂ House map</button></div>';
 modal(h(p.label||"Mapped object")+" · "+h(z.name),'<div class="hvm-object-view">'+details+'</div>',"Close",closeModal);
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
 (pendingTasks.length?pendingTasks.slice(0,12).map(t=>'<div class="hvm-task-row"><span>'+h(t.title)+(t.homeObjectLabel?'<small>↳ '+h(t.homeObjectLabel)+'</small>':"")+'</span><button class="btn small primary" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Done</button></div>').join(""):'<p>No unfinished tracked room tasks yet.</p>')+'</div>'+
 '<div class="hvm-room-inventory"><b>Things in this room · '+inventory.length+' item types</b>'+
 (inventory.length?inventory.slice(0,14).map(x=>'<button type="button" class="hvm-object-row" onclick="openInventoryItem(&#39;'+h(x.id)+'&#39;)"><span>▧</span><span><b>'+h(x.name)+'</b><small>'+(x.quantity!=null?h(x.quantity)+' · ':'')+'Open item details</small></span><span>›</span></button>').join(""):'<p>No local inventory recorded here yet; this does not mean the room is empty.</p>')+'</div>';

 const spots=arr(z.markers).map((p,i)=>'<button type="button" class="hvm-object-row" onclick="houseVisualInteractMarker(&#39;'+f+'&#39;,&#39;'+id+'&#39;,'+i+')"><span>✦</span><span><b>'+h(p.label||"Mapped object")+'</b><small>'+h(p.status||"Tap to inspect this mapped object")+'</small></span><span>›</span></button>').join("");
 const actions='<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualAddZoneTask(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">+ Room task</button>'+
 '<button class="btn" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">'+
 (room?"Open full inventory":"+ Link inventory")+'</button>'+
 '<button class="btn" type="button" onclick="houseVisualReturnToFloor(&#39;'+f+'&#39;)">← Floor map</button></div>';
 const references='<details class="hvm-room-extra"><summary>Reference photos ('+photos.length+') + mapping notes ›</summary>'+
 (photos.length?'<div class="hvm-detail-photos">'+photos.map((p,i)=>'<button type="button" class="hvm-photo-button" onclick="photoInboxView(&#39;'+p+'&#39;,&#39;map&#39;)">📷 Open photo '+(i+1)+' ›</button>').join("")+'</div>':"")+
 (z.notes?'<p>'+h(z.notes)+'</p>':"")+
 '</details>';
 const isDolly=f==="Second floor"&&id==="dolly";
 const miniature=f==="Second floor"&&!isDolly&&typeof window.dailyLifeMiniScene==="function" ? (/bath/i.test(z.name||"") ? window.dailyLifeMiniScene("bathroom") : /hall/i.test(z.name||"") ? window.dailyLifeMiniScene("hallway") : "") : "";
 const furniture=isDolly&&typeof window.dollyRoomSceneHtml==="function"?window.dollyRoomSceneHtml():miniature;
 const modelButton=isDolly?'<button class="btn primary" type="button" onclick="houseVisualOpenDollyModel()">🛏 Open interactive bedroom + furniture layout</button>':'';
 const objectPanel=spots?'<div class="hvm-detail-markers"><strong>Tap an object to interact</strong>'+spots+'</div>':"";
 const markup='<div class="hvm-zone-detail">'+modelButton+furniture+objectPanel+progress+actions+references+'</div>';

 modal(z.name+" · "+f,markup,"Close",closeModal);
};
})();
