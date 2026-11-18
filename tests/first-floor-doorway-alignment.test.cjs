"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const mapSource=read("house-visual-map.js");
const start=mapSource.indexOf("const approvedDoorwayLimits=");
const end=mapSource.indexOf("function approvedDollhouseMap(",start);
assert.ok(start>=0&&end>start,"private doorway adjustment and passage renderers exist");
const doorMap={zones:["kitchen","bath","dining","living","playroom","stairs_up","basement_stairs"].map(id=>({id}))};
const ctx={window:{},arr:x=>Array.isArray(x)?x:[],h:value=>String(value),
 get:f=>f==="First floor"?doorMap:null};
vm.runInNewContext(mapSource.slice(start,end)+
 "\nwindow.passages=approvedConnectedDoorOpenings;window.additionalPassages=approvedKitchenAndStairDoorOpenings;window.routes=approvedFirstFloorDoorwayRoutes;window.targets=approvedDollhouseDoorwayTargets;window.connected=approvedConnectedRoomNav;window.offset=approvedDoorwayOffset;window.editor=approvedDoorwayEditor;",ctx);
const join=ctx.window.passages,more=ctx.window.additionalPassages;
const portals=ctx.window.targets,connected=ctx.window.connected;
const routes=ctx.window.routes,offset=ctx.window.offset;

const artworkCtx={window:{},Math,Number,Object,String,Array,Set};
vm.runInNewContext(read("house-room-artwork.js"),artworkCtx);
const render=artworkCtx.window.houseRealismRoomArtwork;
const place=artworkCtx.window.houseRealismMarkerPlacement;

test("dining doorway is centered on its existing dining-room footprint",()=>{
 const svg=join([{id:"dining"},{id:"living"}]);
 assert.match(svg,/data-door-connection="dining-living"/);
 assert.match(svg,/<rect x="645" y="1054" width="96" height="18"/);
 const center=645+96/2;
 assert.ok(center>580&&center<806);
 assert.ok(Math.abs(center-693)<4);
 assert.doesNotMatch(svg,/data-door-connection="playroom-living"/);
});

test("playroom opening is perpendicular to the front-door edge and visibly wider",()=>{
 const svg=join([{id:"living"},{id:"playroom"}]);
 assert.match(svg,/data-door-connection="playroom-living"/);
 assert.match(svg,/<rect x="317" y="1208" width="18" height="116"/);
 assert.match(svg,/M317 1208H335M317 1324H335/);
 assert.doesNotMatch(svg,/data-door-connection="dining-living"/);
});

test("no passage is invented when either connected room is absent",()=>{
 assert.equal(join([{id:"dining"}]),"");
 assert.equal(join([{id:"bath"},{id:"kitchen"}]),"");
 assert.match(mapSource,/reveal\+surfaces\+hotspots/);
 assert.match(mapSource,/approvedConnectedDoorOpenings\(zoneData,m\.doorwayAdjustments\)/);
});

test("approved floor-plan geometry and original kitchen artwork stay unchanged",()=>{
 for(const exact of [
  'kitchen:{path:"M32 407H573V899H333V908H32Z"',
  'bath:{path:"M578 409H805V713H578Z"',
  'dining:{path:"M580 713H806V1064H580Z"',
  'playroom:{path:"M30 1147H326V1400H30Z"',
  'living:{path:"M326 1063H807V1400H326Z"'
 ])assert.ok(mapSource.includes(exact),exact);
 assert.match(mapSource,/const approvedDollhouseAsset="assets\/approved-dollhouse-first-floor\.png\?v=20261114-approved1"/);
});

test("bathroom vanity and mirror face the wall on kitchen/back-door side, as illustrations only",()=>{
 const bath={id:"bath",markers:[
  {kind:"mirror",label:"Mirror"},
  {kind:"sink",label:"Cream vanity"},
  {kind:"toilet",label:"Toilet"}
 ]};
 const bounds={x:578,y:409,width:227,height:304};
 const config={path:"M578 409H805V713H578Z",cx:692,cy:558};
 const result=render("First floor",bath,config,{total:0,done:0},true,bounds,"overview");
 assert.match(result,/data-kind="mirror" transform="translate\([^"]+\) scale\([\d.]+\) rotate\(-90\)"/);
 assert.match(result,/data-kind="sink" transform="translate\([^"]+\) scale\([\d.]+\) rotate\(-90\)"/);
 assert.match(result,/data-kind="toilet" transform="translate\([^"]+\) scale\([\d.]+\)"/);
 assert.equal(place("First floor",bath,bath.markers[0]).px,12);
 assert.equal(place("First floor",bath,bath.markers[1]).px,30);
 assert.equal(place("First floor",bath,bath.markers[1]).py,40);
 assert.equal(place("First floor",bath,bath.markers[1]).approximate,true);
});
test("saved measured bathroom coordinates always win over illustrative orientation",()=>{
 const bath={id:"bath",markers:[{kind:"sink",label:"Vanity",mapX:73,mapY:42}]};
 const config={path:"M578 409H805V713H578Z",cx:692,cy:558};
 const bounds={x:578,y:409,width:227,height:304};
 const result=render("First floor",bath,config,{done:0,total:0},true,bounds,"overview");
 assert.equal(place("First floor",bath,bath.markers[0]).approximate,false);
 assert.match(result,/data-kind="sink" transform="translate\([^"]+\) scale\([\d.]+\)"/);
 assert.doesNotMatch(result,/data-kind="sink" transform="[^"]* rotate\(-90\)"/);
 assert.equal(bath.markers[0].mapX,73);
});

