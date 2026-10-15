/* Daily Life: clickable, approximate house overview from user-confirmed photos and the first-floor robot map.
   Diagram is schematic only; not a floor survey, evacuation diagram or measured geometry. */
(function(){
"use strict";
const FLOOR_DETAILS={
 "Basement":{heading:"Basement",desc:"The first-floor map confirms a staircase down to this level. Room boundaries still need photos.",hints:["Stair access confirmed","Rooms / storage not drawn yet"]},
 "Second floor":{heading:"Children’s rooms",desc:"Kids’ bedrooms are upstairs. Recent laundry photos show beds and Demitri’s chair beneath his bed; bed-to-room matches are not yet confirmed.",hints:["Children’s bedrooms","Demitri’s chair under bed","Other boundaries to confirm"]},
 "Third floor":{heading:"Upstairs bedroom",desc:"Your bedroom is on this level. Laundry was photographed waiting on the stairs up to it; its final storage is unconfirmed.",hints:["Your bedroom","Stairs leading up","Other boundaries to confirm"]}
};
const zoneData=[
 {name:"Kitchen",color:"#a9d7ff",path:"M35 26H193V62H212V188H165V210H35Z",labelX:100,labelY:116},
 {name:"Bathroom",color:"#ffe288",path:"M217 26H293V103H217Z",labelX:254,labelY:63},
 {name:"Dining room",color:"#ffc4aa",path:"M298 60H345V273H265V217H219V111H298Z",labelX:288,labelY:171},
 {name:"Basement stairs",color:"#f1de8c",path:"M34 224H125V339H34Z",labelX:81,labelY:280},
 {name:"Playroom",color:"#87e5da",path:"M35 346H172V464H35Z",labelX:103,labelY:403},
 {name:"Living room",color:"#9cc8ff",path:"M172 283H345V465H181V431H174V345H149V340H172Z",labelX:258,labelY:370}
];
function attr(t){return String(t||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
function zoneMarkup(z){
 const label=z.name==="Basement stairs"?"Stairs ↓":"";
 const name=z.name==="Basement stairs"?"Basement stairs":z.name;
 const q=JSON.stringify(name).replaceAll('"',"&quot;");
 const tag=z.name==="Dining room"?"Dining":z.name==="Living room"?"Living":z.name==="Basement stairs"?"Stairs":z.name;
 return '<g class="hvm-zone" role="button" tabindex="0" aria-label="'+attr("View "+name)+'" onclick="houseVisualRoomOpen('+q+')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();houseVisualRoomOpen('+q+')}">'+
 '<path d="'+z.path+'" fill="'+z.color+'" stroke="#726a80" stroke-width="3" stroke-linejoin="round"/>'+
 '<text class="hvm-room-name" text-anchor="middle" x="'+z.labelX+'" y="'+z.labelY+'">'+(label||attr(tag))+'</text>'+
 (z.name==="Living room"?'<text class="hvm-room-sub" text-anchor="middle" x="258" y="390">futon · front entry</text>':"")+
 (z.name==="Basement stairs"?'<text class="hvm-room-sub" text-anchor="middle" x="81" y="298">DOWN</text>':"")+
 '</g>';
}
window.houseVisualRoomOpen=function(name){
 const norm=x=>String(x||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 const known=(state.houseRooms||[]).find(x=>String(x.floor||"").toLowerCase()==="first floor"&&(norm(x.name)===norm(name)||(name==="Basement stairs"&&/stair|basement/i.test(x.name))));
 if(known){
  if(typeof homeOpenRoomInventory==="function"){homeOpenRoomInventory(known.id);return}
  if(typeof openInventoryRoom==="function"){openInventoryRoom(known.id);return}
 }
 if(name==="Basement stairs"){if(typeof openHouseFloorMap==="function")openHouseFloorMap("Basement");return}
 if(typeof modal==="function"){
  modal(name+" · map reference",'<div class="pi-main"><p>This area appears in your first-floor robot-vacuum map. It is not a measured boundary yet.</p><p class="pi-muted">Add its room record when you are ready to assign exact storage locations and inventory.</p><button class="btn primary" onclick="openInventoryRoom(\'\',\'First floor\')">+ Add or map this room</button></div>',"Close",closeModal);
 }
};
function sketch(){
 return '<div class="hvm-sketch"><div class="hvm-sketch-heading"><strong>First floor · our working layout</strong><span>6 known zones</span></div>'+
 '<svg class="hvm-drawing" viewBox="0 0 380 503" role="group" aria-label="Schematic first-floor house map. Kitchen top left, bathroom top middle, dining upper right, basement stairs middle left, playroom bottom left, living room bottom right, and front door along bottom living-room wall near playroom. Not drawn to scale.">'+
 '<rect x="16" y="9" width="348" height="480" rx="18" fill="#f9f5fb" stroke="#d7cede" stroke-width="2"/>'+
 zoneData.map(zoneMarkup).join("")+
 '<text x="184" y="464" text-anchor="middle" class="hvm-door-symbol">⌑</text><path d="M181 467V454" stroke="#413e55" stroke-width="3"/>'+
 '<path d="M185 467h44" stroke="#413e55" stroke-width="2" stroke-dasharray="4 4"/>'+
 '<text x="220" y="482" text-anchor="middle" class="hvm-entry-label">Front door (street)</text>'+
 '</svg><p class="hvm-disclaimer">Working sketch from your robot map and confirmed entrances. Room shapes and sizes are approximate. Tap a colored room to view or map its belongings.</p></div>';
}
function pending(floor){
 const d=FLOOR_DETAILS[floor]||{heading:floor,desc:"No measured diagram for this level yet.",hints:["Awaiting room photos"]};
 return '<div class="hvm-level"><div class="hvm-level-top"><span class="hvm-level-emoji">⌂</span><div><b>'+attr(d.heading)+'</b><p>'+attr(d.desc)+'</p></div></div><div class="hvm-level-hints">'+d.hints.map(x=>'<span>'+attr(x)+'</span>').join("")+'</div>'+
 '<p class="hvm-disclaimer">No guessed walls or room positions are drawn for this level. Add more pictures and we can refine its layout.</p></div>';
}
window.houseVisualMapHtml=function(floor){return '<section class="hvm-root" aria-label="House map diagram">'+(floor==="First floor"?sketch():pending(floor))+'</section>'};
})();