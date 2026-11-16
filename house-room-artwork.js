/* Daily Life · confirmed-object illustrations for the first-floor map.
   Geometry, room labels, marker evidence, and exact mapped coordinates stay in
   the owner's authenticated floor record. Nothing here changes or saves them.
   Unmeasured positions are explicitly an illustrative arrangement. */
(function(){
"use strict";
const rooms=new Set(["living","dining","playroom","bath"]);
const illustrative={
 living:{sofa:[22,50],ottoman:[31,72],art:[72,15]},
 dining:{shelf:[20,23],robovac:[20,69]},
 playroom:{keyboard:[38,58],mesh:[73,24],table:[70,77],desk:[23,27],shelf:[87,60],mat:[37,87],plant:[13,68]},
 bath:{mirror:[51,12],sink:[49,34],toilet:[51,75]}
};
const types=new Set(["futon","sofa","ottoman","door_front","wood_opening","tv_dresser","art",
"dining_table","coat_hooks","pet_bowls","shelf","robovac","keyboard","mesh","table","desk","mat","plant",
"mirror","sink","toilet"]);
const arr=x=>Array.isArray(x)?x:[];
const h=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function placement(f,z,p){
 if(f!=="First floor"||!z||!rooms.has(String(z.id))||!p)return null;
 const kind=String(p.kind||"").toLowerCase();
 if(!types.has(kind))return null;
 if(p.showOnMap===false)return null;
 // A saved coordinate is evidence; a preview coordinate is NEVER saved back.
 const valid=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v))&&Number(v)>=4&&Number(v)<=96;
 if(valid(p.mapX)&&valid(p.mapY))return {px:Number(p.mapX),py:Number(p.mapY),approximate:false};
 const suggested=illustrative[z.id]?.[kind];
 return suggested?{px:suggested[0],py:suggested[1],approximate:true}:null;
}
function illustration(kind){
 const shadow='<ellipse cx="1" cy="31" rx="55" ry="11" fill="#584451" opacity=".16"/>';
 switch(kind){
 case "sofa":return shadow+
 '<rect x="-62" y="-28" width="124" height="67" rx="17" fill="#314f79" stroke="#27415c" stroke-width="4"/>'+
 '<rect x="-54" y="-40" width="108" height="32" rx="13" fill="#466d9a" stroke="#284562" stroke-width="3"/>'+
 '<rect x="-47" y="-8" width="43" height="35" rx="7" fill="#5983a9" stroke="#2c5378" stroke-width="2"/>'+
 '<rect x="4" y="-8" width="43" height="35" rx="7" fill="#5480a8" stroke="#2c5378" stroke-width="2"/>'+
 '<path d="M-51 0l21 -8 12 16-16 8zM15 -2l18 -8 14 15-13 12z" fill="#b7c2d4" opacity=".72"/>'+
 '<path d="M-39 -35l8 3-5 6m42-5 12 8-7 6" fill="none" stroke="#cfdde8" stroke-width="2"/>';
 case "futon":return shadow+
 '<rect x="-62" y="-28" width="124" height="69" rx="10" fill="#63b5bd" stroke="#3d7d8b" stroke-width="4"/>'+
 '<rect x="-60" y="-41" width="120" height="37" rx="9" fill="#8ad0d0" stroke="#3d8f9a" stroke-width="3"/>'+
 '<path d="M0 -39V33M-48 -4h96M-54 27h108" stroke="#3f929b" stroke-width="3" opacity=".64"/>'+
 '<rect x="-69" y="-18" width="12" height="57" rx="6" fill="#509fa8"/><rect x="57" y="-18" width="12" height="57" rx="6" fill="#509fa8"/>'+
 '<path d="M-52 42v8m104-8v8" stroke="#78584f" stroke-width="6"/>';
 case "ottoman":return shadow+
 '<rect x="-43" y="-18" width="87" height="57" rx="13" fill="#ecb7d5" stroke="#ae7795" stroke-width="3"/>'+
 '<path d="M-32 -5q21-15 45 4t21 25M-34 22q22-15 34 1t31-3" stroke="#b2a0d0" stroke-width="7" fill="none" opacity=".72"/>'+
 '<path d="M-26 -3l4-8 4 8 8 4-8 3-4 8-4-8-8-3zM21 14l3-6 3 6 6 3-6 3-3 6-3-6-6-3z" fill="#fff3c6"/>';
 case "door_front":return '<rect x="-36" y="-53" width="72" height="95" rx="3" fill="#f3f1ec" stroke="#644e43" stroke-width="7"/>'+
 '<rect x="-27" y="-45" width="54" height="36" rx="2" fill="#fbfaf8" stroke="#d0c8bd" stroke-width="3"/>'+
 '<rect x="-27" y="0" width="54" height="33" rx="2" fill="#f8f7f3" stroke="#d0c8bd" stroke-width="3"/>'+
 '<circle cx="18" cy="-2" r="4" fill="#c9a44d" stroke="#8e6c29"/>';
 case "wood_opening":return '<rect x="-72" y="-42" width="144" height="79" fill="#dfd4c5" stroke="#583829" stroke-width="9"/>'+
 '<rect x="-62" y="-30" width="124" height="57" rx="2" fill="#b3a5a0" opacity=".5"/>'+
 '<path d="M-70 -37H70M-70 38H70M-68 -38V38M68 -38V38" fill="none" stroke="#8f5d40" stroke-width="9"/>'+
 '<path d="M-57 -30H57M-57 28H57" stroke="#e0b989" stroke-width="2.5"/>';
 case "tv_dresser":return shadow+
 '<rect x="-57" y="-7" width="114" height="49" rx="3" fill="#916b4c" stroke="#64452f" stroke-width="4"/>'+
 '<path d="M-51 7h102M-51 25h102M-18 -2v40M18 -2v40" stroke="#bd946e" stroke-width="3"/>'+
 '<circle cx="-35" cy="17" r="2.2" fill="#deceaa"/><circle cx="0" cy="17" r="2.2" fill="#deceaa"/><circle cx="35" cy="17" r="2.2" fill="#deceaa"/>'+
 '<rect x="-54" y="-61" width="108" height="52" rx="4" fill="#252c35" stroke="#302c2b" stroke-width="5"/>'+
 '<path d="M-47 -54h94v38h-94z" fill="#465e73"/><path d="M-42 -23q21-22 40-7t43-15" stroke="#86b7cf" fill="none" opacity=".8"/>'+
 '<rect x="45" y="-4" width="15" height="29" rx="4" fill="#2c3037" stroke="#725d7d" stroke-width="2"/>'+
 '<circle cx="52" cy="14" r="6" fill="#8b70b6"/><circle cx="52" cy="14" r="3" fill="#c6a6e9"/>';
 case "art":return '<rect x="-58" y="-34" width="54" height="44" rx="2" fill="#f0d9b4" stroke="#7f614a" stroke-width="5"/>'+
 '<rect x="-50" y="-26" width="38" height="28" fill="#ecf5ed"/><path d="M-47-7l11-13 10 10 8-14 4 17" fill="none" stroke="#9f70c5" stroke-width="4"/>'+
 '<rect x="3" y="-45" width="45" height="49" fill="#fae9c9" stroke="#795945" stroke-width="5"/>'+
 '<path d="M10-12l12-15 10 13 8-17" stroke="#76b6a0" stroke-width="5" fill="none"/>'+
 '<rect x="-8" y="14" width="47" height="36" fill="#fcecca" stroke="#765442" stroke-width="4"/>'+
 '<circle cx="7" cy="28" r="7" fill="#f7bb73"/><path d="M18 38l12-16 4 16z" fill="#ac8fd4"/>';
 case "dining_table":return shadow+
 '<ellipse cx="0" cy="-1" rx="54" ry="46" fill="#8c5838" stroke="#553b2d" stroke-width="4"/>'+
 '<ellipse cx="0" cy="-7" rx="49" ry="40" fill="#b98055" stroke="#dfb18a" stroke-width="3"/>'+
 '<path d="M-25 -16q26 -12 52 6M-22 14q25 13 43 2" fill="none" stroke="#e2ad7e" stroke-width="3" opacity=".55"/>'+
 '<path d="M-74 -18q-19 18-2 41h13q7-11-1-26zM61-22q21 7 14 39l-13 2-9-27zM-19 41q19 22 41 4v-11h-41z" fill="#a47658" stroke="#624630" stroke-width="3"/>';
 case "coat_hooks":return '<rect x="-54" y="-47" width="108" height="13" rx="4" fill="#80563e" stroke="#65452f" stroke-width="2"/>'+
 [-36,-10,17,40].map(x=>'<path d="M'+x+' -34v14q0 8 9 7" stroke="#ad9d83" stroke-width="3" fill="none"/>').join('')+
 '<path d="M-39 -21l-17 19 10 43h30l9-43-18-19z" fill="#7f8e8e" stroke="#516367" stroke-width="3"/>'+
 '<path d="M23 -16l-16 12-2 40h39l-3-41-13-11z" fill="#a96a87" stroke="#815067" stroke-width="3"/>'+
 '<rect x="45" y="-8" width="18" height="38" rx="5" fill="#84759d" stroke="#5c557a" stroke-width="2"/>';
 case "pet_bowls":return shadow+
 '<ellipse cx="-23" cy="0" rx="24" ry="14" fill="#8cb0cf" stroke="#476883" stroke-width="3"/>'+
 '<ellipse cx="-23" cy="-2" rx="17" ry="7" fill="#e0eff6"/>'+
 '<ellipse cx="25" cy="0" rx="24" ry="14" fill="#b6a1d3" stroke="#68568a" stroke-width="3"/>'+
 '<ellipse cx="25" cy="-2" rx="17" ry="7" fill="#ad835e"/><circle cx="23" cy="-2" r="2" fill="#775037"/>';
 case "shelf":return shadow+
 '<rect x="-43" y="-53" width="86" height="100" fill="#966e50" stroke="#5f4633" stroke-width="5"/>'+
 [-30,-3,23].map(y=>'<path d="M-39 '+y+'h78" stroke="#dbb78f" stroke-width="6"/>').join('')+
 '<rect x="-34" y="-49" width="12" height="17" fill="#aa81be"/><rect x="-19" y="-50" width="10" height="18" fill="#86bd9c"/>'+
 '<rect x="-6" y="-50" width="13" height="18" fill="#e5a568"/><rect x="12" y="-47" width="20" height="15" fill="#ebd3af"/>'+
 '<rect x="-29" y="-23" width="23" height="16" fill="#abc5cf"/><rect x="7" y="-24" width="25" height="18" fill="#d3a9b9"/>'+
 '<rect x="-32" y="1" width="24" height="20" fill="#a9bbb4"/><rect x="6" y="0" width="25" height="22" fill="#f0d4a1"/>';
 case "robovac":return shadow+
 '<circle cx="0" cy="0" r="33" fill="#36383d" stroke="#16181c" stroke-width="5"/>'+
 '<circle cx="0" cy="0" r="25" fill="#50525a" stroke="#7c8088" stroke-width="2"/>'+
 '<circle cx="0" cy="-7" r="7" fill="#93959e"/><path d="M-13 13h26" stroke="#25282d" stroke-width="5"/>';
 case "keyboard":return shadow+
 '<rect x="-66" y="-28" width="132" height="57" rx="7" fill="#323840" stroke="#12151c" stroke-width="4"/>'+
 Array.from({length:15},(_,i)=>'<rect x="'+(-59+i*8)+'" y="-15" width="7" height="30" rx="1" fill="#f6f6f1" stroke="#8c8a8b" stroke-width="1"/>').join('')+
 Array.from({length:11},(_,i)=>'<rect x="'+(-53+i*10)+'" y="-15" width="5" height="18" fill="#2a2d34"/>').join('')+
 '<path d="M-49 28v27m98-27v27" stroke="#66636f" stroke-width="6"/>'+
 '<path d="M-23 -29l-9 -32h65l-10 32" fill="#3f4248" stroke="#171920" stroke-width="4"/>';
 case "mesh":return '<path d="M0 -67V-49" stroke="#b8a4a4" stroke-width="4"/>'+
 '<rect x="-37" y="-48" width="74" height="90" rx="15" fill="#f5cf56" fill-opacity=".58" stroke="#d39e38" stroke-width="5" stroke-dasharray="4 2"/>'+
 [-20,5,30].map(y=>'<ellipse cx="0" cy="'+y+'" rx="31" ry="5" fill="#e6bc42" stroke="#b88e2f" stroke-width="2"/>').join('')+
 '<path d="M-31 -39l62 65M29 -39l-61 65" fill="none" stroke="#f1db7c" stroke-width="2"/>';
 case "table":return shadow+
 '<ellipse cx="0" cy="0" rx="39" ry="32" fill="#b98b64" stroke="#7a5942" stroke-width="4"/>'+
 '<ellipse cx="0" cy="-5" rx="35" ry="26" fill="#e2bc92" stroke="#b68960" stroke-width="3"/>'+
 '<path d="M-25 21v25M24 21v25" stroke="#866348" stroke-width="6"/>';
 case "desk":return shadow+
 '<rect x="-58" y="-24" width="116" height="52" rx="3" fill="#bd906a" stroke="#79563d" stroke-width="4"/>'+
 '<path d="M-51 11h103M-43 27v26M42 27v26" stroke="#846046" stroke-width="6"/>'+
 '<rect x="-40" y="-52" width="80" height="26" rx="3" fill="#a98362" stroke="#755640" stroke-width="3"/>'+
 '<path d="M-30 -50V-26M-8 -50V-26M15 -50V-26" stroke="#6d503e" stroke-width="2"/>'+
 '<path d="M-42 -62q38 31 84 0" stroke="#bc929d" stroke-width="4" fill="none"/>'+
 '<circle cx="-20" cy="-51" r="9" fill="#ead0a3"/><circle cx="6" cy="-51" r="11" fill="#c5a2cd"/><circle cx="25" cy="-51" r="8" fill="#a3c5b2"/>';
 case "mat":return '<ellipse cx="0" cy="0" rx="61" ry="39" fill="#b9a0da" fill-opacity=".87" stroke="#8b71af" stroke-width="4"/>'+
 '<path d="M-47-5q27-25 48 2t44-2M-45 16q27-22 46 1t39-1" fill="none" stroke="#dbc9f0" stroke-width="5" opacity=".8"/>';
 case "plant":return shadow+
 '<rect x="-54" y="17" width="108" height="15" fill="#a67653" stroke="#75523d" stroke-width="4"/>'+
 '<path d="M-45 32v21M46 32v21" stroke="#77553e" stroke-width="6"/>'+
 [-32,0,32].map((x,i)=>'<rect x="'+(x-11)+'" y="0" width="22" height="19" rx="3" fill="'+(["#c68c77","#c6a078","#a7b0bc"][i])+'"/>'+
 '<path d="M'+x+' 3V-27m0 18q-21-16-14-24m14 15q16-22 20-15m-20 14q-12-8-20-3" stroke="#61976c" stroke-width="5" fill="none" stroke-linecap="round"/>').join('');
 case "mirror":return '<rect x="-60" y="-45" width="120" height="86" rx="4" fill="#e2d8cf" stroke="#9a7a67" stroke-width="6"/>'+
 '<rect x="-53" y="-38" width="32" height="72" fill="#d8ebf1" stroke="#b1c4ce"/>'+
 '<rect x="-16" y="-38" width="32" height="72" fill="#e7f2f5" stroke="#b1c4ce"/>'+
 '<rect x="21" y="-38" width="32" height="72" fill="#d8ebf1" stroke="#b1c4ce"/>'+
 '<path d="M-48 -35l20 26M-11 -35l20 26M26 -35l20 26" stroke="#fff" stroke-width="4" opacity=".63"/>';
 case "sink":return shadow+
 '<rect x="-55" y="-32" width="110" height="76" rx="4" fill="#956d4d" stroke="#6b4b38" stroke-width="5"/>'+
 '<path d="M-2 -28v65M-48 12h96" stroke="#cba480" stroke-width="3"/>'+
 '<circle cx="-16" cy="5" r="2.5" fill="#e5c484"/><circle cx="19" cy="5" r="2.5" fill="#e5c484"/>'+
 '<ellipse cx="0" cy="-29" rx="48" ry="26" fill="#fff8ed" stroke="#b8b2a8" stroke-width="5"/>'+
 '<ellipse cx="0" cy="-31" rx="31" ry="14" fill="#e7f0ee" stroke="#b8bfba" stroke-width="2"/>'+
 '<path d="M0 -57v16q0 8 7 8" fill="none" stroke="#8e9399" stroke-width="6"/>';
 case "toilet":return shadow+
 '<rect x="-36" y="-50" width="72" height="36" rx="5" fill="#fffdf7" stroke="#bfc1c0" stroke-width="5"/>'+
 '<ellipse cx="0" cy="11" rx="37" ry="44" fill="#fffdf7" stroke="#c3c5c5" stroke-width="5"/>'+
 '<ellipse cx="0" cy="10" rx="23" ry="27" fill="#e0e9e8" stroke="#adb8b8" stroke-width="3"/>'+
 '<path d="M-21 -11q22-12 42 0" stroke="#f7faf7" stroke-width="4" fill="none"/>';
 default:return "";
 }
}
function backdrop(z,b){
 const wall=Math.min(84,Math.round(b.height*.26)),wood=z.id!=="bath";
 const bg='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" fill="'+(wood?"#cfac89":"#e9e3d8")+'"/>'+
  '<rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+wall+'" fill="'+(z.id==="playroom"?"#fff0df":"#f6e9d8")+'"/>'+
  '<rect x="'+b.x+'" y="'+(b.y+wall-7)+'" width="'+b.width+'" height="9" fill="#7c5844"/>';
 const floor=wood?Array.from({length:Math.ceil(b.height/29)},(_,i)=>{
  const y=b.y+wall+i*29;return '<path d="M'+b.x+' '+y+'H'+(b.x+b.width)+'" stroke="#a47c59" stroke-width="2" opacity=".46"/>'+
  '<path d="M'+(b.x+((i%3)+1)*b.width/4)+' '+y+'v29" stroke="#af8461" stroke-width="1.5" opacity=".38"/>';
 }).join(''):Array.from({length:Math.ceil(b.height/46)},(_,i)=>{
  const y=b.y+wall+i*46;return '<path d="M'+b.x+' '+y+'H'+(b.x+b.width)+'" stroke="#d1ccc4" stroke-width="2" opacity=".63"/>';
 }).join('');
 return bg+floor+
  '<path d="M'+b.x+' '+b.y+'V'+(b.y+b.height)+'M'+(b.x+b.width)+' '+b.y+'V'+(b.y+b.height)+'" stroke="#6d4d42" stroke-width="6"/>';
}
function artwork(f,z,settings,stats,detail){
 if(f!=="First floor"||!rooms.has(String(z?.id))||!settings?.path)return "";
 const markers=arr(z.markers).map((p,i)=>({p,i,placement:placement(f,z,p)})).filter(x=>x.placement);
 if(!markers.length)return "";
 const b={x:0,y:0,width:0,height:0};
 const nums=Array.from(String(settings.path).matchAll(/([ML])(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)).map(m=>[Number(m[2]),Number(m[3])]);
 if(nums.length<2)return "";
 const xs=nums.map(p=>p[0]),ys=nums.map(p=>p[1]);b.x=Math.min(...xs);b.y=Math.min(...ys);
 b.width=Math.max(...xs)-b.x;b.height=Math.max(...ys)-b.y;
 const scale={living:1.09,dining:.76,playroom:.76,bath:.74}[z.id]||.8;
 const small={door_front:.7,wood_opening:.75,coat_hooks:.65,pet_bowls:.62,robovac:.52,art:.65,mesh:.64,
  mat:.79,mirror:.84,toilet:.76,sink:.76,plant:.60,shelf:.67,ottoman:.69,table:.67,keyboard:.81,desk:.75};
 const shapes=markers.slice().sort((a,b)=>a.placement.py-b.placement.py).map(({p,placement:pos})=>{
  const kind=String(p.kind||"").toLowerCase(),x=(b.x+b.width*pos.px/100).toFixed(2),y=(b.y+b.height*pos.py/100).toFixed(2);
  const k=(scale*(small[kind]||1)).toFixed(3),pic=illustration(kind);
  const border=pos.approximate?'<ellipse cx="0" cy="5" rx="64" ry="53" fill="none" stroke="#80657e" stroke-width="2" stroke-dasharray="5 5" opacity=".85"/>':"";
  return '<g class="hvm-room-illustrated-object'+(pos.approximate?' is-approximate':'')+
   '" data-kind="'+h(kind)+'" transform="translate('+x+' '+y+') scale('+k+')" pointer-events="none">'+
   '<title>'+h(p.label||"Room object")+(pos.approximate?" · placement illustrative":" · placement from saved map")+'</title>'+pic+border+'</g>';
 }).join('');
 const scene='<g class="hvm-room-art-scene" pointer-events="none">'+backdrop(z,b)+shapes+'</g>';
 const key='hvm-scene-'+(detail?'detail-':'map-')+z.id,zoneId=key+'-clip',colorId=key+'-color';
 const defs='<defs><clipPath id="'+zoneId+'"><path d="'+h(settings.path)+'"/></clipPath>'+
  '<clipPath id="'+colorId+'"><circle cx="'+(Number(settings.cx)||b.x+b.width/2)+'" cy="'+(Number(settings.cy)||b.y+b.height/2)+
  '" r="'+(Math.max(0,Math.min(1,(Number(stats?.done)||0)/Math.max(1,Number(stats?.total)||0)))*Math.max(b.width,b.height)*1.75).toFixed(2)+'"/></clipPath></defs>';
 if(detail)return '<g class="hvm-room-artwork-detail" aria-label="Photo-informed illustration; dashed objects have illustrative placement">'+defs+
  '<g clip-path="url(#'+zoneId+')">'+scene+'</g></g>';
 const filled=Number(stats?.done)>0&&Number(stats?.total)>0;
 return '<g class="hvm-room-artwork-map" data-room="'+h(z.id)+'" aria-hidden="true">'+defs+
  '<g clip-path="url(#'+zoneId+')" class="hvm-scene-muted">'+scene+'</g>'+
  (filled?'<g clip-path="url(#'+zoneId+')"><g clip-path="url(#'+colorId+')" class="hvm-scene-color">'+scene+'</g></g>':"")+'</g>';
}
window.houseRealismMarkerPlacement=placement;
window.houseRealismRoomArtwork=artwork;
})();
