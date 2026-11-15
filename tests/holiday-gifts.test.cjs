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
 let active=null,values={},error="",failSave=false,extraRows=[];
 const context={
  window:{},state,
  esc:value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
  ymd:()=>"2026-11-14",ensurePeopleProfiles:()=>{},
  modal:(title,body,button,handler)=>{active={title,body,button,handler}},
  document:{
   getElementById:id=>({value:values[id]??""}),
   querySelectorAll:()=>extraRows.map(item=>({
    getAttribute:name=>name==="data-gift-id"?item.id:"",
    querySelector:selector=>{
     const match=/\[data-field="([^"]+)"\]/.exec(selector);
     return match?{value:item[match[1]]??""}:null;
    }
   }))
  },
  save:async()=>{if(failSave)throw new Error("Simulated local storage failure")},closeModal:()=>{},openPeopleHubSection:()=>{},
  alert:message=>{error=message}
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","holiday-gifts.js"),"utf8"),context,{filename:"holiday-gifts.js"});
 return {state,context,setValues:v=>{values=v},getDialog:()=>active,getError:()=>error,setFailSave:value=>{failSave=!!value},setExtraRows:value=>{extraRows=value}};
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

test("failure to save a gift never overwrites existing saved data",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-child-1");
 app.setValues({
  "holiday-gift-idea":"New gift that could not save",
  "holiday-gift-choice":"buy",
  "holiday-gift-status":"planned",
  "holiday-gift-budget":"99",
  "holiday-gift-spent":"12",
  "holiday-gift-link":"",
  "holiday-gift-notes":""
 });
 app.setFailSave(true);
 await app.getDialog().handler();
 assert.equal(app.state.christmasGifts2026["person-child-1"],undefined);
 assert.equal(app.state.christmasGifts2026.dolly.idea,"Craft kit");
 assert.match(app.getError(),/could not be saved/);
});
test("legacy records do not silently attach to two different people with the same name",()=>{
 const app=createApp();
 app.state.peopleProfiles.push({id:"relative-3",name:"Dolly",relationship:"niece"});
 const board=app.context.window.holidayGiftBoard();
 assert.equal((board.match(/Craft kit/g)||[]).length,1);
});

test("multiple gift items track their own progress without double counting spending",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-child-1");
 app.setValues({
  "holiday-gift-idea":"Craft kit",
  "holiday-gift-choice":"buy",
  "holiday-gift-status":"in-progress",
  "holiday-gift-budget":"50",
  "holiday-gift-spent":"18.50",
  "holiday-gift-link":"",
  "holiday-gift-notes":""
 });
 app.setExtraRows([
  {id:"gift-book",title:"Illustrated book",choice:"buy",status:"wrapped",link:"https://example.com/book",notes:"Large print"},
  {id:"gift-homemade",title:"Crochet hat",choice:"make",status:"planned",link:"",notes:"Pink yarn"}
 ]);
 await app.getDialog().handler();
 const g=app.state.christmasGifts2026["person-child-1"];
 assert.equal(g.items.length,2);
 assert.equal(g.items[0].title,"Illustrated book");
 assert.equal(g.items[0].status,"wrapped");
 assert.equal(g.items[1].choice,"make");
 assert.equal(g.spent,"18.50");
 const board=app.context.window.holidayGiftBoard();
 assert.match(board,/1\/2 extra gifts ready/);
 assert.match(board,/Actual spending:/);
 assert.match(board,/\$18\.50/);
 assert.doesNotMatch(board,/\$37\.00/);
 app.context.window.openHolidayGift("person-child-1");
 assert.match(app.getDialog().body,/Illustrated book/);
 assert.match(app.getDialog().body,/Crochet hat/);
});
test("invalid link in an extra gift blocks saving and preserves existing data",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-child-1");
 app.setExtraRows([{id:"bad",title:"Book",choice:"buy",status:"planned",link:"javascript:alert(1)",notes:""}]);
 await app.getDialog().handler();
 assert.equal(app.state.christmasGifts2026["person-child-1"],undefined);
 assert.match(app.getError(),/Extra gift links/);
});
test("extra gift plan can stand alone without a main idea",async()=>{
 const app=createApp();
 app.context.window.openHolidayGift("person-relative-2");
 app.setExtraRows([{id:"one",title:"Handmade scarf",choice:"make",status:"planned",link:"",notes:"Green wool"}]);
 await app.getDialog().handler();
 const board=app.context.window.holidayGiftBoard();
 assert.match(board,/Handmade scarf/);
 assert.match(board,/2\/2/);
});
