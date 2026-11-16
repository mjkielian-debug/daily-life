"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
test("third-floor entry is shown as a passage to bedroom, not an internal stair flight",()=>{
 assert.match(source,/hvm-third-floor-passage/);
 assert.match(source,/To bedroom/);
 assert.doesNotMatch(source,/M160 212H220M160 235H220/);
});
test("saved main stair landing includes documented window and plants",()=>{
 assert.match(source,/Window and plants at the confirmed middle landing/);
 assert.match(source,/if\(firstUp\|\|mainStairs\)/);
});
test("room photo gallery supports common saved image types",()=>{
 assert.match(source,/jpeg\|png\|webp/);
});
