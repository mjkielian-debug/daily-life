"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","life-map.js"),"utf8");
test("only built-in secondary care is optional",()=>{
 const a=src.indexOf("function lifeMapOptionalCareRow("),b=src.indexOf("function view(areaOverride",a);
 assert.ok(a>=0&&b>a);
 const x={};vm.runInNewContext(src.slice(a,b),x);
 assert.equal(x.lifeMapOptionalCareRow({kind:"care",key:"journal",habit:{builtin:true}},"mind"),true);
 assert.equal(x.lifeMapOptionalCareRow({kind:"care",key:"floss",habit:{builtin:true}},"body"),true);
 assert.equal(x.lifeMapOptionalCareRow({kind:"care",key:"brush",habit:{builtin:true}},"body"),false);
 assert.equal(x.lifeMapOptionalCareRow({kind:"care",key:"journal",habit:{builtin:false}},"mind"),false);
 assert.equal(x.lifeMapOptionalCareRow({kind:"task",key:"journal"},"mind"),false);
});
test("26-oz water and brushing are one-tap; other care stays available",()=>{
 assert.match(src,/addWater\(26\)/);
 assert.match(src,/logCareOccurrence\(&#39;brush&#39;\)/);
 assert.match(src,/More self-care options/);
 assert.match(src,/essentialHabitButtons\+todayGroup\+optionalCareGroup/);
});
