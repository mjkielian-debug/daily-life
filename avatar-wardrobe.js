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
 return look?{id:look.id,name:look.name,type:look.type||"outfit",primary:safeColor(look.primary),accent:safeColor(look.accent),isScheduled:isSsdDay()&&w.ssdItemId===look.id}:null;
}
window.avatarWardrobeGetActive=active;
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
 const rows=looks.map(x=>'<div class="lm-wardrobe-look"><span class="lm-wardrobe-swatches"><i style="background:'+safeColor(x.primary)+'"></i><i style="background:'+safeColor(x.accent)+'"></i></span><span class="lm-wardrobe-name"><b>'+esc(x.name||"Clothing photo")+'</b><small>'+esc(x.type||"Complete outfit")+' · '+esc(x.source||"Colors saved on this device")+'</small></span><button type="button" class="lm-mini-button" onclick="avatarWardrobeSetActive(\''+esc(x.id)+'\')">Wear</button><button type="button" class="lm-mini-button" onclick="avatarWardrobeAssignSSD(\''+esc(x.id)+'\')">SSD</button></div>').join("");
 return '<section class="lm-wardrobe-card"><div class="lm-wardrobe-head"><div><span class="lm-kicker">DIGITAL WARDROBE</span><b>'+(selected?esc(selected.name):"Start your digital closet")+'</b><small>'+(selected?.isScheduled?"Showing your saved SSD outfit today.":"Save clothing pieces and outfits from photos.")+'</small></div><button type="button" class="lm-mini-button lm-upload-look" onclick="openAvatarWardrobeInbox()">＋ Add clothing</button></div>'+
 '<p class="lm-wardrobe-private">Private by design: no image-analysis API, subscription, or paid service. The original stays in your private photo inbox. This first pass matches colors; the exact vest design can be tuned from its photo later.</p>'+
 (w.ssdItemId?'<div class="lm-wardrobe-rule">SSD schedule · '+esc((w.items.find(x=>x.id===w.ssdItemId)||{}).name||"saved outfit")+' <button type="button" class="lm-mini-button" onclick="avatarWardrobeClearSSD()">Clear</button></div>':'<div class="lm-wardrobe-rule">Save a vest or outfit, then tap <b>SSD</b> to use it when an SSD route is on today’s plan.</div>')+
 (rows?'<div class="lm-wardrobe-list">'+rows+'</div>':'<div class="lm-wardrobe-empty">Upload clothing pieces or a complete outfit. I’ll sample its main colors locally and draw a matching look on your cartoon avatar. Your face, hair, and body stay as they are.</div>')+'</section>';
};
function update(){if(typeof window.save==="function")window.save();if(typeof window.render==="function")window.render()}
window.avatarWardrobeSetActive=function(id){const w=wardrobe();if(!w||!w.items.some(x=>x.id===id))return;w.activeItemId=id;update()};
window.avatarWardrobeAssignSSD=function(id){const w=wardrobe();if(!w||!w.items.some(x=>x.id===id))return;w.ssdItemId=id;update()};
window.avatarWardrobeClearSSD=function(){const w=wardrobe();if(!w)return;w.ssdItemId="";update()};
window.openAvatarWardrobeInbox=function(){if(typeof window.openPhotoInbox==="function")window.openPhotoInbox("wardrobe")};

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
function addLook(name,colors,source){
 const w=wardrobe();if(!w)return;
 const id="item-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),look={id,name:String(name||"Clothing photo").slice(0,80),type:source.type||"outfit",primary:safeColor(colors.primary),accent:safeColor(colors.accent),source:source.label||"Local color sample",createdAt:new Date().toISOString()};
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
 const syncTip=()=>{if(tip)tip.hidden=select.value!=="wardrobe";if(tip)tip.textContent="Daily Life samples the clothing colors on this device and saves a wardrobe card. No image-analysis service or paid API is used.";const label=document.getElementById("piWardrobeTypeLabel");if(label)label.hidden=select.value!=="wardrobe"};
 select.addEventListener("change",syncTip);syncTip();
}
const open=window.openPhotoInbox;
if(typeof open==="function")window.openPhotoInbox=function(mode){open.apply(this,arguments);decorateInbox();if(mode==="wardrobe"){const select=document.getElementById("piMode");if(select){select.value="wardrobe";select.dispatchEvent(new Event("change"))}const details=document.querySelector(".pi-form-optional");if(details)details.open=true;const title=document.getElementById("piTitle");if(title&&!title.value)title.value="Avatar outfit";}};
const submit=window.photoInboxSubmit;
if(typeof submit==="function")window.photoInboxSubmit=async function(){
 const select=document.getElementById("piMode");if(select?.value!=="wardrobe")return submit.apply(this,arguments);
 const files=selectedFiles();
 if(!files.length)return submit.apply(this,arguments);
 const title=String(document.getElementById("piTitle")?.value||"").trim(),type=String(document.getElementById("piWardrobeType")?.value||"outfit");
 const candidates=[];
 for(const file of files){let colors;try{colors=await sampleOutfit(file)}catch(_){colors={primary:"#b78772",accent:"#e6c7a7"}}
  const base=title&&title!=="Avatar outfit"?title.replace(/^avatar outfit\s*[·:-]?\s*/i,""):String(file.name||"Outfit photo").replace(/\.[^.]+$/,"" );
  candidates.push({name:(files.length>1?base+" · "+String(file.name||"Look").replace(/\.[^.]+$/," "):base)||"Clothing photo",colors,type,source:{label:"Local color sample · "+new Date().toLocaleDateString(),type}});
 }
 if(select)select.value="inventory";
 const field=document.getElementById("piTitle");if(field)field.value="Avatar outfit · "+(title&&title!=="Avatar outfit"?title:"Saved look");
 await submit.apply(this,arguments);
 const status=document.getElementById("photoInboxStatus");
 if(status&&/^✓/.test(status.textContent||"")){
  candidates.forEach(x=>addLook(x.name,x.colors,x.source));
  if(typeof window.save==="function")await window.save();
  paintAvatar();
  status.textContent="✓ Outfit saved privately. Its colors were analyzed on this device and a matching cartoon look was generated. Use the SSD button on the Life Map to assign a schedule outfit.";
 }
};
document.addEventListener("change",e=>{if(e.target&&e.target.id==="piMode"&&e.target.value==="wardrobe"){const title=document.getElementById("piTitle");if(title&&!title.value)title.value="Avatar outfit"}});
})();
