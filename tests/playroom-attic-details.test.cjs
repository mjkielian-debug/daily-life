"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const map=fs.readFileSync(path.join(__dirname,"..","house-visual-map.js"),"utf8");
test("confirmed playroom objects can be tapped with explicit approximate-placement labels",()=>{
 assert.match(map,/z\.id==="playroom"&&p\.mapX==null/);
 assert.match(map,/kind==="keyboard"\?\[38,58\]:\[73,24\]/);
 assert.match(map,/hvm-approved-object-approx/);
 assert.match(map,/houseVisualInteractMarker/);
});
test("photo-referenced attic entry has eave storage and a window without inventing coordinates",()=>{
 assert.match(map,/f==="Third floor"&&k==="stairs_up"/);
 assert.match(map,/hvm-entry-eave/);
 assert.match(map,/under-eave storage bins/);
});
test("approved kitchen art remains unchanged",()=>{
 assert.match(map,/approvedDollhouseAsset="assets\/approved-dollhouse-first-floor\.png\?v=20261114-approved1"/);
 assert.match(map,/z\.id==="kitchen"\)return ""/);
});
