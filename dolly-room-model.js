/* Dolly's bedroom: clickable furniture projected from the saved floor plan. */
(function(){
 "use strict";
 const ROOM="Dolly’s bedroom",FLOOR="Second floor",ZONE="dolly";
 const ITEMS={
  bed:{label:"Bed",symbol:"🛏",description:"White sleigh bed beneath Dolly’s Mario poster, beside one window; pale-purple bedding and patterned blankets seen in earlier photos.",location:"Beneath Mario poster · beside window (confirmed)",sections:["Bedding","Pillows","Blankets"]},
  dresser:{label:"Dresser",symbol:"▤",description:"Modest-width, low brown dresser with three narrow upper drawers and six larger drawers below, with brass-colored handles. Positioned along the wall opposite the bed’s footboard.",location:"Opposite the bed footboard",sections:[]},
  vanity:{label:"Vanity",symbol:"✧",description:"White vanity stays beneath the other bedroom window.",location:"Under second window (confirmed)",sections:["Vanity top","Other storage"]},
  dollhouse:{label:"Barbie house",symbol:"⌂",description:"Three-story pink Barbie house with an open, playable side facing into the bedroom.",location:"Beside closet · playable side faces into room (confirmed)",sections:["Dolls","Doll clothes","Accessories","Mini furniture"]},
  closet:{label:"Closet",symbol:"▥",description:"Closet for less frequently used toys. Shift the Barbie house slightly when access is needed.",location:"Adjacent to Barbie house · access by shifting house slightly (confirmed)",sections:["Less-used toys","Toy rotation","Other stored items"]}
 };
 function html(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
 function encoded(v){return encodeURIComponent(String(v)).replace(/'/g,"%27")}
 function store(){return state.homeFurnitureRecords&&typeof state.homeFurnitureRecords==="object"?state.homeFurnitureRecords:{}}
 function record(key){return store()["dolly."+key]||{}}
 function sections(key){return key==="dresser"?(Array.isArray(record(key).drawers)?record(key).drawers:[]):ITEMS[key].sections}
 function values(key,section){const list=record(key).contents?.[section];return Array.isArray(list)?list:[]}
 function taskList(key){return (state.tasks||[]).filter(x=>x.homeMapFloor===FLOOR&&x.homeMapZoneId===ZONE&&x.homeObjectKey===key&&!x.duplicateHidden&&!x.paused)}
 async function update(key,fn,returnSection){
  const old=state.homeFurnitureRecords;
  const all={...store()};
  const prev=record(key);
  const next={...prev,contents:{...(prev.contents||{})},drawers:[...(prev.drawers||[])]};
  fn(next);all["dolly."+key]=next;state.homeFurnitureRecords=all;
  try{await save()}catch(e){
   if(old===undefined)delete state.homeFurnitureRecords;else state.homeFurnitureRecords=old;
   alert("The change could not be saved on this device. Nothing was recorded.");
   return;
  }
  if(typeof render==="function")render();
  if(returnSection)window.dollyOpenSection(key,returnSection);else window.dollyOpenObject(key);
 }

 // One photo-referenced floor plan drives the top view and this perspective.
 // The plan remains independently saved and editable; perspective reads it directly.
 const FLOOR_KEY="dailyLifeDollyFloorPlan_photoReference_v5"; // shared saved geometry for both views
 const FLOOR_ITEMS={
  // Plan orientation: top = Mario/headboard + vanity window wall;
  // left = footboard window; right = closet and entry wall;
  // bottom = black tapestry / long dresser wall.
  // Units are visual estimates from photographs, not inches.
  bed:{label:"Bed",w:109,h:200,color:"#eee9ff",x:12,y:9,angle:0},
  dresser:{label:"Dresser",w:148,h:48,color:"#a66a42",x:0,y:210,angle:0},
  vanity:{label:"Vanity",w:118,h:46,color:"#f8f7f3",x:126,y:4,angle:0},
  dollhouse:{label:"Barbie house",w:138,h:51,color:"#f3a3ce",x:249,y:51,angle:90}
 };
 let floorSelected="dresser";
 function floorRead(){try{return JSON.parse(localStorage.getItem(FLOOR_KEY)||"{}")||{}}catch(_){return {}}}
 function floorSave(data){try{localStorage.setItem(FLOOR_KEY,JSON.stringify(data))}catch(_){}}
 function floorData(key){
  const saved=floorRead()[key]||{};
  // Keep saved position and rotation while correcting the photo-derived dresser footprint.
  const fixedSize=key==="dresser"?{w:FLOOR_ITEMS.dresser.w,h:FLOOR_ITEMS.dresser.h}:{};
  return {...FLOOR_ITEMS[key],...saved,...fixedSize};
 }
 window.dollyRestoreVanity=function(){
  const saved=floorRead();saved.vanity={...(saved.vanity||{}),x:FLOOR_ITEMS.vanity.x,y:FLOOR_ITEMS.vanity.y,angle:0};
  floorSave(saved);floorDraw();
 };
 // Both views use the exact same floor-plan coordinate system. These are
 // relative drawing units, not surveyed inches or feet.
 const ISO={cx:310,baseY:146,sx:.78,depth:.5,sy:.42,sz:1.02,wall:130};
 function iso(x,y,z=0){return [ISO.cx+x*ISO.sx-y*ISO.depth,ISO.baseY+(x+y)*ISO.sy-z*ISO.sz]}
 function isoPoints(points){return points.map(p=>iso(p[0],p[1],p[2]||0).map(n=>n.toFixed(1)).join(",")).join(" ")}
 function poly(points,fill,stroke="#755f6d",width=1.5,extra=""){
  return '<polygon points="'+isoPoints(points)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round" '+extra+'/>';
 }
 function line(points,color,width=2,extra=""){
  return '<polyline points="'+isoPoints(points)+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
 }
 function wallPatchY(x1,x2,z1,z2,fill,stroke="#a99ca7"){
  return poly([[x1,0,z1],[x2,0,z1],[x2,0,z2],[x1,0,z2]],fill,stroke,2);
 }
 function wallPatchX(y1,y2,z1,z2,fill,stroke="#a99ca7"){
  return poly([[300,y1,z1],[300,y2,z1],[300,y2,z2],[300,y1,z2]],fill,stroke,2);
 }
 function wallPatchLeft(y1,y2,z1,z2,fill,stroke="#a99ca7"){
  return poly([[0,y1,z1],[0,y2,z1],[0,y2,z2],[0,y1,z2]],fill,stroke,2);
 }
 function roomSceneBase(){
  const floor=poly([[0,0,0],[300,0,0],[300,260,0],[0,260,0]],"url(#roomFloor)","#8b6951",3);
  let planks="";
  for(let y=24;y<260;y+=24)planks+=line([[0,y,1],[300,y,1]],"#74482f",1.2,'opacity=".45"');
  for(let x=35;x<300;x+=62)planks+=line([[x,0,1],[x,260,1]],"#d5a779",1,'opacity=".22"');
  const far=poly([[0,0,0],[300,0,0],[300,0,ISO.wall],[0,0,ISO.wall]],"url(#roomBackWall)","#b7a7ac",2);
  const left=poly([[0,0,0],[0,260,0],[0,260,ISO.wall],[0,0,ISO.wall]],"url(#roomSideWall)","#b7a7ac",2);
  const right=poly([[300,0,0],[300,260,0],[300,260,ISO.wall],[300,0,ISO.wall]],"url(#roomRightWall)","#b7a7ac",2);
  return '<rect x="0" y="0" width="620" height="440" fill="#f0eaec"/>'+floor+planks+far+left+right+
   line([[0,0,ISO.wall],[300,0,ISO.wall],[300,260,ISO.wall]],"#fffdf8",4)+
   line([[0,0,0],[300,0,0],[300,260,0],[0,260,0],[0,0,0]],"#a88772",3);
 }
 function windowWallY(x1,x2){
  return wallPatchY(x1-5,x2+5,53,125,"#fffdf9","#9d8992")+
   wallPatchY(x1,x2,60,119,"#9ec8dc","#fff")+
   line([[x1+(x2-x1)/2,0,60],[x1+(x2-x1)/2,0,119]],"#fff",3)+
   line([[x1,0,90],[x2,0,90]],"#fff",3)+
   line([[x1-8,0,53],[x2+8,0,53]],"#fff",5);
 }
 function windowWallLeft(y1,y2){
  return wallPatchLeft(y1-5,y2+5,18,118,"#fffdf9","#9d8992")+
   wallPatchLeft(y1,y2,25,112,"#9ec8dc","#fff")+
   line([[0,y1+(y2-y1)/2,25],[0,y1+(y2-y1)/2,112]],"#fff",3)+
   line([[0,y1,67],[0,y2,67]],"#fff",3)+
   line([[0,y1-8,18],[0,y2+8,18]],"#fff",5);
 }
 function wallDecor(){
  // Top/far wall has the Mario poster over the headboard and the vanity window.
  let s=windowWallY(150,218);
  s+=wallPatchY(24,92,51,88,"#fffdf8","#8d7785")+
    wallPatchY(28,88,55,84,"#74b9e2","#fff")+
    wallPatchY(31,85,70,75,"#e54d49","#e54d49")+
    '<text x="'+iso(58,0,94)[0].toFixed(1)+'" y="'+(iso(58,0,94)[1]+4).toFixed(1)+'" text-anchor="middle" fill="#5c4250" font-size="9" font-weight="800">MARIO</text>';
  // The second window belongs to the left wall, beside the bed length.
  s+=windowWallLeft(73,163);
  // Closet is an opening with a blue curtain, on the entry-door wall.
  s+=wallPatchX(36,151,0,83,"#efe9e0","#a89891")+
    wallPatchX(40,148,5,78,"#8bb7cf","#e5f0f5")+
    line([[300,43,7],[300,146,7]],"#f8f2eb",4)+
    '<g class="dolly-scene-object dolly-svg-closet" data-room-piece="closet" role="button" tabindex="0" aria-label="Open Dolly’s closet details" onclick="dollyOpenObject(\'closet\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();dollyOpenObject(\'closet\')}">'+
    poly([[300,49,4],[300,143,4],[300,143,78],[300,49,78]],"#76a9c5","#e2f0f6",2)+
    line([[300,56,7],[300,136,7]],"#c4e2ed",3)+
    '</g>';
  // The entry hinges at the lower end; the leaf swings inward and rests along
  // the dresser-side wall. Handle is on the free end, opposite the hinge.
  s+=wallPatchX(192,253,0,84,"#d3c4b9","#89776e")+
    wallPatchX(197,249,5,79,"#aebfca","#f7f1ea")+
    poly([[300,253,0],[254,253,0],[254,253,76],[300,253,76]],"#eee5db","#8d786d",2)+
    poly([[299,253,3],[256,253,3],[256,253,73],[299,253,73]],"#d8e0e4","#fffaf3",1.5)+
    line([[300,253,4],[300,253,72]],"#8a7166",2)+
    '<circle cx="'+iso(260,253,39)[0].toFixed(1)+'" cy="'+iso(260,253,39)[1].toFixed(1)+'" r="3" fill="#b08b4e" stroke="#755d3a" stroke-width="1"/>'+
    line([[300,253,5],[300,253,70]],"#8a7166",2);
  // Dashed sweep connects the closed leaf on the right wall to its open
  // position along the dresser-side wall.
  const h=iso(300,253,2),m=iso(254,253,2),closed=iso(300,207,2);
  s+='<path d="M'+closed[0]+' '+closed[1]+' Q'+h[0]+' '+h[1]+' '+m[0]+' '+m[1]+'" fill="none" stroke="#8f7a70" stroke-width="2" stroke-dasharray="4 4"/>';
  return s;
 }
 function boxTop(x,y,w,h,z,color,stroke="#745744"){
  return poly([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],color,stroke,1.5);
 }
 function boxFaces(x,y,w,h,z0,z1,top,front,side){
  return poly([[x,y,z0],[x,y+h,z0],[x,y+h,z1],[x,y,z1]],front)+
   poly([[x+w,y,z0],[x+w,y+h,z0],[x+w,y+h,z1],[x+w,y,z1]],side)+
   poly([[x,y,z1],[x+w,y,z1],[x+w,y+h,z1],[x,y+h,z1]],top);
 }
 function pointLabel(x,y,z,text){const p=iso(x,y,z);return '<text class="dolly-scene-small" x="'+p[0].toFixed(1)+'" y="'+p[1].toFixed(1)+'" text-anchor="middle">'+text+'</text>'}
 function bedMesh(p){
  const {x,y,w,h}=p;
  let s=boxFaces(x-2,y+4,w+4,h-8,3,20,"#f8f7f7","#fbf9f7","#e5e0df");
  s+=boxTop(x+5,y+10,w-10,h-19,22,"#cfc3e8","#faf8fc");
  // lavender fitted sheet, blue blanket and the loose multicolor comforter.
  s+=poly([[x+7,y+91,23],[x+w-7,y+91,23],[x+w-8,y+h-14,23],[x+7,y+h-14,23]],"#cfc3e8","#e6def1",1);
  s+=poly([[x+7,y+25,24],[x+w-7,y+25,24],[x+w-7,y+91,24],[x+7,y+91,24]],"#397ab9","#275c90",1.2);
  s+=poly([[x+12,y+79,25],[x+48,y+73,25],[x+67,y+94,25],[x+31,y+105,25]],"#dfadae","#8b7588",1);
  s+=poly([[x+55,y+49,25],[x+88,y+57,25],[x+84,y+73,25],[x+51,y+65,25]],"#ebbd49","#b07d32",1);
  s+=poly([[x+12,y+18,26],[x+w-12,y+18,26],[x+w-12,y+38,26],[x+12,y+38,26]],"#f5f2f6","#d5ced8",1);
  // Sculpted headboard and footboard: a bowed, raised white sleigh rail.
  const xs=[0,.15,.35,.5,.65,.85,1],head=xs.map(t=>[x+t*w,y+7,47+18*Math.sin(Math.PI*t)]),foot=xs.map(t=>[x+t*w,y+h-7,39+12*Math.sin(Math.PI*t)]);
  const board=(pts,base)=>poly([...pts,[x+w,y+base,5],[x,y+base,5]],"#f8f7f4","#aaa0a0",2)+line(pts,"#fff",4);
  s+=board(head,y+7)+board(foot,y+h-7);
  s+=line([[x+4,y+22,30],[x+4,y+h-18,30]],"#f9f8f6",5)+line([[x+w-4,y+22,30],[x+w-4,y+h-18,30]],"#e7e2e0",4);
  s+=poly([[x+23,y+10,29],[x+52,y+10,29],[x+52,y+40,29],[x+23,y+40,29]],"#fff","#d8d3d2",1);
  return s;
 }
 function vanityMesh(p){
  const {x,y,w,h}=p,pedestal=w*.29;let s="";
  // Two drawer pedestals support a thin top, leaving the center open for a chair.
  s+=boxFaces(x,y,pedestal,h,2,25,"#f5f3ef","#f5f3ef","#e5e1df")+
   boxFaces(x+w-pedestal,y,pedestal,h,2,25,"#f5f3ef","#f5f3ef","#e5e1df")+
   boxTop(x,y,w,h,27,"#fffdfb","#d3c8c4");
  for(const side of [0,1])for(let row=0;row<2;row++){
   const xa=side?x+w-pedestal+3:x+3,xb=side?x+w-3:x+pedestal-3,z1=6+row*9,z2=z1+8;
   s+=poly([[xa,y+h,z1],[xb,y+h,z1],[xb,y+h,z2],[xa,y+h,z2]],"#fbfaf8","#c5b9b7",1.1);
   const q=iso((xa+xb)/2,y+h,(z1+z2)/2);s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="1.7" fill="#b99a59"/>';
  }
  // Gold framed mirror rises on the far wall directly above the vanity.
  s+=wallPatchY(x+27,x+w-25,35,81,"#b99a55","#8c713c")+
   wallPatchY(x+32,x+w-30,40,76,"#c6dce4","#fff1c7")+
   line([[x+w/2,0,42],[x+w/2,0,74]],"#edf7f8",2);
  return s;
 }
 function dresserMesh(p){
  const {x,y,w,h}=p;let s=boxFaces(x,y,w,h,2,38,"#9a633e","#8a5835","#68422f");
  s+=poly([[x,y,2],[x+w,y,2],[x+w,y,38],[x,y,38]],"#9d643e","#59351e",1.5);
  // Photo shows a modest chest with three narrow top drawers and six broad drawers.
  for(let col=0;col<3;col++){
   const a=x+col*w/3+1,b=x+(col+1)*w/3-1,z1=26,z2=34;
   s+=poly([[a,y,z1],[b,y,z1],[b,y,z2],[a,y,z2]],"#b17b50","#62402a",.8);
   const q=iso((a+b)/2,y,z1+4);s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="1.7" fill="#d0aa62" stroke="#775b34" stroke-width=".5"/>';
  }
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
   const a=x+col*w/3+2,b=x+(col+1)*w/3-2,z1=3+row*10,z2=z1+9;
   s+=poly([[a,y,z1],[b,y,z1],[b,y,z2],[a,y,z2]],row?"#8f5b39":"#a66d44","#62402a",1);
   const q=iso((a+b)/2,y,(z1+z2)/2);s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="1.6" fill="#d3ac63" stroke="#765533" stroke-width=".5"/>';
  }
  return s;
 }
 function barbieMesh(p){
  const {x,y,w,h}=p,front=x+3,back=x+w-3;let s="";
  // Narrow depth at the wall, open playable side toward the room (left).
  s+=boxTop(front,y+4,w-7,h-8,4,"#f5afd0","#9d6c55");
  s+=poly([[back,y,4],[back,y+h,4],[back,y+h,60],[back,y,60]],"#f4c5dc","#bd769f",2);
  for(const z of [7,25,43]){
   s+=poly([[front,y+2,z],[back,y+2,z],[back,y+h-2,z],[front,y+h-2,z]],z===8?"#f0dbca":"#d9b58b","#9c744d",2);
   s+=line([[front,y+2,z+3],[front,y+h-2,z+3]],"#d8ae80",3);
  }
  for(const t of [0,.5,1]){
   const yy=y+t*h;
   s+=poly([[front,yy-2,6],[front+3,yy-2,6],[front+3,yy-2,56],[front,yy-2,56]],"#d6b184","#9b7652",1);
  }
  // Pink roof sections and upper gable, visibly supported by the wooden frame.
  s+=poly([[front,y,60],[back,y,60],[back,y+h*.48,69],[front,y+h*.48,69]],"#e895bf","#a85d88",2)+
   poly([[front,y+h*.48,69],[back,y+h*.48,69],[back,y+h,60],[front,y+h,60]],"#f1add0","#aa648c",2)+
   line([[front,y,60],[front,y+h,60]],"#cb83a8",3);
  // Each room stays open: pastel back panels and small room dividers only.
  for(const z of [26,44]){
   s+=poly([[back,y+6,z],[back,y+h-6,z],[back,y+h-6,z+13],[back,y+6,z+13]],"#f6d9e7","#d28caf",1);
   s+=line([[front,y+6,z],[front,y+h-6,z]],"#d7b184",3);
  }
  return s;
 }
 function perspectivePiece(key){
  const raw=floorData(key),turned=((Math.round((Number(raw.angle)||0)/90)%2)+2)%2===1;
  const w=turned?raw.h:raw.w,h=turned?raw.w:raw.h;
  const p={...raw,x:floorClamp(Number(raw.x)||0,0,300-w),y:floorClamp(Number(raw.y)||0,0,260-h),w,h};let shape="";
  if(key==="bed")shape=bedMesh(p);
  if(key==="vanity")shape=vanityMesh(p);
  if(key==="dresser")shape=dresserMesh(p);
  if(key==="dollhouse")shape=barbieMesh(p);
  return '<g class="dolly-scene-object dolly-svg-'+key+'" data-room-piece="'+key+'" role="button" tabindex="0" aria-label="Open Dolly’s '+html(ITEMS[key].label)+' details" onclick="dollyOpenObject(&#39;'+key+'&#39;)" onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();dollyOpenObject(&#39;'+key+'&#39;)}">'+shape+'</g>';
 }
 function dollyPerspectiveSync(){
  const svg=document.querySelector(".dolly-mini-svg");if(!svg)return;
  for(const key of ["bed","vanity","dresser","dollhouse"]){
   const old=svg.querySelector('[data-room-piece="'+key+'"]');if(!old)continue;
   const wrapped='<svg xmlns="http://www.w3.org/2000/svg">'+perspectivePiece(key)+'</svg>';
   const parsed=new DOMParser().parseFromString(wrapped,"image/svg+xml").documentElement.firstElementChild;
   old.replaceWith(document.importNode(parsed,true));
  }
 }
 function floorClamp(v,min,max){return Math.max(min,Math.min(max,v))}
 function floorDraw(){
  const root=document.getElementById("dollyFloorPlan");if(!root)return;
  const svg=root.querySelector("svg");if(!svg)return;
  const pieces=Object.keys(FLOOR_ITEMS).map(key=>{
   const p=floorData(key),turned=((p.angle/90)%2+2)%2===1;
   const w=turned?p.h:p.w,h=turned?p.w:p.h;
   const x=floorClamp(Number(p.x)||0,0,300-w),y=floorClamp(Number(p.y)||0,0,260-h);
   const selected=floorSelected===key;
   // Draw in the object's unrotated local coordinates. Rotation changes its
   // footprint, never stretches or substitutes a different piece of furniture.
   const tx=turned?(p.angle===90?p.h:0):0;
   const ty=turned?(p.angle===90?0:p.w):0;
   const angle=((p.angle%360)+360)%360;
   const artwork=key==="bed"?
    '<rect x="4" y="4" width="'+(p.w-8)+'" height="'+(p.h-8)+'" rx="6" fill="#d8c8eb"/>'+
    '<path d="M4 24Q'+(p.w/2)+' -2 '+(p.w-4)+' 24" fill="none" stroke="#fff" stroke-width="10"/>'+
    '<rect x="13" y="34" width="'+(p.w-26)+'" height="45" rx="9" fill="#fff"/>'+
    '<path d="M12 82h'+(p.w-24)+'v64H12Z" fill="#6f9bce" opacity=".85"/>'+
    '<path d="M4 '+(p.h-18)+'Q'+(p.w/2)+' '+(p.h+1)+' '+(p.w-4)+' '+(p.h-18)+'" fill="none" stroke="#fff" stroke-width="9"/>' :
    key==="dresser"?
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="3" fill="#ad744b" stroke="#653d27" stroke-width="3"/>'+
    Array.from({length:3},(_,i)=>'<rect x="'+(7+i*(p.w-14)/3)+'" y="6" width="'+((p.w-18)/3)+'" height="11" rx="1" fill="#b98659" stroke="#78492f"/><circle cx="'+(13+i*(p.w-14)/3+(p.w-18)/6)+'" cy="11.5" r="2" fill="#e8c78e"/>').join("")+
    '<path d="M6 20H'+(p.w-6)+'M6 33H'+(p.w-6)+'M'+(p.w/3)+' 20V'+(p.h-5)+'M'+(p.w*2/3)+' 20V'+(p.h-5)+'" stroke="#71472e" stroke-width="2"/>'+
    '<circle cx="'+(p.w/6)+'" cy="27" r="2" fill="#e8c78e"/><circle cx="'+(p.w/2)+'" cy="27" r="2" fill="#e8c78e"/><circle cx="'+(p.w*5/6)+'" cy="27" r="2" fill="#e8c78e"/><circle cx="'+(p.w/6)+'" cy="39" r="2" fill="#e8c78e"/><circle cx="'+(p.w/2)+'" cy="39" r="2" fill="#e8c78e"/><circle cx="'+(p.w*5/6)+'" cy="39" r="2" fill="#e8c78e"/>' :
    key==="vanity"?
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="4" fill="#fffdf9" stroke="#b7a7aa" stroke-width="3"/>'+
    '<rect x="6" y="7" width="25" height="'+(p.h-14)+'" fill="#ece8e8" stroke="#b7a7aa"/>'+
    '<rect x="'+(p.w-31)+'" y="7" width="25" height="'+(p.h-14)+'" fill="#ece8e8" stroke="#b7a7aa"/>'+
    '<path d="M8 '+(p.h/2)+'h21M'+(p.w-29)+' '+(p.h/2)+'h21" stroke="#c8ac70" stroke-width="2"/>'+
    '<rect x="35" y="7" width="'+(p.w-70)+'" height="'+(p.h-14)+'" fill="#f8f0e8" stroke="#d2c1b0" stroke-dasharray="3 2"/>' :
    '<rect x="2" y="2" width="'+(p.w-4)+'" height="'+(p.h-4)+'" rx="4" fill="#e69fca" stroke="#ae6a96" stroke-width="3"/>'+
    '<rect x="7" y="7" width="'+(p.w-14)+'" height="'+(p.h-14)+'" fill="#f9d3e7" stroke="#bc779c"/>'+
    '<path d="M'+(p.w/3)+' 7V'+(p.h-7)+'M'+(2*p.w/3)+' 7V'+(p.h-7)+'" stroke="#bb8b64" stroke-width="4"/>'+
    '<path d="M7 '+(p.h-11)+'H'+(p.w-7)+'" stroke="#b46c99" stroke-width="4"/>';
   return '<g data-floor-key="'+key+'" tabindex="0" role="button" aria-label="Move '+p.label+'" style="cursor:grab;touch-action:none" transform="translate('+x+' '+y+')">'+
    '<g transform="translate('+tx+' '+ty+') rotate('+angle+')">'+artwork+'</g>'+
    '<rect width="'+w+'" height="'+h+'" fill="transparent" stroke="'+(selected?'#be428e':'transparent')+'" stroke-width="3" rx="4"/>'+
    '<text x="'+(w/2)+'" y="'+(h/2)+'" font-size="'+(key==='dollhouse'?9:12)+'" font-weight="700" text-anchor="middle" fill="#302b33" stroke="#fff" stroke-width="3" paint-order="stroke" pointer-events="none">'+p.label+'</text></g>';
  }).join("");
  svg.innerHTML='<rect x="0" y="0" width="300" height="260" fill="#f8f0e8" stroke="#ad8ba9" stroke-width="5"/>'+
   '<path d="M0 0H300V260H0Z" fill="none" stroke="#7f667d" stroke-width="7"/>'+
   '<path d="M123 0h120" stroke="#a7dcef" stroke-width="11"/><path d="M0 74v104" stroke="#a7dcef" stroke-width="11"/>'+
   '<path d="M300 44v112" stroke="#fff" stroke-width="12"/><path d="M300 198v55" stroke="#fff" stroke-width="12"/>'+
   '<text x="180" y="18" font-size="11" text-anchor="middle" fill="#594b58">Vanity window</text>'+
   '<text x="10" y="70" font-size="11" fill="#594b58">Footboard window</text>'+
   '<text x="291" y="37" text-anchor="end" font-size="12" fill="#594b58">Closet</text>'+
   '<text x="291" y="189" text-anchor="end" font-size="11" fill="#594b58">Entry</text>'+
   '<path d="M300 253L255 253A45 45 0 0 0 300 208" fill="none" stroke="#b2a0a4" stroke-width="2" stroke-dasharray="4 3"/><path d="M300 253L255 253" stroke="#927b85" stroke-width="3"/>'+
   '<text x="60" y="18" font-size="12" fill="#594b58">Mario poster</text>'+pieces;
  dollyPerspectiveSync();
  const label=root.querySelector("#dollyFloorSelected");if(label)label.textContent="Selected: "+FLOOR_ITEMS[floorSelected].label;
 }
 window.dollyFloorSelect=function(key){if(!FLOOR_ITEMS[key])return;floorSelected=key;floorDraw()};
 window.dollyFloorTurn=function(dir){
  const data=floorRead(),p=floorData(floorSelected);
  const oldW=p.angle%180?p.h:p.w,oldH=p.angle%180?p.w:p.h;
  const next=(p.angle+dir*90+360)%360;
  const newW=next%180?p.h:p.w,newH=next%180?p.w:p.h;
  data[floorSelected]={...p,angle:next,x:floorClamp(p.x+(oldW-newW)/2,0,300-newW),y:floorClamp(p.y+(oldH-newH)/2,0,260-newH)};
  floorSave(data);floorDraw();
 };
 window.dollyFloorSnap=function(){
  const data=floorRead(),p=floorData(floorSelected),w=p.angle%180?p.h:p.w,h=p.angle%180?p.w:p.h;
  const edges=[{d:p.x,x:0,y:p.y},{d:p.y,x:p.x,y:0},{d:300-(p.x+w),x:300-w,y:p.y},{d:260-(p.y+h),x:p.x,y:260-h}].sort((a,b)=>a.d-b.d);
  data[floorSelected]={...p,x:edges[0].x,y:edges[0].y};floorSave(data);floorDraw();
 };
 window.dollyFloorOpen=function(){
  const root=document.getElementById("dollyFloorPlan");if(!root)return;
  root.hidden=false;root.style.display="block";floorDraw();root.scrollIntoView({block:"nearest",behavior:"smooth"});
 };
 window.dollyFloorClose=function(){const root=document.getElementById("dollyFloorPlan");if(root){root.hidden=true;root.style.display="none"}};
 window.dollyFloorPointerDown=function(event){
  const obj=event.target.closest("[data-floor-key]");if(!obj)return;
  const key=obj.dataset.floorKey;floorSelected=key;
  const svg=event.currentTarget,base=floorData(key),point=svg.createSVGPoint();
  const coord=e=>{point.x=e.clientX;point.y=e.clientY;return point.matrixTransform(svg.getScreenCTM().inverse())};
  const start=coord(event),w=base.angle%180?base.h:base.w,h=base.angle%180?base.w:base.h;
  svg.setPointerCapture(event.pointerId);event.preventDefault();floorDraw();
  const move=e=>{
   if(e.pointerId!==event.pointerId)return;
   const now=coord(e),data=floorRead();
   data[key]={...base,x:floorClamp(base.x+now.x-start.x,0,300-w),y:floorClamp(base.y+now.y-start.y,0,260-h)};
   floorSave(data);floorDraw();
  };
  const stop=e=>{if(e.pointerId!==event.pointerId)return;svg.removeEventListener("pointermove",move);svg.removeEventListener("pointerup",stop);svg.removeEventListener("pointercancel",stop)};
  svg.addEventListener("pointermove",move);svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
 };
 window.dollyRoomSceneHtml=function(){
  const defs='<defs>'+
   '<linearGradient id="roomFloor" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="#bd865e"/><stop offset=".58" stop-color="#a56d45"/><stop offset="1" stop-color="#895731"/></linearGradient>'+
   '<linearGradient id="roomBackWall" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#eee9df"/><stop offset="1" stop-color="#d9d5cd"/></linearGradient>'+
   '<linearGradient id="roomSideWall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e6e2d9"/><stop offset="1" stop-color="#cfcac3"/></linearGradient>'+
   '<linearGradient id="roomRightWall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e3ded5"/><stop offset="1" stop-color="#d2cec7"/></linearGradient>'+
   '</defs>';
  const pieces=["bed","vanity","dresser","dollhouse"].sort((a,b)=>{
   const pa=floorData(a),pb=floorData(b);
   const da=(Number(pa.x)||0)+(Number(pa.y)||0),db=(Number(pb.x)||0)+(Number(pb.y)||0);
   return da-db;
  }).map(perspectivePiece).join("");
  const body=roomSceneBase()+wallDecor()+pieces;
  setTimeout(dollyPerspectiveSync,80);
  setTimeout(dollyPerspectiveSync,350);
  return '<section class="dolly-room-card dolly-room-3d" aria-label="Dolly’s bedroom, perspective built from the saved top-down layout">'+
   '<div class="dolly-room-heading"><div><small>DOLLY’S BEDROOM</small><h3>Her rearranged room</h3></div><span>Tap furniture</span></div>'+
   '<div class="dolly-room-arrange-tools" style="position:relative;z-index:2;padding:9px 4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">'+
   '<button type="button" onclick="dollyFloorOpen()">Open top-down layout</button>'+
   '<button type="button" onclick="dollyRestoreVanity()" id="dollyRestoreVanity" title="Restore vanity to its saved plan position">Restore vanity</button>'+
   '</div>'+
   '<div id="dollyFloorPlan" hidden style="display:none;padding:12px;border:1px solid #d6bcd5;border-radius:18px;margin:12px 0;background:#fff8ff">'+
   '<strong>Dolly’s photographed room · top view</strong><p>Drag and turn furniture here. The perspective uses these same saved positions and proportions.</p>'+
   '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0"><button type="button" onclick="dollyFloorTurn(-1)">↶ Turn left</button><button type="button" onclick="dollyFloorTurn(1)">↷ Turn right</button><button type="button" onclick="dollyFloorSnap()">Snap to wall</button><button type="button" onclick="dollyFloorClose()">Close layout</button></div>'+
   '<p id="dollyFloorSelected">Selected: Dresser</p><svg viewBox="0 0 300 260" style="display:block;width:100%;max-width:560px;touch-action:none" onpointerdown="dollyFloorPointerDown(event)" aria-label="Top-down bedroom furniture layout"></svg></div>'+
   '<div class="dolly-room-scene dollhouse-view"><svg class="dolly-mini-svg" viewBox="150 0 410 400" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Perspective view of Dolly’s bedroom. Furniture positions and proportions follow the saved top-down plan.">'+defs+body+'</svg></div>'+
   '<p class="dolly-room-caveat"><b>Saved arrangement:</b> bed below the Mario poster beside the side window; vanity under the far window; dresser at the bed’s foot; open Barbie house by the closet. The entry and closet share the right wall; the entry swings inward toward the dresser-side wall.</p>'+
   '<div class="dolly-room-helper">Tap a furniture piece or the closet to open its inventory and tasks. The picture uses relative room proportions, not measured dimensions.</div>'+
   '</section>';
 };

 window.dollyOpenObject=function(key){
  const item=ITEMS[key];if(!item)return;
  const d=record(key),opts=sections(key),tasks=taskList(key),done=tasks.filter(t=>t.done).length;
  let controls="";
  if(key==="bed"){
   const history=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))):[];
   const recorded=[...new Set([d.lastBeddingChanged,...history].filter(Boolean))].sort().reverse();
   controls='<div class="dolly-detail-stat"><b>Last bedding change</b><span>'+
    html(recorded[0]||"Not recorded")+'</span></div>'+
    '<button class="btn primary" type="button" onclick="dollyEditBeddingDate()">Record bedding change</button>'+
    '<details class="dolly-bedding-history"><summary>Previous bedding changes ('+recorded.length+')</summary>'+
    (recorded.length?recorded.map(date=>'<p>'+html(date)+'</p>').join(""):'<p>No changes recorded yet.</p>')+'</details>';
  }
  const compartments=opts.map(section=>{
   const count=values(key,section).length;
   return '<button class="dolly-compartment" type="button" onclick="dollyOpenSection(&#39;'+key+'&#39;,&#39;'+encoded(section)+'&#39;)">'+
    '<span><b>'+html(section)+'</b><small>'+(count?count+" recorded entries":"Contents not inventoried")+'</small></span><span aria-hidden="true">›</span></button>';
  }).join("");
  const content='<div class="dolly-detail">'+
   '<div class="dolly-detail-known"><strong>'+html(item.description)+'</strong><small>'+html(item.location)+'</small></div>'+
   controls+
   '<div class="dolly-detail-head"><b>'+ (key==="dresser"?"Clickable dresser drawers":"Inventory compartments")+'</b>'+
   '<span>'+opts.length+' listed</span></div>'+
   (compartments||'<p class="dolly-room-caveat">No drawers identified yet. Add them as you check them; the number and contents are not assumed.</p>')+
   (key==="dresser"?'<button class="btn primary" onclick="dollyAddDrawer()">+ Add a drawer</button>':"")+
   (key==="closet"?'<p class="dolly-closet-access">Access note: the Barbie house can slide slightly when Dolly needs to open the closet. Less-used toys and toy-rotation storage can be recorded here as you check them.</p>':"")+
   '<div class="dolly-detail-head"><b>Related tasks</b><span>'+done+' / '+tasks.length+' done</span></div>'+
   (tasks.length?tasks.slice(0,12).map(t=>'<div class="dolly-task-line"><span>'+html(t.title||"Task")+'</span><small>'+(t.done?"✓ Complete":"Not done")+'</small></div>').join(""):'<p class="dolly-room-caveat">No tasks linked to this furniture yet.</p>')+
   '<button class="btn" type="button" onclick="dollyObjectAddTask(&#39;'+key+'&#39;)">+ Add a task</button>'+
   (key==="bed"?'<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;bedding&#39;)">+ Change bedding task</button>'+
   '<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;frame&#39;)">+ Clean bed frame task</button>':"")+
   '<button class="btn" type="button" onclick="houseVisualOpenZone(&#39;Second floor&#39;,&#39;dolly&#39;)">← Dolly’s room</button>'+
   '</div>';
  modal("Dolly’s "+item.label,content,"Close",closeModal);
 };
 window.dollyEditBeddingDate=function(){
  const old=record("bed").lastBeddingChanged||"";
  modal("Dolly’s bedding",'<div class="dolly-detail"><p>Record the date you actually changed her bedding. Leave blank if unknown.</p>'+
    '<label>Last changed<input id="dollyBeddingDate" type="date" value="'+html(old)+'"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;bed&#39;)">← Bed details</button></div>',
    "Save date",async()=>{
      const date=String(document.getElementById("dollyBeddingDate")?.value||"");
      if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert("Choose a valid date.");return}
      if(date&&typeof ymd==="function"&&date>ymd()){alert("A bedding change date cannot be in the future.");return}
      await update("bed",d=>{
       if(date){
        const previous=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x))):[];
        d.beddingHistory=[...new Set([d.lastBeddingChanged,...previous,date].filter(Boolean))].sort();
        d.lastBeddingChanged=d.beddingHistory[d.beddingHistory.length-1];
       }else{
        d.lastBeddingChanged="";
       }
      });
    });
 };
 window.dollyOpenSection=function(key,sectionEncoded){
  if(!ITEMS[key])return;
  const section=decodeURIComponent(sectionEncoded);
  if(!sections(key).includes(section))return;
  const lines=values(key,section);
  modal(ITEMS[key].label+" · "+section,
   '<div class="dolly-detail"><p>Enter only items you have checked. One description per line; leave empty if not inventoried.</p>'+
   '<label>Contents<textarea id="dollySectionContents" rows="7" placeholder="Nothing recorded yet">'+html(lines.join("\n"))+'</textarea></label>'+
   '<small>Entries here describe storage contents; they do not automatically create a new confirmed stock count.</small>'+
   '<button class="btn" onclick="dollyOpenObject(&#39;'+key+'&#39;)">← '+html(ITEMS[key].label)+'</button></div>',
   "Save contents",async()=>{
     const raw=String(document.getElementById("dollySectionContents")?.value||"");
     const list=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
     if(list.length>60||list.some(x=>x.length>150)){alert("Keep each description under 150 characters, up to 60 entries.");return}
     await update(key,d=>{d.contents[section]=list;});
   });
 };
 window.dollyAddDrawer=function(){
  modal("Add dresser drawer",'<div class="dolly-detail"><p>Name a real drawer by its position, such as “top left”. The app will not assume how many drawers the dresser has.</p>'+
    '<label>Drawer label<input id="dollyDrawerLabel" maxlength="80" placeholder="e.g. Top left drawer"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;dresser&#39;)">← Dresser</button></div>',
    "Add drawer",async()=>{
     const label=String(document.getElementById("dollyDrawerLabel")?.value||"").trim();
     if(!label||label.length>80){alert("Give the drawer a short label.");return}
     const d=record("dresser");
     if((d.drawers||[]).some(x=>x.toLowerCase()===label.toLowerCase())){alert("That drawer is already listed.");return}
     if((d.drawers||[]).length>=24){alert("This dresser already has 24 recorded drawer slots.");return}
     await update("dresser",next=>{next.drawers.push(label);});
    });
 };
 window.dollyObjectAddTask=function(key){
  if(!ITEMS[key]||typeof openTask!=="function")return;
  openTask("","",false,{floor:FLOOR,zoneId:ZONE,roomName:ROOM,objectKey:key});
 };
 window.dollySuggestBedTask=function(type){
  if(typeof openTask!=="function")return;
  window.dollyObjectAddTask("bed");
  const title=type==="frame"?"Clean Dolly’s bed frame":"Change Dolly’s bedding";
  // This only PREFILLS an editor. It never creates or marks a task complete.
  setTimeout(()=>{
   const input=document.getElementById("task");
   if(input)input.value=title;
  },0);
 };

})();
