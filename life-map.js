(function(){
"use strict";
const h=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const day=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
const list=value=>Array.isArray(value)?value:[];
function mapProgressRange(){try{return localStorage.getItem("dailyLifeMapProgressRange")||"week"}catch(_){return "week"}}
function mapProgressDates(){const today=day();if(mapProgressRange()!=="week")return [today];const start=new Date(today+"T12:00:00");start.setDate(start.getDate()-((start.getDay()+6)%7));const dates=[];for(const d=new Date(start);d<=new Date(today+"T12:00:00");d.setDate(d.getDate()+1))dates.push(typeof ymd==="function"?ymd(d):d.toISOString().slice(0,10));return dates}
window.lifeMapProgressDates=mapProgressDates;
const floorNames=["Basement","First floor","Second floor","Third floor"];
let activeArea="",activeRoom=null;

window.lifeMapHouseholdRows=function(date){
 const wanted=String(date||day()),rows=[],seen=new Set();
 for(const task of list(state.tasks)){
  if(task.date!==wanted||task.paused||task.duplicateHidden||task.waitingForFunds)continue;
  if(!(String(task.category||"").toLowerCase()==="home"||task.homeMapFloor||/house|room|kitchen|bathroom|laundry|dish|trash|declutter|organize|clean|litter|robot vacuum/i.test(String(task.title||""))))continue;
  rows.push(task);
 }
 for(const chore of list(state.chores)){
  if(chore.date!==wanted||chore.paused||chore.duplicateHidden)continue;
  const key=[chore.child,chore.chore].map(x=>String(x||"").trim().toLowerCase()).join("|");
  if(seen.has(key))continue;
  seen.add(key);rows.push({...chore,title:String(chore.chore||"Daily routine"),_lifeChore:true,category:"home"});
 }
 return rows;
};

function selectedFloor(){try{const value=localStorage.getItem("dailyLifeMapFirstFloor");return floorNames.includes(value)?value:"First floor"}catch(_){return "First floor"}}
function jump(view){if(typeof setView==="function")setView(view)}
function avatarMark(label,icon,x,y,pct,color,area){
 const alpha=(0.2+Math.max(0,Math.min(100,Number(pct)||0)/125)).toFixed(2);
 return `<g class="lm-avatar-mark" role="button" tabindex="0" aria-label="${h(label)}" title="${h(label)}" data-life-area="${h(area)}">`+
 '<circle cx="'+x+'" cy="'+y+'" r="21" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>'+
 '<circle cx="'+x+'" cy="'+y+'" r="16" fill="'+color+'" fill-opacity="'+alpha+'"/>'+
 '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="15" font-weight="900" fill="#48394d">'+icon+'</text></g>';
}
function lifeMapAreaForTask(task){
 const title=String(task&&task.title||"").toLowerCase();
 const category=String(task&&task.category||"").toLowerCase();
 const text=title+" "+category;
 const child=String(task&&task.child||"").trim();
 if(/homework|backpack|school|pediatric|consent|kids?|children|family|relationship|read with|time with|spend time|play with|connect with|hang out with|check.?in with|date night/i.test(text))return "people";
 if(child&&/water|tooth|teeth|brush|shower|hair|vitamin|medicine|dental|dentist|dentistry|medical|stretch|workout|exercise|sleep|skin/i.test(text))return "people";
 if(/wells\s*fargo|money|budget|bill|bank|account|finance|rent|electric|paycheck|credit card|loan|savings/i.test(text))return "money";
 if(category==="car"||/\bcar\b|vehicle|volvo|\bkeys?\b|lock|tire|fuel|oil|driving|driver/i.test(text))return "car";
 if(task&&task.homeMapFloor||/robot vacuum|litter|household|\bhome\b|\bhouse\b|\broom\b|kitchen|bathroom|laundry|\bdishes?\b|trash|declutter|organize|\bclean\b/i.test(text))return "home";
 if(category==="work"||/\bwork\b|ups|shift|route|preload|delivery|deliver|clock.?in/i.test(text))return "work";
 if(/water|tooth|teeth|brush|shower|hair|vitamin|medicine|dental|dentist|dentistry|medical|stretch|workout|exercise|sleep|skin/i.test(text)||category==="body"||category==="health")return child?"people":"body";
 if(/mind|mental|journal|therapy|rest|breath|quiet/i.test(text)||category==="mind"||category==="self-care")return "mind";
 if(/spiritual|tarot|ritual|meditat|affirmation/i.test(text)||category==="spirituality")return "spirituality";
 if(/hobby|craft|garden|plant care|project|yoga/i.test(text)||category==="hobbies")return "hobbies";
 if(category==="people"||category==="family"||category==="kids"||child)return "people";
 return "";
}
function lifeMapUniqueTasks(rows){
 const output=[],groups=new Map();
 for(const task of list(rows)){
  const id=String(task&&task.id||"");
  const title=String(task&&task.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const date=String(task&&task.date||"");
  if(!id||!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)){output.push(task);continue}
  const child=String(task&&task.child||"").trim().toLowerCase();
  const area=lifeMapAreaForTask(task);
  const slot=["time","startTime","dueTime","occurrence","slot","repeatSlot"].map(k=>String(task&&task[k]||"").trim().toLowerCase()).join("|");
  const groupKey=[date,title,child,area,slot].join("|");
  if(!groups.has(groupKey)){groups.set(groupKey,{index:output.length,items:[]});output.push(null)}
  groups.get(groupKey).items.push(task);
 }
 for(const group of groups.values()){
  const winner=group.items.slice().sort((a,b)=>Number(!!b.done)-Number(!!a.done))[0];
  output[group.index]=Object.assign({},winner,{
   done:group.items.some(t=>!!t.done),
   completedAt:group.items.find(t=>t&&t.done&&t.completedAt)?.completedAt||winner.completedAt||"",
   _lifeMapDuplicateIds:group.items.map(t=>String(t.id)).filter(Boolean)
  });
 }
 return output.filter(Boolean);
}
window.lifeMapToggleTaskGroup=async function(encodedIds,done){
 let ids=[];
 try{ids=JSON.parse(decodeURIComponent(String(encodedIds||"")))}catch(_){return}
 for(const id of Array.isArray(ids)?ids:[])await toggleTask(id,!!done);
};
function avatarHotspot(area,label,path){
 return `<path class="lm-avatar-hotspot" d="${path}" fill="transparent" stroke="transparent" stroke-width="12" stroke-linejoin="round" pointer-events="all" role="button" tabindex="0" aria-label="Open ${h(label)}" data-life-area="${h(area)}"/>`;
}
function view(areaOverride,tasksOnly){
 const date=day(),progressDates=mapProgressDates(),progressRange=mapProgressRange(),profile=(state&&state.profile)||{},name=String(profile.name||"").trim().split(/\s+/)[0]||"there";
 const avatarLook=typeof window.avatarWardrobeGetActive==="function"?window.avatarWardrobeGetActive():null;
 const lookDescription=[avatarLook?.name,avatarLook?.analysis?.summary,...(Array.isArray(avatarLook?.analysis?.visible_details)?avatarLook.analysis.visible_details:[])].filter(Boolean).join(" ").toLowerCase();
 const garment= /\bvest\b/.test(lookDescription)? "vest":String(avatarLook?.analysis?.garment_type||avatarLook?.type||"").toLowerCase();
 const garmentPattern=String(avatarLook?.analysis?.pattern||"").toLowerCase();
 const avatarTop=garment==="vest"?"#237a4b":avatarLook&&!['bottom','shoes','accessory'].includes(avatarLook.type)?avatarLook.primary:"#d7c6ee";
 const avatarBottom=garment==="vest"?"#16181d":avatarLook?.type==="bottom"?avatarLook.primary:avatarLook?.type==="outfit"?avatarLook.accent:"#c5d9ef";
 const avatarShoe=avatarLook?.type==="shoes"?avatarLook.primary:"#f7b9cd",avatarAccessory=avatarLook?.type==="accessory"?avatarLook.primary:"#f5c2da";
 const avatarSleeve=garment==="vest"?"#f1c8ce":avatarTop;
 const avatarLookStyle=avatarLook?' style="--lm-outfit-main:'+h(avatarTop)+';--lm-outfit-vest:'+h(avatarLook.primary)+';--lm-outfit-accent:'+h(avatarBottom)+';--lm-outfit-shoe:'+h(avatarShoe)+';--lm-outfit-accessory:'+h(avatarAccessory)+';--lm-outfit-sleeve:'+h(avatarSleeve)+';--lm-outfit-detail:'+h(avatarLook.accent||"#e6c7a7")+'"':'';
 let avatarGarmentDetails="";
 if(garment==="vest") avatarGarmentDetails='<path d="M77 137 L98 145 Q104 151 107 159 L113 159 Q116 151 122 145 L143 137 L148 163 L142 178 L145 239 Q110 250 75 239 L78 178 L72 163Z" fill="#237a4b" stroke="#145836" stroke-width="1.8" stroke-linejoin="round"/><path d="M78 231 Q110 240 143 231 L144 249 Q110 260 77 249Z" fill="#ed4b96" stroke="#aa3165" stroke-width="1.4"/><path d="M101 127L110 136L119 127L116 141H104Z" fill="#ed4b96" stroke="#aa3165" stroke-width="1"/><defs><pattern id="lmVestMesh" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#dfc8b2" opacity=".62"/><circle cx="3" cy="3" r=".4" fill="#392c27" opacity=".48"/></pattern></defs><path d="M81 139 L99 146 Q105 150 107 159 L113 159 Q115 150 121 146 L139 139 L146 163 L141 177 L144 236 Q110 246 76 236 L79 177 L74 163Z" fill="var(--lm-outfit-vest,#79543e)" stroke="#513d34" stroke-width="2" stroke-linejoin="round"/><path d="M81 139 L99 146 Q105 150 107 159 L113 159 Q115 150 121 146 L139 139 L146 163 L141 177 L144 236 Q110 246 76 236 L79 177 L74 163Z" fill="url(#lmVestMesh)" opacity=".45"/><path d="M82 145 L88 175 M138 145 L132 175" fill="none" stroke="#f0d34e" stroke-width="5" stroke-linecap="round"/><path d="M84 146 L89 173 M136 146 L131 173" fill="none" stroke="#f3eee0" stroke-width="1.6" stroke-linecap="round"/><path d="M79 179 Q110 183 142 179 M77 229 Q110 235 143 229" fill="none" stroke="#f2d341" stroke-width="6"/><path d="M79 177 Q110 181 142 177 M77 227 Q110 233 143 227" fill="none" stroke="#f5efe2" stroke-width="2"/><path d="M110 159V237" fill="none" stroke="#302923" stroke-width="2"/><path d="M84 194 L101 196 L100 212 L82 211Z M119 196 L136 194 L138 211 L120 212Z" fill="#674c3a" stroke="#3f3029" stroke-width="1.2" stroke-linejoin="round"/><path d="M85 196H100 M120 196H135" stroke="#d8c3ad" stroke-width=".8" opacity=".8"/><path d="M121 159 Q130 155 138 159 L136 170 Q130 176 123 171Z" fill="#49372d" stroke="#edc94c" stroke-width="1.2" stroke-linejoin="round"/><text x="130" y="168" text-anchor="middle" font-size="4.4" font-weight="900" fill="#f2d04b" letter-spacing=".1">UPS</text>';
 else if(garment==="hoodie") avatarGarmentDetails='<path d="M82 136 Q84 117 110 117 Q136 117 138 136 L128 155 L110 144 L92 155Z" fill="var(--lm-outfit-main,#d7c6ee)" fill-opacity=".72" stroke="#896879" stroke-width="2" stroke-linejoin="round"/><path d="M103 146 L99 185 M117 146 L121 185 M78 226 Q110 211 142 226 L139 244 Q110 233 81 244Z" fill="none" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
 else if(garment==="shirt"||garment==="blouse") avatarGarmentDetails='<path d="M94 130 L103 143 L110 137 L117 143 L126 130 L121 158 L110 151 L99 158Z" fill="var(--lm-outfit-detail,#e6c7a7)" fill-opacity=".72" stroke="#896879" stroke-width="1.5" stroke-linejoin="round"/>';
 if(garmentPattern==="striped") avatarGarmentDetails+='<path d="M72 174 H148 M74 196 H146 M76 218 H144" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="4" clip-path="url(#lmTorsoClip)" opacity=".78"/>';
 else if(garmentPattern==="plaid") avatarGarmentDetails+='<path d="M88 145 V250 M110 141 V255 M132 145 V250 M70 177 H150 M70 205 H150 M72 232 H148" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2.5" clip-path="url(#lmTorsoClip)" opacity=".72"/>';
 else if(garmentPattern==="polka-dot") avatarGarmentDetails+='<g fill="var(--lm-outfit-detail,#e6c7a7)" clip-path="url(#lmTorsoClip)"><circle cx="91" cy="177" r="3"/><circle cx="127" cy="181" r="3"/><circle cx="105" cy="202" r="3"/><circle cx="138" cy="213" r="3"/><circle cx="84" cy="225" r="3"/><circle cx="118" cy="237" r="3"/></g>';
 else if(garmentPattern==="floral") avatarGarmentDetails+='<g fill="none" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2" clip-path="url(#lmTorsoClip)"><circle cx="92" cy="184" r="6"/><circle cx="128" cy="211" r="6"/><circle cx="103" cy="235" r="6"/><path d="M92 176V192 M84 184H100 M128 203V219 M120 211H136 M103 227V243 M95 235H111"/></g>';
 else if(garmentPattern==="graphic") avatarGarmentDetails+='<path d="M96 178 L110 167 L124 178 L110 201Z" fill="var(--lm-outfit-detail,#e6c7a7)" stroke="#896879" stroke-width="1.4" clip-path="url(#lmTorsoClip)"/>';
 const allTasks=lifeMapUniqueTasks(list(state&&state.tasks)).filter(t=>!t.paused&&!t.duplicateHidden&&!t.waitingForFunds&&!(/\b(app|development)\b/i.test(String(t.category||""))&&/build|apk|bridge|workflow|deploy|migration/i.test(String(t.title||""))));
 const tasks=allTasks.filter(t=>String(t.date||"")===date),progressTasks=allTasks.filter(t=>progressDates.includes(String(t.date||"")));
 const completed=tasks.filter(t=>t.done).length,open=tasks.filter(t=>!t.done);
 const careHabits=typeof selfCareHabits==="function"?selfCareHabits():[];
 const careTotal=careHabits.length*progressDates.length;
 const careDone=careHabits.reduce((n,x)=>n+progressDates.filter(d=>typeof selfCareDone==="function"&&selfCareDone(x.key,d)).length,0);
 const carePct=careTotal?Math.round(careDone/careTotal*100):0;
 const taskPct=tasks.length?Math.round(completed/tasks.length*100):0;
 const areaKeys=["mind","body","people","home","spirituality","hobbies","money","car","work"];
 const matches=Object.fromEntries(areaKeys.map(key=>[key,progressTasks.filter(t=>lifeMapAreaForTask(t)===key)]));
 matches.home=progressDates.flatMap(d=>window.lifeMapHouseholdRows(d));
 const evidenceRows=(dates,label,category)=>dates.map(date=>({date,title:label,category,done:true,_lifeMapEvidence:true}));
 const datesFrom=rows=>Array.from(new Set(list(rows).map(x=>String(x?.date||x?.startDate||"").slice(0,10)).filter(date=>progressDates.includes(date))));
 const bodyLogDays=new Set([
  ...datesFrom(state?.foodLogs),...datesFrom(state?.waterLogs),
  ...datesFrom(state?.sleepLogs),...datesFrom(state?.wellnessLogs)
 ]);
 matches.body=[...(matches.body||[]),...evidenceRows(Array.from(bodyLogDays),"Food, water, sleep or health logged","body-log")];
 const workedDays=datesFrom(list(state?.workShifts).filter(x=>
  x&&(x.start||x.end||Number(x.officialHours)>0||Number(x.officialGrossPay)>0||Number(x.ssdHours)>0||Number(x.ssdMiles)>0)
 ));
 matches.work=[...(matches.work||[]),...evidenceRows(workedDays,"Work shift recorded","work-log")];
 const attendedDays=datesFrom(list(state?.events).filter(x=>x&&/^(attended|completed|complete|done)$/i.test(String(x.status||"").trim())));
 matches.people=[...(matches.people||[]),...evidenceRows(attendedDays,"Family event attended","people-event")];
 const pctFor=key=>{
  const rows=matches[key]||[],habits=key==="mind"?careHabits:[];
  const total=rows.length+(key==="mind"?careTotal:0),done=rows.filter(t=>t.done).length+(key==="mind"?careDone:0);
  return total?Math.round(done/total*100):0;
 };
 const moneyGoals=list(state&&state.settings&&state.settings.financialRoadmap).filter(g=>g&&Array.isArray(g.steps));
 const moneyGoalSteps=moneyGoals.flatMap(g=>g.steps),moneyGoalDone=moneyGoalSteps.filter(step=>step&&step.done).length,moneyGoalTotal=moneyGoalSteps.length,moneyGoalPct=moneyGoalTotal?Math.round(moneyGoalDone/moneyGoalTotal*100):0;
 const moneyGoalRows=moneyGoals.map(goal=>{const steps=list(goal.steps),done=steps.filter(step=>step&&step.done).length,pct=steps.length?Math.round(done/steps.length*100):0;return '<div class="lm-money-goal"><b>'+h(goal.name||"Money goal")+'</b><small>'+done+" of "+steps.length+" steps · "+pct+"%"+'</small></div>'}).join("");
 const moneyTaskDone=matches.money.filter(t=>t.done).length,moneyProgressTotal=moneyGoalTotal+matches.money.length,moneyProgressDone=moneyGoalDone+moneyTaskDone,moneyFill=moneyProgressTotal?Math.round(moneyProgressDone/moneyProgressTotal*100):0;
 const avatarFillPct=Math.round([carePct,pctFor("spirituality"),pctFor("body"),pctFor("people"),pctFor("hobbies"),moneyFill,pctFor("car"),pctFor("work")].reduce((sum,value)=>sum+(Number(value)||0),0)/8);
 const avatarMarks=[
  avatarMark("Mind and self-care","✿",47,99,carePct,"#c89ad7","mind"),
  avatarMark("Spirituality","☾",174,78,pctFor("spirituality"),"#f2b85b","spirituality"),
  avatarMark("Body & health","♡",111,205,pctFor("body"),"#f2ae85","body"),
  avatarMark("Family and kids","♥",43,274,pctFor("people"),"#e98cb0","people"),
  avatarMark("Hobbies and projects","✎",177,274,pctFor("hobbies"),"#82c6a4","hobbies"),
  avatarMark("Money and planning","✧",111,372,moneyFill,"#83b8df","money"),
  avatarMark("Car & driving","C",47,425,pctFor("car"),"#e98cb0","car"),
  avatarMark("Work","W",175,425,pctFor("work"),"#82c6a4","work")
 ].join("");
 const taskDateLabel=t=>{const value=String(t&&t.date||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return "";const parsed=new Date(value+"T12:00:00");return Number.isNaN(parsed.getTime())?"":parsed.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})};
 const taskRow=t=>{const group=list(t._lifeMapDuplicateIds).length>1,ids=group?encodeURIComponent(JSON.stringify(t._lifeMapDuplicateIds)):String(t.id||"");const handler=group?"lifeMapToggleTaskGroup":"toggleTask";return '<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="'+handler+'(\''+h(ids)+'\',this.checked)"><span><b>'+h(t.title||"Task")+'</b><small>'+[t.child?String(t.child):"",taskDateLabel(t)].filter(Boolean).map(h).join(" · ")+'</small></span></label>'};
 const careRows=careHabits.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
 const areaTitles={home:"Home & household",mind:"Mind & self-care",body:"Body & health",people:"Family & kids",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning",car:"Car & driving",work:"Work"};
 const areaSelection=areaOverride||activeArea;
 const areaHistory=areaKeys.includes(areaSelection)?lifeMapUniqueTasks(list(state&&state.tasks)).filter(t=>t.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&lifeMapAreaForTask(t)===areaSelection).map(t=>({date:String(t.date),title:String(t.title||"Task")})):[];
 const careHistory=areaSelection==="mind"?list(state&&state.selfCare).filter(x=>x.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&careHabits.some(habit=>habit.key===x.key)).map(x=>({date:String(x.date),title:careHabits.find(habit=>habit.key===x.key)?.label||"Self-care"})):[];
 const lastAreaDone=[...areaHistory,...careHistory].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const activeAreaRows=areaSelection?((areaSelection==="mind"?careRows:"")+(matches[areaSelection]||[]).filter(t=>!t._lifeMapEvidence).map(taskRow).join("")):"";
 const moneyGoalPanel=areaSelection==="money"?'<div class="lm-money-goals"><span class="lm-kicker">MONEY GOAL PROGRESS</span><b>'+(moneyGoalTotal?moneyGoalDone+" of "+moneyGoalTotal+" steps · "+moneyGoalPct+"%":"No money-goal steps saved yet")+'</b>'+(moneyGoalRows||'<p class="lm-muted">Add a goal and steps to start tracking progress.</p>')+'<button type="button" class="lm-text-button" onclick="openMoneyHubSection(\'goals\')">Open money goals ›</button></div>':"";
 const activeAreaPanel=areaSelection?'<section class="lm-inline-panel" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(areaTitles[areaSelection]||"Life area")+'</b><button type="button" class="lm-text-button" onclick="lifeMapCloseArea()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+(lastAreaDone?h(lastAreaDone.title)+' · '+h(lastAreaDone.date):"No completed item found in saved history")+'</p>'+(activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':'<p class="lm-muted">No matching entries are in the selected period.</p>')+moneyGoalPanel+'</section>':"";
 if(tasksOnly&&areaSelection==="all"){
  const openTasks=tasks.filter(t=>!t.done),doneTasks=tasks.filter(t=>t.done);
  return '<section class="life-map-page lm-area-page lm-area-tasks-page"><header class="lm-area-page-heading"><button class="lm-area-back" type="button" onclick="setView(&#39;lifemap&#39;)">‹ Life Map</button><span class="lm-kicker">TODAY · TASK LIST</span><h1>Today’s tasks</h1><p>All tasks counted in today’s plan are listed here. Open tasks come first.</p></header><section class="lm-inline-panel lm-area-page-content">'+(openTasks.length?'<div class="lm-list">'+openTasks.map(taskRow).join("")+'</div>':'<p class="lm-muted">No open tasks. Everything on today’s list is complete.</p>')+(doneTasks.length?'<details class="lm-completed" '+(openTasks.length?'':'open')+'><summary>Completed today · '+doneTasks.length+'</summary><div class="lm-list">'+doneTasks.map(taskRow).join("")+'</div></details>':'')+'</section></section>';
 }
 if(tasksOnly&&areaSelection){
  const taskTitle=(areaTitles[areaSelection]||"Area")+" tasks";
  const taskList=activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':'<p class="lm-muted">No '+h((areaTitles[areaSelection]||"area").toLowerCase())+' tasks are scheduled for today.</p>';
  return '<section class="life-map-page lm-area-page lm-area-tasks-page"><header class="lm-area-page-heading"><button type="button" class="lm-area-back" onclick="setView(&#39;lifearea-'+areaSelection+'&#39;)">‹ '+h(areaTitles[areaSelection]||"Life area")+'</button><span class="lm-kicker">TODAY · AREA TASKS</span><h1>Today’s '+h(taskTitle)+'</h1><p>Only tasks linked to this area appear here.</p></header><section class="lm-inline-panel lm-area-page-content">'+taskList+'</section></section>';
 }
 if(areaOverride){
  const descriptions={home:"Daily household care and every child’s saved chores and routines. Room resets also appear inside the matching bedroom.",mind:"Mental health, self-care, and small practices that help you feel cared for.",body:"Health routines and everyday care for your body.",people:"Family connection and relationship tasks, gathered in one place.",spirituality:"Spiritual practices and reflections linked to this part of your life.",hobbies:"Hobbies, creative projects, and interests you are growing.",money:"Money goals are shown here. Budget setup is still unfinished; use the budget button to add income and funded categories.",car:"Car keys, maintenance, driving setup, and other vehicle tasks.",work:"UPS shifts, delivery routines, and other work tasks."};
  const trackerViews={home:"household",mind:"selfcare",body:"log",people:"family",spirituality:"spirituality",hobbies:"gardenhobbies",money:"budget",car:"today",work:"today"};
  const trackerLabels={home:"House map",mind:"Self-care",body:"Health logs",people:"Family",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Finish budget setup",car:"Today’s plan",work:"Today’s plan"};
  const pagePanel=activeAreaPanel.replace('class="lm-inline-panel"','class="lm-inline-panel lm-area-page-content"').replace('<button type="button" class="lm-text-button" onclick="lifeMapCloseArea()">Close</button>','');
  return '<section class="life-map-page lm-area-page"><header class="lm-area-page-heading"><button type="button" class="lm-area-back" onclick="setView(&#39;lifemap&#39;)">‹ Life Map</button><span class="lm-kicker">YOUR LIFE MAP · AREA</span><h1>'+h(areaTitles[areaSelection]||"Life area")+'</h1><p>'+h(descriptions[areaSelection]||"")+'</p></header>'+pagePanel+'<div class="lm-area-shortcuts"><span class="lm-kicker">OPEN THIS AREA’S TRACKER</span><div><button type="button" class="lm-region" onclick="setView(&#39;'+trackerViews[areaSelection]+'&#39;)">'+h(trackerLabels[areaSelection]||"Open tracker")+' ›</button><button type="button" class="lm-region" onclick="setView(&#39;lifearea-tasks-'+areaSelection+'&#39;)">'+h((areaTitles[areaSelection]||"Area")+' tasks today')+' ›</button></div></div></section>';
 }
 const selectedRoomData=activeRoom&&typeof window.houseVisualRoomInlineData==="function"?window.houseVisualRoomInlineData(activeRoom.floor,activeRoom.id):null;
 const activeRoomPanel=selectedRoomData?'<section class="lm-inline-panel lm-inline-room" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(selectedRoomData.name)+' · room tasks</b><button type="button" class="lm-text-button" onclick="lifeMapCloseRoomInline()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+h(selectedRoomData.insights.last)+'</p><p>'+h(selectedRoomData.insights.declutter)+'</p>'+(selectedRoomData.tasks.length?'<div class="lm-list">'+selectedRoomData.tasks.map(taskRow).join("")+'</div>':'<p class="lm-muted">No room-specific tasks are mapped yet.</p>')+'<button type="button" class="hvm-room-declutter-quick" onclick="houseVisualLogDeclutter(\''+h(selectedRoomData.floor)+'\',\''+h(selectedRoomData.id)+'\')">＋ I organized one area</button></section>':"";


 const foodCount=list(state&&state.foodLogs).filter(x=>String(x.date||"")===date).length;
 const waterCount=list(state&&state.waterLogs).filter(x=>String(x.date||"")===date).length;
 const sleepCount=list(state&&state.sleepLogs).filter(x=>String(x.date||"")===date).length;
 const inventory=list(state&&state.inventoryItems),itemCount=inventory.length;
 const clothing=inventory.filter(item=>{
  const category=String(item.category||"").toLowerCase(),label=String(item.name||"").toLowerCase(),status=String(item.status||"").toLowerCase();
  return !["gone","donate / sell","donated","sold","discarded"].includes(status)&&
   (/clothing|clothes|apparel|wardrobe/.test(category)||/\b(pants|trousers|jeans|shorts|leggings|shirt|shirts|t[- ]?shirt|sweater|hoodie|dress|skirt|socks|underwear|pajamas|coat|jacket|shoes|boots)\b/.test(label));
 });
 const clothingOwners=[...new Set(clothing.map(item=>String(item.inventoryOwner||item.wardrobeOwner||"").trim()).filter(Boolean))];
 const clothingOwner=item=>String(item.inventoryOwner||item.wardrobeOwner||"").trim().toLowerCase();
 const clothingQty=items=>items.reduce((n,item)=>n+Math.max(0,Number(item.quantity??1)||0),0);
 const clothingType=item=>{
  const text=(String(item.name||"")+" "+String(item.category||"")).toLowerCase();
  if(/pajama|pyjama|sleepwear|\bpjs?\b/.test(text))return"pajamas";
  if(/\b(winter coat|parka|coat)\b/.test(text))return"coat";
  if(/hoodie|jacket|zip[\s-]?up/.test(text))return"layers";
  if(/long[\s-]?sleeve/.test(text))return"long";
  if(/short[\s-]?sleeve/.test(text))return"short";
  if(/\b(pants?|trousers|jeans|leggings)\b/.test(text))return"pants";
  return"other";
 };
 const childWardrobes=[
  {name:"Leo",aliases:["leo"]},
  {name:"Demitri (Tree)",aliases:["demitri","dimitri","tree"]},
  {name:"Dolly",aliases:["dolly"]},
  {name:"Ambrose",aliases:["ambrose"]}
 ];
 const targetCount=(count,target)=>count+"/"+target+(count<target?" · "+(target-count)+" below target":count>target?" · "+(count-target)+" above target":"");
 const layerCount=count=>count+"/3–5"+(count<3?" · "+(3-count)+" below minimum":count>5?" · "+(count-5)+" above range":" · in range");
 const childRows=childWardrobes.map(person=>{
  const items=clothing.filter(item=>person.aliases.includes(clothingOwner(item)));
  const hasRecords=items.length>0,counts={long:0,short:0,layers:0,coat:0,pants:0,pajamas:0,other:0};
  items.forEach(item=>{counts[clothingType(item)]+=Math.max(0,Number(item.quantity??1)||0)});
  const firstLine="Long sleeves "+targetCount(counts.long,7)+" · Short sleeves "+targetCount(counts.short,7)+" · Pants "+targetCount(counts.pants,7);
  const secondLine="Hoodies/jackets "+layerCount(counts.layers)+" · Winter coat "+targetCount(counts.coat,1)+" · Pajamas "+targetCount(counts.pajamas,5);
  const otherLine=counts.other?'<small>Other clothing · '+counts.other+' saved</small>':"";
  return '<button type="button" onclick="setView(\'inventory\')"><b>'+h(person.name)+'</b><span>'+(hasRecords?clothingQty(items)+' assigned saved item'+(clothingQty(items)===1?"":"s"):"No assigned clothing records yet")+'</span>'+
   (hasRecords?'<small>'+h(firstLine)+'</small><small>'+h(secondLine)+'</small>'+otherLine:'<small>Targets · Long sleeves 7 · Short sleeves 7 · Pants 7</small><small>Hoodies/jackets 3–5 · Winter coat 1 · Pajamas 5</small>')+'</button>';
 }).join("");
 const otherOwners=clothingOwners.filter(owner=>!childWardrobes.some(person=>person.aliases.includes(owner.toLowerCase())));
 const otherRows=otherOwners.map(owner=>{
  const items=clothing.filter(item=>clothingOwner(item)===owner.toLowerCase());
  return '<button type="button" onclick="setView(\'inventory\')"><b>'+h(owner)+'</b><span>'+clothingQty(items)+' saved clothing item'+(clothingQty(items)===1?"":"s")+'</span><small>'+h(items.slice(0,3).map(item=>item.name).join(" · "))+(items.length>3?" · +"+(items.length-3)+" more":"")+'</small></button>';
 }).join("");
 const clothingRows=childRows+otherRows;
 const floor=selectedFloor();
 const map=typeof houseVisualMapHtml==="function"?houseVisualMapHtml(floor):'<p class="lm-muted">The saved house map is loading.</p>';
 const roomProgress=typeof houseVisualRoomProgressHtml==="function"?houseVisualRoomProgressHtml(floor):'<p class="lm-muted">Room history is loading.</p>';
 const floors=floorNames.map(f=>'<button type="button" class="lm-floor '+(f===floor?"selected":"")+'" aria-pressed="'+(f===floor?"true":"false")+'" onclick="lifeMapSetFloor(\''+f+'\')">'+h(f==="Third floor"?"Attic":f)+'</button>').join("");
 const taskContent=tasks.length?'<div class="lm-list">'+open.map(taskRow).join("")+'</div><details class="lm-completed"><summary>Completed today · '+completed+'</summary><div class="lm-list">'+tasks.filter(t=>t.done).map(taskRow).join("")+'</div></details>':'<p class="lm-muted">No date-specific tasks are on today’s list.</p>';
 return '<section class="life-map-page">'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><span class="lm-kicker">LIFE IN PROGRESS</span><h2>Different parts of your life, together</h2><p>Color fills from saved activity. Choose today or this week; this week runs Monday through today.</p><div role="group" aria-label="Map progress period" style="display:flex;gap:8px;margin-top:10px"><button type="button" class="btn small" aria-pressed="${progressRange==="week"?"true":"false"}" onclick="lifeMapSetProgressRange(&#39;week&#39;)">This week</button><button type="button" class="btn small" aria-pressed="${progressRange==="today"?"true":"false"}" onclick="lifeMapSetProgressRange(&#39;today&#39;)">Today</button></div></div></div>'+
 '<div class="lm-scene-grid lm-avatar-only"><div class="lm-avatar-wrap"><svg class="lm-avatar"'+avatarLookStyle+' viewBox="0 0 220 510" role="group" aria-label="Michelle’s illustrated full-body avatar with clickable life areas">'+
 '<defs>'+ '<clipPath id="lmAvatarColorReveal" clipPathUnits="userSpaceOnUse"><rect x="0" y="'+(510-510*avatarFillPct/100)+'" width="220" height="'+(510*avatarFillPct/100)+'"/></clipPath>'+ '</defs>'+ '<image href="assets/michelle-ssd-avatar.webp?v=20261113-personalized1" x="22" y="0" width="176" height="510" preserveAspectRatio="none" style="filter:grayscale(1);opacity:.52" pointer-events="none" aria-hidden="true"/>'+ '<image href="assets/michelle-ssd-avatar.webp?v=20261113-personalized1" x="22" y="0" width="176" height="510" preserveAspectRatio="none" clip-path="url(#lmAvatarColorReveal)" pointer-events="none" aria-hidden="true"/>'+ '<g class="lm-avatar-hit-zones" aria-label="Tap a body area to open its page">'+ avatarHotspot("mind","Mind & self-care","M57 0 H163 V129 Q151 145 110 146 Q69 145 57 129Z")+ avatarHotspot("spirituality","Spirituality","M48 0 H172 V105 Q150 76 127 56 Q106 43 84 59 Q64 75 48 105Z")+ avatarHotspot("body","Body, health & safety","M57 120 H165 V270 H57Z")+ avatarHotspot("people","Relationships","M52 126 H98 V274 H28Z")+ avatarHotspot("hobbies","Hobbies & projects","M122 126 H168 V274 H194Z")+ avatarHotspot("money","Money & planning","M62 248 H158 V470 H62Z")+ '</g>'+avatarMarks+'</svg>'+
 '<p class="lm-avatar-caption">Tap any part or badge to open that area. Color grows in small steps.</p>'+(typeof window.avatarWardrobePanelHtml==="function"?window.avatarWardrobePanelHtml():"")+'</div></div></section>'+
 '<section class="lm-lower-grid">'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2><button type="button" class="lm-text-button" onclick="setView(&#39;lifearea-home&#39;)">Whole-house tasks ›</button></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div><div class="lm-room-progress">'+roomProgress+'</div>'+activeRoomPanel+'</section></section>'+
 '<section class="lm-trackers"><div class="lm-tracker-title"><span class="lm-kicker">YOUR TRACKING STAYS HERE</span><h2>All the pieces you already log</h2></div>'+
 '<button type="button" onclick="setView(\'home\')"><span>🥣</span><b>Food</b><small>'+foodCount+' entries today</small></button><button type="button" onclick="setView(\'log\')"><span>☾</span><b>Sleep</b><small>'+(sleepCount?"Logged today":"Open sleep tracking")+'</small></button><button type="button" onclick="setView(\'selfcare\')"><span>💧</span><b>Water</b><small>'+waterCount+' logs today</small></button><button type="button" onclick="setView(\'family\')"><span>♡</span><b>Family</b><small>Time, people & birthdays</small></button><button type="button" onclick="setView(\'inventory\')"><span>▤</span><b>Inventory</b><small>'+itemCount+' saved item records</small></button><button type="button" onclick="setView(\'spirituality\')"><span>☾</span><b>Spirituality</b><small>Readings & rituals</small></button><button type="button" onclick="setView(\'gardenhobbies\')"><span>✿</span><b>Hobbies</b><small>Plants & projects</small></button><button type="button" onclick="setView(\'more\')"><span>✧</span><b>Money</b><small>Bills & plans</small></button></section>'+
 (clothingRows?'<section class="lm-wardrobes"><div><span class="lm-kicker">CLOTHING ON FILE</span><h2>Inventory by person</h2><p>Counts compare assigned saved items with your clothing targets; low counts mean items are not yet recorded to the target.</p></div><div>'+clothingRows+'</div></section>':'<section class="lm-wardrobes lm-wardrobes-empty"><div><span class="lm-kicker">CLOTHING INVENTORY</span><h2>Keep each person’s items together</h2><p>No clothing records with a person assigned are saved yet. Existing inventory is untouched.</p><button type="button" onclick="setView(\'inventory\')">Open inventory ›</button></div></section>')+
 '<p class="lm-disclaimer">This first pass reads your existing records. It does not move, delete, or rewrite your data. Avatar fill currently uses date-specific tasks and self-care logs; spirituality, hobbies, and money each link to their existing trackers.</p></section>';
}
window.lifeMapSelectArea=function(area){const allowed=["home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return;activeArea="";activeRoom=null;if(typeof setView==="function")setView(area==="spirituality"?"spirituality":"lifearea-"+area)};
function avatarAreaFromEvent(event){const target=event.target&&event.target.closest?event.target.closest(".lm-avatar-mark[data-life-area],.lm-avatar-hotspot[data-life-area]"):null;if(!target)return;const area=target.getAttribute("data-life-area");if(!area)return;if(event.type==="keydown"&&event.key!=="Enter"&&event.key!==" ")return;if(event.type==="keydown")event.preventDefault();if(typeof window.lifeMapSelectArea==="function")window.lifeMapSelectArea(area)}
document.addEventListener("click",avatarAreaFromEvent);
document.addEventListener("keydown",avatarAreaFromEvent);
window.lifeMapCloseArea=function(){if(typeof setView==="function")setView("lifemap")};
window.lifeMapSelectRoomInline=function(f,id){if(!floorNames.includes(f)||!id)return;activeRoom={floor:f,id:String(id)};activeArea="";if(typeof render==="function")render()};
window.lifeMapCloseRoomInline=function(){activeRoom=null;if(typeof render==="function")render()};
window.lifeMapAreaPage=function(area){const allowed=["home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area)};
window.lifeMapAreaTasksPage=function(area){const allowed=["all","home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area,true)};
window.lifeMapView=view;
window.lifeMapSetProgressRange=function(mode){if(mode!=="week"&&mode!=="today")return;try{localStorage.setItem("dailyLifeMapProgressRange",mode)}catch(_){}if(typeof render==="function")render()};
window.lifeMapSetFloor=function(floor){
 if(!floorNames.includes(floor))return;
 try{localStorage.setItem("dailyLifeMapFirstFloor",floor)}catch(_){}
 activeRoom=null;
 if(typeof render==="function")render();
};
})();
