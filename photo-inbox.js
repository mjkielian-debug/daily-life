/* Private photo inbox for Paper Studio, inventory, and house mapping.
   Authenticated Supabase RLS; no public URLs, GitHub uploads or auto-generated inventory facts. */
(function(){
"use strict";
const CATEGORIES={paper:"🗂 Paper sorting",inventory:"📦 Inventory",house_map:"⌂ House map",home_progress:"🧹 Before + progress"};
const FLOORS=["Basement","First floor","Second floor","Third floor"];
let inboxMode="paper",floorView="First floor",inboxBusy=false,prefillAreaId="";
function cloudReady(){return typeof cloudClient!=="undefined"&&!!cloudClient&&typeof cloudUser==="function"&&!!cloudUser()}
function sanitized(x,max=260){return String(x||"").trim().slice(0,max)}
function notice(s){const e=document.getElementById("photoInboxStatus");if(e)e.textContent=s;}
async function resize(file){
 if(!file?.type?.startsWith("image/")||file.size>22*1024*1024)throw Error("Use an image under 22 MB.");
 const bmp=await createImageBitmap(file);try{
  let max=2400,q=.84,data="",w=1,h=1;
  for(let i=0;i<8;i++){
   const scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
   w=Math.max(1,Math.round(bmp.width*scale));h=Math.max(1,Math.round(bmp.height*scale));
   const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("Cannot prepare picture");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(bmp,0,0,w,h);
   data=canvas.toDataURL("image/jpeg",q);
   if(data.length<=2600000)break;
   if(q>.58)q-=.08;else max=Math.floor(max*.81);
  }
  if(data.length>2600000||!data.startsWith("data:image/jpeg;base64,"))throw Error("Photo too large to upload.");
  return {data,width:w,height:h};
 }finally{bmp.close?.()}
}
function authMessage(){
 return '<div class="pi-help"><b>Private photo inbox</b><p>Sign in to Daily Life cloud to send photos for review. Your pictures are visible only to your signed-in account in the app, and can be retrieved by ChatGPT through your connected Daily Life project when you ask.</p><button class="btn primary" onclick="openCloudAuth()">Sign in to Daily Life cloud</button></div>';
}
function floorSelect(value){
 return '<label>Floor (for maps)<select id="piFloor">'+FLOORS.map(f=>'<option '+(f===value?"selected":"")+'>'+f+'</option>').join("")+'</select></label>';
}
window.openPhotoInbox=function(mode="paper",areaId=""){
 inboxMode=CATEGORIES[mode]?mode:"paper";prefillAreaId=/^[a-f\d-]{36}$/i.test(String(areaId||""))?areaId:"";
 const signed=cloudReady();
 modal("📷 Private photo inbox",'<div class="pi-main">'+
 (signed?'<div class="pi-help"><b>Photograph → send → ask me to review</b><p>Send paper stacks, room contents, labels, shelves or your robot-vacuum map. Photos are private, not published or automatically analyzed. After uploading, return to ChatGPT and say <b>“Check my Daily Life Photo Inbox.”</b></p></div>'+
 '<div class="pi-form"><label>What are these pictures for?<select id="piMode">'+Object.entries(CATEGORIES).map(([k,v])=>'<option value="'+k+'" '+(k===inboxMode?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 floorSelect(floorView)+
 '<div class="pi-area-fields"><label>Area (for before/progress photos)<select id="piArea"><option value="">General inbox / choose later</option></select></label><label>Photo stage<select id="piPhase"><option value="before">Before</option><option value="progress">Progress / during</option><option value="after">After</option><option value="reference">Reference</option></select></label></div>'+ '<label>Short label (optional)<input id="piTitle" maxlength="100" placeholder="e.g. living room shelves, school folder"></label>'+
 '<label>Notes / what you want help with (optional)<textarea id="piNotes" rows="2" maxlength="1500" placeholder="What should I identify or organize?"></textarea></label>'+
 '<label>Take a new picture<input id="piCamera" type="file" accept="image/*" capture="environment"></label>'+ 
 '<label>Or choose several from gallery<input id="piFiles" type="file" accept="image/*" multiple></label>'+
 '<p class="pi-muted">Up to 10 images per batch. Pictures are compressed for upload; check that small handwriting remains readable before recycling paper.</p>'+
 '<button class="btn primary pi-submit" type="button" onclick="photoInboxSubmit()">↑ Send pictures for review</button><p id="photoInboxStatus" role="status" aria-live="polite"></p></div>':authMessage())+
 '<div class="pi-list-head"><b>Previously sent</b><button class="btn small" onclick="openHomeAreaProjects()">🧹 Cleanup areas</button><button class="btn small" type="button" onclick="photoInboxLoadList()">Refresh</button></div>'+
 '<div id="photoInboxList">'+(signed?'<p class="pi-muted">Loading private photos…</p>':'<p class="pi-muted">Sign in to view your private inbox.</p>')+'</div>'+
 '<p class="pi-muted">Upload here rather than placing private papers in public GitHub files. You control when to ask ChatGPT to review the inbox.</p></div>',
 "Close",closeModal);
 if(signed)Promise.resolve().then(async()=>{await window.photoInboxLoadAreas();await window.photoInboxLoadList()});
};
window.photoInboxSubmit=async function(){
 if(inboxBusy||!cloudReady())return;
 const input=document.getElementById("piFiles"),camera=document.getElementById("piCamera"),files=[...Array.from(camera?.files||[]),...Array.from(input?.files||[])];
 if(!files.length){notice("Select at least one picture first.");return}
 if(files.length>10){notice("Choose up to 10 pictures at a time.");return}
 const category=document.getElementById("piMode")?.value||inboxMode;
 if(!CATEGORIES[category])return;
 const floor=document.getElementById("piFloor")?.value||"";
 const title=sanitized(document.getElementById("piTitle")?.value);
 const notes=sanitized(document.getElementById("piNotes")?.value,1500);
 const areaId=document.getElementById("piArea")?.value||null;
 const phase=category==="home_progress"?(document.getElementById("piPhase")?.value||"before"):"reference";
 inboxBusy=true;let done=0;
 const btn=document.querySelector(".pi-submit");if(btn)btn.disabled=true;
 try{
  for(const file of files){
   notice("Preparing and uploading "+(done+1)+" of "+files.length+"…");
   const img=await resize(file);
   const {error}=await cloudClient.from("photo_inbox").insert({
    owner_user_id:cloudUser().id,category,title:title||sanitized(file.name),
    notes,floor_label:(category==="house_map"||category==="home_progress")?floor:"",status:"new",area_id:areaId,phase,
    image_mime:"image/jpeg",image_data:img.data,width:img.width,height:img.height
   });
   if(error)throw Error(error.message||"Cloud upload failed");
   done++;
  }
  notice("✓ "+done+" picture"+(done===1?"":"s")+" securely uploaded. Return to ChatGPT and ask: “Check my Daily Life Photo Inbox.”");
  input.value="";if(camera)camera.value="";await window.photoInboxLoadList(false);
 }catch(e){notice(done+" uploaded. Upload stopped: "+String(e?.message||e)+". Any successfully sent photos remain in your inbox.")}
 finally{inboxBusy=false;if(btn)btn.disabled=false}
};

window.photoInboxLoadAreas=async function(){
 if(!cloudReady())return;
 const target=document.getElementById("piArea");if(!target)return;
 const {data,error}=await cloudClient.from("home_area_projects").select("id,area_name,floor_label").order("updated_at",{ascending:false}).limit(100);
 if(error){notice("Could not load cleanup areas: "+error.message);return}
 const items=(data||[]).filter(x=>/^[a-f\d-]{36}$/i.test(x.id));
 target.innerHTML='<option value="">General inbox / choose later</option>'+
 items.map(x=>'<option value="'+x.id+'" '+(x.id===prefillAreaId?"selected":"")+'>'+esc(x.area_name||"Area")+' · '+esc(x.floor_label||"Floor not set")+'</option>').join("");
 if(prefillAreaId&&items.some(x=>x.id===prefillAreaId)){
  document.getElementById("piMode").value="home_progress";
  const floor=items.find(x=>x.id===prefillAreaId)?.floor_label;
  if(floor)document.getElementById("piFloor").value=floor;
  document.getElementById("piTitle").value=items.find(x=>x.id===prefillAreaId)?.area_name||"";
 }
};
window.photoInboxLoadList=async function(showLoading=true){
 const el=document.getElementById("photoInboxList");if(!el||!cloudReady())return;
 if(showLoading)el.innerHTML='<p class="pi-muted">Loading…</p>';
 const {data,error}=await cloudClient.from("photo_inbox")
  .select("id,category,title,notes,floor_label,status,created_at,width,height,area_id,phase")
  .order("created_at",{ascending:false}).limit(100);
 if(!document.getElementById("photoInboxList"))return;
 if(error){el.textContent="Could not load inbox: "+error.message;return}
 el.innerHTML=(data||[]).map(row=>
 '<div class="pi-item"><span><b>'+esc(CATEGORIES[row.category]||row.category)+' · '+esc(row.title||"Untitled")+'</b><small>'+new Date(row.created_at).toLocaleDateString()+
 (row.floor_label?" · "+esc(row.floor_label):"")+' · '+esc(row.status)+'</small></span>'+
 '<div class="pi-item-actions"><button class="btn small" onclick="photoInboxView(\''+row.id+'\')">View</button>'+
 '<button class="btn small" onclick="photoInboxDelete(\''+row.id+'\')">Delete</button></div></div>').join("")||'<p class="pi-muted">No photos sent yet. Upload a few above.</p>';
};
window.photoInboxView=async function(id,returnTo="inbox"){
 if(!cloudReady()||!/^[a-f0-9-]{36}$/i.test(id))return;
 const {data,error}=await cloudClient.from("photo_inbox").select("image_data,title,notes,category,floor_label").eq("id",id).single();
 if(error||!data){alert("Could not open private picture.");return}
 const backToFloor=returnTo==="map"&&FLOORS.includes(data.floor_label);
 const backButton=backToFloor?
  '<button class="btn" onclick="openHouseFloorMap(\''+data.floor_label+'\')">‹ Back to floor map</button>':
  '<button class="btn" onclick="openPhotoInbox(\''+(CATEGORIES[data.category]?data.category:"paper")+'\')">‹ Inbox</button>';
 modal("Private photo · "+String(data.title||"").slice(0,70),
 '<div class="pi-preview"><div id="piPrivateImage"></div>'+
 '<p>'+esc(data.notes||"")+'</p><p class="pi-muted">'+esc(CATEGORIES[data.category]||data.category)+(data.floor_label?" · "+esc(data.floor_label):"")+'</p>'+
 backButton+'</div>',"Close",closeModal);
 const box=document.getElementById("piPrivateImage");
 if(box&&typeof data.image_data==="string"&&/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(data.image_data)){
  const img=document.createElement("img");img.alt="Your private uploaded picture";img.src=data.image_data;box.appendChild(img);
 }else if(box){box.textContent="The picture cannot be displayed."; }
};
window.photoInboxDelete=async function(id){
 if(!cloudReady()||!/^[a-f0-9-]{36}$/i.test(id)||!confirm("Permanently delete this photo from your private cloud inbox?"))return;
 const {error}=await cloudClient.from("photo_inbox").delete().eq("id",id);
 if(error){alert("Could not delete: "+error.message);return}
 await window.photoInboxLoadList();
};
function floorRooms(f){
 const rooms=(state.houseRooms||[]).filter(r=>r.floor===f);
 return rooms.length?rooms.map(r=>'<button class="pi-room-btn" onclick="openInventoryRoom(\''+String(r.id).replace(/[^a-z0-9_-]/gi,"")+'\')">'+
 esc(r.name||"Unnamed room")+'</button>').join(""):'<p class="pi-muted">Rooms on this level will appear here as you confirm them.</p>';
}
function mapMarkup(f){
 return '<div class="pi-map"><div class="pi-floor-tabs">'+FLOORS.map(x=>
 '<button class="btn small '+(x===f?"primary":"")+'" onclick="photoInboxSelectFloor(\''+x+'\')">'+esc(x)+'</button>').join("")+'</div>'+
 '<div id="piMapPhoto" class="pi-map-image"><span>Loading '+esc(f)+' reference…</span></div>'+
 (f==="First floor"?'<p class="pi-map-confirmed">✓ Robovac map orientation confirmed. Front door: bottom living-room edge near playroom. “Basement” label: stairs going down. Wood-trimmed living-room opening has full-height wall sections on both sides.</p>':"")+
 '<p class="pi-muted">Reference only; precise walls, room boundaries and measurements still need confirmation.</p>'+
 '<div class="pi-gallery"><b>Room photos on this floor</b><div id="piFloorGallery" class="pi-gallery-list"><span class="pi-muted">Loading room references…</span></div></div>'+
 '<div class="pi-rooms"><h3>'+esc(f)+' rooms</h3>'+floorRooms(f)+'</div>'+
 '<div class="pi-map-actions"><button class="btn primary" onclick="openPhotoInbox(\'house_map\')">+ Add map / room photo</button>'+
 '<button class="btn" onclick="openInventoryRoom(\'\',\''+f+'\')">+ Room on this floor</button></div></div>';
}
window.openHouseFloorMap=function(f){
 floorView=FLOORS.includes(f)?f:floorView;
 modal("⌂ My house · four floors",mapMarkup(floorView),"Close",closeModal);
 Promise.resolve().then(()=>window.photoInboxLoadFloor(floorView));
};
window.photoInboxSelectFloor=function(f){
 if(!FLOORS.includes(f))return;
 floorView=f;
 window.openHouseFloorMap(f);
};
async function canonicalFloorReference(f){
 // A room picture must not silently replace an already-known robot-vacuum floor plan.
 if(f==="First floor"){
  const canonical=await cloudClient.from("photo_inbox").select("id,title,image_data,created_at")
   .eq("category","house_map").eq("floor_label",f).eq("title","Main floor robovac layout").limit(1);
  if(canonical.error)return canonical;
  if(canonical.data?.length)return canonical;
 }
 return await cloudClient.from("photo_inbox").select("id,title,image_data,created_at")
  .eq("category","house_map").eq("floor_label",f).order("created_at",{ascending:false}).limit(1);
}
window.photoInboxLoadFloorGallery=async function(f){
 const holder=document.getElementById("piFloorGallery");if(!holder)return;
 if(!cloudReady()){holder.textContent="Sign in to see your private room photos.";return}
 const {data,error}=await cloudClient.from("photo_inbox")
  .select("id,title,created_at").eq("category","house_map").eq("floor_label",f)
  .order("created_at",{ascending:true}).limit(80);
 const current=document.getElementById("piFloorGallery");if(!current||floorView!==f)return;
 if(error){current.textContent="Unable to load room photos: "+error.message;return}
 const photos=(data||[]).filter(x=>x.title!=="Main floor robovac layout"&&/^[a-f0-9-]{36}$/i.test(x.id));
 if(!photos.length){current.innerHTML='<span class="pi-muted">No extra room photos yet. Add photos of doorways, storage or rooms to build a visual map.</span>';return}
 current.innerHTML=photos.map((x,i)=>
  '<button class="pi-gallery-button" type="button" onclick="photoInboxView(\''+x.id+'\',\'map\')"><span class="pi-gallery-icon">📷</span><span>'+esc(x.title||("Room view "+(i+1)))+'</span><span aria-hidden="true">›</span></button>'
 ).join("");
};
window.photoInboxLoadFloor=async function(f){
 window.photoInboxLoadFloorGallery(f);
 const el=document.getElementById("piMapPhoto");if(!el)return;
 if(!cloudReady()){el.innerHTML='<div class="pi-map-placeholder">Sign in to Daily Life cloud to view or add a floor-plan image. Your existing rooms are still shown below.</div>';return}
 const {data,error}=await canonicalFloorReference(f);
 const current=document.getElementById("piMapPhoto");
 if(!current||floorView!==f)return;
 if(error){current.textContent="Could not load floor photo: "+error.message;return}
 if(!data?.length){current.innerHTML='<div class="pi-map-placeholder">No '+esc(f)+' map photo uploaded yet. Add your robot-vacuum map or a rough floor sketch, and we can build from it.</div>';return}
 const img=document.createElement("img");img.alt=f+" reference image";img.src=data[0].image_data;
 current.replaceChildren(img);
};

window.houseMapInlineHtml=function(){
 const rooms=state.houseRooms||[];
 return '<div class="pi-house-inline"><h3>⌂ Your home, floor by floor</h3>'+
 '<p class="pi-muted">Start with the robot-vacuum screenshot for the first floor. We can trace it together and confirm each room’s shape and storage locations rather than guessing.</p>'+
 '<div class="pi-inline-floor-grid">'+FLOORS.map((f,i)=>{
 const count=rooms.filter(r=>r.floor===f).length;
 return '<button onclick="openHouseFloorMap(\''+f+'\')"><span class="pi-floor-glyph">'+["▱","⌂","▤","△"][i]+'</span><b>'+f+'</b><small>'+count+' room'+(count===1?"":"s")+' · view map</small></button>';
 }).join("")+'</div>'+
 '<div class="pi-inline-reference" id="piInlineReference"><span class="pi-muted">First-floor reference image will appear here after you upload it.</span></div>'+
 '<div class="pi-map-actions"><button class="btn primary" onclick="openPhotoInbox(\'house_map\')">📷 Add robot map / room photos</button><button class="btn" onclick="openHomeAreaProjects()">🧹 Work on an area</button></div></div>';
};
window.photoInboxLoadInlineMap=async function(){
 const el=document.getElementById("piInlineReference");if(!el||!cloudReady())return;
 const {data,error}=await canonicalFloorReference("First floor");
 const current=document.getElementById("piInlineReference");if(!current)return;
 if(error){current.textContent="Unable to load the first-floor reference.";return}
 if(!data?.length){current.innerHTML='<span class="pi-muted">No first-floor image yet. Upload the robot-vacuum map or a sketch to show it here.</span>';return}
 const img=document.createElement("img");img.alt="First-floor reference photo";img.src=data[0].image_data;current.replaceChildren(img);
};
window.photoInboxStatus=function(){return cloudReady()?"ready":"sign-in-required"};
})();