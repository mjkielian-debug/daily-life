"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
const roomStart=source.indexOf('window.houseVisualOpenZone=function(f,id){');
const roomEnd=source.indexOf('\n};\n})();',roomStart);
assert.ok(roomStart>=0&&roomEnd>roomStart,"room detail function must exist");
const room=source.slice(roomStart,roomEnd);
const line=room.split("\n").find(row=>row.includes("const markup='<div class=\"hvm-zone-detail\">'"))||"";

test("the room opens with the chore checklist and room navigation before illustrations",()=>{
 assert.ok(line.includes("roomTaskNotice+tour+progress+(approvedZoom||miniRoom)"));
 assert.ok(line.indexOf("roomTaskNotice")<line.indexOf("tour"));
 assert.ok(line.indexOf("tour")<line.indexOf("progress"));
 assert.ok(line.indexOf("progress")<line.indexOf("(approvedZoom||miniRoom)"));
});
test("previous and next room are always visible, not hidden in photos and inventory",()=>{
 assert.match(room,/hvm-tour-nav/);
 assert.match(room,/houseVisualTourStep/);
 const collapsed=line.indexOf('<details class="hvm-room-extra">');
 assert.ok(collapsed>0);
 assert.ok(line.indexOf("tour")<collapsed);
 assert.ok(!line.slice(collapsed).includes("+tour+"));
});
test("room chores retain one-tap completion and a no-task state",()=>{
 assert.match(room,/What needs doing/);
 assert.match(room,/houseVisualCompleteTask/);
 assert.match(room,/No other unfinished tracked room tasks yet/);
 assert.match(source,/window.houseVisualCompleteTask=async function/);
});
