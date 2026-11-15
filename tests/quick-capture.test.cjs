"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const source=fs.readFileSync(path.join(__dirname,"..","life-orchestrator.js"),"utf8");
const start=source.indexOf("  function lifeCaptureWaterOunces(");
const end=source.indexOf("  window.dailyLifeQuickCaptureWaterOunces=",start);
assert.ok(start>=0&&end>start,"Quick Capture water parser must exist");
const context={};
vm.runInNewContext(source.slice(start,end)+"\nthis.extractWater=lifeCaptureWaterOunces;",context);
const ounces=context.extractWater;

test("quick capture parses clearly stated ounces of water",()=>{
 assert.equal(ounces("I drank 26 oz water"),26);
 assert.equal(ounces("I had 12.5 ounces of water"),12.5);
 assert.equal(ounces("Finished a 26-ounce bottle of water"),26);
});
test("quick capture never assumes that all drinks are water",()=>{
 assert.equal(ounces("I had 26 oz of coffee"),null);
 assert.equal(ounces("I drank one bottle"),null);
 assert.equal(ounces("buy cat litter"),null);
});
test("dictation offers review before adding records",()=>{
 assert.ok(source.includes("lifeCaptureDictateButton"));
 assert.ok(source.includes("Review what was heard, then tap Add."));
 assert.ok(source.includes("window.SpeechRecognition||window.webkitSpeechRecognition"));
});
