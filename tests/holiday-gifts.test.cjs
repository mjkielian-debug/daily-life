"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

function createApp(){
 const state={
  peopleProfiles:[{id:"child-1",name:"Dolly",relationship:"daughter"},{id:"relative-2",name:"Tree",relationship:"nephew"}],
  christmasGifts2026:{dolly:{name:"Dolly",idea:"Craft kit",choice:"buy",status:"planned",budget:"25"}},
  tasks:[]
 };
 let active=null,values={},error="";
 const context={
  window:{},state,
  esc:value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
  ymd:()=>"2026-11-14",ensurePeopleProfiles:()=>{},
  modal:(title,body,button,handler)=>{active={title,body,button,handler}},
  document:{getElementById:id=>({value:values[id]??""})},
  save:async()=>{},closeModal:()=>{},openPeopleHubSection:()=>{},
  alert:message=>{error=message}
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","holiday-gifts.js"),"utf8"),context,{filename:"holiday-gifts.js"});
 return {state,context,setValues:v=>{values=v},getDialog:()=>active,getError:()=>error};
}

test("old name-keyed gift data remains visible for existing people",()=>{
 const app=createApp(),html=app.context.window.holidayGiftBoard();
 assert.match(html,/Craft kit/);
 assert.match(html,/Gift budgets:/);
 assert.match(html,/\$25\.00/);
});
test("gift is saved to stable person ID and survives a name change",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-child-1");
 app.setValues({
  "holiday-gift-idea":"Craft kit and book",
  "holiday-gift-choice":"both",
  "holiday-gift-status":"in-progress",
  "holiday-gift-budget":"30",
  "holiday-gift-spent":"12.50",
  "holiday-gift-link":"https://example.com/craft-kit",
  "holiday-gift-notes":"Make wrapping"
 });
 await app.getDialog().handler();
 assert.equal(app.state.christmasGifts2026["person-child-1"].spent,"12.50");
 assert.equal(app.state.christmasGifts2026["person-child-1"].link,"https://example.com/craft-kit");
 app.state.peopleProfiles[0].name="Dolly Rose";
 const board=app.context.window.holidayGiftBoard();
 assert.match(board,/Dolly Rose/);
 assert.match(board,/Craft kit and book/);
 assert.match(board,/Actual spending:/);
 assert.match(board,/\$12\.50/);
});
test("same-named people with different IDs can have separate plans",()=>{
 const app=createApp();
 app.state.peopleProfiles.push({id:"relative-3",name:"Dolly",relationship:"niece"});
 const board=app.context.window.holidayGiftBoard();
 assert.equal((board.match(/class="holiday-gift-person"/g)||[]).length,3);
 assert.match(board,/person-relative-3/);
});
test("invalid or unsafe spending input cannot be saved",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-child-1");
 app.setValues({"holiday-gift-budget":"20","holiday-gift-spent":"-10","holiday-gift-link":""});
 await app.getDialog().handler();
 assert.equal(app.state.christmasGifts2026["person-child-1"],undefined);
 assert.match(app.getError(),/non-negative/);
});
