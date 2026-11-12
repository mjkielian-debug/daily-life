/* Local, no-fee outfit color analysis and schedule-aware cartoon wardrobe. */
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
function active(){
 const w=wardrobe();if(!w)return null;
 const id=isSsdDay()&&w.ssdItemId?w.ssdItemId:w.activeItemId;
 const look=w.items.find(x=>x.id===id)||w.items[w.items.length-1];
 return look?{id:look.id,name:look.name,type:look.type||"outfit",analysis:look.analysis||null,primary:safeColor(look.primary),accent:safeColor(look.accent),isScheduled:isSsdDay()&&w.ssdItemId===look.id}:null;
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
window.avatarWardrobePanelHtml=function(){
 const w=wardrobe();if(!w)return "";
 const selected=active(),looks=w.items.slice(-6).reverse();
 const rows=looks.map(x=>'<div class="lm-wardrobe-look"><span class="lm-wardrobe-swatches"><i style="background:'+safeColor(x.primary)+'"></i><i style="background:'+safeColor(x.accent)+'"></i></span><span class="lm-wardrobe-name"><b>'+esc(x.name||"Clothing photo")+'</b><small>'+esc(x.type||"Complete outfit")+' · '+esc(analysisDescription(x))+'</small></span><button type="button" class="lm-mini-button" onclick="avatarWardrobeSetActive(\''+esc(x.id)+'\')">Wear</button><button type="button" class="lm-mini-button" onclick="avatarWardrobeAssignSSD(\''+esc(x.id)+'\')">SSD</button></div>').join("");
 return '<section class="lm-wardrobe-card"><div class="lm-wardrobe-head"><div><span class="lm-kicker">DIGITAL WARDROBE</span><b>'+(selected?esc(selected.name):"Start your digital closet")+'</b><small>'+(selected?.isScheduled?"Showing your saved SSD outfit today.":"Save clothing pieces and outfits from photos.")+'</small></div><button type="button" class="lm-mini-button lm-upload-look" onclick="openAvatarWardrobeInbox()">＋ Add clothing</button></div>'+
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
function addLook(name,colors,source,analysis=null){
 const w=wardrobe();if(!w)return;
 const id="item-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),look={id,name:String(name||"Clothing photo").slice(0,80),type:source.type||"outfit",primary:safeColor(colors.primary),accent:safeColor(colors.accent),analysis:analysis||null,source:source.label||"Local color sample",createdAt:new Date().toISOString()};
 w.items.push(look);w.items=w.items.slice(-100);w.activeItemId=id;return look;
}
function selectedFiles(){
 return [...Array.from(document.getElementById("piCamera")?.files||[]),...Array.from(document.getElementById("piFiles")?.files||[])];
}
function decorateInbox(){
 const select=document.getElementById("piMode");if(!select)return;
 if(!select.querySelector('option[value="wardrobe"]'))select.insertAdjacentHTML("beforeend",'<option value="wardrobe">👗 Avatar outfit / wardrobe</option>');
 let typeSelect=document.getElementById("piWardrobeType");
 if(!typeSelect){const label=document.createElement("label");label.id="piWardrobeTypeLabel";label.innerHTML='What are you adding?<select id="piWardrobeType"><option value="outfit">Complete outfit</option><option value="vest">Work vest / outerwear</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="shoes">Shoes</option><option value="accessory">Accessory</option></select>';select.closest("label")?.insertAdjacentElement("afterend",label);typeSelect=document.getElementById("piWardrobeType")}
 let tip=document.getElementById("piWardrobeTip");
 if(!tip){tip=document.createElement("p");tip.id="piWardrobeTip";tip.className="pi-muted pi-wardrobe-tip";tip.setAttribute("aria-live","polite");select.closest("label")?.insertAdjacentElement("afterend",tip)}
 const syncTip=()=>{if(tip)tip.hidden=select.value!=="wardrobe";if(tip)tip.textContent=wardrobe()?.aiConnected?"The connected free Google model will identify garment style and visible details, then save a cartoon wardrobe look.":"Colors are sampled on-device. Connect free photo analysis on the Life Map to identify garment style and details; only wardrobe photos are sent to Google.";const label=document.getElementById("piWardrobeTypeLabel");if(label)label.hidden=select.value!=="wardrobe"};
 select.addEventListener("change",syncTip);syncTip();
}
const open=window.openPhotoInbox;
if(typeof open==="function")window.openPhotoInbox=function(mode){open.apply(this,arguments);decorateInbox();if(mode==="wardrobe"){const select=document.getElementById("piMode");if(select){select.value="wardrobe";select.dispatchEvent(new Event("change"))}const details=document.querySelector(".pi-form-optional");if(details)details.open=true;const title=document.getElementById("piTitle");if(title&&!title.value)title.value="Avatar outfit";}};
const submit=window.photoInboxSubmit;
if(typeof submit==="function")window.photoInboxSubmit=async function(){
 const select=document.getElementById("piMode");if(select?.value!=="wardrobe")return submit.apply(this,arguments);
 const files=selectedFiles();
 if(!files.length)return submit.apply(this,arguments);
 const title=String(document.getElementById("piTitle")?.value||"").trim(),type=String(document.getElementById("piWardrobeType")?.value||"outfit"),outfitLabel=title.replace(/^avatar outfit\s*[·—:-]?\s*/i,"").trim();
 const candidates=[];
 for(const file of files){let colors;try{colors=await sampleOutfit(file)}catch(_){colors={primary:"#b78772",accent:"#e6c7a7"}}
  const base=outfitLabel&&outfitLabel!=="Saved look"?outfitLabel:String(file.name||"Outfit photo").replace(/\.[^.]+$/,"" );
  candidates.push({file,name:(files.length>1?base+" · "+String(file.name||"Look").replace(/\.[^.]+$/," "):base)||"Clothing photo",colors,type,source:{label:"Local color sample · "+new Date().toLocaleDateString(),type},analysis:null});
 }
 if(select)select.value="inventory";
 const field=document.getElementById("piTitle");if(field)field.value="Avatar outfit · "+(outfitLabel||"Saved look");
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
  candidates.forEach(x=>addLook(x.name,x.colors,x.source,x.analysis));
  if(typeof window.save==="function")await window.save();
  paintAvatar();
  status.textContent=analyzed?"✓ Closet item saved. The free analyzer identified its clothing style and visible details, and Daily Life used the result to build the cartoon look. Use SSD to assign it to SSD days.":analysisError?"✓ Colors-only closet item saved. Style analysis did not finish: "+analysisError:!wardrobe()?.aiConnected?"✓ Colors-only closet item saved. Connect free photo analysis on the Life Map to identify style, cut, pattern, and garment details.":"✓ Closet item saved with its photo colors.";
 }
};
document.addEventListener("change",e=>{if(e.target&&e.target.id==="piMode"&&e.target.value==="wardrobe"){const title=document.getElementById("piTitle");if(title&&!title.value)title.value="Avatar outfit"}});
})();
