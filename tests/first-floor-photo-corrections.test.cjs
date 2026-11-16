"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const source=read("house-room-artwork.js"),ctx={window:{},Math,Array,Object,Number,Set,String};
vm.runInNewContext(source,ctx);
const render=ctx.window.houseRealismRoomArtwork,position=ctx.window.houseRealismMarkerPlacement;
const bounds={x:326,y:1063,width:481,height:337},scene={path:"M326 1063H807V1400H326Z",cx:565,cy:1232};
const opts={total:2,done:1};
test("first-floor sofa, futon and ottoman styling reflect actual reference photographs",()=>{
 const living={id:"living",markers:[
  {kind:"sofa",label:"Navy celestial-pattern sofa"},
  {kind:"futon",label:"Turquoise futon",mapX:56,mapY:72},
  {kind:"ottoman",label:"Dark floral-covered ottoman"}
 ]};
 const html=render("First floor",living,scene,opts,true,bounds);
 assert.match(html,/data-kind="sofa"/);
 assert.match(html,/stroke="#c6d4e3"/);
 assert.match(html,/data-kind="futon"/);
 assert.match(html,/stroke="#1a1d23"/);
 assert.match(html,/data-kind="ottoman"/);
 assert.match(html,/fill="#1c2f42"/);
 assert.doesNotMatch(html,/unicorn|fill="#ecb7d5"/i);
 assert.equal(position("First floor",living,living.markers[1]).approximate,false);
});
test("window curtains and the Theracane shelf are separate confirmed items with illustrative locations",()=>{
 const living={id:"living",markers:[
  {kind:"curtains",label:"Pink curtains and window behind futon"},
  {kind:"shelf_theracane",label:"Small black wall shelf and blue Theracane"},
  {kind:"wood_opening",label:"Wide full-height wood opening",mapX:35,mapY:19}
 ]};
 const html=render("First floor",living,scene,opts,true,bounds);
 assert.match(html,/data-kind="curtains"/);
 assert.match(html,/fill="#d58d91"/);
 assert.match(html,/data-kind="shelf_theracane"/);
 assert.match(html,/stroke="#294d89"/);
 assert.match(html,/data-kind="wood_opening"/);
 assert.match(html,/placement illustrative/);
 assert.equal(position("First floor",living,living.markers[2]).approximate,false);
 assert.equal(living.markers[0].mapX,undefined);
});
test("dining table and tall wood desk/hutch are visually distinct, without adding invented coordinates",()=>{
 const dining={id:"dining",markers:[
  {kind:"dining_table",label:"Round wooden dining table",mapX:73,mapY:54},
  {kind:"desk_hutch",label:"Dark wooden desk and hutch"}
 ]};
 const html=render("First floor",dining,scene,opts,true,bounds);
 assert.match(html,/data-kind="dining_table"/);
 assert.match(html,/data-kind="desk_hutch"/);
 assert.match(html,/fill="#5b3826"/);
 assert.match(html,/photo-informed|Photo-informed/);
 assert.equal(position("First floor",dining,dining.markers[1]).approximate,true);
 assert.equal(dining.markers[1].mapX,undefined);
});
test("living and dining wood trim, furniture-bound previews, and kitchen preservation remain protected",()=>{
 const living={id:"living",markers:[{kind:"futon",mapX:56,mapY:72,label:"Turquoise futon"}]};
 const html=render("First floor",living,scene,opts,true,bounds);
 assert.match(html,/fill="#f2efea"/);
 assert.match(html,/stroke="#65402e"/);
 const kitchen={id:"kitchen",markers:[{kind:"futon",mapX:56,mapY:72}]};
 assert.equal(render("First floor",kitchen,scene,opts,true,bounds),"");
 const visual=read("house-visual-map.js");
 assert.match(visual,/approvedDollhouseAsset="assets\/approved-dollhouse-first-floor\.png\?v=20261114-approved1"/);
 assert.match(visual,/function correctedStairArtwork\(\)/);
 assert.match(visual,/reveal\+surfaces\+hotspots/);
 assert.doesNotMatch(visual.slice(visual.indexOf("function approvedDollhouseMap("),visual.indexOf("function approvedDollhouseRoomZoom(")),/revisedScenes|objectHotspots|correctedStairArtwork\(\)/);
});
