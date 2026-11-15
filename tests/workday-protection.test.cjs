"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","workday-protection.js"),"utf8");

function minutes(t){
 const p=/^(\d{2}):(\d{2})$/.exec(String(t||""));
 return p?Number(p[1])*60+Number(p[2]):null;
}
function setup(){
 const date="2026-11-16",otherDate="2026-11-17";
 const state={settings:{workdayHomeConfirmed:{}},tasks:[
   {date, title:"Clean kitchen",itineraryStart:"16:00"},
   {date:otherDate,title:"Fold laundry",itineraryStart:"16:00"}
 ],workShifts:[{date,start:"04:45",end:"09:30",deliveryStart:"09:42",deliveryEnd:"17:00"}]};
 let current="2026-11-16";
 const work={id:"work-1",source:"work",kind:"work",start:"04:45",end:"09:30",title:"UPS work"},
   pickup={id:"pickup",source:"pickup",start:"14:52",end:"15:15",title:"School pickup"},
   home={id:"house-1",source:"task",kind:"task",start:"16:00",end:"16:30",title:"Clean kitchen"},
   event={id:"fixed-1",source:"event",start:"15:00",title:"School appointment"};
 const context={window:{},state,
   itineraryFixedItems:()=>[Object.assign({},work),Object.assign({},pickup)],
   itineraryDayItems:()=>[Object.assign({},work),Object.assign({},pickup),Object.assign({},home),Object.assign({},event)],
   itineraryTaskPreferredRange:()=>({start:15*60,end:21*60}),
   itineraryAutoTaskBlocks:()=>[],
   itineraryRoutineWindow:()=>({start:16*60,end:20*60}),
   itineraryFitRoutines:()=>[],
   itineraryTaskMinutes:()=>30,
   itineraryDayEnd:()=>21*60+30,
   isUsualWorkday:()=>true,
   inferredWorkStartForDate:()=>({minutes:285}),
   hmMinutes:minutes,
   minutesHm:n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"),
   ymd:()=>current,render:()=>{},
   save:async()=>{},console,modal:()=>{},closeModal:()=>{}
 };
 vm.runInNewContext(src,context,{filename:"workday-protection.js"});
 return {context,state,date,otherDate,home};
}
test("confirmed late SSD route delays household tasks, not the school pickup",()=>{
 const x=setup(),c=x.context;
 assert.equal(c.window.dailyLifeHomeTaskStartMinutes(x.date),17*60+45);
 assert.equal(c.itineraryTaskPreferredRange({title:"Clean kitchen"},x.date).start,17*60+45);
 assert.equal(c.itineraryRoutineWindow({templateKey:"household-reset"},x.date).start,17*60+45);
 const visible=c.itineraryDayItems(x.date);
 assert.ok(visible.some(row=>row.id==="pickup"));
 assert.ok(visible.some(row=>row.id==="work-1"));
 assert.ok(visible.some(row=>row.id==="fixed-1"));
 assert.ok(!visible.some(row=>row.id==="house-1"),"unconfirmed arrival still hides home tasks");
});
test("home arrival confirmation overrides estimated commute for the day",()=>{
 const x=setup(),c=x.context;
 x.state.settings.workdayHomeConfirmed[x.date]=true;
 assert.equal(c.window.dailyLifeHomeTaskStartMinutes(x.date),15*60+30);
 assert.equal(c.itineraryTaskPreferredRange({title:"Clean kitchen"},x.date).start,15*60+30);
});
test("preload punch-out does not masquerade as finished SSD work",()=>{
 const x=setup(),c=x.context;
 x.state.workShifts[0].deliveryEnd="";
 assert.equal(c.window.dailyLifeHomeTaskStartMinutes(x.date),15*60+30);
 assert.equal(c.itineraryTaskPreferredRange({title:"Clean kitchen"},x.date).start,15*60+30);
});
test("auto-scheduler does not modify explicit task times for a different date",()=>{
 const x=setup(),c=x.context;
 c.itineraryAutoTaskBlocks(x.date,[]);
 assert.equal(x.state.tasks[0].itineraryStart,"16:00");
 assert.equal(x.state.tasks[1].itineraryStart,"16:00");
});
test("unusual late route gracefully eliminates home tasks beyond bedtime",()=>{
 const x=setup(),c=x.context;
 x.state.workShifts[0].deliveryEnd="23:30";
 assert.equal(c.window.dailyLifeHomeTaskStartMinutes(x.date),22*60);
 assert.equal(c.itineraryTaskPreferredRange({title:"Clean kitchen"},x.date),null);
});
