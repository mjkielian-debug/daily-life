/* Daily Life — action-first guidance.
   Recommendations are inferred from records already in state. A recommendation is
   not a claim of completion. Opening/later never changes bills, tasks, or finances. */
(function(){
"use strict";
const STORE="dailyLifeDirectiveDeferred_v1";
function today(){return typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)}
function clean(s){return String(s===undefined||s===null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function call(name,args){const fn=window[name];if(typeof fn==="function")return fn.apply(null,args||[])}
function push(list,id,title,why,button,run,rank,optional){
 if(!title||typeof run!=="function")return;
 list.push({id:id,title:String(title),why:String(why||""),button:String(button||"Open steps"),run:run,rank:rank||0,optional:!!optional});
}
function deferred(){
 try{const d=JSON.parse(localStorage.getItem(STORE)||"{}");return d&&d.date===today()&&typeof d.pages==="object"?d.pages:{};}catch(_){return {}}
}
function storeDeferred(pages){try{localStorage.setItem(STORE,JSON.stringify({date:today(),pages:pages}));}catch(_){}}
function choices(page,model){
 const s=typeof state==="object"&&state?state:{},list=[],d=today(),safePage=String(page||"");
 const add=(id,title,why,button,run,rank,optional)=>push(list,id,title,why,button,run,rank,optional);
 if(safePage==="today"||safePage==="itinerary"){
  const dt=safePage==="itinerary"&&typeof itineraryDate==="string"?itineraryDate:d;
  const items=typeof itineraryDayItems==="function"?itineraryDayItems(dt):[];
  const current=typeof dayFlowCurrentItem==="function"?dayFlowCurrentItem(dt,items):null;
  if(current&&!current.done&&current.kind!=="gap"){
   const when=current.start&&typeof fmtClock==="function"?fmtClock(current.start):"Next scheduled";
   const hm=String(current.start||"").match(/^(\\d{1,2}):(\\d{2})$/),startMins=hm?Number(hm[1])*60+Number(hm[2]):null;
   const nowDate=new Date(),until=startMins===null?null:startMins-(nowDate.getHours()*60+nowDate.getMinutes());
   const rank=safePage==="today"&&until!==null&&until>90?32:100;
   add("block:"+dt+":"+(current.sourceId||current.id||current.start||current.title),"Open "+String(current.title||"your scheduled block"),when+" · Check the plan and record progress only when you have done it.","Open this block",()=>call("openDayFlowSection",["plan",dt]),rank);
  }
  const loose=safePage==="itinerary"&&typeof itineraryTaskCandidates==="function"?itineraryTaskCandidates(dt):[];
  if(loose.length)add("loose:"+dt,"Place an unscheduled task",loose.length+" possible tasks still need a place in your day.","Review loose tasks",()=>call("openDayFlowSection",["unscheduled",dt]),62);
 }
 if(safePage==="today"){
  const projects=typeof nextLifeAdminAction==="function"?nextLifeAdminAction():null;
  if(projects&&projects.projectId)add("admin:"+projects.projectId,projects.title,projects.notes||"A next step saved with your project.","Open the project",()=>call("openProject",[projects.projectId]),48);
  const pending=(s.tasks||[]).filter(x=>x.date===d&&!x.done&&!x.paused&&String(x.title||"").trim()&&!/^(ups shift|bedtime wind.?down)$/i.test(String(x.title||"")));
  if(pending.length){const t=pending[0];add("task:"+t.id,"Work on "+t.title,(t.child?t.child+" · ":"")+String(t.notes||"Your saved task for today."),"Open task details",()=>call("openTaskDetails",[t.id]),64);}
  const chore=typeof displayChoresForDate==="function"?displayChoresForDate(d).find(x=>!x.done):null;
  if(chore)add("chore:"+chore.id,"Check "+[chore.child,chore.chore].filter(Boolean).join(" · "),"Today's family chore is not marked complete. Ask/check before recording it.","Open family checklist",()=>call("openPeopleHubSection",["routines"]),35);
  const financial=typeof moneyNextActionSummary==="function"?moneyNextActionSummary():null;
  const exit=(s.settings&&Array.isArray(s.settings.bankExitPlans)?s.settings.bankExitPlans:[]).find(x=>x.priority&&x.status!=="closed");
  if(exit&&exit.renewalDate&&exit.renewalDate>=d&&exit.renewalDate<= (typeof shiftDateString==="function"?shiftDateString(d,2):d)){
    add("bank:"+exit.id,"Review "+exit.institution+" before "+exit.renewalDate,
    "Verify the renewal and linked payments before taking any closure action.","Review closure steps",()=>call("moneyRunNextAction",[]),83);
  }else if(financial&&financial.index!==undefined){
    const rows=typeof billReadiness==="function"?billReadiness():[];
    const due=rows.find(x=>x.index===financial.index)?.bill?.due;
    if(due&&due<= (typeof shiftDateString==="function"?shiftDateString(d,2):d))add("bill:"+financial.index,financial.title,financial.detail,"Review this bill",()=>call("moneyRunNextAction",[]),78);
  }
 }
 if(safePage==="home"||safePage==="today"){
  const meal=typeof todayMeal==="function"?todayMeal():null;
  const needs=meal&&typeof mealShoppingNeeds==="function"?mealShoppingNeeds(meal):[];
  if(meal&&meal.dish&&meal.status!=="made"&&meal.status!=="skipped"){
   if(needs.length)add("groceries:"+d,"Check "+needs.length+" missing dinner item"+(needs.length===1?"":"s"),meal.dish+" · Review what is needed before cooking.","Open grocery list",()=>call("openFoodHubSection",["grocery"]),safePage==="home"?93:52);
   add("dinner:"+d,"Prepare "+meal.dish,meal.startBy&&typeof fmtClock==="function"?"Plan to start by "+fmtClock(meal.startBy)+".":"Open the recipe and check what is ready.","Open dinner plan",()=>call("openMeal",[d]),safePage==="home"?81:43);
  }else if(!meal||!meal.dish){
   add("dinner-plan:"+d,"Choose what to do for dinner","No dinner choice is recorded yet; check whether a meal or outside plan is already arranged.","Plan dinner",()=>call("openMeal",[d]),safePage==="home"?84:26);
  }
 }
 if(safePage==="more"){
  const next=typeof moneyNextActionSummary==="function"?moneyNextActionSummary():null;
  if(next&&next.title!=="No money move needed")add("money:next",next.title,next.detail||"Review actual bill records before acting.","Review next step",()=>call("moneyRunNextAction",[]),100);
  else add("money:review","Check the next bill before moving money","The entered information has no urgent next move; confirm bill dates and account balances before transferring.","Review bills",()=>call("openMoneyHubSection",["bills"]),72);
  add("money:goals","Choose one financial goal to advance","A single small step is more useful than reviewing every number again.","Open money goals",()=>call("openMoneyHubSection",["goals"]),35);
 }
 if(safePage==="budget"){
  const t=typeof budgetTotals==="function"?budgetTotals():null;
  if(t&&t.plan?.income===null)add("budget:income","Enter your expected cash income","EBT is separate from spendable cash. Only enter an income amount you can reasonably estimate.","Edit income",()=>call("openBudgetIncome",[]),100);
  else if(t&&t.remaining<0)add("budget:short","Review the cash shortfall","Your entered bills and spending exceed planned cash. Confirm bills before cutting essentials.","Review bills",()=>call("openBudgetHubSection",["bills"]),97);
  else if(t&&t.left<0)add("budget:limits","Adjust category limits","More cash is assigned than the plan allows.","Open categories",()=>call("openBudgetHubSection",["categories"]),92);
  else add("budget:activity","Review recent spending against the plan","Check real transactions before making new spending decisions.","Open activity",()=>call("openBudgetHubSection",["activity"]),75);
  add("budget:bills","Check bills due next","Your bill list is the source for upcoming payment decisions.","Review bills",()=>call("openBudgetHubSection",["bills"]),40);
 }
 if(safePage==="family"){
  const chores=typeof displayChoresForDate==="function"?displayChoresForDate(d):[],open=chores.find(x=>!x.done);
  if(open)add("family:chore:"+open.id,"Check "+[open.child,open.chore].filter(Boolean).join(" · "),"This chore has not been marked done; check it with the child first.","Open chores",()=>call("openPeopleHubSection",["routines"]),85);
  const next=typeof peopleAgendaItems==="function"?peopleAgendaItems().filter(x=>x.date>=d)[0]:null;
  if(next)add("family:plan:"+next.date+":"+next.title,"Prepare for "+next.title,(next.date===d?"Today":next.date)+(next.time?" · "+next.time:""),"Open family plans",()=>call("openPeopleHubSection",["plans"]),65);
  if(!open&&!next)add("family:check","Look over today's family plan","No immediate family action is established from current records.","Open family routines",()=>call("openPeopleHubSection",["routines"]),50);
 }
 if(safePage==="log"){
  const waterNow=typeof water==="function"?water():null;
  if(waterNow!==null&&waterNow<78)add("care:water","Put your water bottle within reach","If you drink, log the actual amount afterward. No catch-up or streak pressure.","Open water log",()=>call("openCareHubSection",["water"]),68,true);
  const review=typeof dailyReviewSummary==="function"?dailyReviewSummary(d):null;
  if(review&&review.unknown)add("care:review","Check one unanswered daily item",review.unknown+" answers are unconfirmed; unknown does not mean undone.","Review one item",()=>call("openDailyReview",[]),55);
  add("care:rest","Check what kind of rest you need","A sleep or care check-in can be more useful than another target.","Open sleep and rest",()=>call("openCareHubSection",["sleep"]),45,true);
 }
 if(safePage==="reading"){
  const count=(s.readingLogs||[]).filter(x=>x.date===d).length;
  add("reading:check","Check in on today's reading",count?"Some pages are logged; add any other reading that happened.":"Nothing has been logged today. That does not mean nobody read.","Open reading log",()=>call("openReadingChooser",[]),80);
 }
 if(safePage==="household"){
  const due=typeof duePetRoutines==="function"?duePetRoutines():[];
  if(due.length)add("household:pet","Check "+String(due[0].title||"pet care"),"This routine is flagged due; confirm before marking care complete.","Open pet care",()=>call("openHouseholdSection",["petcare"]),89);
  const t=(s.tasks||[]).find(x=>x.date===d&&!x.done&&String(x.category||"").toLowerCase()==="home");
  if(t)add("household:task:"+t.id,"Work on "+t.title,"This is a home task saved for today.","Open task",()=>call("openTaskDetails",[t.id]),76);
  if(!due.length&&!t)add("household:reset","Choose one small home reset","Only do what helps today; the room maps and inventory are reference tools.","Open cleaning",()=>call("openHouseholdSection",["cleaning"]),50,true);
 }
 if(safePage==="pets"){
  const due=typeof duePetRoutines==="function"?duePetRoutines():[];
  if(due.length)add("pets:due","Check "+String(due[0].title||"the next pet-care routine"),"Due in the app; confirm what actually needs doing.","Open care routine",()=>call("openPetsHubSection",["overview"]),88);
  else add("pets:check","Check food, water and litter if needed","No pet-care routine is currently flagged due. Only log care after doing it.","Open pet care",()=>call("openPetsHubSection",["overview"]),50,true);
 }
 if(safePage==="inventory"){
  const low=(s.inventoryItems||[]).filter(x=>["Low","Need"].includes(x.status));
  if(low.length)add("inventory:low","Review "+low.length+" flagged supply item"+(low.length===1?"":"s"),"Check what you already have before buying anything.","Open needed items",()=>call("openInventoryLowStock",[]),90);
  else add("inventory:find","Find an item before buying another","Use what you have when possible; organizing paper is optional.","Search inventory",()=>call("openInventoryHubSection",["items"]),50,true);
 }
 if(["garden","gardenhobbies","hobbies"].includes(safePage)){
  const due=(s.plants||[]).find(x=>x.status!=="Finished"&&typeof plantCareState==="function"&&plantCareState(x).due);
  if(due)add("garden:plant:"+due.id,"Check "+due.name+"'s care","The plant-care record is due; verify moisture and needs first.","Open plants",()=>call("openGardenHobbySection",["plants"]),72,true);
  add("garden:fun","Pick a project to enjoy","This is optional creative time, not another obligation.","Browse projects",()=>call("openGardenHobbySection",["projects"]),43,true);
 }
 if(safePage==="itinerary"){
  const dt=typeof itineraryDate==="string"?itineraryDate:d;
  const c=typeof dayFlowConflictAudit==="function"?dayFlowConflictAudit(dt):null;
  if(c&&c.hardCount)add("day:conflicts","Resolve "+c.hardCount+" overlapping time block"+(c.hardCount===1?"":"s"),"Confirm which plans actually conflict before changing them.","Review schedule",()=>call("openDayFlowSection",["plan",dt]),92);
  add("day:review","Check the rest of today's plan","Move or edit blocks to match reality, not a forced schedule.","Open day plan",()=>call("openDayFlowSection",["plan",dt]),25);
 }
 if(safePage==="spirituality"){
  add("spirituality:reflect","Choose a moment of reflection","Tarot and journaling are options for enjoyment, not required tasks.","Open today's reading",()=>call("openSpiritualHubSection",["reading"]),50,true);
 }
 if(safePage==="settings"){
  add("settings:check","Check your backup and connections","Verify that your saved data is recoverable before making large edits.","Open backups",()=>call("openSettingsHubSection",["backup"]),50);
 }
 if(safePage==="vault"){
  add("vault:manage","Review your protected records","Only add or update records you actually need.","Open private records",()=>call("openVaultHubSection",["all"]),50,true);
 }
 list.sort(function(a,b){return b.rank-a.rank;});
 if(!list.length&&model&&model.focusTitle){
  add("general:"+safePage,"Open the next step for "+model.title,model.focusNote||"Review the details and decide what is relevant.","Open section",()=>{const el=document.querySelector(".visual-hub-"+safePage+" .vh-link");if(el)el.click();},20);
 }
 return list;
}
function presented(page,model){
 const skipped=deferred()[page]||[];
 const list=choices(page,model).filter(x=>skipped.indexOf(x.id)===-1);
 return list.length?list:[{id:"overview",title:"Choose a different next step",why:"You've put the suggestions aside for today. You can still open your plans whenever you want.",button:"See overview",run:function(){const el=document.querySelector(".visual-hub-"+page+" .vh-explore");if(el){el.open=true;el.scrollIntoView({block:"nearest",behavior:"smooth"});}},rank:0,optional:true}];
}
window.actionFirstRun=function(page,index){
 const model=page==="today"?null:typeof visualHubModel==="function"?visualHubModel(page):null;
 const c=presented(page,model)[Number(index)||0];if(c&&typeof c.run==="function")c.run();
};
window.actionFirstLater=function(page){
 const model=page==="today"?null:typeof visualHubModel==="function"?visualHubModel(page):null;
 const primary=presented(page,model)[0];if(!primary||primary.id==="overview")return;
 const p=deferred();p[page]=p[page]||[];if(p[page].indexOf(primary.id)===-1)p[page].push(primary.id);
 storeDeferred(p);if(typeof render==="function")render();
};
function button(page,index,label,cls){
 return '<button type="button" class="'+cls+'" onclick="actionFirstRun(\''+clean(page)+'\','+index+')">'+clean(label)+'</button>';
}
function widget(page,model){
 const all=presented(page,model),first=all[0],others=all.slice(1,3);
 const alternative=others.length?'<div class="directive-after"><div class="directive-after-title">After that · or instead</div>'+
 others.map(function(x,i){return '<button type="button" class="directive-mini" onclick="actionFirstRun(\''+clean(page)+'\','+(i+1)+')"><span><b>'+clean(x.title)+'</b><small>'+clean(x.why)+'</small></span><span aria-hidden="true">›</span></button>'}).join("")+'</div>':"";
 return '<section class="directive-focus" aria-label="Recommended next action"><div class="directive-kicker">'+(first.optional?"IF IT HELPS":"DO THIS NEXT")+'</div>'+
 '<h2>'+clean(first.title)+'</h2><p>'+clean(first.why)+'</p>'+
 '<div class="directive-buttons">'+button(page,0,first.button+' ›',"directive-primary")+
 (first.id!=="overview"?'<button type="button" class="directive-later" onclick="actionFirstLater(\''+clean(page)+'\')" aria-label="Show another suggestion for today">Not now</button>':"")+'</div>'+
 alternative+'<small class="directive-disclaimer">Suggestions use saved records; opening a step does not mark it complete. “Not now” only changes today’s suggestions.</small></section>';
}
window.actionFirstMarkup=widget;
window.actionFirstTodayCard=function(){return widget("today",null)};
window.actionFirstRememberOverview=function(page,isOpen){
 try{localStorage.setItem("dailyLifeDirectiveOverview:"+page,isOpen?"1":"0")}catch(_){}
};
window.actionFirstOverviewOpen=function(page){
 try{return localStorage.getItem("dailyLifeDirectiveOverview:"+page)==="1"}catch(_){return false}
};
})();
