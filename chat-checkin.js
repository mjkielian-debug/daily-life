/* Daily Life · Talk-first check-in. This is a question guide, not an AI chat bridge.
   Entries are imported only if separately written to the connected life_entries feed.
   Missing information is never counted as a negative. */
(function(){
 "use strict";
 let promptIndex=0;
 let quickCursor=0,quickBusy=false;
 function dayPart(){
  const h=new Date().getHours();
  if(h<8)return "early";
  if(h<12)return "after";
  if(h<17)return "afternoon";
  return "evening";
 }
 function prompts(){
  const part=dayPart(),workday=typeof isUsualWorkday==="function"?isUsualWorkday(ymd()):[2,3,4,5,6].includes(new Date().getDay()),
   date=typeof ymd==="function"?ymd():"",
   shift=(state.workShifts||[]).find(x=>x.date===date),
   finishedShift=!!shift&&(typeof workEndConfirmed==="function"?workEndConfirmed(shift):!!shift.end),
   sleep=(state.sleepLogs||[]).find(x=>x.date===date),
   foodCount=(state.foodLogs||[]).filter(x=>x.date===date).length,
   waterOz=(state.waterLogs||[]).filter(x=>x.date===date).reduce((n,x)=>n+Number(x.oz||0),0),
   chores=displayChoresForDate(date),
   dinner=typeof mealForDate==="function"?mealForDate(date):null;
  const sleepQuestion=sleep?"Your sleep was logged. How is your energy now, and has anything changed since then?":part==="early"?"How did you sleep, and how is your energy so far?":"How was your sleep last night, and how is your energy now?";
  const workQuestion=workday?(finishedShift?"How did your UPS shift go, and was anything different?":shift?.start?"How is your UPS shift going so far? Anything important to record?":"Are you finished with UPS for today, still working, or heading in later? Anything important to record?"):"What have you been doing today?";
  const foodQuestion=foodCount?"You have "+foodCount+" food or drink entries logged today. Anything else you've had since then?":"What have you eaten or had to drink so far? Approximate amounts are fine; I'll ask about anything important that is unclear.";
  const waterQuestion=waterOz>0?"You have "+waterOz+" oz of water logged today. Have you had any more?":"Have you had any water today, and roughly how much?";
  const kidsQuestion=chores.length?"What's happened with the kids today? Any chores, homework, reading, school updates, or plans to record?":"Any news about the kids, school, family plans, or the house?";
  const dinnerQuestion=dinner?.dish?"The dinner plan says "+dinner.dish+". Did that happen, or has anything changed?":"What is dinner tonight? Is it planned, cooking, or already eaten?";
  const updatesQuestion="What else happened, changed, got finished, or needs to be remembered? You can just talk naturally.";
  if(part==="early")return [sleepQuestion,workday?"Any changes to your UPS shift, family schedule, or plans today?":"Anything important on today’s schedule or things you'd like me to remember?",foodQuestion,updatesQuestion];
  if(part==="after")return [workQuestion,sleepQuestion,foodQuestion,waterQuestion,updatesQuestion];
  if(part==="afternoon")return [kidsQuestion,foodQuestion,waterQuestion,dinnerQuestion,updatesQuestion];
  return [dinnerQuestion,kidsQuestion,waterQuestion,updatesQuestion,sleepQuestion];
 }

 // A voluntary clipboard handoff gives ChatGPT current on-device context.
 // Never interpret an absent entry as a missed activity, and never include bank
 // balances or private account details in the copied check-in.
 function checkinSnapshot(){
  const date=typeof ymd==="function"?ymd():new Date().toLocaleDateString("en-CA"),
   all=(name)=>Array.isArray(state[name])?state[name].filter(x=>x.date===date):[],
   waters=all("waterLogs"),
   waterOz=waters.reduce((n,x)=>n+(Number(x.oz)||0),0),
   foods=all("foodLogs"),
   sleep=all("sleepLogs")[0],
   work=all("workShifts"),
   dinner=typeof mealForDate==="function"?mealForDate(date):null,
   review=typeof dailyReviewExpected==="function"?dailyReviewExpected(date):[],
   done=review.filter(x=>x.status==="yes"),
   unknown=review.filter(x=>x.status==="unknown"),
   doneKids=done.filter(x=>x.kind==="chore"),
   doneTasks=done.filter(x=>x.kind==="task");
  const list=(items,limit=7)=>items.length?items.slice(0,limit).join("; ")+(items.length>limit?"; +"+(items.length-limit)+" more":""):"not recorded";
  const foodNames=foods.map(x=>String(x.food||x.name||x.item||x.description||x.label||"food/drink entry").trim()).filter(Boolean);
  const sleepAmount=sleep&&typeof sleepHours==="function"?sleepHours(sleep):null;
  const sleepLine=sleep?(sleepAmount>0?sleepAmount.toFixed(1)+" hours logged":"sleep entry recorded (hours unspecified)"):"not recorded";
  const planned=dinner?.dish?String(dinner.dish)+" ("+String(dinner.status||"status unconfirmed")+")":"not recorded";
  return [
   "CURRENT APP SNAPSHOT FOR "+date+" (on this device; may be incomplete):",
   "Sleep: "+sleepLine,
   "UPS/work: "+(work.length?work.length+" work record(s) for today; confirm actual shift details with me":"not recorded for today"),
   "Water: "+(waters.length?Math.round(waterOz)+" oz logged":"not recorded (not zero)"),
   "Food/drinks: "+list(foodNames),
   "Dinner plan: "+planned,
   "Confirmed kids' chores: "+list(doneKids.map(x=>x.label)),
   "Confirmed tasks: "+list(doneTasks.map(x=>x.label)),
   "Still unknown: "+unknown.length+" checkmark"+(unknown.length===1?"":"s")+". Examples: "+list(unknown.slice(0,4).map(x=>x.label),4),
   "IMPORTANT: 'Not recorded' and 'unknown' do not mean 'no'. Ask me before marking anything incomplete."
  ].join("\n");
 }
 function checkinStarter(){
  const date=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const questions=prompts(),question=questions[promptIndex%questions.length];
  return "Daily Life check-in for "+date+". Please ask me ONE question at a time about what happened today: work/sleep, food/drinks/water, children/chores, dinner, plans and completed tasks. Use the app snapshot below to avoid repeating things already logged. I will tell you updates naturally. Only write records through a connection you can actually access, and tell me exactly what synced; speaking alone does not update the app. If you cannot save directly, clearly say so and organize the confirmed updates for later entry. Never mark unlogged tasks as missed.\n\n"+checkinSnapshot()+"\n\nStart with this question: "+question;
 }
 function content(){
  const date=typeof ymd==="function"?ymd():"",
   entries=(name)=>(state[name]||[]).filter(x=>x.date===date),
   waters=entries("waterLogs"),waterOz=waters.reduce((n,x)=>n+(Number(x.oz)||0),0),
   foods=entries("foodLogs"),sleep=entries("sleepLogs"),work=entries("workShifts"),
   review=typeof dailyReviewExpected==="function"?dailyReviewExpected(date):[],
   confirmed=review.filter(x=>x.status==="yes").length,
   unknown=review.filter(x=>x.status==="unknown").length;
  const metric=(label,value)=>'<div class="chat-checkin-metric"><b>'+esc(value)+'</b><span>'+esc(label)+'</span></div>';
  return '<div class="chat-checkin-modal chat-checkin-summary">'+
   '<p class="chat-checkin-help">Tell ChatGPT about your day as usual. This screen shows what is actually recorded in Daily Life, not a list of questions you must answer.</p>'+
   '<div class="chat-checkin-counters">'+
    metric("Water",waters.length?Math.round(waterOz)+" oz recorded":"Not recorded")+
    metric("Food / drinks",foods.length?foods.length+" entries":"Not recorded")+
    metric("Sleep",sleep.length?"Recorded":"Not recorded")+
    metric("Work",work.length?"Recorded":"Not recorded")+
   '</div>'+
   '<p class="chat-checkin-help"><strong>'+confirmed+' confirmed activities</strong> · '+unknown+' still unknown. Unknown never means you failed or skipped something.</p>'+
   '<div class="chat-checkin-actions">'+
    '<button type="button" class="btn primary" onclick="chatCheckinCopy()">Copy app status for ChatGPT</button>'+
    '<button type="button" class="btn" onclick="chatCheckinOpenChat()">Open ChatGPT ↗</button>'+
   '</div>'+
   '<div class="chat-checkin-secondary"><button type="button" onclick="closeModal();openDailyReview()">Optional: review unknown activities</button>'+
   (typeof cloudUser==="function"&&cloudUser()?'<button type="button" onclick="chatCheckinSync()">Import connected life logs</button>':"")+'</div>'+
   '<p class="chat-checkin-footnote">ChatGPT conversations do not automatically sync to the app. Only saved or imported entries appear as recorded. You can always enter information manually.</p>'+
   '</div>';
 }
 function show(){
  const host=document.querySelector("#modal .chat-checkin-modal");
  if(host){host.outerHTML=content();return}
  modal("Talk through your day",content(),"Close",closeModal);
 }
 function chatCheckinNext(){promptIndex++;show()}
 async function chatCheckinCopy(){
  const text=checkinStarter();
  try{
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text)}
   else{
    const el=document.createElement("textarea");el.value=text;el.style.position="fixed";el.style.opacity="0";document.body.appendChild(el);el.select();
    if(!document.execCommand("copy"))throw new Error("Clipboard unavailable");el.remove();
   }
   alert("Check-in and today’s app snapshot copied. Paste into your Daily Life ChatGPT conversation, then talk naturally.");
  }catch(e){alert("Could not copy automatically. Open ChatGPT and say: Daily Life check-in, ask me one question at a time.")}
 }
 function chatCheckinOpenChat(){
  // A new tab may intentionally return null when opened with noopener.
  // Do not mistake that for an error or claim that the chat received the prompt.
  window.open("https://chatgpt.com/","_blank","noopener,noreferrer");
 }
 async function chatCheckinSync(){
  if(typeof cloudPullLifeEntries!=="function"){alert("ChatGPT import isn't available in this version of the app.");return}
  await cloudPullLifeEntries(true);
 }
 function quickReviewRows(){
  if(typeof dailyReviewExpected!=="function")return [];
  return dailyReviewExpected(ymd()).filter(x=>x.status==="unknown"&&(x.kind==="chore"||x.kind==="task"||x.kind==="routine"));
 }
 function quickReviewItem(){
  const rows=quickReviewRows();
  if(!rows.length)return null;
  return rows[quickCursor%rows.length];
 }
 async function chatCheckinQuickAnswer(status){
  if(quickBusy||!["yes","no","later"].includes(status))return;
  const item=quickReviewItem();if(!item)return;
  if(status==="later"){quickCursor++;render();return}
  if(typeof applyDailyReview!=="function")return;
  quickBusy=true;
  try{
   await applyDailyReview(item.kind,item.key,ymd(),status,false);
   quickCursor=0; // Always show the first remaining unknown after an answer.
   // The answered item falls out of the unresolved list automatically.
   // Nothing was inferred for items not explicitly answered.
  }catch(error){alert("Could not save that answer. Please try again.")}
  finally{quickBusy=false}
 }
 function quickReviewNudge(){
  // Ask about actual daily tasks only during the evening, after there's been
  // an opportunity to complete them. During early UPS hours don't nag about
  // activities that have not happened yet.
  if(new Date().getHours()<18)return "";
  const rows=quickReviewRows(),item=quickReviewItem();
  if(!item)return "";
  return '<div class="dl-quick-review" role="group" aria-label="Quick Daily Life review">'+
   '<div class="dl-quick-review-label"><span>ONE QUICK CHECK-IN · '+rows.length+' still unknown</span><b>'+esc(item.label)+'</b></div>'+
   '<div class="dl-quick-review-buttons">'+
    '<button type="button" onclick="chatCheckinQuickAnswer(\'yes\')">✓ Yes</button>'+
    '<button type="button" onclick="chatCheckinQuickAnswer(\'no\')">No</button>'+
    '<button type="button" onclick="chatCheckinQuickAnswer(\'later\')">Later ›</button>'+
   '</div></div>';
 }
 function chatCheckinNudge(){
  const p=prompts()[0],part=dayPart(),date=ymd(),shift=(state.workShifts||[]).find(x=>x.date===date),
    finished=!!shift&&(typeof workEndConfirmed==="function"?workEndConfirmed(shift):!!shift.end),
    title=part==="early"?"Morning check-in":part==="after"?(finished?"After-work check-in":"Morning update"):part==="afternoon"?"Afternoon update":"Evening recap";
  return '<div class="dl-chat-checkin-wrap"><button type="button" class="dl-chat-nudge" onclick="openChatCheckin()" aria-label="'+esc(title)+' in ChatGPT">'+
   '<span class="dl-chat-nudge-icon" aria-hidden="true">🎙️</span>'+
   '<span class="dl-chat-nudge-copy"><b>'+esc(title)+'</b><small>'+esc(p)+'</small></span>'+
   '<span class="dl-chat-nudge-arrow" aria-hidden="true">›</span></button>'+quickReviewNudge()+'</div>';
 }
 window.openChatCheckin=function(){promptIndex=0;show()};
 window.chatCheckinNext=chatCheckinNext;
 window.chatCheckinCopy=chatCheckinCopy;
 window.chatCheckinOpenChat=chatCheckinOpenChat;
 window.chatCheckinSync=chatCheckinSync;
 window.chatCheckinNudge=chatCheckinNudge;
 window.chatCheckinQuickAnswer=chatCheckinQuickAnswer;
})();