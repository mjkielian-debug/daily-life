"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),house=fs.readFileSync(path.join(root,"house-visual-map.js"),"utf8"),life=fs.readFileSync(path.join(root,"life-map.js"),"utf8"),css=fs.readFileSync(path.join(root,"ui-quiet-mobile.css"),"utf8");
test("house-wide tasks can be marked done without a room",()=>{assert.match(house,/House-wide & outside/);assert.match(house,/houseVisualFinishHousewide/);assert.match(house,/Place in a room/);assert.doesNotMatch(house,/House tasks without a room/);});
test("object dialog is short; source notes remain accessible",()=>{assert.match(house,/hvm-object-view-compact/);assert.match(house,/hvm-object-primary-actions/);assert.match(house,/About this item/);});
test("money goals are collapsed instead of filling the full page",()=>{assert.match(life,/lm-money-goals-compact/);assert.match(life,/See all '\+moneyGoals\.length\+' goals/);});
test("avatar is not covered by redundant floating action buttons",()=>{assert.match(css,/body:has\(#app \.life-map-page\) \.life-tools-fab/);assert.match(css,/padding-bottom:calc\(92px/);});

test("avatar category shortcuts no longer reintroduce standalone Today",()=>{
 assert.doesNotMatch(life,/"✦","Today","today"/);
 assert.match(life,/const all=compact\?entries\.concat/);
 assert.match(life,/<b>Related pages<\/b>/);
});
test("starter habits log with one tap from the avatar",()=>{
 assert.match(life,/nextPriorityLogAction=chooseWater\?"addWater\(26\)":"logCareOccurrence/);
 assert.match(life,/lm-next-checkin-log/);
 assert.match(life,/const waterStatus=Math\.round\(waterOzToday\)\+" \/ "\+Math\.round\(waterGoal\)\+" oz"/);
 assert.match(css,/lm-next-checkin-actions/);
 assert.match(css,/lm-next-checkin-log/);
});

test("all four house floors remain visible and tappable on phone widths",()=>{
 assert.match(life,/const floorNames=\["Basement","First floor","Second floor","Third floor"\]/);
 assert.match(life,/class="lm-floor /);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.lm-house \.lm-floors\{/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/white-space:normal/);
});
