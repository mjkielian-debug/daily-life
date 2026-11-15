"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const script=fs.readFileSync(path.join(__dirname,"..","chat-checkin.js"),"utf8");
function view({quick=true,route=true}={}){
 let html="";
 const ctx={
  window:{...(quick?{openLifeCapture:()=>{}}:{}),...(route?{openSSDRouteQuickLog:()=>{}}:{})},
  state:{waterLogs:[],foodLogs:[],sleepLogs:[],workShifts:[]},
  ymd:()=>"2026-11-14",dailyReviewExpected:()=>[],
  esc:x=>String(x).replace(/[&<>"]/g,""),
  document:{querySelector:()=>null},
  modal:(_title,body)=>{html=body},
  closeModal:()=>{},
  console
 };
 vm.runInNewContext(script,ctx,{filename:"chat-checkin.js"});
 ctx.window.openChatCheckin();
 return html;
}
test("daily check-in exposes one-tap quick update and SSD logger when loaded",()=>{
 const html=view();
 assert.match(html,/onclick="closeModal\(\);openLifeCapture\(\)"/);
 assert.match(html,/onclick="closeModal\(\);openSSDRouteQuickLog\(\)"/);
 assert.match(html,/Record an update/);
 assert.match(html,/Log SSD route/);
});
test("daily check-in does not show broken controls when a module is missing",()=>{
 const html=view({quick:false,route:false});
 assert.doesNotMatch(html,/onclick="closeModal\(\);openLifeCapture\(\)"/);
 assert.doesNotMatch(html,/onclick="closeModal\(\);openSSDRouteQuickLog\(\)"/);
 assert.match(html,/Optional: review unknown activities/);
});
test("check-in still clarifies that ChatGPT chat does not itself sync entries",()=>{
 const html=view();
 assert.match(html,/ChatGPT conversations do not automatically sync to the app/);
 assert.match(html,/Unknown never means you failed/);
});
