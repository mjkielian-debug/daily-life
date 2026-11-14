/* Private Daily Life house map.
   Personal names, layout, landmarks and photo IDs come from owner-only Supabase records,
   not from this public source file. No measured geometry is inferred. */
(function(){
"use strict";
const floors=["Basement","First floor","Second floor","Third floor"];
const cache=new Map(),pending=new Map();
try{if(localStorage.getItem("dailyLifeIllustratedMapVersion")!=="1"){localStorage.setItem("dailyLifeMapBrowseRooms","1");localStorage.setItem("dailyLifeIllustratedMapVersion","1")}}catch(_){}
const personPhotoCache=new Map();
const str=x=>String(x??"");
const h=x=>str(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const okId=x=>/^[a-z][a-z0-9_]{0,39}$/.test(str(x));
const okPhoto=x=>/^[a-f0-9-]{36}$/i.test(str(x));
const okPath=x=>/^[MLHVZCSQTAmlhvzcsqta0-9.,\s-]{1,800}$/.test(str(x));
const color=x=>/^#[0-9a-f]{6}$/i.test(str(x))?x:"#d5dce9";
const arr=x=>Array.isArray(x)?x:[];
function who(){try{return typeof cloudUser==="function"?cloudUser():null}catch(e){return null}}
function online(){return typeof cloudClient!=="undefined"&&!!cloudClient&&!!who()}
function key(f){return who()?.id+"|"+f}
function get(f){return cache.get(key(f))}
function where(f){return Array.from(document.querySelectorAll(".hvm-root[data-floor]")).filter(e=>e.dataset.floor===f)}
function act(f,z){
 const label=str(z.id)+" "+str(z.name)+" "+str(z.short);
 const destination=floors.includes(z.linkedFloor)?z.linkedFloor:
  (f==="First floor"&&(z.id==="stairs_up"||/stairs?\s*(up|to second)|upstairs/i.test(label)))?"Second floor":
  (f==="First floor"&&(z.id==="basement_stairs"||/basement|stairs?\s*down/i.test(label)))?"Basement":
  (f==="Second floor"&&(z.id==="stairs_to_third"||/third floor|michelle|stairs?\s*up/i.test(label)))?"Third floor":
  (f==="Second floor"&&(z.id==="stairs"||/first floor|downstairs|main stairs/i.test(label)))?"First floor":"";
 return destination?"houseVisualFollowLink('"+destination+"')":"houseVisualOpenZone('"+f+"','"+z.id+"')";
}
function facts(m){
 const b=arr(m.verified),n=arr(m.pending);
 return '<details class="hvm-facts"><summary>Confirmed details + what remains</summary><div class="hvm-fact-split">'+
 '<div><b>✓ Confirmed</b>'+b.map(t=>'<p>'+h(t)+'</p>').join("")+'</div>'+
 '<div><b>○ To verify</b>'+n.map(t=>'<p>'+h(t)+'</p>').join("")+'</div></div></details>';
}


function zoneBounds(path){
 const tokens=str(path).match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g)||[];
 let i=0,command="",x=0,y=0,startX=0,startY=0;
 const xs=[],ys=[],point=()=>{xs.push(x);ys.push(y)};
 while(i<tokens.length){
  if(/^[a-zA-Z]$/.test(tokens[i]))command=tokens[i++];
  if(!/^[MLHVZmlhvz]$/.test(command))return null;
  const relative=command===command.toLowerCase(),kind=command.toUpperCase();
  if(kind==="Z"){x=startX;y=startY;point();command="";continue}
  const count=(kind==="M"||kind==="L")?2:1;
  if(i+count>tokens.length||tokens.slice(i,i+count).some(t=>/^[a-zA-Z]$/.test(t)))return null;
  const values=tokens.slice(i,i+count).map(Number);i+=count;
  if(kind==="M"||kind==="L"){x=values[0]+(relative?x:0);y=values[1]+(relative?y:0)}
  else if(kind==="H")x=values[0]+(relative?x:0);
  else y=values[0]+(relative?y:0);
  if(kind==="M"){startX=x;startY=y;command=relative?"l":"L"}
  point();
 }
 if(xs.length<2)return null;
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return {x:minX,y:minY,width:maxX-minX,height:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
}
function previewSource(f,z){
 if(f!=="Second floor"||z.id!=="dolly"||typeof window.dollyRoomMapPreviewSvg!=="function")return null;
 const match=window.dollyRoomMapPreviewSvg().match(/<svg\b[^>]*viewBox=["']([^"']+)["'][^>]*>([\s\S]*?)<\/svg>/i);
 if(!match)return null;
 // The saved Dolly plan supplies furniture positions. The floor-zone path is
 // the room boundary, so drop the miniature's duplicate floor and wall frame.
 const markup=match[2]
  .replace(/<rect x="0" y="0" width="300" height="260" fill="#f8f0e8" stroke="#ad8ba9" stroke-width="5"\/>/,"")
  .replace(/<path d="M0 0H300V260H0Z" fill="none" stroke="#7f667d" stroke-width="7"\/>/,"")
  .replace(/<text x="180" y="18"[^>]*>Vanity window<\/text>/,"")
  .replace(/<text x="10" y="70"[^>]*>Footboard window<\/text>/,"")
  .replace(/<text x="291" y="189"[^>]*>Entry<\/text>/,"")
  .replace(/<text x="60" y="18"[^>]*>Mario poster<\/text>/,"");
 return {viewBox:match[1],markup,kind:"dolly"};
}
function inlineRoomPreview(f,z,bounds){
 const source=previewSource(f,z);
 if(!source||!bounds||bounds.width<48||bounds.height<48)return "";
 const view=String(source.viewBox||"").split(/\s+/).map(Number);
 if(view.length!==4||view[2]<=0||view[3]<=0)return "";
 const maxW=bounds.width*.99,maxH=bounds.height*.96;
 const scale=Math.min(maxW/view[2],maxH/view[3]);
 if(!Number.isFinite(scale)||scale<.16)return "";
 const width=view[2]*scale,height=view[3]*scale;
 const x=bounds.cx-width/2,y=bounds.cy-height/2;
 return '<svg class="hvm-inline-room-preview" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+width.toFixed(1)+'" height="'+height.toFixed(1)+'" viewBox="'+h(source.viewBox)+'" preserveAspectRatio="xMidYMid meet" aria-label="Dolly bedroom saved furniture layout" focusable="false" pointer-events="auto">'+source.markup+'</svg>';
}
function zoneFloorGraphic(f,z,bounds){
 if(!bounds)return "";
 const label=String(z.name||"")+" "+String(z.id||"");
 const firstUp=f==="First floor"&&z.id==="stairs_up";
 const basementDown=f==="First floor"&&z.id==="basement_stairs";
 const mainStairs=f==="Second floor"&&z.id==="stairs";
 const thirdStairs=f==="Second floor"&&z.id==="stairs_to_third";
 if(!firstUp&&!basementDown&&!mainStairs&&!thirdStairs)return "";
 if(!/stairs|landing/i.test(label))return "";
 if(firstUp){
  const centerX=bounds.x+bounds.width/2,centerY=bounds.y+bounds.height*.36;
  const width=Math.min(bounds.width*.82,52),height=Math.min(bounds.height*.34,28);
  const left=centerX-width/2,right=centerX+width/2,top=centerY-height/2,bottom=centerY+height/2;
  const count=6,step=width/(count-1),treads=Array.from({length:count},(_,i)=>{
   const x=left+i*step;
   return '<path d="M'+x.toFixed(1)+' '+top.toFixed(1)+'V'+bottom.toFixed(1)+'" stroke="#704e55" stroke-width="'+Math.max(2.6,Math.min(4,bounds.width*.055)).toFixed(1)+'" stroke-linecap="round"/>';
  }).join("");
  return '<g class="hvm-stair-plan hvm-stair-plan-up-pivoted" aria-label="Stairs to the second floor turned sideways between dining and living rooms" pointer-events="none">'+
   '<rect x="'+(left-5).toFixed(1)+'" y="'+(top-5).toFixed(1)+'" width="'+(width+10).toFixed(1)+'" height="'+(height+10).toFixed(1)+'" rx="6" fill="#c9a17b" stroke="#8c6a55" stroke-width="2"/>'+treads+'</g>';
 }
 const left=bounds.x+bounds.width*.19,right=bounds.x+bounds.width*.81;
 const topRatio=(firstUp||thirdStairs)?0.25:0.31;
 const top=bounds.y+bounds.height*topRatio;
 const bottom=bounds.y+bounds.height*0.77;
 const count=Math.max(4,Math.min(6,Math.round((bottom-top)/14)));
 const step=(bottom-top)/(count-1);
 const treads=Array.from({length:count},(_,i)=>{
  const y=top+i*step;
  return '<path d="M'+left.toFixed(1)+' '+y.toFixed(1)+'H'+right.toFixed(1)+'" stroke="#704e55" stroke-width="'+Math.max(2.6,Math.min(5,bounds.width*.045)).toFixed(1)+'" stroke-linecap="round"/>';
 }).join("");
 const rectFill=basementDown?"#f5dfab":"#c9a17b";
 return '<g class="hvm-stair-plan" aria-label="Stair treads inside the saved stair footprint" pointer-events="none">'+
  '<rect x="'+(left-5).toFixed(1)+'" y="'+(top-7).toFixed(1)+'" width="'+(right-left+10).toFixed(1)+'" height="'+(bottom-top+14).toFixed(1)+'" rx="6" fill="'+rectFill+'" stroke="#8c6a55" stroke-width="2"/>'+treads+'</g>';
}

function illustratedLayout(f,m){
 // Keep private vacuum-traced outlines whenever present. Fill gaps with the
 // floor relationships already confirmed by the user; these are illustrative
 // room blocks, never measured dimensions. This also avoids the old failure
 // mode where every room without a path sat on top of the same rectangle.
 const zones=arr(m.zones).filter(z=>okId(z.id));
 const norm=x=>str(x).toLowerCase().replace(/[^a-z0-9]/g,"");
 const describe=z=>norm(str(z.id)+" "+str(z.name)+" "+str(z.short));
 const paths=f==="First floor"?[
  {match:s=>/kitchen/.test(s),path:"M35 45H155V175H35Z",cx:95,cy:110},
  {match:s=>/bath/.test(s),path:"M155 45H245V135H155Z",cx:200,cy:90},
  {match:s=>/dining/.test(s),path:"M245 45H345V190H245Z",cx:295,cy:110},
  {match:s=>/play/.test(s),path:"M35 175H155V405H35Z",cx:95,cy:280},
  {match:s=>/living|lounge/.test(s),path:"M155 190H345V445H155Z",cx:250,cy:310},
  {match:s=>/basement|downstairs|stairsdown|basementstairs/.test(s),path:"M35 405H155V470H35Z",cx:95,cy:438},
  {match:s=>/stairsup|upstairs|staircase|stairs/.test(s),path:"M175 225H258V275H175Z",cx:216.5,cy:250}
 ]:f==="Second floor"?[
  {match:s=>/dolly/.test(s),path:"M245 48H345V170H245Z",cx:295,cy:108},
  {match:s=>/demitri|dimitri|tree/.test(s),path:"M245 170H345V300H245Z",cx:295,cy:230},
  {match:s=>/bath/.test(s),path:"M35 48H135V165H35Z",cx:85,cy:105},
  {match:s=>/ambrose/.test(s),path:"M35 165H135V285H35Z",cx:85,cy:222},
  {match:s=>/leo/.test(s),path:"M35 315H135V435H35Z",cx:85,cy:375},
  {match:s=>/hall/.test(s),path:"M135 48H245V435H135Z",cx:190,cy:242},
  {match:s=>/third|stairs_to_third|stair.*michelle|stairs$/.test(s),path:"M135 235H175V315H135Z",cx:155,cy:275},
  {match:s=>/first|stairs|landing/.test(s),path:"M165 435H255V475H165Z",cx:210,cy:455}
 ]:[];
 const vb=str(m.viewBox||"0 0 380 503").split(/\s+/).map(Number),sx=vb.length===4&&vb[2]>0?vb[2]/380:1,sy=vb.length===4&&vb[3]>0?vb[3]/503:1,
  ox=vb.length===4?vb[0]:0,oy=vb.length===4?vb[1]:0;
 const fit=path=>path.replace(/([MHV])(-?\d+(?:\.\d+)?)(?:\s+(-?\d+(?:\.\d+)?))?/g,(all,cmd,a,b)=>{
  const axis=cmd.toUpperCase();
  if(axis==="M")return cmd+(Number(a)*sx+ox).toFixed(1)+" "+(Number(b)*sy+oy).toFixed(1);
  return cmd+(Number(a)*(axis==="H"?sx:sy)+(axis==="H"?ox:oy)).toFixed(1);
 });
 const used=new Set();
 let mapped=zones.map(z=>{
  if(okPath(z.path))return z;
  const s=describe(z),candidate=paths.find((p,i)=>!used.has(i)&&p.match(s));
  if(!candidate)return z;
  used.add(paths.indexOf(candidate));
  return {...z,path:fit(candidate.path),cx:candidate.cx*sx+ox,cy:candidate.cy*sy+oy};
 });
 mapped=mapped.map(z=>{
  if(f==="First floor"&&(/basement|downstairs/i.test(str(z.id)+" "+str(z.name))))return {...z,linkedFloor:"Basement"};
  if(f==="First floor"&&/stairs|upstairs/i.test(str(z.id)+" "+str(z.name))&&z.id!=="basement_stairs")return {...z,linkedFloor:"Second floor"};
  if(f==="Second floor"&&/stairs|landing/i.test(str(z.id)+" "+str(z.name))&&!/first floor|downstairs|main stairs/i.test(str(z.name))){
   const hasKids=zones.some(q=>/ambrose/i.test(str(q.name)))&&zones.some(q=>/leo/i.test(str(q.name)));
   if(hasKids)return {...z,linkedFloor:"Third floor"};
  }
  if(f==="Second floor"&&/first floor|downstairs|main stairs/i.test(str(z.name)))return {...z,linkedFloor:"First floor"};
  return z;
 });
 if(f==="First floor"&&!mapped.some(z=>z.id==="stairs_up"||/stairs?\s*(up|to second)|upstairs/i.test(str(z.name)))){
  mapped.push({id:"stairs_up",name:"Stairs to second floor",short:"Upstairs",color:"#d9b690",linkedFloor:"Second floor",path:fit("M175 225H258V275H175Z"),cx:216.5*sx+ox,cy:250*sy+oy});
 }
 if(f==="Second floor"){
  if(!mapped.some(z=>z.linkedFloor==="First floor"||/first floor|downstairs|main stairs/i.test(str(z.name))||
    (z.id==="stairs"&&/stairs|landing/i.test(str(z.name)))))
   mapped.push({id:"stairs_to_first",name:"Stairs to first floor",short:"Downstairs",color:"#d9b690",linkedFloor:"First floor",path:fit("M165 435H255V475H165Z"),cx:210*sx+ox,cy:455*sy+oy});
  if(!mapped.some(z=>z.id==="stairs_to_third"||z.linkedFloor==="Third floor"||/third floor|michelle/i.test(str(z.name))))
   mapped.push({id:"stairs_to_third",name:"Stairs to third floor",short:"To third floor",color:"#d9b690",linkedFloor:"Third floor",path:fit("M135 235H175V315H135Z"),cx:155*sx+ox,cy:275*sy+oy});
 }
 if(f==="First floor"||f==="Second floor"){
  const hasTraced=zones.some(z=>okPath(z.path));
  return {...m,zones:mapped,kind:"schematic",viewBox:m.viewBox||"0 0 380 503",illustrative:!hasTraced,
   layoutNotice:hasTraced?
    "Saved vacuum-map outlines are shown where available. Untraced rooms use your confirmed room order and connections as a guide; their size and exact position are illustrative.":
    (f==="First floor"?
     "First-floor room order follows your saved layout: kitchen, bathroom, dining room, living room, playroom, and the basement stairs. The front door is along the living-room edge; the wide living-room/playroom opening and stair connections are shown schematically.":
     "Second-floor room order follows your saved hallway layout: Dolly’s room first on the right, then Demitri; Ambrose is next to Leo, with the third-floor stairs between them. The bathroom and main stair landing open from the hallway. Room sizes are illustrative.")};
 }
 if(f==="Third floor"){
  return {...m,kind:"schematic",viewBox:"0 0 380 503",illustrative:true,
   zones:zones.map(z=>{
    const entry=/entry|stair|landing/i.test(str(z.id)+" "+str(z.name));
    return {...z,path:entry?"M78 65H302V185H78Z":"M78 300H302V440H78Z",cx:190,cy:entry?125:370};
   }),
   layoutNotice:"Schematic connection only: entryway leads to the bedroom. The separate shapes do not show surveyed room size or exact placement."};
 }
 const stairs=zones.filter(z=>/stair|landing/i.test(str(z.name)+" "+str(z.id)));
 return {...m,kind:"schematic",viewBox:"0 0 380 503",illustrative:true,
  zones:zones.map(z=>okPath(z.path)?z:(stairs.includes(z)?{...z,path:"M110 78H270V195H110Z",cx:190,cy:136}:z)),
  layoutNotice:"Only the stair arrival is confirmed. The dashed area is unmapped; the stair symbol is diagrammatic and not a measured location."};
}

/* Photo-grounded fixtures are supplied by the owner's private floor-map record.
   Keep the names, positions and photos out of public source. */

/* Illustrated furniture is deliberately generic code: the authenticated map
   data determines which objects exist and where photo evidence places them. */
function lifelikeFurnitureSvg(k){
 switch(k){
  case "futon": return '<path d="M-16 -7Q-16 -15 -7 -14H8Q17 -14 16 -5V8H-16Z" fill="#77cad4" stroke="#547a95" stroke-width="1.7"/><rect x="-13" y="-2" width="26" height="12" rx="4" fill="#a5e3de" stroke="#568995"/><path d="M0 -11V8M-12 3H12M-11 11V15M11 11V15" stroke="#538c9a" stroke-width="1.7"/><path d="M-15 -17Q-11 -12 -8 -17M8 -17Q12 -12 15 -17" stroke="#eea5c8" stroke-width="3" fill="none"/><path d="M-9 1Q-5 -3 -1 2M3 1Q7 -3 11 2" stroke="#fff5fa" stroke-width="1.4" fill="none"/>';
  case "door_front": return '<rect x="-11" y="-17" width="22" height="34" rx="2" fill="#caa47d" stroke="#8d6470" stroke-width="1.7"/><rect x="-9" y="-15" width="18" height="30" rx="1" fill="#fffdf5"/><path d="M-6 -11H6V-2H-6ZM-6 2H6V11H-6Z" fill="#f7f1f8" stroke="#cbb8c2" stroke-width="1"/><circle cx="5" cy=".5" r="1.4" fill="#a77e51"/>';
  case "wood_opening":return '<path d="M-16 16V-16H16V16H12V-12H-12V16Z" fill="#be805b" stroke="#82595f" stroke-width="1.4"/><path d="M-11 -11H11V14H-11Z" fill="#e9d5e7"/><path d="M-13 -12H13M-13 -12V15M13 -12V15" stroke="#e6b486" stroke-width="2.8"/><path d="M-11 13H11" stroke="#f9d1a7" stroke-width="2"/>';
  case "tv_dresser":return '<rect x="-14" y="-17" width="22" height="19" rx="2" fill="#222a3a" stroke="#987f96" stroke-width="1.4"/><rect x="-11" y="-14" width="16" height="13" rx="1" fill="#526b87"/><path d="M-9 -11Q-1 -15 3 -6" stroke="#c1e5f8" stroke-width="1.2" fill="none"/><rect x="-15" y="4" width="22" height="13" rx="2" fill="#76534c" stroke="#b08172"/><path d="M-14 10H6M-5 5V16" stroke="#d2a58d" stroke-width="1.2"/><rect x="9" y="-11" width="7" height="27" rx="2" fill="#303247" stroke="#8e819f"/><circle cx="12.5" cy="-5" r="2.3" stroke="#fd8acb" stroke-width="1.5" fill="none"/><circle cx="12.5" cy="2" r="2.3" stroke="#75dae1" stroke-width="1.5" fill="none"/><circle cx="12.5" cy="9" r="2.3" stroke="#c9a0fe" stroke-width="1.5" fill="none"/>';
  case "dining_table":return '<rect x="-16" y="-16" width="13" height="17" rx="1" fill="#9e7559" stroke="#654b4c"/><path d="M-14 -10H-5M-14 -5H-5" stroke="#f3d7ac" stroke-width="1.3"/><ellipse cx="3" cy="3" rx="13" ry="9" fill="#b67d62" stroke="#795359" stroke-width="1.5"/><ellipse cx="3" cy="1" rx="10" ry="6.3" fill="#daab84"/><path d="M-6 -2H10V4H-6Z" fill="#f7f2e5" stroke="#c8a19e"/><path d="M-5 -1H9M-4 1H8" stroke="#b8c6c7" stroke-width="1"/><path d="M-7 9v6M13 9v6" stroke="#73574f" stroke-width="2"/>';
  case "coat_hooks":return '<path d="M-15 -12H15" stroke="#996b50" stroke-width="3" stroke-linecap="round"/><path d="M-9 -12v4M0 -12v4M9 -12v4" stroke="#b29b7a" stroke-width="2"/><path d="M-13 -8Q-15 -6 -16 8H-4Q-4 -6 -8 -8Z" fill="#c58bba" stroke="#84617f"/><path d="M-1 -8Q-7 0 -7 13H7Q7 0 1 -8Z" fill="#557f9f" stroke="#59718b"/><path d="M12 -8Q7 -7 8 7H17Q19 -6 14 -8Z" fill="#d19e70" stroke="#8d6d63"/><rect x="-3" y="5" width="6" height="7" rx="2" fill="#ebcb97"/>';
  case "pet_bowls":return '<ellipse cx="-8" cy="8" rx="9" ry="4" fill="#7ebecb" stroke="#5e8eab"/><path d="M-17 8Q-15 15 -8 15Q-1 15 1 8" fill="#9bd9d7" stroke="#5e8eab"/><ellipse cx="9" cy="8" rx="9" ry="4" fill="#a78cc0" stroke="#7d619a"/><path d="M0 8Q2 15 9 15Q16 15 18 8" fill="#ccaada" stroke="#7d619a"/><circle cx="-7" cy="7" r="1" fill="#f8ede3"/>';
  case "keyboard":return '<path d="M-16 0L14 -2L17 9L-14 11Z" fill="#33344b" stroke="#8a8592" stroke-width="1.5"/><path d="M-12 2L12 0M-11 5L13 3" stroke="#faf7f1" stroke-width="2.2" stroke-dasharray="2 1.5"/><path d="M-5 11L-12 17M4 11L12 17" stroke="#555266" stroke-width="1.8"/><path d="M12 -14V-2M7 -14H18M12 -14L15 -7" stroke="#aa7797" stroke-width="1.7"/>';
  case "mesh":return '<path d="M0 -16V-11" stroke="#8e7998" stroke-width="2"/><path d="M-12 -11L12 -11L9 15H-9Z" fill="#ffe4a0" stroke="#b99061" stroke-width="1.5"/><path d="M-8 -8L7 12M0 -9L10 3M8 -8L-7 12M0 -8L-10 3M-10 0L-2 12" stroke="#dbad62" stroke-width="1.1"/>';
  case "bed":return '<rect x="-15" y="-9" width="30" height="23" rx="3" fill="#bd9ac7" stroke="#846789" stroke-width="1.5"/><rect x="-12" y="-7" width="24" height="17" rx="3" fill="#d9cce6"/><rect x="-10" y="-6" width="8" height="7" rx="2" fill="#d4e9fa"/><rect x="2" y="-6" width="8" height="7" rx="2" fill="#d4e9fa"/><path d="M-13 5Q0 0 13 5V12H-13Z" fill="#e2c4bc"/><path d="M-13 12v5M13 12v5" stroke="#846789" stroke-width="2"/>';
  case "vanity":return '<rect x="-9" y="-17" width="19" height="17" rx="8" fill="#e8e6f1" stroke="#a17c94" stroke-width="2"/><path d="M-7 -14Q0 -19 8 -12" stroke="#fff" stroke-width="1.4" fill="none"/><rect x="-16" y="1" width="32" height="6" rx="2" fill="#e8c39e" stroke="#95746b"/><path d="M-12 7V17M12 7V17" stroke="#a27b69" stroke-width="2"/><rect x="-5" y="11" width="10" height="6" rx="2" fill="#d6a3bb" stroke="#96718b"/><circle cx="11" cy="-2" r="2" fill="#efcfa5"/>';
  case "dresser":return '<rect x="-13" y="-16" width="26" height="31" rx="3" fill="#cba882" stroke="#88685d" stroke-width="1.7"/><path d="M-11 -6H11M-11 4H11" stroke="#956e66" stroke-width="1.2"/><circle cx="0" cy="-11" r="1.5" fill="#fff0d4"/><circle cx="0" cy="-1" r="1.5" fill="#fff0d4"/><circle cx="0" cy="9" r="1.5" fill="#fff0d4"/>';
  case "tv":return '<rect x="-17" y="-12" width="34" height="21" rx="3" fill="#2c2b3c" stroke="#786b8a" stroke-width="1.6"/><rect x="-14" y="-9" width="28" height="15" rx="1.5" fill="#6f92b1"/><path d="M-11 -6Q0 1 12 -5" stroke="#c3c0e6" stroke-width="1.5" fill="none"/><path d="M0 9V14M-8 15H8" stroke="#786b8a" stroke-width="2"/>';
  case "robovac":return '<ellipse cy="5" rx="15" ry="9" fill="#3b3b47" stroke="#8f8592" stroke-width="2"/><ellipse cy="3" rx="10" ry="5" fill="#4e5260" stroke="#2f3138"/><circle cx="0" cy="2" r="2" fill="#afd5e2"/>';
  case "fan":return '<path d="M0 -10V16M-10 16H10" stroke="#555865" stroke-width="2.8" stroke-linecap="round"/><circle cy="-10" r="10" fill="#ebebf0" stroke="#737486" stroke-width="1.5"/><path d="M0 -10Q-11 -20 -5 -6Q-1 -8 0 -10M0 -10Q10 -17 7 -5Q3 -6 0 -10M0 -10Q-2 0 -10 -7Q-8 -11 0 -10" fill="#9599aa" stroke="#777d8c" stroke-width=".6"/><circle cy="-10" r="2.3" fill="#657380"/>';
  case "box_fan":return '<rect x="-14" y="-14" width="28" height="28" rx="3" fill="#f9f9f2" stroke="#969fac" stroke-width="1.6"/><circle r="10" fill="#e4ecf1" stroke="#aeb6c0"/><path d="M0 0Q-4 -10 -8 -4Q-6 1 0 0M0 0Q10 -4 4 -8Q-1 -6 0 0M0 0Q4 10 8 4Q6 -1 0 0M0 0Q-10 4 -4 8Q1 6 0 0" fill="#aebac8"/><circle r="2" fill="#7d8b9c"/>';
  case "book_shelf":return '<rect x="-14" y="-16" width="28" height="32" rx="2" fill="#a27b61" stroke="#795b60" stroke-width="1.5"/><path d="M-13 -5H13M-13 6H13" stroke="#674c53" stroke-width="1.5"/><path d="M-10 -13V-6M-6 -15V-6M-1 -12V-6M5 -15V-6M10 -10V-6M-9 -3V5M-4 -4V5M2 -2V5M8 -4V5" stroke="#a7c6df" stroke-width="3"/><rect x="-8" y="8" width="10" height="5" fill="#e9b68e"/>';
  case "beanbag":return '<path d="M-14 11Q-20 3 -7 -13Q-1 -21 7 -10Q19 5 13 13Q3 19 -10 15Z" fill="#4e4d5d" stroke="#8a778f" stroke-width="1.7"/><path d="M-8 -7Q0 -12 7 -1" stroke="#8c879c" stroke-width="2" fill="none"/>';
  case "chair":return '<path d="M-11 -13H11V5H-11Z" fill="#b28a6f" stroke="#7d6261" stroke-width="1.4"/><path d="M-13 6H13V10H-13Z" fill="#d0b098" stroke="#7d6261"/><path d="M-10 10V17M10 10V17" stroke="#7d6261" stroke-width="2"/>';
  default:return "";
 }
}

function fixtureSvg(kind){
 const k=str(kind).toLowerCase();
 const illustrated=lifelikeFurnitureSvg(k);if(illustrated)return illustrated;
 if(k==="stove")return '<rect x="-9" y="-8" width="18" height="17" rx="2" fill="#38354a"/>'+[-4,4].map(x=>[-3,5].map(y=>'<circle cx="'+x+'" cy="'+y+'" r="2.7" fill="#ffd2a5" stroke="#fff3eb" stroke-width=".65"/>').join("")).join("");
 if(k==="microwave")return '<rect x="-10" y="-7" width="20" height="14" rx="2" fill="#494154"/><rect x="-7" y="-4.5" width="12" height="9" rx="1" fill="#c1d6e4"/><circle cx="7.3" cy="-2" r="1.5" fill="#fdd8a1"/><circle cx="7.3" cy="2.4" r="1.5" fill="#fdd8a1"/>';
 if(k==="sink")return '<rect x="-11" y="-8" width="22" height="16" rx="2" fill="#bdcfdb" stroke="#7897ac" stroke-width=".7"/><rect x="-9" y="-6" width="8" height="12" rx="3" fill="#f8fbff"/><rect x="1" y="-6" width="8" height="12" rx="3" fill="#f8fbff"/><path d="M0 -11v5" stroke="#7196b4" stroke-width="2" stroke-linecap="round"/>';
 if(k==="dishwasher")return '<rect x="-9" y="-10" width="18" height="20" rx="2" fill="#f5ebf2" stroke="#aa819b"/><rect x="-6" y="-5" width="12" height="11" rx="3" fill="#b5deed"/><path d="M-5 -8h8" stroke="#9e7993" stroke-width="1.5"/>';
 if(k==="pantry"||k==="cabinet")return '<rect x="-10" y="-10" width="20" height="20" rx="2" fill="#c99677" stroke="#885e60"/><path d="M-9 -3h18M-9 4h18M0 -9v18" stroke="#fff1d0" stroke-width="1.5"/>';
 if(k==="fridge")return '<rect x="-9" y="-11" width="18" height="22" rx="2.5" fill="#444354" stroke="#b8a1b8" stroke-width="1.3"/><path d="M-9 -2h18M6 -8v4M6 2v6" stroke="#e8e1f1" stroke-width="1.5" stroke-linecap="round"/>';
 if(k==="door")return '<path d="M-8 10V-10H8V10" fill="#f9e5bd" stroke="#ac7e76" stroke-width="2"/><path d="M-7 8L8 -8" stroke="#cb9b8e" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="5" cy="1" r="1.7" fill="#8a6d8e"/>';
 if(k==="counter")return '<rect x="-11" y="-7" width="22" height="14" rx="3" fill="#efc7ac" stroke="#b88786" stroke-width="1"/><path d="M-8 1H8" stroke="#fff2db" stroke-width="2"/>';
 if(k==="coffee")return '<circle r="9" fill="#e7b2cf"/><path d="M-5 -5h9v9h-9zM4 -3h3q4 0 0 5H4" fill="#faf5ec" stroke="#836479" stroke-width="1.3"/>';
 if(k==="shelf")return '<path d="M-9 -9V9M9 -9V9M-9 -3H9M-9 4H9" stroke="#99717d" stroke-width="2"/><circle cx="-4" cy="-6" r="2" fill="#f0b891"/><rect x="2" y="0" width="4" height="4" rx="1" fill="#abd6c7"/>';
 return '<circle r="7" fill="#eed0e7" stroke="#a4759e"/><path d="M0 -5V5M-5 0H5" stroke="#fff" stroke-width="1.6"/>';
}
function mappedFurniture(f,z,bounds){
 if(!bounds||bounds.width<55||bounds.height<55)return "";
 return arr(z.markers).map((p,i)=>{
  const px=Number(p?.mapX),py=Number(p?.mapY);
  if(p?.showOnMap===false||p?.mapX==null||p?.mapY==null||!Number.isFinite(px)||!Number.isFinite(py)||px<4||px>96||py<4||py>96)return "";
  const x=bounds.x+bounds.width*px/100,y=bounds.y+bounds.height*py/100;
  const on="houseVisualInteractMarker(&#39;"+h(f)+"&#39;,&#39;"+h(z.id)+"&#39;,"+i+")";
  return '<g class="hvm-map-fixture" role="button" tabindex="0" aria-label="Open '+h(p.label||"mapped fixture")+'" onclick="event.stopPropagation();'+on+'" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();event.stopPropagation();'+on+'}" transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+')">'+
   '<title>'+h(p.label||"Mapped fixture")+'</title><rect x="-13" y="-14" width="26" height="28" rx="6" fill="#fff9f6" stroke="#b57fa1" stroke-width="1.35"/><g transform="scale(.72)">'+fixtureSvg(p.kind)+'</g></g>';
 }).join("");
}
function mappedRoomMiniature(f,z){
 const all=arr(z.markers).map((p,i)=>({p,i})).filter(({p})=>p&&str(p.label));
 if(!all.length)return "";
 const placed=all.filter(({p})=>p.showOnMap!==false&&p.mapX!=null&&p.mapY!=null&&Number.isFinite(Number(p.mapX))&&Number.isFinite(Number(p.mapY)));
 const unplaced=all.filter(({p})=>p.showOnMap===false||p.mapX==null||p.mapY==null||!Number.isFinite(Number(p.mapX))||!Number.isFinite(Number(p.mapY)));
 const picture=({p})=>'<svg viewBox="-19 -19 38 38" role="img" aria-label="'+h(p.label)+'"><g>'+fixtureSvg(p.kind)+'</g></svg>';
 const action=({p,i},isPositioned)=>{
  const position=isPositioned?' style="left:'+Math.max(9,Math.min(91,Number(p.mapX))).toFixed(1)+'%;top:'+Math.max(10,Math.min(90,Number(p.mapY))).toFixed(1)+'%"':'';
  return '<button type="button" class="'+(isPositioned?'hvm-mini-fixture':'hvm-mini-landmark')+'"'+position+' title="'+h(p.label)+'" aria-label="Inspect '+h(p.label)+'" onclick="houseVisualInteractMarker(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,'+i+')">'+picture({p})+'<small>'+h(str(p.short||p.label||"Item"))+'</small></button>';
 };
 const photoCount=arr(z.photos).filter(okPhoto).length;
 const showPhotos=photoCount?'<button class="btn small" type="button" onclick="houseVisualRevealRoomPhotos()">View '+photoCount+' saved reference photo'+(photoCount===1?'':'s')+' ›</button>':"";
 return '<section class="hvm-mini-room" aria-label="Interactive room fixtures"><header><strong>Explore this room</strong>'+showPhotos+'</header>'+
 (placed.length?'<div class="hvm-mini-room-canvas">'+placed.map(p=>action(p,true)).join("")+'</div>':"")+
 (unplaced.length?'<div class="hvm-mini-unplaced"><b>Known furniture · exact spot not mapped</b><div>'+unplaced.map(p=>action(p,false)).join("")+'</div></div>':"")+
 '<p class="muted small">From saved room photos and confirmed notes. Positions are approximate; unplaced items are listed separately.</p></section>';
}
window.houseVisualRevealRoomPhotos=function(){
 const panel=document.querySelector(".hvm-zone-detail .hvm-room-extra");
 if(panel)panel.open=true;
 const photos=document.getElementById("hvmRoomPhotoGallery");
 if(photos)photos.scrollIntoView({behavior:"smooth",block:"nearest"});
};
function roomSymbol(z,b,f){
 if(!b||b.width<75||b.height<70||/\bhall(?:way)?\b|\bstairs?\b|\blanding\b/i.test(str(z.name)))return "";
 const label=str(z.name),bed=/bed|bedroom/i.test(label),bath=/bath/i.test(label),kitchen=/kitchen/i.test(label);
 const symbol=bed?'<rect x="3" y="10" width="42" height="28" rx="5"/><rect x="7" y="13" width="14" height="10" rx="3"/><rect x="26" y="13" width="14" height="10" rx="3"/><path d="M3 27H45M6 38V42M42 38V42"/>':
 bath?(f==="First floor"?'<rect x="6" y="12" width="36" height="27" rx="3" fill="#c69b80" stroke="#95777b"/><rect x="5" y="10" width="38" height="8" rx="2" fill="#f4f0ef"/><ellipse cx="24" cy="13" rx="10" ry="3" fill="#c8dde8"/><path d="M24 12V6H30" fill="none" stroke="#7a96a2" stroke-width="2"/><path d="M23 18V38M9 18H39" stroke="#a47c70" stroke-width="1.3"/>':'<path d="M5 23H43L39 37H10Z"/><path d="M10 23V10Q10 3 18 7M13 38V42M35 38V42"/>'):
 kitchen?'<rect x="5" y="5" width="38" height="35" rx="4"/><circle cx="16" cy="15" r="5"/><circle cx="32" cy="15" r="5"/><path d="M10 27H38M13 33H35"/>':
 /dining/i.test(label)?'<ellipse cx="24" cy="23" rx="19" ry="12"/><path d="M12 34V42M36 34V42M13 7H35M13 40H35"/>':
 /play/i.test(label)?(f==="First floor"?'<rect x="4" y="18" width="40" height="14" rx="2" fill="#443f57"/><path d="M7 22H41M8 26H40" stroke="#f2e6ec" stroke-width="2" stroke-dasharray="4 2"/><path d="M14 32L8 43M34 32L40 43" stroke="#927084" stroke-width="2"/>':'<rect x="6" y="20" width="18" height="18" rx="3"/><path d="M28 11L43 37H15Z"/><circle cx="15" cy="11" r="7"/>'):
 '<path d="M5 22Q2 12 11 12H37Q46 12 43 22V36H5Z"/><path d="M10 36V41M38 36V41M7 25H41M24 13V25"/>';
 const scale=Math.min(1.05,b.width/110,b.height/115),x=b.cx-24*scale,y=b.cy-35*scale;
 const accent=bath?"#bcdded":kitchen?"#f6c29c":/dining/i.test(label)?"#e7b1ca":/play/i.test(label)?"#bcb5ef":"#c2b5e7";
 const rug='<ellipse cx="24" cy="30" rx="32" ry="23" fill="#fffaf7" fill-opacity=".65"/><ellipse cx="24" cy="30" rx="28" ry="19" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1"/>';
 return '<g class="hvm-room-symbol" style="--room-accent:'+accent+'" transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+scale.toFixed(2)+')" fill="'+accent+'" stroke="#80657b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9" pointer-events="none">'+rug+symbol+'</g>';
}


function houseCareFill(f){
 const today=typeof ymd==="function"?ymd():"",dates=typeof window.lifeMapProgressDates==="function"?window.lifeMapProgressDates():[today];
 const rows=typeof window.lifeMapHouseholdRows==="function"?dates.flatMap(d=>window.lifeMapHouseholdRows(d)):arr(state.tasks).filter(t=>dates.includes(t.date)&&!t.paused&&!t.duplicateHidden&&!t.waitingForFunds&&String(t.category||"").toLowerCase()==="home");
 const done=rows.filter(t=>t.done).length,pct=rows.length?done/rows.length:0,label=dates.length>1?"this week":"today";
 const clip="hvm-care-"+f.toLowerCase().replace(/[^a-z]/g,"");
 return '<button type="button" class="hvm-care-house" style="border:0;background:transparent;padding:4px;cursor:pointer" aria-label="Whole-house care: '+done+' of '+rows.length+' complete '+label+'" onclick="setView(&#39;lifearea-home&#39;)">'+
 '<svg width="54" height="54" viewBox="0 0 56 56" aria-hidden="true"><defs><clipPath id="'+clip+'"><path d="M4 24L28 4L52 24V53H4Z"/></clipPath></defs><path d="M4 24L28 4L52 24V53H4Z" fill="#fff8fb" stroke="#97758e" stroke-width="3"/><g clip-path="url(#'+clip+')"><rect x="2" y="'+(54-50*pct)+'" width="52" height="'+(50*pct)+'" fill="#9fd8bd"/></g><path d="M4 24L28 4L52 24M22 53V36H34V53" fill="none" stroke="#97758e" stroke-width="2.5"/></svg><span style="display:block;font-size:.8rem;color:#68516b">'+done+' of '+rows.length+' home tasks done '+label+'</span></button>';
}

function unmappedLocalRooms(f,m){
 const known=arr(m.zones).filter(z=>z&&okId(z.id)),mappedIds=new Set();
 known.forEach(z=>{const room=localRoom(f,z);if(room)mappedIds.add(str(room.id))});
 return arr(typeof state==="undefined"?[]:state.houseRooms).filter(room=>str(room.floor)===f&&str(room.name).trim()&&!mappedIds.has(str(room.id)));
}
window.houseVisualOpenLocalRoom=function(id){
 const room=arr(typeof state==="undefined"?[]:state.houseRooms).find(x=>str(x.id)===str(id));
 if(!room)return;
 if(typeof window.homeOpenRoomInventory==="function")window.homeOpenRoomInventory(room.id);
 else if(typeof window.openInventoryRoom==="function")window.openInventoryRoom(room.id,room.floor);
};
function unmappedRoomPicker(f,m){
 const rooms=unmappedLocalRooms(f,m);if(!rooms.length)return "";
 return '<section class="hvm-unmapped-rooms" aria-label="Rooms not yet placed on the floor drawing"><div><b>Other saved rooms</b><small>'+rooms.length+' room'+(rooms.length===1?" is":"s are")+' not placed on this drawing yet. Tap a room to open it, or add a map photo to update the layout.</small></div><div class="hvm-unmapped-chips">'+rooms.map(room=>'<button type="button" data-hvm-local-room="'+h(room.id)+'"><span aria-hidden="true">⌂</span>'+h(room.name)+' <span aria-hidden="true">›</span></button>').join("")+'<button type="button" class="hvm-unmapped-add" onclick="openPhotoInbox(&#39;house_map&#39;,&#39;&#39;,&#39;'+h(f)+'&#39;)">＋ Add map photo</button></div></section>';
}


function joinedFloorDisplay(m){
 // Presentation only: align close traced edges without rewriting private records.
 // One monotone mapping per axis preserves room order and cannot create overlaps.
 const zones=arr(m.zones),vb=str(m.viewBox||"0 0 380 503").split(/\s+/).map(Number);
 if(zones.some(z=>!/^\s*(?:M[-\d. ,]+(?:[LHV][-\d. ,]+)*Z)\s*$/.test(str(z.path))))return m;
 const xs=[],ys=[];
 const walk=(path,fx,fy)=>path.replace(/([MLHV])\s*(-?\d+(?:\.\d+)?)(?:[ ,]+(-?\d+(?:\.\d+)?))?/g,(all,c,a,b)=>{
  if(c==="M"||c==="L")return c+fx(+a)+" "+fy(+b);
  return c+(c==="H"?fx(+a):fy(+a));
 });
 zones.forEach(z=>walk(z.path,v=>{xs.push(v);return v},v=>{ys.push(v);return v}));
 const align=(values,tolerance)=>{
  let groups=[...new Set(values)].sort((a,b)=>a-b).map(v=>[v]);
  while(true){
   let at=-1,gap=Infinity;
   for(let i=0;i<groups.length-1;i++){
    const a=groups[i],b=groups[i+1],distance=b[0]-a[a.length-1];
    if(b[b.length-1]-a[0]<=tolerance&&distance<gap){gap=distance;at=i}
   }
   if(at<0)break;
   groups.splice(at,2,groups[at].concat(groups[at+1]));
  }
  const lookup=new Map();groups.forEach(g=>{const mid=(g[0]+g[g.length-1])/2;g.forEach(v=>lookup.set(v,mid))});
  return v=>lookup.get(v)??v;
 };
 const fx=align(xs,16*(vb[2]||380)/380),fy=align(ys,16*(vb[3]||503)/503);
 const clean=path=>{
  const points=[];let x=0,y=0;
  path.replace(/([MLHV])\s*(-?\d+(?:\.\d+)?)(?:[ ,]+(-?\d+(?:\.\d+)?))?/g,(all,c,a,b)=>{
   if(c==="M"||c==="L"){x=+a;y=+b}else if(c==="H")x=+a;else y=+a;
   if(!points.length||points[points.length-1][0]!==x||points[points.length-1][1]!==y)points.push([x,y]);
   return all;
  });
  let changed=true;
  while(changed&&points.length>3){changed=false;for(let i=0;i<points.length;i++){
   const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
   if((a[0]===b[0]&&b[0]===c[0])||(a[1]===b[1]&&b[1]===c[1])){points.splice(i,1);changed=true;break}
  }}
  return points.map((p,i)=>(i?"L":"M")+p.join(" ")).join("")+"Z";
 };
 const joined=zones.map(z=>({...z,path:clean(walk(z.path,fx,fy))}));
 if(joined.some(z=>{const b=zoneBounds(z.path);return !b||b.width<20||b.height<20}))return m;
 return {...m,zones:joined,layoutNotice:"Room edges are aligned for a connected schematic view. Saved source outlines are unchanged; sizes are illustrative."};
}

function mapSketch(f,m){
 m=illustratedLayout(f,m);
 if(f==="First floor")m=joinedFloorDisplay(m);
 const isFirst=f==="First floor",viewBox=/^\d+ \d+ \d+ \d+$/.test(str(m.viewBox||""))?m.viewBox:"0 0 380 503",limits=viewBox.split(" ").map(Number);
 const reviewRows=typeof dailyReviewExpected==="function"?dailyReviewExpected(ymd()).filter(item=>item.status==="unknown"):[];
 const paths=arr(m.zones).filter(z=>okId(z.id)&&okPath(z.path)).slice().sort((a,b)=>{
  const sa=/stairs|landing/i.test(str(a.name)+" "+str(a.id)),sb=/stairs|landing/i.test(str(b.name)+" "+str(b.id));
  return Number(sa)-Number(sb);
 }).map(z=>{
  const bounds=zoneBounds(z.path),x=Number(z.cx)||0,y=Number(z.cy)||0,onclick=act(f,z);
  const labelX=bounds?bounds.cx:Math.max(limits[0],Math.min(limits[0]+limits[2],x));
  const stairLabel=str(z.id)==="stairs_up"&&f==="First floor"?"← 2nd":
    str(z.id)==="basement_stairs"&&f==="First floor"?"↓ Basement":
    str(z.id)==="stairs"&&f==="Second floor"?"↓ 1st":
    str(z.id)==="stairs_to_third"&&f==="Second floor"?"↑ 3rd":"";
  const isStair=!!stairLabel||/\bstairs?\b|\blanding\b/i.test(str(z.name)+" "+str(z.id));
  const furniture=mappedFurniture(f,z,bounds);
  const hasSymbol=!furniture&&!!roomSymbol(z,bounds,f);
  const labelY=isStair&&bounds?
    (f==="First floor"?bounds.y+bounds.height-7:bounds.y+16):
    furniture&&bounds?bounds.y+bounds.height-8:
    hasSymbol?bounds.cy+24:Math.max(limits[1],Math.min(limits[1]+limits[3],y));
  const displayLabel=stairLabel|| (f==="First floor"&&/basement/i.test(str(z.id)+" "+str(z.name))?"Basement stairs":(z.short||z.name));
  const sourceColor=z.id==="dolly"&&f==="Second floor"?"#f8f0e8":color(z.color);
  const baseFill="#"+sourceColor.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.58+255*.42).toString(16).padStart(2,"0")).join("");
  const texture=/bath|kitchen/i.test(str(z.name))?"hvm-floor-tile":"hvm-floor-wood";
  const floorTexture=isStair?"":'<path d="'+h(z.path)+'" fill="url(#'+texture+')" pointer-events="none"/>';
  const organized=roomDeclutterSessions(f,z.id).length,room=localRoom(f,z),
    roomTasks=trackedRoomTasks(f,z,room).filter(t=>{const dates=typeof window.lifeMapProgressDates==="function"?window.lifeMapProgressDates():[ymd()];return !t.date||dates.includes(String(t.date))}),taskDone=roomTasks.filter(t=>t.done).length,
    taskTint=taskDone?Math.min(.38,.08+Math.log2(taskDone+1)*.09):0,
    declutterTint=organized?Math.min(.42,.08+Math.log2(organized+1)*.09):0,
    pendingReviewCount=reviewRows.filter(item=>roomTasks.some(task=>String(task.id)===String(item.key))).length;
  const taskOverlay=taskDone?'<path class="hvm-task-progress-wash" d="'+h(z.path)+'" fill="#9fd8bd" fill-opacity="'+taskTint.toFixed(2)+'" pointer-events="none"/>':"";
  const declutterOverlay=organized?'<path class="hvm-declutter-wash" d="'+h(z.path)+'" fill="#ef9fc2" fill-opacity="'+declutterTint.toFixed(2)+'" pointer-events="none"/>':"";
  const reviewBadge=pendingReviewCount&&bounds?'<g class="hvm-review-badge" pointer-events="none"><circle cx="'+(bounds.x+12).toFixed(1)+'" cy="'+(bounds.y+12).toFixed(1)+'" r="10" fill="#a9648d" stroke="#fff" stroke-width="2"/><text x="'+(bounds.x+12).toFixed(1)+'" y="'+(bounds.y+15).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">'+Math.min(pendingReviewCount,9)+(pendingReviewCount>9?"+":"")+'</text></g>':"";
  const declutterBadge=organized&&bounds&&bounds.width>38&&bounds.height>34?'<g class="hvm-map-declutter-badge" pointer-events="none"><rect x="'+(bounds.x+bounds.width-37).toFixed(1)+'" y="'+(bounds.y+3).toFixed(1)+'" width="34" height="17" rx="8" fill="#fff9fd" stroke="#d87fa9" stroke-width="1.5"/><text x="'+(bounds.x+bounds.width-20).toFixed(1)+'" y="'+(bounds.y+15).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="800" fill="#70425e">✦ '+organized+'</text></g>':"";
  const floorGraphic=zoneFloorGraphic(f,z,bounds);
  return '<g class="hvm-zone'+(isStair?' hvm-stair-zone':'')+'" role="button" tabindex="0" onclick="'+onclick+
   '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+onclick+'}" aria-label="Open '+h(displayLabel)+(organized?' · '+organized+' areas organized':'')+'">'+
   '<path d="'+h(z.path)+'" fill="'+baseFill+'" stroke="#64445a" stroke-width="2" stroke-linejoin="round"/>'+floorTexture+taskOverlay+declutterOverlay+
   floorGraphic+(furniture||roomSymbol(z,bounds,f))+reviewBadge+declutterBadge+'<text class="hvm-room-name" text-anchor="middle" x="'+labelX.toFixed(1)+'" y="'+labelY.toFixed(1)+'">'+h(displayLabel)+'</text></g>';
 }).join("");
 const pins=arr(m.annotations).filter(a=>a&&okId(a.id)&&Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.y))&&floors.includes(a.targetFloor)&&
  !arr(m.zones).some(z=>z&&z.linkedFloor===a.targetFloor&&/stairs|landing/i.test(str(z.name)+" "+str(z.id)))).map(a=>{
  const x=Number(a.x),y=Number(a.y),on="houseVisualFollowLink('"+a.targetFloor+"')";
  if(x<limits[0]||x>limits[0]+limits[2]||y<limits[1]||y>limits[1]+limits[3])return "";
  return '<g class="hvm-annotation" role="button" tabindex="0" aria-label="'+h(a.note||a.label||"Open linked floor")+'" onclick="'+on+
   '" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();'+on+'}">'+
   '<rect x="'+(x-39)+'" y="'+(y-15)+'" width="78" height="30" rx="14" fill="#fff9e8" stroke="#8053a7" stroke-width="2"/>'+
   '<text x="'+x+'" y="'+(y+5)+'" class="hvm-annotation-label" text-anchor="middle">'+h(a.label||"↑ next")+'</text></g>';
 }).join("");
 const frameX=limits[0]+16,frameY=limits[1]+9,frameW=Math.max(80,limits[2]-32),frameH=Math.max(100,limits[3]-18);
 const backing='<rect x="'+frameX+'" y="'+frameY+'" width="'+frameW+'" height="'+frameH+'" rx="18" fill="#fff9fd" stroke="#64445a" stroke-width="2.5"/>';
 const doorY=limits[1]+limits[3]-37,entry=isFirst?'<path d="M'+(limits[0]+limits[2]*.46)+' '+(doorY+13)+'v-13m0 13h'+(limits[2]*.12)+'" stroke="#64445a" stroke-width="3" stroke-linecap="round"/>'+
  '':"";
 return '<div class="hvm-sketch hvm-connected-map"><div class="hvm-sketch-heading">'+houseCareFill(f)+'<strong>⌂ '+h(f)+'</strong><span>Tap a room to open its details; photos stay inside the room.</span></div>'+
  '<svg class="hvm-drawing" viewBox="'+viewBox+'" role="group" aria-label="Illustrated house floor map with clickable pastel rooms.">'+
  '<defs><pattern id="hvm-floor-tile" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width=".7"/></pattern><pattern id="hvm-floor-wood" width="44" height="14" patternUnits="userSpaceOnUse"><path d="M0 14H44M22 0V14" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".6"/></pattern></defs>'+backing+(f==='Basement'?'<path d="M40 250H340V455H40Z" fill="#f7f0f8" stroke="#b79cb9" stroke-width="3" stroke-dasharray="8 8"/><text x="190" y="345" text-anchor="middle" fill="#725c78" font-size="17">Unmapped basement area</text>':'')+(f==="Third floor"?'<path d="M190 187V292 M182 282L190 294L198 282" fill="none" stroke="#96758d" stroke-width="4" stroke-dasharray="7 6" stroke-linecap="round" stroke-linejoin="round"/><text x="210" y="246" fill="#725c78" font-size="13">connection</text>':'')+paths+pins+entry+'</svg>'+(isFirst?'<div class="hvm-front-door-label">↓ Front door · street</div>':'')+
  '<details class="hvm-map-notes"><summary>About this map</summary><p class="hvm-disclaimer">'+h(m.layoutNotice||'Room outlines follow your saved vacuum map. Furniture symbols identify room types; they do not show exact furniture positions.')+'</p></details>'+unmappedRoomPicker(f,m)+floorLinks(f,m)+'</div>';
}
document.addEventListener("click",event=>{const button=event.target?.closest?.("[data-hvm-local-room]");if(button)window.houseVisualOpenLocalRoom(button.dataset.hvmLocalRoom)});

