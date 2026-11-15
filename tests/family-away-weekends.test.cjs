"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
function extract(start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"cannot find "+start);
 return src.slice(a,b);
}
function app(){
 const state={settings:{familyMembers:["Leo","Demitri","Dolly","Ambrose"],
  dailyKidBasics:["Clean room","Read 20 min"],
  choreRotations:[{members:["Leo","Demitri"],chores:["Laundry","Dishes"],anchorDate:"2026-10-05"}]},
  chores:[{id:"old-dolly",date:"2026-11-15",child:"Dolly",chore:"Counters",generated:"rotation",done:false},
    {id:"manual",date:"2026-11-15",child:"Michelle",chore:"Laundry",done:false}],
  dailyReviews:[]};
 let ids=0;
 const context={state,window:{},ymd:()=>"2026-11-15",uid:()=>"chore-"+(++ids),save:async()=>{},render:()=>{},Date};
 vm.runInNewContext(extract("function dateDayIndex(date){","function ensureRecurringFamilyEvents(){"),context);
 return {state,context};
}
test("the usual away weekend does not assign children Saturday or Sunday",()=>{
 const {state,context}=app();
 assert.equal(context.familyKidsHomeForChores("2026-11-14"),false);
 assert.equal(context.familyKidsHomeForChores("2026-11-15"),false);
 context.ensureFamilyDay("2026-11-15");
 assert.equal(state.chores.length,1);
 assert.equal(state.chores[0].id,"manual");
});
test("weekday generated chores still rotate normally",()=>{
 const {state,context}=app();
 assert.equal(context.familyKidsHomeForChores("2026-11-16"),true);
 context.ensureFamilyDay("2026-11-16");
 assert.equal(state.chores.filter(x=>x.date==="2026-11-16"&&x.generated==="daily-basics").length,8);
 assert.equal(state.chores.filter(x=>x.date==="2026-11-16"&&x.generated==="rotation").length,2);
});
test("a confirmed change in custody can temporarily restore that day's generated chores",async()=>{
 const {state,context}=app();
 await context.window.familySetKidsHomeForChores("2026-11-15",true);
 assert.equal(context.familyKidsHomeForChores("2026-11-15"),true);
 assert.ok(state.chores.some(x=>x.date==="2026-11-15"&&x.child==="Leo"));
 await context.window.familySetKidsHomeForChores("2026-11-15",false);
 assert.equal(context.familyKidsHomeForChores("2026-11-15"),false);
 assert.ok(!state.chores.some(x=>x.date==="2026-11-15"&&x.child==="Leo"));
});
test("an N/A child chore is retained as history, never counted as newly generated work",()=>{
 const {state,context}=app();
 state.dailyReviews.push({kind:"chore",key:"old-dolly",date:"2026-11-15",status:"na"});
 context.ensureFamilyDay("2026-11-15");
 assert.ok(state.chores.some(x=>x.id==="old-dolly"));
 assert.equal(state.chores.find(x=>x.id==="old-dolly").done,false);
 assert.match(src,/if\(\(c\.generated==="daily-basics"\|\|c\.generated==="rotation"\)&&!familyKidsHomeForChores\(date\)\)continue/);
});
test("N/A does not mark a chore complete or preserve an old completion timestamp",async()=>{
 const state={chores:[{id:"a",date:"2026-11-15",chore:"Counters",done:true,completedAt:"old"}],tasks:[],selfCare:[]};
 const context={state,uid:()=>"review-1",dailyReviewExpected:()=>[{kind:"chore",key:"a",label:"Counters",group:"Chores"}],dailyReviewSet:(kind,key,date,status)=>{state.answer=status},save:async()=>{},render:()=>{}};
 vm.runInNewContext(extract("async function applyDailyReview(kind,key,date,status,openReviewAfter=true){","function dailyReviewSteps(item){"),context);
 await context.applyDailyReview("chore","a","2026-11-15","na",false);
 assert.equal(state.chores[0].done,false);
 assert.equal(state.chores[0].completedAt,"");
 assert.equal(state.answer,"na");
 await context.applyDailyReview("chore","a","2026-11-15","yes",false);
 assert.equal(state.chores[0].done,true);
 assert.equal(state.answer,"yes");
});
