// Daily Life cloud account + private sync bridge.
// The publishable key is designed for browser clients. Row Level Security in
// Supabase protects private rows. Never put secret/service-role keys or bank
// provider access tokens in this public file.
const DAILY_CLOUD_URL="https://lticktlgrlljlafmjsao.supabase.co";
const DAILY_CLOUD_PUBLISHABLE_KEY="sb_publishable_S8rk3-LkoyPLuyw2p_v7gA_yskyW--m";

let cloudClient=null;
let cloudSession=null;
let cloudRemoteUpdatedAt=null;
let cloudBusy=false;
let cloudError="";
let cloudNeedsReview=false;
let cloudAutoCanPush=false;
let cloudPushTimer=null;
let cloudEntryPullBusy=false;

const cloudUser=()=>cloudSession?.user||null;
const cloudMetaKey=name=>`dailyLifeCloud:${cloudUser()?.id||"guest"}:${name}`;
const cloudAutoEnabled=()=>!!cloudUser()&&localStorage.getItem(cloudMetaKey("auto"))==="1";
const cloudLastPushed=()=>cloudUser()?localStorage.getItem(cloudMetaKey("lastPushed")):null;
const cloudSetLastPushed=value=>{if(cloudUser()&&value)localStorage.setItem(cloudMetaKey("lastPushed"),value)};
const cloudLastSignature=()=>cloudUser()?localStorage.getItem(cloudMetaKey("lastSignature")):null;
const cloudSetLastSignature=value=>{if(cloudUser()&&value)localStorage.setItem(cloudMetaKey("lastSignature"),value)};

