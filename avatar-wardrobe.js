/* Free photo styling, garment analysis, and schedule-aware cartoon wardrobe. */
(function(){
"use strict";
const safeColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||""))?String(v):"#d7c6ee";
const esc=v=>typeof window.esc==="function"?window.esc(String(v||"")):String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function wardrobe(){
 if(typeof state==="undefined")return null;
 state.settings=state.settings||{};
 state.settings.avatarWardrobe=state.settings.avatarWardrobe||{items:[],activeItemId:"",ssdItemId:""};
 const w=state.settings.avatarWardrobe;
 if(!Array.isArray(w.items))w.items=Array.isArray(w.looks)?w.looks.map(x=>({...x,type:x.type||"outfit"})):[];
 return w;
}
function isSsdDay(){
 const date=typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10),s=typeof state==="undefined"?{}:state;
 const words=/\bssd\b|seasonal support driver|seasonal helper|delivery route|helper vest/i;
 return (s.workShifts||[]).some(x=>x&&x.date===date&&(Number(x.ssdHours)>0||Number(x.ssdMiles)>0||words.test(String(x.notes||"")+" "+String(x.payCode||""))))||
  (s.tasks||[]).some(x=>x&&x.date===date&&words.test(String(x.title||"")+" "+String(x.notes||"")))||
  (s.events||[]).some(x=>x&&String(x.date||x.startDate||"").slice(0,10)===date&&words.test(String(x.title||"")+" "+String(x.notes||"")));
}
function currentDaypart(){const h=new Date().getHours();return h>=4&&h<12?"morning":h>=12&&h<17?"afternoon":"evening"}
function currentSeason(){const m=new Date().getMonth()+1;return m===12||m<=2?"winter":m<=5?"spring":m<=8?"summer":"fall"}
function hasSchedule(s){return !!s&&(s.ssd||s.daypart&&s.daypart!=="any"||s.season&&s.season!=="any")}
function scheduleMatches(item){const s=item?.schedule||{};return (!s.ssd||isSsdDay())&&(!s.daypart||s.daypart==="any"||s.daypart===currentDaypart())&&(!s.season||s.season==="any"||s.season===currentSeason())}
function active(){
 const w=wardrobe();if(!w)return null;
 const ssdLook=isSsdDay()&&w.ssdItemId?w.items.find(x=>x.id===w.ssdItemId):null;
 const scheduled=[...w.items].reverse().find(x=>hasSchedule(x.schedule)&&scheduleMatches(x));
 const look=ssdLook||scheduled||w.items.find(x=>x.id===w.activeItemId)||w.items[w.items.length-1];
 return look?{id:look.id,name:look.name,type:look.type||"outfit",analysis:look.analysis||null,schedule:look.schedule||{},primary:safeColor(look.primary),accent:safeColor(look.accent),isScheduled:(isSsdDay()&&w.ssdItemId===look.id)||(hasSchedule(look.schedule)&&scheduleMatches(look))}:null;
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
 svg.style.setProperty("--lm-outfit-main",top);svg.style.setProperty("--lm-outfit-accent",bottom);
 svg.style.setProperty("--lm-outfit-shoe",look.type==="shoes"?look.primary:"#f7b9cd");
 svg.style.setProperty("--lm-outfit-accessory",look.type==="accessory"?look.primary:"#f5c2da");
 const card=document.querySelector(".lm-wardrobe-card");if(card&&typeof window.avatarWardrobePanelHtml==="function")card.outerHTML=window.avatarWardrobePanelHtml();
}
function scheduleLabel(s){if(!hasSchedule(s))return"Any time";return [s.ssd?"SSD route":"",s.daypart&&s.daypart!=="any"?s.daypart:"",s.season&&s.season!=="any"?s.season:""].filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" · ")}
window.avatarWardrobePanelHtml=function(){
 const w=wardrobe();if(!w)return "";
 const selected=active(),looks=w.items.slice(-6).reverse();
 const rows=looks.map(x=>'<div class="lm-wardrobe-look"><span class="lm-wardrobe-swatches"><i style="background:'+safeColor(x.primary)+'"></i><i style="background:'+safeColor(x.accent)+'"></i></span><span class="lm-wardrobe-name"><b>'+esc(x.name||"Clothing photo")+'</b><small>'+esc(x.type||"Complete outfit")+' · '+esc(scheduleLabel(x.schedule))+' · '+esc(analysisDescription(x))+'</small></span><button type="button" class="lm-mini-button" onclick="avatarWardrobeSetActive(\''+esc(x.id)+'\')">Wear</button><button type="button" class="lm-mini-button" onclick="avatarWardrobeAssignSSD(\''+esc(x.id)+'\')">SSD</button></div>').join("");
 return '<section class="lm-wardrobe-card"><div class="lm-wardrobe-head"><div><span class="lm-kicker">DIGITAL WARDROBE</span><b>'+(selected?esc(selected.name):"Start your digital closet")+'</b><small>'+(selected?.isScheduled?"Auto-selected for "+esc(scheduleLabel(selected.schedule))+".":"Save clothing pieces and outfits from photos.")+'</small></div><button type="button" class="lm-mini-button lm-upload-look" onclick="openAvatarWardrobeInbox()">＋ Add clothing</button></div>'+
 '<p class="lm-wardrobe-private">'+(w.aiConnected?'Free Google photo analysis is connected. Wardrobe photos are sent to Google for garment style details; the app uses no paid model.':'Connect free photo analysis for garment style, cut, and visible details. Its image model is free tier and may use submitted content to improve Google products.')+' The original stays in your private Photo Inbox.</p>'+
 (!w.aiConnected?'<button type="button" class="lm-mini-button lm-connect-ai" onclick="avatarWardrobeConnect()">Connect free photo analysis</button>':'')+
 (w.ssdItemId?'<div class="lm-wardrobe-rule">SSD schedule · '+esc((w.items.find(x=>x.id===w.ssdItemId)||{}).name||"saved outfit")+' <button type="button" class="lm-mini-button" onclick="avatarWardrobeClearSSD()">Clear</button></div>':'<div class="lm-wardrobe-rule">Save a vest or outfit, then tap <b>SSD</b> to use it when an SSD route is on today’s plan.</div>')+
 (rows?'<div class="lm-wardrobe-list">'+rows+'</div>':'<div class="lm-wardrobe-empty">Upload clothing pieces or a complete outfit. I’ll sample its main colors locally and draw a matching look on your cartoon avatar. Your face, hair, and body stay as they are.</div>')+'</section>';
};
function update(){if(typeof window.save==="function")window.save();if(typeof window.render==="function")window.render()}
window.avatarWardrobeSetActive=function(id){const w=wardrobe();if(!w||!w.items.some(x=>x.id===id))return;w.activeItemId=id;update()};
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
 w.items.push(look);w.items=w.items.slice(-100);w.activeItemId=id;return look;
}
function reviewWardrobeBatch(candidates,status){
 const cards=candidates.map((x,i)=>{
  let preview="";try{preview=URL.createObjectURL(x.file)}catch(_){ }
  x.preview=preview;
  const a=x.analysis||{},description=a.summary||[a.style,a.silhouette,a.pattern,a.material_appearance,...(a.visible_details||[])].filter(Boolean).join(" · ")||"No style analysis yet. Add a short description if you want.";
  return '<article class="aw-review-card"><div class="aw-review-photo">'+(preview?'<img src="'+preview+'" alt="Selected clothing photo '+(i+1)+'">':'<span>👗</span>')+'</div><div class="aw-review-fields"><label>Closet label<input id="awName'+i+'" maxlength="80" value="'+esc(x.name)+'"></label><label>Item type<select id="awType'+i+'">'+[["outfit","Complete outfit"],["vest","Work vest / outerwear"],["top","Top"],["bottom","Bottom"],["shoes","Shoes"],["accessory","Accessory"]].map(([v,l])=>'<option value="'+v+'" '+(x.type===v?"selected":"")+'>'+l+'</option>').join("")+'</select></label><label>Style and visible details<textarea id="awDescription'+i+'" rows="2" maxlength="360">'+esc(description)+'</textarea></label><div class="aw-review-colors"><label>Main color<input id="awColor'+i+'" type="color" value="'+safeColor(x.colors.primary)+'"></label><label>Accent color<input id="awAccent'+i+'" type="color" value="'+safeColor(x.colors.accent)+'"></label></div><div class="aw-review-schedule"><label>Wear it<select id="awDaypart'+i+'"><option value="any">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label><label>Season<select id="awSeason'+i+'"><option value="any">Any season</option><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select></label><label class="aw-ssd-check"><input id="awSsd'+i+'" type="checkbox"> SSD route</label></div></div></article>';
 }).join("");
 let saved=false;
 modal("Review your wardrobe photos",'<p class="aw-review-intro">Your originals are saved in Photo Inbox. Correct the labels and details, then choose when each item should show on your cartoon avatar.</p><p id="awReviewError" class="aw-review-error" role="alert"></p><div class="aw-review-list">'+cards+'</div>',"Save to wardrobe",async()=>{
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
