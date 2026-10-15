/* Owner-private photo-guided home organization. Area progress is explicitly
   an estimate, never a measurement or an automatic inference from the photo. */
(function(){
"use strict";
const AREA_FLOORS=["Basement","First floor","Second floor","Third floor"];
function online(){return typeof cloudClient!=="undefined"&&!!cloudClient&&typeof cloudUser==="function"&&!!cloudUser()}
function uidOk(id){return /^[a-f0-9-]{36}$/i.test(String(id||""))}
function areaStatus(s){return ({not_started:"Not started",in_progress:"Working on it",paused:"Paused",complete:"Complete"})[s]||"Not started"}
function areaSelect(value){return AREA_FLOORS.map(f=>'<option '+(f===value?"selected":"")+'>'+esc(f)+'</option>').join("")}
function n(v){return Number.isFinite(Number(v))&&v!==null&&v!==""?Number(v):null}
window.openHomeAreaProjects=async function(){
 if(!online()){
  modal("🧹 Areas we’re improving",'<p class="muted">Sign in to Daily Life cloud to keep photo histories and your progress estimates private.</p><button class="btn primary" onclick="openCloudAuth()">Sign in to cloud</button>',"Close",closeModal);return
 }
 modal("🧹 Home improvement progress",'<div class="pi-main">'+
 '<div class="pi-help"><b>Before → small steps → progress photos</b><p>Create one project for a problem area. Take a before photo, ask ChatGPT to review, then repeat with progress photos. Percent complete and time remaining are estimates that we update together, never silently assumed by the app.</p></div>'+
 '<div class="pi-map-actions"><button class="btn primary" onclick="homeAreaEdit()">+ New area</button><button class="btn" onclick="openPhotoInbox(\'home_progress\')">📷 Upload progress</button></div>'+
 '<div id="homeAreaList"><p class="pi-muted">Loading cleanup areas…</p></div></div>',"Close",closeModal);
 const {data,error}=await cloudClient.from("home_area_projects")
  .select("id,area_name,floor_label,location_notes,status,progress_percent,estimated_minutes_remaining,estimate_basis,next_step,destination_notes,updated_at")
  .order("updated_at",{ascending:false}).limit(100);
 const el=document.getElementById("homeAreaList");if(!el)return;
 if(error){el.textContent="Could not load areas: "+error.message;return}
 el.innerHTML=(data||[]).map(x=>{
  const p=n(x.progress_percent),mins=n(x.estimated_minutes_remaining),id=x.id;
  return '<div class="pi-area-card"><div class="pi-area-head"><div><b>'+esc(x.area_name)+'</b><small>'+esc(x.floor_label||"Floor not set")+' · '+esc(areaStatus(x.status))+'</small></div><strong>'+ (p===null?"Unestimated":p+"%")+'</strong></div>'+
   '<div class="pi-meter"><i style="width:'+(p===null?0:Math.max(0,Math.min(100,p)))+'%"></i></div>'+
   '<p class="pi-muted">'+(mins===null?"Time remaining: not estimated yet":"Est. "+mins+" minutes left")+(x.estimate_basis?" · "+esc(x.estimate_basis):"")+'</p>'+
   '<div class="pi-area-next"><b>Do next</b><span>'+esc(x.next_step||"Take a before photo and ask me to make a small, specific cleanup plan.")+'</span></div>'+
   (x.destination_notes?'<div class="pi-muted">Where things belong: '+esc(x.destination_notes)+'</div>':"")+
   '<div class="pi-map-actions"><button class="btn small primary" onclick="openPhotoInbox(\'home_progress\',\''+id+'\')">📸 Add progress</button>'+
   '<button class="btn small" onclick="homeAreaEdit(\''+id+'\')">Edit plan</button></div></div>';
 }).join("")||'<p class="pi-muted">No cleanup projects yet. Start with one area, even a single counter or shelf.</p>';
};
window.homeAreaEdit=async function(id=""){
 if(!online())return;
 let old={};if(id){
  if(!uidOk(id))return;
  const {data,error}=await cloudClient.from("home_area_projects").select("*").eq("id",id).single();
  if(error){alert("Could not load this area.");return}
  old=data||{};
 }
 modal(id?"Edit cleanup plan":"Create cleanup area",
 '<div class="stack pi-form"><label>Area name<input id="haName" value="'+esc(old.area_name||"")+'" maxlength="120" placeholder="Dining room table, bedroom corner, pantry…"></label>'+
 '<label>Floor<select id="haFloor">'+areaSelect(old.floor_label||"First floor")+'</select></label>'+
 '<label>What part of the area?<textarea id="haDetails" rows="2">'+esc(old.location_notes||"")+'</textarea></label>'+
 '<label>Status<select id="haStatus">'+["not_started","in_progress","paused","complete"].map(v=>'<option value="'+v+'" '+(old.status===v?"selected":"")+'>'+esc(areaStatus(v))+'</option>').join("")+'</select></label>'+
 '<div class="grid2"><label>Estimated complete (%)<input id="haPercent" type="number" min="0" max="100" step="1" value="'+(old.progress_percent??"")+'" placeholder="Leave blank until reviewed"></label>'+
 '<label>Estimated minutes left<input id="haTime" type="number" min="0" max="10000" value="'+(old.estimated_minutes_remaining??"")+'" placeholder="Not yet estimated"></label></div>'+
 '<label>Estimate based on<input id="haBasis" maxlength="300" value="'+esc(old.estimate_basis||"")+'" placeholder="Photo review, my own estimate…"></label>'+
 '<label>Next small action<textarea id="haNext" rows="2" placeholder="Clear just the top of the dresser">'+esc(old.next_step||"")+'</textarea></label>'+
 '<label>Where things should live<textarea id="haDestinations" rows="2" placeholder="School supplies → desk drawer; extra toiletries → bathroom bin">'+esc(old.destination_notes||"")+'</textarea></label>'+
 '<p class="pi-muted">No invented progress: blank means not yet assessed. Update after looking at new photos together.</p></div>',
 "Save",async()=>{
  const el=id=>document.getElementById(id),name=el("haName").value.trim();
  if(!name){alert("Name the area.");return}
  const percent=el("haPercent").value.trim(),minutes=el("haTime").value.trim();
  if((percent!==""&&(!Number.isInteger(+percent)||+percent<0||+percent>100))||
     (minutes!==""&&(!Number.isInteger(+minutes)||+minutes<0||+minutes>10000))){alert("Check the estimated percent and minutes.");return}
  const payload={area_name:name.slice(0,120),floor_label:el("haFloor").value,
   location_notes:el("haDetails").value.trim().slice(0,1500),
   status:el("haStatus").value,progress_percent:percent===""?null:+percent,
   estimated_minutes_remaining:minutes===""?null:+minutes,
   estimate_basis:el("haBasis").value.trim().slice(0,300),
   next_step:el("haNext").value.trim().slice(0,2500),
   destination_notes:el("haDestinations").value.trim().slice(0,2500),
   updated_at:new Date().toISOString()};
  let error;if(id)({error}=await cloudClient.from("home_area_projects").update(payload).eq("id",id));
  else({error}=await cloudClient.from("home_area_projects").insert({...payload,owner_user_id:cloudUser().id}));
  if(error){alert("Could not save area: "+error.message);return}
  window.openHomeAreaProjects();
 });
};
})();