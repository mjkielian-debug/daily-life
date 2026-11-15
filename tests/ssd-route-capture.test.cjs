"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const script=fs.readFileSync(path.join(__dirname,"..","ssd-route-capture.js"),"utf8");
function setup(){
 const state={workShifts:[{id:"original",date:"2026-11-12",start:"04:45",end:"09:30",scheduled:"04:45",ssdHours:"",ssdMiles:"",notes:"Actual preload punches"}]};
 let form={},handler=null,saved=0,closed=0,message="",fail=false;
 for(const [id,value] of Object.entries({
  ssdRouteDate:"2026-11-12",ssdRouteText:"",
  ssdRouteStart:"09:42",ssdRouteEnd:"13:59",
  ssdRouteOdoStart:"91372",ssdRouteOdoEnd:"91395",
  ssdRouteHours:"",ssdRouteMiles:""
 })){form[id]={value,addEventListener:()=>{},style:{},textContent:""}}
 form.ssdRouteParse={addEventListener:()=>{}};
 form.ssdRoutePreview={style:{},textContent:""};
 const ctx={window:{},state,console,
   document:{getElementById:id=>form[id]||null},
   uid:()=>"new-route",ymd:()=>"2026-11-12",
   modal:(_title,_body,_label,callback)=>{handler=callback},
   save:async()=>{if(fail)throw Error("Cannot save");saved++},
   render:()=>{},closeModal:()=>{closed++},alert:value=>{message=value}
 };
 vm.runInNewContext(script,ctx,{filename:"ssd-route-capture.js"});
 return {ctx,state,form,run:()=>handler(),open:()=>ctx.window.openSSDRouteQuickLog("2026-11-12"),
   setFail:value=>fail=!!value,saved:()=>saved,closed:()=>closed,message:()=>message};
}
test("parses time and odometer shorthand without inventing hours",()=>{
 const p=setup().ctx.window.dailyLifeSSDRouteParsing;
 const parsed=p.parseText("Thursday 9:42 to 13:59. Odometer 91372 to 91395");
 assert.equal(parsed.start,"09:42");assert.equal(parsed.end,"13:59");
 assert.equal(parsed.odoStart,"91372");assert.equal(parsed.odoEnd,"91395");
 const result=p.calculate({...parsed,hours:"",miles:""});
 assert.equal(result.odometerMiles,23);assert.equal(result.elapsed,4.28);
 assert.equal(result.hours,null);
});
test("rejects reversed odometers and overlapping/partial times",()=>{
 const p=setup().ctx.window.dailyLifeSSDRouteParsing;
 assert.match(p.calculate({start:"13:59",end:"09:42",odoStart:"91372",odoEnd:"91395"}).error,/later/);
 assert.match(p.calculate({start:"09:42",end:"13:59",odoStart:"91395",odoEnd:"91372"}).error,/smaller/);
 assert.match(p.calculate({start:"09:42"}).error,/both SSD delivery times/);
 assert.match(p.calculate({odoStart:"91372"}).error,/both odometer/);
});
test("route save computes miles while preserving preload punches",async()=>{
 const x=setup();x.open();await x.run();
 const s=x.state.workShifts[0];
 assert.equal(s.start,"04:45");assert.equal(s.end,"09:30");assert.equal(s.scheduled,"04:45");
 assert.equal(s.deliveryStart,"09:42");assert.equal(s.deliveryEnd,"13:59");
 assert.equal(s.ssdOdometerStart,91372);assert.equal(s.ssdOdometerEnd,91395);
 assert.equal(s.ssdMiles,23);assert.equal(s.ssdHours,"");
 assert.equal(x.saved(),1);assert.equal(x.closed(),1);
});
test("failed route save restores all shift records",async()=>{
 const x=setup(),before=x.state.workShifts;
 x.open();x.setFail(true);await x.run();
 assert.equal(x.state.workShifts,before);
 assert.equal(x.state.workShifts[0].ssdMiles,"");
 assert.equal(x.closed(),0);assert.match(x.message(),/did not save/);
});
test("duplicate route saves update the existing day instead of adding a new shift",async()=>{
 const x=setup();x.open();await x.run();
 x.open();await x.run();
 assert.equal(x.state.workShifts.length,1);
});
