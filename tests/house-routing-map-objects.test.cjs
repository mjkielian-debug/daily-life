"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const life=fs.readFileSync(path.join(__dirname,"..","life-map.js"),"utf8");
const house=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
function context(){
 const ctx={window:{},state:{tasks:[],chores:[]},dailyReviewStatus:()=>null,list:value=>Array.isArray(value)?value:[]};
 let a=life.indexOf("function lifeMapIsHouseholdChore("),b=life.indexOf("function selectedFloor()",a);
 assert.ok(a>=0&&b>a);
 vm.runInNewContext(life.slice(a,b),ctx);
 a=life.indexOf("function lifeMapAreaForTask(task)");b=life.indexOf("window.lifeMapTaskArea=lifeMapAreaForTask;",a);
 assert.ok(a>=0&&b>a);
 vm.runInNewContext(life.slice(a,b)+"window.lifeMapTaskArea=lifeMapAreaForTask;",ctx);
 return ctx;
}
test("bathroom personal care is not household cleaning",()=>{
 const c=context();
 assert.equal(c.window.lifeMapTaskArea({title:"Brush my teeth in bathroom",category:"health"}),"body");
 assert.equal(c.window.lifeMapTaskArea({title:"Dolly brushes teeth in bathroom",child:"Dolly",category:"people"}),"people");
 assert.equal(c.window.lifeMapTaskArea({title:"Wipe bathroom sink",category:"home"}),"home");
 assert.equal(c.window.lifeMapTaskArea({title:"Clean room",child:"Leo",category:"people"}),"home");
});
test("kids' reading stays in People, not in house task completion",()=>{
 const c=context();
 c.state.chores=[
  {id:"read",date:"2026-11-16",child:"Demitri",chore:"Read 20 min",done:false,generated:"daily-basics"},
  {id:"dishes",date:"2026-11-16",child:"Demitri",chore:"Dishes",done:false,generated:"rotation"}
 ];
 c.window.familyKidsHomeForChores=()=>true;
 assert.equal(c.window.lifeMapIsHouseholdChore(c.state.chores[0]),false);
 assert.equal(c.window.lifeMapIsHouseholdChore(c.state.chores[1]),true);
 const rows=c.window.lifeMapHouseholdRows("2026-11-16");
 assert.equal(rows.length,1);
 assert.equal(rows[0].title,"Dishes");
});
test("approved first-floor art keeps kitchen and adds map object interactions",()=>{
 assert.match(house,/function approvedDollhouseObjectHotspots\(f,z\)/);
 assert.match(house,/z\.id==="kitchen"\)return ""/);
 assert.match(house,/hotspots\+objectHotspots/);
 assert.match(house,/houseVisualInteractMarker/);
 assert.match(house,/approvedDollhouseAsset="assets\/approved-dollhouse-first-floor\.png/);
});
