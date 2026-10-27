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
function lifeTrendChart(title,series,unit,days,meaning,emptyLabel,scaleMax,valueNames){
 const seen=series.filter(v=>v!==null&&Number.isFinite(Number(v))).map(Number),
       max=Math.max(Number(scaleMax)||1,...seen),mid=max/2,w=320,h=120,left=42,right=6,top=10,bottom=20,
       usableW=w-left-right,usableH=h-top-bottom,
       xy=(v,i)=>[left+(series.length<2?usableW/2:i*usableW/(series.length-1)),top+usableH-(Number(v)||0)/max*usableH],
       number=v=>Number(v).toLocaleString("en-US",{maximumFractionDigits:1}),
       dateLabel=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",days<=7?{weekday:"short",day:"numeric"}:{month:"short",day:"numeric"});
 let solidPath="",gapPaths=[],lastPoint=null;
 series.forEach((v,i)=>{if(v===null||!Number.isFinite(Number(v))){return}
   const [x,y]=xy(v,i),point={x,y,i};
   if(lastPoint){const segment="M"+lastPoint.x.toFixed(1)+" "+lastPoint.y.toFixed(1)+" L "+x.toFixed(1)+" "+y.toFixed(1);
     if(i-lastPoint.i===1)solidPath+=(solidPath?" ":"")+segment;else gapPaths.push(segment);
   }
   lastPoint=point;
 });
 const dots=series.map((v,i)=>{if(v===null||!Number.isFinite(Number(v)))return"";
   const [x,y]=xy(v,i),date=lifeTrendChart.dates[i]||"",display=valueNames&&valueNames[Number(v)]?valueNames[Number(v)]:number(v),spoken=display+(unit?" "+unit:"");
   return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.5" aria-label="'+esc(dateLabel(date)+": "+spoken)+'"><title>'+esc(dateLabel(date)+": "+spoken)+'</title></circle>';
 }).join("");
 const ticks=[max,mid,0],grid=ticks.map(v=>{const y=(top+usableH-(v/max)*usableH).toFixed(1);return "M"+left+" "+y+" H"+(w-right)}).join(" "),
       yLabels=ticks.map(v=>{const y=(top+usableH-(v/max)*usableH+3).toFixed(1);return '<text x="2" y="'+y+'" class="life-trend-axis-label">'+esc(number(v))+'</text>'}).join("");
 const labels=lifeTrendChart.dates.map((d,i)=>({d,i})).filter(({i})=>days<=7||i===0||i===days-1||(i+1)%7===0)
  .map(({d})=>'<span>'+esc(dateLabel(d))+'</span>').join("");
 const average=unit==="hours/night"&&seen.length?seen.reduce((sum,v)=>sum+v,0)/seen.length:null,
       summary=seen.length?seen.length+(unit==="hours/night"?" logged night":" logged day")+(seen.length===1?"":"s")+(average===null?"":" · "+days+"-day avg "+average.toFixed(1)+" h/night"):(emptyLabel||"No entries in this period"),
       unitText=unit||"count",
       exact=series.map((v,i)=>({v,d:lifeTrendChart.dates[i]})).filter(x=>x.v!==null&&Number.isFinite(Number(x.v)))
        .map(x=>'<span><time>'+esc(dateLabel(x.d))+'</time><b>'+esc((valueNames&&valueNames[Number(x.v)]?valueNames[Number(x.v)]:number(x.v))+(unit?" "+unit:""))+'</b></span>').join(""),
       valueList=exact?'<div class="life-trend-values"><strong>Daily values</strong>'+exact+'</div>':"";
 return '<section class="life-trend-chart"><div class="life-trend-heading"><b>'+esc(title)+'</b><small>'+esc(unitText)+' · '+esc(summary)+'</small></div>'+
  (meaning?'<div class="life-trend-meaning">'+esc(meaning)+'</div>':"")+
  '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(title)+' in '+esc(unitText)+' over '+days+' days; missing dates mean no saved entry">'+
  '<path class="life-trend-grid" d="'+grid+'"/>'+yLabels+
  (solidPath?'<path class="life-trend-line" d="'+solidPath+'"/>':"")+
  gapPaths.map(d=>'<path class="life-trend-line life-trend-gap-line" d="'+d+'"/>').join("")+
  '<g class="life-trend-dots">'+dots+'</g></svg><div class="life-trend-labels">'+labels+'</div>'+valueList+'</section>';
}
function lifeTrendCard(title,values,unit,dates,days,meaning,emptyLabel,scaleMax,valueNames){
 lifeTrendChart.dates=dates;
 return lifeTrendChart(title,values,unit,days,meaning,emptyLabel,scaleMax,valueNames);
}
function lifeTrendSelfCare(dates){
 const habits=typeof selfCareHabits==="function"?selfCareHabits():[],
       logs=entries("selfCare"),reviews=entries("dailyReviews");
 if(!habits.length)return '<p class="li-intro">No self-care habits are configured yet.</p>';
 return '<div class="life-trend-selfcare">'+habits.map(h=>{
   const values=dates.map(d=>{
     const row=logs.find(x=>x.date===d&&String(x.key)===String(h.key));
     if(row)return row.done||Number(row.count||0)>0?Math.max(0,Number(row.count!==undefined?row.count:1)||0):0;
     const review=reviews.find(x=>x.date===d&&x.kind==="care"&&String(x.key)===String(h.key));
     const status=String(review?.status||"").trim().toLowerCase();
     if(["yes","done","completed"].includes(status))return 1;
     if(["no","na","n/a"].includes(status))return 0;
     return null;
   });
   const known=values.filter(v=>v!==null),daysDone=values.filter(v=>Number(v)>0).length,
         occurrences=values.reduce((n,v)=>n+(v===null?0:Number(v)||0),0),
         frequency=known.length?daysDone+"/"+known.length+" confirmed days":"No confirmed entries",
         metric=occurrences+" occurrence"+(occurrences===1?"":"s");
   lifeTrendChart.dates=dates;
   return '<div class="life-trend-habit"><div><b>'+esc(h.label||h.key)+'</b><small>'+esc(metric)+' · '+esc(frequency)+'</small></div>'+lifeTrendChart(h.label||h.key,values,"times/day",dates.length)+'</div>';
 }).join("")+'</div>';
}
function lifeTrendSleepPoint(date,sleepRows,workRows){
 const candidates=sleepRows.filter(x=>x.date===date);
 const row=candidates.find(x=>Number(x.actualSleepHours)>0||(x.bedtime&&x.wakeTime))||candidates.find(x=>x.bedtime);
 if(!row)return null;
 const actual=Number(row.actualSleepHours);
 if(Number.isFinite(actual)&&actual>0)return actual;
 if(row.wakeTime&&typeof sleepWindowHours==="function"){
   const hours=Number(sleepWindowHours(row));return hours>0?hours:null;
 }
 const shift=workRows.find(x=>x.date===date&&String(x.status||"").toLowerCase()!=="missed"),start=String(shift?.start||shift?.scheduled||"");
 if(!row.bedtime||!/^\d{2}:\d{2}$/.test(start))return null;
 const [sh,sm]=start.split(":").map(Number),[bh,bm]=String(row.bedtime).split(":").map(Number);
 const wake=(sh*60+sm-60+1440)%1440,bed=bh*60+bm;
 let minutes=wake-bed;if(minutes<0)minutes+=1440;
 return minutes>0?minutes/60:null;
}
function lifeTrendNutrientKnown(row,key){
 const value=row?.[key];
 if(value===undefined||value===null||String(value).trim()==="")return false;
 const uncertain=/unknown|not (?:yet )?(?:confirmed|specified|supplied|verified|estimated|recorded)|do not estimate|intentionally not estimated|not independently verified|amount.*unknown|portion.*unknown/i.test(String(row.notes||""));
 const caffeineSource=/coffee|cafe|café|latte|tea|cola|pepsi|coke|monster|energy|caffein/i.test(String(row.name||"")+" "+String(row.category||""));
 if(Number(value)===0&&(uncertain||(key==="caffeineMg"&&caffeineSource)))return false;
 return Number.isFinite(Number(value));
}
function lifeTrendContent(days){
 const dates=lifeTrendDates(days),
       food=entries("foodLogs"),water=entries("waterLogs"),
       sleep=entries("sleepLogs"),work=entries("workShifts"),
       workouts=entries("workouts"),reading=entries("readingLogs"),
       outfits=entries("outfits");
 const daily=(rows,d,filter=()=>true)=>rows.filter(x=>x.date===d&&filter(x));
 const measured=(rows,key,mapper)=>dates.map(d=>{const found=daily(rows,d);return found.length?mapper(found):null});
 const sleepVals=dates.map(d=>lifeTrendSleepPoint(d,sleep,work)),
       energyVals=dates.map(d=>{const row=sleep.filter(x=>x.date===d).find(x=>x.bedtime&&x.wakeTime)||sleep.find(x=>x.date===d),value=Number(row?.energy||0);return value>0?value:null});
 const workAttendanceVals=dates.map(d=>{
   const rows=daily(work,d),statuses=rows.map(x=>String(x.status||"").toLowerCase());
   if(statuses.some(x=>["missed","no-show","absent"].includes(x)))return 0;
   if(statuses.some(x=>["completed","completed-late","completed-needs-end"].includes(x))||rows.some(x=>!!(x.timecardVerified||(x.start&&x.end))))return 1;
   return null;
 });
 const workTimeVals=dates.map(d=>{
   const rows=daily(work,d),statuses=rows.map(x=>String(x.status||"").toLowerCase());
   if(statuses.some(x=>["missed","no-show","absent"].includes(x)))return 0;
   const row=rows.find(x=>["completed","completed-late","completed-needs-end"].includes(String(x.status||"").toLowerCase())||x.timecardVerified||!!(x.start&&x.end));
   if(!row)return null;
   const toMinutes=value=>{const m=String(value||"").match(/^(\\d{1,2}):(\\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;};
   let start=toMinutes(row.start)||toMinutes(row.scheduled),end=toMinutes(row.end)||toMinutes("09:00");
   if(start===null||end===null)return null;
   if(!row.start&&String(row.status||"").toLowerCase()==="completed-late"){
     const late=String(row.notes||"").match(/(?:about|approximately|~)?\\s*(\\d+)\\s*minutes? late/i);
     if(late)start+=Number(late[1]);
   }
   let minutes=end-start;if(minutes<0)minutes+=1440;
   return minutes>0&&minutes<960?Math.round(minutes/6)/10:null;
 });
 const foodRows=dates.map(d=>daily(food,d)),knownMetric=(rows,key)=>rows.some(x=>lifeTrendNutrientKnown(x,key)),
       foodVals=foodRows.map(rows=>knownMetric(rows,"calories")?rows.reduce((n,x)=>n+Number(x.calories||0)*(typeof foodQuantity==="function"?foodQuantity(x):Number(x.quantity||1)),0):null),
       proteinVals=foodRows.map(rows=>knownMetric(rows,"protein")?rows.reduce((n,x)=>n+Number(x.protein||0)*(typeof foodQuantity==="function"?foodQuantity(x):Number(x.quantity||1)),0):null),
       caffeineVals=foodRows.map(rows=>{const known=rows.filter(x=>lifeTrendNutrientKnown(x,"caffeineMg")&&Number(x.caffeineMg)>0);return known.length?known.reduce((n,x)=>n+Number(x.caffeineMg||0)*(typeof foodQuantity==="function"?foodQuantity(x):Number(x.quantity||1)),0):null}),
       waterVals=measured(water,"oz",rows=>rows.reduce((n,x)=>n+Number(x.oz||0),0)),
       workoutVals=measured(workouts,"minutes",rows=>rows.reduce((n,x)=>n+Number(x.minutes||0),0)),
       readingVals=measured(reading,"pages",rows=>rows.reduce((n,x)=>n+Number(x.pages||0),0)),
       outfitVals=dates.map(d=>outfits.some(x=>x.date===d)?1:null);
 const period=days===7?"Past 7 days":"Past 30 days";
 return '<div class="life-trends">'+
  '<div class="life-trends-toolbar"><div class="li-tabs"><button class="'+(days===7?"active":"")+'" onclick="openLifeTrends(7)">7 days</button><button class="'+(days===30?"active":"")+'" onclick="openLifeTrends(30)">30 days</button></div><span class="muted small">'+esc(period)+'</span></div>'+
  '<p class="li-intro">Missing dates stay blank. Solid lines connect consecutive logged days; dashed lines bridge to the next recorded value across a gap. Work attendance is 1 = attended, 0 = missed. Sleep wake times one hour before a saved shift are estimates.</p>'+
  '<div class="life-trends-group"><h3>Sleep + work</h3>'+lifeTrendCard("Sleep",sleepVals,"hours/night",dates,days)+lifeTrendCard("Energy rating",energyVals,"self-rating out of 5",dates,days,"Your answer to “Energy today” in the Sleep + energy log.","No energy ratings logged",5)+lifeTrendCard("Work hours (estimate)",workTimeVals,"hours/shift",dates,days,"Attended shifts use recorded start/end times when available; missing ends assume 9:00 AM and missing starts use the scheduled start. Missed shifts show 0; unconfirmed shifts stay blank.","No confirmed shifts")+lifeTrendCard("Work attendance",workAttendanceVals,"scheduled shift(s)",dates,days,"One point per scheduled shift. 1 = attended, 0 = missed.","No confirmed scheduled shifts",1,{0:"Missed",1:"Attended"})+'</div>'+
  '<div class="life-trends-group"><h3>Food + hydration</h3>'+lifeTrendCard("Calories",foodVals,"kcal/day",dates,days)+lifeTrendCard("Protein",proteinVals,"g/day",dates,days)+lifeTrendCard("Caffeine logged",caffeineVals,"mg/day",dates,days,"Daily sum of logged caffeine with known amounts; unlogged or unknown amounts stay blank.")+lifeTrendCard("Water",waterVals,"oz/day",dates,days)+'</div>'+
  '<div class="life-trends-group"><h3>Daily routines</h3><div class="muted small">Habit rows show recorded occurrences and confirmed days.</div>'+lifeTrendSelfCare(dates)+'</div>'+
  '<div class="life-trends-group"><h3>Other tracked activity</h3>'+lifeTrendCard("Movement",workoutVals,"minutes/day",dates,days)+lifeTrendCard("Reading",readingVals,"pages/day",dates,days)+lifeTrendCard("Outfit logged",outfitVals,"days",dates,days)+'</div>'+
 '</div>';
}
window.openLifeTrends=function(days=30){
 const span=Number(days)===7?7:30;
 modal("All life trends",lifeTrendContent(span),"Close",closeModal);
};
window.sevenDayTrends=function(){
 return typeof selfCareCard==="function"?selfCareCard():"";
};
window.carePatternsHub=function(){
 const previous=typeof selfCareTab!=="undefined"?selfCareTab:null;
 if(typeof selfCareTab!=="undefined")selfCareTab="track";
 const card=typeof selfCareCard==="function"?selfCareCard():"";
 if(previous!==null)selfCareTab=previous;
 return card+(typeof sleepCard==="function"?sleepCard():"")+(typeof careOutfitCard==="function"?careOutfitCard():"");
};
})();