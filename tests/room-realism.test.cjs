"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const map=read("house-visual-map.js");
test("confirmed furniture appears without saving guessed coordinates",()=>{
 const a=map.indexOf("function mapConfirmedObjectKind(marker){"),b=map.indexOf("/* A decorative room cross-section",a);
 assert.ok(a>=0&&b>a);
 const c={window:{},Math,str:x=>String(x??""),h:x=>String(x),arr:x=>Array.isArray(x)?x:[],lifelikeFurnitureSvg:k=>["bed","vanity","chair","dresser","beanbag","tv","fan","robovac","book_shelf","box_fan","wood_opening"].includes(k)?"<rect/>":"",fixtureSvg:()=>"<rect/>"};
 vm.runInNewContext(map.slice(a,b)+"window._illustration={mapConfirmedObjectKind,mappedFurniture}",c);
 const fn=c.window._illustration;
 assert.equal(fn.mapConfirmedObjectKind({kind:"laundry",status:"awaiting put-away confirmation"}),"");
 assert.equal(fn.mapConfirmedObjectKind({kind:null,label:"Bed · pale purple sheets",status:"confirmed"}),"bed");
 const room={id:"bedroom",name:"Bedroom",markers:[{label:"Bed",kind:"bed",mapX:20,mapY:40,status:"confirmed"},{label:"Vanity",kind:"vanity",status:"confirmed"},{label:"Laundry",kind:"laundry",status:"unconfirmed"}]};
 const render=fn.mappedFurniture("Third floor",room,{x:0,y:0,width:220,height:160});
 assert.match(render,/illustrative position/);
 assert.match(render,/Vanity/);
 assert.doesNotMatch(render,/Laundry/);
 assert.equal(room.markers[1].mapX,undefined);
});
test("the reference-photo shortcut opens the visible photo section",()=>{
 assert.match(map,/window\.houseVisualRevealRoomPhotos=function\(\)/);
 const block=map.split("window.houseVisualRevealRoomPhotos=function(){")[1].split("};")[0];
 assert.match(block,/\.hvm-real-room-photos/);
 assert.doesNotMatch(block,/\.hvm-room-extra/);
});
test("photos are one tap from room details without adding a duplicate gallery",()=>{
 assert.match(map,/const roomPhotoDoor=hasRoomPhotoReference/);
 assert.match(map,/actions\+roomPhotoDoor/);
 assert.match(map,/<summary>Inventory and room details<\/summary>/);
});
