"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
const a=source.indexOf("function approvedOverviewRoom("),b=source.indexOf("function approvedDollhouseRoomZoom(",a);
assert.ok(a>=0&&b>a);
const slices=source.slice(a,b);
const specs={
 kitchen:{path:"M32 407H573V899H333V908H32Z",cx:301,cy:634,badge:[512,852]},
 bath:{path:"M578 409H805V713H578Z",cx:692,cy:558,badge:[717,430]},
 dining:{path:"M580 713H806V1064H580Z",cx:693,cy:883,badge:[718,742]},
 living:{path:"M326 1063H807V1400H326Z",cx:565,cy:1232,badge:[727,1091]},
 playroom:{path:"M30 1147H326V1400H30Z",cx:177,cy:1272,badge:[252,1169]},
 basement_stairs:{path:"M31 906H316V1148H31Z",cx:171,cy:1024,badge:[240,929]},
 stairs_up:{path:"M320 900H581V1065H320Z",cx:451,cy:985,badge:[500,924]}
};
const calls=[];
const ctx={
 window:{houseRealismRoomArtwork:()=>{throw Error("overview must not render detailed furniture")}},
 approvedDollhouseRooms:specs,approvedDollhouseAsset:"assets/approved-dollhouse-first-floor.png?v=20261114-approved1",
 roomTaskColorStats:(f,z)=>z.id==="living"?{total:3,done:1}:{total:0,done:0},
 approvedDollhouseProgressArt:(f,z)=>{calls.push(z.id);return "<kitchen-progress/>"},
 approvedDollhouseCountBadge:()=>"<kitchen-badge/>",
 correctedStairArtwork:()=>{throw Error("overview must not draw extra stairs")},
 approvedDollhouseObjectHotspots:()=>{throw Error("overview must not draw furniture plus buttons")},
 zoneBounds:()=>({x:10,y:10,width:120,height:180}),
 localRoom:()=>null,houseCareFill:()=>"<house-progress/>",
 arr:x=>Array.isArray(x)?x:[],okId:()=>true,str:String,color:()=>"#cf88af",
 h:x=>String(x).replace(/&/g,"&amp;").replace(/"/g,"&quot;"),
 act:(f,z)=>"houseVisualOpenZone('"+f+"','"+z.id+"')"
};
vm.runInNewContext(slices+"window.renderOverview=approvedDollhouseMap;window.surface=approvedOverviewRoom;",ctx);
test("main map retains approved kitchen but omits extra furniture, stair art and plus buttons",()=>{
 const html=ctx.window.renderOverview("First floor",{zones:Object.keys(specs).map(id=>({id,name:id}))},"legacy");
 assert.match(html,/assets\/approved-dollhouse-first-floor\.png/);
 assert.match(html,/kitchen-progress/);
 assert.match(html,/reveal|surfaces|hvm-overview-floor-surface/);
 assert.doesNotMatch(html,/hvm-room-illustrated-object|hvm-drawn-object-hotspot|hvm-corrected-stair-art/);
 assert.equal(calls.join(","),"kitchen");
 assert.equal((html.match(/class="hvm-approved-room"/g)||[]).length,7);
});
test("six non-kitchen zones have clear, named, readable tap targets",()=>{
 const html=ctx.window.renderOverview("First floor",{zones:Object.keys(specs).map(id=>({id,name:id}))},"");
 for(const name of ["Bathroom","Dining room","Living room","Playroom","↓ Basement","↑ Second floor"])assert.ok(html.includes(name),name);
 assert.equal((html.match(/class="hvm-overview-label"/g)||[]).length,6);
 assert.match(html,/1 of 3 tasks done/);
 assert.match(html,/Tap to open/);
});
test("furniture detail functions remain available, but stay outside the overview rendering function",()=>{
 assert.match(source,/function approvedDollhouseRoomZoom\(f,z\)/);
 assert.match(source,/window\.houseRealismRoomArtwork\(f,z,config,stats,true,/);
 assert.match(source,/function approvedDollhouseObjectHotspots\(f,z\)/);
 assert.match(source,/function correctedStairArtwork\(\)/);
 assert.doesNotMatch(slices,/correctedStairArtwork\(\)\+/);
});