function floorLinks(f,m){
 const targets=[];
 if(f==="Basement")targets.push(["First floor","↑ First floor"]);
 if(f==="First floor"){targets.push(["Basement","↓ Basement"],["Second floor","↑ Second floor"])}
 if(f==="Second floor"){targets.push(["First floor","↓ First floor"],["Third floor","↑ Third floor"])}
 if(f==="Third floor")targets.push(["Second floor","↓ Second floor"]);
 return '<nav class="hvm-floor-links" aria-label="Stairs between floors">'+targets.map(([floor,label])=>'<button type="button" class="btn" onclick="houseVisualFollowLink(&#39;'+floor+'&#39;)">'+label+'</button>').join("")+'</nav>';
}

function directory(f,m){
 return '<div class="hvm-directory"><div class="hvm-directory-heading"><strong>'+h(f==='Second floor'?'Second floor rooms':(m.title||f))+'</strong><small>Tap a room to enter, then explore its mapped items. Use Previous and Next to tour the floor.</small></div>'+
 '<div class="hvm-directory-grid">'+arr(m.zones).filter(z=>okId(z.id)).map(z=>{
 const photos=arr(z.photos).filter(okPhoto),count=roomDeclutterSessions(f,z.id).length;
 const linked=trackedRoomTasks(f,z,localRoom(f,z));
 const declutterTasks=linked.filter(t=>/declutter|organis|sort|donat|outgrown|closet|dresser|storage/i.test(str(t.title)));
 const progressTasks=declutterTasks.length?declutterTasks:linked;
 const progressDone=progressTasks.filter(t=>t.done).length;
 const progressPct=progressTasks.length?Math.round(progressDone*100/progressTasks.length):Math.min(100,count*25);
 const tint=count?Math.min(.48,.1+Math.log2(count+1)*.1):0;
 const blooms=count?'<span class="hvm-declutter-sparks" aria-hidden="true">'+Array.from({length:Math.min(count,6)},()=>'<i>✦</i>').join("")+(count>6?'<b>+'+(count-6)+'</b>':'')+'</span>':'<span class="hvm-declutter-sparks is-empty" aria-hidden="true">✦</span>';
 const progressLabel=progressTasks.length?progressDone+' of '+progressTasks.length+' tasks complete':count?count+' organizing session'+(count===1?'':'s'):'No progress logged yet';
 const declutter='<span class="hvm-room-tile-declutter">'+blooms+'<small>'+h(progressLabel)+'</small></span>';
 return '<button type="button" class="hvm-room-tile hvm-photo-room-tile" data-room-id="'+h(z.id)+'" aria-label="Open '+h(z.name)+'; '+h(progressLabel)+'" style="--hvm-zone:'+color(z.color)+'" onclick="'+act(f,z)+'">'+
 '<span class="hvm-room-tile-photo" style="--hvm-organized-tint:'+tint.toFixed(2)+';--hvm-progress:'+progressPct+'%" data-room-photo-zone="'+h(z.id)+'" aria-hidden="true"><span class="hvm-room-progress-fill"></span><span class="hvm-tile-mark">⌂</span></span>'+
 '<b>'+h(z.name)+'</b>'+declutter+'<small>'+photos.length+' saved photo'+(photos.length===1?'':'s')+'</small>'+
 '<span class="hvm-tile-open">'+(z.id==="stairs_up"?"Go upstairs ›":z.id==="stairs_to_third"?"Go to third floor ›":"Enter room ›")+'</span></button>';
 }).join("")+'</div></div>';
}
async function hydrateRoomDirectoryPhotos(f,m){
 if(!online()||!m)return;
 const zones=arr(m.zones).filter(z=>okId(z.id));
 const refs=zones.map(z=>({zone:z,id:arr(z.photos).find(okPhoto)||null}));
 if(refs.some(x=>!x.id)){
  try{
   const {data}=await cloudClient.from("photo_inbox").select("id,title,notes,created_at")
    .in("category",["house_map","home_progress"]).eq("floor_label",f)
    .order("created_at",{ascending:false}).limit(100);
   const saved=data||[];
   for(const ref of refs){
    if(ref.id)continue;
    const name=str(ref.zone.name).trim().toLowerCase();
    let match=name?saved.find(p=>okPhoto(p.id)&&(str(p.title)+" "+str(p.notes)).toLowerCase().includes(name)):null;
    if(!match&&name.includes("bath"))match=saved.find(p=>okPhoto(p.id)&&/bath/i.test(str(p.title)+" "+str(p.notes)));
    ref.id=match?.id||null;
   }
  }catch(e){}
 }
 const ids=refs.map(x=>x.id).filter(Boolean);
 if(!ids.length)return;
 try{
  const {data}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",ids);
  for(const row of data||[]){
   if(!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(row.image_data||""))continue;
   const zone=refs.find(x=>x.id===row.id)?.zone;
   const host=zone&&Array.from(document.querySelectorAll("[data-room-photo-zone]")).find(node=>node.dataset.roomPhotoZone===String(zone.id));
   if(host){const img=document.createElement("img");img.alt="";img.src=row.image_data;host.replaceChildren(img);}
  }
 }catch(e){}
}
function connect(m){
 const c=arr(m.connections).filter(x=>x&&x.label&&x.from&&x.to);
 if(!c.length)return "";
 return '<section class="hvm-connections" aria-label="House connection routes"><strong>How these spaces connect</strong>'+
 c.map(x=>'<div class="hvm-connection"><b>'+h(x.label)+'</b>'+
 '<div class="hvm-route"><span class="hvm-route-end">⌂ '+h(x.from)+'</span>'+
 arr(x.via).map(v=>'<div class="hvm-route-step"><span class="hvm-step-rail" aria-hidden="true">↓</span><span>'+h(v)+'</span></div>').join("")+
 '<span class="hvm-route-end">⌂ '+h(x.to)+'</span></div>'+
 (x.status?'<p>'+h(x.status)+'</p>':"")+'</div>').join("")+'</section>';
}
function draw(f,m){
 const work=arr(m.flow).map(x=>'<div class="hvm-flow-line"><b>'+h(x.from)+'</b><span>→</span><b>'+h(x.to)+'</b>'+
 '<small>'+h(x.status)+'</small></div>').join("");
 const todo=arr(m.pending)[0];
 const original=okPhoto(m.sourcePhotoId)?'<button type="button" class="btn hvm-source-photo" onclick="photoInboxView(&#39;'+m.sourcePhotoId+'&#39;,&#39;map&#39;)">📷 Original robot map</button>':"";
 // Keep the clickable layout and tasks up front. Mapping caveats and stair
 // route evidence are supporting reference material, not the main screen.
 const references='<div class="hvm-technical-detail">'+
 (m.summary?'<p class="hvm-disclaimer">'+h(m.summary)+'</p>':"")+
 original+connect(m)+
 (work?'<section class="hvm-flow"><strong>↗ Where things went</strong>'+work+'</section>':"")+
 (todo?'<div class="hvm-next"><b>Next mapping step</b><p>'+h(todo)+'</p>'+
 '<button class="btn small" type="button" onclick="openPhotoInbox(&#39;house_map&#39;,&#39;&#39;,&#39;'+f+'&#39;)">+ Add room photos</button></div>':"")+
 facts(m)+'</div>';
 return '<div class="hvm-rendered">'+mapSketch(f,m)+
 '<details class="hvm-mapping-background"><summary>Mapping notes, stair connections and evidence ›</summary>'+
 references+'</details></div>';
}
function mappedRoomItems(room){
 if(!room)return [];
 const locIds=new Set(arr(state.inventoryLocations).filter(loc=>String(loc.roomId)===String(room.id)).map(loc=>String(loc.id)));
 return arr(state.inventoryItems).filter(x=>String(x.roomId)===String(room.id)||locIds.has(String(x.locationId)));
}
function roomDeclutterSessions(f,id){
 const key=String(f||"")+"::"+String(id||"");
 const entry=state.settings?.roomDeclutterProgress?.[key];
 return arr(entry?.sessions);
}
function roomInsightParts(tasks,f,id){
 const declutter=tasks.filter(t=>/declutter|organis|organize|sort|donat|outgrown|closet|dresser|storage/i.test(str(t.title)));
 const declutterDone=declutter.filter(t=>t.done).length;
 const isDate=value=>{const v=str(value);return v.length===10&&v[4]==="-"&&v[7]==="-"};
 const completed=tasks.filter(t=>t.done&&isDate(t.date)).sort((a,b)=>str(b.date).localeCompare(str(a.date)));
 const sessions=roomDeclutterSessions(f,id).filter(x=>isDate(x.date)).sort((a,b)=>str(b.date).localeCompare(str(a.date))||str(b.at).localeCompare(str(a.at)));
 const dateLabel=value=>isDate(value)?new Date(value+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"";
 const summary=[];
 if(sessions.length)summary.push(sessions.length+" room areas organized");
 if(declutter.length)summary.push(declutterDone+" of "+declutter.length+" saved declutter/organizing tasks done");
 return {
  declutter:summary.join(" · ")||"No room declutter progress logged yet",
  last:completed[0]?"Last room task marked done: "+str(completed[0].title||"Task")+" · "+dateLabel(completed[0].date):"No completed room task in saved history",
  lastOrganized:sessions[0]?"Last area organized: "+dateLabel(sessions[0].date):""
 };
}
window.houseVisualLogDeclutter=async function(f,id){
 if(!floors.includes(f)||!okId(id))return;
 if(!state.settings||typeof state.settings!=="object")state.settings={};
 if(!state.settings.roomDeclutterProgress||typeof state.settings.roomDeclutterProgress!=="object")state.settings.roomDeclutterProgress={};
 const key=String(f)+"::"+String(id),entry=state.settings.roomDeclutterProgress[key]||(state.settings.roomDeclutterProgress[key]={sessions:[]});
 if(!Array.isArray(entry.sessions))entry.sessions=[];
 entry.sessions.push({date:typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10),at:new Date().toISOString()});
 await save();
 if(typeof window.houseVisualOpenZone==="function")window.houseVisualOpenZone(f,id);
}
function mappedProgressCard(f,z,room){
 const tasks=trackedRoomTasks(f,z,room),done=tasks.filter(x=>x.done).length,percent=tasks.length?Math.round(100*done/tasks.length):null;
 const inventory=mappedRoomItems(room),insights=roomInsightParts(tasks,f,z?.id||"room:"+String(room?.id||""));
 const action=z?'houseVisualOpenZone(&#39;'+f+'&#39;,&#39;'+z.id+'&#39;)':
   'homeOpenRoomInventory(&#39;'+h(String(room.id||""))+'&#39;)';
 const title=z?z.name:room.name;
 const details='<button type="button" class="household-room-progress" onclick="'+action+'">'+
 '<span><b>'+h(title)+'</b><small>'+(tasks.length?done+' / '+tasks.length+' tasks complete':'No room tasks recorded')+'</small>'+
 '<small>'+h(insights.declutter)+'</small><small>'+h(insights.last)+'</small>'+
 (insights.lastOrganized?'<small>'+h(insights.lastOrganized)+'</small>':'')+
 '<small>'+inventory.length+' confirmed item type'+(inventory.length===1?"":"s")+'</small></span>'+
 '<span><b>'+(percent===null?'—':percent+'%')+'</b>'+
 '<i aria-hidden="true"><em style="width:'+(percent||0)+'%"></em></i></span></button>';
 const quick=z?'<button type="button" class="hvm-room-declutter-quick" onclick="houseVisualLogDeclutter(&#39;'+f+'&#39;,&#39;'+z.id+'&#39;)">＋ I organized one area</button>':'';
 return '<div class="hvm-room-progress-item">'+details+quick+'</div>';
}
function roomProgressHtml(f){
 const map=get(f),known=arr(map?.zones).filter(z=>z&&okId(z.id));
 const floorRooms=arr(state.houseRooms).filter(r=>str(r.floor)===f&&str(r.name).trim());
 const localUsed=new Set();
 const mapped=known.map(z=>{const room=localRoom(f,z);if(room)localUsed.add(str(room.id));return mappedProgressCard(f,z,room)});
 const localOnly=floorRooms.filter(r=>!localUsed.has(str(r.id))).map(room=>mappedProgressCard(f,null,room));
 const rows=mapped.concat(localOnly);
 if(rows.length)return '<div class="household-room-progress-grid">'+rows.join("")+'</div>'+
 '<p class="household-progress-disclaimer">Percentages count saved room tasks. Map color also reflects logged organization sessions; neither is an overall cleanliness score. Unrecorded work stays unknown.</p>';
 return '<p class="household-progress-empty">'+
 (online()&&!map?'Loading mapped rooms…':'No room tasks or inventory locations are linked to this floor yet. You can tap the diagram or add a room.')+
 '</p>';
}
function floorTrackedTasks(f){
 const map=get(f),known=arr(map?.zones).filter(z=>z&&okId(z.id));
 const floorRooms=arr(state.houseRooms).filter(r=>str(r.floor)===f&&str(r.name).trim());
 const localUsed=new Set(),groups=known.map(z=>{const room=localRoom(f,z);if(room)localUsed.add(str(room.id));return trackedRoomTasks(f,z,room)});
 for(const room of floorRooms)if(!localUsed.has(str(room.id)))groups.push(trackedRoomTasks(f,null,room));
 const byId=new Map();
 for(const task of groups.flat())if(task?.id)byId.set(String(task.id),task);
 return [...byId.values()];
}
window.houseVisualFloorProgressHtml=function(f){
 const tasks=floorTrackedTasks(f),done=tasks.filter(task=>task.done).length;
 const percent=tasks.length?Math.round(done*100/tasks.length):null;
 const status=tasks.length?done+" of "+tasks.length+" room tasks complete":"No room tasks logged yet";
 const progress=percent===null
  ? '<span class="household-map-floor-progress-state">Start tracking ›</span>'
  : '<span class="household-map-floor-progress-meter"><b>'+percent+'%</b><i role="progressbar" aria-label="Room tasks complete" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><em style="width:'+percent+'%"></em></i></span>';
 const label="Open "+h(f)+" room progress"+(tasks.length?": "+done+" of "+tasks.length+" tasks complete":": no room tasks logged yet");
 return '<button type="button" class="household-map-floor-progress" aria-label="'+h(label)+'" onclick="householdOpenRoomProgress()">'+
  '<span class="household-map-floor-progress-copy"><b>'+h(f)+' progress</b><small>'+status+'</small></span>'+progress+'<span aria-hidden="true">›</span></button>';
};
window.houseVisualRoomProgressHtml=function(f){return roomProgressHtml(f)};
function refreshRoomProgress(f){
 document.querySelectorAll(".household-map-room-results[data-floor]").forEach(el=>{
  if(el.dataset.floor===f)el.innerHTML=roomProgressHtml(f);
 });
}