test("kitchen bathroom doorway is shown beside kitchen edge, with approximate width",()=>{
 const svg=more([{id:"kitchen"},{id:"bath"}]);
 assert.match(svg,/data-door-connection="kitchen-bath"/);
 assert.match(svg,/<rect x="568" y="625" width="20" height="68"/);
 assert.doesNotMatch(svg,/data-door-connection="kitchen-dining"/);
 assert.ok(625>409&&625+68<713,"bath passage stays within the existing bathroom edge");
 assert.equal(more([{id:"bath"}]),"");
});

test("dining room entry lies inside the true shared kitchen/dining overlap",()=>{
 const svg=more([{id:"kitchen"},{id:"dining"}]);
 assert.match(svg,/data-door-connection="kitchen-dining"/);
 assert.match(svg,/<rect x="568" y="755" width="20" height="90"/);
 assert.ok(755>713&&755+90<899,"kitchen and dining both exist along this section");
 assert.doesNotMatch(svg,/data-door-connection="dining-upstairs"/);
});

test("stairs from the dining room open to the second floor, not basement",()=>{
 const svg=more([{id:"dining"},{id:"stairs_up"}]);
 assert.match(svg,/data-door-connection="dining-upstairs"/);
 assert.match(svg,/<rect x="571" y="940" width="19" height="82"/);
 assert.ok(940>900&&940+82<1064,"stair entrance remains within the shared dining/stair wall");
 assert.equal(more([{id:"basement_stairs"},{id:"dining"}]),"");
});

test("the extra passage cutouts are illustrative overlays, never changes to zone paths",()=>{
 const svg=more(["kitchen","bath","dining","stairs_up"].map(id=>({id})));
 assert.equal((svg.match(/data-door-connection=/g)||[]).length,3);
 assert.match(mapSource,/approvedConnectedDoorOpenings\(zoneData,m\.doorwayAdjustments\)\+approvedKitchenAndStairDoorOpenings\(zoneData,m\.doorwayAdjustments\)/);
 assert.doesNotMatch(svg,/href=|xlink:href=/);
});

