/* Private Daily Life house map.
   Personal names, layout, landmarks and photo IDs come from owner-only Supabase records,
   not from this public source file. No measured geometry is inferred. */
(function(){
"use strict";
const floors=["Basement","First floor","Second floor","Third floor"];
const cache=new Map(),pending=new Map();
const personPhotoCache=new Map();
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
function act(f,z){
 if(selectedRoomProfile())return "houseVisualSelectTourRoom('"+f+"','"+z.id+"')";
 const destination=(f==="First floor"&&z.id==="stairs_up")?"Second floor":
  (f==="First floor"&&z.id==="basement_stairs")?"Basement":
  (f==="Second floor"&&z.id==="stairs")?"First floor":
  (f==="Second floor"&&z.id==="stairs_to_third")?"Third floor":"";
 return destination?"houseVisualFollowLink('"+destination+"')":"houseVisualOpenZone('"+f+"','"+z.id+"')";
}
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
 if(f!=="Second floor"||z.id!=="dolly"||typeof window.dollyRoomMapPreviewSvg!=="function")return null;
 const match=window.dollyRoomMapPreviewSvg().match(/<svg\b[^>]*viewBox=["']([^"']+)["'][^>]*>([\s\S]*?)<\/svg>/i);
 if(!match)return null;
 // The saved Dolly plan supplies furniture positions. The floor-zone path is
 // the room boundary, so drop the miniature's duplicate floor and wall frame.
 const markup=match[2]
  .replace(/<rect x="0" y="0" width="300" height="260" fill="#f8f0e8" stroke="#ad8ba9" stroke-width="5"\/>/,"")
  .replace(/<path d="M0 0H300V260H0Z" fill="none" stroke="#7f667d" stroke-width="7"\/>/,"")
  .replace(/<text x="180" y="18"[^>]*>Vanity window<\/text>/,"")
  .replace(/<text x="10" y="70"[^>]*>Footboard window<\/text>/,"")
  .replace(/<text x="291" y="189"[^>]*>Entry<\/text>/,"")
  .replace(/<text x="60" y="18"[^>]*>Mario poster<\/text>/,"");
 return {viewBox:match[1],markup,kind:"dolly"};
}
function inlineRoomPreview(f,z,bounds){
 const source=previewSource(f,z);
 if(!source||!bounds||bounds.width<48||bounds.height<48)return "";
 const view=String(source.viewBox||"").split(/\s+/).map(Number);
 if(view.length!==4||view[2]<=0||view[3]<=0)return "";
 const maxW=bounds.width*.99,maxH=bounds.height*.96;
 const scale=Math.min(maxW/view[2],maxH/view[3]);
 if(!Number.isFinite(scale)||scale<.16)return "";
 const width=view[2]*scale,height=view[3]*scale;
 const x=bounds.cx-width/2,y=bounds.cy-height/2;
 return '<svg class="hvm-inline-room-preview" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+width.toFixed(1)+'" height="'+height.toFixed(1)+'" viewBox="'+h(source.viewBox)+'" preserveAspectRatio="xMidYMid meet" aria-label="Dolly bedroom saved furniture layout" focusable="false" pointer-events="auto">'+source.markup+'</svg>';
}
function zoneFloorGraphic(f,z,bounds){
 if(f!=="Second floor"||!bounds)return "";
 if(z.id!=="stairs"&&!/stairs/i.test(z.name||""))return "";
 const left=bounds.x+bounds.width*.24,right=bounds.x+bounds.width*.76;
 const top=bounds.y+bounds.height*.34,bottom=bounds.y+bounds.height*.82;
 const count=6,step=(bottom-top)/(count-1);
 const treads=Array.from({length:count},(_,i)=>{
  const y=top+i*step;
  return '<path d="M'+left.toFixed(1)+' '+y.toFixed(1)+'H'+right.toFixed(1)+'" stroke="#805c47" stroke-width="5" stroke-linecap="round"/>';
 }).join("");
 return '<g class="hvm-stair-plan" aria-label="Stair treads inside stair footprint" pointer-events="none">'+
  '<rect x="'+(left-7).toFixed(1)+'" y="'+(top-8).toFixed(1)+'" width="'+(right-left+14).toFixed(1)+'" height="'+(bottom-top+16).toFixed(1)+'" rx="5" fill="#c9a17b" stroke="#8c6a55" stroke-width="2"/>'+treads+'</g>';
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
  const isStair=f==="Second floor"&&(z.id==="stairs"||/stairs/i.test(z.name||""));
  const labelY=(preview||isStair)&&bounds?bounds.y+16:Math.max(limits[1],Math.min(limits[1]+limits[3],y));
  const baseFill=z.id==="dolly"&&f==="Second floor"?"#f8f0e8":color(z.color);
  const floorGraphic=zoneFloorGraphic(f,z,bounds);
  return '<g class="hvm-zone'+(preview?' has-inline-preview':'')+(isStair?' hvm-stair-zone':'')+'" role="button" tabindex="0" onclick="'+onclick+
  '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+onclick+'}" aria-label="Open '+h(z.name)+'">'+
  '<path d="'+h(z.path)+'" fill="'+baseFill+'" stroke="#6e6478" stroke-width="3" stroke-linejoin="round"/>'+
  preview+floorGraphic+(preview?'':'<text class="hvm-room-name" text-anchor="middle" x="'+labelX.toFixed(1)+'" y="'+labelY.toFixed(1)+'">'+h(z.short||z.name)+'</text>')+'</g>';
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
 return '<div class="hvm-directory"><div class="hvm-directory-heading"><strong>'+h(f==='Second floor'?'Second floor rooms':(m.title||f))+'</strong><small>Tap a room to enter, then explore its mapped items. Use Previous and Next to tour the floor.</small></div>'+
 '<div class="hvm-directory-grid">'+arr(m.zones).filter(z=>okId(z.id)).map(z=>{
 const photos=arr(z.photos).filter(okPhoto);
 return '<button type="button" class="hvm-room-tile hvm-photo-room-tile" data-room-id="'+h(z.id)+'" style="--hvm-zone:'+color(z.color)+'" onclick="'+act(f,z)+'">'+
 '<span class="hvm-room-tile-photo" data-room-photo-zone="'+h(z.id)+'" aria-hidden="true"><span class="hvm-tile-mark">⌂</span></span>'+
 '<b>'+h(z.name)+'</b><small>'+photos.length+' saved photo'+(photos.length===1?'':'s')+'</small>'+
 '<span class="hvm-tile-open">'+(z.id==="stairs_up"?"Go upstairs ›":z.id==="stairs_to_third"?"Go to third floor ›":"Enter room ›")+'</span></button>';
 }).join("")+'</div></div>';
}
async function hydrateRoomDirectoryPhotos(f,m){
 if(!online()||!m)return;
 const zones=arr(m.zones).filter(z=>okId(z.id));
 const refs=zones.map(z=>({zone:z,id:arr(z.photos).find(okPhoto)||null}));
 if(refs.some(x=>!x.id)){
  try{
   const {data}=await cloudClient.from("photo_inbox").select("id,title,notes,created_at")
    .in("category",["house_map","home_progress"]).eq("floor_label",f)
    .order("created_at",{ascending:false}).limit(100);
   const saved=data||[];
   for(const ref of refs){
    if(ref.id)continue;
    const name=str(ref.zone.name).trim().toLowerCase();
    let match=name?saved.find(p=>okPhoto(p.id)&&(str(p.title)+" "+str(p.notes)).toLowerCase().includes(name)):null;
    if(!match&&name.includes("bath"))match=saved.find(p=>okPhoto(p.id)&&/bath/i.test(str(p.title)+" "+str(p.notes)));
    ref.id=match?.id||null;
   }
  }catch(e){}
 }
 const ids=refs.map(x=>x.id).filter(Boolean);
 if(!ids.length)return;
 try{
  const {data}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",ids);
  for(const row of data||[]){
   if(!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(row.image_data||""))continue;
   const zone=refs.find(x=>x.id===row.id)?.zone;
   const host=zone&&Array.from(document.querySelectorAll("[data-room-photo-zone]")).find(node=>node.dataset.roomPhotoZone===String(zone.id));
   if(host){const img=document.createElement("img");img.alt="";img.src=row.image_data;host.replaceChildren(img);}
  }
 }catch(e){}
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

function selectedRoomProfile(){
 if(typeof lifeSimRoster!=="function"||typeof lifeSimSelectedId!=="function")return null;
 const roster=lifeSimRoster(),id=lifeSimSelectedId(roster);
 const person=roster.find(person=>String(person.id)===String(id))||null;
 return person?{...person,isSelf:String(id)==="self"}:null;
}
function personRoomPhotoMarkup(photo,index,total,person,f,z){
 const title=str(photo.title),text=(title+" "+str(photo.notes)).toLowerCase(),isDolly=/^dolly$/i.test(str(person?.name));
 let hotspots=[];
 if(isDolly){
  const kind=/room overview/i.test(title)?"overview":/dresser and bed/i.test(title)?"dresser":/bed · folded laundry/i.test(title)?"bed":"overview";
  hotspots=kind==="overview"?[["bed","Bed",18,73],["vanity","Vanity",58,51],["dollhouse","Playhouse",75,66]]:
   kind==="dresser"?[["dresser","Dresser",18,52],["bed","Bed",70,56]]:[["bed","Bed",50,55]];
 }else{
  if(/dresser/.test(text))hotspots.push(["dresser","Dresser",22,58]);
  if(/vanity/.test(text))hotspots.push(["vanity","Vanity",62,48]);
  if(/chair/.test(text))hotspots.push(["chair","Chair + laundry",50,70]);
  if(/bed|bedroom/.test(text)||!hotspots.length)hotspots.push(["bed","Bed",55,58]);
 }
 const scene='<div class="hvm-room-scene"><img src="'+h(photo.image_data)+'" alt="'+h(title)+'">'+hotspots.map(([key,label,x,y])=>
  '<button type="button" class="hvm-room-hotspot" style="left:'+x+'%;top:'+y+'%" aria-label="Open '+h(person?.name||"room")+'’s '+h(label.toLowerCase())+' details" onclick="houseVisualInspectPersonItem(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,&#39;'+h(key)+'&#39;)"><span aria-hidden="true">✦</span><b>'+h(label)+'</b></button>'
 ).join("")+'</div>';
 return scene+'<div class="hvm-room-photo-nav"><button type="button" class="btn small" '+(index<=0?'disabled':'')+' onclick="houseVisualPersonPhotoStep(-1)">‹ Previous view</button><span><b>'+h(title)+'</b><small>View '+(index+1)+' of '+total+' · tap a room label to inspect</small></span><button type="button" class="btn small" '+(index>=total-1?'disabled':'')+' onclick="houseVisualPersonPhotoStep(1)">Next view ›</button></div>';
}
async function hydratePersonRoomPhotoTour(){
 const host=document.querySelector('[data-person-photo-tour]');
 if(!host||!online())return;
 const person=selectedRoomProfile(),floor=host.dataset.floor||"Second floor",zoneId=host.dataset.zone||"",z=zone(floor,zoneId);
 if(!person||!z)return;
 const cacheKey=str(person.id||person.name).toLowerCase()+"|"+floor+"|"+zoneId;
 let photos=personPhotoCache.get(cacheKey);
 if(!photos){
  try{
   const {data,error}=await cloudClient.from("photo_inbox").select("id,title,notes,created_at")
    .in("category",["home_progress","house_map"]).eq("floor_label",floor)
    .order("created_at",{ascending:true}).limit(100);
   if(error)throw error;
   const normalize=value=>str(value).toLowerCase().replace(/[^a-z0-9]/g,"");
   const name=normalize(person.name),isSelf=!!person.isSelf;
   const rows=(data||[]).filter(p=>{
    if(!okPhoto(p.id)||p.category!=="home_progress")return false;
    const all=str(p.title)+" "+str(p.notes),normalized=normalize(all);
    return isSelf?/bedroom|upstairs bedroom/i.test(all):name&&normalized.includes(name)&&/bedroom|bed|room|chair/i.test(all);
   });
   const priority=p=>/room overview/i.test(str(p.title))?0:/dresser and bed/i.test(str(p.title))?1:/bedroom/i.test(str(p.title))?2:3;
   rows.sort((a,b)=>priority(a)-priority(b)||str(a.created_at).localeCompare(str(b.created_at)));
   const ids=rows.map(p=>p.id);
   if(!ids.length)throw Error("No room photos found");
   const {data:images,error:imageError}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",ids);
   if(imageError)throw imageError;
   const byId=new Map((images||[]).filter(p=>/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(p.image_data||"")).map(p=>[p.id,p.image_data]));
   photos=rows.filter(p=>byId.has(p.id)).map(p=>({...p,image_data:byId.get(p.id)}));
   if(!photos.length)throw Error("Room images could not be loaded");
   personPhotoCache.set(cacheKey,photos);
  }catch(e){const frame=host.querySelector(".hvm-person-room-photo");if(frame)frame.textContent="No saved room photos for "+str(person.name)+" yet. Add photos from House · Add photos.";return}
 }
 const index=Math.max(0,Math.min(photos.length-1,Number(host.dataset.photoIndex)||0));
 host.dataset.photoIndex=String(index);
 const frame=host.querySelector(".hvm-person-room-photo");
 if(frame)frame.outerHTML='<div class="hvm-person-room-photo hvm-person-room-photo-live">'+personRoomPhotoMarkup(photos[index],index,photos.length,person,floor,z)+'</div>';
}
window.houseVisualPersonPhotoStep=function(delta){
 const host=document.querySelector('[data-person-photo-tour]'),person=selectedRoomProfile();
 const photos=host&&person?personPhotoCache.get(str(person.id||person.name).toLowerCase()+"|"+host.dataset.floor+"|"+host.dataset.zone)||[]:[];
 if(!host||!photos.length)return;
 host.dataset.photoIndex=String(Math.max(0,Math.min(photos.length-1,(Number(host.dataset.photoIndex)||0)+Number(delta||0))));
 Promise.resolve().then(()=>hydratePersonRoomPhotoTour());
};
window.houseVisualInspectPersonItem=function(f,id,item){
 const person=selectedRoomProfile(),z=zone(f,id);if(!z)return;
 if(String(person?.name||"").toLowerCase()==="dolly"&&typeof dollyOpenObject==="function"){dollyOpenObject(item);return}
 window.houseVisualInventoryOpen(f,id);
};
function personRoomHome(f,z){
 const person=selectedRoomProfile(),room=localRoom(f,z),tasks=trackedRoomTasks(f,z,room),done=tasks.filter(t=>t.done).length;
 const today=(state.tasks||[]).filter(t=>t.date===ymd()&&!t.paused&&!t.waitingForFunds&&String(t.child||"").trim().toLowerCase()===String(person?.name||"").trim().toLowerCase());
 const todayDone=today.filter(t=>t.done).length;
 const photo='<div class="hvm-person-photo-tour" data-person-photo-tour="'+h(person?.id||person?.name||"profile")+'" data-floor="'+h(f)+'" data-zone="'+h(z.id)+'"><div class="hvm-person-room-photo"><span>Loading '+h(person?.name||"room")+' room views…</span></div></div>';
 const objects=
  (arr(z.markers).length?'<div class="hvm-person-room-objects">'+arr(z.markers).map((p,i)=>'<button type="button" class="hvm-person-object" onclick="houseVisualInteractMarker(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,'+i+')"><span>✦</span><b>'+h(p.label||"Room item")+'</b><small>'+h(p.status||"Tap to inspect")+'</small></button>').join("")+'</div>':"");
 const roomTasks=tasks.filter(t=>!t.done).slice(0,5).map(t=>'<div class="hvm-task-row"><span>'+h(t.title)+'</span><button type="button" class="btn small primary" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">✓ Done</button></div>').join("");
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),index=zones.findIndex(item=>item.id===z.id);
 const tour='<nav class="hvm-person-tour-nav" aria-label="House tour navigation"><button type="button" class="btn" '+(index<=0?'disabled':'')+' onclick="houseVisualPersonTourStep(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,-1)">‹ Previous room</button><span><b>Room tour</b><small>'+(index+1)+' of '+zones.length+' · '+h(f)+'</small></span><button type="button" class="btn" '+(index<0||index>=zones.length-1?'disabled':'')+' onclick="houseVisualPersonTourStep(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,1)">Next room ›</button></nav>';
 return '<section class="hvm-person-room-home" aria-label="'+h(person?.name||z.name)+' bedroom home">'+
  '<header class="hvm-person-room-heading"><div><small>'+h((person?.name||z.name).toUpperCase())+'’S HOUSE TOUR · '+h(f.toUpperCase())+'</small><h3>'+h(z.name||"Room")+'</h3></div><button type="button" class="btn small" onclick="houseVisualBrowseFloor()">Browse floor ›</button></header>'+tour+photo+objects+
  '<div class="hvm-person-room-stats"><div><small>TODAY</small><b>'+(today.length?todayDone+' of '+today.length+' tasks done':"No tasks assigned today")+'</b></div><div><small>ROOM TASKS</small><b>'+(tasks.length?done+' of '+tasks.length+' complete':"No room tasks logged")+'</b></div></div>'+
  '<section class="hvm-person-room-task-list"><div class="hvm-person-room-task-heading"><b>Room tasks</b><button type="button" class="btn small" onclick="houseVisualAddZoneTask(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">＋ Add</button></div>'+
  (roomTasks||'<p class="muted small">No unfinished room tasks. Progress reflects completed tasks, not how clean the room looks.</p>')+'</section>'+
  '<button type="button" class="btn hvm-person-room-inventory" onclick="houseVisualInventoryOpen(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">Open '+h(person?.name||z.name)+'’s room inventory ›</button></section>';
}
function floorView(f,m){
 const person=selectedRoomProfile();
 let browsing=false;try{browsing=localStorage.getItem("dailyLifeMapBrowseRooms")==="1"}catch(e){}
 if(person&&!browsing){
  let z=null;
  try{const saved=JSON.parse(localStorage.getItem("dailyLifeMapTourRoom")||"null");if(saved?.floor===f)z=arr(m.zones).find(item=>item&&item.id===saved.id)||null}catch(e){}
  z=z||personRoomZone(f,person.name,!!person.isSelf);
  if(z)return personRoomHome(f,z)
 }
 if(person&&browsing)return '<div class="hvm-person-room-browse"><button type="button" class="btn small" onclick="houseVisualFocusPersonRoom()">← '+h(person.name)+'’s room</button>'+directory(f,m)+'</div>';
 return directory(f,m)
}
window.houseVisualBrowseFloor=function(){try{localStorage.setItem("dailyLifeMapBrowseRooms","1")}catch(e){};render()};
window.houseVisualFocusPersonRoom=function(){try{localStorage.removeItem("dailyLifeMapBrowseRooms")}catch(e){};render()};
window.houseVisualSelectTourRoom=function(f,id){
 if(!floors.includes(f)||!okId(id))return;
 try{
  localStorage.setItem("dailyLifeMapFirstFloor",f);
  localStorage.setItem("dailyLifeMapBrowseRooms","0");
  localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({floor:f,id}));
 }catch(e){}
 if(typeof homeSetMapFloor==="function")homeSetMapFloor(f);
 render();
 window.scrollTo(0,0);
};
window.houseVisualPersonTourStep=function(f,id,delta){
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),index=zones.findIndex(item=>item.id===id),next=zones[index+Number(delta)];
 if(!next)return;
 window.houseVisualSelectTourRoom(f,next.id);
 document.querySelector(".hvm-person-room-home")?.scrollIntoView({behavior:"smooth",block:"start"});
};
function paint(f){
 const m=get(f),view=m?floorView(f,m):(online()?"Loading your private layout…":"Sign in to Daily Life cloud to view your private map.");
 where(f).forEach(el=>{el.innerHTML=view;el.dataset.viewKey=key(f)});
 if(m)hydrateRoomDirectoryPhotos(f,m);
 if(selectedRoomProfile())hydratePersonRoomPhotoTour();
 refreshRoomProgress(f);
}
window.houseVisualMapHtml=function(f){
 if(!floors.includes(f))f="First floor";
 Promise.resolve().then(()=>window.houseVisualMapHydrate(f)).catch(()=>{});
 return '<section class="hvm-root" data-floor="'+h(f)+'">'+
 (get(f)?floorView(f,get(f)):(online()?"Loading private room map…":"Sign in to view your private room map."))+'</section>';
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
function personRoomZone(f,name,isSelf){
 const normalize=value=>str(value).toLowerCase().replace(/[^a-z0-9]/g,"");
 const person=normalize(name),aliases=person==="demitri"?["demitri","dimitri"]:[person];
 const zones=arr(get(f)?.zones).filter(z=>okId(z.id));
 const direct=zones.find(z=>{
  const label=normalize(z.name)+" "+normalize(z.short||"");
  return aliases.some(alias=>alias&&label.includes(alias));
 });
 if(direct)return direct;
 if(isSelf){
  const bedroom=zones.find(z=>/mom|master|primary|michelle/i.test(str(z.name)+" "+str(z.short))&&/room|bed/i.test(str(z.name)+" "+str(z.short)));
  if(bedroom)return bedroom;
  const bedrooms=zones.filter(z=>/bed(room)?/i.test(str(z.name)+" "+str(z.short)));
  if(bedrooms.length===1)return bedrooms[0];
 }
 return null;
}
window.houseVisualGoToPersonRoom=async function(name,isSelf=false){
 const floor=isSelf?"Third floor":"Second floor";
 try{
  localStorage.removeItem("dailyLifeMapBrowseRooms");
  localStorage.setItem("dailyLifeMapFirstFloor",floor);
  localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({floor,id:""}));
 }catch(e){}
 if(typeof setView==="function")setView("household");
 if(typeof homeSetMapFloor==="function")homeSetMapFloor(floor);
 try{
  await window.houseVisualMapHydrate(floor);
  const z=personRoomZone(floor,name,isSelf);
  if(z){try{localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({floor,id:z.id}))}catch(e){};render();window.scrollTo(0,0);return}
  if(typeof homeSetMapFloor==="function")homeSetMapFloor(floor);
 }catch(e){}
};
window.houseVisualTourStep=function(f,id,delta){
 const zones=arr(get(f)?.zones).filter(z=>z&&okId(z.id));
 const index=zones.findIndex(z=>z.id===id),next=index+Number(delta);
 if(next<0||next>=zones.length)return;
 window.houseVisualOpenZone(f,zones[next].id);
};
window.houseVisualInventoryOpen=function(f,id){
 const z=zone(f,id);if(!z)return;
 const room=localRoom(f,z);
 if(room&&typeof homeOpenRoomInventory==="function"){homeOpenRoomInventory(room.id);return}
 if(typeof openInventoryHubSection==="function"){openInventoryHubSection("items");return}
 if(typeof setView==="function"){setView("inventory");return}
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


let activeRoomPhotoIds=[],activeRoomPhotoIndex=0,activeRoomPhotoRoom="";
window.houseVisualNavigateRoomPhoto=function(step){
 if(!activeRoomPhotoIds.length)return;
 activeRoomPhotoIndex=(activeRoomPhotoIndex+Number(step)+activeRoomPhotoIds.length)%activeRoomPhotoIds.length;
 window.houseVisualShowRoomPhoto(activeRoomPhotoIds[activeRoomPhotoIndex],activeRoomPhotoIndex,activeRoomPhotoIds.length);
};
window.houseVisualShowRoomPhoto=async function(photoId,index=0,total=activeRoomPhotoIds.length){
 const stage=document.getElementById("hvmRoomPhotoStage");
 if(!stage||!okPhoto(photoId)||!online())return;
 activeRoomPhotoIndex=Math.max(0,Number(index)||0);
 stage.textContent="Loading saved room photo…";
 const {data,error}=await cloudClient.from("photo_inbox").select("image_data,title").eq("id",photoId).single();
 const current=document.getElementById("hvmRoomPhotoStage");if(!current)return;
 if(error||!data||!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(data.image_data||"")){
  current.textContent="This saved photo could not be displayed.";return;
 }
 const img=document.createElement("img");
 img.alt=(data.title||activeRoomPhotoRoom)+" · photo "+(activeRoomPhotoIndex+1)+" of "+total;
 img.src=data.image_data;current.replaceChildren(img);
 const caption=document.getElementById("hvmRoomPhotoCaption");
 let title=str(data.title||"").trim();
 if(/^\d{10,}\.(jpe?g|png|webp)$/i.test(title))title="";
 if(/upstairs bathroom/i.test(title)&&/photo/i.test(title))title="Upstairs bathroom · Photo "+(activeRoomPhotoIndex+1)+" of "+total;
 if(caption)caption.textContent=title||activeRoomPhotoRoom+" · Photo "+(activeRoomPhotoIndex+1)+" of "+total;
 const count=document.getElementById("hvmRoomPhotoCount");
 if(count)count.textContent="Photo "+(activeRoomPhotoIndex+1)+" of "+total;
};
async function hydrateRoomPhotoGallery(f,z){
 const host=document.getElementById("hvmRoomPhotoGallery");if(!host)return;
 if(!online()){host.textContent="Sign in to see saved room photos.";return}
 let photos=arr(z.photos).filter(okPhoto).map(id=>({id}));
 if(/bath/i.test(str(z.name||""))){
  const {data,error}=await cloudClient.from("photo_inbox").select("id,title,notes,created_at")
   .in("category",["house_map","home_progress"]).eq("floor_label",f).order("created_at",{ascending:false}).limit(100);
  if(error){host.textContent="Could not load saved bathroom photos.";return}
  photos=(data||[]).filter(p=>/bath/i.test(str(p.title)+" "+str(p.notes))&&okPhoto(p.id));
 }
 if(!photos.length){host.innerHTML='<p class="muted">No room photos are linked here yet.</p>';return}
 activeRoomPhotoIds=photos.map(p=>p.id);activeRoomPhotoIndex=0;activeRoomPhotoRoom=str(z.name||"Room");
 host.innerHTML='<div class="hvm-photo-gallery"><div class="hvm-room-photo-frame"><div id="hvmRoomPhotoStage" class="hvm-room-photo-stage">Loading saved room photo…</div></div><div id="hvmRoomPhotoCaption" class="hvm-room-photo-caption"></div><div class="hvm-room-photo-picker" aria-label="Browse saved '+h(z.name||"room")+' photos">'+
  '<button type="button" class="btn small" onclick="houseVisualNavigateRoomPhoto(-1)" aria-label="Previous room photo">‹ Previous</button><span id="hvmRoomPhotoCount" class="hvm-room-photo-count">Photo 1 of '+photos.length+'</span><button type="button" class="btn small" onclick="houseVisualNavigateRoomPhoto(1)" aria-label="Next room photo">Next ›</button>'+
  '</div><small class="muted">'+photos.length+' saved photo'+(photos.length===1?'':'s')+' · use Previous and Next to browse</small></div>';
 window.houseVisualShowRoomPhoto(photos[0].id,0,photos.length);
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
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),zoneIndex=zones.findIndex(item=>item.id===id);
 const tour='<section class="hvm-tour-nav" aria-label="Room tour"><div><b>Room tour</b><small>'+(zoneIndex+1)+' of '+zones.length+' rooms · tap mapped items to inspect them</small></div><div class="hvm-detail-actions"><button class="btn" type="button" '+(zoneIndex<=0?'disabled':'')+' onclick="houseVisualTourStep(&#39;'+f+'&#39;,&#39;'+id+'&#39;,-1)">‹ Previous room</button><button class="btn" type="button" '+(zoneIndex<0||zoneIndex>=zones.length-1?'disabled':'')+' onclick="houseVisualTourStep(&#39;'+f+'&#39;,&#39;'+id+'&#39;,1)">Next room ›</button></div></section>';
 const interactiveRoom=f==="Second floor"&&id==="dolly"?'<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualOpenDollyModel()">Enter clickable bedroom ›</button></div>':"";
 const actions='<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualAddZoneTask(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">+ Room task</button>'+
 '<button class="btn" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">'+
 (room?"Open full inventory":"Browse inventory")+'</button>'+
 '<button class="btn" type="button" onclick="houseVisualReturnToFloor(&#39;'+f+'&#39;)">← Floor map</button></div>';
 const references='<details class="hvm-room-extra"><summary>Room notes ›</summary>'+
 (photos.length?'<p>Photos are shown above.</p>':'<p>No saved room photos have been linked here yet.</p>')+
 (z.notes?'<p>'+h(z.notes)+'</p>':"")+
 '</details>';
 const roomPhotos='<section id="hvmRoomPhotoGallery" class="hvm-room-photo-gallery"><p>Loading your saved room photos…</p></section>';
 const objectPanel=spots?'<div class="hvm-detail-markers"><strong>Tap an object to interact</strong>'+spots+'</div>':"";
 const markup='<div class="hvm-zone-detail">'+roomPhotos+tour+interactiveRoom+objectPanel+inventory+progress+actions+references+'</div>';

 modal(z.name+" · "+f,markup,"Close",closeModal);
 Promise.resolve().then(()=>hydrateRoomPhotoGallery(f,z));
};
})();
