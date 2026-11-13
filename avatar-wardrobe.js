/* Free photo styling, garment analysis, and schedule-aware cartoon wardrobe. */
(function(){
"use strict";
const safeColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||""))?String(v):"#d7c6ee";
const SSD_VEST_ID="owned-ssd-mesh-vest";
let vestSaveQueued=false;
const esc=v=>typeof window.esc==="function"?window.esc(String(v||"")):String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function wardrobe(){
 if(typeof state==="undefined")return null;
 state.settings=state.settings||{};
 state.settings.avatarWardrobe=state.settings.avatarWardrobe||{items:[],activeItemId:"",ssdItemId:""};
 const w=state.settings.avatarWardrobe;
 if(!Array.isArray(w.items))w.items=Array.isArray(w.looks)?w.looks.map(x=>({...x,type:x.type||"outfit"})):[];
 let vest=w.items.find(x=>x&&x.id===SSD_VEST_ID)||w.items.find(x=>isVestLook(x));
 let changed=false;
 if(!vest){
  vest={id:SSD_VEST_ID,name:"Brown mesh SSD vest",type:"vest",primary:"#79543e",accent:"#f0d34e",analysis:{garment_type:"vest",material_appearance:"brown mesh",style:"reflective workwear",visible_details:["bright yellow and silver reflective bands","front zipper","UPS shield","green hoodie underneath","pink shirt hem","black pants"],summary:"Brown mesh SSD vest over a green hoodie, with a pink shirt peeking below and black pants"},schedule:{ssd:true,daypart:"any",season:"any"},source:"Owned UPS workwear · added to digital wardrobe",isWorkUniform:true};
  w.items.push(vest);changed=true;
 }
 if(w.ssdItemId!==vest.id){w.ssdItemId=vest.id;changed=true}
 if(changed&&!vestSaveQueued){
  vestSaveQueued=true;
  const persist=()=>{vestSaveQueued=false;try{if(typeof window.save==="function"){const saved=window.save();if(saved&&typeof saved.catch==="function")saved.catch(()=>{})}}catch(_){}};
  if(typeof queueMicrotask==="function")queueMicrotask(persist);else setTimeout(persist,0);
 }
 return w;
}
function clockMinutes(value){
 const m=String(value||"").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);if(!m)return null;
 let hour=Number(m[1]),minute=Number(m[2]);if(hour>23||minute>59)return null;
 if(m[3]){const pm=m[3].toLowerCase()==="pm";hour=hour%12+(pm?12:0)}
 return hour*60+minute;
}
function isSsdActiveNow(){
 const date=typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10),now=new Date(),nowMinutes=now.getHours()*60+now.getMinutes(),s=typeof state==="undefined"?{}:state;
 return (s.workShifts||[]).some(x=>{
  if(!x||x.date!==date)return false;
  const words=/\bssd\b|seasonal support driver|seasonal helper|delivery route|helper vest/i;
  const hasSsd=!!(x.deliveryStart||x.deliveryEnd)||Number(x.ssdHours)>0||Number(x.ssdMiles)>0||words.test(String(x.notes||"")+" "+String(x.payCode||""));
  const start=clockMinutes(x.deliveryStart),end=clockMinutes(x.deliveryEnd);
  return hasSsd&&start!==null&&end!==null&&nowMinutes>=start&&nowMinutes<=end;
 });
}
function isVestLook(item){
 const type=String(item?.type||"").toLowerCase(),garment=String(item?.analysis?.garment_type||"").toLowerCase();
 return type==="vest"||/\bvest\b/.test(garment)||!!item?.isWorkUniform||!!item?.schedule?.ssd;
}
function currentDaypart(){const h=new Date().getHours();return h>=4&&h<12?"morning":h>=12&&h<17?"afternoon":"evening"}
function currentSeason(){const m=new Date().getMonth()+1;return m===12||m<=2?"winter":m<=5?"spring":m<=8?"summer":"fall"}
function hasSchedule(s){return !!s&&(s.ssd||s.daypart&&s.daypart!=="any"||s.season&&s.season!=="any")}
function scheduleMatches(item){const s=item?.schedule||{};return (!s.ssd||isSsdActiveNow())&&(!s.daypart||s.daypart==="any"||s.daypart===currentDaypart())&&(!s.season||s.season==="any"||s.season===currentSeason())}
function ensureGreenHoodie(){
 if(!Array.isArray(state.inventoryItems)||!state.settings||state.settings.greenHoodieRecorded)return;
 const items=state.inventoryItems;
 let hoodie=items.find(item=>["michelle","me","self"].includes(String(item.inventoryOwner||item.wardrobeOwner||"").trim().toLowerCase()) && /green/i.test(item.name||"") && /hoodie|hooded sweatshirt/i.test(item.name||""));
 if(!hoodie){
  hoodie={id:"michelle-green-hoodie",name:"Green hoodie",category:"Clothing",wardrobeType:"hoodie_jacket",inventoryOwner:"Michelle",wardrobeOwner:"Michelle",quantity:1,status:"Have"};
  items.push(hoodie);
 }
 hoodie.avatarGarment="green-hoodie";
 state.settings.greenHoodieRecorded=true;
 if(typeof window.save==="function")queueMicrotask(()=>window.save());
}
function ensureBlackPants(){
 if(!Array.isArray(state.inventoryItems)||!state.settings||state.settings.blackPantsRecorded)return;
 const items=state.inventoryItems;
 let pants=items.find(item=>["michelle","me","self"].includes(String(item.inventoryOwner||item.wardrobeOwner||"").trim().toLowerCase()) && /black/i.test(item.name||"") && /\b(pants|trousers)\b/i.test(item.name||""));
 if(!pants){
  pants={id:"michelle-black-pants",name:"Black pants",category:"Clothing",wardrobeType:"pants",inventoryOwner:"Michelle",wardrobeOwner:"Michelle",quantity:1,status:"Have"};
  items.push(pants);
 }
 pants.avatarGarment="black-pants";
 state.settings.blackPantsRecorded=true;
 if(typeof window.save==="function")queueMicrotask(()=>window.save());
}
window.blackPantsIllustration='<svg viewBox="0 0 100 100" width="64" height="64" role="img" aria-label="Black pants illustration"><path fill="#252525" stroke="#111" stroke-width="2" d="M25 9h50l5 80-23 2-7-51-7 51-23-2z"/><path fill="none" stroke="#555" stroke-width="2" d="M25 17h50M49 17v14M35 17q0 9-10 12m40-12q0 9 10 12"/></svg>';
window.greenHoodieIllustration='<svg viewBox="0 0 100 100" width="64" height="64" role="img" aria-label="Green hoodie illustration"><path fill="#386b49" stroke="#254b33" stroke-width="2" d="M34 27Q34 6 50 6T66 27L78 33L94 65L83 72L70 51V91H30V51L17 72L6 65L22 33Z"/><path fill="#264e38" d="M35 26Q50 10 65 26L50 40Z"/><path fill="none" stroke="#93ac96" stroke-width="2" d="M46 37v15m8-15v15M37 74l6-9h14l6 9"/></svg>';
window.ensurePersonalWardrobePieces=()=>{ensureGreenHoodie();ensureBlackPants()};
function personalClosetItems(){
 ensureGreenHoodie();
 ensureBlackPants();
 return (state.inventoryItems||[]).filter(item=>item.id && ["michelle","me","self"].includes(String(item.inventoryOwner||item.wardrobeOwner||"").trim().toLowerCase()) &&
  (item.wardrobeType || /^(clothing|clothes|apparel|wardrobe)$/i.test(item.category||"")) &&
  !/^(gone|donate \/ sell|sold|discarded|donated)$/i.test(item.status||"") && !/^(donate|sell|recycle)$/i.test(item.organizingDecision||"") &&
  (item.avatarGarment || item.sourceSuggestionId || item.sourceSuggestionIds?.length));
}
const closetColors=new Map();
function availableLooks(w){
 return w.items.concat(personalClosetItems().map(item=>{
  const label=[item.wardrobeType,item.name].join(" ").toLowerCase();
  const type=/pants|jeans|leggings|skirt|shorts/.test(label)?"bottom":/boot|shoe|sneaker|sandal/.test(label)?"shoes":/dress|jumpsuit|romper/.test(label)?"outfit":"top";
  return {id:"closet-"+encodeURIComponent(item.id).replace(/'/g,"%27"),inventoryItem:item,name:item.name,type,analysis:item.avatarGarment==="green-hoodie"?{garment_type:"hoodie"}:null,primary:closetColors.get(String(item.id))||(item.avatarGarment==="green-hoodie"?"#386b49":item.avatarGarment==="black-pants"?"#252525":"#d7c6ee"),accent:"#c5d9ef",source:"Bedroom closet"};
 }));
}
async function loadClosetPreviews(){
 const pieces=personalClosetItems();
 if(!pieces.length||!document.querySelector(".aw-closet-preview"))return;
 try{
  await window.inventoryLoadSavedItemPhotos?.(pieces);
  for(const frame of document.querySelectorAll(".aw-closet-preview")){
   const img=frame.querySelector("img");if(!img)continue;
   await img.decode();
   const canvas=document.createElement("canvas");canvas.width=canvas.height=12;
   const ctx=canvas.getContext("2d");ctx.drawImage(img,img.naturalWidth*.25,img.naturalHeight*.25,img.naturalWidth*.5,img.naturalHeight*.5,0,0,12,12);
   const pixels=ctx.getImageData(0,0,12,12).data, totals=[0,0,0];
   for(let i=0;i<pixels.length;i+=4)totals.forEach((_,c)=>totals[c]+=pixels[i+c]);
   closetColors.set(frame.dataset.item,"#"+totals.map(v=>Math.round(v/144).toString(16).padStart(2,"0")).join(""));
  }
 }catch(_){}
}
function wearDay(){return typeof ymd==="function"?ymd():new Date().toLocaleDateString("en-CA")}
window.wardrobeWearControls=function(id){
 const towel=id.startsWith("bathroom-towel:");
 const record=state.settings?.clothingWear?.[id],key=esc(encodeURIComponent(id).replace(/'/g,"%27"));
 const button=(action,label)=>'<button type="button" class="lm-mini-button" data-wear-key="'+key+'" data-wear-action="'+action+'">'+label+'</button>';
 const status=record?'<small>Likely in laundry · last '+(towel?'used ':'worn ')+esc(record.date)+'</small> ':"";
 return '<div class="aw-wear-controls">'+status+(record?.date===wearDay()?"":button("day",towel?"Used today":"Wore today"))+(record?button("clear",towel?"Back in bathroom":"Back in closet"):"")+'</div>';
};
document.addEventListener("click",async event=>{
 const b=event.target.closest?.("[data-wear-action]");if(!b)return;
 const id=decodeURIComponent(b.dataset.wearKey),action=b.dataset.wearAction;
 state.settings=state.settings||{};const records=state.settings.clothingWear||(state.settings.clothingWear={});
 const before=records[id];
 if(action==="clear")delete records[id];
 else records[id]={date:wearDay(),mode:"day"};
 try{await save()}catch(e){if(before)records[id]=before;else delete records[id];alert("Could not save this wardrobe update.");return}
 if(b.closest("[data-towel-controls]"))b.closest("[data-towel-controls]").innerHTML=window.wardrobeWearControls(id);
 else if(document.getElementById("familyClosetBody"))window.refreshFamilyClosetWear?.();
 else if(typeof render==="function")render();
});
function active(){
 const w=wardrobe();if(!w)return null;
 const looks=availableLooks(w);
 const ssdActive=isSsdActiveNow();
 const selectedManual=w.manualOverrideDate===(typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10))&&w.manualOverrideDaypart===currentDaypart()?looks.find(x=>x.id===w.activeItemId):null;
 const manual=selectedManual;
 const ssdLook=ssdActive&&w.ssdItemId?w.items.find(x=>x.id===w.ssdItemId):null;
 const automaticWorkLook=ssdActive&&!ssdLook?{
  id:"automatic-work-mesh-vest",name:"Brown mesh work vest",type:"vest",
  primary:"#79543e",accent:"#d7df69",analysis:{garment_type:"vest",material_appearance:"mesh",summary:"Brown mesh delivery vest with high-visibility reflective bands"},
  schedule:{ssd:isSsdActiveNow()},isWorkUniform:true
 }:null;
 const scheduled=[...w.items].reverse().find(x=>hasSchedule(x.schedule)&&scheduleMatches(x)&&(ssdActive||!isVestLook(x)));
 const saved=looks.find(x=>x.id===w.activeItemId),fallback=saved&&(ssdActive||!isVestLook(saved))?saved:null;
 const latest=[...w.items].reverse().find(x=>ssdActive||!isVestLook(x));
 const look=ssdLook||automaticWorkLook||manual||scheduled||fallback||latest;
 const manualActive=!!manual&&look===manual&&!ssdActive;
 return look?{id:look.id,name:look.name,type:look.type||"outfit",analysis:look.analysis||null,schedule:look.schedule||{},primary:safeColor(look.primary),accent:safeColor(look.accent),isManual:manualActive,isScheduled:!manualActive&&(!!look.isWorkUniform||(isSsdActiveNow()&&w.ssdItemId===look.id)||(hasSchedule(look.schedule)&&scheduleMatches(look))),isWorkUniform:!!look.isWorkUniform}:null;
}
window.avatarWardrobeGetActive=active;
function analysisDescription(value){
 const a=value?.analysis;if(!a)return value?.source||"Colors saved on this device";
 const details=[a.garment_type,a.style,a.silhouette,a.pattern,a.material_appearance,...(Array.isArray(a.visible_details)?a.visible_details:[])].filter(x=>typeof x==="string"&&x.trim());
 return String(a.summary||details.join(" · ")).slice(0,320);
}
function paintAvatar(){
 const svg=document.querySelector(".lm-avatar"),look=active();if(!svg||!look)return;
 const top=!['bottom','shoes','accessory'].includes(look.type)?look.primary:"#d7c6ee";
 const bottom=look.type==="bottom"?look.primary:look.type==="outfit"?look.accent:"#c5d9ef";
 svg.style.setProperty("--lm-outfit-main",top);svg.style.setProperty("--lm-outfit-vest",look.primary);svg.style.setProperty("--lm-outfit-accent",bottom);
 svg.style.setProperty("--lm-outfit-shoe",look.type==="shoes"?look.primary:"#f7b9cd");
 svg.style.setProperty("--lm-outfit-accessory",look.type==="accessory"?look.primary:"#f5c2da");
 const card=document.querySelector(".lm-wardrobe-card");if(card&&typeof window.avatarWardrobePanelHtml==="function")card.outerHTML=window.avatarWardrobePanelHtml();
}
let lastSchedulePaint="",lastScheduleLookId="";
function refreshScheduledAvatar(){
 if(!document.querySelector(".lm-avatar"))return;
 const look=active(),signature=[look?.id||"",!!look?.isManual,!!look?.isScheduled,currentDaypart(),currentSeason(),typeof ymd==="function"?ymd():""].join("|");
 if(signature===lastSchedulePaint)return;
 lastSchedulePaint=signature;
 const nextId=look?.id||"",changed=lastScheduleLookId&&lastScheduleLookId!==nextId;lastScheduleLookId=nextId;
 if(changed&&typeof window.render==="function"){window.render();return}
 paintAvatar();
}
setInterval(refreshScheduledAvatar,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshScheduledAvatar()});
window.addEventListener("focus",refreshScheduledAvatar);
function scheduleLabel(s){if(!hasSchedule(s))return"Any time";return [s.ssd?"SSD route":"",s.daypart&&s.daypart!=="any"?s.daypart:"",s.season&&s.season!=="any"?s.season:""].filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" · ")}
window.avatarWardrobePanelHtml=function(){
 const w=wardrobe();if(!w)return "";
 const selected=active(),looks=availableLooks(w).reverse();
 queueMicrotask(loadClosetPreviews);
 const rows=looks.map(x=>{
  const wearing=selected?.id===x.id,wearText=wearing?(selected.isScheduled?"On for SSD":"On avatar · tap to take off"):"Tap to wear";
  return '<div class="lm-wardrobe-item-row"><button type="button" class="lm-wardrobe-look" aria-pressed="'+(wearing?"true":"false")+'" onclick="avatarWardrobeSetActive(\''+esc(x.id)+'\')">'+(x.inventoryItem?'<span class="aw-closet-preview" style="filter:contrast(1.45) saturate(1.35);overflow:hidden;border-radius:12px;display:inline-grid;width:54px;height:54px" data-item="'+esc(x.inventoryItem.id)+'">'+(window.inventoryItemPhotoHtml?.(x.inventoryItem)||(x.inventoryItem.avatarGarment==="green-hoodie"?window.greenHoodieIllustration:x.inventoryItem.avatarGarment==="black-pants"?window.blackPantsIllustration:""))+'</span>':'')+'<span class="lm-wardrobe-swatches"><i style="background:'+safeColor(x.primary)+'"></i><i style="background:'+safeColor(x.accent)+'"></i></span><span class="lm-wardrobe-name"><b>'+esc(x.name||"Clothing photo")+'</b><small>'+esc(x.type||"Complete outfit")+' · '+esc(scheduleLabel(x.schedule))+' · '+esc(analysisDescription(x))+'</small></span><span class="lm-wardrobe-action">'+wearText+'</span></button><button type="button" class="lm-mini-button" aria-label="Use '+esc(x.name||"item")+' for SSD" onclick="avatarWardrobeAssignSSD(\''+esc(x.id)+'\')">'+(w.ssdItemId===x.id?"SSD ✓":"SSD")+'</button>'+window.wardrobeWearControls(x.inventoryItem?"inventory:"+x.inventoryItem.id:"look:"+x.id,w.ssdItemId===x.id)+'</div>';
 }).join("");
 const status=selected?(selected.isManual?"Wearing your selection. Tap its wardrobe card again to take it off.":selected.isWorkUniform?"Vest is automatic only during the saved SSD route hours.":selected.isScheduled?"This look is scheduled for "+esc(scheduleLabel(selected.schedule))+".":"On avatar."):"No wardrobe item selected.";
 return '<section class="lm-wardrobe-card"><div class="lm-wardrobe-head"><div><span class="lm-kicker">DIGITAL WARDROBE</span><b>'+(selected?esc(selected.name):w.items.length?"Choose an item to wear":"Start your digital closet")+'</b><small>'+status+'</small></div><button type="button" class="lm-mini-button lm-upload-look" onclick="openAvatarWardrobeInbox()">＋ Add clothing</button></div>'+
 '<p class="lm-wardrobe-private">'+(w.aiConnected?'Google photo analysis is connected. It analyzes the clothing photo; the app makes a free simplified cartoon outfit on your avatar, not a separate generated image.':'Connect free photo analysis to identify garment details. The app draws a simplified cartoon outfit locally on your avatar; no paid image generation is used.')+' Selected photos are sent to Google for analysis. The original stays in your private Photo Inbox.</p>'+
 (!w.aiConnected?'<button type="button" class="lm-mini-button lm-connect-ai" onclick="avatarWardrobeConnect()">Connect free photo analysis</button>':'')+
 (w.ssdItemId?'<div class="lm-wardrobe-rule">Auto-wears during saved SSD route hours · '+esc((w.items.find(x=>x.id===w.ssdItemId)||{}).name||"saved vest")+'</div>':'')+
 (rows?'<div class="lm-wardrobe-list">'+rows+'</div>':'<div class="lm-wardrobe-empty">Add a clothing photo to analyze it and save a simplified avatar look. Your base avatar, face, hair, and body stay unchanged.</div>')+'</section>';
};
function update(){if(typeof window.save==="function")window.save();if(typeof window.render==="function")window.render()}
window.avatarWardrobeSetActive=function(id){
 const w=wardrobe();if(!w||!availableLooks(w).some(x=>x.id===id))return;
 const today=typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10),part=currentDaypart();
 const sameManual=w.manualOverrideDate===today&&w.manualOverrideDaypart===part&&w.activeItemId===id;
 if(sameManual){
  w.activeItemId=w.manualReturnItemId||"";
  w.manualReturnItemId="";
  w.manualOverrideDate="";w.manualOverrideDaypart="";
 }else{
  if(!(w.manualOverrideDate===today&&w.manualOverrideDaypart===part))w.manualReturnItemId=w.activeItemId===id?"":String(w.activeItemId||"");
  w.activeItemId=id;w.manualOverrideDate=today;w.manualOverrideDaypart=part;
 }
 update();
};
window.avatarWardrobeAssignSSD=function(id){const w=wardrobe();if(!w||!w.items.some(x=>x.id===id))return;w.ssdItemId=id;update()};
window.avatarWardrobeClearSSD=function(){const w=wardrobe();if(!w)return;w.ssdItemId="";update()};
window.openAvatarWardrobeInbox=function(){if(typeof window.openPhotoInbox==="function")window.openPhotoInbox("wardrobe")};
window.avatarWardrobeConnect=function(){
 if(typeof cloudClient==="undefined"||!cloudClient||typeof cloudUser!=="function"||!cloudUser()){
  alert("Sign in to Daily Life cloud before connecting photo analysis.");return;
 }
 modal("Connect free clothing analysis",'<div class="pi-help"><b>One-time connection</b><p>Create a free-tier Gemini API key in Google AI Studio, then paste it below. Daily Life sends it to your signed-in Supabase function, which stores it in encrypted Vault. It is never saved in the public app or your closet data.</p><p>Only photos you choose as <b>Avatar outfit / wardrobe</b> are sent to Google. The app is locked to a free image-understanding model and stops if its free quota is reached; it never switches to a paid image model. Google may use free-tier data to improve its products.</p><a class="btn small" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Open Google AI Studio →</a></div><label class="pi-ai-key-label">Gemini API key<input id="avatarWardrobeApiKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your free-tier key"></label><p id="avatarWardrobeConnectStatus" role="status" aria-live="polite"></p>',"Connect",async()=>{
  const apiKey=String(document.getElementById("avatarWardrobeApiKey")?.value||"").trim(),status=document.getElementById("avatarWardrobeConnectStatus"),button=document.getElementById("saveModal");
  if(!apiKey){if(status)status.textContent="Paste the API key first.";return}
  if(button){button.disabled=true;button.textContent="Connecting…"}
  try{
   const {data,error}=await cloudClient.functions.invoke("avatar-ai",{body:{action:"connect",apiKey}});
   if(error||data?.error)throw Error(data?.message||data?.error||"Connection could not be saved.");
   const w=wardrobe();w.aiConnected=true;await window.save();closeModal();render();
  }catch(error){if(status)status.textContent=String(error?.message||"Connection could not be saved.");if(button){button.disabled=false;button.textContent="Connect"}}
 });
};

