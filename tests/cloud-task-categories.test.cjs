"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","cloud.js"),"utf8");
const begin=source.indexOf("function cloudApplyLifeEntry(row){");
const finish=source.indexOf("\n}\n\nasync function cloudResizePantryPhoto",begin);
assert.ok(begin>=0&&finish>begin,"Cloud task importer routine not found");
const importCode=source.slice(begin,finish+2)+"\nthis.apply=cloudApplyLifeEntry;";

function setup(tasks){
 const ctx={
  state:{tasks:structuredClone(tasks)},cloudEntryAlreadyApplied:()=>false,
  uid:()=>"new-record",ymd:()=>"2026-11-15",
  Date,console
 };
 vm.runInNewContext(importCode,ctx,{filename:"cloud-task-import"});
 const apply=(id,payload,date="2026-11-15")=>ctx.apply({
  id,category:"task",payload,local_date:date,created_at:date+"T12:00:00Z"
 });
 return {ctx,apply};
}
test("generic ChatGPT task updates completion but do not recategorize an existing relationship task",()=>{
 const h=setup([{id:"scheduled",date:"2026-11-15",title:"Wrap presents",category:"family",child:"",done:false}]);
 assert.equal(h.apply("cloud-1",{title:"Wrap presents",category:"life",done:true}),true);
 assert.equal(h.ctx.state.tasks.length,1);
 assert.equal(h.ctx.state.tasks[0].category,"family");
 assert.equal(h.ctx.state.tasks[0].done,true);
 assert.equal(h.ctx.state.tasks[0].cloudEntryId,"cloud-1");
});
test("confirmed specific category improves an otherwise generic task",()=>{
 const h=setup([{id:"scheduled",date:"2026-11-15",title:"Plan niece gifts",category:"life",child:"",done:false}]);
 h.apply("cloud-2",{title:"Plan niece gifts",category:"family"});
 assert.equal(h.ctx.state.tasks.length,1);
 assert.equal(h.ctx.state.tasks[0].category,"family");
});
test("deduping one child's recurring chore never deletes other dates or children",()=>{
 const originals=[
  {id:"leo-today",date:"2026-11-15",title:"Brush teeth",category:"family",child:"Leo",done:false},
  {id:"dolly-today",date:"2026-11-15",title:"Brush teeth",category:"family",child:"Dolly",done:false},
  {id:"leo-tomorrow",date:"2026-11-16",title:"Brush teeth",category:"family",child:"Leo",done:false},
  {id:"leo-duplicate",date:"2026-11-15",title:"Brush teeth",category:"life",child:"Leo",done:false}
 ];
 const h=setup(originals);
 h.apply("cloud-3",{title:"Brush teeth",child:"Leo",category:"life",dedupeMatching:true,done:true});
 const tasks=h.ctx.state.tasks;
 assert.equal(tasks.length,3);
 assert.ok(tasks.some(x=>x.id==="dolly-today"&&!x.done));
 assert.ok(tasks.some(x=>x.id==="leo-tomorrow"&&!x.done));
 const leo=tasks.find(x=>x.date==="2026-11-15"&&x.child==="Leo");
 assert.equal(leo.category,"family");
 assert.equal(leo.done,true);
});
test("a new confirmed task uses its reviewed category",()=>{
 const h=setup([]);
 h.apply("cloud-4",{title:"Check SSD odometer",category:"work"});
 assert.equal(h.ctx.state.tasks.length,1);
 assert.equal(h.ctx.state.tasks[0].category,"work");
});
