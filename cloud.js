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
    }
    cloudClient.auth.onAuthStateChange((_event,session)=>{
      cloudSession=session||null;
      cloudError="";cloudNeedsReview=false;cloudAutoCanPush=false;
      if(cloudPushTimer){clearTimeout(cloudPushTimer);cloudPushTimer=null}
      setTimeout(async()=>{
        if(cloudSession){
          await cloudRefreshMetadata();
          await cloudPrepareAutoSync();
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
  const arrays=["tasks","workShifts","waterLogs","stretchLogs","selfCare","foodLogs","readingLogs","chores","meals","shopping","homeLogs","tireLogs"];
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
    case "food":{
      const name=String(p.name||"").trim();if(!name)return false;
      state.foodLogs.push({...common,name,category:String(p.category||"food"),calories:Number(p.calories||0),protein:Number(p.protein||0),notes:String(p.notes||"")});
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
    case "shopping":{
      const item=String(p.item||"").trim();if(!item)return false;
      state.shopping.push({id:common.id,cloudEntryId:row.id,item,qty:String(p.qty||""),store:String(p.store||""),status:String(p.status||"needed")});return true;
    }
    case "home_care":{
      const task=String(p.task||"").trim();if(!task)return false;
      state.homeLogs.push({...common,area:String(p.area||"Home"),task,status:String(p.status||"done"),notes:String(p.notes||"")});return true;
    }
    case "task":{
      const title=String(p.title||"").trim();if(!title)return false;
      state.tasks.push({...common,title,category:String(p.category||"life"),notes:String(p.notes||""),done:!!p.done,order:Number(p.order||100)});return true;
    }
    case "meal":{
      const dish=String(p.dish||"").trim();if(!dish)return false;
      const type=String(p.type||"dinner"),mealDate=String(p.date||date);
      let x=state.meals.find(x=>x.date===mealDate&&x.type===type);
      if(!x){x={id:uid(),date:mealDate,type,cloudEntryId:row.id};state.meals.push(x)}
      Object.assign(x,{dish,method:String(p.method||x.method||""),assigned:String(p.assigned||x.assigned||""),status:String(p.status||x.status||"planned"),notes:String(p.notes||x.notes||""),cloudEntryId:row.id});
      return true;
    }
    case "budget_spending":{
      const valid=new Set(["transport","dining","household","personal","grocery","fun","cushion","ebt"]);
      const category=String(p.category||"").trim(),amount=Number(p.amount||0);
      if(!valid.has(category)||!Number.isFinite(amount)||amount<=0)return false;
      state.budget.spending.push({id:uid(),cloudEntryId:row.id,date:String(p.date||date),amount:Math.round(amount*100)/100,category,note:String(p.note||"ChatGPT entry"),source:"chatgpt"});
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
      if(p.paymentAccountKey!==undefined)b.paymentAccountKey=String(p.paymentAccountKey||"");
      if(p.desiredAccountKey!==undefined)b.desiredAccountKey=String(p.desiredAccountKey||"");
      b.lastCloudEntryId=row.id;
      return true;
    }
    default:return false;
  }
}

async function cloudPullLifeEntries(showAlert=false){
  if(cloudEntryPullBusy||!cloudUser()||!cloudClient)return 0;
  cloudEntryPullBusy=true;
  try{
    const {data,error}=await cloudClient.from("life_entries")
      .select("id,category,occurred_at,local_date,payload,source,created_at")
      .eq("source","chatgpt")
      .order("created_at",{ascending:true})
      .limit(500);
    if(error)throw error;
    let applied=0;
    for(const row of data||[]){
      if(cloudApplyLifeEntry(row)){cloudMarkEntryApplied(row.id);applied++}
    }
    if(applied){
      await dbSet("state",state);
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
  if(document.visibilityState==="visible"&&cloudAutoEnabled()&&cloudUser()){
    cloudPrepareAutoSync().then(()=>{if(typeof render==="function")render()}).catch(()=>{});
  }
});
