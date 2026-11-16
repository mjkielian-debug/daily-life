"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","life-map.js"),"utf8");
test("room-only review detection matches generated tasks, not manual or family chores",()=>{
 const a=source.indexOf("function lifeMapIsRoomOnlyReview("),b=source.indexOf("function lifeMapReviewPanel(",a);
 assert.ok(a>=0&&b>a);
 const ctx={state:{tasks:[{id:"a",generated:"room-daily"},{id:"b",generated:"manual"}]},list:x=>Array.isArray(x)?x:[]};
 vm.runInNewContext(source.slice(a,b),ctx);
 assert.equal(ctx.lifeMapIsRoomOnlyReview({kind:"task",key:"a"}),true);
 assert.equal(ctx.lifeMapIsRoomOnlyReview({kind:"task",key:"b"}),false);
 assert.equal(ctx.lifeMapIsRoomOnlyReview({kind:"chore",key:"a"}),false);
});
test("Home keeps room resets behind their map, without hiding task records",()=>{
 assert.match(source,/t\.generated!=="room-daily"/);
 assert.match(source,/areaSelection==="home"&&t\.generated==="room-daily"/);
 assert.match(source,/roomResetOpen/);
 assert.match(source,/lifeMapJump\(&#39;house&#39;\)/);
});
test("general check-ins no longer surface room-specific generated tasks twice",()=>{
 assert.match(source,/item\.status==="unknown"&&!lifeMapIsRoomOnlyReview\(item\)/);
});