async function cloudInit(){
  try{
    if(!window.supabase?.createClient)throw new Error("Cloud library did not load.");
    cloudClient=window.supabase.createClient(DAILY_CLOUD_URL,DAILY_CLOUD_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await cloudClient.auth.getSession();
    if(error)throw error;
    cloudSession=data.session||null;
    if(cloudSession){
      await cloudRefreshMetadata();
      await cloudPrepareAutoSync();
      await cloudPullLifeEntries(false);
      await cloudPullHouseholdMembers();
      await cloudPullPetProfiles();
    }
    cloudClient.auth.onAuthStateChange((_event,session)=>{
      cloudSession=session||null;
      cloudError="";cloudNeedsReview=false;cloudAutoCanPush=false;
      if(cloudPushTimer){clearTimeout(cloudPushTimer);cloudPushTimer=null}
      setTimeout(async()=>{
        if(cloudSession){
          await cloudRefreshMetadata();
          await cloudPrepareAutoSync();
          await cloudPullLifeEntries(false);
          await cloudPullHouseholdMembers();
      await cloudPullPetProfiles();
          if(typeof cloudFinanceInit==="function")await cloudFinanceInit();
        }else cloudRemoteUpdatedAt=null;
        if(typeof render==="function")render();
      },0);
    });
  }catch(error){
    cloudError=error?.message||"Cloud unavailable.";
  }
}

function cloudPanel(){
  if(!cloudClient){
    return `<div class="card"><div class="section-title"><h2>Cloud account</h2><span class="tag">offline</span></div><div class="notice">Cloud account tools are unavailable right now. Your local data is still safe on this device.</div></div>`;
  }
  const user=cloudUser();
  if(!user){
    return `<div class="card"><div class="section-title"><h2>Cloud account</h2><span class="tag">optional</span></div><p class="muted">Sign in to keep a private cloud copy and later use the same Daily Life account on another device. Local data stays on this device until you explicitly upload it.</p>${cloudError?`<div class="notice">${esc(cloudError)}</div>`:""}<button class="btn primary" onclick="openCloudAuth()">Sign in / create account</button></div>`;
  }
  const updated=cloudRemoteUpdatedAt?new Date(cloudRemoteUpdatedAt).toLocaleString():"No cloud copy yet";
  const auto=cloudAutoEnabled();
  return `<div class="card glow"><div class="section-title"><h2>Cloud account</h2><span class="tag">${auto?"auto sync on":"signed in"}</span></div>
  <div class="row"><span>Account</span><b>${esc(user.email||"Signed in")}</b></div>
  <div class="row"><span>Cloud copy</span><b>${esc(updated)}</b></div>
  ${cloudNeedsReview?`<div class="warning"><b>Cloud copy changed elsewhere.</b> Automatic upload is paused so this device cannot overwrite newer cloud data. Restore the cloud copy, or explicitly keep this device.</div>`:""}
  <p class="muted small">Your device keeps its IndexedDB copy. Outfit photos remain local while photo storage is built separately.</p>
  ${cloudError?`<div class="notice">${esc(cloudError)}</div>`:""}
  <div class="actions">
    ${cloudNeedsReview?`<button class="btn primary" onclick="cloudRestoreSnapshot()">Use cloud copy</button><button class="btn" onclick="cloudKeepThisDevice()">Keep this device</button>`:`
      <button class="btn primary" onclick="cloudUploadSnapshot()">Upload now</button>
      <button class="btn" onclick="cloudRestoreSnapshot()">Restore cloud copy</button>
      <button class="btn" onclick="cloudPullLifeEntries(true)">Pull ChatGPT logs</button>
      ${auto?`<button class="btn" onclick="cloudDisableAutoSync()">Turn auto sync off</button>`:`<button class="btn" onclick="cloudEnableAutoSync()">Enable auto sync</button>`}
    `}
    <button class="btn" onclick="cloudSignOut()">Sign out</button>
  </div></div>`;
}

function openCloudAuth(){
  modal("Daily Life cloud account",`<div class="stack"><label>Email<input id="cloudEmail" type="email" autocomplete="email"></label><label>Password<input id="cloudPassword" type="password" minlength="6" autocomplete="current-password"></label></div><p class="muted small">Use an email you can access. New accounts may require email confirmation. This is a Daily Life app account, separate from your Supabase developer login.</p><div class="actions"><button class="btn" type="button" onclick="cloudSignUpFromForm()">Create account</button></div>`,"Sign in",cloudSignInFromForm);
}

function cloudCredentials(){
  const email=document.querySelector("#cloudEmail")?.value.trim()||"";
  const password=document.querySelector("#cloudPassword")?.value||"";
  if(!email||password.length<6){
    alert("Enter your email and a password with at least 6 characters.");
    return null;
  }
  return {email,password};
}

async function cloudEnsureProfile(){
  const user=cloudUser();if(!user||!cloudClient)return;
  const displayName=typeof state!=="undefined"?String(state?.profile?.name||"").trim():"";
  const {error}=await cloudClient.from("profiles").upsert({
    user_id:user.id,
    display_name:displayName||null,
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",
    updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)throw error;
}

function cloudWishlistKey(w){
  const url=String(w?.url||w?.elfsterUrl||"").trim().toLowerCase();
  if(url)return"url:"+url;
  const item=String(w?.item||"").trim().toLowerCase(),source=String(w?.source||"").trim().toLowerCase();
  return"item:"+source+"|"+item;
}
function cloudMergeWishlist(...lists){
  const out=[],seen=new Set();
  for(const list of lists){
    for(const raw of Array.isArray(list)?list:[]){
      if(!raw||typeof raw!=="object")continue;
      const w={...raw};
      if(!w.item&&w.title)w.item=String(w.title);
      if(!w.item&&!w.url)continue;
      if(!w.id)w.id=uid();
      if(!w.source)w.source="Elfster";
      const key=cloudWishlistKey(w);
      if(!key||seen.has(key))continue;
      seen.add(key);out.push(w);
    }
  }
  return out;
}

async function cloudPullPetProfiles(){
  const user=cloudUser();if(!user||!cloudClient||typeof state==="undefined")return 0;
  try{
    const {data,error}=await cloudClient.from("pet_profiles")
      .select("id,display_name,species,birthday,metadata,updated_at")
      .eq("owner_user_id",user.id)
      .order("created_at",{ascending:true});
    if(error)throw error;
    if(!Array.isArray(state.pets))state.pets=[];
    let changed=0;
    for(const row of data||[]){
      const name=String(row.display_name||"").trim();if(!name)continue;
      const meta=row.metadata&&typeof row.metadata==="object"?row.metadata:{};
      let p=state.pets.find(x=>x.cloudPetId===row.id);
      if(!p)p=state.pets.find(x=>String(x.name||"").trim().toLowerCase()===name.toLowerCase());
      if(!p){p={id:uid(),name};state.pets.push(p);changed++}
      const before=JSON.stringify(p);
      p.cloudPetId=row.id;p.name=name;p.species=String(row.species||meta.species||"pet");
      if(row.birthday)p.birthday=row.birthday;else if(!p.birthday&&meta.birthdayText)p.birthday=String(meta.birthdayText);
      for(const key of ["diet","vet","medications","microchip","lifestyle","personality","favorites","status","notes"])if(meta[key]!==undefined)p[key]=String(meta[key]||"");
      if(meta.householdCare&&typeof meta.householdCare==="object"&&!(state.settings?.petCare?.configured)){
        state.settings=state.settings||{};
        state.settings.petCare={
          robotLitterBoxes:Math.max(0,Number(meta.householdCare.robotLitterBoxes||0)),
          standardLitterBoxes:Math.max(0,Number(meta.householdCare.standardLitterBoxes||0)),
          feedingRoutine:String(meta.householdCare.feedingRoutine||""),
          carrierLocation:String(meta.householdCare.carrierLocation||""),
          emergencyVet:String(meta.householdCare.emergencyVet||""),
          sitterNotes:String(meta.householdCare.sitterNotes||""),
          notes:String(meta.householdCare.notes||""),
          configured:true
        };
        changed++;
      }
      if(JSON.stringify(p)!==before)changed++;
    }
    if(changed)await dbSet("state",state);
    return changed;
  }catch(error){
    cloudError=error?.message||"Could not sync private pet profiles.";
    return 0;
  }
}
async function cloudUpsertPetProfile(p){
  const user=cloudUser();if(!user||!cloudClient||!p?.name)return false;
  const birthdayText=String(p.birthday||"").trim(),birthday=/^\d{4}-\d{2}-\d{2}$/.test(birthdayText)?birthdayText:null;
  let existingMeta={};
  if(p.cloudPetId){
    const current=await cloudClient.from("pet_profiles").select("metadata").eq("id",p.cloudPetId).eq("owner_user_id",user.id).maybeSingle();
    if(current.error)throw current.error;
    if(current.data?.metadata&&typeof current.data.metadata==="object")existingMeta=current.data.metadata;
  }
  const payload={
    owner_user_id:user.id,
    display_name:String(p.name).trim(),
    species:String(p.species||"pet").trim()||"pet",
    birthday,
    metadata:{
      ...existingMeta,
      birthdayText:birthday?null:birthdayText||null,
      diet:String(p.diet||""),
      vet:String(p.vet||""),
      medications:String(p.medications||""),
      microchip:String(p.microchip||""),
      lifestyle:String(p.lifestyle||""),
      personality:String(p.personality||""),
      favorites:String(p.favorites||""),
      status:String(p.status||"Active"),
      notes:String(p.notes||"")
    },
    updated_at:new Date().toISOString()
  };
  let result;
  if(p.cloudPetId){
    result=await cloudClient.from("pet_profiles").update(payload).eq("id",p.cloudPetId).eq("owner_user_id",user.id).select("id").maybeSingle();
  }else{
    result=await cloudClient.from("pet_profiles").upsert(payload,{onConflict:"owner_user_id,display_name"}).select("id").single();
  }
  if(result.error)throw result.error;
  if(result.data?.id)p.cloudPetId=result.data.id;
  await dbSet("state",state);
  return true;
}

async function cloudUpsertPetHouseholdCare(){
  const user=cloudUser();if(!user||!cloudClient||typeof state==="undefined")return false;
  const care=state.settings?.petCare||{};
  const {data,error}=await cloudClient.from("pet_profiles").select("id,metadata").eq("owner_user_id",user.id);
  if(error)throw error;
  for(const row of data||[]){
    const metadata=row.metadata&&typeof row.metadata==="object"?row.metadata:{};
    const next={
      ...metadata,
      householdCare:{
        robotLitterBoxes:Math.max(0,Number(care.robotLitterBoxes||0)),
        standardLitterBoxes:Math.max(0,Number(care.standardLitterBoxes||0)),
        feedingRoutine:String(care.feedingRoutine||""),
        carrierLocation:String(care.carrierLocation||""),
        emergencyVet:String(care.emergencyVet||""),
        sitterNotes:String(care.sitterNotes||""),
        notes:String(care.notes||"")
      }
    };
    const result=await cloudClient.from("pet_profiles").update({metadata:next,updated_at:new Date().toISOString()}).eq("id",row.id).eq("owner_user_id",user.id);
    if(result.error)throw result.error;
  }
  return true;
}

async function cloudPullHouseholdMembers(){
  const user=cloudUser();if(!user||!cloudClient||typeof state==="undefined")return 0;
  try{
    const {data,error}=await cloudClient.from("household_members")
      .select("id,display_name,relationship,birthday,metadata,updated_at")
      .eq("owner_user_id",user.id)
      .order("created_at",{ascending:true});
    if(error)throw error;
    if(!Array.isArray(state.peopleProfiles))state.peopleProfiles=[];
    let changed=0;
    for(const row of data||[]){
      const name=String(row.display_name||"").trim();if(!name)continue;
      const relationship=String(row.relationship||"").trim();
      let p=state.peopleProfiles.find(x=>x.cloudMemberId===row.id);
      if(!p)p=state.peopleProfiles.find(x=>String(x.name||"").trim().toLowerCase()===name.toLowerCase()&&(!relationship||String(x.relationship||"").trim().toLowerCase()===relationship.toLowerCase()));
      const meta=row.metadata&&typeof row.metadata==="object"?row.metadata:{};
      if(!p){
        p={id:uid(),name,relationship,birthday:row.birthday||meta.birthdayText||"",livesWithUser:meta.livesWithUser===true,profileScope:String(meta.profileScope||"extended"),relatedTo:String(meta.relatedTo||""),elfsterUrl:String(meta.elfsterUrl||""),favoriteColors:[],favoriteCharacters:[],interests:[],favoriteFoods:[],sizes:{},wishlist:[],birthdayPlan:{tasks:[]}};
        state.peopleProfiles.push(p);changed++;
      }
      const before=JSON.stringify(p);
      p.cloudMemberId=row.id;
      p.name=name;
      if(relationship)p.relationship=relationship;
      if(row.birthday)p.birthday=row.birthday;
      else if(!p.birthday&&meta.birthdayText)p.birthday=String(meta.birthdayText);
      if(meta.livesWithUser!==undefined)p.livesWithUser=meta.livesWithUser===true;
      if(meta.profileScope)p.profileScope=String(meta.profileScope);
      if(meta.relatedTo!==undefined)p.relatedTo=String(meta.relatedTo||"");
      if(meta.school!==undefined)p.school=String(meta.school||"");
      if(meta.elfsterUrl!==undefined)p.elfsterUrl=String(meta.elfsterUrl||"");
      if(meta.elfsterLastSyncedAt!==undefined)p.elfsterLastSyncedAt=String(meta.elfsterLastSyncedAt||"");
      if(Array.isArray(meta.familyLinks))p.familyLinks=meta.familyLinks.filter(x=>x&&x.name).map(x=>({name:String(x.name),label:String(x.label||"")}));
      if(Array.isArray(meta.schoolContacts))p.schoolContacts=meta.schoolContacts.filter(x=>x&&(x.name||x.email)).map(x=>({name:String(x.name||""),role:String(x.role||""),email:String(x.email||""),notes:String(x.notes||"")}));
      p.wishlist=cloudMergeWishlist(p.wishlist,meta.wishlist,meta.elfsterWishes);
      if(Array.isArray(meta.personNotes)){
        const seen=new Set((p.personNotes||[]).map(n=>String(n.id||"")));
        p.personNotes=[...(p.personNotes||[]),...meta.personNotes.filter(n=>n&&(!n.id||!seen.has(String(n.id))))];
      }
      for(const key of ["favoriteColors","favoriteCharacters","favoriteFoods","interests","importantDates","sharedPlans"]){
        if(Array.isArray(meta[key])&&(!Array.isArray(p[key])||!p[key].length))p[key]=meta[key];
      }
      if(meta.sizes&&typeof meta.sizes==="object"&&(!p.sizes||!Object.keys(p.sizes).length))p.sizes=meta.sizes;
      for(const key of ["giftNotes","routineNotes"])if(meta[key]&&!p[key])p[key]=String(meta[key]);
      if(JSON.stringify(p)!==before)changed++;
    }
    if(changed)await dbSet("state",state);
    return changed;
  }catch(error){
    cloudError=error?.message||"Could not sync private People profiles.";
    return 0;
  }
}

async function cloudUpsertPersonProfile(p){
  const user=cloudUser();if(!user||!cloudClient||!p?.name)return false;
  const birthdayText=String(p.birthday||"").trim(),birthday=/^\d{4}-\d{2}-\d{2}$/.test(birthdayText)?birthdayText:null;
  let existingMeta={};
  if(p.cloudMemberId){
    const current=await cloudClient.from("household_members").select("metadata").eq("id",p.cloudMemberId).eq("owner_user_id",user.id).maybeSingle();
    if(current.error)throw current.error;
    if(current.data?.metadata&&typeof current.data.metadata==="object")existingMeta=current.data.metadata;
  }
  const payload={
    owner_user_id:user.id,
    display_name:String(p.name).trim(),
    relationship:String(p.relationship||"").trim()||null,
    birthday,
    metadata:{
      ...existingMeta,
      birthdayText:birthday?null:birthdayText||null,
      livesWithUser:p.livesWithUser===true,
      profileScope:String(p.profileScope||(p.livesWithUser?"household":"extended")),
      relatedTo:String(p.relatedTo||""),
      school:String(p.school||""),
      elfsterUrl:String(p.elfsterUrl||""),
      elfsterLastSyncedAt:String(p.elfsterLastSyncedAt||existingMeta.elfsterLastSyncedAt||""),
      wishlist:Array.isArray(p.wishlist)?p.wishlist:[],
      personNotes:Array.isArray(p.personNotes)?p.personNotes:[],
      familyLinks:Array.isArray(p.familyLinks)?p.familyLinks:[],
      schoolContacts:Array.isArray(p.schoolContacts)?p.schoolContacts:[],
      favoriteColors:Array.isArray(p.favoriteColors)?p.favoriteColors:[],
      favoriteCharacters:Array.isArray(p.favoriteCharacters)?p.favoriteCharacters:[],
      favoriteFoods:Array.isArray(p.favoriteFoods)?p.favoriteFoods:[],
      interests:Array.isArray(p.interests)?p.interests:[],
      sizes:p.sizes&&typeof p.sizes==="object"?p.sizes:{},
      giftNotes:String(p.giftNotes||""),
      importantDates:Array.isArray(p.importantDates)?p.importantDates:[],
      sharedPlans:Array.isArray(p.sharedPlans)?p.sharedPlans:[],
      routineNotes:String(p.routineNotes||"")
    },
    updated_at:new Date().toISOString()
  };
  let result;
  if(p.cloudMemberId){
    result=await cloudClient.from("household_members").update(payload).eq("id",p.cloudMemberId).eq("owner_user_id",user.id).select("id").maybeSingle();
  }else{
    result=await cloudClient.from("household_members").insert(payload).select("id").single();
  }
  if(result.error)throw result.error;
  if(result.data?.id)p.cloudMemberId=result.data.id;
  await dbSet("state",state);
  return true;
}

async function cloudSignInFromForm(){
  if(cloudBusy)return;
  const creds=cloudCredentials();if(!creds)return;
  cloudBusy=true;
  try{
    const {data,error}=await cloudClient.auth.signInWithPassword(creds);
    if(error)throw error;
    cloudSession=data.session||null;
    await cloudEnsureProfile();
    await cloudRefreshMetadata();
    await cloudPrepareAutoSync();
    await cloudPullLifeEntries(false);
    await cloudPullHouseholdMembers();
      await cloudPullPetProfiles();
    if(typeof cloudFinanceInit==="function")await cloudFinanceInit();
    closeModal();render();
  }catch(error){
    alert("Could not sign in: "+(error?.message||"Unknown error"));
  }finally{cloudBusy=false}
}

async function cloudSignUpFromForm(){
  if(cloudBusy)return;
  const creds=cloudCredentials();if(!creds)return;
  cloudBusy=true;
  try{
    const {data,error}=await cloudClient.auth.signUp(creds);
    if(error)throw error;
    if(data.session){
      cloudSession=data.session;
      await cloudEnsureProfile();
      await cloudRefreshMetadata();
      if(typeof cloudFinanceInit==="function")await cloudFinanceInit();
      closeModal();render();
      alert("Daily Life cloud account created and signed in.");
    }else{
      alert("Account created. Check your email to confirm it, then return here and sign in.");
    }
  }catch(error){
    alert("Could not create account: "+(error?.message||"Unknown error"));
  }finally{cloudBusy=false}
}

async function cloudSignOut(){
  if(!cloudClient)return;
  if(!confirm("Sign out of the Daily Life cloud account? Local records on this device will remain here."))return;
  const {error}=await cloudClient.auth.signOut();
  if(error){alert("Could not sign out: "+error.message);return}
  cloudSession=null;cloudRemoteUpdatedAt=null;cloudError="";cloudNeedsReview=false;cloudAutoCanPush=false;render();
}

function cloudStateForUpload(){
  const copy=structuredClone(state);
  // Large base64 photos remain local for now. A private Storage bucket will be
  // added separately so snapshots stay small and reliable.
  if(Array.isArray(copy.outfits)){
    for(const outfit of copy.outfits){
      if(outfit.photo){delete outfit.photo;outfit.photoLocalOnly=true}
    }
  }
  for(const key of ["pets","plants"]){
    if(!Array.isArray(copy[key]))continue;
    for(const item of copy[key]){
      if(item.photo){delete item.photo;item.photoLocalOnly=true}
    }
  }
  return copy;
}

function cloudStateSignature(){
  const text=JSON.stringify(cloudStateForUpload());
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16)+":"+text.length;
}

async function cloudRefreshMetadata(){
  const user=cloudUser();if(!user||!cloudClient)return;
  const {data,error}=await cloudClient.from("app_snapshots")
    .select("updated_at")
    .eq("owner_user_id",user.id)
    .maybeSingle();
  if(error)throw error;
  cloudRemoteUpdatedAt=data?.updated_at||null;
}

async function cloudPrepareAutoSync(){
  if(!cloudAutoEnabled()||!cloudUser()){cloudAutoCanPush=false;return}
  await cloudRefreshMetadata();
  const last=cloudLastPushed();
  if(cloudRemoteUpdatedAt&&!last){
    cloudNeedsReview=true;cloudAutoCanPush=false;return;
  }
  if(cloudRemoteUpdatedAt&&last&&new Date(cloudRemoteUpdatedAt).getTime()>new Date(last).getTime()+2000){
    cloudNeedsReview=true;cloudAutoCanPush=false;return;
  }
  cloudNeedsReview=false;cloudAutoCanPush=true;
  if(!cloudRemoteUpdatedAt)await cloudPushSnapshotInternal(true);
  await cloudPullLifeEntries(false);
}

async function cloudPushSnapshotInternal(forceOverwrite=false){
  const user=cloudUser();if(!user||!cloudClient)return false;
  if(!forceOverwrite){
    const {data,error}=await cloudClient.from("app_snapshots")
      .select("updated_at").eq("owner_user_id",user.id).maybeSingle();
    if(error)throw error;
    const remote=data?.updated_at||null,last=cloudLastPushed();
    if(remote&&last&&new Date(remote).getTime()>new Date(last).getTime()+2000){
      cloudRemoteUpdatedAt=remote;cloudNeedsReview=true;cloudAutoCanPush=false;
      if(typeof render==="function")render();
      return false;
    }
    if(remote&&!last){
      cloudRemoteUpdatedAt=remote;cloudNeedsReview=true;cloudAutoCanPush=false;
      if(typeof render==="function")render();
      return false;
    }
  }
  await cloudEnsureProfile();
  const now=new Date().toISOString();
  const {error}=await cloudClient.from("app_snapshots").upsert({
    owner_user_id:user.id,
    schema_version:Number(state.version)||1,
    state:cloudStateForUpload(),
    updated_at:now
  },{onConflict:"owner_user_id"});
  if(error)throw error;
  cloudRemoteUpdatedAt=now;cloudSetLastPushed(now);cloudSetLastSignature(cloudStateSignature());cloudNeedsReview=false;
  return true;
}

async function cloudUploadSnapshot(){
  const user=cloudUser();
  if(!user||!cloudClient){openCloudAuth();return}
  if(!confirm("Upload this device's current Daily Life data to your private cloud copy? This replaces the previous cloud snapshot but does not erase local data."))return;
  cloudBusy=true;cloudError="";
  try{
    await cloudPushSnapshotInternal(true);
    render();alert("Private cloud copy uploaded.");
  }catch(error){
    cloudError=error?.message||"Cloud upload failed.";render();
    alert("Could not upload the cloud copy. Your local data was not changed.");
  }finally{cloudBusy=false}
}

async function cloudRestoreSnapshot(){
  const user=cloudUser();
  if(!user||!cloudClient){openCloudAuth();return}
  cloudBusy=true;cloudError="";
  try{
    const {data,error}=await cloudClient.from("app_snapshots")
      .select("state,schema_version,updated_at")
      .eq("owner_user_id",user.id)
      .maybeSingle();
    if(error)throw error;
    if(!data?.state){alert("There is no cloud copy for this account yet.");return}
    if(!confirm(`Restore the cloud copy from ${new Date(data.updated_at).toLocaleString()} onto this device? This replaces the current local state. Export a local backup first if you may need it.`))return;
    state=migrateState(data.state);
    await dbSet("state",state);
    cloudRemoteUpdatedAt=data.updated_at||null;
    cloudSetLastPushed(cloudRemoteUpdatedAt);
    cloudSetLastSignature(cloudStateSignature());
    cloudNeedsReview=false;cloudAutoCanPush=cloudAutoEnabled();
    await cloudPullLifeEntries(false);
    await cloudPullHouseholdMembers();
    await cloudPullPetProfiles();
    render();alert("Cloud copy restored to this device.");
  }catch(error){
    cloudError=error?.message||"Cloud restore failed.";render();
    alert("Could not restore the cloud copy. Your local data was not changed.");
  }finally{cloudBusy=false}
}

async function cloudKeepThisDevice(){
  if(!confirm("Keep this device's copy and overwrite the newer cloud snapshot? Use this only if this device really has the version you want."))return;
  try{
    await cloudPushSnapshotInternal(true);
    cloudAutoCanPush=cloudAutoEnabled();render();
  }catch(error){
    cloudError=error?.message||"Could not replace the cloud copy.";render();
  }
}

async function cloudEnableAutoSync(){
  const user=cloudUser();if(!user||!cloudClient){openCloudAuth();return}
  await cloudRefreshMetadata();
  const last=cloudLastPushed();
  if(cloudRemoteUpdatedAt&&!last){
    alert("A cloud copy already exists. Restore that cloud copy first, or use Upload now if this device is the copy you intentionally want to keep.");
    return;
  }
  if(!cloudRemoteUpdatedAt){
    if(!confirm("Turn on automatic private sync and upload this device as the first cloud copy?"))return;
    try{await cloudPushSnapshotInternal(true)}catch(error){alert("Could not create the first cloud copy: "+error.message);return}
  }
  localStorage.setItem(cloudMetaKey("auto"),"1");
  cloudAutoCanPush=true;cloudNeedsReview=false;
  await cloudPullLifeEntries(false);
  render();
}

function cloudDisableAutoSync(){
  if(!cloudUser())return;
  localStorage.removeItem(cloudMetaKey("auto"));
  cloudAutoCanPush=false;
  if(cloudPushTimer){clearTimeout(cloudPushTimer);cloudPushTimer=null}
  render();
}

function cloudSchedulePush(){
  if(!cloudAutoEnabled()||!cloudAutoCanPush||cloudNeedsReview||!cloudUser())return;
  if(cloudStateSignature()===cloudLastSignature())return;
  if(cloudPushTimer)clearTimeout(cloudPushTimer);
  cloudPushTimer=setTimeout(async()=>{
    cloudPushTimer=null;
    try{await cloudPushSnapshotInternal(false)}
    catch(error){cloudError=error?.message||"Automatic cloud sync failed."}
  },1800);
}

function cloudEntryAlreadyApplied(id){
  if((state.settings?.appliedCloudEntryIds||[]).includes(id))return true;
  const arrays=["tasks","workShifts","sleepLogs","waterLogs","stretchLogs","selfCare","selfCareActivities","foodLogs","readingLogs","chores","peopleProfiles","birthdaySuggestions","pets","petLogs","petRecords","petCareRoutines","plants","plantLogs","plantCareRoutines","gardenTasks","gardenJournal","gardenSeeds","projects","vehicles","vehicleServices","orders","deliveries","workouts","relationshipCheckins","meals","mealSuggestions","mealFeedback","pantryScans","shopping","homeLogs","tireLogs","events","paychecks","expectedIncome","employmentProfiles","incomeSeasonality"];
  return arrays.some(key=>Array.isArray(state[key])&&state[key].some(x=>x.cloudEntryId===id));
}
function cloudMarkEntryApplied(id){
  if(!state.settings.appliedCloudEntryIds)state.settings.appliedCloudEntryIds=[];
  if(!state.settings.appliedCloudEntryIds.includes(id))state.settings.appliedCloudEntryIds.push(id);
  if(state.settings.appliedCloudEntryIds.length>3000)state.settings.appliedCloudEntryIds=state.settings.appliedCloudEntryIds.slice(-2500);
}

function cloudApplyLifeEntry(row){
  if(!row?.id||cloudEntryAlreadyApplied(row.id))return false;
  const p=row.payload||{},date=row.local_date||String(row.occurred_at||"").slice(0,10)||ymd();
  const common={id:uid(),cloudEntryId:row.id,date};
  switch(row.category){
    case "water":
      if(Number(p.oz)>0)state.waterLogs.push({...common,oz:Number(p.oz)});else return false;
      return true;
    case "stretch":
      if(Number(p.minutes)>0)state.stretchLogs.push({...common,minutes:Number(p.minutes)});else return false;
      return true;
    case "self_care":{
      const key=String(p.key||"").trim();if(!key)return false;
      let x=state.selfCare.find(x=>x.date===date&&x.key===key);
      if(x)Object.assign(x,{done:p.done!==false,cloudEntryId:row.id});
      else state.selfCare.push({...common,key,done:p.done!==false});
      return true;
    }
    case "personal_care":{
      if(!Array.isArray(state.selfCareActivities))state.selfCareActivities=[];
      if(!Array.isArray(state.settings.personalCareActivities))state.settings.personalCareActivities=[];
      let key=String(p.key||"").trim(),label=String(p.label||p.name||"").trim(),group=String(p.group||"Other");
      const builtins={
        "hair wash":"hair_wash","wash hair":"hair_wash","hair mask":"hair_mask","deep condition":"hair_mask",
        "shave":"shave","body grooming":"shave","nails":"nails","manicure":"nails","face mask":"face_mask",
        "exfoliate":"exfoliate","exfoliation":"exfoliate","brows":"brows","eyebrows":"brows","foot care":"foot_care"
      };
      if(!key&&label)key=builtins[label.toLowerCase()]||"";
      if(!key&&label){
        const existing=state.settings.personalCareActivities.find(x=>String(x.label||"").trim().toLowerCase()===label.toLowerCase());
        if(existing)key=existing.key;
        else{
          key="personal_"+uid().replace(/[^a-z0-9]/gi,"").slice(0,12);
          state.settings.personalCareActivities.push({key,label,group,builtin:false});
        }
      }
      if(!key)return false;
      state.selfCareActivities.push({...common,key,time:String(p.time||""),notes:String(p.notes||""),source:"chatgpt"});
      return true;
    }
    case "food":{
      const name=String(p.name||"").trim();if(!name)return false;
      state.foodLogs.push({...common,name,category:String(p.category||"food"),calories:Number(p.calories||0),protein:Number(p.protein||0),carbs:Number(p.carbs||0),fat:Number(p.fat||0),fiber:Number(p.fiber||0),caffeineMg:Number(p.caffeineMg||0),micronutrients:p.micronutrients&&typeof p.micronutrients==="object"?p.micronutrients:{},notes:String(p.notes||"")});
      return true;
    }
    case "sleep":{
      if(!Array.isArray(state.sleepLogs))state.sleepLogs=[];
      const sleepDate=String(p.date||date),bedtime=String(p.bedtime||""),wakeTime=String(p.wakeTime||""),energy=Number(p.energy||0);
      let x=state.sleepLogs.find(x=>x.date===sleepDate&&x.cloudEntryId===row.id);
      if(!x){x={...common,date:sleepDate};state.sleepLogs.push(x)}
      Object.assign(x,{bedtime,wakeTime,energy:Number.isFinite(energy)?energy:0,notes:String(p.notes||""),cloudEntryId:row.id});
      return true;
    }
    case "work_shift":{
      let x=state.workShifts.find(x=>x.date===date);
      if(!x){x=common;state.workShifts.push(x)}
      Object.assign(x,{scheduled:String(p.scheduled||x.scheduled||""),start:String(p.start||x.start||""),end:String(p.end||x.end||""),rate:Number(p.rate??x.rate??0),cloudEntryId:row.id});
      return true;
    }
    case "tire":
      if(!Number.isFinite(Number(p.psi)))return false;
      state.tireLogs.push({...common,time:String(p.time||new Date(row.occurred_at||Date.now()).toTimeString().slice(0,5)),psi:Number(p.psi),event:String(p.event||"reading"),notes:String(p.notes||"")});
      return true;
    case "reading":{
      const reader=String(p.reader||"").trim(),pages=Number(p.pages||0);if(!reader||pages<=0)return false;
      state.readingLogs.push({...common,reader,book:String(p.book||""),start:Number(p.start||0),end:Number(p.end||0),pages,minutes:Number(p.minutes||0)});
      return true;
    }
    case "chore":{
      const child=String(p.child||"").trim(),chore=String(p.chore||"").trim();if(!child||!chore)return false;
      state.chores.push({...common,child,chore,done:!!p.done});return true;
    }
    case "pet_profile":{
      if(!Array.isArray(state.pets))state.pets=[];
      const name=String(p.name||p.petName||p.pet||"").trim();if(!name)return false;
      let x=state.pets.find(x=>String(x.name||"").trim().toLowerCase()===name.toLowerCase());
      if(!x){x={id:uid(),name};state.pets.push(x)}
      Object.assign(x,{
        name,
        species:String(p.species||x.species||"pet"),
        lifestyle:String(p.lifestyle||x.lifestyle||""),
        birthday:String(p.birthday||x.birthday||""),
        diet:String(p.diet||x.diet||""),
        vet:String(p.vet||x.vet||""),
        medications:String(p.medications||x.medications||""),
        microchip:String(p.microchip||x.microchip||""),
        personality:String(p.personality||x.personality||""),
        favorites:String(p.favorites||x.favorites||""),
        status:String(p.status||x.status||"Active"),
        notes:String(p.notes||x.notes||""),
        cloudEntryId:row.id
      });
      return true;
    }
    case "plant_profile":{
      if(!Array.isArray(state.plants))state.plants=[];
      const name=String(p.name||p.plantName||p.plant||"").trim();if(!name)return false;
      let x=state.plants.find(x=>String(x.name||"").trim().toLowerCase()===name.toLowerCase());
      if(!x){x={id:uid(),name};state.plants.push(x)}
      Object.assign(x,{
        name,
        type:String(p.type||p.plantType||x.type||"Plant"),
        status:String(p.status||x.status||"Active"),
        location:String(p.location||x.location||""),
        light:String(p.light||x.light||""),
        waterEveryDays:Number(p.waterEveryDays??x.waterEveryDays??0),
        plantedDate:String(p.plantedDate||x.plantedDate||""),
        source:String(p.source||x.source||"ChatGPT"),
        notes:String(p.notes||x.notes||""),
        cloudEntryId:row.id
      });
      return true;
    }
    case "pet_routine":{
      if(!Array.isArray(state.petCareRoutines))state.petCareRoutines=[];
      const title=String(p.title||p.name||"").trim();if(!title)return false;
      const petName=String(p.petName||p.pet||"").trim();
      const pet=petName?(state.pets||[]).find(x=>String(x.name||"").trim().toLowerCase()===petName.toLowerCase()):null;
      let x=state.petCareRoutines.find(x=>String(x.title||"").trim().toLowerCase()===title.toLowerCase()&&String(x.petId||"")===String(pet?.id||""));
      if(!x){x={id:uid()};state.petCareRoutines.push(x)}
      Object.assign(x,{
        petId:pet?.id||"",
        title,
        type:String(p.type||x.type||"Other"),
        everyDays:Math.max(0,Number(p.everyDays??x.everyDays??0)),
        nextDate:String(p.nextDate||x.nextDate||date||""),
        lastDone:String(p.lastDone||x.lastDone||""),
        notes:String(p.notes||x.notes||""),
        active:p.active!==false,
        cloudEntryId:row.id
      });
      return true;
    }
    case "pet_care":{
      if(!Array.isArray(state.petLogs))state.petLogs=[];
      const petName=String(p.petName||p.pet||"").trim(),type=String(p.type||p.careType||"Note").trim()||"Note";
      let pet=null;
      if(petName)pet=(state.pets||[]).find(x=>String(x.name||"").trim().toLowerCase()===petName.toLowerCase())||null;
      state.petLogs.push({...common,petId:pet?.id||"",type,time:String(p.time||""),value:String(p.value||p.amount||""),notes:String(p.notes||""),source:"chatgpt"});
      return true;
    }
    case "pet_record":{
      if(!Array.isArray(state.petRecords))state.petRecords=[];
      const petName=String(p.petName||p.pet||"").trim();if(!petName)return false;
      const pet=(state.pets||[]).find(x=>String(x.name||"").trim().toLowerCase()===petName.toLowerCase());if(!pet)return false;
      state.petRecords.push({...common,petId:pet.id,type:String(p.type||"Vet visit"),nextDate:String(p.nextDate||""),provider:String(p.provider||""),cost:Number(p.cost||0),notes:String(p.notes||""),source:"chatgpt"});
      return true;
    }
    case "plant_routine":{
      if(!Array.isArray(state.plantCareRoutines))state.plantCareRoutines=[];
      const title=String(p.title||p.name||"").trim();if(!title)return false;
      const plantName=String(p.plantName||p.plant||"").trim();
      const plant=plantName?(state.plants||[]).find(x=>String(x.name||"").trim().toLowerCase()===plantName.toLowerCase()):null;
      let x=state.plantCareRoutines.find(x=>String(x.title||"").trim().toLowerCase()===title.toLowerCase()&&String(x.plantId||"")===String(plant?.id||""));
      if(!x){x={id:uid()};state.plantCareRoutines.push(x)}
      Object.assign(x,{
        plantId:plant?.id||"",
        title,
        type:String(p.type||x.type||"Other"),
        everyDays:Math.max(0,Number(p.everyDays??x.everyDays??0)),
        nextDate:String(p.nextDate||x.nextDate||date||""),
        lastDone:String(p.lastDone||x.lastDone||""),
        notes:String(p.notes||x.notes||""),
        active:p.active!==false,
        cloudEntryId:row.id
      });
      return true;
    }
    case "plant_care":{
      if(!Array.isArray(state.plants))state.plants=[];
      if(!Array.isArray(state.plantLogs))state.plantLogs=[];
      const plantName=String(p.plantName||p.plant||"").trim();if(!plantName)return false;
      let plant=state.plants.find(x=>String(x.name||"").trim().toLowerCase()===plantName.toLowerCase());
      if(!plant){
        plant={id:uid(),name:plantName,type:String(p.plantType||"Plant"),status:"Active",location:String(p.location||""),light:"",waterEveryDays:0,plantedDate:"",source:"ChatGPT",notes:""};
        state.plants.push(plant);
      }
      state.plantLogs.push({...common,plantId:plant.id,type:String(p.type||p.careType||"Checked"),value:String(p.value||p.amount||""),notes:String(p.notes||""),source:"chatgpt"});
      return true;
    }
    case "garden_task":{
      if(!Array.isArray(state.gardenTasks))state.gardenTasks=[];
      const title=String(p.title||"").trim();if(!title)return false;
      state.gardenTasks.push({...common,title,due:String(p.due||date||""),area:String(p.area||""),notes:String(p.notes||""),done:!!p.done,source:"chatgpt"});
      return true;
    }
    case "garden_journal":{
      if(!Array.isArray(state.gardenJournal))state.gardenJournal=[];
      const title=String(p.title||"").trim(),note=String(p.note||p.notes||"").trim();if(!title&&!note)return false;
      state.gardenJournal.push({...common,title,note,updatedAt:String(row.created_at||new Date().toISOString()),source:"chatgpt"});
      return true;
    }
    case "garden_seed":{
      if(!Array.isArray(state.gardenSeeds))state.gardenSeeds=[];
      const name=String(p.name||p.plant||"").trim();if(!name)return false;
      const variety=String(p.variety||"").trim();
      let x=state.gardenSeeds.find(x=>String(x.name||"").trim().toLowerCase()===name.toLowerCase()&&String(x.variety||"").trim().toLowerCase()===variety.toLowerCase());
      if(!x){x={id:uid(),cloudEntryId:row.id};state.gardenSeeds.push(x)}
      Object.assign(x,{name,variety,kind:String(p.kind||x.kind||"Seed packet"),status:String(p.status||x.status||"Have"),year:String(p.year||x.year||""),quantity:String(p.quantity||x.quantity||""),startIndoors:String(p.startIndoors||x.startIndoors||""),directSow:String(p.directSow||x.directSow||""),startIndoorsDate:String(p.startIndoorsDate||x.startIndoorsDate||""),directSowDate:String(p.directSowDate||x.directSowDate||""),transplantDate:String(p.transplantDate||x.transplantDate||""),notes:String(p.notes||x.notes||""),cloudEntryId:row.id});
      return true;
    }
    case "shopping":{
      const item=String(p.item||"").trim();if(!item)return false;
      state.shopping.push({id:common.id,cloudEntryId:row.id,item,qty:String(p.qty||""),store:String(p.store||""),status:String(p.status||"needed"),source:String(p.source||"manual")});return true;
    }
    case "home_care":{
      const task=String(p.task||"").trim();if(!task)return false;
      const status=String(p.status||"done"),notes=String(p.notes||"");
      state.homeLogs.push({...common,area:String(p.area||"Home"),task,status,notes});
      if(status==="done"&&/litter/i.test(task)){
        if(!Array.isArray(state.petLogs))state.petLogs=[];
        state.petLogs.push({...common,petId:"",type:"Litter",time:String(p.time||""),value:"",notes:notes||"Logged from home care",source:"chatgpt"});
      }
      return true;
    }
    case "task":{
      const title=String(p.title||"").trim();if(!title)return false;
      state.tasks.push({...common,title,category:String(p.category||"life"),child:String(p.child||""),notes:String(p.notes||""),done:!!p.done,order:Number(p.order||100)});return true;
    }
    case "meal":{
      const dish=String(p.dish||"").trim();if(!dish)return false;
      const type=String(p.type||"dinner"),mealDate=String(p.date||date);
      let x=state.meals.find(x=>x.date===mealDate&&x.type===type);
      if(!x){x={id:uid(),date:mealDate,type,cloudEntryId:row.id};state.meals.push(x)}
      Object.assign(x,{dish,method:String(p.method||x.method||""),assigned:String(p.assigned||x.assigned||""),status:String(p.status||x.status||"planned"),notes:String(p.notes||x.notes||""),serveTime:String(p.serveTime||x.serveTime||""),startBy:String(p.startBy||x.startBy||""),ingredients:String(p.ingredients||x.ingredients||""),prepSteps:String(p.prepSteps||x.prepSteps||""),tomorrowPrep:String(p.tomorrowPrep||x.tomorrowPrep||""),recipeState:String(p.recipeState||"ready"),recipeUpdatedAt:String(row.created_at||new Date().toISOString()),cloudEntryId:row.id});
      if(Array.isArray(p.shopping)){
        const key=`${mealDate}|${type}`;
        state.shopping=(state.shopping||[]).filter(item=>!(item.source==="recipe"&&item.mealKey===key));
        for(const raw of p.shopping){
          const item=typeof raw==="string"?raw:String(raw?.item||"").trim();
          if(!item)continue;
          state.shopping.push({id:uid(),item,qty:typeof raw==="string"?"":String(raw?.qty||""),store:typeof raw==="string"?"":String(raw?.store||""),status:"needed",source:"recipe",mealKey:key,mealDate,dish,mealDish:dish,cloudEntryId:row.id});
        }
      }
      return true;
    }
    case "mail_digest":{
      if(!Array.isArray(state.deliveries))state.deliveries=[];
      if(state.deliveries.some(x=>x.cloudEntryId===row.id))return true;
      state.deliveries.push({id:uid(),cloudEntryId:row.id,kind:"mail-digest",date:String(p.date||date),mailpieceCount:Number(p.mailpieceCount||0),packageCount:Number(p.packageCount||0),carrier:"USPS",status:"digest",notes:String(p.notes||"")});
      return true;
    }
    case "delivery_update":{
      if(!Array.isArray(state.deliveries))state.deliveries=[];
      let x=state.deliveries.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||""));
      if(!x){x={id:uid(),kind:"package",cloudEntryId:row.id,externalId:String(row.external_id||"")};state.deliveries.push(x)}
      Object.assign(x,{carrier:String(p.carrier||x.carrier||""),sender:String(p.sender||x.sender||""),status:String(p.status||x.status||"expected"),expectedDate:String(p.expectedDate||p.date||x.expectedDate||date),notes:String(p.notes||x.notes||"")});
      return true;
    }
    case "relationship_checkin":{
      if(!Array.isArray(state.relationshipCheckins))state.relationshipCheckins=[];
      if(state.relationshipCheckins.some(x=>x.cloudEntryId===row.id))return true;
      state.relationshipCheckins.push({id:uid(),cloudEntryId:row.id,personName:String(p.personName||p.person||""),date:String(p.date||date),summary:String(p.summary||""),wentWell:String(p.wentWell||""),needsAttention:String(p.needsAttention||""),agreements:String(p.agreements||""),nextStep:String(p.nextStep||""),updatedAt:String(row.created_at||new Date().toISOString())});
      return true;
    }
    case "workout":{
      if(!Array.isArray(state.workouts))state.workouts=[];
      if(state.workouts.some(x=>x.cloudEntryId===row.id))return true;
      state.workouts.push({id:uid(),cloudEntryId:row.id,date:String(p.date||date),activity:String(p.activity||"Workout"),minutes:Number(p.minutes||0),notes:String(p.notes||"")});
      return true;
    }
    case "grocery_order":{
      if(!Array.isArray(state.orders))state.orders=[];
      let x=state.orders.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||""));
      if(!x){x={id:uid(),cloudEntryId:row.id,externalId:String(row.external_id||"")};state.orders.push(x)}
      Object.assign(x,{store:String(p.store||x.store||""),orderDate:String(p.orderDate||p.date||date),status:String(p.status||x.status||"ordered"),deliveryTime:String(p.deliveryTime||x.deliveryTime||""),total:Number(p.total||x.total||0),items:Array.isArray(p.items)?p.items:(x.items||[]),perishablesAway:Boolean(p.perishablesAway??x.perishablesAway),refundStatus:String(p.refundStatus||x.refundStatus||""),rating:String(p.rating||x.rating||""),notes:String(p.notes||x.notes||"")});
      return true;
    }
    case "meal_suggestion":{
      const dish=String(p.dish||"").trim(),mealDate=String(p.date||date),type=String(p.type||"dinner");
      if(!dish)return false;if(!Array.isArray(state.mealSuggestions))state.mealSuggestions=[];
      if(state.mealSuggestions.some(x=>x.cloudEntryId===row.id))return true;
      state.mealSuggestions.push({
        id:uid(),cloudEntryId:row.id,date:mealDate,type,dish,method:String(p.method||""),assigned:String(p.assigned||""),
        serveTime:String(p.serveTime||""),startBy:String(p.startBy||""),status:"proposed",recipeState:"ready",
        ingredients:String(p.ingredients||""),prepSteps:String(p.prepSteps||""),tomorrowPrep:String(p.tomorrowPrep||""),notes:String(p.notes||""),
        shopping:Array.isArray(p.shopping)?p.shopping:[],usesOnHand:Array.isArray(p.usesOnHand)?p.usesOnHand:[],reason:String(p.reason||""),
        createdAt:String(row.created_at||new Date().toISOString())
      });
      return true;
    }
    case "pantry_inventory":{
      const items=Array.isArray(p.items)?p.items:[];if(!state.pantry||typeof state.pantry!=="object")state.pantry={items:[],updatedAt:"",scanId:""};
      const merged=new Map(),base=String(p.mode||"merge")==="replace"?[]:(state.pantry.items||[]);
      for(const raw of [...base,...items]){
        const name=typeof raw==="string"?raw:String(raw?.name||raw?.item||"").trim();if(!name)continue;
        const key=name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
        if(!merged.has(key))merged.set(key,typeof raw==="string"?{name}:raw);
        else if(typeof raw==="object")merged.set(key,{...merged.get(key),...raw,name});
      }
      state.pantry={items:[...merged.values()],updatedAt:String(row.created_at||new Date().toISOString()),scanId:String(p.scanId||""),mode:String(p.mode||"merge")};
      if(Array.isArray(state.pantryScans)){
        const scan=state.pantryScans.find(x=>x.id===String(p.scanId||""));
        if(scan){scan.status="ready";scan.completedAt=state.pantry.updatedAt}
      }
      return true;
    }
    case "meal_feedback":{
      const dish=String(p.dish||"").trim(),score=Number(p.score||0);if(!dish||!Number.isFinite(score))return false;
      if(!Array.isArray(state.mealFeedback))state.mealFeedback=[];
      if(state.mealFeedback.some(x=>x.cloudEntryId===row.id))return true;
      state.mealFeedback.push({id:uid(),cloudEntryId:row.id,dish,score,label:String(p.label||""),date:String(p.date||date),createdAt:String(row.created_at||new Date().toISOString()),source:"chatgpt"});
      return true;
    }
    case "event":
    case "school_event":{
      const title=String(p.title||"").trim(),eventDate=String(p.date||date);
      if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))return false;
      if(!Array.isArray(state.events))state.events=[];
      let x=state.events.find(e=>e.cloudEntryId===row.id)||state.events.find(e=>e.date===eventDate&&String(e.title||"").trim().toLowerCase()===title.toLowerCase()&&String(e.startTime||"")===String(p.startTime||""));
      if(!x){x={id:uid(),cloudEntryId:row.id};state.events.push(x)}
      Object.assign(x,{date:eventDate,title,child:String(p.child||x.child||""),type:String(p.type||x.type||(row.category==="school_event"?"school":"other")),startTime:String(p.startTime||x.startTime||""),endTime:String(p.endTime||x.endTime||""),location:String(p.location||x.location||""),status:String(p.status||x.status||"confirmed"),source:String(p.source||x.source||"ChatGPT"),notes:String(p.notes||x.notes||""),sourceRef:String(p.sourceRef||x.sourceRef||row.external_id||""),cloudEntryId:row.id});
      return true;
    }
    case "paycheck":{
      const payDate=String(p.payDate||date),netPay=Number(p.netPay||0);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(payDate)||!Number.isFinite(netPay)||netPay<=0)return false;
      if(!Array.isArray(state.paychecks))state.paychecks=[];
      const fingerprint=String(p.fingerprint||[p.periodStart||"",p.periodEnd||"",payDate,netPay.toFixed(2)].join("|"));
      if(state.paychecks.some(x=>x.fingerprint===fingerprint))return true;
      state.paychecks.push({id:uid(),cloudEntryId:row.id,source:String(p.source||"ChatGPT"),periodStart:String(p.periodStart||""),periodEnd:String(p.periodEnd||""),payDate,regularHours:Number(p.regularHours||0),overtimeHours:Number(p.overtimeHours||0),regularRate:Number(p.regularRate||0),overtimeRate:Number(p.overtimeRate||0),totalHours:Number(p.totalHours||0),grossPay:Number(p.grossPay||0),taxes:Number(p.taxes||0),deductions:Number(p.deductions||0),reimbursements:Number(p.reimbursements||0),netPay,directDeposits:Array.isArray(p.directDeposits)?p.directDeposits.map(Number).filter(Number.isFinite):[],vacationHours:Number(p.vacationHours||0),pstHours:Number(p.pstHours||0),optionWeekHours:Number(p.optionWeekHours||0),fingerprint});
      return true;
    }
    case "expected_income":{
      if(!Array.isArray(state.expectedIncome))state.expectedIncome=[];
      const name=String(p.name||"Expected income").trim(),amount=Number(p.amount||0),incomeDate=String(p.date||date),frequency=String(p.frequency||"One-time");
      if(!name||!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(incomeDate))return false;
      let x=state.expectedIncome.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||""));
      if(!x){x={id:uid(),cloudEntryId:row.id,externalId:String(row.external_id||"")};state.expectedIncome.push(x)}
      let accountKey=String(p.accountKey||x.accountKey||"");
      if(p.accountCloudId!==undefined){
        const matches=(state.accounts||[]).filter(a=>a.cloudAccountId===String(p.accountCloudId||""));
        if(matches.length===1)accountKey=matches[0].key;
      }
      Object.assign(x,{name,amount:Math.round(amount*100)/100,date:incomeDate,frequency,accountKey,accountCloudId:String(p.accountCloudId||x.accountCloudId||""),transferable:p.transferable!==false,enabled:p.enabled!==false,confidence:String(p.confidence||"confirmed"),notes:String(p.notes||"")});
      return true;
    }
    case "employment_profile":{
      if(!Array.isArray(state.employmentProfiles))state.employmentProfiles=[];
      const employer=String(p.employer||"").trim();if(!employer)return false;
      let x=state.employmentProfiles.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||"")||String(x.employer||"").toLowerCase()===employer.toLowerCase());
      if(!x){x={id:uid(),cloudEntryId:row.id,externalId:String(row.external_id||"")};state.employmentProfiles.push(x)}
      Object.assign(x,{employer,role:String(p.role||x.role||""),jobCode:String(p.jobCode||x.jobCode||""),location:String(p.location||x.location||""),union:String(p.union||x.union||""),unionLocal:String(p.unionLocal||x.unionLocal||""),contract:String(p.contract||x.contract||""),supplement:String(p.supplement||x.supplement||""),scheduledStartDate:String(p.scheduledStartDate||x.scheduledStartDate||""),seniorityDate:String(p.seniorityDate||x.seniorityDate||""),currentRate:Number(p.currentRate||x.currentRate||0),progression:Array.isArray(p.progression)?p.progression:(x.progression||[]),ssd:p.ssd&&typeof p.ssd==="object"?{...(x.ssd||{}),...p.ssd}:(x.ssd||{}),notes:String(p.notes||x.notes||""),updatedAt:String(row.created_at||new Date().toISOString())});
      return true;
    }
    case "income_seasonality":{
      if(!Array.isArray(state.incomeSeasonality))state.incomeSeasonality=[];
      const employer=String(p.employer||"").trim();if(!employer)return false;
      let x=state.incomeSeasonality.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||"")||String(x.employer||"").toLowerCase()===employer.toLowerCase());
      if(!x){x={id:uid(),cloudEntryId:row.id,externalId:String(row.external_id||"")};state.incomeSeasonality.push(x)}
      Object.assign(x,{employer,metric:String(p.metric||x.metric||"net_bank_deposits"),years:p.years&&typeof p.years==="object"?p.years:(x.years||{}),recentWeeklyAverageNet:Number(p.recentWeeklyAverageNet||x.recentWeeklyAverageNet||0),nextOfficialPayDate:String(p.nextOfficialPayDate||x.nextOfficialPayDate||""),methodology:String(p.methodology||x.methodology||""),notes:String(p.notes||x.notes||""),updatedAt:String(row.created_at||new Date().toISOString())});
      return true;
    }
    case "birthday_plan_suggestion":{
      const personName=String(p.personName||p.name||"").trim();if(!personName)return false;
      if(!Array.isArray(state.birthdaySuggestions))state.birthdaySuggestions=[];
      const person=(state.peopleProfiles||[]).find(x=>String(x.name||"").toLowerCase()===personName.toLowerCase());if(!person)return false;
      if(state.birthdaySuggestions.some(x=>x.cloudEntryId===row.id))return true;
      state.birthdaySuggestions.push({id:uid(),cloudEntryId:row.id,personId:person.id,personName,status:"proposed",theme:String(p.theme||""),cake:String(p.cake||""),activity:String(p.activity||""),location:String(p.location||""),food:String(p.food||""),decorations:String(p.decorations||""),notes:String(p.notes||""),reason:String(p.reason||""),budget:Number(p.budget||0),tasks:Array.isArray(p.tasks)?p.tasks:[],createdAt:String(row.created_at||new Date().toISOString())});
      if(person.birthdayPlan&&typeof person.birthdayPlan==="object")person.birthdayPlan.suggestionState="ready";
      return true;
    }
    case "project":{
      if(!Array.isArray(state.projects))state.projects=[];
      const title=String(p.title||"").trim();if(!title)return false;
      let x=state.projects.find(x=>x.cloudEntryId===row.id||String(x.externalId||"")===String(row.external_id||""));
      if(!x){x={id:uid(),cloudEntryId:row.id,externalId:String(row.external_id||"")};state.projects.push(x)}
      Object.assign(x,{title,status:String(p.status||x.status||"open"),due:String(p.due||x.due||date||""),nextAction:String(p.nextAction||x.nextAction||""),notes:String(p.notes||x.notes||""),source:String(p.source||x.source||row.source||""),tasks:Array.isArray(p.tasks)?p.tasks:(x.tasks||[])});
      return true;
    }
    case "vehicle_profile":{
      if(!Array.isArray(state.vehicles))state.vehicles=[];
      let x=state.vehicles.find(x=>x.cloudEntryId===row.id)||state.vehicles.find(x=>x.primary);
      if(!x){x={id:uid(),primary:true};state.vehicles.push(x)}
      Object.assign(x,{cloudEntryId:row.id,year:Number(p.year||x.year||0)||null,make:String(p.make||x.make||""),model:String(p.model||x.model||""),mileage:Number(p.mileage||x.mileage||0)||null,registrationDue:String(p.registrationDue||x.registrationDue||""),openRecalls:Number.isFinite(Number(p.openRecalls))?Number(p.openRecalls):x.openRecalls,estimatedValue:Number(p.estimatedValue||x.estimatedValue||0)||null,oilDueMiles:Number(p.oilDueMiles||x.oilDueMiles||0)||null,oilDueDate:String(p.oilDueDate||x.oilDueDate||""),rotationDueMiles:Number(p.rotationDueMiles||x.rotationDueMiles||0)||null,rotationDueDate:String(p.rotationDueDate||x.rotationDueDate||""),tireTread:String(p.tireTread||x.tireTread||""),appointmentDate:String(p.appointmentDate||x.appointmentDate||""),appointmentTime:String(p.appointmentTime||x.appointmentTime||""),appointmentPlace:String(p.appointmentPlace||x.appointmentPlace||""),notes:String(p.notes||x.notes||"")});
      return true;
    }
    case "vehicle_service":{
      if(!Array.isArray(state.vehicleServices))state.vehicleServices=[];
      if(state.vehicleServices.some(x=>x.cloudEntryId===row.id))return true;
      state.vehicleServices.push({id:uid(),cloudEntryId:row.id,vehicleId:String(p.vehicleId||""),type:String(p.type||"Service"),date:String(p.date||date),mileage:Number(p.mileage||0)||null,cost:Number(p.cost||0),notes:String(p.notes||"")});
      return true;
    }
    case "person_rename":{
      const oldName=String(p.oldName||"").trim(),newName=String(p.newName||"").trim();
      if(!oldName||!newName||oldName===newName)return false;
      const eq=v=>String(v||"").trim().toLowerCase()===oldName.toLowerCase();
      const replaceName=v=>eq(v)?newName:v;
      if(Array.isArray(state.peopleProfiles))for(const x of state.peopleProfiles)if(eq(x.name))x.name=newName;
      if(Array.isArray(state.settings?.familyMembers))for(const x of state.settings.familyMembers){if(typeof x==="string"){const i=state.settings.familyMembers.indexOf(x);if(eq(x))state.settings.familyMembers[i]=newName}else if(eq(x?.name))x.name=newName}
      if(Array.isArray(state.settings?.readers))state.settings.readers=state.settings.readers.map(replaceName);
      if(Array.isArray(state.settings?.choreRotations))for(const r of state.settings.choreRotations)if(Array.isArray(r.members))r.members=r.members.map(replaceName);
      if(Array.isArray(state.settings?.recurringFamilyEvents))for(const r of state.settings.recurringFamilyEvents)if(eq(r.child))r.child=newName;
      for(const key of ["chores","tasks","events"]){if(Array.isArray(state[key]))for(const x of state[key])if(eq(x.child))x.child=newName}
      if(Array.isArray(state.readingLogs))for(const x of state.readingLogs)if(eq(x.reader))x.reader=newName;
      if(Array.isArray(state.relationshipCheckins))for(const x of state.relationshipCheckins)if(eq(x.personName))x.personName=newName;
      return true;
    }
    case "chore_rotation_update":{
      const members=Array.isArray(p.members)?p.members.map(String).filter(Boolean):[],
            chores=Array.isArray(p.chores)?p.chores.map(String).filter(Boolean):[],
            anchorDate=String(p.anchorDate||date||"");
      if(members.length<2||chores.length<2||!anchorDate)return false;
      if(!Array.isArray(state.settings.choreRotations))state.settings.choreRotations=[];
      let r=state.settings.choreRotations.find(x=>{
        const a=(x.members||[]).map(v=>String(v).toLowerCase()).sort().join("|"),
              b=members.map(v=>String(v).toLowerCase()).sort().join("|");
        return a===b;
      });
      if(!r){r={members:[...members],chores:[...chores],anchorDate};state.settings.choreRotations.push(r)}
      else Object.assign(r,{members:[...members],chores:[...chores],anchorDate});
      const today=typeof ymd==="function"?ymd():String(date||"");
      state.chores=(state.chores||[]).filter(x=>!(x.generated==="rotation"&&x.date>=today&&members.some(m=>String(m).toLowerCase()===String(x.child||"").toLowerCase())));
      if(typeof ensureFamilyDay==="function")ensureFamilyDay(today);
      return true;
    }
    case "family_routine_upsert":{
      const r=p.routine&&typeof p.routine==="object"?p.routine:p;
      const weekday=Number(r.weekday),title=String(r.title||"").trim(),child=String(r.child||"").trim(),startTime=String(r.startTime||"");
      if(!Number.isInteger(weekday)||weekday<0||weekday>6||!title)return false;
      if(!Array.isArray(state.settings.recurringFamilyEvents))state.settings.recurringFamilyEvents=[];
      const match=state.settings.recurringFamilyEvents.find(x=>Number(x.weekday)===weekday&&String(x.title||"").trim().toLowerCase()===title.toLowerCase()&&String(x.child||"").trim().toLowerCase()===child.toLowerCase());
      const value={weekday,title,child,type:String(r.type||"activity"),startTime,endTime:String(r.endTime||""),location:String(r.location||""),notes:String(r.notes||"")};
      if(match)Object.assign(match,value);else state.settings.recurringFamilyEvents.push(value);
      if(typeof ensureRecurringFamilyEvents==="function")ensureRecurringFamilyEvents();
      return true;
    }
    case "people_setup":{
      if(!Array.isArray(state.peopleProfiles))state.peopleProfiles=[];
      for(const raw of Array.isArray(p.people)?p.people:[]){
        const name=String(raw?.name||"").trim();if(!name)continue;
        let x=state.peopleProfiles.find(x=>String(x.name||"").toLowerCase()===name.toLowerCase());
        if(!x){x={id:uid(),name,wishlist:[],birthdayPlan:{tasks:[]}};state.peopleProfiles.push(x)}
        Object.assign(x,{
          name,relationship:String(raw.relationship||x.relationship||""),birthday:String(raw.birthday||x.birthday||""),
          favoriteColors:Array.isArray(raw.favoriteColors)?raw.favoriteColors.map(String):x.favoriteColors||[],
          favoriteCharacters:Array.isArray(raw.favoriteCharacters)?raw.favoriteCharacters.map(String):x.favoriteCharacters||[],
          favoriteFoods:Array.isArray(raw.favoriteFoods)?raw.favoriteFoods.map(String):x.favoriteFoods||[],
          interests:Array.isArray(raw.interests)?raw.interests.map(String):x.interests||[],
          sizes:raw.sizes&&typeof raw.sizes==="object"?{...(x.sizes||{}),...raw.sizes}:x.sizes||{},
          importantDates:Array.isArray(raw.importantDates)?raw.importantDates:x.importantDates||[],
          sharedPlans:Array.isArray(raw.sharedPlans)?raw.sharedPlans:x.sharedPlans||[],
          recurringCheckin:raw.recurringCheckin&&typeof raw.recurringCheckin==="object"?{...(x.recurringCheckin||{}),...raw.recurringCheckin}:x.recurringCheckin||{},
          routineNotes:String(raw.routineNotes||x.routineNotes||""),
          giftNotes:String(raw.giftNotes||x.giftNotes||"")
        });
        if(Array.isArray(raw.wishlist)){
          if(!Array.isArray(x.wishlist))x.wishlist=[];
          for(const wish of raw.wishlist){
            const item=typeof wish==="string"?wish:String(wish?.item||"").trim();if(!item)continue;
            let existing=x.wishlist.find(w=>String(w.item||"").trim().toLowerCase()===item.toLowerCase());
            if(!existing){existing={id:uid(),item};x.wishlist.push(existing)}
            existing.status=typeof wish==="string"?(existing.status||"want"):String(wish.status||existing.status||"want");
            existing.notes=typeof wish==="string"?(existing.notes||""):String(wish.notes||existing.notes||"");
          }
        }
        if(raw.birthdayPlan&&typeof raw.birthdayPlan==="object")x.birthdayPlan={...(x.birthdayPlan||{}),...raw.birthdayPlan,tasks:Array.isArray(raw.birthdayPlan.tasks)?raw.birthdayPlan.tasks:(x.birthdayPlan?.tasks||[])};
      }
      return true;
    }
    case "person_update":{
      const name=String(p.name||"").trim();if(!name)return false;if(!Array.isArray(state.peopleProfiles))state.peopleProfiles=[];
      let x=state.peopleProfiles.find(x=>String(x.name||"").toLowerCase()===name.toLowerCase());
      if(!x){x={id:uid(),name,wishlist:[],birthdayPlan:{tasks:[]}};state.peopleProfiles.push(x)}
      for(const key of ["relationship","birthday","giftNotes","routineNotes"])if(p[key]!==undefined)x[key]=String(p[key]||"");
      for(const key of ["favoriteColors","favoriteCharacters","favoriteFoods","interests"])if(Array.isArray(p[key]))x[key]=p[key].map(String);
      if(p.sizes&&typeof p.sizes==="object")x.sizes={...(x.sizes||{}),...p.sizes};
      if(Array.isArray(p.importantDates))x.importantDates=p.importantDates;
      if(Array.isArray(p.sharedPlans))x.sharedPlans=p.sharedPlans;
      if(p.recurringCheckin&&typeof p.recurringCheckin==="object")x.recurringCheckin={...(x.recurringCheckin||{}),...p.recurringCheckin};
      if(p.birthdayPlan&&typeof p.birthdayPlan==="object")x.birthdayPlan={...(x.birthdayPlan||{}),...p.birthdayPlan,tasks:Array.isArray(p.birthdayPlan.tasks)?p.birthdayPlan.tasks:(x.birthdayPlan?.tasks||[])};
      return true;
    }
    case "birthday_wish":{
      const name=String(p.name||"").trim(),item=String(p.item||"").trim();if(!name||!item)return false;if(!Array.isArray(state.peopleProfiles))state.peopleProfiles=[];
      let x=state.peopleProfiles.find(x=>String(x.name||"").toLowerCase()===name.toLowerCase());
      if(!x){x={id:uid(),name,wishlist:[],birthdayPlan:{tasks:[]}};state.peopleProfiles.push(x)}
      if(!Array.isArray(x.wishlist))x.wishlist=[];
      let w=x.wishlist.find(w=>String(w.item||"").trim().toLowerCase()===item.toLowerCase());
      if(!w){w={id:uid(),item};x.wishlist.push(w)}
      w.status=String(p.status||w.status||"want");w.notes=String(p.notes||w.notes||"");w.store=String(p.store||w.store||"");if(p.estimatedCost!==undefined)w.estimatedCost=Number(p.estimatedCost||0);if(p.actualCost!==undefined)w.actualCost=Number(p.actualCost||0);w.updatedAt=String(row.created_at||new Date().toISOString());
      return true;
    }
    case "family_setup":{
      const members=Array.isArray(p.familyMembers)?p.familyMembers.map(x=>({name:String(x?.name||x||"").trim()})).filter(x=>x.name):[];
      if(members.length)state.settings.familyMembers=members;
      if(Array.isArray(p.dailyKidBasics))state.settings.dailyKidBasics=p.dailyKidBasics.map(String).filter(Boolean);
      if(Array.isArray(p.choreRotations))state.settings.choreRotations=p.choreRotations.map(r=>({members:(r.members||[]).map(String),chores:(r.chores||[]).map(String),anchorDate:String(r.anchorDate||"")}));
      if(Array.isArray(p.recurringFamilyEvents))state.settings.recurringFamilyEvents=p.recurringFamilyEvents.map(r=>({
        weekday:Number(r.weekday),title:String(r.title||""),child:String(r.child||""),type:String(r.type||"family"),
        startTime:String(r.startTime||""),endTime:String(r.endTime||""),location:String(r.location||""),notes:String(r.notes||"")
      }));
      if(typeof ensureRecurringFamilyEvents==="function")ensureRecurringFamilyEvents();
      if(typeof ensureFamilyDay==="function")ensureFamilyDay();
      return true;
    }
    case "profile_update":{
      const sign=String(p.sunSign||"").trim();
      const signs=new Set(["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]);
      let changed=false;
      if(p.sunSign!==undefined&&(!sign||signs.has(sign))){
        state.profile=state.profile||{};
        if(String(state.profile.sunSign||"")!==sign){state.profile.sunSign=sign;changed=true}
      }
      return changed;
    }
    case "budget_spending":{
      const valid=new Set(["transport","dining","household","personal","grocery","fun","cushion","ebt"]);
      const category=String(p.category||"").trim(),amount=Number(p.amount||0);
      if(!valid.has(category)||!Number.isFinite(amount)||amount<=0)return false;
      state.budget.spending.push({id:uid(),cloudEntryId:row.id,date:String(p.date||date),amount:Math.round(amount*100)/100,category,note:String(p.note||"ChatGPT entry"),source:"chatgpt"});
      return true;
    }
    case "bill_add":{
      const name=String(p.name||"").trim(),due=String(p.due||"").trim(),amount=Number(p.amount);
      if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(amount)||amount<0)return false;
      if(state.bills.some(b=>String(b.name||"").trim().toLowerCase()===name.toLowerCase()&&b.due===due))return true;
      let paymentAccountKey=String(p.paymentAccountKey||"");
      if(p.paymentAccountCloudId!==undefined){
        const matches=(state.accounts||[]).filter(a=>a.cloudAccountId===String(p.paymentAccountCloudId||""));
        if(matches.length===1)paymentAccountKey=matches[0].key;
      }
      let desiredAccountKey=String(p.desiredAccountKey||"");
      if(p.desiredPaymentAccountCloudId!==undefined){
        const matches=(state.accounts||[]).filter(a=>a.cloudAccountId===String(p.desiredPaymentAccountCloudId||""));
        if(matches.length===1)desiredAccountKey=matches[0].key;
      }
      const paymentSetup=typeof BILL_SETUPS!=="undefined"&&BILL_SETUPS.includes(String(p.paymentSetup))?String(p.paymentSetup):"Unknown";
      const amountType=typeof BILL_AMOUNT_TYPES!=="undefined"&&BILL_AMOUNT_TYPES.includes(String(p.amountType))?String(p.amountType):"Fixed amount";
      const frequency=typeof BILL_FREQUENCIES!=="undefined"&&BILL_FREQUENCIES.includes(String(p.frequency))?String(p.frequency):"One-time";
      const repeatMonths=typeof BILL_REPEATS!=="undefined"&&BILL_REPEATS.some(([n])=>n===Number(p.repeatMonths))?Number(p.repeatMonths):0;
      state.bills.push({
        id:uid(),name,amount:Math.round(amount*100)/100,due,status:"upcoming",
        paymentAccountKey,desiredAccountKey,paymentSetup,amountType,frequency,repeatMonths,
        repeatDay:Number(due.slice(8,10)),cloudEntryId:row.id
      });
      return true;
    }
    case "bill_update":{
      const billId=String(p.bill_id||"").trim(),name=String(p.name||"").trim().toLowerCase(),due=String(p.due||"").trim();
      let matches=billId?state.bills.filter(b=>b.id===billId):state.bills.filter(b=>(!name||String(b.name||"").trim().toLowerCase()===name)&&(!due||b.due===due));
      if(matches.length!==1)return false;
      const b=matches[0];
      if(p.amount!==undefined&&Number.isFinite(Number(p.amount))&&Number(p.amount)>=0)b.amount=Math.round(Number(p.amount)*100)/100;
      if(p.due&&/^\d{4}-\d{2}-\d{2}$/.test(String(p.due)))b.due=String(p.due);
      if(p.name)b.name=String(p.name).trim()||b.name;
      if(["paid","upcoming"].includes(String(p.status))){
        b.status=String(p.status);
        if(b.status==="paid"&&typeof billRepeat==="function"&&billRepeat(b)&&typeof appendNextBill==="function")appendNextBill(b);
      }
      if(p.paymentSetup&&typeof BILL_SETUPS!=="undefined"&&BILL_SETUPS.includes(String(p.paymentSetup)))b.paymentSetup=String(p.paymentSetup);
      if(p.amountType&&typeof BILL_AMOUNT_TYPES!=="undefined"&&BILL_AMOUNT_TYPES.includes(String(p.amountType)))b.amountType=String(p.amountType);
      if(p.frequency&&typeof BILL_FREQUENCIES!=="undefined"&&BILL_FREQUENCIES.includes(String(p.frequency)))b.frequency=String(p.frequency);
      if(p.repeatMonths!==undefined&&typeof BILL_REPEATS!=="undefined"&&BILL_REPEATS.some(([n])=>n===Number(p.repeatMonths)))b.repeatMonths=Number(p.repeatMonths);
      if(p.paymentAccountCloudId!==undefined){
        const matches=(state.accounts||[]).filter(a=>a.cloudAccountId===String(p.paymentAccountCloudId||""));
        if(matches.length===1)b.paymentAccountKey=matches[0].key;
      }else if(p.paymentAccountKey!==undefined)b.paymentAccountKey=String(p.paymentAccountKey||"");
      if(p.desiredPaymentAccountCloudId!==undefined){
        const matches=(state.accounts||[]).filter(a=>a.cloudAccountId===String(p.desiredPaymentAccountCloudId||""));
        if(matches.length===1)b.desiredAccountKey=matches[0].key;
      }else if(p.desiredAccountKey!==undefined)b.desiredAccountKey=String(p.desiredAccountKey||"");
      b.lastCloudEntryId=row.id;
      return true;
    }
    default:return false;
  }
}

