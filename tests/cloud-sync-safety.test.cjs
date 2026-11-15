"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","cloud.js"),"utf8");

function section(a,b){
 const start=src.indexOf(a),end=src.indexOf(b,start);
 assert.ok(start>=0&&end>start,"Missing cloud section "+a);
 return src.slice(start,end);
}
test("assistant patch paths reject prototype pollution while retaining normal edits",()=>{
 const code=section("const cloudUnsafePatchKeys=","function cloudApplyAssistantPatches(");
 const ctx={};vm.runInNewContext(code+"\nthis.patches=cloudAssistantPatches;",ctx);
 const result=ctx.patches({settings:{assistantSyncPatches:[
  {id:"safe",path:["settings","itinerary","workWeekdays"],value:[1,2,3]},
  {id:"unsafe",path:["settings","__proto__","compromised"],value:true},
  {id:"constructor",path:["constructor","prototype"],value:{}},
  {id:"badfields",collection:"tasks",recordId:"x",fields:JSON.parse('{"__proto__":{"admin":true}}')}
 ]}});
 assert.deepEqual(Array.from(result,x=>x.id),["safe"]);
 assert.equal({}.compromised,undefined);
});
function polling(clean){
 const code=section("let cloudAssistantPatchPollTimer=null;","function cloudStartAssistantPatchPolling()");
 const state={settings:{appliedAssistantSyncPatchIds:[]},tasks:[{id:"local"}]};
 let lastPushSet=0,lastSignatureSet=0,loadedRemote=0,archived=0,rendered=0;
 const storage=new Map();
 const ctx={
  state,window:{},cloudClient:{},cloudNeedsReview:false,cloudAutoCanPush:true,cloudError:"",
  cloudUser:()=>({id:"test-user"}),cloudAutoEnabled:()=>true,
  cloudReadRemoteSnapshot:async()=>({updated_at:"2026-11-15T09:30:00.000Z",state:{settings:{assistantSyncPatches:[{id:"new1"}]}}}),
  cloudAssistantPatches:s=>s.settings.assistantSyncPatches,
  cloudLastSignature:()=>"persisted",
  cloudStateSignature:()=>clean?"persisted":"changed-locally",
  cloudApplyAssistantPatches:remote=>{
   state.tasks.push({id:"assistant-entry"});
   state.settings.appliedAssistantSyncPatchIds.push(remote.settings.assistantSyncPatches[0].id);
   return 1;
  },
  cloudUseRemoteSnapshot:async()=>{loadedRemote++},
  cloudArchiveRemoteSnapshot:async()=>{archived++},
  cloudMetaKey:key=>"key:"+key,
  cloudSetLastPushed:()=>{lastPushSet++},
  cloudSetLastSignature:()=>{lastSignatureSet++},
  localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},
  render:()=>{rendered++},
  structuredClone,console
 };
 vm.runInNewContext(code+"\nthis.poll=cloudPollAssistantPatches;",ctx,{filename:"cloud-sync-poll"});
 return {ctx,state,poll:()=>ctx.poll(),storage,counts:()=>({lastPushSet,lastSignatureSet,loadedRemote,archived,rendered})};
}
test("new assistant updates plus unsynced changes require review rather than false sync",async()=>{
 const h=polling(false);
 await h.poll();
 assert.equal(h.state.tasks.length,2);
 assert.equal(h.ctx.cloudNeedsReview,true);
 assert.equal(h.ctx.cloudAutoCanPush,false);
 assert.equal(h.counts().lastPushSet,0);
 assert.equal(h.counts().lastSignatureSet,0);
 assert.equal(h.counts().archived,1);
 assert.ok(h.storage.get("key:pendingConflictAt"));
});
test("clean device can pull confirmed assistant updates without conflict",async()=>{
 const h=polling(true);
 await h.poll();
 assert.equal(h.counts().loadedRemote,1);
 assert.equal(h.ctx.cloudNeedsReview,false);
});
test("cloud upload records the uploaded signature, not edits made while saving",async()=>{
 const code=section("async function cloudPushSnapshotInternal(","async function cloudCreateFirstBackup()");
 let finishWrite,uploaded=null,storedSig="",followUp=0;
 const ctx={
  window:{},state:{counter:1,version:1},
  cloudRecoveryRequired:false,DAILY_LIFE_BUILD:"test-release",
  fetch:async()=>({ok:true,json:async()=>({build:"test-release"})}),
  URL,Date,location:{href:"https://example.test/daily-life/"},
  cloudUser:()=>({id:"owner-1"}),cloudClient:{from:()=>({upsert:payload=>{
    uploaded=payload;return new Promise(resolve=>{finishWrite=resolve});
  }})},
  cloudEnsureProfile:async()=>{},
  cloudStateForUpload:()=>({counter:ctx.state.counter}),
  cloudStateSignature:()=>String(ctx.state.counter),
  cloudSetLastPushed:()=>{},
  cloudSetLastSignature:v=>{storedSig=v},
  cloudSchedulePush:()=>{followUp++},
  cloudNeedsReview:false,cloudAutoCanPush:true,cloudError:"",render:()=>{}
 };
 vm.runInNewContext(code+"\nthis.upload=cloudPushSnapshotInternal;",ctx,{filename:"cloud-upload"});
 const task=ctx.upload(true);
 for(let i=0;i<12&&!finishWrite;i++)await Promise.resolve();
 assert.ok(finishWrite,"Cloud write must reach its asynchronous boundary");
 assert.equal(uploaded.state.counter,1);
 ctx.state.counter=2;
 finishWrite({error:null});
 assert.equal(await task,true);
 assert.equal(storedSig,"1","A newer local edit must not be falsely marked as uploaded");
 assert.equal(followUp,1,"The newer local change should be queued for a future sync");
});
test("sync display checks the persisted content signature",()=>{
 const status=fs.readFileSync(path.join(__dirname,"..","sync-status.js"),"utf8");
 assert.match(status,/signaturePending/);
 assert.match(status,/cloudStateSignature\(\)!==cloudLastSignature\(\)/);
});
