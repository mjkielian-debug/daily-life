/* Daily Life household sharing
   Shared itinerary items are opt-in. Finance, Vault, People, health, and other private state stay private.
*/
let sharingHousehold=null;
let sharingMembership=null;
let sharingMembers=[];
let sharingBusy=false;
let sharingLastPulledAt="";
let sharingInviteCode="";

function sharingReset(){
  sharingHousehold=null;sharingMembership=null;sharingMembers=[];sharingLastPulledAt="";sharingInviteCode="";
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
    if(!membership){sharingReset();return false}
    sharingMembership=membership;

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
    return true;
  }catch(error){
    console.warn("Household sharing init failed",error);
    return false;
  }
}
async function sharingPullEntries(shouldRender=true){
  const user=cloudUser?.();if(!user||!cloudClient||!sharingHousehold?.id)return 0;
  try{
    const {data,error}=await cloudClient.from("shared_entries")
      .select("id,household_id,owner_user_id,category,local_date,payload,editable_by_household,created_at,updated_at")
      .eq("household_id",sharingHousehold.id)
      .eq("category","event")
      .order("local_date",{ascending:true});
    if(error)throw error;
    const rows=data||[],ids=new Set(rows.map(r=>r.id));
    state.events=(state.events||[]).filter(e=>!(e.sharedHouseholdId===sharingHousehold.id&&e.sharedEntryId&&!ids.has(e.sharedEntryId)));
    let changed=0;
    for(const row of rows){
      const p=row.payload&&typeof row.payload==="object"?row.payload:{};
      let e=(state.events||[]).find(x=>x.sharedEntryId===row.id);
      if(!e){
        e={id:uid(),sharedEntryId:row.id,sharedHouseholdId:row.household_id,source:"Shared household"};
        state.events.push(e);changed++;
      }
      const before=JSON.stringify(e);
      Object.assign(e,{
        shared:true,
        sharedEntryId:row.id,
        sharedHouseholdId:row.household_id,
        sharedOwnerUserId:row.owner_user_id,
        sharedEditable:row.editable_by_household!==false,
        title:String(p.title||"Shared event"),
        child:String(p.child||""),
        type:String(p.type||"other"),
        date:String(p.date||row.local_date||ymd()),
        startTime:String(p.startTime||""),
        endTime:String(p.endTime||""),
        location:String(p.location||""),
        notes:String(p.notes||""),
        status:String(p.status||"confirmed"),
        source:"Shared household"
      });
      if(JSON.stringify(e)!==before)changed++;
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
function sharingEventControl(x={}){
  if(!sharingCanShare())return "";
  return `<label class="task"><input id="eshared" type="checkbox" ${x.shared||x.sharedEntryId?"checked":""}><span><b>Share with household</b><div class="muted small">Only this itinerary item is shared. Private Daily Life sections stay private.</div></span></label>`;
}
function sharingMemberName(m){
  if(m.user_id===cloudUser?.()?.id)return String(m.display_name||state?.profile?.name||"You");
  return String(m.display_name||"Household member");
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
    ${sharingMembers.map(m=>`<div class="row"><span>${esc(sharingMemberName(m))}</span><b>${esc(m.role||"member")}</b></div>`).join("")}
    <div class="actions">${sharingIsOwner()?`<button class="btn primary" onclick="sharingCreateInvite()">Invite another adult</button>`:""}<button class="btn" onclick="sharingPullEntries()">Refresh shared itinerary</button></div>
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
