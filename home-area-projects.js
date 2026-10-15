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
function areaMilestones(phases){
 const set=phases||new Set(),labels=[["before","Before"],["progress","During"],["after","After"]];
 return '<div class="ha-stage-strip" aria-label="Photo milestone evidence">'+labels.map(([id,label])=>
  '<span class="ha-stage '+(set.has(id)?"evidenced":"not-recorded")+'"><b>'+(set.has(id)?"✓":"○")+'</b>'+label+
  '<small>'+(set.has(id)?"photo saved":"not recorded")+'</small></span>').join("")+'</div>';
}
function areaNext(x){return String(x.next_step||"").trim()||"Take one photo of this area so we can choose its first small action."}
function areaFocus(x,phases){
 const p=n(x.progress_percent),mins=n(x.estimated_minutes_remaining),done=x.status==="complete",id=x.id;
 return '<section class="ha-focused" aria-label="Next home area action"><div class="ha-focused-head"><div>'+
  '<span class="ha-kicker">'+(done?"AREA RECORDED COMPLETE":"YOUR NEXT HOME STEP")+'</span>'+
  '<h2>'+esc(x.area_name)+'</h2><small>'+esc(x.floor_label||"Floor not set")+' · '+esc(areaStatus(x.status))+'</small></div>'+
  '<div class="ha-status-dot" aria-label="'+esc(areaStatus(x.status))+'">'+(done?"✓":"⌂")+'</div></div>'+
  '<div class="ha-do-next">'+(done?'<strong>✓ Marked complete</strong><p>Reopen the plan to add a future touch-up if needed.</p>':
   '<strong>Do next</strong><p>'+esc(areaNext(x))+'</p>')+'</div>'+
  areaMilestones(phases)+
  '<p class="ha-honest-estimate">'+(p===null?"Area percentage not assessed":p+"% estimated by "+esc(x.estimate_basis||"a prior review"))+
  ' · '+(mins===null?"Time needed not estimated":"About "+mins+" min estimated remaining")+'</p>'+
  '<div class="ha-focused-buttons"><button class="btn primary" onclick="homeAreaPhotos(\''+id+'\')">See photo progress ›</button>'+
  '<button class="btn" onclick="openPhotoInbox(\'home_progress\',\''+id+'\')">+ Send an update</button>'+
  '<button class="btn" onclick="homeAreaEdit(\''+id+'\')">Edit next step</button></div></section>';
}
window.openHomeAreaProjects=async function(){
 if(!online()){
  modal("🧹 Areas we’re improving",'<p class="muted">Sign in to Daily Life cloud to keep photo histories and your progress estimates private.</p><button class="btn primary" onclick="openCloudAuth()">Sign in to cloud</button>',"Close",closeModal);return
 }
 modal("🧹 Home progress",'<div class="pi-main ha-main">'+
 '<div id="homeAreaList"><p class="pi-muted">Loading your next house action…</p></div></div>',"Close",closeModal);
 const {data,error}=await cloudClient.from("home_area_projects")
  .select("id,area_name,floor_label,location_notes,status,progress_percent,estimated_minutes_remaining,estimate_basis,next_step,destination_notes,updated_at")
  .order("updated_at",{ascending:false}).limit(100);
 const el=document.getElementById("homeAreaList");if(!el)return;
 if(error){el.textContent="Could not load areas: "+error.message;return}
 const rows=(data||[]).filter(x=>uidOk(x.id));
 const phases=new Map();
 if(rows.length){
  // Metadata only: photos stay owner-private; no image bytes downloaded until requested.
  const photos=await cloudClient.from("photo_inbox").select("area_id,phase").in("area_id",rows.map(x=>x.id)).limit(500);
  if(!photos.error){for(const x of photos.data||[]){
   if(!phases.has(x.area_id))phases.set(x.area_id,new Set());
   if(["before","progress","after"].includes(x.phase))phases.get(x.area_id).add(x.phase);
  }}
 }
 const current=document.getElementById("homeAreaList");if(!current)return;
 if(!rows.length){
  current.innerHTML='<div class="ha-focused"><h2>Choose one small spot</h2><p>Start with a surface you want to clear. One photo is enough to begin.</p>'+
   '<button class="btn primary" onclick="homeAreaEdit()">+ Start an area</button>'+
   '<button class="btn" onclick="openPhotoInbox(\'home_progress\')">📷 Send a photo</button></div>';
  return;
 }
 // Only user-marked complete is complete; photo phases alone never imply it.
 const ordered=[...rows].sort((a,b)=>(a.status==="complete"?1:0)-(b.status==="complete"?1:0));
 const focus=ordered[0],rest=ordered.slice(1);
 current.innerHTML=areaFocus(focus,phases.get(focus.id))+
 '<div class="ha-handoff"><b>One area at a time</b><small>Photo labels describe evidence; no automatic completion percentages or assumptions about things being put away.</small></div>'+
 (rest.length?'<details class="ha-other-areas"><summary>Other areas <b>'+rest.length+'</b></summary><div class="ha-other-items">'+
  rest.map(x=>'<div class="ha-other-row"><div><strong>'+esc(x.area_name)+'</strong>'+
  '<small>'+esc(areaStatus(x.status))+' · '+esc(x.floor_label||"")+'</small></div>'+
  '<button type="button" class="btn small" onclick="homeAreaPhotos(\''+x.id+'\')">Photos</button>'+
  '<button type="button" class="btn small" onclick="homeAreaEdit(\''+x.id+'\')">Plan</button></div>').join("")+'</div></details>':"")+
 '<div class="ha-add-area"><button class="btn" onclick="homeAreaEdit()">+ New area</button>'+
 '<button class="btn" onclick="openPhotoInbox(\'home_progress\')">📷 Send an unassigned photo</button></div>';
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
window.homeAreaPhotos=async function(id){
 if(!online()||!uidOk(id))return;
 const {data:area,error:areaError}=await cloudClient.from("home_area_projects").select("area_name").eq("id",id).single();
 if(areaError||!area)return;
 modal("📷 "+String(area.area_name||"Cleanup").slice(0,70)+" · photo timeline",
  '<div class="pi-main"><p class="pi-muted">Room reference photos and later before/progress pictures appear here together. Progress percentages and time estimates are never automatically measured.</p>'+
  '<div id="piAreaTimeline"><p class="pi-muted">Loading photo history…</p></div>'+
  '<button class="btn primary" onclick="openPhotoInbox(\'home_progress\',\''+id+'\')">+ Add new progress photo</button>'+
  '<button class="btn" onclick="openHomeAreaProjects()">← Back to all areas</button></div>',"Close",closeModal);
 const {data,error}=await cloudClient.from("photo_inbox")
  .select("id,phase,title,created_at,image_data")
  .eq("area_id",id)
  .order("created_at",{ascending:true}).limit(25);
 const container=document.getElementById("piAreaTimeline");if(!container)return;
 if(error){container.textContent="Could not load pictures: "+error.message;return}
 if(!data?.length){container.textContent="No photos yet. Start with a before photo to establish the baseline.";return}
 container.replaceChildren();
 for(const [index,record] of data.entries()){
  const card=document.createElement("div");card.className="pi-area-card";
  const title=document.createElement("b");title.textContent=(index+1)+". "+({before:"Before",progress:"Progress",after:"After",reference:"Reference"}[record.phase]||"Photo")+" · "+new Date(record.created_at).toLocaleString();card.appendChild(title);
  if(typeof record.image_data==="string"&&/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(record.image_data)){
   const img=document.createElement("img");img.alt="Cleanup area progress photo";img.src=record.image_data;img.style.cssText="max-width:100%;max-height:450px;object-fit:contain;border-radius:12px";card.appendChild(img);
  }
  container.appendChild(card);
 }
};
})();