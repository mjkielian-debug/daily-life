// Daily Life cloud account + private snapshot bridge.
// The publishable key is designed to be used by browser clients. Row Level
// Security in Supabase protects private rows. Never put secret/service-role
// keys or financial-provider access tokens in this file.
const DAILY_CLOUD_URL="https://lticktlgrlljlafmjsao.supabase.co";
const DAILY_CLOUD_PUBLISHABLE_KEY="sb_publishable_S8rk3-LkoyPLuyw2p_v7gA_yskyW--m";

let cloudClient=null;
let cloudSession=null;
let cloudRemoteUpdatedAt=null;
let cloudBusy=false;
let cloudError="";

const cloudUser=()=>cloudSession?.user||null;

async function cloudInit(){
  try{
    if(!window.supabase?.createClient)throw new Error("Cloud library did not load.");
    cloudClient=window.supabase.createClient(DAILY_CLOUD_URL,DAILY_CLOUD_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await cloudClient.auth.getSession();
    if(error)throw error;
    cloudSession=data.session||null;
    if(cloudSession)await cloudRefreshMetadata();
    cloudClient.auth.onAuthStateChange((_event,session)=>{
      cloudSession=session||null;
      cloudError="";
      setTimeout(async()=>{
        if(cloudSession)await cloudRefreshMetadata();
        else cloudRemoteUpdatedAt=null;
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
    return `<div class="card"><div class="section-title"><h2>Cloud account</h2><span class="tag">optional</span></div><p class="muted">Sign in to keep a private cloud copy and later sync across devices. Local data remains on this device unless you explicitly upload it.</p>${cloudError?`<div class="notice">${esc(cloudError)}</div>`:""}<button class="btn primary" onclick="openCloudAuth()">Sign in / create account</button></div>`;
  }
  const updated=cloudRemoteUpdatedAt?new Date(cloudRemoteUpdatedAt).toLocaleString():"No cloud copy yet";
  return `<div class="card glow"><div class="section-title"><h2>Cloud account</h2><span class="tag">signed in</span></div><div class="row"><span>Account</span><b>${esc(user.email||"Signed in")}</b></div><div class="row"><span>Cloud copy</span><b>${esc(updated)}</b></div><p class="muted small">Cloud snapshot sync is manual during this safety phase. Your local IndexedDB copy remains the source of truth until automatic sync is tested.</p>${cloudError?`<div class="notice">${esc(cloudError)}</div>`:""}<div class="actions"><button class="btn primary" onclick="cloudUploadSnapshot()">Upload this device</button><button class="btn" onclick="cloudRestoreSnapshot()">Restore cloud copy</button><button class="btn" onclick="cloudSignOut()">Sign out</button></div></div>`;
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
    closeModal();
    render();
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
  cloudSession=null;cloudRemoteUpdatedAt=null;cloudError="";render();
}

function cloudStateForUpload(){
  const copy=structuredClone(state);
  // Large base64 photos remain local for now; Storage support will be added
  // separately so snapshots stay small and reliable.
  if(Array.isArray(copy.outfits)){
    for(const outfit of copy.outfits){
      if(outfit.photo){delete outfit.photo;outfit.photoLocalOnly=true}
    }
  }
  return copy;
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

async function cloudUploadSnapshot(){
  const user=cloudUser();
  if(!user||!cloudClient){openCloudAuth();return}
  if(!confirm("Upload this device's current Daily Life data to your private cloud copy? This replaces the previous cloud snapshot but does not erase local data."))return;
  cloudBusy=true;cloudError="";
  try{
    await cloudEnsureProfile();
    const now=new Date().toISOString();
    const {error}=await cloudClient.from("app_snapshots").upsert({
      owner_user_id:user.id,
      schema_version:Number(state.version)||1,
      state:cloudStateForUpload(),
      updated_at:now
    },{onConflict:"owner_user_id"});
    if(error)throw error;
    cloudRemoteUpdatedAt=now;render();
    alert("Private cloud copy uploaded.");
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
    render();
    alert("Cloud copy restored to this device.");
  }catch(error){
    cloudError=error?.message||"Cloud restore failed.";render();
    alert("Could not restore the cloud copy. Your local data was not changed.");
  }finally{cloudBusy=false}
}
