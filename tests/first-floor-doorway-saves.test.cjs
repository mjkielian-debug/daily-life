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
 vm.runInNewContext(snippet+'\nwindow.editor=approvedDoorwayEditor;',ctx);
 return {ctx,cache,payload,filters,stats:()=>({submitted,readCount,writeCount,renderCount})};
}

test("one doorway movement saves a private patch and keeps all other room information",async()=>{
 const h=harness();
 h.ctx.window.houseVisualToggleDoorwayEditor();
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Move one doorway/);
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
 assert.match(h.ctx.window.editor(h.payload.zones,saved.doorwayAdjustments),/Doorway moved and saved/);
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

test("big steps move doorway drawings 96 units sideways without moving other rooms",async()=>{
 const h=harness();
 h.ctx.window.houseVisualToggleDoorwayEditor();
 const editor=h.ctx.window.editor(h.payload.zones,{});
 assert.match(editor,/Big moves/);
 assert.match(editor,/Fine-tune/);
 assert.match(editor,/Sideways/);
 assert.match(editor,/Up \/ down/);
 assert.match(editor,/houseVisualNudgeDoorway\(&#39;kitchen-bath&#39;,96,0\)/);
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",96,0);
 const saved=h.cache.get("user-1|First floor");
 assert.equal(saved.doorwayAdjustments["kitchen-bath"].x,96);
 assert.equal(saved.doorwayAdjustments["kitchen-bath"].y,0);
 assert.deepEqual(saved.zones.map(x=>x.id),h.payload.zones.map(x=>x.id));
 assert.equal(saved.notes,h.payload.notes);
});
test("new editor moves up and down beyond old one-axis limits",async()=>{
 const h=harness({existing:{"kitchen-dining":48}});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-dining",0,96);
 const saved=h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-dining"];
 assert.equal(saved.x,0);
 assert.equal(saved.y,144);
 assert.ok(saved.y>48);
});
test("two-axis reset returns a saved correction to its original illustration",async()=>{
 const h=harness({existing:{"kitchen-bath":{x:80,y:-120}}});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",0,0);
 const saved=h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"];
 assert.equal(saved.x,0);assert.equal(saved.y,0);
 assert.match(h.ctx.window.editor(h.payload.zones,h.cache.get("user-1|First floor").doorwayAdjustments),/Reset and saved/);
});
test("range slider saves absolute horizontal or vertical position after visual preview",async()=>{
 const h=harness({existing:{"kitchen-bath":8}});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualSetDoorwayAxis("kitchen-bath","x",-275);
 const saved=h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"];
 assert.equal(saved.x,-275);assert.equal(saved.y,8);
 const editor=h.ctx.window.editor(h.payload.zones,h.cache.get("user-1|First floor").doorwayAdjustments);
 assert.match(editor,/value="-275"/);
 assert.match(editor,/value="8"/);
});
test("unsaved new positions revert on failed writes",async()=>{
 const h=harness({existing:{"kitchen-bath":8},failWrite:true});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 await h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",96,-96);
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"],8);
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Not saved:/);
});

test("a big move is visibly previewed before the private save resolves",async()=>{
 const h=harness();
 h.ctx.window.houseVisualToggleDoorwayEditor();
 const saving=h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",96,-96);
 const pending=h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"];
 assert.equal(pending.x,96);assert.equal(pending.y,-96);
 assert.ok(h.stats().renderCount>=2);
 assert.match(h.ctx.window.editor(h.payload.zones,h.cache.get("user-1|First floor").doorwayAdjustments),/Saving doorway/);
 await saving;
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"].x,96);
});
test("failed cloud save rolls back a visible draft instead of claiming success",async()=>{
 const h=harness({existing:{"kitchen-bath":8},failWrite:true});
 h.ctx.window.houseVisualToggleDoorwayEditor();
 const saving=h.ctx.window.houseVisualNudgeDoorway("kitchen-bath",96,0);
 const draft=h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"];
 assert.equal(draft.x,96);assert.equal(draft.y,8);
 await saving;
 assert.equal(h.cache.get("user-1|First floor").doorwayAdjustments["kitchen-bath"],8);
 assert.match(h.ctx.window.editor(h.payload.zones,{}),/Not saved/);
});
