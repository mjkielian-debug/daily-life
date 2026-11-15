"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"..","chat-share.js"),"utf8");

function setup({signedIn=true,failWrite=false,existing=false}={}){
 let saveAction=null,modalText="",closed=0,imported=0,resultAlert="",writeCount=0,submitted=null;
 const fields={};
 const ids={
  chatShareDate:"2026-11-15",chatShareCategory:"water",chatShareOz:"26",chatShareFood:"",
  chatShareChild:"",chatShareChore:"",chatShareTitle:"",chatShareDone:""
 };
 for(const [id,value] of Object.entries(ids)){
   fields[id]={value,checked:false,hidden:false,addEventListener(){}};
 }
 for(const k of ["water","food","chore","task"])fields["chatShareGroup_"+k]={hidden:false};
 fields.chatShareStatus={textContent:""};
 fields.chatShareDetect={addEventListener(){}};
 fields.chatSharePaste={addEventListener(){}};
 const context={
  window:{},location:{href:"https://example.test/daily-life/"},
  document:{readyState:"loading",addEventListener(){},getElementById:id=>fields[id]||null},
  navigator:{clipboard:{}},crypto:{randomUUID:()=>"6c8cd55f-d4ae-4639-a3ee-a19b4f98ae4a"},
  ymd:()=>"2026-11-15",
  modal:(_title,html,_button,action)=>{modalText=html;saveAction=action},
  closeModal:()=>closed++,render:()=>{},alert:text=>resultAlert=text,
  cloudUser:()=>signedIn?{id:"user-id-1"}:null,
  cloudClient:{from(name){assert.equal(name,"life_entries");return{
    upsert(row,opts){writeCount++;submitted={row,opts};return{
      async select(){if(failWrite)return {data:null,error:{message:"Offline"}};return {data:existing?[]:[{id:"new-entry"}],error:null}}
    }}
  }}},
  cloudPullLifeEntries:async()=>{imported++;return 1},
  console,Date,URL,Map
 };
 vm.runInNewContext(src,context,{filename:"chat-share.js"});
 return {context,fields,open:(payload={})=>context.window.openChatShareReview(payload),save:()=>saveAction(),
  modal:()=>modalText,submitted:()=>submitted,saved:()=>writeCount,closed:()=>closed,
  imported:()=>imported,alert:()=>resultAlert};
}
test("water detection only accepts an explicit water amount",()=>{
 const api=setup().context.window.dailyLifeChatShareValidation;
 assert.equal(api.waterFrom("I drank 26 oz water"),26);
 assert.equal(api.waterFrom("I finished a 26-ounce bottle of water"),26);
 assert.equal(api.waterFrom("I had 24 ounces of coffee"),null);
 assert.equal(api.waterFrom("I had some water"),null);
 assert.equal(api.waterFrom("I drank 500 oz water"),null);
});
test("unconfirmed categories and invalid numbers cannot be saved",async()=>{
 const h=setup();
 h.open();
 h.fields.chatShareOz.value="0";
 await h.save();
 assert.equal(h.saved(),0);
 assert.match(h.fields.chatShareStatus.textContent,/between 1 and 128/);
 h.fields.chatShareCategory.value="food";
 h.fields.chatShareFood.value="";
 await h.save();
 assert.equal(h.saved(),0);
 assert.match(h.fields.chatShareStatus.textContent,/food or drink/);
});
test("reviewed records are saved only through a signed-in private cloud and imported",async()=>{
 const h=setup();
 h.open({text:"I drank 26 oz water"});
 assert.match(h.modal(),/Nothing saves until you review and confirm it/);
 assert.equal(h.saved(),0);
 await h.save();
 assert.equal(h.saved(),1);
 assert.equal(h.imported(),1);
 assert.equal(h.closed(),1);
 const {row,opts}=h.submitted();
 assert.equal(row.category,"water");
 assert.equal(row.payload.oz,26);
 assert.equal(row.payload.origin,"reviewed_chat_share");
 assert.equal(row.source,"chatgpt");
 assert.equal(row.owner_user_id,"user-id-1");
 assert.equal(opts.ignoreDuplicates,true);
 assert.match(row.external_id,/^chat-share:/);
});
test("duplicate confirmations do not create another entry",async()=>{
 const h=setup({existing:true});
 h.open({text:"I drank 26 oz water"});
 await h.save();
 assert.match(h.alert(),/already recorded/);
});
test("failed or unauthenticated saves never claim success",async()=>{
 const offline=setup({failWrite:true});offline.open();await offline.save();
 assert.equal(offline.closed(),0);
 assert.equal(offline.imported(),0);
 assert.match(offline.fields.chatShareStatus.textContent,/Couldn't confirm/);
 const unsigned=setup({signedIn:false});unsigned.open();await unsigned.save();
 assert.equal(unsigned.saved(),0);
 assert.match(unsigned.fields.chatShareStatus.textContent,/Sign in/);
});
test("the installed app advertises a locally reviewed text share target",()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"..","manifest.webmanifest"),"utf8"));
 assert.equal(manifest.share_target.method,"POST");
 assert.equal(manifest.share_target.params.text,"text");
 assert.match(manifest.share_target.action,/chat_share_target/);
 const worker=fs.readFileSync(path.join(__dirname,"..","sw.js"),"utf8");
 assert.match(worker,/receiveSharedChat\(request\)/);
 assert.match(worker,/new Response\(JSON\.stringify\(\{text,createdAt/);
 assert.match(worker,/review_chat=/);
 assert.doesNotMatch(worker,/fetch\(.*text-ingest/);
});
