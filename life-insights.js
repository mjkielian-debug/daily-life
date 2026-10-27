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

/* All-life trends reuse saved Daily Life logs. Missing records stay as gaps. */
function lifeTrendDates(days){
 const out=[],d=new Date(current()+"T12:00:00");
 for(let i=days-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(ymd(x))}
 return out;
}
function lifeTrendChart(title,series,unit,days){
 const seen=series.filter(v=>v!==null&&Number.isFinite(Number(v))).map(Number);
 const max=Math.max(1,...seen),min=0,w=300,h=96,left=6,right=6,top=8,bottom=9,
       usableW=w-left-right,usableH=h-top-bottom,
       xy=(v,i)=>[left+(series.length<2?usableW/2:i*usableW/(series.length-1)),top+usableH-(Number(v)||0)/max*usableH];
 let path="",last=-2;
 series.forEach((v,i)=>{if(v===null||!Number.isFinite(Number(v))){last=-2;return}
   const [x,y]=xy(v,i);path+=(last===i-1?" L ":" M ")+x.toFixed(1)+" "+y.toFixed(1);last=i;
 });
 const dots=series.map((v,i)=>{if(v===null||!Number.isFinite(Number(v)))return"";
   const [x,y]=xy(v,i),date=lifeTrendChart.dates[i]||"",display=Number(v).toFixed(Number(v)%1?1:0);
   return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.2"><title>'+esc(date)+': '+esc(display)+' '+esc(unit)+'</title></circle>';
 }).join("");
 const labels=lifeTrendChart.dates.map((d,i)=>{
   const show=days<=7||i===0||i===days-1||(i+1)%7===0;
   if(!show)return '<span></span>';
   return '<span>'+esc(days<=7?new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"}):String(Number(d.slice(8))))+'</span>';
 }).join("");
 const summary=seen.length?seen.length+" logged day"+(seen.length===1?"":"s"):"No entries in this period";
 return '<section class="life-trend-chart"><div class="life-trend-heading"><b>'+esc(title)+'</b><small>'+esc(summary)+'</small></div>'+
  '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(title)+' over '+days+' days; gaps indicate no entry">'+
  '<path class="life-trend-grid" d="M'+left+' '+(top+usableH)+' H'+(w-right)+' M'+left+' '+(top+usableH/2)+' H'+(w-right)+'"/>'+
  (path?'<path class="life-trend-line" d="'+path+'"/>':"")+
  '<g class="life-trend-dots">'+dots+'</g></svg><div class="life-trend-labels">'+labels+'</div></section>';
}
function lifeTrendCard(title,values,unit,dates,days){
 lifeTrendChart.dates=dates;
 const formatted=values.map(v=>v===null?"—":(Number(v)%1?Number(v).toFixed(1):Number(v))+unit);
 return lifeTrendChart(title,values,unit,days)+'<div class="life-trend-values" aria-label="'+esc(title)+' daily values">'+
  dates.map((d,i)=>'<span title="'+esc(d)+'">'+esc(formatted[i])+'</span>').join("")+'</div>';
}
function lifeTrendKnownCount(logs,dates,doneOnly=false){
 return dates.map(d=>{
   const rows=logs.filter(x=>x.date===d&&(!doneOnly||x.done||x.status==="done"));
   if(rows.length)return rows.length;
   const hadAny=logs.some(x=>x.date===d);
   return hadAny?0:null;
 });
}
function lifeTrendSelfCare(dates){
 const habits=typeof selfCareHabits==="function"?selfCareHabits():[],
       logs=entries("selfCare"),reviews=entries("dailyReviews");
 if(!habits.length)return '<p class="li-intro">No self-care habits are configured yet.</p>';
 return '<div class="life-trend-selfcare">'+habits.map(h=>{
   const values=dates.map(d=>{
     const row=logs.find(x=>x.date===d&&String(x.key)===String(h.key));
     if(row)return Math.max(0,Number(row.count!==undefined?row.count:(row.done?1:0))||0);
     const review=reviews.find(x=>x.date===d&&x.kind==="care"&&String(x.key)===String(h.key));
     return review&&["no","na","n/a"].includes(String(review.status||"").toLowerCase())?0:null;
   });
   const known=values.filter(v=>v!==null),daysDone=values.filter(v=>Number(v)>0).length,
         occurrences=values.reduce((n,v)=>n+(v===null?0:Number(v)||0),0),
         frequency=known.length?daysDone+"/"+known.length+" confirmed days":"No confirmed entries",
         metric=occurrences+" occurrence"+(occurrences===1?"":"s");
   lifeTrendChart.dates=dates;
   return '<div class="life-trend-habit"><div><b>'+esc(h.label||h.key)+'</b><small>'+esc(metric)+' · '+esc(frequency)+'</small></div>'+lifeTrendChart("",values,"",dates.length)+'</div>';
 }).join("")+'</div>';
}
function lifeTrendContent(days){
 const dates=lifeTrendDates(days),inRange=x=>dates.includes(String(x?.date||"")),
       food=entries("foodLogs"),water=entries("waterLogs"),
       sleep=entries("sleepLogs"),work=entries("workShifts"),
       workouts=entries("workouts"),reading=entries("readingLogs"),
       outfits=entries("outfits"),home=entries("homeLogs"),
       chores=entries("chores"),tasks=entries("tasks");
 const daily=(rows,d,filter=()=>true)=>rows.filter(x=>x.date===d&&filter(x));
 const measured=(rows,key,mapper)=>dates.map(d=>{const found=daily(rows,d);return found.length?mapper(found):null});
 const sleepVals=dates.map(d=>{const row=sleep.find(x=>x.date===d);const value=row&&typeof sleepHours==="function"?Number(sleepHours(row)):0;return value>0?value:null});
 const workVals=dates.map(d=>{const rows=daily(work,d,x=>!!(x.start||x.timecardVerified));return rows.length?rows.reduce((n,x)=>n+(typeof workCreditedHours==="function"?Number(workCreditedHours(x)):(Number(x.hours)||0)),0):null});
 const foodRows=dates.map(d=>daily(food,d)),foodVals=foodRows.map(rows=>rows.length?rows.reduce((n,x)=>n+Number(x.calories||0)*(typeof foodQuantity==="function"?foodQuantity(x):Number(x.quantity||1)),0):null),
       proteinVals=foodRows.map(rows=>rows.length?rows.reduce((n,x)=>n+Number(x.protein||0)*(typeof foodQuantity==="function"?foodQuantity(x):Number(x.quantity||1)),0):null),
       waterVals=measured(water,"oz",rows=>rows.reduce((n,x)=>n+Number(x.oz||0),0)),
       workoutVals=measured(workouts,"minutes",rows=>rows.reduce((n,x)=>n+Number(x.minutes||0),0)),
       readingVals=measured(reading,"pages",rows=>rows.reduce((n,x)=>n+Number(x.pages||0),0)),
       outfitVals=dates.map(d=>outfits.some(x=>x.date===d)?1:null),
       homeVals=dates.map(d=>{const rows=daily(home,d);return rows.length?rows.filter(x=>x.status==="done").length:null}),
       taskVals=dates.map(d=>{const rows=[...daily(chores,d),...daily(tasks,d)];return rows.length?rows.filter(x=>x.done).length:null});
 const period=days===7?"Past 7 days":"Past 30 days";
 return '<div class="life-trends">'+
  '<div class="life-trends-toolbar"><div class="li-tabs"><button class="'+(days===7?"active":"")+'" onclick="openLifeTrends(7)">7 days</button><button class="'+(days===30?"active":"")+'" onclick="openLifeTrends(30)">30 days</button></div><span class="muted small">'+esc(period)+'</span></div>'+
  '<p class="li-intro">These charts use saved entries. Gaps mean no entry was recorded; they do not mean you skipped the activity.</p>'+
  '<div class="life-trends-group"><h3>Sleep + work</h3>'+lifeTrendCard("Sleep",sleepVals," h",dates,days)+lifeTrendCard("Work hours",workVals," h",dates,days)+'</div>'+
  '<div class="life-trends-group"><h3>Food + hydration</h3>'+lifeTrendCard("Calories",foodVals,"",dates,days)+lifeTrendCard("Protein",proteinVals," g",dates,days)+lifeTrendCard("Water",waterVals," oz",dates,days)+'</div>'+
  '<div class="life-trends-group"><h3>Daily routines</h3><div class="muted small">Habit rows show recorded occurrences and confirmed days.</div>'+lifeTrendSelfCare(dates)+'</div>'+
  '<div class="life-trends-group"><h3>Other tracked activity</h3>'+lifeTrendCard("Movement",workoutVals," min",dates,days)+lifeTrendCard("Reading",readingVals," pages",dates,days)+lifeTrendCard("Outfit logged",outfitVals,"",dates,days)+lifeTrendCard("Home resets",homeVals,"",dates,days)+lifeTrendCard("Tasks + chores completed",taskVals,"",dates,days)+'</div>'+
 '</div>';
}
window.openLifeTrends=function(days=7){
 const span=Number(days)===30?30:7;
 modal("All life trends",lifeTrendContent(span),"Close",closeModal);
};
window.sevenDayTrends=function(){
 return '<div class="card"><div class="eyebrow">Trends</div><h2>Your tracked patterns</h2><div class="muted small">Sleep, work, food, water, self-care and more.</div><button class="btn small primary" style="margin-top:10px" onclick="openLifeTrends(7)">View trends ›</button></div>';
};
if(typeof window.openFoodHubSection==="function"){
 const originalOpenFoodHubSection=window.openFoodHubSection;
 window.openFoodHubSection=function(section){
   if(section==="trends"){window.openLifeTrends(7);return}
   return originalOpenFoodHubSection(section);
 };
}
})();