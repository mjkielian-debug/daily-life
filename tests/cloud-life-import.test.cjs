"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","cloud.js"),"utf8");
const a=src.indexOf("async function cloudPullLifeEntries(showAlert=false){"),
 b=src.indexOf("\ndocument.addEventListener(\"visibilitychange\"",a);
assert.ok(a>=0&&b>a,"ChatGPT import routine not found");
const importCode=src.slice(a,b)+"\nthis.pullLogs=cloudPullLifeEntries;";

function harness({failFetch=false,failSave=false,existing=false}={}){
 const original={settings:{appliedCloudEntryIds:existing?["item-1"]:[]},waterLogs:existing?[{id:"log-old",cloudEntryId:"item-1",oz:26,date:"2026-11-15"}]:[],tasks:[],pets:[]};
 const locals=new Map(),rows=[{id:"item-1",category:"water",source:"chatgpt",local_date:"2026-11-15",payload:{oz:26}}];
 let persisted=null,pushCalls=0,renders=0,saveCalls=0;
 const ctx={
  state:original,cloudEntryPullBusy:false,cloudError:"",cloudClient:{
   from:()=>({
     select(){return this},eq(){return this},order(){return this},
     async range(){if(failFetch)throw new Error("Temporary network error");return {data:rows,error:null}}
   })
  },
  cloudUser:()=>({id:"test-owner"}),
  cloudEntryAlreadyApplied:id=>ctx.state.settings.appliedCloudEntryIds.includes(id),
  cloudApplyLifeEntry:row=>{ctx.state.waterLogs.push({id:"new",cloudEntryId:row.id,oz:row.payload.oz,date:row.local_date});return true},
  cloudMarkEntryApplied:id=>ctx.state.settings.appliedCloudEntryIds.push(id),
  dbSet:async(_key,value)=>{saveCalls++;if(failSave)throw new Error("Device storage full");persisted=value},
  cloudSchedulePush:()=>{pushCalls++},
  render:()=>{renders++},structuredClone,
  cloudMetaKey:key=>"test:"+key,
  localStorage:{setItem:(key,value)=>locals.set(key,value),getItem:key=>locals.get(key)},
  alert:()=>{},console,Date
 };
 vm.runInNewContext(importCode,ctx,{filename:"cloud-life-import"});
 return {ctx,original,locals,read:()=>ctx.pullLogs(),persisted:()=>persisted,saveCalls:()=>saveCalls,pushCalls:()=>pushCalls,renders:()=>renders};
}
test("a successful chat import persists an entire batch and a real imported count",async()=>{
 const h=harness();
 assert.equal(await h.read(),1);
 assert.notEqual(h.ctx.state,h.original);
 assert.equal(h.persisted(),h.ctx.state);
 assert.equal(h.ctx.state.waterLogs[0].oz,26);
 assert.equal(h.ctx.state.settings.appliedCloudEntryIds[0],"item-1");
 assert.equal(h.locals.get("test:lastLifePullCount"),"1");
 assert.equal(h.pushCalls(),1);
});
test("a failed device save reverts imported changes and does not fake sync",async()=>{
 const h=harness({failSave:true});
 assert.equal(await h.read(),0);
 assert.equal(h.ctx.state,h.original);
 assert.equal(h.original.waterLogs.length,0);
 assert.equal(h.original.settings.appliedCloudEntryIds.length,0);
 assert.equal(h.locals.has("test:lastLifePull"),false);
 assert.equal(h.pushCalls(),0);
 assert.match(h.ctx.cloudError,/Device storage full/);
});
test("a failed remote read doesn't write a partially imported batch",async()=>{
 const h=harness({failFetch:true});
 assert.equal(await h.read(),0);
 assert.equal(h.ctx.state,h.original);
 assert.equal(h.saveCalls(),0);
});
test("already imported entries are not duplicated",async()=>{
 const h=harness({existing:true});
 assert.equal(await h.read(),0);
 assert.equal(h.ctx.state,h.original);
 assert.equal(h.ctx.state.waterLogs.length,1);
 assert.equal(h.saveCalls(),0);
 assert.equal(h.locals.get("test:lastLifePullCount"),"0");
});
