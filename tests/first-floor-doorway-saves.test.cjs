"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
const from=source.indexOf("const approvedDoorwayLimits=");
const to=source.indexOf("function approvedDollhouseMap(",from);
assert.ok(from>=0&&to>from,"owner doorway control and helpers must exist");
const snippet=source.slice(from,to);

function harness(options={}){
 const zones=["kitchen","bath","dining","living","playroom","stairs_up"].map(id=>({id}));
 const payload={zones,notes:"Do not lose private room notes",doorwayAdjustments:{...options.existing}};
 const cache=new Map([["user-1|First floor",payload]]);
 let readCount=0,writeCount=0,submitted=null;
 let filters=[],renderCount=0;
 const client={from(table){
  assert.equal(table,"life_entries");
  const request={};
  request.select=function(fields){this.fields=fields;return this};
  request.eq=function(field,value){filters.push([field,value]);return this};
  request.update=function(value){submitted=value;writeCount++;return this};
  request.maybeSingle=async function(){
   if(this.fields==="id,payload,updated_at"){
    readCount++;
    return {data:{id:"test-floor-record",payload:{...payload,doorwayAdjustments:{...options.existing}},updated_at:"2026-11-18T11:30:00Z"},error:null}
   }
   assert.equal(this.fields,"id");
   return options.failWrite?{data:null,error:new Error("Simulated save failure")}:
    options.staleWrite?{data:null,error:null}:
    {data:{id:"test-floor-record"},error:null}
  };
  return request;
 }};
 const ctx={
  window:{},arr:x=>Array.isArray(x)?x:[],h:x=>String(x),
  get:f=>cache.get("user-1|"+f),key:f=>"user-1|"+f,
  online:()=>true,who:()=>({id:"user-1"}),
  paint:()=>renderCount++,str:String,cache,cloudClient:client
 };
 vm.runInNewContext(snippet,ctx);
 return {ctx,cache,payload,filters,stats:()=>({submitted,readCount,writeCount,renderCount})};
}

test("one doorway movement saves a private patch and keeps all other room information",async()=>{
 const h=harness();
 h.ctx.window.houseVisualToggleDoorwayEditor();
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/One doorway at a time/);
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",-8);
 const saved=h.cache.get("user-1|First floor");
 assert.equal(saved.doorwayAdjustments["kitchen-bath"],-8);
 assert.equal(saved.notes,h.payload.notes);
 assert.deepEqual(saved.zones.map(z=>z.id),h.payload.zones.map(z=>z.id));
 assert.equal(h.stats().readCount,1);
 assert.equal(h.stats().writeCount,1);
 assert.equal(h.stats().submitted.payload.doorwayAdjustments["kitchen-bath"],-8);
 assert.ok(h.filters.some(([k,v])=>k==="owner_user_id"&&v==="user-1"));
 assert.ok(h.filters.some(([k,v])=>k==="updated_at"&&v==="2026-11-18T11:30:00Z"));
 assert.match(h.ctx.window.editor(h.payload.zones,saved.doorwayAdjustments),/Saved doorway position/);
});
test("failed save leaves original offsets intact and reports failure",async()=>{
 const h=harness({existing:{"kitchen-bath":8},failWrite:true});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",8);
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"],8);
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Not saved: Simulated save failure/);
});
test("zero updated rows are not reported as a saved doorway",async()=>{
 const h=harness({staleWrite:true});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",8);
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"],undefined);
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Not saved:/);
});
test("reset sends an offset of zero and non-editable ids cannot be used",async()=>{
 const h=harness({existing:{"kitchen-bath":16}});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",0);
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"],0);
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Reset and saved/);
 const count=h.stats().writeCount;
 await h.ctx.window.houseVisualNudgeDoorway("not-a-door",8);
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",99999);
 assert.equal(h.stats().writeCount,count);
});