function selectedRoomProfile(){
 if(typeof lifeSimRoster!=="function"||typeof lifeSimSelectedId!=="function")return null;
 const roster=lifeSimRoster(),id=lifeSimSelectedId(roster);
 const person=roster.find(person=>String(person.id)===String(id))||null;
 return person?{...person,isSelf:String(id)==="self"}:null;
}
function selfRoomPhotoHotspots(title){
 const t=str(title).toLowerCase();
 if(/entryway/.test(t))return [];
 if(/robovac and fans/.test(t))return [
  ["robovac","Robovac",52,82],["pedestal_fan","Black pedestal fan",55,43],["box_fan","White box fan",15,42]
 ];
 if(/room overview from the doorway/.test(t))return [
  ["bed","Bed",20,66],["dresser","Tall dresser",52,38],["tv_stand","TV / media console",83,61],["box_fan","White box fan",92,52]
 ];
 if(/tv and box fan side/.test(t))return [
  ["tv_stand","TV / media console",67,61],["box_fan","White box fan",83,38]
 ];
 if(/bed and vanity angle/.test(t))return [
  ["bed","Bed",12,50],["vanity","Vanity / dressing table",34,49]
 ];
 if(/bed beside the closet doorway/.test(t))return [
  ["closet_doorway","Closet doorway",19,43],["bed","Bed",70,65]
 ];
 if(/low shelves, shoes and dark side cabinet/.test(t))return [
  ["book_shelves","Low book shelves",31,56],["shoes","Shoes",61,56]
 ];
 if(/low shelves, books and decor/.test(t))return [
  ["book_shelves","Low book shelves",36,56],["decor","Display items",44,43]
 ];
 if(/tall dresser close-up/.test(t))return [
  ["dresser","Tall dresser",48,60],["dresser_top","Items on top",47,27]
 ];
 if(/vanity and stool/.test(t))return [
  ["vanity","Vanity / dressing table",52,58],["stool","Vanity stool",49,83],["vanity_items","Personal-care items",55,39]
 ];
 if(/vanity surface close-up/.test(t))return [
  ["vanity","Vanity / dressing table",48,73],["vanity_items","Personal-care items",53,36]
 ];
 /* bed and vanity angle is handled above with hotspots placed on the visible bed edge and vanity. */
 if(/bed and bedding/.test(t))return [["bed","Bed",51,55]];
 if(/bed beside the doorway/.test(t))return [
  ["bed","Bed",70,65],["bedroom_door","Bedroom doorway",20,31]
 ];
 if(/doorway and bed view/.test(t))return [
  ["bedroom_door","Bedroom doorway",33,41],["bed","Bed",73,69]
 ];
 return [];
}
function personRoomPhotoMarkup(photo,index,total,person,f,z){
 const storedTitle=str(photo.title),dresserOnly=/^dolly[’']s bedroom · dresser and bed$/i.test(storedTitle),
  title=dresserOnly?"Dolly’s bedroom · dresser":storedTitle,
  text=(title+" "+str(photo.notes)).toLowerCase(),isDolly=/^dolly$/i.test(str(person?.name));
 let hotspots=[];
 if(person?.isSelf&&f==="Third floor")hotspots=selfRoomPhotoHotspots(title);
 else if(isDolly){
  const dresserOnly=/^dolly[’']s bedroom · dresser$/i.test(title)||/dresser only/i.test(text);
  const kind=/room overview|room corner|bed, vanity/i.test(title)?"overview":/dresser and bed/i.test(title)?"dresser":/dresser/i.test(title)?"dresserOnly":/playhouse/i.test(title)?"playhouse":/vanity/i.test(title)?"vanity":/bed|headboard/i.test(title)?"bed":"overview";
  hotspots=dresserOnly||kind==="dresserOnly"?[["dresser","Dresser",18,52]]:
   kind==="overview"?[["bed","Bed",18,73],["vanity","Vanity",58,51],["dollhouse","Playhouse",75,66]]:
   kind==="dresser"?[["dresser","Dresser",18,52],["bed","Bed",70,56]]:
   kind==="playhouse"?[["dollhouse","Playhouse",54,54]]:
   kind==="vanity"?[["vanity","Vanity",52,58]]:[["bed","Bed",50,55]];
 }else if(/futon|sofa bed|couch/.test(text)){
  // A futon may be used for sleep, but it is still a futon in the room map.
  hotspots.push(["futon","Futon",55,37]);
 }else if(/chair/.test(text)){
  // “Chair under bed” describes where the chair sits; it does not make the chair photo a bed photo.
  hotspots.push(["chair","Chair + laundry",50,70]);
 }else{
  if(/dresser/.test(text))hotspots.push(["dresser","Dresser",22,58]);
  if(/vanity/.test(text))hotspots.push(["vanity","Vanity",62,48]);
  if(/bed|bedroom/.test(text))hotspots.push(["bed","Bed",55,58]);
 }
 const scene='<div class="hvm-room-scene"><img src="'+h(photo.image_data)+'" alt="'+h(title)+'">'+hotspots.map(([key,label,x,y])=>
  '<button type="button" class="hvm-room-hotspot" style="left:'+x+'%;top:'+y+'%" aria-label="Open '+h(person?.name||"room")+'’s '+h(label.toLowerCase())+' details" onclick="houseVisualInspectPersonItem(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,&#39;'+h(key)+'&#39;)"><span aria-hidden="true">✦</span><b>'+h(label)+'</b></button>'
 ).join("")+'</div>';
 return scene+'<div class="hvm-room-photo-nav"><button type="button" class="btn small" '+(index<=0?'disabled':'')+' onclick="houseVisualPersonPhotoStep(-1)">‹ Previous view</button><span><b>'+h(title)+'</b><small>View '+(index+1)+' of '+total+' · tap a room label to inspect</small></span><button type="button" class="btn small" '+(index>=total-1?'disabled':'')+' onclick="houseVisualPersonPhotoStep(1)">Next view ›</button></div>';
}
async function hydratePersonRoomPhotoTour(){
 const host=document.querySelector('[data-person-photo-tour]');
 if(!host||!online())return;
 const person=selectedRoomProfile(),floor=host.dataset.floor||"Second floor",zoneId=host.dataset.zone||"",z=zone(floor,zoneId);
 if(!person||!z)return;
 const cacheKey=str(person.id||person.name).toLowerCase()+"|"+floor+"|"+zoneId;
 let photos=personPhotoCache.get(cacheKey);
 if(!photos){
  try{
   const {data,error}=await cloudClient.from("photo_inbox").select("id,category,title,notes,phase,created_at")
    .in("category",["home_progress","house_map"]).eq("floor_label",floor)
    .order("created_at",{ascending:true}).limit(100);
   if(error)throw error;
   const normalize=value=>str(value).toLowerCase().replace(/[^a-z0-9]/g,"");
   const roster=typeof lifeSimRoster==="function"?lifeSimRoster():[];
   const zoneName=normalize(z.name),zoneOwner=roster.find(candidate=>{
    const candidateName=normalize(candidate.name);
    return candidateName&&zoneName.includes(candidateName);
   });
   const name=normalize(zoneOwner?.name||person.name),isSelf=!!person.isSelf&&floor==="Third floor";
   const selfZones=arr(get(floor)?.zones).filter(item=>item&&okId(item.id));
   const selfRoomIndex=selfZones.findIndex(item=>item.id===zoneId);
   const selfRows=(data||[]).filter(p=>okPhoto(p.id)&&["home_progress","house_map"].includes(p.category));
   const afterRows=isSelf?selfRows.filter(p=>p.phase==="after"):[];
   const sourceRows=isSelf&&afterRows.length?afterRows:selfRows.filter(p=>p.category==="home_progress");
   const rows=sourceRows.filter(p=>{
    if(!okPhoto(p.id))return false;
    const all=str(p.title)+" "+str(p.notes),normalized=normalize(all);
    if(isSelf){
     const entry=/entryway|beanbag/i.test(all);
     return selfRoomIndex===0?entry:!entry&&/bedroom|room overview|dresser|vanity|bed|robovac|fan|shelves/i.test(all)&&!/laundry/i.test(all);
    }
    if(p.category!=="home_progress")return false;
    if(name&&normalized.includes(name))return /bedroom|bed|room|chair/i.test(all);
    return !zoneOwner&&normalized.includes(normalize(z.name))&&/room|bed|house/i.test(all);
   });
   const priority=p=>/room overview/i.test(str(p.title))?0:/dresser and bed/i.test(str(p.title))?1:/bedroom/i.test(str(p.title))?2:3;
   rows.sort((a,b)=>priority(a)-priority(b)||str(a.created_at).localeCompare(str(b.created_at)));
   const ids=rows.map(p=>p.id);
   if(!ids.length)throw Error("No room photos found");
   const {data:images,error:imageError}=await cloudClient.from("photo_inbox").select("id,image_data").in("id",ids);
   if(imageError)throw imageError;
   const byId=new Map((images||[]).filter(p=>/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(p.image_data||"")).map(p=>[p.id,p.image_data]));
   photos=rows.filter(p=>byId.has(p.id)).map(p=>({...p,image_data:byId.get(p.id)}));
   if(!photos.length)throw Error("Room images could not be loaded");
   personPhotoCache.set(cacheKey,photos);
  }catch(e){const frame=host.querySelector(".hvm-person-room-photo");if(frame)frame.textContent="No saved room photos for "+str(person.name)+" yet. Add photos from House · Add photos.";return}
 }
 const index=Math.max(0,Math.min(photos.length-1,Number(host.dataset.photoIndex)||0));
 host.dataset.photoIndex=String(index);
 const frame=host.querySelector(".hvm-person-room-photo");
 if(frame)frame.outerHTML='<div class="hvm-person-room-photo hvm-person-room-photo-live">'+personRoomPhotoMarkup(photos[index],index,photos.length,person,floor,z)+'</div>';
}
window.houseVisualPersonPhotoStep=function(delta){
 const host=document.querySelector('[data-person-photo-tour]'),person=selectedRoomProfile();
 const photos=host&&person?personPhotoCache.get(str(person.id||person.name).toLowerCase()+"|"+host.dataset.floor+"|"+host.dataset.zone)||[]:[];
 if(!host||!photos.length)return;
 host.dataset.photoIndex=String(Math.max(0,Math.min(photos.length-1,(Number(host.dataset.photoIndex)||0)+Number(delta||0))));
 Promise.resolve().then(()=>hydratePersonRoomPhotoTour());
};
window.houseVisualInspectPersonItem=async function(f,id,item){
 const person=selectedRoomProfile(),z=zone(f,id);if(!z)return;
 if(String(person?.name||"").toLowerCase()==="dolly"&&typeof dollyOpenObject==="function"){dollyOpenObject(item);return}
 const spot=String(item||"").toLowerCase();
 if(typeof window.homeOpenInventorySpot==="function"&&["dresser","dresser_top","vanity","vanity_items","personal_care"].includes(spot)){
  let room=null;
  if(person?.isSelf&&f==="Third floor"&&typeof window.homeEnsureMichelleRoomInventory==="function"){
   const zones=arr(get(f)?.zones).filter(entry=>entry&&okId(entry.id));
   const index=zones.findIndex(entry=>entry.id===id);
   room=await window.homeEnsureMichelleRoomInventory(index===0?0:1);
  }else room=localRoom(f,z);
  if(room){window.homeOpenInventorySpot(room.id,spot);return}
 }
 window.houseVisualInventoryOpen(f,id);
};
function roomCareControls(f,z){
 const label=[z.id,z.name,z.short].join(" ").toLowerCase();
 if(!/bathroom|\bbath\b|washroom|powder room/.test(label))return bedroomWardrobes(f,z);
 const people=["Michelle","Leo","Demitri","Dolly","Ambrose"];
 const towels=people.map(person=>towelRow(JSON.stringify([f,z.id,person]),person)).join("");
 return '<section aria-label="Bathroom towels"><h3>Bath towels</h3>'+towels+'<h4>Shared hand towel</h4>'+towelRow(JSON.stringify([f,z.id,"Hand towel"]),"Hand towel")+'</section>';
}
function towelRow(key,person){
 const record=state.settings?.bathroomTowels?.[key];
 const due=record && (Date.parse(ymd())-Date.parse(record.start))/86400000>=7;
 const summary=record?h(record.label)+' · '+(due?'Fresh towel due':'In use since '+h(record.start)):'Choose a towel';
 return '<details data-bath-towel="'+h(key)+'" data-person="'+h(person)+'"><summary>'+h(person)+' · '+summary+'</summary><label>Towel color, pattern, or rail spot<input maxlength="64" value="'+h(record?.label||"")+'"></label>'+(record?'<button type="button" class="btn" data-fresh-towel="label">Save towel name</button>':'')+'<button type="button" class="btn" data-fresh-towel="today">'+ (record?'Start fresh towel':'Assign clean towel')+'</button></details>';
}
document.addEventListener("click",async event=>{
 const button=event.target.closest?.("[data-fresh-towel]");if(!button)return;
 const row=button.closest("[data-bath-towel]"),input=row.querySelector("input"),label=input.value.trim();
 if(!label){input.focus();return}
 const settings=state.settings||(state.settings={}),records=settings.bathroomTowels||(settings.bathroomTowels={});
 const key=row.dataset.bathTowel,previous=records[key];row.querySelectorAll('button').forEach(b=>b.disabled=true);
 records[key]={label,start:button.dataset.freshTowel==='label' && previous ? previous.start : ymd()};
 try{await save();row.outerHTML=towelRow(key,row.dataset.person)}
 catch(error){if(previous)records[key]=previous;else delete records[key];row.querySelectorAll('button').forEach(b=>b.disabled=false);alert("Could not save this towel. Please try again.")}
});
function bedSheetRow(name){
 const last=state.settings?.sheetChanges?.[name];
 const label=state.settings?.sheetSetNames?.[name]||"";
 let status="Last change not recorded";
 if(last){
  const due=new Date(last+"T12:00:00");due.setDate(due.getDate()+14);
  const dueDay=[due.getFullYear(),String(due.getMonth()+1).padStart(2,"0"),String(due.getDate()).padStart(2,"0")].join("-");
  status="Last changed "+last+" · "+(ymd()>=dueDay?"Fresh sheets due":"Next change")+" "+dueDay;
 }
 return '<section data-sheet-owner="'+h(name)+'"><b>'+h(name)+'’s sheets</b><p>On the bed: '+h(label||"Set not recorded")+'</p><p>'+h(status)+'</p><label>Sheet set<input maxlength="80" placeholder="Color or pattern" value="'+h(label)+'"></label><button class="btn" type="button" data-sheet-change="label">Save set name</button><button class="btn" type="button" data-sheet-change="today">Changed sheets today</button></section>';
}
document.addEventListener("click",async event=>{
 const button=event.target.closest?.("[data-sheet-change]");if(!button)return;
 const row=button.closest("[data-sheet-owner]"),owner=row.dataset.sheetOwner,input=row.querySelector("input");
 const label=input.value.trim();if(!label){input.focus();return}
 const settings=state.settings||(state.settings={});
 const names=settings.sheetSetNames||(settings.sheetSetNames={}),changes=settings.sheetChanges||(settings.sheetChanges={});
 const oldName=names[owner],oldDate=changes[owner];
 row.querySelectorAll("button").forEach(b=>b.disabled=true);
 names[owner]=label;if(button.dataset.sheetChange==="today")changes[owner]=ymd();
 try{await save();row.outerHTML=bedSheetRow(owner)}
 catch(error){
  if(oldName===undefined)delete names[owner];else names[owner]=oldName;
  if(oldDate===undefined)delete changes[owner];else changes[owner]=oldDate;
  row.querySelectorAll("button").forEach(b=>b.disabled=false);alert("Could not save the sheet update. Please try again.");
 }
});
function bedroomWardrobes(f,z){
 const label=[z.id,z.name,z.short].filter(Boolean).join(" ").toLowerCase();
 if(/entry|hall|bath/.test(label))return "";
 const owners=f==="Third floor" && /bed|michelle|primary|master/.test(label)?["Michelle"]:
   f==="Second floor"?["Leo","Demitri","Dolly","Ambrose"].filter(name=>{
     const pattern=name==="Demitri"?/\b(demitri|dimitri|tree)\b/i:new RegExp("\\b"+name+"\\b","i");
     return pattern.test(label.replace(/[_-]/g," "));
   }):[];
 return owners.map(name=>'<button type="button" class="btn hvm-person-room-inventory" onclick="openFamilyCloset(&#39;'+h(name)+'&#39;)">Browse '+h(name)+'’s visual closet ›</button>'+bedSheetRow(name)).join("");
}
function personRoomHome(f,z){
 const tourZones=arr(get(f)?.zones).filter(item=>item&&okId(item.id));
 const tourIndex=tourZones.findIndex(item=>item.id===z.id);
 const personForTitle=selectedRoomProfile();
 const roomTitle=personForTitle?.isSelf&&f==="Third floor"?(tourIndex===0?"Entryway to Michelle’s room":"Michelle’s bedroom"):z.name;

 const person=selectedRoomProfile(),room=localRoom(f,z),tasks=trackedRoomTasks(f,z,room),done=tasks.filter(t=>t.done).length;
 const today=(state.tasks||[]).filter(t=>t.date===ymd()&&!t.paused&&!t.waitingForFunds&&String(t.child||"").trim().toLowerCase()===String(person?.name||"").trim().toLowerCase());
 const todayDone=today.filter(t=>t.done).length;
 const photo='<div class="hvm-person-photo-tour" data-person-photo-tour="'+h(person?.id||person?.name||"profile")+'" data-floor="'+h(f)+'" data-zone="'+h(z.id)+'"><div class="hvm-person-room-photo"><span>Loading '+h(person?.name||"room")+' room views…</span></div></div>';
 const objects=
  (arr(z.markers).length?'<div class="hvm-person-room-objects">'+arr(z.markers).map((p,i)=>'<button type="button" class="hvm-person-object" onclick="houseVisualInteractMarker(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,'+i+')"><span>✦</span><b>'+h(p.label||"Room item")+'</b><small>'+h(p.status||"Tap to inspect")+'</small></button>').join("")+'</div>':"");
 const roomTasks=tasks.filter(t=>!t.done).slice(0,5).map(t=>'<div class="hvm-task-row"><span>'+h(t.title)+'</span><button type="button" class="btn small primary" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">✓ Done</button></div>').join("");
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),index=zones.findIndex(item=>item.id===z.id);
 const tour='<nav class="hvm-person-tour-nav" aria-label="House tour navigation"><button type="button" class="btn" '+(index<=0?'disabled':'')+' onclick="houseVisualPersonTourStep(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,-1)">‹ Previous room</button><span><b>Room tour</b><small>'+(index+1)+' of '+zones.length+' · '+h(f)+'</small></span><button type="button" class="btn" '+(index<0||index>=zones.length-1?'disabled':'')+' onclick="houseVisualPersonTourStep(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;,1)">Next room ›</button></nav>';
 return '<section class="hvm-person-room-home" aria-label="'+h(person?.name||z.name)+' bedroom home">'+
  '<header class="hvm-person-room-heading"><div><small>'+h((person?.name||z.name).toUpperCase())+'’S HOUSE TOUR · '+h(f.toUpperCase())+'</small><h3>'+h(roomTitle||"Room")+'</h3></div><button type="button" class="btn small" onclick="houseVisualBrowseFloor()">Browse floor ›</button></header>'+tour+photo+roomCareControls(f,z)+objects+
  '<div class="hvm-person-room-stats"><div><small>TODAY</small><b>'+(today.length?todayDone+' of '+today.length+' tasks done':"No tasks assigned today")+'</b></div><div><small>ROOM TASKS</small><b>'+(tasks.length?done+' of '+tasks.length+' complete':"No room tasks logged")+'</b></div></div>'+
  '<section class="hvm-person-room-task-list"><div class="hvm-person-room-task-heading"><b>Room tasks</b><button type="button" class="btn small" onclick="houseVisualAddZoneTask(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">＋ Add</button></div>'+
  (roomTasks||'<p class="muted small">No unfinished room tasks. Progress reflects completed tasks, not how clean the room looks.</p>')+'</section>'+
  '<button type="button" class="btn hvm-person-room-inventory" onclick="houseVisualInventoryOpen(&#39;'+h(f)+'&#39;,&#39;'+h(z.id)+'&#39;)">Open '+h(person?.name||z.name)+'’s room inventory ›</button></section>';
}
function floorView(f,m){
 const person=selectedRoomProfile();
 const hasLayout=arr(m.zones).some(z=>z&&okId(z.id)&&okPath(z.path));
 const layout=mapSketch(f,m);
 let browsing=false;try{browsing=localStorage.getItem("dailyLifeMapBrowseRooms")==="1"}catch(e){}
 if(person&&!browsing&&localStorage.getItem("dailyLifeMapBrowseRooms")==="0"){
  let z=null;
  try{const saved=JSON.parse(localStorage.getItem("dailyLifeMapTourRoom")||"null");if(saved?.floor===f&&saved?.profileId===String(person.id||person.name))z=arr(m.zones).find(item=>item&&item.id===saved.id)||null}catch(e){}
  z=z||personRoomZone(f,person.name,!!person.isSelf);
  if(z)return personRoomHome(f,z)
 }
 if(person&&browsing){const ownRoom=personRoomZone(f,person.name,!!person.isSelf);if(ownRoom)return '<div class="hvm-person-room-browse"><button type="button" class="btn small" onclick="houseVisualFocusPersonRoom()">← '+h(person.name)+'’s room</button>'+layout+'</div>';return '<div class="hvm-person-room-browse"><button type="button" class="btn small" onclick="houseVisualGoToPersonRoom()">Go to '+h(person.name)+'’s room · '+h(person.isSelf?"Third floor":"Second floor")+' →</button>'+layout+'</div>'}
 return layout;
}
window.houseVisualBrowseFloor=function(){try{localStorage.setItem("dailyLifeMapBrowseRooms","1")}catch(e){};render()};
window.houseVisualFocusPersonRoom=function(){try{localStorage.removeItem("dailyLifeMapBrowseRooms")}catch(e){};render()};
window.houseVisualSelectTourRoom=function(f,id){
 if(!floors.includes(f)||!okId(id))return;
 const person=selectedRoomProfile();
 try{
  localStorage.setItem("dailyLifeMapFirstFloor",f);
  localStorage.setItem("dailyLifeMapBrowseRooms","0");
  localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({profileId:String(person?.id||person?.name||""),floor:f,id}));
 }catch(e){}
 if(typeof homeSetMapFloor==="function")homeSetMapFloor(f);
 render();
 window.scrollTo(0,0);
};
window.houseVisualInventoryOpen=async function(f,id){
 const person=selectedRoomProfile(),z=zone(f,id);
 if(!z)return;
 const roomLabel=(String(z.name||"")+" "+String(z.short||"")).toLowerCase();
 const isMichelleRoom=(person?.isSelf||/michelle/.test(String(person?.name||""))||/michelle/.test(roomLabel));
 if(isMichelleRoom&&f==="Third floor"&&typeof window.homeEnsureMichelleRoomInventory==="function"){
  const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id));
  const index=zones.findIndex(item=>item.id===id);
  const which=/entry|nook|beanbag|sitting/.test(roomLabel)?0:
    /bed|bedroom|vanity/.test(roomLabel)?1:(index===0?0:1);
  const room=await window.homeEnsureMichelleRoomInventory(which);
  if(room&&typeof window.homeOpenRoomInventory==="function"){window.homeOpenRoomInventory(room.id);return}
 }
 const room=localRoom(f,z);
 if(room&&typeof window.homeOpenRoomInventory==="function"){window.homeOpenRoomInventory(room.id);return}
 if(typeof modal==="function"){
  modal("Room inventory · "+(z.name||"Room"),'<p>No inventory is linked to this room yet. Open the room map to add room specific items and storage locations.</p>',"Close",closeModal);
 }
};
window.houseVisualPersonTourStep=function(f,id,delta){
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),index=zones.findIndex(item=>item.id===id),next=zones[index+Number(delta)];
 if(!next)return;
 window.houseVisualSelectTourRoom(f,next.id);
 document.querySelector(".hvm-person-room-home")?.scrollIntoView({behavior:"smooth",block:"start"});
};
function paint(f){
 const m=get(f),view=m?floorView(f,m):(online()?"Loading your private layout…":"Sign in to Daily Life cloud to view your private map.");
 where(f).forEach(el=>{el.innerHTML=view;el.dataset.viewKey=key(f)});
 if(selectedRoomProfile())hydratePersonRoomPhotoTour();
 refreshRoomProgress(f);
}
window.houseVisualMapHtml=function(f){
 if(!floors.includes(f))f="First floor";
 Promise.resolve().then(()=>window.houseVisualMapHydrate(f)).catch(()=>{});
 return '<section class="hvm-root" data-floor="'+h(f)+'">'+
 (get(f)?floorView(f,get(f)):(online()?"Loading private room map…":"Sign in to view your private room map."))+'</section>';
};
window.houseVisualMapHydrate=async function(f,force=false){
 if(!floors.includes(f))return;
 if(!online()){paint(f);return}
 const k=key(f);
 if(cache.has(k)&&!force){paint(f);return}
 if(pending.has(k))return pending.get(k);
 const job=(async()=>{
 try{
  const {data,error}=await cloudClient.from("life_entries").select("payload,updated_at")
   .eq("category","house_floor_map").eq("external_id","house-map:floor:"+f.toLowerCase().replace(/\s+/g,"-"))
   .eq("source","chatgpt").limit(1);
  if(error)throw error;
  if(key(f)!==k)return;
  const m=data?.[0]?.payload;
  if(!m||!Array.isArray(m.zones))throw new Error("No reviewed floor details yet.");
  cache.set(k,m);if(window.houseVisualEnsureDailyRoutines(ymd())&&typeof save==="function")save();paint(f);
 }catch(e){
  where(f).forEach(el=>{el.innerHTML='<p class="hvm-disclaimer">Map could not load: '+h(e?.message||"Please retry")+
  '</p><button class="btn" onclick="houseVisualMapHydrate(&#39;'+f+'&#39;,true)">Retry loading</button>'});
 }finally{pending.delete(k)}
 })();
 pending.set(k,job);return job;
};
function zone(f,id){
 return arr(get(f)?.zones).find(z=>z.id===id)||null;
}
function localRoom(f,z){
 const n=x=>str(x).toLowerCase().replace(/[^a-z0-9]/g,"");
 return arr(typeof state==="undefined"?[]:state.houseRooms).find(r=>{
  if(str(r.floor)!==f)return false;
  const a=n(r.name),b=n(z.name),short=n(z.short||z.name);
  return a===b||(a.includes(short)&&short.length>3)||(b.includes(a)&&a.length>5);
 });
}
window.houseVisualOpenDollyModel=function(){
 if(typeof modal!=="function")return;
 if(typeof window.dollyRoomSceneHtml!=="function"){
  modal("Dolly's bedroom","<p>The interactive model has not loaded. Refresh Daily Life and try again.</p>","Close",closeModal);return;
 }
 try{
  modal("Dolly's interactive bedroom · Second floor",
   window.dollyRoomSceneHtml()+'<div class="actions"><button type="button" class="btn" onclick="houseVisualOpenZone(&#39;Second floor&#39;,&#39;dolly&#39;)">← Room details</button></div>',
   "Close",closeModal);
 }catch(e){modal("Dolly's bedroom","<p>Could not open the interactive model. Refresh Daily Life.</p>","Close",closeModal)}
};
window.houseVisualReturnToFloor=function(f){
 if(!floors.includes(f)||typeof modal!=="function")return;
 modal(f+" · Floor map",'<div class="hvm-floor-return">'+window.houseVisualMapHtml(f)+
 '<div class="actions"><button type="button" class="btn" onclick="closeModal()">Close map</button></div></div>',"Close",closeModal);
 Promise.resolve().then(()=>window.houseVisualMapHydrate(f)).catch(()=>{});
};
window.houseVisualFollowLink=function(target){
 if(!floors.includes(target))return;
 if(typeof openHouseFloorMap==="function"){openHouseFloorMap(target);return}
 if(typeof homeSetMapFloor==="function"){homeSetMapFloor(target)}
};
function personRoomZone(f,name,isSelf){
 const normalize=value=>str(value).toLowerCase().replace(/[^a-z0-9]/g,"");
 const person=normalize(name),aliases=person==="demitri"?["demitri","dimitri"]:[person];
 const zones=arr(get(f)?.zones).filter(z=>okId(z.id));
 const direct=zones.find(z=>{
  const label=normalize(z.name)+" "+normalize(z.short||"");
  return aliases.some(alias=>alias&&label.includes(alias));
 });
 if(direct)return direct;
 if(isSelf&&f==="Third floor"){
  if(zones.length)return zones[0];
 }
 if(isSelf){
  const explicit=zones.find(z=>z.id==="bedroom"||/^your bedroom$/i.test(str(z.name)));
  if(explicit)return explicit;
  const bedroom=zones.find(z=>/mom|master|primary|michelle/i.test(str(z.name)+" "+str(z.short))&&/room|bed/i.test(str(z.name)+" "+str(z.short)));
  if(bedroom)return bedroom;
  const bedrooms=zones.filter(z=>/bed(room)?/i.test(str(z.name)+" "+str(z.short)));
  if(bedrooms.length===1)return bedrooms[0];
 }
 return null;
}
window.houseVisualGoToPersonRoom=async function(name,isSelf){
 const selected=selectedRoomProfile();name=name||selected?.name||"";isSelf=isSelf==null?!!selected?.isSelf:!!isSelf;
 const floor=isSelf?"Third floor":"Second floor";
 try{
  localStorage.removeItem("dailyLifeMapBrowseRooms");
  localStorage.setItem("dailyLifeMapFirstFloor",floor);
  localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({profileId:String(selectedRoomProfile()?.id||selectedRoomProfile()?.name||""),floor,id:""}));
 }catch(e){}
 if(typeof setView==="function")setView("household");
 if(typeof homeSetMapFloor==="function")homeSetMapFloor(floor);
 try{
  await window.houseVisualMapHydrate(floor);
  const z=personRoomZone(floor,name,isSelf);
  if(z){try{localStorage.setItem("dailyLifeMapTourRoom",JSON.stringify({profileId:String(selectedRoomProfile()?.id||selectedRoomProfile()?.name||""),floor,id:z.id}))}catch(e){};render();window.scrollTo(0,0);return}
  if(typeof homeSetMapFloor==="function")homeSetMapFloor(floor);
 }catch(e){}
};
window.houseVisualTourStep=function(f,id,delta){
 const zones=arr(get(f)?.zones).filter(z=>z&&okId(z.id));
 const index=zones.findIndex(z=>z.id===id),next=index+Number(delta);
 if(next<0||next>=zones.length)return;
 window.houseVisualOpenZone(f,zones[next].id);
};
window.houseVisualInventoryOpen=function(f,id){
 const z=zone(f,id);if(!z)return;
 const room=localRoom(f,z);
 if(room&&typeof homeOpenRoomInventory==="function"){homeOpenRoomInventory(room.id);return}
 if(typeof openInventoryHubSection==="function"){openInventoryHubSection("items");return}
 if(typeof setView==="function"){setView("inventory");return}
 if(typeof openInventoryRoom==="function")openInventoryRoom("",f);
};

