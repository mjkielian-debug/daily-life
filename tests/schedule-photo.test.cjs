"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const context={window:{},console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","schedule-photo-import.js"),"utf8"),context,{filename:"schedule-photo-import.js"});
const parser=context.window.dailyLifeSchedulePhotoParsing;
const week={dates:["2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13","2026-11-14"]};

test("accepts 24-hour afternoon times and preserves morning start",()=>{
 assert.deepEqual(Array.from(parser.timeCandidates("Thu 9:42 to 13:59")),["09:42","13:59"]);
 assert.deepEqual(Array.from(parser.timeCandidates("Friday 08:47 - 13:57")),["08:47","13:57"]);
 assert.deepEqual(Array.from(parser.timeCandidates("Monday 00:15 - 23:45")),["00:15","23:45"]);
});
test("AM/PM inputs still convert correctly",()=>{
 assert.deepEqual(Array.from(parser.timeCandidates("Tuesday 4:45 AM - 1:30 PM")),["04:45","13:30"]);
});
test("rejects impossible clock values",()=>{
 assert.deepEqual(Array.from(parser.timeCandidates("Tue 24:60")),[]);
 assert.deepEqual(Array.from(parser.timeCandidates("Tue 25:30")),[]);
});
test("parses real UPS weekly schedule lines and days off",()=>{
 const rows=parser.parseOCR("Thursday 11/12 9:42 to 13:59\nFri 11/13 8:47-13:57\nSat 11/14 OFF",week);
 assert.equal(rows["2026-11-12"].scheduled,"09:42");
 assert.equal(rows["2026-11-13"].scheduled,"08:47");
 assert.equal(rows["2026-11-14"].working,false);
 assert.equal(rows["2026-11-14"].scheduled,"");
});