function rgbHex(r,g,b){return"#"+[r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("")}
async function sampleOutfit(file){
 const bmp=await createImageBitmap(file);
 try{
  const canvas=document.createElement("canvas"),scale=Math.min(1,420/Math.max(bmp.width,bmp.height));
  canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
  const ctx=canvas.getContext("2d");ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
  const x0=Math.floor(canvas.width*.22),x1=Math.ceil(canvas.width*.78),y0=Math.floor(canvas.height*.22),y1=Math.ceil(canvas.height*.78),data=ctx.getImageData(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)).data,bins=new Map();
  for(let i=0;i<data.length;i+=16){
   const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?((max-min)/max):0;
   if(max<36||min>247)continue;
   const key=[r,g,b].map(v=>Math.round(v/32)*32).join(","),old=bins.get(key)||{count:0,r:0,g:0,b:0,score:0};
   old.count++;old.r+=r;old.g+=g;old.b+=b;old.score+=1+Math.min(1,sat);bins.set(key,old);
  }
  const best=[...bins.values()].sort((a,b)=>b.score-a.score);
  const avg=x=>rgbHex(x.r/x.count,x.g/x.count,x.b/x.count);
  const primary=best[0]?avg(best[0]):"#b78772";
  let second=best.find(x=>{const c=avg(x);return Math.abs(parseInt(c.slice(1,3),16)-parseInt(primary.slice(1,3),16))+Math.abs(parseInt(c.slice(3,5),16)-parseInt(primary.slice(3,5),16))+Math.abs(parseInt(c.slice(5,7),16)-parseInt(primary.slice(5,7),16))>95});
  return{primary,accent:second?avg(second):"#e6c7a7"};
 }finally{bmp.close?.()}
}
async function makeAnalysisImage(file){
 const bmp=await createImageBitmap(file);
 try{
  let max=1100,q=.78,data="";
  for(let i=0;i<5;i++){
   const scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("Could not prepare the image for style analysis.");
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
   data=canvas.toDataURL("image/jpeg",q);if(data.length<=1500000)break;
   if(q>.55)q-=.08;else max=Math.floor(max*.78);
  }
  if(data.length>1500000)throw Error("Image is too large for style analysis.");
  return data;
 }finally{bmp.close?.()}
}
async function analyzeClothing(file){
 if(!wardrobe()?.aiConnected||typeof cloudClient==="undefined"||!cloudClient)return null;
 const imageData=await makeAnalysisImage(file),{data,error}=await cloudClient.functions.invoke("avatar-ai",{body:{action:"analyze",imageData}});
 if(error)throw Error("The free photo analyzer could not be reached.");
 if(data?.error)throw Error(data.message||data.error);
 return data?.analysis||null;
}
function addLook(name,colors,source,analysis=null,schedule={}){
 const w=wardrobe();if(!w)return;
 const id="item-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),look={id,name:String(name||"Clothing photo").slice(0,80),type:source.type||"outfit",primary:safeColor(colors.primary),accent:safeColor(colors.accent),analysis:analysis||null,schedule:{daypart:schedule.daypart||"any",season:schedule.season||"any",ssd:!!schedule.ssd},source:source.label||"Local color sample",createdAt:new Date().toISOString()};
 const lookText=[look.name,look.analysis?.garment_type,look.analysis?.summary,...(Array.isArray(look.analysis?.visible_details)?look.analysis.visible_details:[])].filter(Boolean).join(" ").toLowerCase();
 const ssdVest=look.type==="vest"||(/\bvest\b/.test(lookText)&&/\b(ssd|ups|delivery|work)\b/.test(lookText));
 if(ssdVest)look.schedule.ssd=true;
 w.items.push(look);w.items=w.items.slice(-100);w.activeItemId=id;
 if(ssdVest||schedule.ssd)w.ssdItemId=id;
 return look;
}
function reviewWardrobeBatch(candidates,status){
 const cards=candidates.map((x,i)=>{
  let preview="";try{preview=URL.createObjectURL(x.file)}catch(_){ }
  x.preview=preview;
  const a=x.analysis||{},description=a.summary||[a.style,a.silhouette,a.pattern,a.material_appearance,...(a.visible_details||[])].filter(Boolean).join(" · ")||"No style analysis yet. Add a short description if you want.";
  return '<article class="aw-review-card"><div class="aw-review-photo">'+(preview?'<img src="'+preview+'" alt="Selected clothing photo '+(i+1)+'">':'<span>👗</span>')+'</div><div class="aw-review-fields"><label>Closet label<input id="awName'+i+'" maxlength="80" value="'+esc(x.name)+'"></label><label>Item type<select id="awType'+i+'">'+[["outfit","Complete outfit"],["vest","Work vest / outerwear"],["top","Top"],["bottom","Bottom"],["shoes","Shoes"],["accessory","Accessory"]].map(([v,l])=>'<option value="'+v+'" '+(x.type===v?"selected":"")+'>'+l+'</option>').join("")+'</select></label><label>Style and visible details<textarea id="awDescription'+i+'" rows="2" maxlength="360">'+esc(description)+'</textarea></label><div class="aw-review-colors"><label>Main color<input id="awColor'+i+'" type="color" value="'+safeColor(x.colors.primary)+'"></label><label>Accent color<input id="awAccent'+i+'" type="color" value="'+safeColor(x.colors.accent)+'"></label></div><div class="aw-review-schedule"><label>Wear it<select id="awDaypart'+i+'"><option value="any">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label><label>Season<select id="awSeason'+i+'"><option value="any">Any season</option><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select></label><label class="aw-ssd-check"><input id="awSsd'+i+'" type="checkbox"> SSD route</label></div></div></article>';
 }).join("");
 let saved=false;
 modal("Review your wardrobe photos",'<p class="aw-review-intro">Your originals are saved in Photo Inbox. Describe the visible layers. A vest labeled SSD/UPS or marked Work vest becomes your automatic SSD look; it will wear only during the route hours.</p><p id="awReviewError" class="aw-review-error" role="alert"></p><div class="aw-review-list">'+cards+'</div>',"Save to wardrobe",async()=>{
  const button=document.getElementById("saveModal");if(button){button.disabled=true;button.textContent="Saving…"}
  const closet=wardrobe(),previousItems=closet?.items.slice()||[],previousActive=closet?.activeItemId||"";
  candidates.forEach((x,i)=>{
   const description=String(document.getElementById("awDescription"+i)?.value||"").trim();
   const analysis=x.analysis?{...x.analysis,summary:description}:description?{summary:description}:null;
   const schedule={daypart:document.getElementById("awDaypart"+i)?.value||"any",season:document.getElementById("awSeason"+i)?.value||"any",ssd:!!document.getElementById("awSsd"+i)?.checked};
   x.name=String(document.getElementById("awName"+i)?.value||"Clothing photo").trim()||"Clothing photo";
   x.type=String(document.getElementById("awType"+i)?.value||x.type);
   x.colors={primary:safeColor(document.getElementById("awColor"+i)?.value),accent:safeColor(document.getElementById("awAccent"+i)?.value)};
   addLook(x.name,x.colors,{...x.source,type:x.type},analysis,schedule);
  });
  try{if(typeof window.save==="function")await window.save()}catch(error){if(closet){closet.items=previousItems;closet.activeItemId=previousActive}const message=document.getElementById("awReviewError");if(message)message.textContent="The closet could not be saved. Please try again. "+String(error?.message||"");if(button){button.disabled=false;button.textContent="Save to wardrobe"}return}
  saved=true;
  candidates.forEach(x=>{if(x.preview)URL.revokeObjectURL(x.preview)});
  closeModal();paintAvatar();
  if(status)status.textContent="✓ Saved "+candidates.length+" reviewed closet item"+(candidates.length===1?".":"s.")+" Scheduled looks appear on the avatar when their day, season, or SSD rule matches.";
 });
}
function selectedFiles(){
 return [...Array.from(document.getElementById("piCamera")?.files||[]),...Array.from(document.getElementById("piFiles")?.files||[])];
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function makeStyleImage(file){
 const bmp=await createImageBitmap(file);
 try{
  const scale=Math.min(1,768/Math.max(bmp.width,bmp.height)),canvas=document.createElement("canvas");
  canvas.width=Math.max(64,Math.round(bmp.width*scale));canvas.height=Math.max(64,Math.round(bmp.height*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Could not prepare this picture for the free generator.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
  const imageData=canvas.toDataURL("image/webp",.76);
  if(!imageData.startsWith("data:image/webp;base64,")||imageData.length>2400000)throw Error("This picture is too large to send to the free generator.");
  return{imageData,width:canvas.width,height:canvas.height};
 }finally{bmp.close?.()}
}
async function generateStyledCopy(file,status,index,total){
 const image=await makeStyleImage(file);
 if(status)status.textContent="✓ Originals saved. Sending picture "+index+" of "+total+" to the free cartoon generator…";
 const started=await cloudClient.functions.invoke("avatar-ai",{body:{action:"stylize_start",imageData:image.imageData,width:image.width,height:image.height}});
 if(started.error||started.data?.error)throw Error(started.data?.message||started.data?.error||"The free cartoon generator could not start.");
 const requestId=started.data?.requestId;if(!requestId)throw Error("The free cartoon generator did not return a request ID.");
 const deadline=Date.now()+8*60*1000;let finalImage="";
 while(Date.now()<deadline){
  await wait(5000);
  const progress=await cloudClient.functions.invoke("avatar-ai",{body:{action:"stylize_status",requestId}});
  if(progress.error||progress.data?.error)throw Error(progress.data?.message||progress.data?.error||"The free cartoon generator could not finish this picture.");
  if(progress.data?.state==="done"){finalImage=String(progress.data.imageData||"");break}
  if(status){const place=Number(progress.data?.queuePosition)||0,eta=Number(progress.data?.waitTime)||0;status.textContent="Free cartoon generator: "+(progress.data?.state==="processing"?"drawing your picture…":"waiting for a volunteer GPU" )+(place?" · queue spot "+place:"")+(eta>0?" · about "+Math.max(1,Math.ceil(eta/60))+" min":"")+" ("+index+" of "+total+")"}
 }
 if(!finalImage)throw Error("The volunteer generator is still busy. Your original is saved; try this picture again later.");
 const blob=await(await fetch(finalImage)).blob(),bmp=await createImageBitmap(blob);
 try{
  const canvas=document.createElement("canvas");canvas.width=bmp.width;canvas.height=bmp.height;
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Could not prepare the generated picture to save.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0);
  const saved=canvas.toDataURL("image/jpeg",.82);if(saved.length>2600000)throw Error("The generated picture is too large to save in the photo inbox.");
  return{image_data:saved,width:canvas.width,height:canvas.height};
 }finally{bmp.close?.()}
}
async function uploadStyleCopies(files,title){
 const userId=String(cloudUser()?.id||""),status=document.getElementById("photoInboxStatus");let saved=0,failed=[];
 for(let i=0;i<files.length;i++){
  const file=files[i],name=(title&&files.length===1?title:String(file.name||"Picture").replace(/\.[^.]+$/,"" )).slice(0,88)||"Picture";
  try{
   const generated=await generateStyledCopy(file,status,i+1,files.length);
   const {error}=await cloudClient.from("photo_inbox").insert({owner_user_id:userId,category:"inventory",title:"🎨 "+name+" · cartoon style",notes:"Free Equestria Girls-inspired illustration copy. Original photo remains saved in the inbox.",floor_label:"",status:"new",area_id:null,phase:"reference",image_mime:"image/jpeg",...generated});
   if(error)throw Error(error.message||"Generated picture could not be saved.");saved++;
  }catch(error){failed.push(String(error?.message||"Generation failed"))}
 }
 if(typeof window.photoInboxLoadList==="function")try{await window.photoInboxLoadList(false)}catch(_){ }
 if(status)status.textContent=saved===files.length?"✓ "+saved+" cartoon-style cop"+(saved===1?"y":"ies")+" saved with the originals.":saved?"✓ "+saved+" cartoon-style cop"+(saved===1?"y":"ies")+" saved. "+failed.length+" could not finish; originals are still saved. "+failed[0]:"Originals are saved. The free generator could not finish: "+(failed[0]||"try again later.");
}
function decorateInbox(){
 const select=document.getElementById("piMode");if(!select)return;
 if(!select.querySelector('option[value="wardrobe"]'))select.insertAdjacentHTML("beforeend",'<option value="wardrobe">👗 Avatar outfit / wardrobe</option>');
 if(!select.querySelector('option[value="style"]'))select.insertAdjacentHTML("beforeend",'<option value="style">🎨 Make a cartoon copy</option>');
 let typeSelect=document.getElementById("piWardrobeType");
 if(!typeSelect){const label=document.createElement("label");label.id="piWardrobeTypeLabel";label.innerHTML='What are you adding?<select id="piWardrobeType"><option value="outfit">Complete outfit</option><option value="vest">Work vest / outerwear</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="shoes">Shoes</option><option value="accessory">Accessory</option></select>';select.closest("label")?.insertAdjacentElement("afterend",label);typeSelect=document.getElementById("piWardrobeType")}
 let tip=document.getElementById("piWardrobeTip");
 if(!tip){tip=document.createElement("p");tip.id="piWardrobeTip";tip.className="pi-muted pi-wardrobe-tip";tip.setAttribute("aria-live","polite");select.closest("label")?.insertAdjacentElement("afterend",tip)}
 const syncTip=()=>{const style=select.value==="style",wardrobeMode=select.value==="wardrobe";if(tip)tip.hidden=!style&&!wardrobeMode;if(tip)tip.textContent=style?"Each selected photo is sent to a free community AI generator, then a cartoon copy is saved beside the original. Queue times vary. Volunteer workers handle the source image; anonymous requests may be shared to improve image models.":wardrobe()?.aiConnected?"The connected free Google model will identify garment style and visible details, then save a cartoon wardrobe look.":"Colors are sampled on-device. Connect free photo analysis on the Life Map to identify garment style and details; only wardrobe photos are sent to Google.";const label=document.getElementById("piWardrobeTypeLabel");if(label)label.hidden=!wardrobeMode;const button=document.getElementById("piStyleUpload");if(button)button.hidden=style};
 select.addEventListener("change",syncTip);syncTip();
 let styleButton=document.getElementById("piStyleUpload");
 if(!styleButton){styleButton=document.createElement("button");styleButton.id="piStyleUpload";styleButton.type="button";styleButton.className="btn small";styleButton.textContent="🎨 Upload and make a cartoon copy";const submitButton=document.querySelector(".pi-submit");if(submitButton)submitButton.insertAdjacentElement("afterend",styleButton);}
 styleButton.hidden=select.value==="style";
 if(styleButton&&!styleButton.dataset.bound){styleButton.dataset.bound="1";styleButton.addEventListener("click",()=>{select.value="style";select.dispatchEvent(new Event("change"));window.photoInboxSubmit()})}
}
const open=window.openPhotoInbox;
if(typeof open==="function")window.openPhotoInbox=function(mode){open.apply(this,arguments);decorateInbox();if(mode==="wardrobe"||mode==="style"){const select=document.getElementById("piMode");if(select){select.value=mode;select.dispatchEvent(new Event("change"))}const details=document.querySelector(".pi-form-optional");if(details)details.open=true;const title=document.getElementById("piTitle");if(title&&!title.value)title.value=mode==="wardrobe"?"Avatar outfit":"";}};
const submit=window.photoInboxSubmit;
if(typeof submit==="function")window.photoInboxSubmit=async function(){
 const select=document.getElementById("piMode");if(select?.value==="style"){
  const files=selectedFiles();if(!files.length){select.value="inventory";return submit.apply(this,arguments)}
  const title=String(document.getElementById("piTitle")?.value||"").trim();select.value="inventory";
  await submit.apply(this,arguments);
  const status=document.getElementById("photoInboxStatus");if(status&&/^✓/.test(status.textContent||""))await uploadStyleCopies(files,title);
  return;
 }
 if(select?.value!=="wardrobe")return submit.apply(this,arguments);
 const files=selectedFiles();
 if(!files.length)return submit.apply(this,arguments);
 const title=String(document.getElementById("piTitle")?.value||"").trim(),type=String(document.getElementById("piWardrobeType")?.value||"outfit"),outfitLabel=title.replace(/^avatar outfit\s*[·—:-]?\s*/i,"").trim();
 const candidates=[];
 for(const file of files){let colors;try{colors=await sampleOutfit(file)}catch(_){colors={primary:"#b78772",accent:"#e6c7a7"}}
  const base=outfitLabel&&outfitLabel!=="Saved look"?outfitLabel:String(file.name||"Outfit photo").replace(/\.[^.]+$/,"" );
  candidates.push({file,name:(files.length>1?base+" · "+String(file.name||"Look").replace(/\.[^.]+$/," "):base)||"Clothing photo",colors,type,source:{label:"Local color sample · "+new Date().toLocaleDateString(),type},analysis:null});
 }
 if(select)select.value="inventory";
 const field=document.getElementById("piTitle");if(field)field.value=outfitLabel?"Avatar outfit · "+outfitLabel:"";
 await submit.apply(this,arguments);
 const status=document.getElementById("photoInboxStatus");
 if(status&&/^✓/.test(status.textContent||"")){
  let analyzed=0,analysisError="";
  if(wardrobe()?.aiConnected){
   for(let i=0;i<candidates.length;i++){
    status.textContent="✓ Photos saved. Analyzing clothing style "+(i+1)+" of "+candidates.length+"…";
    try{
     candidates[i].analysis=await analyzeClothing(candidates[i].file);
     if(candidates[i].analysis){
      analyzed++;
      const primary=candidates[i].analysis.primary_color,accent=candidates[i].analysis.accent_color;
      if(/^#[0-9a-f]{6}$/i.test(primary||""))candidates[i].colors.primary=primary;
      if(/^#[0-9a-f]{6}$/i.test(accent||""))candidates[i].colors.accent=accent;
     }
    }catch(error){analysisError=String(error?.message||error)}
   }
  }
  status.textContent=analyzed?"✓ Free style analysis finished. Review the details and schedule before saving to your closet.":analysisError?"✓ Photos are safe in Photo Inbox. Review the color-based entries and add details if you want. Analysis issue: "+analysisError:!wardrobe()?.aiConnected?"✓ Photos are safe in Photo Inbox. Review the color-based entries and add details if you want.":"✓ Photos are safe in Photo Inbox. Review the closet details before saving.";
  reviewWardrobeBatch(candidates,status);
 }
};
document.addEventListener("change",e=>{if(e.target&&e.target.id==="piMode"&&e.target.value==="wardrobe"){const title=document.getElementById("piTitle");if(title&&!title.value)title.value="Avatar outfit"}});
})();


/* Family visual closet: uses confirmed household clothing and private inbox photos. */
(function(){
 "use strict";
 const people=["Michelle","Leo","Demitri","Dolly","Ambrose"];
 const categories=[["all","Everything"],["top","Tops"],["bottom","Bottoms"],["dress","Dresses"],["layer","Layers"],["shoes","Shoes"],["sleep","Sleepwear"],["other","Other"]];
 let wearer="Michelle",filter="all";
 let selected=new Set();
 let visibleItems=[];
 const escValue=v=>typeof window.esc==="function"?window.esc(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const safeArg=v=>String(v??"").replace(/[^a-zA-Z0-9_-]/g,"");
 function itemOwner(x){return String(x?.wardrobeOwner||x?.inventoryOwner||"")}
 function kind(x){
  const t=String(x?.wardrobeType||"").toLowerCase(),n=String(x?.name||"").toLowerCase();
  if(t==="long_sleeve"||t==="short_sleeve"||/\b(top|shirt|blouse|tee|t-shirt)\b/.test(n))return"top";
  if(t==="pants"||/\b(pants|jeans|shorts|leggings|skirt)\b/.test(n))return"bottom";
  if(/\b(dress|romper|jumpsuit)\b/.test(n)||t==="dress")return"dress";
  if(t==="hoodie_jacket"||t==="winter_coat"||/\b(hoodie|jacket|coat|cardigan|sweater|vest)\b/.test(n))return"layer";
  if(/\b(shoes|boots|sneakers|sandals|slippers)\b/.test(n)||t==="shoes")return"shoes";
  if(t==="pajamas"||/\b(pajama|pyjama|sleepwear)\b/.test(n))return"sleep";
  if(/\b(accessory|hat|scarf|belt|bag|jewelry)\b/.test(n)||t==="accessory")return"other";
  return"other";
 }
 function owned(person){
  if(person==="Michelle")window.ensurePersonalWardrobePieces?.();
  return (Array.isArray(state.inventoryItems)?state.inventoryItems:[]).filter(x=>
   String(x?.category||"").trim().toLowerCase()==="clothing"&&itemOwner(x)===person&&
   !["Gone","Donate / sell"].includes(String(x?.status||""))&&
   !["donate","sell","recycle"].includes(String(x?.organizingDecision||""))
  ).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
 }
 function icon(k){return({top:"👚",bottom:"👖",dress:"👗",layer:"🧥",shoes:"👟",sleep:"🌙",other:"✨"})[k]||"✨"}
 function savedLooks(){state.settings=state.settings||{};if(!Array.isArray(state.settings.familyClosetLooks))state.settings.familyClosetLooks=[];return state.settings.familyClosetLooks}
 function photoHtml(x){
  const value=typeof window.inventoryItemPhotoHtml==="function"?window.inventoryItemPhotoHtml(x):"";
  if(!value && x.avatarGarment==="black-pants")return window.blackPantsIllustration;
  if(!value && x.avatarGarment==="green-hoodie")return window.greenHoodieIllustration;
  return value||'<div class="fc-photo-fallback">'+icon(kind(x))+'</div>';
 }
 function selectedRows(){return owned(wearer).filter(x=>selected.has(String(x.id)))}
 function gapHtml(person){
  if(person==="Michelle"||typeof wardrobeCount!=="function"||!Array.isArray(WARDROBE_TYPES))return"";
  const gaps=WARDROBE_TYPES.map(t=>({label:t.label,missing:Math.max(0,Number(t.min)-Number(wardrobeCount(person,t)||0))})).filter(x=>x.missing>0);
  return '<div class="fc-gaps"><b>Wardrobe needs</b>'+(gaps.length?'<span>'+gaps.slice(0,3).map(x=>escValue(x.label)+': '+x.missing+' more').join(' · ')+'</span>':'<span>Current clothing minimums are met.</span>')+'<small>Based on the existing clothing counts in Daily Life.</small></div>';
 }
 function render(){
  const root=document.getElementById("familyClosetBody");if(!root)return;
  const all=owned(wearer);
  visibleItems=filter==="all"?all:all.filter(x=>kind(x)===filter);
  const active=selectedRows();
  const looks=savedLooks().filter(x=>x.person===wearer).slice(-8).reverse();
  const filters=categories.map(([id,label])=>'<button type="button" class="'+(filter===id?"fc-filter fc-filter-on":"fc-filter")+'" aria-pressed="'+(filter===id)+'" onclick="familyClosetFilter(\''+id+'\')">'+label+'</button>').join("");
  const cards=visibleItems.map(x=>{
   const id=safeArg(x.id),on=selected.has(String(x.id));
   return '<div class="fc-piece-with-care"><button type="button" class="'+(on?"fc-piece fc-piece-on":"fc-piece")+'" aria-pressed="'+on+'" onclick="familyClosetToggle(\''+id+'\')">'+
    '<div class="fc-piece-photo">'+photoHtml(x)+'</div><b>'+escValue(x.name||"Clothing item")+'</b>'+
    '<small>'+escValue(categories.find(c=>c[0]===kind(x))?.[1]||"Other")+' · ×'+Math.max(1,Number(x.quantity||1))+'</small>'+
    (x.status==="Low"||x.status==="Need"?'<em>Needs more</em>':"")+'</button>'+window.wardrobeWearControls("inventory:"+x.id,false)+'</div>';
  }).join("");
  const preview=active.length?active.map(x=>'<div class="fc-look-piece"><span class="fc-look-thumb">'+photoHtml(x)+'</span><span><b>'+escValue(x.name||"Clothing item")+'</b><small>'+escValue(categories.find(c=>c[0]===kind(x))?.[1]||"Other")+'</small></span></div>').join(""):'<p class="fc-empty-look">Tap pieces above to build a look.</p>';
  const saved=looks.length?'<div class="fc-saved-looks">'+looks.map(x=>'<button type="button" onclick="familyClosetLoad(\''+safeArg(x.id)+'\')"><b>'+escValue(x.name||"Saved look")+'</b><small>'+escValue(x.date||"")+' · '+(x.itemIds||[]).length+' pieces</small></button>').join("")+'</div>':'<p class="fc-muted">Saved looks will show here.</p>';
  root.innerHTML=
   '<div class="fc-people">'+people.map(p=>'<button type="button" class="'+(wearer===p?"fc-person fc-person-on":"fc-person")+'" aria-pressed="'+(wearer===p)+'" onclick="familyClosetPerson(\''+p+'\')">'+escValue(p)+'</button>').join("")+'</div>'+
   '<p class="fc-intro">A Clueless-style closet built from confirmed clothing in your household inventory. Photos stay in your private photo inbox.</p>'+
   gapHtml(wearer)+
   '<div class="fc-filter-row">'+filters+'</div>'+
   (visibleItems.length?'<div class="fc-grid">'+cards+'</div>':'<div class="fc-empty"><span>🪞</span><b>'+escValue(wearer)+'’s visual closet is ready for clothes.</b><small>Capture clothing photos, review them, and assign each piece to '+escValue(wearer)+' to see it here.</small><button type="button" class="btn primary" onclick="closeModal();openPhotoInbox(\'inventory\')">📷 Add clothing photos</button><button type="button" class="btn" onclick="closeModal();openInventoryItem(\'\',\''+wearer+'\',\'short_sleeve\')">＋ Add a clothing item</button></div>')+
   '<section class="fc-look"><div class="fc-look-head"><div><span class="fc-kicker">OUTFIT MIXER</span><b>Your selected look</b></div><span>'+active.length+' piece'+(active.length===1?"":"s")+'</span></div>'+
   '<div class="fc-look-pieces">'+preview+'</div>'+

   '<div class="fc-actions"><button type="button" class="btn primary" '+(!active.length?"disabled":"")+' onclick="familyClosetSave()">Save this look</button><button type="button" class="btn" onclick="familyClosetClear()">Clear selection</button><button type="button" class="btn" onclick="closeModal();openInventoryPhotoReview()">Review clothing photos</button></div></section>'+
   '<section class="fc-looks"><b>Saved looks for '+escValue(wearer)+'</b>'+saved+'</section>';
  if(typeof window.inventoryLoadSavedItemPhotos==="function")Promise.resolve().then(()=>window.inventoryLoadSavedItemPhotos());
 }
 window.refreshFamilyClosetWear=render;
 window.familyClosetPerson=function(person){if(!people.includes(person))return;wearer=person;filter="all";selected.clear();render()};
 window.familyClosetFilter=function(value){if(!categories.some(c=>c[0]===value))return;filter=value;render()};
 window.familyClosetToggle=function(id){if(!id)return;selected.has(id)?selected.delete(id):selected.add(id);render()};
 window.familyClosetClear=function(){selected.clear();render()};
 window.familyClosetSave=async function(){
  const rows=selectedRows();if(!rows.length)return;
  const items=owned(wearer),itemIds=items.filter(x=>selected.has(String(x.id))).map(x=>String(x.id));
  const list=savedLooks(),date=typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
  list.push({id:"look-"+Date.now().toString(36),person:wearer,name:"Look "+(list.filter(x=>x.person===wearer).length+1),date,itemIds});
  try{await save();selected.clear();render()}
  catch(e){alert("This look could not be saved. Your clothing inventory is unchanged.")}
 };
 window.familyClosetLoad=function(id){const look=savedLooks().find(x=>x.id===id&&x.person===wearer);if(!look)return;selected=new Set((look.itemIds||[]).map(String));filter="all";render()};
 window.openFamilyCloset=function(person){
  wearer=people.includes(person)?person:"Michelle";filter="all";selected.clear();
  modal("The Clueless Closet",'<div id="familyClosetBody"></div>',"Close",closeModal);render();
 };
 const baseProgress=window.openWardrobeProgress;
 if(typeof baseProgress==="function")window.openWardrobeProgress=function(person){
  baseProgress(person);
  const box=document.querySelector("#modal .wardrobe-count-list");
  if(box&&!box.parentElement.querySelector(".fc-open-link")){
   const button=document.createElement("button");button.type="button";button.className="btn primary fc-open-link";button.textContent="🪞 Open visual closet";
   button.onclick=()=>{closeModal();window.openFamilyCloset(person)};
   box.insertAdjacentElement("afterend",button);
  }
 };
 const baseAdd=window.openInventoryItem;
 if(typeof baseAdd==="function")window.openInventoryItem=function(id,person,type){
  baseAdd(id,person,type);
  Promise.resolve().then(()=>{
   const select=document.getElementById("invWardrobeType");if(!select)return;
   [["dress","Dress"],["skirt","Skirt"],["shorts","Shorts"],["leggings","Leggings"],["shoes","Shoes"],["accessory","Accessory"]].forEach(([value,label])=>{
    if(!select.querySelector('option[value="'+value+'"]'))select.insertAdjacentHTML("beforeend",'<option value="'+value+'">'+label+'</option>');
   });
   if(type&&["dress","skirt","shorts","leggings","shoes","accessory"].includes(type))select.value=type;
  });
 };
})();
