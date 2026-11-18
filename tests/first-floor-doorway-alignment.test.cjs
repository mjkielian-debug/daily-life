"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const mapSource=read("house-visual-map.js");
const start=mapSource.indexOf("function approvedConnectedDoorOpenings(");
const end=mapSource.indexOf("function approvedDollhouseMap(",start);
assert.ok(start>=0&&end>start,"confirmed passage renderer is present");
const ctx={window:{},arr:x=>Array.isArray(x)?x:[]};
vm.runInNewContext(mapSource.slice(start,end)+"\nwindow.passages=approvedConnectedDoorOpenings;",ctx);
const join=ctx.window.passages;
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
 assert.match(mapSource,/approvedConnectedDoorOpenings\(zoneData\)/);
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
