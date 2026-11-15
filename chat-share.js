/* Daily Life · review-to-save bridge for text shared from ChatGPT on Android.
   Sharing is user-initiated. No background conversation access is implied. */
(function(){
  "use strict";
  const SHARED_CACHE="daily-life-chat-shares-v1";
  const idPattern=/^[A-Za-z0-9-]{10,90}$/;
  const Q=id=>"./__daily_life_share__/"+id;
  let busy=false;
  const html=x=>typeof esc==="function"?esc(String(x??"")):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today=()=>typeof ymd==="function"?ymd():new Date().toLocaleDateString("en-CA");
  function waterFrom(text){
    const match=String(text||"").match(/\b(?:drank|finished|had)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*[- ]?\s*(?:oz|ounces?)\s+(?:(?:bottle|cup)\s+)?(?:of\s+)?water\b/i);
    const oz=match?Number(match[1]):null;
    return oz!==null&&Number.isFinite(oz)&&oz>0&&oz<=128?oz:null;
  }
  function validate(category,data){
    const date=String(data.date||"");
    const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const check=parts?new Date(Date.UTC(Number(parts[1]),Number(parts[2])-1,Number(parts[3]))):null;
    if(!check||check.toISOString().slice(0,10)!==date)
      return {error:"Choose a valid date."};
    let payload;
    if(category==="water"){
      const oz=Number(data.oz);
      if(!Number.isFinite(oz)||oz<=0||oz>128)return {error:"Enter the confirmed water amount, between 1 and 128 oz."};
      payload={oz};
    }else if(category==="food"){
      const name=String(data.name||"").trim();
      if(!name||name.length>160)return {error:"Enter the food or drink you actually had."};
      payload={name,quantity:1};
    }else if(category==="chore"){
      const child=String(data.child||"").trim(),chore=String(data.chore||"").trim();
      if(!child||!chore||child.length>80||chore.length>180)return {error:"Enter the child and the completed chore."};
      payload={child,chore,done:true};
    }else if(category==="task"){
      const title=String(data.title||"").trim();
      if(!title||title.length>200)return {error:"Enter a task or project title."};
      payload={title,done:!!data.done,date:data.date,category:"life"};
    }else{
      return {error:"Choose what you're recording."};
    }
    return {category,local_date:data.date,payload};
  }
  function guess(text){
    const oz=waterFrom(text);
    return {category:oz===null?"task":"water",oz:oz===null?"":oz};
  }
  function showStatus(message){
    const node=document.getElementById("chatShareStatus");
    if(node)node.textContent=message;
  }
  function entryValues(){
    const get=id=>document.getElementById(id);
    return {
      date:get("chatShareDate")?.value||"",
      oz:get("chatShareOz")?.value||"",
      name:get("chatShareFood")?.value||"",
      child:get("chatShareChild")?.value||"",
      chore:get("chatShareChore")?.value||"",
      title:get("chatShareTitle")?.value||"",
      done:!!get("chatShareDone")?.checked
    };
  }
  function categoryChanged(){
    const value=document.getElementById("chatShareCategory")?.value||"";
    for(const key of ["water","food","chore","task"]){
      const group=document.getElementById("chatShareGroup_"+key);
      if(group)group.hidden=key!==value;
    }
  }
  window.chatShareCategoryChanged=categoryChanged;
  async function readShared(id){
    if(!idPattern.test(String(id||""))||!("caches" in window))return null;
    const cache=await caches.open(SHARED_CACHE);
    const response=await cache.match(new URL(Q(id),location.href));
    if(!response)return null;
    const record=await response.json();
    if(!record||typeof record.text!=="string"||record.text.length>10000)return null;
    return {text:record.text,id};
  }
  async function removeShared(id){
    if(!idPattern.test(String(id||""))||!("caches" in window))return;
    const cache=await caches.open(SHARED_CACHE);
    await cache.delete(new URL(Q(id),location.href));
  }
  window.openChatShareReview=function(initial={}){
    if(typeof modal!=="function")return;
    const sharedId=String(initial.id||"");
    const proposed=guess(initial.text||"");
    const receiptId=sharedId&&idPattern.test(sharedId)?sharedId:crypto.randomUUID();
    const ui='<div class="stack chat-share-review">'+
      '<p class="muted small">Share a message from ChatGPT, or paste what you said. <b>Nothing saves until you review and confirm it.</b> Only the confirmed fields below are sent to your private Daily Life account.</p>'+
      '<label>Message (for your review only)<textarea id="chatShareText" rows="3" maxlength="10000" placeholder="I drank 26 oz water">'+html(initial.text||"")+'</textarea></label>'+
      '<button type="button" id="chatShareDetect" class="btn small">Detect water amount</button>'+
      '<button type="button" id="chatSharePaste" class="btn small">Paste from clipboard</button>'+
      '<div class="grid2"><label>Record date<input id="chatShareDate" type="date" value="'+html(today())+'"></label>'+
      '<label>Save as<select id="chatShareCategory" onchange="chatShareCategoryChanged()">'+
      [['water',"Water"],["food","Food or drink"],["chore","Child's completed chore"],["task","Task or project"]].map(([value,label])=>
        '<option value="'+value+'"'+(proposed.category===value?' selected':'')+'>'+label+'</option>').join("")+
      '</select></label></div>'+
      '<div id="chatShareGroup_water"><label>Confirmed water amount (oz)<input id="chatShareOz" type="number" min="1" max="128" step="0.5" value="'+html(proposed.oz)+'"></label></div>'+
      '<div id="chatShareGroup_food"><label>Food or drink<input id="chatShareFood" maxlength="160" placeholder="What did you eat or drink?"></label></div>'+
      '<div id="chatShareGroup_chore"><label>Child<input id="chatShareChild" maxlength="80" placeholder="Child’s name"></label><label>Completed chore<input id="chatShareChore" maxlength="180" placeholder="What did they finish?"></label></div>'+
      '<div id="chatShareGroup_task"><label>Task or project<input id="chatShareTitle" maxlength="200" placeholder="What should be recorded?"></label><label><input id="chatShareDone" type="checkbox"> Already completed</label></div>'+
      '<p class="muted small" id="chatShareStatus" role="status">Review the category, amount, and date before saving.</p>'+
      '</div>';
    modal("Review ChatGPT update",ui,"Confirm and save",async()=>{
      if(busy)return;
      const category=document.getElementById("chatShareCategory")?.value||"";
      const checked=validate(category,entryValues());
      if(checked.error){showStatus(checked.error);return}
      if(typeof cloudUser!=="function"||!cloudUser()||typeof cloudClient==="undefined"||!cloudClient){
        showStatus("Sign in to Daily Life cloud to save this update. Your text remains here for review.");
        return;
      }
      busy=true;
      showStatus("Saving confirmed entry…");
      try{
        const user=cloudUser();
        const row={
          owner_user_id:user.id,
          source:"chatgpt",
          external_id:"chat-share:"+receiptId,
          category:checked.category,
          local_date:checked.local_date,
          payload:{...checked.payload,origin:"reviewed_chat_share"},
          occurred_at:new Date().toISOString()
        };
        // Ignore duplicates from repeated button presses or reopened shares.
        const {data,error}=await cloudClient.from("life_entries").upsert(row,{
          onConflict:"owner_user_id,source,external_id",ignoreDuplicates:true
        }).select("id");
        if(error)throw error;
        const newlySaved=Array.isArray(data)&&data.length>0;
        showStatus(newlySaved?"Saved to your private Daily Life cloud. Importing to this phone…":"Already saved before. Checking your phone…");
        let imported=0;
        if(typeof cloudPullLifeEntries==="function")imported=await cloudPullLifeEntries(false);
        if(sharedId)await removeShared(sharedId);
        closeModal();
        if(typeof render==="function")render();
        alert(newlySaved
          ?(imported>0?"Saved and imported into Daily Life.":"Saved to Daily Life cloud. If it isn't visible yet, use Import connected life logs.")
          :"This shared entry was already recorded; no duplicate was added.");
      }catch(error){
        showStatus("Couldn't confirm a cloud save. No success was recorded. Check your connection and try again.");
      }finally{busy=false}
    });
    categoryChanged();
    document.getElementById("chatShareDetect")?.addEventListener("click",()=>{
      const text=document.getElementById("chatShareText")?.value||"";
      const oz=waterFrom(text);
      if(oz===null){showStatus("No unambiguous water amount found. Choose a category and enter the confirmed details.");return}
      document.getElementById("chatShareCategory").value="water";
      document.getElementById("chatShareOz").value=String(oz);
      categoryChanged();
      showStatus("Water amount detected. Review it and the date before saving.");
    });
    document.getElementById("chatSharePaste")?.addEventListener("click",async()=>{
      try{
        if(!navigator.clipboard?.readText)throw new Error("Clipboard unavailable");
        const text=(await navigator.clipboard.readText()).slice(0,10000);
        document.getElementById("chatShareText").value=text;
        const oz=waterFrom(text);
        if(oz!==null){
          document.getElementById("chatShareCategory").value="water";
          document.getElementById("chatShareOz").value=String(oz);
        }
        categoryChanged();
        showStatus("Pasted for review. Confirm or correct the fields before saving.");
      }catch(error){showStatus("Paste using your keyboard instead; your browser didn't grant clipboard access.")}
    });
  };
  // Installed PWA share target: the service worker stores shared text locally.
  // Only the user's confirmation turns it into a cloud life entry.
  async function openPendingShare(){
    const url=new URL(location.href),id=url.searchParams.get("review_chat");
    if(!id)return;
    url.searchParams.delete("review_chat");
    history.replaceState(history.state,"",url.pathname+url.search+url.hash);
    const shared=await readShared(id);
    if(!shared)return;
    const wait=async(n)=>{
      if(typeof modal==="function"&&(typeof appStartupReady==="undefined"||appStartupReady)){
        window.openChatShareReview(shared);return
      }
      if(n<60)setTimeout(()=>wait(n+1),200);
      else window.openChatShareReview(shared);
    };
    await wait(0);
  }
  if(typeof document!=="undefined"){
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{openPendingShare().catch(()=>{})},{once:true});
    else openPendingShare().catch(()=>{});
  }
  window.dailyLifeChatShareValidation=Object.freeze({waterFrom,validate,guess});
})();