test("each previously rendered connecting passage has a working touch and keyboard route",()=>{
 const zones=doorMap.zones;
 const svg=portals(zones);
 for(const id of ["kitchen-bath","kitchen-dining","dining-living","playroom-living","dining-upstairs"]){
  assert.ok(svg.includes('data-passage-link="'+id+'"'),id);
 }
 assert.equal((svg.match(/data-passage-link=/g)||[]).length,5);
 assert.equal((svg.match(/role="button"/g)||[]).length,5);
 assert.equal((svg.match(/tabindex="0"/g)||[]).length,5);
 assert.equal((svg.match(/onkeydown=/g)||[]).length,5);
 assert.match(svg,/houseVisualFollowLink\(&#39;Second floor&#39;\)/);
 assert.match(svg,/houseVisualOpenZone\(&#39;First floor&#39;,&#39;bath&#39;\)/);
 assert.match(svg,/houseVisualOpenZone\(&#39;First floor&#39;,&#39;dining&#39;\)/);
 assert.match(svg,/houseVisualOpenZone\(&#39;First floor&#39;,&#39;living&#39;\)/);
 assert.match(svg,/houseVisualOpenZone\(&#39;First floor&#39;,&#39;playroom&#39;\)/);
 assert.ok(svg.includes('pointer-events="all"'));
});

test("doorway portals have touch-sized targets but do not change room polygons",()=>{
 const svg=portals(doorMap.zones);
 const rects=[...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.equal(rects.length,5);
 for(const [,x,y,w,h] of rects)assert.ok(Number(w)>=44&&Number(h)>=44,'target must reach 44px');
 assert.match(mapSource,/reveal\+surfaces\+hotspots\+approvedDollhouseDoorwayTargets\(zoneData,m\.doorwayAdjustments\)/);
 assert.equal(portals([{id:"bath"}]),"");
});

test("room detail navigation is based on adjoining rooms, not arbitrary tour order",()=>{
 const kitchen=connected("First floor","kitchen");
 assert.match(kitchen,/Bathroom/);assert.match(kitchen,/Dining room/);assert.match(kitchen,/Basement/);
 assert.doesNotMatch(kitchen,/Playroom/);
 const dining=connected("First floor","dining");
 assert.match(dining,/Kitchen/);
 assert.match(dining,/Living room/);
 assert.match(dining,/Upstairs/);
 assert.match(dining,/houseVisualFollowLink\(&#39;Second floor&#39;\)/);
 assert.doesNotMatch(dining,/houseVisualFollowLink\(&#39;Basement&#39;\)/);
 assert.match(kitchen,/houseVisualFollowLink\(&#39;Basement&#39;\)/);
 assert.doesNotMatch(more([{id:"kitchen"},{id:"basement_stairs"}]),/data-door-connection/);
 const bath=connected("First floor","bath");
 assert.match(bath,/Kitchen/);
 assert.doesNotMatch(bath,/Living room/);
 assert.equal(connected("Basement","kitchen"),"");
 assert.match(connected("First floor","basement_stairs"),/Kitchen/);
});

test("doorway styling preserves visible room art and displays keyboard focus",()=>{
 const css=read("house-visual-map.css");
 assert.match(css,/\.hvm-doorway-portal:focus-visible rect/);
 assert.match(css,/\.hvm-connected-rooms button:focus-visible/);
 assert.match(css,/min-height:44px/);
});

test("kitchen-to-basement stairs stays navigable even though doorway width is not measured",()=>{
 const saved=doorMap.zones;
 assert.match(connected("First floor","kitchen"),/Basement ↓/);
 assert.match(connected("First floor","kitchen"),/houseVisualFollowLink\(&#39;Basement&#39;\)/);
 doorMap.zones=saved.filter(z=>z.id!=="basement_stairs");
 try{assert.doesNotMatch(connected("First floor","kitchen"),/Basement ↓/)}
 finally{doorMap.zones=saved}
});

test("saved doorway corrections move visuals and tap targets together",()=>{
 const bath=[{id:"kitchen"},{id:"bath"}],shift={"kitchen-bath":-24};
 const visual=more(bath,shift),tappable=portals(bath,shift);
 assert.match(visual,/data-door-connection="kitchen-bath" transform="translate\(0 -24\)"/);
 assert.match(tappable,/data-passage-link="kitchen-bath"/);
 assert.match(tappable,/y="613.0"/); // 625 - 24 + (68-68)/2
 assert.equal(routes(bath,shift)[0].y,601);
 assert.equal(routes(bath)[0].y,625);
 assert.equal(offset("kitchen-bath",shift),-24);
});
test("each doorway can shift only along its actual shared wall",()=>{
 const all=doorMap.zones;
 const settings={"dining-living":30,"playroom-living":24,"dining-upstairs":-8};
 assert.match(join(all,settings),/data-door-connection="dining-living" transform="translate\(30 0\)"/);
 assert.match(join(all,settings),/data-door-connection="playroom-living" transform="translate\(0 24\)"/);
 assert.match(more(all,settings),/data-door-connection="dining-upstairs" transform="translate\(0 -8\)"/);
 const r=routes(all,settings);
 assert.equal(r.find(x=>x.id==="dining-living").x,675);
 assert.equal(r.find(x=>x.id==="playroom-living").y,1232);
 assert.equal(r.find(x=>x.id==="dining-upstairs").y,932);
});
test("doorway offsets cannot leave room edge or inject SVG markup",()=>{
 const ids=["kitchen-bath","kitchen-dining","dining-living","playroom-living","dining-upstairs"];
 for(const id of ids){
  assert.equal(offset(id,{[id]:Number.POSITIVE_INFINITY}),0);
  assert.equal(offset(id,{[id]:'10\" onclick=\"oops'}),0);
 }
 assert.equal(offset("kitchen-bath",{"kitchen-bath":-900}),-170);
 assert.equal(offset("kitchen-bath",{"kitchen-bath":700}),12);
 assert.equal(offset("dining-living",{"dining-living":500}),57);
 assert.equal(offset("kitchen-dining",{"kitchen-dining":-99}),-34);
 const html=more(doorMap.zones,{"kitchen-bath":'<script>bad</script>'});
 assert.doesNotMatch(html,/<script|bad/);
});
test("one-door-at-a-time edit controls stay hidden unless requested and use private optimistic saving",()=>{
 assert.equal(ctx.window.editor(doorMap.zones,{}),"");
 assert.match(mapSource,/window\.houseVisualNudgeDoorway=async function/);
 assert.match(mapSource,/\.eq\("owner_user_id",identity\)/);
 assert.match(mapSource,/\.eq\("updated_at",record\.updated_at\)\.select\("id"\)\.maybeSingle\(\)/);
 assert.match(mapSource,/if\(!written\?\.id\)throw new Error/);
 const css=read("house-visual-map.css");
 assert.match(css,/\.hvm-door-adjuster/);
 assert.match(css,/\.hvm-doorway-portal\.is-aligning/);
});