async function cloudResizePantryPhoto(file){
  try{
    const bmp=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
    if(scale===1&&file.size<=3500000)return file;
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
    canvas.getContext("2d").drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close?.();
    return await new Promise(resolve=>canvas.toBlob(b=>resolve(b||file),"image/jpeg",0.82));
  }catch{return file}
}
async function cloudUploadPantryPhotos(files,scanId,mode="replace"){
  const user=cloudUser();if(!user||!cloudClient||!files?.length)return false;
  try{
    const signedUrls=[],paths=[];
    for(let i=0;i<files.length;i++){
      const blob=await cloudResizePantryPhoto(files[i]),path=`${user.id}/${scanId}/${String(i+1).padStart(2,"0")}.jpg`;
      const {error:upErr}=await cloudClient.storage.from("inventory-photos").upload(path,blob,{contentType:"image/jpeg",upsert:false});
      if(upErr)throw upErr;
      const {data:signed,error:signErr}=await cloudClient.storage.from("inventory-photos").createSignedUrl(path,86400);
      if(signErr)throw signErr;paths.push(path);signedUrls.push(signed.signedUrl);
    }
    const payload={status:"pending",scanId,mode,photoCount:files.length,paths,signedUrls,existingItems:mode==="merge"?(state.pantry?.items||[]).slice(0,200):[],requestedAt:new Date().toISOString()};
    const {error}=await cloudClient.from("life_entries").insert({owner_user_id:user.id,category:"pantry_scan_request",occurred_at:new Date().toISOString(),local_date:ymd(),payload,source:"app",external_id:`pantry-scan:${scanId}`});
    if(error)throw error;return true;
  }catch(error){cloudError=error?.message||"Could not upload pantry photos.";return false}
}
async function cloudRecordMealFeedback(entry){
  const user=cloudUser();if(!user||!cloudClient||!entry?.dish)return false;
  try{
    const payload={dish:String(entry.dish),score:Number(entry.score||0),label:String(entry.label||""),date:String(entry.date||ymd()),createdAt:String(entry.createdAt||new Date().toISOString())};
    const {error}=await cloudClient.from("life_entries").insert({owner_user_id:user.id,category:"meal_feedback",occurred_at:new Date().toISOString(),local_date:payload.date,payload,source:"app",external_id:`meal-feedback:${String(entry.id||Date.now())}`});
    if(error)throw error;return true;
  }catch(error){cloudError=error?.message||"Could not save meal feedback.";return false}
}

