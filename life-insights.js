/* Practical, evidence-based patterns from Daily Life records. */
(function(){
"use strict";
let filter="All";
const types=["All","Health","Time","Money","Home","Family"];
const entries=key=>Array.isArray(state[key])?state[key]:[];
const current=()=>ymd();
function lastDays(count){
 const d=new Date(current()+"T12:00:00"),days=[];
 for(let i=count-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);days.push(ymd(x))}
 return days;
}
function insights(){
 const out=[],days=lastDays(7),today=current();
 const add=(cat,id,icon,title,why,help,action)=>out.push({cat,id,icon,title,why,help,action});
 const food=entries("foodLogs").filter(x=>days.includes(x.date));
 const logged=new Set(food.map(x=>x.date)).size;
 if(logged<=2)add("Health","food-gap","🍎","Food records need a check-in",
  "Meals/drinks entered on "+logged+" of the past 7 days.",
  "Unlogged is not the same as uneaten. Record what you actually had to improve later insights.","Food");
 const water=entries("waterLogs").filter(x=>days.includes(x.date));
 if(!water.length)add("Health","water-gap","💧","Check your water entries","No water amounts were entered in the past 7 days.",
  "You might still have drunk water. Log what you can confirm, rather than assuming zero.","Water");
 const sleeps=entries("sleepLogs").filter(x=>days.includes(x.date)).map(x=>{
  const h=x.actualSleepHours!==null&&x.actualSleepHours!==undefined?Number(x.actualSleepHours):
   typeof sleepWindowHours==="function"?sleepWindowHours(x):null;
  return Number.isFinite(h)&&h>0&&h<=14?h:null;
 }).filter(x=>x!==null);
 if(sleeps.length>=3){
  const avg=sleeps.reduce((n,x)=>n+x,0)/sleeps.length,goal=Number(state.settings?.itinerary?.sleepTargetHours)||8;
  if(avg<goal-.75)add("Health","sleep-short","🌙","Give sleep a little more room",
   sleeps.length+" recorded nights averaged "+avg.toFixed(1)+" hours against a "+goal+"-hour goal.",
   "Consider an earlier wind-down or a rest block when possible, instead of adding another chore.","Sleep");
 }
 if(entries("workShifts").some(x=>x.date===today&&x.end))
  add("Time","work-finished","⏳","Choose one after-work priority","Your UPS shift has a recorded end today.",
    "Pick one small task or something enjoyable. Leave space for a meal, water and rest.","Day Flow");
 const reviews=typeof dailyReviewExpected==="function"?dailyReviewExpected(today):[];
 const unknown=reviews.filter(x=>x.status==="unknown").length;
 if(unknown>=5)add("Time","review-unknown","◌","Fill a few tracking gaps",unknown+" daily checks are still unknown.",
   "A quick review improves insights. Unknown does not count against your progress.","Check-ins");
 // Only compare household tasks when there are enough completed entries to learn a cadence.
 const byTask=new Map();
 for(const log of entries("homeLogs").filter(x=>x.status==="done"&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||"")))){
  const label=String(log.task||"").trim();if(!label)continue;
  const set=byTask.get(label)||new Set();set.add(log.date);byTask.set(label,set);
 }
 for(const [task,set] of byTask){
  const dates=[...set].sort();if(dates.length<3)continue;
  const intervals=[];
  for(let i=1;i<dates.length;i++){
   const gap=Math.round((new Date(dates[i]+"T12:00:00")-new Date(dates[i-1]+"T12:00:00"))/86400000);
   if(gap>0)intervals.push(gap);
  }
  if(intervals.length<2)continue;
  const recent=intervals.slice(-5).sort((a,b)=>a-b),typical=recent[Math.floor(recent.length/2)],
   since=Math.round((new Date(today+"T12:00:00")-new Date(dates[dates.length-1]+"T12:00:00"))/86400000);
  if(since>Math.max(3,typical*1.6)&&since<50){
   add("Home","cadence-"+task.toLowerCase().replace(/[^a-z0-9]/g,"-"),"🧹","Check on "+task,
    "Latest completion logged "+since+" days ago; last intervals were typically about "+typical+" days.",
    "This could be a missing checkmark rather than missed cleaning. Check the area and record what actually happened.","Home care");
   break;
  }
 }
 const house=typeof homeOrganizationSummary==="function"?homeOrganizationSummary():null;
 if(house?.configured===0)add("Home","map-house","📦","Start with a small area","No organizing category has a total area goal yet.",
   "Set a goal for one drawer, shelf or paper stack. Progress should count what you confirm.","Organize");
 else if(house&&house.goalsConfirmed&&house.week<house.weeklyGoal)add("Home","organizing-week","🌱","Small organizing progress",
   house.week+" of "+house.weeklyGoal+" areas confirmed this week.",
   "Try one small paper stack before buying extra storage.","Papers");
 const pending=typeof practiceProofSummary==="function"?practiceProofSummary():null;
 if(pending?.waiting>0)add("Family","review-proof","📷","Optional worksheets need review",
   pending.waiting+" completed photo submissions are awaiting parent approval.",
   "Check the saved pictures before giving credit; a photo alone is not a reward.","Papers");
 const bills=entries("bills").filter(x=>x.status!=="paid"&&
   (typeof billForecastIncluded!=="function"||billForecastIncluded(x)));
 const blank=bills.filter(x=>x.amount===null||x.amount===undefined||x.amount===""||!Number.isFinite(Number(x.amount)));
 if(blank.length)add("Money","bill-amounts","💵","Bill amounts need confirmation",
   blank.length+" scheduled bill(s) have no known amount.","Don't replace unknown with $0. Wait for the real statement.","Money");
 const utilities=entries("utilityBillHistory").filter(x=>/^\d{4}-\d{2}$/.test(String(x.month||""))&&
  x.total!==null&&x.total!==undefined&&Number.isFinite(Number(x.total)));
 if(utilities.length<2)add("Money","electric-start","⚡","Begin an electricity savings baseline",
  utilities.length+" monthly electricity bill(s) recorded.",
  "Photograph bills in ChatGPT to capture month, total, kWh and billing days. Two months enable comparisons.","Electricity");
 else{
  const a=utilities.slice().sort((x,y)=>x.month.localeCompare(y.month)).slice(-2);
  const old=a[0],now=a[1],oldTotal=Number(old.total),newTotal=Number(now.total);
  if(oldTotal>0){
   const delta=Math.round((newTotal-oldTotal)/oldTotal*100),prior=Number(old.kwh),next=Number(now.kwh);
   const validUsage=old.kwh!==null&&old.kwh!==undefined&&now.kwh!==null&&now.kwh!==undefined&&prior>0;
   const usage=validUsage?Math.round((next-prior)/prior*100):null;
   add("Money","electric-trend","⚡","Compare actual electricity costs",
    old.month+": "+money(oldTotal)+" → "+now.month+": "+money(newTotal)+" ("+(delta>=0?"+":"")+delta+"%)."+
      (usage===null?" kWh comparison missing.":" Usage change "+(usage>=0?"+":"")+usage+"%."),
    "If usage increased, check thermostat schedules, HVAC filters, weather and always-on appliances. If kWh stayed similar but the bill grew, check billing days, fixed fees and rates before buying anything.","Electricity");
  }
 }
 return out;
}
function allowed(){return insights().filter(x=>String(state.settings?.insightSnoozes?.[x.id]||"")<current())}
window.lifeInsightsData=insights;
window.lifeInsightNudge=function(){
 const x=allowed()[0];
 return x?'<button class="li-teaser" onclick="openLifeInsights()"><span>✦</span><div><b>Daily Life noticed</b><small>'+esc(x.title)+'</small></div><strong>See insights ›</strong></button>':"";
};
window.openLifeInsights=function(cat){
 if(types.includes(cat))filter=cat;
 const xs=allowed().filter(x=>filter==="All"||x.cat===filter);
 const tabs=types.map(x=>'<button class="'+(x===filter?"active":"")+'" onclick="openLifeInsights(\''+x+'\')">'+x+'</button>').join("");
 const cards=xs.map(x=>'<article class="li-card"><div class="li-head"><span>'+x.icon+'</span><div><b>'+esc(x.title)+'</b><small>'+x.cat+'</small></div></div>'+
   '<div class="li-evidence">Observed: '+esc(x.why)+'</div><p>'+esc(x.help)+'</p>'+
   '<div class="li-actions"><button onclick="lifeInsightAction(\''+x.id+'\')">'+esc(x.action)+' ›</button>'+
   '<button onclick="lifeInsightHide(\''+x.id+'\')">Hide 7 days</button></div></article>').join("");
 modal("✦ Insights + improvements",'<div class="li-layout"><p class="li-intro">These ideas use recorded information. Missing entries are unknown, not evidence something did not happen.</p>'+
  '<div class="li-tabs">'+tabs+'</div>'+(cards||'<p class="li-intro">No suggestions in this category yet.</p>')+
  '<div class="li-footer"><button onclick="openElectricityHistory()">⚡ Electricity history</button><button onclick="openDailyWeeklyProgress()">◉ Weekly goals</button></div>'+
  '<p class="li-disclaimer">Not a diagnosis or a guarantee of savings. Food logs alone cannot establish nutrient deficiencies or a need for supplements.</p></div>',"Close",closeModal);
};
window.lifeInsightAction=function(id){
 const x=insights().find(x=>x.id===id);if(!x)return;closeModal();
 switch(x.action){
  case "Food":openFood();break;case "Water":addWater(26);break;case "Sleep":openSleep();break;
  case "Day Flow":setView("today");break;case "Check-ins":openDailyReview();break;
  case "Organize":openHomeGoals();break;case "Home care":openHome();break;case "Papers":openPaperStudio();break;
  case "Money":setView("more");break;case "Electricity":openElectricityHistory();break;
 }
};
window.lifeInsightHide=async function(id){
 if(!insights().some(x=>x.id===id))return;
 if(!state.settings)state.settings={};if(!state.settings.insightSnoozes)state.settings.insightSnoozes={};
 const d=new Date(current()+"T12:00:00");d.setDate(d.getDate()+7);state.settings.insightSnoozes[id]=ymd(d);
 await save();window.openLifeInsights();
};
})();