window.houseVisualEnsureDailyRoutines=function(date){
 if(typeof state==="undefined"||!date)return false;
 state.tasks=state.tasks||[];let changed=false;
 const rooms=[];
 floors.forEach(f=>arr(get(f)?.zones).forEach(z=>rooms.push({f,z,room:localRoom(f,z)})));
 arr(state.houseRooms).forEach(room=>{
  if(!rooms.some(r=>r.room?.id===room.id||r.f===room.floor&&r.z.name===room.name))rooms.push({f:room.floor,z:{id:room.id,name:room.name},room,local:true});
 });
 for(const {f,z,room,local} of rooms){
  const name=str(z.name),key=str(room?.id||f+":"+z.id);
  let steps=/bath/i.test(name)?[
   ["sink","Wipe sink and faucet",2,/wipe.*(sink|faucet|mirror)/i],
   ["supplies","Check soap, toilet paper and towel",1,/restock|bathroom supplies/i],
   ["trash","Empty bathroom trash if needed",2,/empty.*bathroom trash/i]]:
   /kitchen/i.test(name)?[["dishes","Wash one sink of dishes",5,/dish/i],["counter","Wipe kitchen counters",2,/counter/i]]:
   /dining/i.test(name)?[["table","Clear and wipe dining table",2,/table/i],["floor","Pick up crumbs under the table",2,/crumb/i]]:
   /living/i.test(name)?[["reset","Put away things left in the living room",3,/living.*(reset|tidy)|tidy.*living/i],["sofa","Straighten cushions and blankets",1,/cushion|blanket/i]]:
   /playroom/i.test(name)?[["toys","Put toys back in their homes",3,/toy|playroom.*reset/i],["path","Clear the playroom walking space",2,/walking space/i]]:
   /bedroom/i.test(name)?[["reset","Put clothes and loose items away",3,/clean room|room reset|room cleanup/i],["bed","Straighten bedding",1,/make.*bed|bedding/i]]:
   /hall|entry|stair|landing/i.test(name)?[["path","Check and clear the walking path",1,/walking path|clear.*(hall|stair)/i]]:[["reset","Put loose items away",3,/reset|tidy/i]];
  const linked=trackedRoomTasks(f,z,room).filter(t=>t.date===date);
  for(const [step,title,minutes,match] of steps){
   const id="room-daily:"+encodeURIComponent(key)+":"+step+":"+date;
   if(state.tasks.some(t=>t.id===id)||linked.some(t=>match.test(str(t.title))))continue;
   state.tasks.push({id,date,title:name+" · "+title,category:"home",notes:"Daily room care. Suggested estimate: "+minutes+" minute"+(minutes===1?"":"s")+".",done:false,dailyReset:true,generated:"room-daily",order:78,itineraryMinutes:minutes,itineraryPreference:"after-work",
    ...(local?{homeRoomId:room.id}:{homeMapFloor:f,homeMapZoneId:z.id,homeMapRoomName:name,...(room?{homeRoomId:room.id}:{})})});
   changed=true;
  }
 }
 return changed;
};

