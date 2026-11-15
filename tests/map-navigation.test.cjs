"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("second floor main landing has first-floor link, separate third-floor flight",()=>{
 const house=read("house-visual-map.js");
 assert.match(house,/z\.id==="stairs"\|\|z\.id==="stairs_to_first"/);
 assert.match(house,/z\.id==="stairs_to_third"/);
});
test("area navigation does not invent new tasks and map is one tap away",()=>{
 const life=read("life-map.js");
 assert.match(life,/lm-map-jumps/);
 assert.match(life,/window\.lifeMapJump=/);
 assert.doesNotMatch(life,/generated:"life-map-area-starter"/);
});