async function cloudQueueBirthdayPlan(person,exclude=[]){
  const user=cloudUser();if(!user||!cloudClient||!person?.name)return false;
  try{
    const cycle=(state.birthdaySuggestions||[]).filter(x=>x.personId===person.id).length+1;
    const payload={status:"pending",personName:String(person.name),relationship:String(person.relationship||""),birthday:String(person.birthday||""),favoriteColors:person.favoriteColors||[],favoriteCharacters:person.favoriteCharacters||[],favoriteFoods:person.favoriteFoods||[],interests:person.interests||[],wishlist:(person.wishlist||[]).map(w=>({item:w.item,status:w.status,notes:w.notes||"",estimatedCost:Number(w.estimatedCost||0)})),currentPlan:person.birthdayPlan||{},exclude:Array.isArray(exclude)?exclude:[],requestedAt:new Date().toISOString()};
    const externalId=`birthday-plan:${String(person.id||person.name).replace(/[^a-z0-9-]/gi,"-")}:${cycle}:${Date.now()}`;
    const {error}=await cloudClient.from("life_entries").insert({owner_user_id:user.id,category:"birthday_plan_request",occurred_at:new Date().toISOString(),local_date:ymd(),payload,source:"app",external_id:externalId});
    if(error)throw error;return true;
  }catch(error){cloudError=error?.message||"Could not request a birthday plan.";return false}
}

