"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const a=html.indexOf("function ensureCatsFleaMonthlyReminder(){"),b=html.indexOf("function ensureToday(){",a);
assert.ok(a>=0&&b>a);
function load(state){
 const ctx={state};
 vm.runInNewContext(html.slice(a,b),ctx);
 return ctx;
}
test("already-treated November cats get active December 1 task and monthly-first rule",()=>{
 const state={settings:{recurringTasks:[]},tasks:[{id:"old",title:"Cats · Monthly flea treatment",date:"2026-11-15",done:false,paused:true,duplicateHidden:true}]};
 const ctx=load(state);assert.equal(ctx.ensureCatsFleaMonthlyReminder(),true);
 const task=state.tasks[0],rule=state.settings.recurringTasks[0];
 assert.equal(task.date,"2026-12-01");assert.equal(task.paused,false);assert.equal(task.duplicateHidden,false);
 assert.equal(task.done,false);assert.equal(rule.recurrence,"monthly");assert.equal(rule.dayOfMonth,1);
 assert.equal(state.settings.petFleaReminderMigrationVersion,2);
});
test("repair does not repeatedly generate rules or undo later intentional pauses",()=>{
 const state={settings:{recurringTasks:[]},tasks:[{id:"old",title:"Cats · Monthly flea treatment",date:"2026-11-15",done:false,paused:true,duplicateHidden:true}]};
 const ctx=load(state);ctx.ensureCatsFleaMonthlyReminder();
 state.tasks[0].paused=true;
 assert.equal(ctx.ensureCatsFleaMonthlyReminder(),false);
 assert.equal(state.tasks[0].paused,true);
 assert.equal(state.settings.recurringTasks.length,1);
});
test("normal December 1 task does not lose a completion when migration runs",()=>{
 const state={settings:{recurringTasks:[]},tasks:[{id:"new",title:"Cats · Monthly flea treatment",date:"2026-12-01",done:true,paused:false}]};
 const ctx=load(state);ctx.ensureCatsFleaMonthlyReminder();
 assert.equal(state.tasks[0].done,true);
 assert.equal(state.tasks[0].date,"2026-12-01");
});