function trackedRoomTasks(f,z,room){
 const name=String(z?.name||room?.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const dates=[ymd()];
 const tasks=(state.tasks||[]).filter(t=>{
  if(t.paused||t.duplicateHidden||t.waitingForFunds)return false;
  if(t.date&&!dates.includes(String(t.date)))return false;
  if(t.homeMapZoneId||t.homeMapFloor)return String(t.homeMapFloor||"")===f&&String(t.homeMapZoneId||"")===String(z?.id||"");
  const assigned=String(t.homeRoomId||t.roomId||"");
  if(assigned)return !!room&&assigned===String(room.id);
  const label=String(t.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  if(String(t.category||"").toLowerCase()!=="home"||!name)return false;
  if((" "+label+" ").includes(" "+name+" "))return true;
  const raw=String(t.title||"").toLowerCase();
  const child=String(t.child||"").trim().toLowerCase();
  if(child&&name.includes(child)&&/\b(room|bedroom|bed|make.*bed|room reset|room cleanup)\b/i.test(raw))return true;
  const roomTaskRules=[
   {room:/kitchen/,task:/\b(microwave|stove|oven|refrigerator|fridge|dishwasher|dishes|dishwashing|sink|counter|counters|countertop|pantry)\b/},
   {room:/bath/,task:/\b(toilet|tub|bathtub|shower|bathroom|bathroom mirror|bathroom faucet|bathroom sink)\b/},
   {room:/laundry/,task:/\b(washer|dryer|laundry|wash clothes|fold clothes)\b/},
   {room:/playroom/,task:/\bplayroom|put away toys|toy cleanup|toy pickup\b/},
   {room:/living/,task:/\b(living room|couch|sofa)\b/},
   {room:/dining/,task:/\b(dining room|dining table|clear the table|wipe the table)\b/}
  ];
  return roomTaskRules.some(rule=>rule.room.test(name)&&rule.task.test(raw));
 });
 const chores=typeof window.lifeMapHouseholdRows==="function"?dates.flatMap(date=>window.lifeMapHouseholdRows(date)).filter(t=>{
  if(!t._lifeChore)return false;
  if(t.homeMapZoneId||t.homeMapFloor)return String(t.homeMapFloor||"")===f&&String(t.homeMapZoneId||"")===String(z?.id||"");
  const assigned=String(t.homeRoomId||t.roomId||"");
  if(assigned)return !!room&&assigned===String(room.id);
  const child=String(t.child||"").toLowerCase().trim(),roomName=String(z?.name||room?.name||"").toLowerCase();
  const chore=String(t.title||t.chore||"").toLowerCase();
  if(child&&roomName.includes(child)&&/\b(room|bedroom|bed|make.*bed|room reset|room cleanup)\b/i.test(chore))return true;
  const rules=[
   {room:/kitchen/,task:/\b(dishes|dishwashing|counters?|countertops?|sink|microwave|stove|oven)\b/},
   {room:/bath/,task:/\b(toilet|tub|bathtub|shower|bathroom|mirror|faucet)\b/},
   {room:/laundry/,task:/\b(laundry|washer|dryer|wash clothes|fold clothes)\b/},
   {room:/playroom/,task:/\bplayroom|toys|toy pickup\b/}
  ];
  return rules.some(rule=>rule.room.test(roomName)&&rule.task.test(chore));
 }):[];
 return [...tasks,...chores];
}
window.houseVisualTaskHasRoomMatch=function(task){
 if(!task)return false;
 const mappedFloor=str(task.homeMapFloor||""),mappedZone=str(task.homeMapZoneId||"");
 if(mappedFloor||mappedZone){
  if(!floors.includes(mappedFloor)||!mappedZone)return false;
  const mapped=zone(mappedFloor,mappedZone);
  // A saved room name lets a valid map link survive until that floor's private
  // layout is hydrated. Partial or unknown links remain in the repair queue.
  return !!mapped||!!String(task.homeMapRoomName||"").trim();
 }
 const assigned=str(task.homeRoomId||task.roomId||"");
 if(assigned&&arr(state.houseRooms).some(room=>str(room.id)===assigned&&
    (!str(room.floor)||floors.includes(str(room.floor)))))return true;
 if(assigned)return false;
 if(arr(state.houseRooms).some(room=>str(room.name).trim()&&
    trackedRoomTasks(str(room.floor||""),{id:room.id,name:room.name},room).some(row=>str(row.id)===str(task.id||""))))return true;
 return floors.some(f=>{
  const map=get(f);if(!map)return false;
  return arr(map.zones).some(z=>z&&trackedRoomTasks(f,z,localRoom(f,z)).some(row=>str(row.id)===str(task.id||"")));
 });
};
window.houseVisualAssignTaskToRoom=async function(taskId,f,id){
 if(!floors.includes(f)||!okId(id))return;
 const task=arr(state.tasks).find(row=>String(row.id)===String(taskId))||arr(state.chores).find(row=>String(row.id)===String(taskId)),z=zone(f,id);
 if(!task||!z)return;
 delete task.homeRoomId;delete task.roomId;
 task.homeMapFloor=f;task.homeMapZoneId=id;task.homeMapRoomName=String(z.name||"");
 const room=localRoom(f,z);if(room)task.homeRoomId=room.id;
 if(typeof save==="function")await save();
 if(typeof render==="function")render();
};
window.houseVisualLoadTaskRooms=async function(taskId,f){
 if(!floors.includes(f))return;
 const roomSelect=Array.from(document.querySelectorAll("[data-house-task-room]")).find(node=>node.dataset.houseTaskRoom===String(taskId));
 if(!roomSelect)return;
 roomSelect.innerHTML='<option value="">Loading rooms…</option>';
 await window.houseVisualMapHydrate(f);
 const map=get(f),zones=arr(map?.zones).filter(z=>z&&okId(z.id));
 const currentFloor=Array.from(document.querySelectorAll("[data-house-task-floor]")).find(node=>node.dataset.houseTaskFloor===String(taskId))?.value;
 if(currentFloor!==f)return;
 roomSelect.innerHTML=zones.length?'<option value="">Choose a room</option>'+zones.map(z=>'<option value="'+h(z.id)+'">'+h(z.name||"Room")+'</option>').join(""):'<option value="">No mapped rooms on this floor</option>';
};
window.houseVisualUnassignedTasksHtml=function(f){
 const dates=typeof window.lifeMapProgressDates==="function"?window.lifeMapProgressDates():[ymd()];
 const tasks=arr(state.tasks).filter(task=>{
  if(task.done||task.paused||task.duplicateHidden||task.waitingForFunds)return false;
  if(task.date&&!dates.includes(String(task.date)))return false;
  const area=typeof window.lifeMapTaskArea==="function"?window.lifeMapTaskArea(task):String(task.category||"").toLowerCase();
  if(area!=="home")return false;
  return !window.houseVisualTaskHasRoomMatch(task);
 });
 const chores=dates.flatMap(date=>typeof window.lifeMapHouseholdRows==="function"?window.lifeMapHouseholdRows(date):[]).filter(task=>task._lifeChore&&!task.done&&!task.paused&&!task.duplicateHidden&&!window.houseVisualTaskHasRoomMatch(task));
 const unassigned=tasks.concat(chores);
 if(!unassigned.length)return "";
 return '<section class="hvm-unassigned-tasks"><div><span class="eyebrow">HOUSE MAP · TASK PLACEMENT</span><h3>House tasks without a room</h3><p>Room-specific work appears in its room. Choose a floor and room for these remaining household tasks.</p></div><details><summary>Assign rooms · '+unassigned.length+' task'+(unassigned.length===1?'':'s')+'</summary><div class="hvm-unassigned-task-list">'+unassigned.map(task=>'<article class="hvm-unassigned-task"><b>'+h(task.title||"Home task")+'</b><small>'+(task.child?h(task.child)+" · ":"")+(task.date?h(task.date):"No date")+'</small><label>Floor<select data-house-task-floor="'+h(task.id)+'"><option value="">Choose a floor</option>'+floors.map(floor=>'<option value="'+h(floor)+'">'+h(floor)+'</option>').join("")+'</select></label><label>Room<select data-house-task-room="'+h(task.id)+'" disabled><option value="">Choose a floor first</option></select></label><button type="button" class="btn small primary" data-house-assign-task="'+h(task.id)+'">Assign to room</button></article>').join("")+'</div></details></section>';
};
document.addEventListener("change",function(event){
 const select=event.target&&event.target.closest?event.target.closest("[data-house-task-floor]"):null;
 if(!select)return;
 const taskId=select.dataset.houseTaskFloor,floor=select.value;
 const roomSelect=Array.from(document.querySelectorAll("[data-house-task-room]")).find(node=>node.dataset.houseTaskRoom===taskId);
 if(roomSelect){roomSelect.disabled=!floor;roomSelect.innerHTML='<option value="">'+(floor?"Loading rooms…":"Choose a floor first")+'</option>'}
 if(floor)window.houseVisualLoadTaskRooms(taskId,floor);
});
document.addEventListener("click",function(event){
 const button=event.target&&event.target.closest?event.target.closest("[data-house-assign-task]"):null;
 if(!button)return;
 const taskId=button.getAttribute("data-house-assign-task");
 const floorSelect=Array.from(document.querySelectorAll("[data-house-task-floor]")).find(node=>node.dataset.houseTaskFloor===taskId);
 const roomSelect=Array.from(document.querySelectorAll("[data-house-task-room]")).find(node=>node.dataset.houseTaskRoom===taskId);
 if(floorSelect?.value&&roomSelect?.value)window.houseVisualAssignTaskToRoom(taskId,floorSelect.value,roomSelect.value);
});
window.houseVisualCompleteTask=async function(taskId,f,zoneId){
 const t=(state.tasks||[]).find(x=>String(x.id)===String(taskId)),chore=(state.chores||[]).find(x=>String(x.id)===String(taskId));
 if(t&&!t.done)await toggleTask(taskId,true);
 else if(chore&&!chore.done)await toggleChore(taskId,true);
 else return;
 window.houseVisualOpenZone(f,zoneId);
};
window.houseVisualAddZoneTask=function(f,id){
 const z=zone(f,id);if(!z||typeof openTask!=="function")return;
 const room=localRoom(f,z);
 openTask("","",false,{roomId:room?.id||"",floor:f,zoneId:id,roomName:z.name||"Room"});
};
function markerTaskKey(p,index){
 const id=str(p?.id||"").trim(),label=str(p?.label||"").trim();
 return "house-marker:"+(id||(label?label+"#"+index:"marker-"+index));
}
window.houseVisualAddMarkerTask=function(f,id,index){
 if(!floors.includes(f)||!okId(id)||typeof openTask!=="function")return;
 const z=zone(f,id),p=arr(z?.markers)[Number(index)];if(!z||!p)return;
 const room=localRoom(f,z),objectName=str(p.label||"Mapped object"),objectKey=markerTaskKey(p,index);
 closeModal();
 openTask("","",false,{roomId:room?.id||"",floor:f,zoneId:id,roomName:z.name||"Room",objectName,objectKey});
};
window.houseVisualInteractMarker=function(f,id,index){
 if(!floors.includes(f)||!okId(id)||typeof modal!=="function")return;
 const z=zone(f,id),p=arr(z?.markers)[Number(index)];if(!z||!p)return;
 const objectName=str(p.label||"Mapped object"),objectKey=markerTaskKey(p,index);
 const objectTasks=(state.tasks||[]).filter(t=>!t.duplicateHidden&&!t.paused&&String(t.homeMapFloor||"")===f&&String(t.homeMapZoneId||"")===id&&String(t.homeObjectKey||"")===objectKey);
 const taskList=objectTasks.length?objectTasks.map(t=>'<div class="hvm-object-task-row"><span><b>'+h(t.title||"Task")+'</b><small>'+(t.done?"✓ Complete":"Still to do")+'</small></span>'+(t.done?'':'<button class="btn small primary" type="button" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Done</button>')+'</div>').join(""):'<p class="muted small">No tasks are linked to this object yet.</p>';
 const details='<section class="hvm-object-detail"><span class="hvm-object-icon" aria-hidden="true">✦</span><div><small>IN THIS ROOM</small><h2>'+h(p.label||"Mapped object")+'</h2></div></section>'+
 (p.status?'<p class="hvm-object-status">'+h(p.status)+'</p>':"")+
 (p.note?'<div class="hvm-object-note">'+h(p.note)+'</div>':"")+
 '<section class="hvm-object-tasks"><div><b>Actions for '+h(objectName)+'</b><small>'+objectTasks.length+' linked task'+(objectTasks.length===1?"":"s")+'</small></div>'+taskList+'</section>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualAddMarkerTask(&#39;'+f+'&#39;,&#39;'+id+'&#39;,'+Number(index)+')">＋ Add task for this object</button>'+
 '<button class="btn" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">Open room inventory</button></div>'+
 '<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualOpenZone(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">← Back to room</button>'+
 '<button class="btn" type="button" onclick="houseVisualReturnToFloor(&#39;'+f+'&#39;)">⌂ House map</button></div>';
 modal(h(p.label||"Mapped object")+" · "+h(z.name),'<div class="hvm-object-view">'+details+'</div>',"Close",closeModal);
};


let activeRoomPhotoIds=[],activeRoomPhotoIndex=0,activeRoomPhotoRoom="";
window.houseVisualNavigateRoomPhoto=function(step){
 if(!activeRoomPhotoIds.length)return;
 activeRoomPhotoIndex=(activeRoomPhotoIndex+Number(step)+activeRoomPhotoIds.length)%activeRoomPhotoIds.length;
 window.houseVisualShowRoomPhoto(activeRoomPhotoIds[activeRoomPhotoIndex],activeRoomPhotoIndex,activeRoomPhotoIds.length);
};
window.houseVisualShowRoomPhoto=async function(photoId,index=0,total=activeRoomPhotoIds.length){
 const stage=document.getElementById("hvmRoomPhotoStage");
 if(!stage||!okPhoto(photoId)||!online())return;
 activeRoomPhotoIndex=Math.max(0,Number(index)||0);
 stage.textContent="Loading saved room photo…";
 const {data,error}=await cloudClient.from("photo_inbox").select("image_data,title").eq("id",photoId).single();
 const current=document.getElementById("hvmRoomPhotoStage");if(!current)return;
 if(error||!data||!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(data.image_data||"")){
  current.textContent="This saved photo could not be displayed.";return;
 }
 const img=document.createElement("img");
 img.alt=(data.title||activeRoomPhotoRoom)+" · photo "+(activeRoomPhotoIndex+1)+" of "+total;
 img.src=data.image_data;current.replaceChildren(img);
 const caption=document.getElementById("hvmRoomPhotoCaption");
 let title=str(data.title||"").trim();
 if(/^\d{10,}\.(jpe?g|png|webp)$/i.test(title))title="";
 if(/upstairs bathroom/i.test(title)&&/photo/i.test(title))title="Upstairs bathroom · Photo "+(activeRoomPhotoIndex+1)+" of "+total;
 if(caption)caption.textContent=title||activeRoomPhotoRoom+" · Photo "+(activeRoomPhotoIndex+1)+" of "+total;
 const count=document.getElementById("hvmRoomPhotoCount");
 if(count)count.textContent="Photo "+(activeRoomPhotoIndex+1)+" of "+total;
};
async function hydrateRoomPhotoGallery(f,z){
 const host=document.getElementById("hvmRoomPhotoGallery");if(!host)return;
 if(!online()){host.textContent="Sign in to see saved room photos.";return}
 let photos=arr(z.photos).filter(okPhoto).map(id=>({id}));
 if(/bath/i.test(str(z.name||""))){
  const {data,error}=await cloudClient.from("photo_inbox").select("id,title,notes,created_at")
   .in("category",["house_map","home_progress"]).eq("floor_label",f).order("created_at",{ascending:false}).limit(100);
  if(error){host.textContent="Could not load saved bathroom photos.";return}
  photos=(data||[]).filter(p=>/bath/i.test(str(p.title)+" "+str(p.notes))&&okPhoto(p.id));
 }
 if(!photos.length){host.innerHTML='<p class="muted">No room photos are linked here yet.</p>';return}
 activeRoomPhotoIds=photos.map(p=>p.id);activeRoomPhotoIndex=0;activeRoomPhotoRoom=str(z.name||"Room");
 host.innerHTML='<div class="hvm-photo-gallery"><div class="hvm-room-photo-frame"><div id="hvmRoomPhotoStage" class="hvm-room-photo-stage">Loading saved room photo…</div></div><div id="hvmRoomPhotoCaption" class="hvm-room-photo-caption"></div><div class="hvm-room-photo-picker" aria-label="Browse saved '+h(z.name||"room")+' photos">'+
  '<button type="button" class="btn small" onclick="houseVisualNavigateRoomPhoto(-1)" aria-label="Previous room photo">‹ Previous</button><span id="hvmRoomPhotoCount" class="hvm-room-photo-count">Photo 1 of '+photos.length+'</span><button type="button" class="btn small" onclick="houseVisualNavigateRoomPhoto(1)" aria-label="Next room photo">Next ›</button>'+
  '</div><small class="muted">'+photos.length+' saved photo'+(photos.length===1?'':'s')+' · use Previous and Next to browse</small></div>';
 window.houseVisualShowRoomPhoto(photos[0].id,0,photos.length);
};
window.houseVisualRoomInlineData=function(f,id){
 if(!floors.includes(f)||!okId(id))return null;
 const z=zone(f,id);if(!z)return null;
 const room=localRoom(f,z),tasks=trackedRoomTasks(f,z,room);
 return {floor:f,id:String(id),name:z.name,tasks,wardrobes:roomCareControls(f,z),insights:roomInsightParts(tasks,f,id)};
};
window.houseVisualAnswerReview=async function(kind,key,date,status,f,id){
 if(typeof applyDailyReview==="function")await applyDailyReview(kind,key,date,status,false);
 window.houseVisualOpenZone(f,id);
};
window.houseVisualSkipReview=function(key,date,f,id){
 if(typeof window.lifeMapSkipReview==="function")window.lifeMapSkipReview("home",key,date);
 window.houseVisualOpenZone(f,id);
};
function roomTaskLastDoneHtml(task){
 const label=typeof window.lifeMapTaskLastDoneLabel==="function"?window.lifeMapTaskLastDoneLabel(task):"";
 return label?'<small class="hvm-task-last-done">Last done · '+h(label)+'</small>':"";
}
window.houseVisualOpenZone=function(f,id){
 if(!floors.includes(f)||!okId(id)||typeof modal!=="function")return;
 const z=zone(f,id);if(!z)return;
 const photos=arr(z.photos).filter(okPhoto);
 const room=localRoom(f,z),tasks=trackedRoomTasks(f,z,room),finished=tasks.filter(t=>t.done),pendingTasks=tasks.filter(t=>!t.done);
 const date=typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
 const roomReviewUnknownRows=typeof dailyReviewExpected==="function"?dailyReviewExpected(date).filter(item=>item.status==="unknown"&&pendingTasks.some(task=>String(task.id)===String(item.key))):[];
 const roomReviewRows=roomReviewUnknownRows.filter(item=>!(typeof window.lifeMapIsReviewSkipped==="function"&&window.lifeMapIsReviewSkipped("home",item.key,date)));
 const reviewItem=roomReviewRows[0]||null,allRoomReviewsSkipped=roomReviewUnknownRows.length>0&&!reviewItem;
 const reviewTaskForHistory=reviewItem?(reviewItem.kind==="task"?(state.tasks||[]).find(task=>String(task.id)===String(reviewItem.key)):reviewItem.kind==="chore"?Object.assign({},(state.chores||[]).find(task=>String(task.id)===String(reviewItem.key))||{},{title:((state.chores||[]).find(task=>String(task.id)===String(reviewItem.key))||{}).chore,_lifeChore:true}):null):null;
 const reviewLastDone=reviewTaskForHistory&&typeof window.lifeMapTaskLastDoneLabel==="function"?window.lifeMapTaskLastDoneLabel(reviewTaskForHistory):"";
 const visiblePendingTasks=pendingTasks.filter(task=>!reviewItem||String(task.id)!==String(reviewItem.key));
 const pct=tasks.length?Math.round(finished.length/tasks.length*100):null;
 const locIds=new Set((state.inventoryLocations||[]).filter(x=>room&&x.roomId===room.id).map(x=>x.id));
 const inventory=room?(state.inventoryItems||[]).filter(x=>x.roomId===room.id||locIds.has(x.locationId)):[];
 const insights=roomInsightParts(tasks,f,id);
 const roomInsights='<div class="hvm-room-insights"><b>Declutter progress</b><small>'+h(insights.declutter)+'</small><small>'+h(insights.last)+'</small>'+(insights.lastOrganized?'<small>'+h(insights.lastOrganized)+'</small>':'')+'<small>This is separate from item inventory and does not remove room records.</small><button type="button" class="hvm-room-declutter-quick" onclick="houseVisualLogDeclutter(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">＋ I organized one area</button></div>';
 const progress='<div class="hvm-task-progress"><div><b>'+(pct===null?"Not assessed":pct+"%")+'</b><small>'+(pct===null?"No room tasks saved yet":finished.length+" / "+tasks.length+" tasks complete")+'</small></div>'+
 '<div class="hvm-task-meter"><i style="width:'+(pct||0)+'%"></i></div><small>Task progress only; not a cleanliness rating.</small></div>'+
 (reviewItem?'<section class="hvm-daily-checkin"><div class="hvm-daily-checkin-kicker">TODAY’S CHECK-IN · '+roomReviewRows.length+' to answer</div><b>'+h(reviewItem.label||reviewItem.group||"Home task")+'</b>'+(reviewItem.detail?'<p>'+h(reviewItem.detail)+'</p>':'')+(reviewLastDone?'<small class="hvm-task-last-done">Last done · '+h(reviewLastDone)+'</small>':'')+
 '<div class="hvm-daily-checkin-actions"><button type="button" class="review-yes" onclick="houseVisualAnswerReview(&#39;'+h(reviewItem.kind)+'&#39;,&#39;'+h(reviewItem.key)+'&#39;,&#39;'+h(date)+'&#39;,&#39;yes&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Yes</button><button type="button" class="review-no" onclick="houseVisualAnswerReview(&#39;'+h(reviewItem.kind)+'&#39;,&#39;'+h(reviewItem.key)+'&#39;,&#39;'+h(date)+'&#39;,&#39;no&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✕ No</button><button type="button" class="review-na" onclick="houseVisualAnswerReview(&#39;'+h(reviewItem.kind)+'&#39;,&#39;'+h(reviewItem.key)+'&#39;,&#39;'+h(date)+'&#39;,&#39;na&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">— N/A</button><button type="button" onclick="houseVisualSkipReview(&#39;'+h(reviewItem.key)+'&#39;,&#39;'+h(date)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">Skip for now ›</button></div></section>':allRoomReviewsSkipped?'<section class="hvm-daily-checkin"><b>Daily Review</b><p>Your other room check-ins are skipped for now.</p><button type="button" onclick="lifeMapShowSkippedReviews(&#39;home&#39;,&#39;'+h(date)+'&#39;);houseVisualOpenZone(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">Show skipped</button></section>':'')+
 '<div class="hvm-task-list"><b>What needs doing · '+visiblePendingTasks.length+'</b>'+
 (visiblePendingTasks.length?visiblePendingTasks.slice(0,12).map(t=>'<div class="hvm-task-row"><span>'+h(t.title)+(t.itineraryMinutes?'<small>About '+h(t.itineraryMinutes)+' min</small>':'')+(t.homeObjectLabel?'<small>↳ '+h(t.homeObjectLabel)+'</small>':"")+roomTaskLastDoneHtml(t)+'</span><button class="btn small primary" onclick="houseVisualCompleteTask(&#39;'+h(t.id)+'&#39;,&#39;'+f+'&#39;,&#39;'+id+'&#39;)">✓ Done</button></div>').join(""):'<p>No other unfinished tracked room tasks yet.</p>')+'</div>'+
 '<div class="hvm-room-inventory"><b>Things in this room · '+inventory.length+' item types</b>'+
 (inventory.length?inventory.slice(0,14).map(x=>'<button type="button" class="hvm-object-row" onclick="openInventoryItem(&#39;'+h(x.id)+'&#39;)"><span>▧</span><span><b>'+h(x.name)+'</b><small>'+(x.quantity!=null?h(x.quantity)+' · ':'')+'Open item details</small></span><span>›</span></button>').join(""):'<p>No local inventory recorded here yet; this does not mean the room is empty.</p>')+'</div>';

 const miniRoom=mappedRoomMiniature(f,z);
 const spots=arr(z.markers).map((p,i)=>'<button type="button" class="hvm-object-row" onclick="houseVisualInteractMarker(&#39;'+f+'&#39;,&#39;'+id+'&#39;,'+i+')"><span>✦</span><span><b>'+h(p.label||"Mapped object")+'</b><small>'+h(p.status||"Tap to inspect this mapped object")+'</small></span><span>›</span></button>').join("");
 const zones=arr(get(f)?.zones).filter(item=>item&&okId(item.id)),zoneIndex=zones.findIndex(item=>item.id===id);
 const tour='<section class="hvm-tour-nav" aria-label="Room tour"><div><b>Room tour</b><small>'+(zoneIndex+1)+' of '+zones.length+' rooms · tap mapped items to inspect them</small></div><div class="hvm-detail-actions"><button class="btn" type="button" '+(zoneIndex<=0?'disabled':'')+' onclick="houseVisualTourStep(&#39;'+f+'&#39;,&#39;'+id+'&#39;,-1)">‹ Previous room</button><button class="btn" type="button" '+(zoneIndex<0||zoneIndex>=zones.length-1?'disabled':'')+' onclick="houseVisualTourStep(&#39;'+f+'&#39;,&#39;'+id+'&#39;,1)">Next room ›</button></div></section>';
 const interactiveRoom=f==="Second floor"&&id==="dolly"?'<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualOpenDollyModel()">Enter clickable bedroom ›</button></div>':"";
 const actions='<div class="hvm-detail-actions"><button class="btn primary" type="button" onclick="houseVisualAddZoneTask(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">+ Room task</button>'+
 '<button class="btn" type="button" onclick="houseVisualInventoryOpen(&#39;'+f+'&#39;,&#39;'+id+'&#39;)">'+
 (room?"Open full inventory":"Browse inventory")+'</button>'+
 '<button class="btn" type="button" onclick="houseVisualReturnToFloor(&#39;'+f+'&#39;)">← Floor map</button></div>';
 const references='<details class="hvm-room-extra"><summary>Room notes ›</summary>'+
 (photos.length?'<p>Photos are shown above.</p>':'<p>No saved room photos have been linked here yet.</p>')+
 (z.notes?'<p>'+h(z.notes)+'</p>':"")+
 '</details>';
 const roomPhotos='<section id="hvmRoomPhotoGallery" class="hvm-room-photo-gallery"><p>Loading your saved room photos…</p></section>';
 const objectPanel=spots?'<div class="hvm-detail-markers"><strong>Tap an object to interact</strong>'+spots+'</div>':"";
 const markup='<div class="hvm-zone-detail">'+progress+miniRoom+actions+'<details class="hvm-room-extra"><summary>Photos, inventory and room details</summary>'+roomPhotos+tour+roomCareControls(f,z)+interactiveRoom+objectPanel+roomInsights+references+'</details>'+'</div>';

 modal(z.name+" · "+f,markup,"Close",closeModal);
 Promise.resolve().then(()=>hydrateRoomPhotoGallery(f,z));
};
})();