async function cloudQueueMealSuggestion(date,opts={}){
  const user=cloudUser();if(!user||!cloudClient||!date)return false;
  try{
    const prior=(state.mealSuggestions||[]).filter(x=>x.date===date).map(x=>x.dish).filter(Boolean);
    const extra=Array.isArray(opts.excludeMeals)?opts.excludeMeals:[];
    const excludeMeals=[...new Set([...prior,...extra])];
    const cycle=(state.mealSuggestions||[]).filter(x=>x.date===date).length+1;
    const externalId=`meal-suggestion:${date}:dinner:${cycle}:${Date.now()}`;
    const recent=(state.meals||[]).filter(m=>m?.dish&&m.date<date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(m=>m.dish);
    const pantry=(state.pantry?.items||[]).map(x=>typeof x==="string"?{name:x}:x).slice(0,150);
    const feedback=(state.mealFeedback||[]).map(x=>({dish:x.dish,score:Number(x.score||0),label:x.label||""})).slice(-100);
    const payload={status:"pending",date,type:"dinner",recentMeals:recent,excludeMeals,pantryItems:pantry,feedback,requestedAt:new Date().toISOString()};
    const {error}=await cloudClient.from("life_entries").insert({owner_user_id:user.id,category:"meal_suggestion_request",occurred_at:new Date().toISOString(),local_date:date,payload,source:"app",external_id:externalId});
    if(error)throw error;return true;
  }catch(error){cloudError=error?.message||"Could not request a meal suggestion.";return false}
}

async function cloudQueueRecipeRequest(meal){
  const user=cloudUser();
  if(!user||!cloudClient||!meal?.dish||!meal?.date)return false;
  try{
    const normalized=String(meal.dish).trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
    const externalId=`recipe:${meal.date}:${meal.type||"dinner"}:${normalized}`;
    const {data:existing,error:findError}=await cloudClient.from("life_entries")
      .select("id,payload").eq("owner_user_id",user.id).eq("category","recipe_request").eq("external_id",externalId)
      .order("created_at",{ascending:false}).limit(1);
    if(findError)throw findError;
    if((existing||[]).some(row=>String(row.payload?.status||"pending")==="pending"))return true;
    const payload={status:"pending",date:meal.date,type:meal.type||"dinner",dish:String(meal.dish||""),method:String(meal.method||""),serveTime:String(meal.serveTime||""),startBy:String(meal.startBy||""),assigned:String(meal.assigned||""),requestedAt:new Date().toISOString()};
    const {error}=await cloudClient.from("life_entries").insert({owner_user_id:user.id,category:"recipe_request",occurred_at:new Date().toISOString(),local_date:meal.date,payload,source:"app",external_id:externalId});
    if(error)throw error;
    return true;
  }catch(error){
    cloudError=error?.message||"Could not request the recipe.";
    return false;
  }
}

async function cloudPullLifeEntries(showAlert=false){
  if(cloudEntryPullBusy||!cloudUser()||!cloudClient)return 0;
  cloudEntryPullBusy=true;
  try{
    const {data,error}=await cloudClient.from("life_entries")
      .select("id,category,occurred_at,local_date,payload,source,external_id,created_at")
      .eq("source","chatgpt")
      .order("created_at",{ascending:true})
      .limit(500);
    if(error)throw error;
    let applied=0;const petProfileEntryIds=new Set();
    for(const row of data||[]){
      if(cloudApplyLifeEntry(row)){
        cloudMarkEntryApplied(row.id);applied++;
        if(row.category==="pet_profile")petProfileEntryIds.add(row.id);
      }
    }
    if(applied){
      await dbSet("state",state);
      if(petProfileEntryIds.size&&typeof cloudUpsertPetProfile==="function"){
        for(const pet of state.pets||[]){
          if(petProfileEntryIds.has(pet.cloudEntryId)){
            try{await cloudUpsertPetProfile(pet)}catch(e){}
          }
        }
      }
      cloudSchedulePush();
      if(typeof render==="function")render();
    }
    if(showAlert)alert(applied?`Added ${applied} new ChatGPT log entr${applied===1?"y":"ies"} to this device.`:"No new ChatGPT logs to add.");
    return applied;
  }catch(error){
    cloudError=error?.message||"Could not pull conversational logs.";
    if(showAlert)alert("Could not pull ChatGPT logs.");
    return 0;
  }finally{cloudEntryPullBusy=false}
}

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible"||!cloudUser())return;
  const sync=cloudAutoEnabled()?cloudPrepareAutoSync():cloudPullLifeEntries(false);
  Promise.resolve(sync).then(async()=>{
    if(typeof queueMissingMealRecipes==="function")await queueMissingMealRecipes();
    if(typeof cloudPullLifeEntries==="function")await cloudPullLifeEntries(false);
    if(typeof cloudPullHouseholdMembers==="function")await cloudPullHouseholdMembers();
      await cloudPullPetProfiles();
    if(typeof render==="function")render();
  }).catch(()=>{});
});


// Load small runtime UI fixes that should stay isolated from the main state schema.
if(!document.querySelector('script[data-daily-life-money-fix]')){
  const s=document.createElement("script");
  s.src="money-fix.js?v=20261002-1";
  s.dataset.dailyLifeMoneyFix="1";
  document.head.appendChild(s);
}
