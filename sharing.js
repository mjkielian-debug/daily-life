/* Daily Life household sharing
   Shared itinerary items are opt-in. Finance, Vault, People, health, and other private state stay private.
*/
let sharingHousehold=null;
let sharingMembership=null;
let sharingMembers=[];
let sharingBusy=false;
let sharingLastPulledAt="";
let sharingInviteCode="";
let sharingPollTimer=null;

function sharingReset(){
  sharingHousehold=null;sharingMembership=null;sharingMembers=[];sharingLastPulledAt="";sharingInviteCode="";
  if(sharingPollTimer){clearInterval(sharingPollTimer);sharingPollTimer=null}
}
function sharingRemoveLocalCopies(householdId){
  if(!householdId||typeof state==="undefined")return;
  state.events=(state.events||[]).filter(x=>x.sharedHouseholdId!==householdId);
  state.itineraryBlocks=(state.itineraryBlocks||[]).filter(x=>x.sharedHouseholdId!==householdId);
  state.tasks=(state.tasks||[]).filter(x=>x.sharedHouseholdId!==householdId);
}
function sharingRemoveAllLocalCopies(exceptHouseholdId=""){
  if(typeof state==="undefined")return 0;
  const shouldRemove=x=>!!x.sharedHouseholdId&&(!exceptHouseholdId||x.sharedHouseholdId!==exceptHouseholdId);
  const before=(state.events||[]).length+(state.itineraryBlocks||[]).length+(state.tasks||[]).length;
  state.events=(state.events||[]).filter(x=>!shouldRemove(x));
  state.itineraryBlocks=(state.itineraryBlocks||[]).filter(x=>!shouldRemove(x));
  state.tasks=(state.tasks||[]).filter(x=>!shouldRemove(x));
  const after=(state.events||[]).length+(state.itineraryBlocks||[]).length+(state.tasks||[]).length;
  return Math.max(0,before-after);
}
function sharingConnected(){return !!(sharingHousehold?.id&&sharingMembership?.household_id)}
function sharingCanShare(){return sharingConnected()&&!!cloudUser?.()}
function sharingRole(){return String(sharingMembership?.role||"member")}
function sharingIsOwner(){return sharingRole()==="owner"}
function sharingEventPayload(e){
  return {
    title:String(e?.title||""),
    child:String(e?.child||""),
    type:String(e?.type||"other"),
    date:String(e?.date||ymd()),
    startTime:String(e?.startTime||""),
    endTime:String(e?.endTime||""),
    location:String(e?.location||""),
    notes:String(e?.notes||""),
    status:String(e?.status||"confirmed")
  };
}
async function sharingInit(){
  const user=cloudUser?.();
  if(!user||!cloudClient){sharingReset();return false}
  try{
    const {data:memberships,error:memErr}=await cloudClient.from("household_memberships")
      .select("household_id,role,display_name,created_at")
      .eq("user_id",user.id)
      .order("created_at",{ascending:true});
    if(memErr)throw memErr;
    const membership=(memberships||[])[0]||null;
    if(!membership){
      const removed=sharingRemoveAllLocalCopies();
      sharingReset();
      if(removed)await dbSet("state",state);
      return false;
    }
    const staleRemoved=sharingRemoveAllLocalCopies(membership.household_id);
    sharingMembership=membership;
    if(staleRemoved)await dbSet("state",state);

    const {data:house,error:houseErr}=await cloudClient.from("households")
      .select("id,name,created_by,created_at,updated_at")
      .eq("id",membership.household_id)
      .maybeSingle();
    if(houseErr)throw houseErr;
    sharingHousehold=house||null;
    if(!sharingHousehold){sharingReset();return false}

    const profileName=String(state?.profile?.name||"").trim();
    if(profileName&&profileName!==String(membership.display_name||"").trim()){
      await cloudClient.from("household_memberships")
        .update({display_name:profileName,updated_at:new Date().toISOString()})
        .eq("household_id",membership.household_id)
        .eq("user_id",user.id);
      sharingMembership.display_name=profileName;
    }

    const {data:memberRows,error:membersErr}=await cloudClient.from("household_memberships")
      .select("user_id,role,display_name,created_at")
      .eq("household_id",membership.household_id)
      .order("created_at",{ascending:true});
    if(membersErr)throw membersErr;
    sharingMembers=memberRows||[];
    await sharingPullEntries(false);
    sharingStartPolling();
    return true;
  }catch(error){
    console.warn("Household sharing init failed",error);
    return false;
  }
}
function sharingStartPolling(){
  if(sharingPollTimer)clearInterval(sharingPollTimer);
  if(!sharingConnected())return;
  sharingPollTimer=setInterval(async()=>{
    if(document.hidden||!sharingConnected())return;
    const changed=await sharingPullEntries(false);
    if(changed&&typeof render==="function")render();
  },60000);
}
async function sharingPullEntries(shouldRender=true){
  const user=cloudUser?.();if(!user||!cloudClient||!sharingHousehold?.id)return 0;
  try{
    const {data,error}=await cloudClient.from("shared_entries")
      .select("id,household_id,owner_user_id,category,local_date,payload,editable_by_household,created_at,updated_at")
      .eq("household_id",sharingHousehold.id)
      .in("category",["event","itinerary_block","task"])
      .order("local_date",{ascending:true});
    if(error)throw error;
    const rows=data||[],eventRows=rows.filter(r=>r.category==="event"),blockRows=rows.filter(r=>r.category==="itinerary_block"),taskRows=rows.filter(r=>r.category==="task"),
          eventIds=new Set(eventRows.map(r=>r.id)),blockIds=new Set(blockRows.map(r=>r.id)),taskIds=new Set(taskRows.map(r=>r.id));
    state.events=(state.events||[]).filter(e=>!(e.sharedHouseholdId===sharingHousehold.id&&e.sharedEntryId&&!eventIds.has(e.sharedEntryId)));
    state.itineraryBlocks=(state.itineraryBlocks||[]).filter(b=>!(b.sharedHouseholdId===sharingHousehold.id&&b.sharedEntryId&&!blockIds.has(b.sharedEntryId)));
    state.tasks=(state.tasks||[]).filter(t=>!(t.sharedHouseholdId===sharingHousehold.id&&t.sharedEntryId&&!taskIds.has(t.sharedEntryId)));
    let changed=0;
    for(const row of eventRows){
      const p=row.payload&&typeof row.payload==="object"?row.payload:{};
      let e=(state.events||[]).find(x=>x.sharedEntryId===row.id);
      if(!e){e={id:uid(),sharedEntryId:row.id,sharedHouseholdId:row.household_id,source:"Shared household"};state.events.push(e);changed++}
      const before=JSON.stringify(e);
      Object.assign(e,{shared:true,sharedEntryId:row.id,sharedHouseholdId:row.household_id,sharedOwnerUserId:row.owner_user_id,sharedEditable:row.editable_by_household!==false,title:String(p.title||"Shared event"),child:String(p.child||""),type:String(p.type||"other"),date:String(p.date||row.local_date||ymd()),startTime:String(p.startTime||""),endTime:String(p.endTime||""),location:String(p.location||""),notes:String(p.notes||""),status:String(p.status||"confirmed"),source:"Shared household"});
      if(JSON.stringify(e)!==before)changed++;
    }
    for(const row of blockRows){
      const p=row.payload&&typeof row.payload==="object"?row.payload:{};
      let b=(state.itineraryBlocks||[]).find(x=>x.sharedEntryId===row.id);
      if(!b){b={id:uid(),sharedEntryId:row.id,sharedHouseholdId:row.household_id};state.itineraryBlocks.push(b);changed++}
      const before=JSON.stringify(b);
      Object.assign(b,{shared:true,sharedEntryId:row.id,sharedHouseholdId:row.household_id,sharedOwnerUserId:row.owner_user_id,sharedEditable:row.editable_by_household!==false,date:String(p.date||row.local_date||ymd()),start:String(p.start||""),end:String(p.end||""),title:String(p.title||"Shared block"),kind:String(p.kind||"flexible"),notes:String(p.notes||""),done:!!p.done,source:"Shared household"});
      if(JSON.stringify(b)!==before)changed++;
    }
    for(const row of taskRows){
      const p=row.payload&&typeof row.payload==="object"?row.payload:{};
      let t=(state.tasks||[]).find(x=>x.sharedEntryId===row.id);
      if(!t){t={id:uid(),sharedEntryId:row.id,sharedHouseholdId:row.household_id,source:"Shared household"};state.tasks.push(t);changed++}
      const before=JSON.stringify(t);
      Object.assign(t,{shared:true,sharedEntryId:row.id,sharedHouseholdId:row.household_id,sharedOwnerUserId:row.owner_user_id,sharedEditable:row.editable_by_household!==false,title:String(p.title||"Shared task"),child:String(p.child||""),category:String(p.category||"family"),date:String(p.date||row.local_date||ymd()),notes:String(p.notes||""),done:!!p.done,order:Number(p.order||100),itineraryMinutes:Number(p.itineraryMinutes||0)||null,itineraryPreference:String(p.itineraryPreference||""),itineraryStart:String(p.itineraryStart||""),source:"Shared household"});
      if(JSON.stringify(t)!==before)changed++;
    }
    sharingLastPulledAt=new Date().toISOString();
    if(changed)await dbSet("state",state);
    if(shouldRender&&typeof render==="function")render();
    return changed;
  }catch(error){
    console.warn("Could not pull shared itinerary",error);
    return 0;
  }
}
async function sharingUpsertEvent(e){
  const user=cloudUser?.();if(!e||!user||!cloudClient||!sharingHousehold?.id)return false;
  const payload=sharingEventPayload(e),body={
    household_id:sharingHousehold.id,
    owner_user_id:e.sharedOwnerUserId||user.id,
    category:"event",
    local_date:payload.date,
    payload,
    editable_by_household:true,
    updated_at:new Date().toISOString()
  };
  try{
    let result;
    if(e.sharedEntryId){
      result=await cloudClient.from("shared_entries")
        .update({local_date:payload.date,payload,editable_by_household:true,updated_at:new Date().toISOString()})
        .eq("id",e.sharedEntryId)
        .eq("household_id",sharingHousehold.id)
        .select("id,owner_user_id")
        .maybeSingle();
    }else{
      result=await cloudClient.from("shared_entries")
        .insert(body)
        .select("id,owner_user_id")
        .single();
    }
    if(result.error)throw result.error;
    e.shared=true;
    e.sharedEntryId=result.data?.id||e.sharedEntryId;
    e.sharedHouseholdId=sharingHousehold.id;
    e.sharedOwnerUserId=result.data?.owner_user_id||e.sharedOwnerUserId||user.id;
    e.sharedEditable=true;
    e.source="Shared household";
    await dbSet("state",state);
    return true;
  }catch(error){
    alert("Could not share that itinerary item: "+(error?.message||"Unknown error"));
    return false;
  }
}
async function sharingMakeEventPrivate(e){
  if(!e)return true;
  if(!e.sharedEntryId){e.shared=false;return true}
  if(!cloudClient||!sharingHousehold?.id)return false;
  try{
    const {error}=await cloudClient.from("shared_entries")
      .delete()
      .eq("id",e.sharedEntryId)
      .eq("household_id",sharingHousehold.id);
    if(error)throw error;
    delete e.sharedEntryId;delete e.sharedHouseholdId;delete e.sharedOwnerUserId;delete e.sharedEditable;
    e.shared=false;e.source="Manual";
    await dbSet("state",state);
    return true;
  }catch(error){
    alert("Could not remove that item from the shared itinerary: "+(error?.message||"Unknown error"));
    return false;
  }
}
function sharingTaskPayload(t){
  return {
    title:String(t?.title||""),
    child:String(t?.child||""),
    category:String(t?.category||"family"),
    date:String(t?.date||ymd()),
    notes:String(t?.notes||""),
    done:!!t?.done,
    order:Number(t?.order||100),
    itineraryMinutes:Number(t?.itineraryMinutes||0)||null,
    itineraryPreference:String(t?.itineraryPreference||""),
    itineraryStart:String(t?.itineraryStart||"")
  };
}
async function sharingUpsertTask(t){
  const user=cloudUser?.();if(!t||!user||!cloudClient||!sharingHousehold?.id)return false;
  const payload=sharingTaskPayload(t);
  try{
    let result;
    if(t.sharedEntryId){
      result=await cloudClient.from("shared_entries")
        .update({local_date:payload.date,payload,editable_by_household:true,updated_at:new Date().toISOString()})
        .eq("id",t.sharedEntryId).eq("household_id",sharingHousehold.id)
        .select("id,owner_user_id").maybeSingle();
    }else{
      result=await cloudClient.from("shared_entries")
        .insert({household_id:sharingHousehold.id,owner_user_id:user.id,category:"task",local_date:payload.date,payload,editable_by_household:true,updated_at:new Date().toISOString()})
        .select("id,owner_user_id").single();
    }
    if(result.error)throw result.error;
    t.shared=true;t.sharedEntryId=result.data?.id||t.sharedEntryId;t.sharedHouseholdId=sharingHousehold.id;t.sharedOwnerUserId=result.data?.owner_user_id||t.sharedOwnerUserId||user.id;t.sharedEditable=true;t.source="Shared household";
    await dbSet("state",state);return true;
  }catch(error){alert("Could not share that task: "+(error?.message||"Unknown error"));return false}
}
async function sharingMakeTaskPrivate(t){
  if(!t)return true;
  if(!t.sharedEntryId){t.shared=false;return true}
  try{
    const {error}=await cloudClient.from("shared_entries").delete().eq("id",t.sharedEntryId).eq("household_id",sharingHousehold.id);
    if(error)throw error;
    delete t.sharedEntryId;delete t.sharedHouseholdId;delete t.sharedOwnerUserId;delete t.sharedEditable;t.shared=false;
    if(t.source==="Shared household")delete t.source;
    await dbSet("state",state);return true;
  }catch(error){alert("Could not remove that task from the shared household: "+(error?.message||"Unknown error"));return false}
}
function sharingTaskControl(t={}){
  if(!sharingCanShare())return "";
  return `<label class="task"><input id="taskShared" type="checkbox" ${t.shared||t.sharedEntryId?"checked":""}><span><b>Share with household</b><div class="muted small">Only this task is shared. Your private task list and other Daily Life sections stay private.</div></span></label>`;
}
function sharingItineraryPayload(b){
  return {date:String(b?.date||ymd()),start:String(b?.start||""),end:String(b?.end||""),title:String(b?.title||""),kind:String(b?.kind||"flexible"),notes:String(b?.notes||""),done:!!b?.done};
}
async function sharingUpsertItineraryBlock(b){
  const user=cloudUser?.();if(!b||!user||!cloudClient||!sharingHousehold?.id)return false;
  const payload=sharingItineraryPayload(b);
  try{
    let result;
    if(b.sharedEntryId){
      result=await cloudClient.from("shared_entries").update({local_date:payload.date,payload,editable_by_household:true,updated_at:new Date().toISOString()}).eq("id",b.sharedEntryId).eq("household_id",sharingHousehold.id).select("id,owner_user_id").maybeSingle();
    }else{
      result=await cloudClient.from("shared_entries").insert({household_id:sharingHousehold.id,owner_user_id:user.id,category:"itinerary_block",local_date:payload.date,payload,editable_by_household:true,updated_at:new Date().toISOString()}).select("id,owner_user_id").single();
    }
    if(result.error)throw result.error;
    b.shared=true;b.sharedEntryId=result.data?.id||b.sharedEntryId;b.sharedHouseholdId=sharingHousehold.id;b.sharedOwnerUserId=result.data?.owner_user_id||b.sharedOwnerUserId||user.id;b.sharedEditable=true;b.source="Shared household";
    await dbSet("state",state);return true;
  }catch(error){alert("Could not share that time block: "+(error?.message||"Unknown error"));return false}
}
async function sharingMakeItineraryPrivate(b){
  if(!b)return true;
  if(!b.sharedEntryId){b.shared=false;return true}
  try{
    const {error}=await cloudClient.from("shared_entries").delete().eq("id",b.sharedEntryId).eq("household_id",sharingHousehold.id);
    if(error)throw error;
    delete b.sharedEntryId;delete b.sharedHouseholdId;delete b.sharedOwnerUserId;delete b.sharedEditable;b.shared=false;delete b.source;
    await dbSet("state",state);return true;
  }catch(error){alert("Could not remove that block from the shared itinerary: "+(error?.message||"Unknown error"));return false}
}
function sharingItineraryControl(x={}){
  if(!sharingCanShare())return "";
  return `<label class="task"><input id="ibshared" type="checkbox" ${x.shared||x.sharedEntryId?"checked":""}><span><b>Share this time block</b><div class="muted small">Only this block appears on the other household account.</div></span></label>`;
}
function sharingEventControl(x={}){
  if(!sharingCanShare())return "";
  return `<label class="task"><input id="eshared" type="checkbox" ${x.shared||x.sharedEntryId?"checked":""}><span><b>Share with household</b><div class="muted small">Only this itinerary item is shared. Private Daily Life sections stay private.</div></span></label>`;
}
function sharingMemberName(m){
  if(m.user_id===cloudUser?.()?.id)return String(m.display_name||state?.profile?.name||"You");
  return String(m.display_name||"Household member");
}
function sharingTodayCard(){
  if(!sharingConnected())return "";
  const today=ymd(),householdId=sharingHousehold.id,
        tasks=(state.tasks||[]).filter(x=>x.sharedHouseholdId===householdId&&x.date===today),
        openTasks=tasks.filter(x=>!x.done),
        events=(state.events||[]).filter(x=>x.sharedHouseholdId===householdId&&x.date===today&&x.status!=="cancelled").sort((a,b)=>String(a.startTime||"99:99").localeCompare(String(b.startTime||"99:99"))),
        blocks=(state.itineraryBlocks||[]).filter(x=>x.sharedHouseholdId===householdId&&x.date===today&&!x.done).sort((a,b)=>String(a.start||"99:99").localeCompare(String(b.start||"99:99"))),
        memberNames=(sharingMembers||[]).map(sharingMemberName).filter(Boolean);
  return `<div class="card shared-household-today"><div class="section-title"><div><div class="eyebrow">⌂ Shared household</div><h2>${openTasks.length} shared task${openTasks.length===1?"":"s"} open today</h2><div class="muted small">${esc(memberNames.join(" + ")||sharingHousehold.name||"Household")}</div></div><div class="actions"><button class="btn primary" onclick="openTask('','',true)">+ Shared task</button><button class="btn" onclick="sharingPullEntries()">Refresh</button></div></div>
    ${openTasks.length?`<div class="mini-heading">Tasks</div>${openTasks.slice(0,6).map(t=>`<div class="row compact-row"><label class="task grow"><input type="checkbox" onchange="toggleTask('${t.id}',this.checked)"><span><b>${esc(t.title)}</b>${t.child?`<div class="muted small">${esc(t.child)}</div>`:""}</span></label><button class="btn small" onclick="openTask('', '${t.id}')">Edit</button></div>`).join("")}`:""}
    ${events.length||blocks.length?`<div class="mini-heading">Shared schedule today</div>${events.slice(0,4).map(e=>`<button class="shared-today-row" onclick="openEvent('${e.date}','${e.id}')"><span><b>${esc(e.startTime?fmtClock(e.startTime):"All day")}</b><small>event</small></span><span class="grow"><b>${esc(e.title)}</b><small>${esc([e.child,e.location].filter(Boolean).join(" · "))}</small></span></button>`).join("")}${blocks.slice(0,4).map(b=>`<button class="shared-today-row" onclick="openItineraryBlock('${b.date}','${b.id}')"><span><b>${esc(b.start?fmtClock(b.start):"")}</b><small>time block</small></span><span class="grow"><b>${esc(b.title)}</b><small>${esc(b.notes||"")}</small></span></button>`).join("")}`:""}
    ${!openTasks.length&&!events.length&&!blocks.length?`<div class="notice">Nothing shared for today yet. Private items stay private until you explicitly share them.</div>`:""}
    ${sharingLastPulledAt?`<div class="muted small shared-last-sync">Checked ${esc(new Date(sharingLastPulledAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}))}</div>`:""}
  </div>`;
}
function sharingSettingsCard(){
  const user=cloudUser?.();
  if(!user){
    return `<div class="card"><div class="section-title"><div><h2>Household sharing</h2><div class="muted small">Separate sign-ins with an opt-in shared itinerary.</div></div><span class="tag">cloud sign-in needed</span></div><button class="btn primary" onclick="openCloudAuth()">Sign in</button></div>`;
  }
  if(!sharingConnected()){
    return `<div class="card"><div class="section-title"><div><h2>Household sharing</h2><div class="muted small">You and another adult can use separate Daily Life accounts. Only items you mark shared appear on both accounts.</div></div><span class="tag">not set up</span></div><div class="actions"><button class="btn primary" onclick="sharingOpenCreate()">Create shared household</button><button class="btn" onclick="sharingOpenJoin()">Join with invite code</button></div><div class="muted small">Money, Vault, health/self-care, private People notes, and other personal sections are not shared by this feature.</div></div>`;
  }
  return `<div class="card glow"><div class="section-title"><div><h2>Household sharing</h2><div class="muted small">${esc(sharingHousehold.name||"Shared household")} · ${sharingMembers.length} member${sharingMembers.length===1?"":"s"}</div></div><span class="tag">${esc(sharingRole())}</span></div>
    ${sharingMembers.map(m=>`<div class="row"><span>${esc(sharingMemberName(m))}<div class="muted small">${esc(m.role||"member")}</div></span>${sharingIsOwner()&&m.user_id!==cloudUser?.()?.id?`<button class="btn small danger" onclick="sharingRemoveMember('${m.user_id}')">Remove</button>`:`<b>${m.user_id===cloudUser?.()?.id?"you":esc(m.role||"member")}</b>`}</div>`).join("")}
    <div class="actions">${sharingIsOwner()?`<button class="btn primary" onclick="sharingCreateInvite()">Invite another adult</button>`:""}<button class="btn" onclick="sharingPullEntries()">Refresh shared itinerary</button></div>
    <div class="actions">${sharingIsOwner()?`<button class="btn danger" onclick="sharingDeleteHousehold()">Delete shared household</button>`:`<button class="btn danger" onclick="sharingLeaveHousehold()">Leave shared household</button>`}</div>
    ${sharingLastPulledAt?`<div class="muted small">Shared itinerary checked ${esc(new Date(sharingLastPulledAt).toLocaleString())}</div>`:""}
    <div class="notice"><b>Privacy rule:</b> itinerary items stay private unless you explicitly turn on “Share with household” for that item.</div>
  </div>`;
}
function sharingOpenCreate(){
  modal("Create shared household",`<div class="stack"><label>Household name<input id="shareHouseName" value="Our household"></label><div class="notice">This creates a shared itinerary space. Your other Daily Life sections stay private.</div></div>`,"Create",async()=>{
    if(sharingBusy)return;sharingBusy=true;
    try{
      const name=$("#shareHouseName").value.trim()||"Our household";
      const {data,error}=await cloudClient.rpc("create_household",{p_name:name});
      if(error)throw error;
      closeModal();await sharingInit();render();
    }catch(error){alert("Could not create the shared household: "+(error?.message||"Unknown error"))}
    finally{sharingBusy=false}
  });
}
function sharingOpenJoin(){
  modal("Join shared household",`<div class="stack"><label>Invite code<input id="shareInviteCode" autocomplete="off" autocapitalize="characters"></label><div class="muted small">Use the one-time code created from the other adult's Daily Life account.</div></div>`,"Join",async()=>{
    if(sharingBusy)return;sharingBusy=true;
    try{
      const code=$("#shareInviteCode").value.trim();if(!code)return;
      const {data,error}=await cloudClient.rpc("accept_household_invite",{p_code:code});
      if(error)throw error;
      closeModal();await sharingInit();render();alert("Joined the shared household. Shared itinerary items can now sync between accounts.");
    }catch(error){alert("Could not join: "+(error?.message||"Invalid or expired invite code."))}
    finally{sharingBusy=false}
  });
}
async function sharingCreateInvite(){
  if(!sharingIsOwner()||!sharingHousehold?.id||sharingBusy)return;
  sharingBusy=true;
  try{
    const {data,error}=await cloudClient.rpc("create_household_invite",{p_household_id:sharingHousehold.id,p_expires_hours:168});
    if(error)throw error;
    sharingInviteCode=String(data||"");
    modal("Household invite",`<div class="stack"><div class="notice"><b>One-time invite code</b><div class="big" style="margin-top:8px;word-break:break-all">${esc(sharingInviteCode)}</div></div><button type="button" class="btn primary" onclick="sharingCopyInvite()">Copy code</button><div class="muted small">The code expires in 7 days and can be used once. Send it only to the person you want in this shared household.</div></div>`,"Done",()=>closeModal());
  }catch(error){alert("Could not create an invite: "+(error?.message||"Unknown error"))}
  finally{sharingBusy=false}
}
async function sharingCopyInvite(){
  if(!sharingInviteCode)return;
  try{await navigator.clipboard.writeText(sharingInviteCode);alert("Invite code copied.");}
  catch{alert("Clipboard access was unavailable. Press and hold the code to copy it.")}
}
async function sharingRemoveMember(userId){
  if(!sharingIsOwner()||!sharingHousehold?.id||!userId||sharingBusy)return;
  const member=sharingMembers.find(x=>x.user_id===userId),name=sharingMemberName(member||{});
  if(!confirm(`Remove ${name} from this shared household? Their shared itinerary items will also be removed. Their private Daily Life account and data will not be touched.`))return;
  sharingBusy=true;
  try{
    const {error}=await cloudClient.rpc("remove_household_member",{p_household_id:sharingHousehold.id,p_user_id:userId});
    if(error)throw error;
    await sharingInit();render();
  }catch(error){alert("Could not remove that household member: "+(error?.message||"Unknown error"))}
  finally{sharingBusy=false}
}
async function sharingLeaveHousehold(){
  if(sharingIsOwner()||!sharingHousehold?.id||sharingBusy)return;
  const id=sharingHousehold.id,name=sharingHousehold.name||"this household";
  if(!confirm(`Leave ${name}? Shared itinerary items you created will be removed. Your private Daily Life data stays in your own account.`))return;
  sharingBusy=true;
  try{
    const {error}=await cloudClient.rpc("leave_household",{p_household_id:id});
    if(error)throw error;
    sharingRemoveLocalCopies(id);sharingReset();await dbSet("state",state);render();
  }catch(error){alert("Could not leave the shared household: "+(error?.message||"Unknown error"))}
  finally{sharingBusy=false}
}
async function sharingDeleteHousehold(){
  if(!sharingIsOwner()||!sharingHousehold?.id||sharingBusy)return;
  const id=sharingHousehold.id,name=sharingHousehold.name||"this shared household";
  if(!confirm(`Delete ${name} for everyone? This removes the shared itinerary and memberships, but does not delete anyone's private Daily Life account or private data.`))return;
  if(!confirm("This cannot be undone. Delete the shared household?"))return;
  sharingBusy=true;
  try{
    const {error}=await cloudClient.rpc("delete_household",{p_household_id:id});
    if(error)throw error;
    sharingRemoveLocalCopies(id);sharingReset();await dbSet("state",state);render();
  }catch(error){alert("Could not delete the shared household: "+(error?.message||"Unknown error"))}
  finally{sharingBusy=false}
}

document.addEventListener("visibilitychange",()=>{if(!document.hidden&&sharingConnected())sharingPullEntries(true)});
