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
   sleep=(state.sleepLogs||[]).find(x=>x.date===date),
   foodCount=(state.foodLogs||[]).filter(x=>x.date===date).length,
   waterOz=(state.waterLogs||[]).filter(x=>x.date===date).reduce((n,x)=>n+Number(x.oz||0),0),
   chores=(state.chores||[]).filter(x=>x.date===date),
   dinner=typeof mealForDate==="function"?mealForDate(date):null;
  const sleepQuestion=sleep?"Your sleep was logged. How is your energy now, and has anything changed since then?":part==="early"?"How did you sleep, and how are you feeling before today starts?":"How was your sleep last night, and how is your energy now?";
  const workQuestion=workday?(shift?.end?"How did your UPS shift go, and was anything different?":"How did UPS go today? No need to remember exact punch times unless you have them."):"What have you been doing today?";
  const foodQuestion=foodCount?"You have "+foodCount+" food or drink entries logged today. Anything else you've had since then?":"What have you eaten or had to drink so far? Approximate amounts are fine; I'll ask about anything important that is unclear.";
  const waterQuestion=waterOz>0?"You have "+waterOz+" oz of water logged today. Have you had any more?":"Have you had any water today, and roughly how much?";
  const kidsQuestion=chores.length?"What's happened with the kids today? Any chores, homework, reading, school updates, or plans to record?":"Any news about the kids, school, family plans, or the house?";
  const dinnerQuestion=dinner?.dish?"The dinner plan says "+dinner.dish+". Did that happen, or has anything changed?":"What is dinner tonight? Is it planned, cooking, or already eaten?";
  const updatesQuestion="What else happened, changed, got finished, or needs to be remembered? You can just talk naturally.";
  if(part==="early")return [sleepQuestion,"Anything important on today's schedule or things you'd like me to remember?",foodQuestion,updatesQuestion];
  if(part==="after")return [workQuestion,sleepQuestion,foodQuestion,waterQuestion,updatesQuestion];
  if(part==="afternoon")return [kidsQuestion,foodQuestion,waterQuestion,dinnerQuestion,updatesQuestion];
  return [dinnerQuestion,kidsQuestion,waterQuestion,updatesQuestion,sleepQuestion];
 }
 function checkinStarter(){
  const date=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const questions=prompts(),question=questions[promptIndex%questions.length];
  return "Daily Life check-in for "+date+". Please ask me one question at a time about what happened today, including work/sleep, food/drinks/water, children/chores, plans and anything I finished. I'm going to tell you naturally. Organize confirmed facts into the correct Daily Life sections and write supported entries to my connected Daily Life cloud when access is available. Confirm what actually synced. Don't assume an unlogged task was skipped; leave unknowns unknown. Start with: "+question;
 }
 function content(){
  const list=prompts(),question=list[promptIndex%list.length];
  const date=typeof ymd==="function"?ymd():"",oz=(state.waterLogs||[]).filter(x=>x.date===date).reduce((n,x)=>n+Number(x.oz||0),0);
  const chores=(state.chores||[]).filter(x=>x.date===date),marked=chores.filter(x=>x.done).length;
  return '<div class="chat-checkin-modal">'+
   '<div class="chat-checkin-counters"><span>💧 '+Math.round(oz)+' oz logged</span><span>♡ '+marked+'/'+chores.length+' chores marked</span></div>'+
   '<div class="chat-checkin-question"><span class="eyebrow">QUESTION '+(promptIndex%list.length+1)+' / '+list.length+'</span><h3>'+esc(question)+'</h3></div>'+
   '<div class="chat-checkin-actions">'+
    '<button type="button" class="btn primary" onclick="chatCheckinCopy()">Copy starter for ChatGPT</button>'+
    '<button type="button" class="btn" onclick="chatCheckinNext()">Next question ›</button>'+
    '<button type="button" class="btn" onclick="chatCheckinOpenChat()">Open ChatGPT ↗</button>'+
   '</div>'+
   '<p class="chat-checkin-help">You can speak freely in your existing Daily Life ChatGPT conversation. The phone microphone works there. Copy the starter only if you want a guided check-in; you don’t need to fill out a form here.</p>'+
   '<div class="chat-checkin-secondary"><button type="button" onclick="closeModal();openDailyReview()">Review missing checkmarks</button>'+
   (typeof cloudUser==="function"&&cloudUser()?'<button type="button" onclick="chatCheckinSync()">Pull saved ChatGPT logs</button>':"")+'</div>'+
   '<p class="chat-checkin-footnote">Talking does not itself save a record to the app. Only imported or confirmed entries are marked as logged; everything else stays unknown.</p>'+
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
   alert("Check-in starter copied. Paste it into your existing Daily Life ChatGPT conversation and talk naturally.");
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
  return dailyReviewExpected(ymd()).filter(x=>x.status==="unknown"&&(x.kind==="chore"||x.kind==="task"));
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
  const p=prompts()[0];
  return '<div class="dl-chat-checkin-wrap"><button type="button" class="dl-chat-nudge" onclick="openChatCheckin()" aria-label="Start a guided ChatGPT check-in">'+
   '<span class="dl-chat-nudge-icon" aria-hidden="true">🎙️</span>'+
   '<span class="dl-chat-nudge-copy"><b>Tell me about your day</b><small>'+esc(p)+'</small></span>'+
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