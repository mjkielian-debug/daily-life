"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const cloud=fs.readFileSync(path.join(__dirname,"../cloud.js"),"utf8");

function extract(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,`Missing function block: ${start}`);
 return html.slice(a,b);
}
test("oil mileage tracking appears on the existing vehicle screen",()=>{
 assert.match(html,/vehicleMileageStatusCard\(v,maintenance\.oil\)/);
 assert.match(html,/reconcileVehicleOdometerFromSSD\(\);ensurePeopleProfiles\(\);ensureToday\(\)/);
 assert.match(html,/oilIntervalMonths/);
});
test("confirmed SSD route end odometer advances car mileage without counting route miles alone",()=>{
 const code=extract("function reconcileVehicleOdometerFromSSD(){","function vehicleMileageStatusCard(");
 const vehicle={mileage:91509};
 const context={state:{workShifts:[
  {date:"2026-11-16",ssdMiles:45},
  {date:"2026-11-17",ssdOdometerStart:91560,ssdOdometerEnd:91612},
  {date:"2026-11-18",ssdOdometerStart:91700,ssdOdometerEnd:998000}
 ]},primaryVehicle:()=>vehicle};
 assert.equal(vm.runInNewContext(code+"\nreconcileVehicleOdometerFromSSD();",context),true);
 assert.equal(vehicle.mileage,91612);
 assert.equal(vehicle.odometerSource,"Confirmed SSD route log");
 assert.equal(vm.runInNewContext("reconcileVehicleOdometerFromSSD();",context),false);
});
test("oil tracker creates one early maintenance task within 1000 miles",()=>{
 const code=extract("function ensureVehicleMaintenanceTasks(date=ymd()){","// Only confirmed SSD route odometer pairs");
 let n=0;
 const state={tasks:[]},oil={key:"oil",label:"Oil change",due:false,dueMiles:99009,dueDate:"2027-11-15",milesRemaining:650};
 const context={state,primaryVehicle:()=>({id:"car"}),vehicleMaintenanceSnapshot:()=>({oil,rotation:null}),
    ymd:()=>"2027-04-01",uid:()=>String(++n)};
 vm.runInNewContext(code+"\nensureVehicleMaintenanceTasks('2027-04-01');ensureVehicleMaintenanceTasks('2027-04-01');",context);
 assert.equal(state.tasks.filter(t=>t.sourceMaintenance==="oil-soon"&&!t.done).length,1);
 assert.equal(state.tasks.find(t=>t.sourceMaintenance==="oil-soon").category,"car");
});
test("cloud work import uses odometer pairs, not approximate SSD reimbursement miles",()=>{
 assert.match(cloud,/p\.ssdOdometerEnd\?\?p\.odometerEnd/);
 assert.match(cloud,/routeEnd-routeStart<=500/);
 assert.match(cloud,/x\.ssdOdometerStart=routeStart;x\.ssdOdometerEnd=routeEnd/);
});
