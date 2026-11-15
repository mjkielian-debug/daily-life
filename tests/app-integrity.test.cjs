"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");

test("release metadata matches the app build string",()=>{
 const app=read("index.html"),release=JSON.parse(read("release.json"));
 assert.ok(app.includes('const APP_BUILD="'+release.build+'"'));
});
test("important scripts are loaded and known to the offline service worker",()=>{
 const html=read("index.html"),worker=read("sw.js");
 for(const name of ["holiday-gifts.js","schedule-photo-import.js","life-orchestrator.js","sync-status.js","ssd-route-capture.js","workday-focus.js"]){
  assert.ok(html.includes('src="'+name+'?'),"Missing HTML import: "+name);
  assert.ok(worker.includes('"./'+name+'"'),"Missing offline asset: "+name);
  assert.ok(fs.existsSync(path.join(root,name)),"Missing file: "+name);
 }
});
test("app manifest is valid and uses a recognizable icon",()=>{
 const manifest=JSON.parse(read("manifest.webmanifest"));
 assert.equal(manifest.name,"Daily Life");
 assert.ok(manifest.icons.length);
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src)));
});
