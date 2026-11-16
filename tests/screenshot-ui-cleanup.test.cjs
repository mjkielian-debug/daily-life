"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),house=fs.readFileSync(path.join(root,"house-visual-map.js"),"utf8"),life=fs.readFileSync(path.join(root,"life-map.js"),"utf8"),css=fs.readFileSync(path.join(root,"ui-quiet-mobile.css"),"utf8");
test("house-wide tasks can be marked done without a room",()=>{assert.match(house,/House-wide & outside/);assert.match(house,/houseVisualFinishHousewide/);assert.match(house,/Place in a room/);assert.doesNotMatch(house,/House tasks without a room/);});
test("object dialog is short; source notes remain accessible",()=>{assert.match(house,/hvm-object-view-compact/);assert.match(house,/hvm-object-primary-actions/);assert.match(house,/About this item/);});
test("money goals are collapsed instead of filling the full page",()=>{assert.match(life,/lm-money-goals-compact/);assert.match(life,/See all '\+moneyGoals\.length\+' goals/);});
test("avatar is not covered by redundant floating action buttons",()=>{assert.match(css,/body:has\(#app \.life-map-page\) \.life-tools-fab/);assert.match(css,/padding-bottom:calc\(92px/);});
