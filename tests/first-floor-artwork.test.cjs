"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const ctx={window:{},Math,Array,Object,Number,String,Set};
vm.runInNewContext(read("house-room-artwork.js"),ctx);
const render=ctx.window.houseRealismRoomArtwork,place=ctx.window.houseRealismMarkerPlacement;
const livingConfig={path:"M326 1063H807V1400H326Z",cx:565,cy:1232};
const livingBounds={x:326,y:1063,width:481,height:337};
const room={
 id:"living",
 markers:[
  {kind:"futon",label:"Turquoise futon",mapX:56,mapY:72,status:"cleared"},
  {kind:"door_front",label:"Front door",mapX:24,mapY:92,status:"confirmed"},
  {kind:"wood_opening",label:"Wide opening",mapX:35,mapY:19,status:"confirmed"},
  {kind:"sofa",label:"Blue-covered sofa",mapX:null,mapY:null,status:"confirmed"},
  {kind:"ottoman",label:"Unicorn ottoman",mapX:null,mapY:null,status:"confirmed"}
 ]
};
test("real saved furniture positions are used without editing source records",()=>{
 const before=JSON.stringify(room);
 const result=render("First floor",room,livingConfig,{total:3,done:1},false,livingBounds);
 assert.match(result,/hvm-room-artwork-map/);
 assert.match(result,/translate\(595\.36 1305\.64\)/);
 assert.match(result,/Turquoise futon · placement from saved map/);
 assert.equal(JSON.stringify(room),before);
 assert.equal(place("First floor",room,room.markers[0]).approximate,false);
});
test("unmeasured furniture stays labeled and dashed as illustrative",()=>{
 const result=render("First floor",room,livingConfig,{total:3,done:0},true,livingBounds);
 assert.match(result,/hvm-room-artwork-detail/);
 assert.match(result,/placement illustrative/);
 assert.match(result,/is-approximate/);
 assert.match(result,/stroke-dasharray="5 5"/);
 assert.equal(room.markers[3].mapX,null);
 assert.equal(place("First floor",room,room.markers[3]).approximate,true);
});
test("room art never replaces the approved kitchen or stair connections",()=>{
 const kitchen={id:"kitchen",markers:[{kind:"sink",mapX:49,mapY:13}]};
 assert.equal(render("First floor",kitchen,livingConfig,{total:1,done:1},false,livingBounds),"");
 const upstairs={id:"stairs_up",markers:[{kind:"stairs",mapX:40,mapY:44}]};
 assert.equal(render("First floor",upstairs,livingConfig,{total:1,done:1},false,livingBounds),"");
 const house=read("house-visual-map.js");
 assert.match(house,/approvedDollhouseAsset="assets\/approved-dollhouse-first-floor\.png\?v=20261114-approved1"/);
 assert.match(house,/function correctedStairArtwork\(\)/);
 assert.match(house,/reveal\+surfaces\+hotspots/);
 assert.doesNotMatch(house.slice(house.indexOf("function approvedDollhouseMap("),house.indexOf("function approvedDollhouseRoomZoom(")),/revisedScenes|objectHotspots|correctedStairArtwork\(\)/);
});
test("dining, playroom and half-bath draw only objects actually present in markers",()=>{
 const zones=[
  {id:"dining",markers:[{kind:"dining_table",label:"Round table",mapX:73,mapY:54}]},
  {id:"playroom",markers:[{kind:"keyboard",label:"Keyboard",mapX:null,mapY:null},{kind:"mesh",label:"Yellow hanger",mapX:null,mapY:null}]},
  {id:"bath",markers:[{kind:"sink",label:"Cream sink",mapX:null,mapY:null},{kind:"mirror",label:"Three panel mirror",mapX:null,mapY:null},{kind:"toilet",label:"Toilet",mapX:null,mapY:null}]}
 ];
 for(const z of zones){
  const result=render("First floor",z,livingConfig,{total:0,done:0},true,livingBounds);
  assert.match(result,/hvm-room-art-scene/,z.id);
  assert.match(result,/placement/);
 }
 const play=render("First floor",zones[1],livingConfig,{total:0,done:0},true,livingBounds);
 assert.doesNotMatch(play,/data-kind="sofa"/);
});
test("room completion controls illustration color reveal",()=>{
 const muted=render("First floor",room,livingConfig,{total:3,done:0},false,livingBounds);
 const one=render("First floor",room,livingConfig,{total:3,done:1},false,livingBounds);
 assert.match(muted,/hvm-scene-muted/);
 assert.doesNotMatch(muted,/hvm-scene-color/);
 assert.match(one,/hvm-scene-color/);
 const css=read("house-visual-map.css");
 assert.match(css,/hvm-room-artwork-map \.hvm-scene-muted/);
});
test("illustrations and their touch targets are wired into the app",()=>{
 const html=read("index.html"),house=read("house-visual-map.js"),sw=read("sw.js");
 assert.match(html,/house-room-artwork\.js\?v=/);
 assert.match(house,/window\.houseRealismRoomArtwork/);
 assert.match(house,/window\.houseRealismMarkerPlacement/);
 assert.match(house,/hvm-drawn-object-hotspot/);
 assert.match(sw,/"\.\/house-room-artwork\.js"/);
});

test("overview artwork uses unique clipping and does not invent wall edges",()=>{
 const z={id:"living",markers:[{kind:"futon",label:"Turquoise futon",mapX:56,mapY:72,status:"confirmed"}]};
 const art=render("First floor",z,livingConfig,{total:0,done:0},true,livingBounds,"overview");
 const detail=render("First floor",z,livingConfig,{total:0,done:0},true,livingBounds);
 assert.match(art,/hvm-scene-overview-living-clip/);
 assert.match(detail,/hvm-scene-detail-living-clip/);
 assert.doesNotMatch(art,/stroke="#65402e" stroke-width="6"/);
 assert.match(detail,/stroke="#65402e" stroke-width="6"/);
 const house=read("house-visual-map.js");
 assert.doesNotMatch(house.slice(house.indexOf("function approvedOverviewRoom("),house.indexOf("function approvedOverviewLabel(")),/const line=stair/);
 assert.match(house,/window\.houseRealismRoomArtwork\(f,illustrated,settings,stats,true,b,"overview"\)/);
});
