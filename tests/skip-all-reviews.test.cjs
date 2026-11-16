"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"..","life-map.js"),"utf8");
const a=source.indexOf("function lifeMapReviewPanel(area,date){"),b=source.indexOf('document.addEventListener("click",function(event)',a);
assert.ok(a>=0&&b>a);
test("skipping every review shows a recoverable state rather than crashing",()=>{
 const date="2026-11-15",ctx={state:{tasks:[],chores:[]},window:{lifeMapTaskLastDoneLabel:()=>""},
 list:xs=>Array.isArray(xs)?xs:[],dailyReviewExpected:()=>[{kind:"task",key:"test1",status:"unknown",label:"An unfinished task"}],
 lifeMapAreaForReview:()=>"home",lifeMapIsRoomOnlyReview:()=>false,dailyReviewBacklog:()=>[],h:v=>String(v)};
 vm.runInNewContext('let reviewSkipDate="2026-11-15",reviewSkipKeys=new Set(["home|test1"]);'+source.slice(a,b)+'window._show=lifeMapReviewPanel;',ctx);
 const markup=ctx.window._show("home",date);
 assert.match(markup,/Show skipped/);
 assert.match(markup,/remain unknown/);
});
