/* Daily Life Private Vault
   Sensitive vault contents are encrypted locally before storage.
   No passcode, password, document content, or attachment is written to the public repo or app state snapshot.
*/
const VAULT_DB_KEY="secure-vault-v1";
const VAULT_ITERATIONS=310000;
let vaultEnvelope=null,vaultData=null,vaultKey=null,vaultWarmKey=null,vaultWarmUntil=0,vaultUnlocked=false,vaultLockTimer=null;

function vaultBytesToB64(bytes){
  let out="",chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    const part=bytes.subarray(i,Math.min(bytes.length,i+chunk));
    out+=String.fromCharCode(...part);
  }
  return btoa(out);
}
function vaultB64ToBytes(value){
  const bin=atob(String(value||"")),out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function vaultTextBytes(value){return new TextEncoder().encode(String(value))}
function vaultText(value){return new TextDecoder().decode(value)}
async function vaultDeriveKey(passcode,salt,iterations=VAULT_ITERATIONS){
  const base=await crypto.subtle.importKey("raw",vaultTextBytes(passcode),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2",salt,iterations,hash:"SHA-256"},
    base,
    {name:"AES-GCM",length:256},
    false,
    ["encrypt","decrypt"]
  );
}
async function vaultDecryptWithKey(key,envelope=vaultEnvelope){
  if(!envelope?.ciphertext||!envelope?.iv)throw new Error("Vault data is missing.");
  const plain=await crypto.subtle.decrypt(
    {name:"AES-GCM",iv:vaultB64ToBytes(envelope.iv)},
    key,
    vaultB64ToBytes(envelope.ciphertext)
  );
  const parsed=JSON.parse(vaultText(new Uint8Array(plain)));
  if(!parsed||!Array.isArray(parsed.items))throw new Error("Vault data is invalid.");
  return parsed;
}
async function vaultEncryptCurrent(){
  if(!vaultUnlocked||!vaultKey||!vaultData)throw new Error("Unlock the vault first.");
  const salt=vaultEnvelope?.salt?vaultB64ToBytes(vaultEnvelope.salt):crypto.getRandomValues(new Uint8Array(16));
  const iterations=Number(vaultEnvelope?.iterations||VAULT_ITERATIONS);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt(
    {name:"AES-GCM",iv},
    vaultKey,
    vaultTextBytes(JSON.stringify(vaultData))
  );
  vaultEnvelope={
    format:"daily-life-encrypted-vault",
    version:1,
    kdf:"PBKDF2-SHA256",
    iterations,
    salt:vaultBytesToB64(salt),
    iv:vaultBytesToB64(iv),
    ciphertext:vaultBytesToB64(new Uint8Array(cipher)),
    updatedAt:new Date().toISOString()
  };
  await dbSet(VAULT_DB_KEY,vaultEnvelope);
  vaultTouch();
}
async function vaultInit(){
  try{vaultEnvelope=await dbGet(VAULT_DB_KEY)||null}
  catch{vaultEnvelope=null}
}
function vaultTouch(){
  if(!vaultUnlocked)return;
  if(vaultLockTimer)clearTimeout(vaultLockTimer);
  vaultLockTimer=setTimeout(()=>vaultSoftLock(),5*60*1000);
}
function vaultSoftLock(){
  vaultUnlocked=false;vaultData=null;vaultKey=null;
  if(vaultLockTimer){clearTimeout(vaultLockTimer);vaultLockTimer=null}
  if(typeof closeModal==="function")closeModal();
  if(typeof render==="function")render();
}
function vaultLock(){
  vaultUnlocked=false;vaultData=null;vaultKey=null;vaultWarmKey=null;vaultWarmUntil=0;
  if(vaultLockTimer){clearTimeout(vaultLockTimer);vaultLockTimer=null}
  if(typeof closeModal==="function")closeModal();
  if(typeof render==="function")render();
}
function vaultOwnerNames(){
  const out=[];
  if(typeof state!=="undefined"){
    const me=String(state?.profile?.name||"").trim();if(me)out.push(me);
    for(const p of state.peopleProfiles||[]){
      const rel=String(p?.relationship||"").toLowerCase();
      if(rel==="child"||p?.livesWithUser===true&&/child|son|daughter/i.test(rel))out.push(String(p.name||"").trim());
    }
  }
  return [...new Set(out.filter(Boolean))];
}
function vaultTypeLabel(type){
  return ({
    login:"Login / password",
    birth:"Birth certificate",
    ssn:"Social Security card",
    medical:"Medical / doctor paperwork",
    immunization:"Immunization record",
    insurance:"Insurance card / document",
    school:"School / government paperwork",
    other:"Other important record"
  })[type]||"Other important record";
}
function vaultView(){
  const hasVault=!!vaultEnvelope;
  if(!hasVault){
    return `<div class="card glow vault-hero"><div class="eyebrow">▣ Private Vault</div><h2>Encrypted records, separate from the rest of Daily Life</h2><p class="muted">Vault contents stay encrypted at rest on this device and are excluded from normal Daily Life cloud snapshots.</p><div class="warning"><b>Keep the passcode.</b> Daily Life cannot recover it. The passcode itself is never stored.</div><div class="actions"><button class="btn primary" onclick="vaultCreate()">Create private vault</button><button class="btn" onclick="vaultImportEncrypted()">Import encrypted vault backup</button><button class="btn" onclick="setView('today')">Back</button></div></div>`;
  }
  if(!vaultUnlocked){
    const canBio=!!localStorage.getItem("dailyLifeVaultCredential")&&!!vaultWarmKey&&Date.now()<vaultWarmUntil;
    return `<div class="card glow vault-hero"><div class="eyebrow">▣ Private Vault</div><h2>Vault locked</h2><p class="muted">Your vault is encrypted. Unlock it before viewing document names, logins, notes, or attachments.</p><div class="actions">${canBio?`<button class="btn primary" onclick="vaultBiometricUnlock()">Use device verification</button>`:""}<button class="btn primary" onclick="vaultPromptUnlock()">Unlock with passcode</button><button class="btn" onclick="vaultImportEncrypted()">Import encrypted backup</button><button class="btn" onclick="setView('today')">Back</button></div>${localStorage.getItem("dailyLifeVaultCredential")&&!canBio?`<div class="notice">Device verification is configured, but after an app reload the passcode is required once before biometric/device re-unlock can work during that session.</div>`:""}</div>`;
  }
  vaultTouch();
  const items=[...(vaultData?.items||[])].sort((a,b)=>String(a.title||"").localeCompare(String(b.title||"")));
  return `<div class="card glow vault-hero"><div class="section-title"><div><div class="eyebrow">▣ Private Vault</div><h2>${items.length} encrypted record${items.length===1?"":"s"}</h2><div class="muted small">Michelle + children only · encrypted local storage</div></div><button class="btn" onclick="vaultLock()">Lock</button></div><div class="actions"><button class="btn primary" onclick="openVaultItem()">+ Add record</button><button class="btn" onclick="vaultExportEncrypted()">Export encrypted backup</button><button class="btn" onclick="vaultChangePasscode()">Change passcode</button><button class="btn" onclick="vaultEnableDeviceUnlock()">Enable device verification</button></div></div>
  <div class="card"><div class="section-title"><div><h2>Records</h2><div class="muted small">Passwords and document contents are never shown on this list.</div></div></div>
  ${items.length?items.map(x=>`<button class="vault-row" onclick="openVaultItem('${x.id}')"><span class="vault-icon">${x.attachment?"▤":"▣"}</span><span class="grow"><b>${esc(x.title||vaultTypeLabel(x.type))}</b><small>${esc(vaultTypeLabel(x.type))}${x.owner?" · "+esc(x.owner):""}${x.attachment?" · attachment":""}</small></span><span>›</span></button>`).join(""):`<div class="notice">No private records stored yet.</div>`}
  </div>
  <div class="card"><div class="mini-heading">Security</div><p class="muted small">AES-256-GCM encryption with a PBKDF2-derived key. Normal app backups and cloud snapshots do not contain vault records. Encrypted vault exports can be kept separately for recovery.</p></div>`;
}
function vaultCreate(){
  if(!crypto?.subtle){alert("Encrypted vault storage is not available in this browser.");return}
  modal("Create private vault",`<div class="stack"><div class="warning">Choose a passcode you can remember. It cannot be recovered by Daily Life.</div><label>Passcode<input id="vaultPass1" type="password" minlength="6" autocomplete="new-password"></label><label>Confirm passcode<input id="vaultPass2" type="password" minlength="6" autocomplete="new-password"></label></div>`,"Create vault",async()=>{
    const a=$("#vaultPass1").value,b=$("#vaultPass2").value;
    if(a.length<6){alert("Use at least 6 characters or digits.");return}
    if(a!==b){alert("The passcodes do not match.");return}
    const salt=crypto.getRandomValues(new Uint8Array(16));
    vaultEnvelope={format:"daily-life-encrypted-vault",version:1,kdf:"PBKDF2-SHA256",iterations:VAULT_ITERATIONS,salt:vaultBytesToB64(salt)};
    vaultKey=await vaultDeriveKey(a,salt,VAULT_ITERATIONS);
    vaultWarmKey=vaultKey;vaultWarmUntil=Date.now()+30*60*1000;
    vaultData={version:1,items:[],createdAt:new Date().toISOString()};
    vaultUnlocked=true;
    await vaultEncryptCurrent();closeModal();render();
  });
}
function vaultPromptUnlock(){
  modal("Unlock private vault",`<div class="stack"><label>Vault passcode<input id="vaultPass" type="password" autocomplete="current-password" autofocus></label><div class="muted small">Your passcode stays on this device and is used only to derive the encryption key.</div></div>`,"Unlock",async()=>{
    const pass=$("#vaultPass").value;if(!pass)return;
    try{
      const salt=vaultB64ToBytes(vaultEnvelope.salt),iterations=Number(vaultEnvelope.iterations||VAULT_ITERATIONS);
      const key=await vaultDeriveKey(pass,salt,iterations);
      const data=await vaultDecryptWithKey(key);
      vaultKey=key;vaultWarmKey=key;vaultWarmUntil=Date.now()+30*60*1000;vaultData=data;vaultUnlocked=true;vaultTouch();closeModal();render();
    }catch{alert("That passcode did not unlock this vault.")}
  });
}
async function vaultEnableDeviceUnlock(){
  if(!vaultUnlocked){vaultPromptUnlock();return}
  if(!window.isSecureContext||!navigator.credentials||!window.PublicKeyCredential){alert("Device verification is not available in this browser.");return}
  try{
    if(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable){
      const ok=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if(!ok){alert("This device did not report an available fingerprint, face, or screen-lock authenticator.");return}
    }
    const challenge=crypto.getRandomValues(new Uint8Array(32)),userId=crypto.getRandomValues(new Uint8Array(16));
    const cred=await navigator.credentials.create({publicKey:{
      challenge,
      rp:{name:"Daily Life"},
      user:{id:userId,name:"daily-life-vault",displayName:"Daily Life Vault"},
      pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
      authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required"},
      timeout:60000,
      attestation:"none"
    }});
    if(!cred?.rawId)throw new Error("No credential returned.");
    localStorage.setItem("dailyLifeVaultCredential",vaultBytesToB64(new Uint8Array(cred.rawId)));
    vaultWarmKey=vaultKey;vaultWarmUntil=Date.now()+30*60*1000;
    alert("Device verification enabled. It can re-open the vault during this app session; after a full reload, use the passcode once.");
  }catch(error){alert("Could not enable device verification: "+(error?.message||"Cancelled"))}
}
async function vaultBiometricUnlock(){
  if(!vaultWarmKey||Date.now()>=vaultWarmUntil){vaultWarmKey=null;vaultPromptUnlock();return}
  const stored=localStorage.getItem("dailyLifeVaultCredential");if(!stored){vaultPromptUnlock();return}
  try{
    const assertion=await navigator.credentials.get({publicKey:{
      challenge:crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials:[{type:"public-key",id:vaultB64ToBytes(stored)}],
      userVerification:"required",
      timeout:60000
    }});
    if(!assertion)throw new Error("Verification was not completed.");
    const data=await vaultDecryptWithKey(vaultWarmKey);
    vaultKey=vaultWarmKey;vaultData=data;vaultUnlocked=true;vaultTouch();render();
  }catch(error){alert("Device verification did not unlock the vault. Use the passcode instead.")}
}
function openVaultItem(id=""){
  if(!vaultUnlocked||!vaultData){vaultPromptUnlock();return}
  vaultTouch();
  const x=(vaultData.items||[]).find(v=>v.id===id)||{id:"",type:"login",title:"",owner:vaultOwnerNames()[0]||"",username:"",secret:"",notes:"",attachment:null};
  const owners=vaultOwnerNames();
  modal(x.id?"Private record":"Add private record",`<div class="stack">
    <div class="warning">This form is visible only while the vault is unlocked. Saving encrypts it again before local storage.</div>
    <label>Type<select id="vtype">${["login","birth","ssn","medical","immunization","insurance","school","other"].map(v=>`<option value="${v}" ${x.type===v?"selected":""}>${esc(vaultTypeLabel(v))}</option>`).join("")}</select></label>
    <label>Title<input id="vtitle" value="${esc(x.title||"")}" placeholder="Example: Leo birth certificate"></label>
    <label>Owner<input id="vowner" list="vaultOwners" value="${esc(x.owner||"")}" placeholder="You or a child"><datalist id="vaultOwners">${owners.map(v=>`<option value="${esc(v)}">`).join("")}</datalist></label>
    <div class="grid2"><label>Username / account<input id="vuser" value="${esc(x.username||"")}" autocomplete="off"></label><label>Password / sensitive number<input id="vsecret" type="password" value="${esc(x.secret||"")}" autocomplete="off"></label></div>
    <label>Notes<textarea id="vnotes" rows="4">${esc(x.notes||"")}</textarea></label>
    <label>Attach photo or PDF<input id="vfile" type="file" accept="image/*,application/pdf"></label>
    ${x.attachment?`<div class="row"><span><b>Encrypted attachment</b><div class="muted small">${esc(x.attachment.name||"Document")}</div></span><button type="button" class="btn small" onclick="vaultOpenAttachment('${x.id}')">Save a copy</button></div>`:""}
    ${x.id?`<button type="button" class="btn danger" onclick="vaultDeleteItem('${x.id}')">Delete record</button>`:""}
  </div>`,"Encrypt + save",async()=>{
    const title=$("#vtitle").value.trim();if(!title){alert("Add a title so you can find this record later.");return}
    let row=(vaultData.items||[]).find(v=>v.id===id);
    if(!row){row={id:uid(),createdAt:new Date().toISOString(),attachment:null};vaultData.items.push(row)}
    const file=$("#vfile").files?.[0];
    if(file){
      if(file.size>8*1024*1024){alert("For now, keep each vault attachment under 8 MB.");return}
      row.attachment={name:file.name,type:file.type||"application/octet-stream",data:vaultBytesToB64(new Uint8Array(await file.arrayBuffer()))};
    }
    Object.assign(row,{type:$("#vtype").value,title,owner:$("#vowner").value.trim(),username:$("#vuser").value.trim(),secret:$("#vsecret").value,notes:$("#vnotes").value.trim(),updatedAt:new Date().toISOString()});
    await vaultEncryptCurrent();closeModal();render();
  });
}
async function vaultDeleteItem(id){
  if(!vaultUnlocked||!vaultData)return;
  const x=vaultData.items.find(v=>v.id===id);if(!x||!confirm(`Delete "${x.title||"this private record"}" from the encrypted vault?`))return;
  vaultData.items=vaultData.items.filter(v=>v.id!==id);await vaultEncryptCurrent();closeModal();render();
}
function vaultOpenAttachment(id){
  if(!vaultUnlocked||!vaultData)return;
  const a=vaultData.items.find(v=>v.id===id)?.attachment;if(!a?.data)return;
  const blob=new Blob([vaultB64ToBytes(a.data)],{type:a.type||"application/octet-stream"}),url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=a.name||"Daily_Life_Vault_Attachment";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);vaultTouch();
}
function vaultExportEncrypted(){
  if(!vaultEnvelope)return;
  const blob=new Blob([JSON.stringify(vaultEnvelope,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`Daily_Life_Encrypted_Vault_${typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);vaultTouch();
}
function vaultImportEncrypted(){
  const input=document.createElement("input");input.type="file";input.accept="application/json";input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed?.format!=="daily-life-encrypted-vault"||!parsed?.salt||!parsed?.iv||!parsed?.ciphertext)throw new Error();
      if(vaultEnvelope&&!confirm("Replace the encrypted vault currently stored on this device?"))return;
      await dbSet(VAULT_DB_KEY,parsed);vaultEnvelope=parsed;vaultData=null;vaultKey=null;vaultWarmKey=null;vaultWarmUntil=0;vaultUnlocked=false;render();alert("Encrypted vault backup imported. Unlock it with its passcode.");
    }catch{alert("That file is not a valid encrypted Daily Life vault backup.")}
  };input.click();
}
function vaultChangePasscode(){
  if(!vaultUnlocked||!vaultData){vaultPromptUnlock();return}
  modal("Change vault passcode",`<div class="stack"><div class="warning">Changing the passcode re-encrypts the vault. Keep the new passcode somewhere you can recover.</div><label>New passcode<input id="vnew1" type="password" minlength="6" autocomplete="new-password"></label><label>Confirm new passcode<input id="vnew2" type="password" minlength="6" autocomplete="new-password"></label></div>`,"Re-encrypt vault",async()=>{
    const a=$("#vnew1").value,b=$("#vnew2").value;if(a.length<6){alert("Use at least 6 characters or digits.");return}if(a!==b){alert("The passcodes do not match.");return}
    const salt=crypto.getRandomValues(new Uint8Array(16));vaultKey=await vaultDeriveKey(a,salt,VAULT_ITERATIONS);vaultWarmKey=vaultKey;vaultWarmUntil=Date.now()+30*60*1000;
    vaultEnvelope={format:"daily-life-encrypted-vault",version:1,kdf:"PBKDF2-SHA256",iterations:VAULT_ITERATIONS,salt:vaultBytesToB64(salt)};
    await vaultEncryptCurrent();closeModal();render();alert("Vault passcode changed and data re-encrypted.");
  });
}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&vaultUnlocked)vaultSoftLock()});
