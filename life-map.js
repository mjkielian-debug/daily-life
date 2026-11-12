(function(){
"use strict";
const h=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const day=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
const list=value=>Array.isArray(value)?value:[];
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
 '<circle cx="'+x+'" cy="'+y+'" r="14" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>'+
 '<circle cx="'+x+'" cy="'+y+'" r="10" fill="'+color+'" fill-opacity="'+alpha+'"/>'+
 '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="12" font-weight="900" fill="#48394d">'+icon+'</text></g>';
}
function lifeMapUniqueTasks(rows){
 const output=[],groups=new Map();
 for(const task of list(rows)){
  const title=String(task&&task.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  if(title!=="prevent volvo locking keys inside during package deliveries"){output.push(task);continue}
  const groupKey=String(task&&task.date||"")+"|"+title;
  if(!groups.has(groupKey)){groups.set(groupKey,{index:output.length,items:[]});output.push(null)}
  groups.get(groupKey).items.push(task);
 }
 for(const group of groups.values()){
  const winner=group.items.slice().sort((a,b)=>
   Number(!!b.done)-Number(!!a.done) ||
   Number(String(b.category||"").toLowerCase()==="car")-Number(String(a.category||"").toLowerCase()==="car")
  )[0];
  output[group.index]=Object.assign({},winner,{category:"car"});
 }
 return output.filter(Boolean);
}
function avatarHotspot(area,label,path){
 return `<path class="lm-avatar-hotspot" d="${path}" fill="transparent" stroke="transparent" stroke-width="12" stroke-linejoin="round" pointer-events="all" role="button" tabindex="0" aria-label="Open ${h(label)}" data-life-area="${h(area)}"/>`;
}
function view(areaOverride,tasksOnly){
 const date=day(),profile=(state&&state.profile)||{},name=String(profile.name||"").trim().split(/\s+/)[0]||"there";
 const avatarLook=typeof window.avatarWardrobeGetActive==="function"?window.avatarWardrobeGetActive():null;
 const avatarTop=avatarLook&&!['bottom','shoes','accessory'].includes(avatarLook.type)?avatarLook.primary:"#d7c6ee";
 const avatarBottom=avatarLook?.type==="bottom"?avatarLook.primary:avatarLook?.type==="outfit"?avatarLook.accent:"#c5d9ef";
 const avatarShoe=avatarLook?.type==="shoes"?avatarLook.primary:"#f7b9cd",avatarAccessory=avatarLook?.type==="accessory"?avatarLook.primary:"#f5c2da";
 const garment=String(avatarLook?.analysis?.garment_type||avatarLook?.type||"").toLowerCase();
 const garmentPattern=String(avatarLook?.analysis?.pattern||"").toLowerCase();
 const avatarSleeve=garment==="vest"?"#f1c8ce":avatarTop;
 const avatarLookStyle=avatarLook?' style="--lm-outfit-main:'+h(avatarTop)+';--lm-outfit-accent:'+h(avatarBottom)+';--lm-outfit-shoe:'+h(avatarShoe)+';--lm-outfit-accessory:'+h(avatarAccessory)+';--lm-outfit-sleeve:'+h(avatarSleeve)+';--lm-outfit-detail:'+h(avatarLook.accent||"#e6c7a7")+'"':'';
 let avatarGarmentDetails="";
 if(garment==="vest") avatarGarmentDetails='<path d="M73 137 L91 149 L110 139 L130 149 L147 137 L153 255 Q110 269 67 255Z" fill="var(--lm-outfit-main,#d7c6ee)" fill-opacity=".86" stroke="#896879" stroke-width="2.4" stroke-linejoin="round"/><path d="M110 141V261 M79 195 L99 195 L99 216 L76 216Z M121 195 L143 195 L145 216 L121 216Z M110 151V224" fill="none" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2" stroke-linejoin="round"/><circle cx="110" cy="157" r="2" fill="var(--lm-outfit-detail,#e6c7a7)"/><circle cx="110" cy="169" r="2" fill="var(--lm-outfit-detail,#e6c7a7)"/><circle cx="110" cy="181" r="2" fill="var(--lm-outfit-detail,#e6c7a7)"/>';
 else if(garment==="hoodie") avatarGarmentDetails='<path d="M82 136 Q84 117 110 117 Q136 117 138 136 L128 155 L110 144 L92 155Z" fill="var(--lm-outfit-main,#d7c6ee)" fill-opacity=".72" stroke="#896879" stroke-width="2" stroke-linejoin="round"/><path d="M103 146 L99 185 M117 146 L121 185 M78 226 Q110 211 142 226 L139 244 Q110 233 81 244Z" fill="none" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
 else if(garment==="shirt"||garment==="blouse") avatarGarmentDetails='<path d="M94 130 L103 143 L110 137 L117 143 L126 130 L121 158 L110 151 L99 158Z" fill="var(--lm-outfit-detail,#e6c7a7)" fill-opacity=".72" stroke="#896879" stroke-width="1.5" stroke-linejoin="round"/>';
 if(garmentPattern==="striped") avatarGarmentDetails+='<path d="M72 174 H148 M74 196 H146 M76 218 H144" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="4" clip-path="url(#lmTorsoClip)" opacity=".78"/>';
 else if(garmentPattern==="plaid") avatarGarmentDetails+='<path d="M88 145 V250 M110 141 V255 M132 145 V250 M70 177 H150 M70 205 H150 M72 232 H148" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2.5" clip-path="url(#lmTorsoClip)" opacity=".72"/>';
 else if(garmentPattern==="polka-dot") avatarGarmentDetails+='<g fill="var(--lm-outfit-detail,#e6c7a7)" clip-path="url(#lmTorsoClip)"><circle cx="91" cy="177" r="3"/><circle cx="127" cy="181" r="3"/><circle cx="105" cy="202" r="3"/><circle cx="138" cy="213" r="3"/><circle cx="84" cy="225" r="3"/><circle cx="118" cy="237" r="3"/></g>';
 else if(garmentPattern==="floral") avatarGarmentDetails+='<g fill="none" stroke="var(--lm-outfit-detail,#e6c7a7)" stroke-width="2" clip-path="url(#lmTorsoClip)"><circle cx="92" cy="184" r="6"/><circle cx="128" cy="211" r="6"/><circle cx="103" cy="235" r="6"/><path d="M92 176V192 M84 184H100 M128 203V219 M120 211H136 M103 227V243 M95 235H111"/></g>';
 else if(garmentPattern==="graphic") avatarGarmentDetails+='<path d="M96 178 L110 167 L124 178 L110 201Z" fill="var(--lm-outfit-detail,#e6c7a7)" stroke="#896879" stroke-width="1.4" clip-path="url(#lmTorsoClip)"/>';
 const tasks=lifeMapUniqueTasks(list(state&&state.tasks)).filter(t=>String(t.date||"")===date&&!t.paused&&!t.duplicateHidden&&!t.waitingForFunds&&!(/\b(app|development)\b/i.test(String(t.category||""))&&/build|apk|bridge|workflow|deploy|migration/i.test(String(t.title||""))));
 const completed=tasks.filter(t=>t.done).length,open=tasks.filter(t=>!t.done);
 const careHabits=typeof selfCareHabits==="function"?selfCareHabits():[];
 const careDone=careHabits.filter(x=>typeof selfCareDone==="function"&&selfCareDone(x.key,date)).length;
 const carePct=careHabits.length?Math.round(careDone/careHabits.length*100):0;
 const taskPct=tasks.length?Math.round(completed/tasks.length*100):0;
 const terms={
  mind:/mind|mental|journal|therapy|rest|breath|quiet|meditat/i,
  body:/water|tooth|teeth|brush|shower|hair|vitamin|medicine|dental|dentist|dentistry|pediatric|medical|stretch|workout|exercise|sleep|skin/i,
  people:/school|backpack|consent|relationship|family|together|read with|time with|spend time|play with|connect with|hang out with|check.?in with|date night/i,
  home:/robot vacuum|litter|home|house|room|kitchen|bathroom|laundry|dish|trash|declutter|organize|clean/i,
  spirituality:/spiritual|tarot|ritual|meditat|affirmation/i,
  hobbies:/hobby|craft|garden|plant care|project|yoga/i,
  money:/money|budget|bill|bank|account|paycheck|finance|rent|electric/i,
  car:/car|vehicle|volvo|key|keys|lock|tire|fuel|oil|driving|driver|package/i,
  work:/work|ups|shift|route|preload|paycheck|delivery|deliver|clock.?in/i
 };
 const matches=Object.fromEntries(Object.entries(terms).map(([key,re])=>[key,tasks.filter(t=>{
  const category=String(t.category||"").toLowerCase();
  if(category==="car"||category==="work")return category===key;
  return re.test(String(t.title||"")+" "+category+" "+String(t.child||""));
 })]));
 matches.home=window.lifeMapHouseholdRows(date);
 const pctFor=key=>{
  const rows=matches[key]||[],habits=key==="mind"?careHabits:[];
  const total=rows.length+habits.length,done=rows.filter(t=>t.done).length+(key==="mind"?careDone:0);
  return total?Math.round(done/total*100):0;
 };
 const moneyGoals=list(state&&state.settings&&state.settings.financialRoadmap).filter(g=>g&&Array.isArray(g.steps));
 const moneyGoalSteps=moneyGoals.flatMap(g=>g.steps),moneyGoalDone=moneyGoalSteps.filter(step=>step&&step.done).length,moneyGoalTotal=moneyGoalSteps.length,moneyGoalPct=moneyGoalTotal?Math.round(moneyGoalDone/moneyGoalTotal*100):0;
 const moneyGoalRows=moneyGoals.map(goal=>{const steps=list(goal.steps),done=steps.filter(step=>step&&step.done).length,pct=steps.length?Math.round(done/steps.length*100):0;return '<div class="lm-money-goal"><b>'+h(goal.name||"Money goal")+'</b><small>'+done+" of "+steps.length+" steps · "+pct+"%"+'</small></div>'}).join("");
 const moneyTaskDone=matches.money.filter(t=>t.done).length,moneyProgressTotal=moneyGoalTotal+matches.money.length,moneyProgressDone=moneyGoalDone+moneyTaskDone,moneyFill=moneyProgressTotal?Math.round(moneyProgressDone/moneyProgressTotal*100):0;
 const avatarMarks=[
  avatarMark("Mind and self-care","✿",47,99,carePct,"#c89ad7","mind"),
  avatarMark("Spirituality","☾",174,78,pctFor("spirituality"),"#f2b85b","spirituality"),
  avatarMark("Body & health","♡",111,205,pctFor("body"),"#f2ae85","body"),
  avatarMark("Relationships","♥",43,274,pctFor("people"),"#e98cb0","people"),
  avatarMark("Hobbies and projects","✎",177,274,pctFor("hobbies"),"#82c6a4","hobbies"),
  avatarMark("Money and planning","✧",111,372,moneyFill,"#83b8df","money"),
  avatarMark("Car & driving","C",47,425,pctFor("car"),"#e98cb0","car"),
  avatarMark("Work","W",175,425,pctFor("work"),"#82c6a4","work")
 ].join("");
 const taskRow=t=>'<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="'+(t._lifeChore?"toggleChore":"toggleTask")+'(\''+h(t.id)+'\',this.checked)"><span><b>'+h(t.title||"Task")+'</b>'+(t.child?'<small>'+h(t.child)+'</small>':"")+'</span></label>';
 const careRows=careHabits.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
 const areaTitles={home:"Home & household",mind:"Mind & self-care",body:"Body & health",people:"Relationships",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning",car:"Car & driving",work:"Work"};
 const areaSelection=areaOverride||activeArea;
 const areaText=t=>String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"");
 const areaHistory=areaSelection&&terms[areaSelection]?lifeMapUniqueTasks(list(state&&state.tasks)).filter(t=>{const category=String(t.category||"").toLowerCase();return t.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&((category==="car"||category==="work")?category===areaSelection:terms[areaSelection].test(areaText(t)))}).map(t=>({date:String(t.date),title:String(t.title||"Task")})):[];
 const careHistory=areaSelection==="mind"?list(state&&state.selfCare).filter(x=>x.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&careHabits.some(habit=>habit.key===x.key)).map(x=>({date:String(x.date),title:careHabits.find(habit=>habit.key===x.key)?.label||"Self-care"})):[];
 const lastAreaDone=[...areaHistory,...careHistory].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const activeAreaRows=areaSelection?((areaSelection==="mind"?careRows:"")+(matches[areaSelection]||[]).map(taskRow).join("")):"";
 const moneyGoalPanel=areaSelection==="money"?'<div class="lm-money-goals"><span class="lm-kicker">MONEY GOAL PROGRESS</span><b>'+(moneyGoalTotal?moneyGoalDone+" of "+moneyGoalTotal+" steps · "+moneyGoalPct+"%":"No money-goal steps saved yet")+'</b>'+(moneyGoalRows||'<p class="lm-muted">Add a goal and steps to start tracking progress.</p>')+'<button type="button" class="lm-text-button" onclick="openMoneyHubSection(\'goals\')">Open money goals ›</button></div>':"";
 const activeAreaPanel=areaSelection?'<section class="lm-inline-panel" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(areaTitles[areaSelection]||"Life area")+'</b><button type="button" class="lm-text-button" onclick="lifeMapCloseArea()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+(lastAreaDone?h(lastAreaDone.title)+' · '+h(lastAreaDone.date):"No completed item found in saved history")+'</p>'+(activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':'<p class="lm-muted">No matching checkboxes are on today’s list.</p>')+moneyGoalPanel+'</section>':"";
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
 const activeRoomPanel=selectedRoomData?'<section class="lm-inline-panel lm-inline-room" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(selectedRoomData.name)+' · room tasks</b><button type="button" class="lm-text-button" onclick="lifeMapCloseRoomInline()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+h(selectedRoomData.insights.last)+'</p><p>'+h(selectedRoomData.insights.declutter)+'</p>'+(selectedRoomData.tasks.length? '<div class="lm-scene-grid lm-avatar-only"><div class="lm-avatar-wrap"><svg class="lm-avatar"'+avatarLookStyle+' viewBox="0 0 220 510" role="group" aria-label="An illustrated avatar of Michelle with clickable life areas">'+
 '<defs>'+ '<clipPath id="lmTorsoClip"><path d="M75 130 Q91 119 110 122 Q129 119 145 130 L151 255 Q110 270 69 255Z"/></clipPath>'+ '<clipPath id="lmLeftClip"><path d="M77 128 Q60 132 55 153 L32 246 Q29 259 43 265 L68 198 L91 166Z"/></clipPath>'+ '<clipPath id="lmRightClip"><path d="M143 128 Q160 132 165 153 L188 246 Q191 259 177 265 L152 198 L129 166Z"/></clipPath>'+ '<clipPath id="lmLegClip"><path d="M69 251 Q110 268 151 251 L145 303 L137 454 L116 465 L110 300 L103 465 L82 454 L75 303Z"/></clipPath>'+ '<clipPath id="lmJacketClip"><path clip-rule="evenodd" d="M67 130 Q78 119 98 122 L110 139 L122 122 Q142 119 153 130 L163 174 L148 194 L147 253 Q110 268 73 253 L72 194 L57 174Z M96 143 L124 143 L124 247 L96 247Z"/></clipPath>'+ '<clipPath id="lmShoeClip"><path d="M77 449 L108 449 L108 482 Q97 498 54 490 Q50 483 59 475Z M112 449 L143 449 L160 475 Q171 484 160 491 Q119 499 112 482Z"/></clipPath>'+ '</defs>'+ '<image href="assets/michelle-equestria-avatar.png" x="0" y="0" width="220" height="510" preserveAspectRatio="xMidYMid slice" pointer-events="none" aria-hidden="true"/>'+ (avatarLook?'<g clip-path="url(#lmJacketClip)" opacity=".38"><rect x="35" y="115" width="150" height="155" fill="var(--lm-outfit-main,#d7c6ee)"/></g><g clip-path="url(#lmLegClip)" opacity=".45"><rect x="55" y="245" width="110" height="225" fill="var(--lm-outfit-accent,#c5d9ef)"/></g><g clip-path="url(#lmShoeClip)" opacity=".42"><rect x="48" y="448" width="125" height="55" fill="var(--lm-outfit-shoe,#f7b9cd)"/></g>':'')+ '<g opacity=".24" clip-path="url(#lmTorsoClip)"><rect x="62" y="'+(270-148*pctFor("body")/100)+'" width="96" height="148" fill="#f2ae85"/></g>'+ '<g opacity=".23" clip-path="url(#lmLeftClip)"><rect x="28" y="'+(265-132*pctFor("people")/100)+'" width="68" height="132" fill="#e98cb0"/></g><g opacity=".23" clip-path="url(#lmRightClip)"><rect x="124" y="'+(265-132*pctFor("hobbies")/100)+'" width="68" height="132" fill="#82c6a4"/></g>'+ '<g opacity=".25" clip-path="url(#lmLegClip)"><rect x="55" y="'+(465-210*pctFor("money")/100)+'" width="110" height="210" fill="#83b8df"/></g>'+ avatarGarmentDetails+ '<g class="lm-avatar-hit-zones" aria-label="Tap a body area to open its page">'+ avatarHotspot("mind","Mind & self-care","M57 48 Q71 6 111 7 Q151 6 165 48 L161 107 Q151 126 110 128 Q69 126 59 107Z")+ avatarHotspot("spirituality","Spirituality","M48 103 Q34 50 72 17 Q110 -10 148 17 Q186 50 172 103 Q153 74 127 55 Q106 43 84 59 Q64 75 48 103Z")+ avatarHotspot("body","Body, health & safety","M70 125 Q90 116 110 122 Q130 116 150 125 L158 256 Q110 273 62 256Z")+ avatarHotspot("people","Relationships","M77 127 Q57 128 52 157 L29 247 Q27 261 43 267 L70 198 L91 165Z")+ avatarHotspot("hobbies","Hobbies & projects","M143 127 Q163 128 168 157 L191 247 Q193 261 177 267 L150 198 L129 165Z")+ avatarHotspot("money","Money & planning","M65 250 Q110 269 155 250 L148 307 L139 455 L116 466 L110 299 L103 466 L80 455 L72 307Z")+ '</g>'+avatarMarks+'</svg>'+
 '<p class="lm-avatar-caption">Tap any part or badge to open that area. Color grows in small steps.</p>'+(typeof window.avatarWardrobePanelHtml==="function"?window.avatarWardrobePanelHtml():"")+'</div></div></section>'+
 taskSummary+'<section class="lm-lower-grid">'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2><button type="button" class="lm-text-button" onclick="setView(&#39;lifearea-home&#39;)">Whole-house tasks ›</button></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div><p class="lm-room-tip">Tap a room to see its tasks, inventory, photos, and separate decluttering progress.</p>'+activeRoomPanel+'</section></section>'+
 '<section class="lm-trackers"><div class="lm-tracker-title"><span class="lm-kicker">YOUR TRACKING STAYS HERE</span><h2>All the pieces you already log</h2></div>'+
 '<button type="button" onclick="setView(\'home\')"><span>🥣</span><b>Food</b><small>'+foodCount+' entries today</small></button><button type="button" onclick="setView(\'log\')"><span>☾</span><b>Sleep</b><small>'+(sleepCount?"Logged today":"Open sleep tracking")+'</small></button><button type="button" onclick="setView(\'selfcare\')"><span>💧</span><b>Water</b><small>'+waterCount+' logs today</small></button><button type="button" onclick="setView(\'family\')"><span>♡</span><b>Family</b><small>Time, people & birthdays</small></button><button type="button" onclick="setView(\'inventory\')"><span>▤</span><b>Inventory</b><small>'+itemCount+' saved item records</small></button><button type="button" onclick="setView(\'spirituality\')"><span>☾</span><b>Spirituality</b><small>Readings & rituals</small></button><button type="button" onclick="setView(\'gardenhobbies\')"><span>✿</span><b>Hobbies</b><small>Plants & projects</small></button><button type="button" onclick="setView(\'more\')"><span>✧</span><b>Money</b><small>Bills & plans</small></button></section>'+
 (clothingRows?'<section class="lm-wardrobes"><div><span class="lm-kicker">CLOTHING ON FILE</span><h2>Inventory by person</h2><p>Counts compare assigned saved items with your clothing targets; low counts mean items are not yet recorded to the target.</p></div><div>'+clothingRows+'</div></section>':'<section class="lm-wardrobes lm-wardrobes-empty"><div><span class="lm-kicker">CLOTHING INVENTORY</span><h2>Keep each person’s items together</h2><p>No clothing records with a person assigned are saved yet. Existing inventory is untouched.</p><button type="button" onclick="setView(\'inventory\')">Open inventory ›</button></div></section>')+
 '<p class="lm-disclaimer">This first pass reads your existing records. It does not move, delete, or rewrite your data. Avatar fill currently uses date-specific tasks and self-care logs; spirituality, hobbies, and money each link to their existing trackers.</p></section>';
}
window.lifeMapSelectArea=function(area){const allowed=["home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return;activeArea="";activeRoom=null;if(typeof setView==="function")setView("lifearea-"+area)};
function avatarAreaFromEvent(event){const target=event.target&&event.target.closest?event.target.closest(".lm-avatar-mark[data-life-area],.lm-avatar-hotspot[data-life-area]"):null;if(!target)return;const area=target.getAttribute("data-life-area");if(!area)return;if(event.type==="keydown"&&event.key!=="Enter"&&event.key!==" ")return;if(event.type==="keydown")event.preventDefault();if(typeof window.lifeMapSelectArea==="function")window.lifeMapSelectArea(area)}
document.addEventListener("click",avatarAreaFromEvent);
document.addEventListener("keydown",avatarAreaFromEvent);
window.lifeMapCloseArea=function(){if(typeof setView==="function")setView("lifemap")};
window.lifeMapSelectRoomInline=function(f,id){if(!floorNames.includes(f)||!id)return;activeRoom={floor:f,id:String(id)};activeArea="";if(typeof render==="function")render()};
window.lifeMapCloseRoomInline=function(){activeRoom=null;if(typeof render==="function")render()};
window.lifeMapAreaPage=function(area){const allowed=["home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area)};
window.lifeMapAreaTasksPage=function(area){const allowed=["all","home","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area,true)};
window.lifeMapView=view;
window.lifeMapSetFloor=function(floor){
 if(!floorNames.includes(floor))return;
 try{localStorage.setItem("dailyLifeMapFirstFloor",floor)}catch(_){}
 if(typeof render==="function")render();
};
})();
