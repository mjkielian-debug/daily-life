"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const file=fs.readFileSync(path.join(__dirname,"..","workday-focus.js"),"utf8");
const dates=["2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14"];
function harness(){
 const entry={id:"actual-11",date:"2026-11-11",start:"04:45",end:"09:31",scheduled:"04:45",ssdHours:4.25,ssdMiles:23,notes:"Actual punch"};
 const state={settings:{itinerary:{workScheduleOverrides:{},workScheduleReviews:{}}},workShifts:[entry]};
 const inputs=new Map();
 for(let i=0;i<7;i++){
  inputs.set("weeklyWorkday"+i,{checked:i===3});
  inputs.set("weeklyWorkStart"+i,{value:i===3?"04:45":""});
 }
 let fail=false,closeCalls=0,lastError="",renderCalls=0;
 const context={window:{},state,console,
   ymd:()=>"2026-11-11",uid:()=>"new-shift",
   workShiftHasActual:w=>!!(w.start||w.end||Number(w.officialHours||0)>0),
   save:async()=>{if(fail)throw new Error("storage offline")},
   modal:(title)=>{lastError=title},
   closeModal:()=>{closeCalls++},render:()=>{renderCalls++},
   document:{readyState:"loading",getElementById:id=>inputs.get(id)||null,querySelector:()=>null,addEventListener:()=>{}}
 };
 vm.runInNewContext(file,context,{filename:"workday-focus.js"});
 return {state,inputs,actions:context.window,setFail:v=>fail=v,
   getClose:()=>closeCalls,getError:()=>lastError,getRenders:()=>renderCalls};
}
test("clearing a planned start truly clears only scheduled time",async()=>{
 const x=harness();
 x.inputs.get("weeklyWorkStart3").value="";
 assert.equal(await x.actions.saveWeeklyWorkSchedule("2026-11-08",dates),true);
 const w=x.state.workShifts.find(y=>y.date==="2026-11-11");
 assert.equal(w.scheduled,"");
 assert.equal(w.start,"04:45");
 assert.equal(w.end,"09:31");
 assert.equal(w.ssdHours,4.25);
 assert.equal(w.ssdMiles,23);
 assert.equal(x.state.settings.itinerary.workScheduleOverrides["2026-11-11"].workday,true);
 assert.equal(x.getClose(),1);
});
test("unchecked day preserves genuine shift records",async()=>{
 const x=harness();
 x.inputs.get("weeklyWorkday3").checked=false;
 assert.equal(await x.actions.saveWeeklyWorkSchedule("2026-11-08",dates),true);
 const w=x.state.workShifts.find(y=>y.date==="2026-11-11");
 assert.equal(w.start,"04:45");
 assert.equal(w.end,"09:31");
 assert.equal(w.ssdMiles,23);
 assert.equal(x.state.settings.itinerary.workScheduleOverrides["2026-11-11"].workday,false);
});
test("failed weekly save restores full previous work schedule",async()=>{
 const x=harness(),beforeSettings=x.state.settings,beforeShifts=x.state.workShifts;
 x.inputs.get("weeklyWorkStart3").value="06:00";x.setFail(true);
 assert.equal(await x.actions.saveWeeklyWorkSchedule("2026-11-08",dates),false);
 assert.equal(x.state.settings,beforeSettings);
 assert.equal(x.state.workShifts,beforeShifts);
 assert.equal(x.state.workShifts[0].scheduled,"04:45");
 assert.equal(x.state.settings.itinerary.workScheduleReviews["2026-11-08"],undefined);
 assert.equal(x.getClose(),0);
 assert.match(x.getError(),/Could not save weekly schedule/);
});
test("failed midweek confirmation does not claim to be confirmed",async()=>{
 const x=harness(),before=x.state.settings;
 x.setFail(true);
 assert.equal(await x.actions.markWeeklyScheduleAccurate("2026-11-08"),false);
 assert.equal(x.state.settings,before);
 assert.equal(x.state.settings.itinerary.workScheduleReviews["2026-11-08"],undefined);
});
test("missing form fields never partially update the schedule",async()=>{
 const x=harness(),old=x.state.settings;
 x.inputs.delete("weeklyWorkStart4");
 assert.equal(await x.actions.saveWeeklyWorkSchedule("2026-11-08",dates),false);
 assert.equal(x.state.settings,old);
});
