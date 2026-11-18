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
 assert.ok(line.includes("'+tour+approvedConnectedRoomNav(f,id)+progress+(approvedZoom||miniRoom)"));
 assert.ok(!line.includes("roomTaskNotice"),"do not show a redundant jump card");
 assert.ok(line.indexOf("tour")<line.indexOf("progress"));
 assert.ok(line.indexOf("approvedConnectedRoomNav")<line.indexOf("progress"));
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

test("a room uses one applicable checklist for both count badges and color fill",()=>{
 assert.match(source,/function roomTaskColorStats\(f,z,room\)/);
 assert.match(source,/for\(const task of trackedRoomTasks\(f,z,room\)\)/);
 assert.match(source,/dailyReviewStatus\("chore",t\.id,t\.date\|\|dates\[0\]\)==="na"/);
 assert.match(source,/dailyReviewStatus\("task",t\.id,t\.date\|\|dates\[0\]\)==="na"/);
 assert.match(source,/window\.familyKidsHomeForChores\(dates\[0\]\)/);
});
test("adult room routines are not suppressed by child chore assignments",()=>{
 assert.match(source,/const linked=trackedRoomTasks\(f,z,room\)\.filter\(t=>t\.date===date&&!String\(t\.child\|\|""\)\.trim\(\)\)/);
});
test("every room task remains reachable after the first six and inventory stays optional",()=>{
 assert.match(room,/visiblePendingTasks\.slice\(0,6\)/);
 assert.match(room,/visiblePendingTasks\.slice\(6\)/);
 assert.match(room,/hvm-more-room-tasks/);
 assert.match(room,/details class="hvm-room-inventory"/);
});
test("the approved kitchen asset stays unchanged and colors emerge over grayscale",()=>{
 const css=fs.readFileSync(path.join(__dirname,"..","house-visual-map.css"),"utf8");
 assert.match(css,/\.hvm-approved-muted-base\{filter:grayscale\(/);
 assert.match(css,/\.hvm-approved-color-reveal image\{filter:saturate\(/);
 assert.match(css,/\.hvm-zone-detail>\.hvm-task-list\{order:-10\}/);
 assert.match(css,/\.hvm-zone-detail>\.hvm-tour-nav\{order:-11\}/);
});
