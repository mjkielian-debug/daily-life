"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
const a=src.indexOf("function photoRoomAccents(f,z,b){"),b=src.indexOf("// Room colors behave like the avatar",a);
assert.ok(a>=0&&b>a);
const c={window:{},str:x=>String(x??""),arr:x=>Array.isArray(x)?x:[],h:x=>String(x)};
vm.runInNewContext(src.slice(a,b)+"window._testPhotoRoomAccents=photoRoomAccents;",c);
const fn=c.window._testPhotoRoomAccents,bounds={x:10,y:15,width:130,height:160};
function room(name,label,status){
 return fn("Second floor",{id:name,name:name+" bedroom",path:"M0 0H100V100H0Z",markers:[{kind:"bed",label,status}]},bounds);
}
test("illustration gets lavender bedding from saved bed description",()=>assert.match(room("bedroom","Bed · pale purple sheet","confirmed"),/#c8b2e8/));
test("dinosaur and blue bedding match saved bed descriptions",()=>{
 assert.match(room("bedroom","Bed","dinosaur-themed bedding"),/#a6c6a1/);
 assert.match(room("bedroom","Bed","light blue sheets"),/#a4cbe8/);
});
test("yellow cover and blue pillows with floral quilt are not replaced by generic pink",()=>{
 const art=room("bedroom","Bed","Yellow bedcover, blue pillows, white floral quilt");
 assert.match(art,/#e6c970/);
 assert.match(art,/#a7c8e6/);
 assert.match(art,/#fffaf1/);
});
test("unknown bedding remains neutral rather than assumed from name",()=>{
 assert.match(room("dolly","Chair under loft","status unknown"),/#c8b9d0/);
});
