(function(){
"use strict";
const h=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const day=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
const list=value=>Array.isArray(value)?value:[];
const floorNames=["Basement","First floor","Second floor","Third floor"];
let activeArea="",activeRoom=null;
function selectedFloor(){try{const value=localStorage.getItem("dailyLifeMapFirstFloor");return floorNames.includes(value)?value:"First floor"}catch(_){return "First floor"}}
function jump(view){if(typeof setView==="function")setView(view)}
function avatarMark(label,icon,x,y,pct,color,area){
 const alpha=(0.2+Math.max(0,Math.min(100,Number(pct)||0)/125)).toFixed(2);
 return `<g class="lm-avatar-mark" role="button" tabindex="0" aria-label="${h(label)}" title="${h(label)}" data-life-area="${h(area)}">`+
 '<circle cx="'+x+'" cy="'+y+'" r="14" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>'+
 '<circle cx="'+x+'" cy="'+y+'" r="10" fill="'+color+'" fill-opacity="'+alpha+'"/>'+
 '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="12" font-weight="900" fill="#48394d">'+icon+'</text></g>';
}
function avatarHotspot(area,label,path){
 return `<path class="lm-avatar-hotspot" d="${path}" fill="transparent" stroke="transparent" stroke-width="12" stroke-linejoin="round" pointer-events="all" role="button" tabindex="0" aria-label="Open ${h(label)}" data-life-area="${h(area)}"/>`;
}
function view(areaOverride,tasksOnly){
 const date=day(),profile=(state&&state.profile)||{},name=String(profile.name||"").trim().split(/\s+/)[0]||"there";
 const tasks=list(state&&state.tasks).filter(t=>String(t.date||"")===date&&!t.paused&&!t.duplicateHidden&&!t.waitingForFunds);
 const completed=tasks.filter(t=>t.done).length,open=tasks.filter(t=>!t.done);
 const careHabits=typeof selfCareHabits==="function"?selfCareHabits():[];
 const careDone=careHabits.filter(x=>typeof selfCareDone==="function"&&selfCareDone(x.key,date)).length;
 const carePct=careHabits.length?Math.round(careDone/careHabits.length*100):0;
 const taskPct=tasks.length?Math.round(completed/tasks.length*100):0;
 const terms={
  mind:/mind|mental|journal|therapy|rest|breath|quiet|meditat/i,
  body:/water|tooth|teeth|brush|shower|hair|vitamin|medicine|stretch|workout|exercise|sleep|skin/i,
  people:/relationship|family|together|read with|time with|spend time|play with|connect with|hang out with|check.?in with|date night/i,
  home:/home|house|room|kitchen|bathroom|laundry|dish|trash|declutter|organize|clean/i,
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
 const pctFor=key=>{const total=matches[key]?.length||0,done=(matches[key]||[]).filter(t=>t.done).length;return total?Math.round(done/Math.max(5,total)*100):0};
 const moneyGoals=list(state&&state.settings&&state.settings.financialRoadmap).filter(g=>g&&Array.isArray(g.steps));
 const moneyGoalSteps=moneyGoals.flatMap(g=>g.steps),moneyGoalDone=moneyGoalSteps.filter(step=>step&&step.done).length,moneyGoalTotal=moneyGoalSteps.length,moneyGoalPct=moneyGoalTotal?Math.round(moneyGoalDone/moneyGoalTotal*100):0;
 const moneyGoalRows=moneyGoals.map(goal=>{const steps=list(goal.steps),done=steps.filter(step=>step&&step.done).length,pct=steps.length?Math.round(done/steps.length*100):0;return '<div class="lm-money-goal"><b>'+h(goal.name||"Money goal")+'</b><small>'+done+" of "+steps.length+" steps · "+pct+"%"+'</small></div>'}).join("");
 const moneyTaskDone=matches.money.filter(t=>t.done).length,moneyProgressTotal=moneyGoalTotal+matches.money.length,moneyProgressDone=moneyGoalDone+moneyTaskDone,moneyFill=moneyProgressTotal?Math.round(moneyProgressDone/moneyProgressTotal*100):0;
 const avatarMarks=[
  avatarMark("Mind and self-care","✿",81,56,carePct,"#c89ad7","mind"),
  avatarMark("Spirituality","☾",141,42,pctFor("spirituality"),"#f2b85b","spirituality"),
  avatarMark("Body & health","♡",110,133,pctFor("body"),"#f2ae85","body"),
  avatarMark("Relationships","♥",78,168,pctFor("people"),"#e98cb0","people"),
  avatarMark("Hobbies and projects","✎",166,166,pctFor("hobbies"),"#82c6a4","hobbies"),
  avatarMark("Money and planning","✧",112,266,moneyFill,"#83b8df","money"),
  avatarMark("Car & driving","C",51,235,pctFor("car"),"#e98cb0","car"),
  avatarMark("Work","W",169,235,pctFor("work"),"#82c6a4","work")
 ].join("");
 const taskRow=t=>'<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="toggleTask(\''+h(t.id)+'\',this.checked)"><span><b>'+h(t.title||"Task")+'</b>'+(t.child?'<small>'+h(t.child)+'</small>':"")+'</span></label>';
 const careRows=careHabits.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
 const areaTitles={mind:"Mind & self-care",body:"Body & health",people:"Relationships",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning",car:"Car & driving",work:"Work"};
 const areaSelection=areaOverride||activeArea;
 const areaText=t=>String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"");
 const areaHistory=areaSelection&&terms[areaSelection]?list(state&&state.tasks).filter(t=>t.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&terms[areaSelection].test(areaText(t))).map(t=>({date:String(t.date),title:String(t.title||"Task")})):[];
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
  const descriptions={mind:"Mental health, self-care, and small practices that help you feel cared for.",body:"Health routines and everyday care for your body.",people:"Family connection and relationship tasks, gathered in one place.",spirituality:"Spiritual practices and reflections linked to this part of your life.",hobbies:"Hobbies, creative projects, and interests you are growing.",money:"Money goals are shown here. Budget setup is still unfinished; use the budget button to add income and funded categories.",car:"Car keys, maintenance, driving setup, and other vehicle tasks.",work:"UPS shifts, delivery routines, and other work tasks."};
  const trackerViews={mind:"selfcare",body:"log",people:"family",spirituality:"spirituality",hobbies:"gardenhobbies",money:"budget",car:"today",work:"today"};
  const trackerLabels={mind:"Self-care",body:"Health logs",people:"Family",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Finish budget setup",car:"Today’s plan",work:"Today’s plan"};
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
 '<header class="lm-welcome"><div><span class="lm-kicker">YOUR LIFE MAP</span><h1>Hi, '+h(name)+'.</h1><p>Your life is made of lots of little things. Each one counts.</p></div><button type="button" class="lm-today-progress" aria-label="Open today’s tasks: '+completed+' of '+tasks.length+' complete" onclick="setView(\'lifearea-tasks-all\')"><span>Today’s tasks</span><b>'+completed+' <small>of '+tasks.length+' done</small></b><i><em style="width:'+taskPct+'%"></em></i><span class="lm-plan-open">Tap to view the list ›</span></button></header>'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><span class="lm-kicker">LIFE IN PROGRESS</span><h2>Different parts of your life, together</h2><p>Color fills as linked tasks get done. It’s a picture of activity, not a grade.</p></div></div>'+
 '<div class="lm-scene-grid lm-avatar-only"><div class="lm-avatar-wrap"><svg class="lm-avatar" viewBox="0 0 220 300" role="group" aria-label="A cheerful illustrated avatar with clickable life areas">'+
 '<defs><clipPath id="lmMindClip"><path d="M82 44 Q87 25 110 24 Q133 25 138 44 L139 68 Q138 93 110 97 Q82 93 81 68Z"/></clipPath><clipPath id="lmSpiritClip"><path d="M73 62 Q70 25 98 18 Q125 11 145 33 Q153 48 147 62 Q130 39 110 39 Q91 39 73 62Z"/></clipPath><clipPath id="lmTorsoClip"><path d="M87 111 Q110 101 133 111 L138 179 Q110 187 82 179Z"/></clipPath><clipPath id="lmLeftClip"><path d="M81 114 Q66 120 60 143 L53 177 Q54 185 61 187 L76 151 L92 137Z"/></clipPath><clipPath id="lmRightClip"><path d="M139 114 Q154 120 160 143 L167 177 Q166 185 159 187 L144 151 L128 137Z"/></clipPath><clipPath id="lmLegClip"><path d="M82 179 Q110 190 138 179 L134 218 L86 218Z M89 218 L104 218 L104 289 L89 289Z M116 218 L131 218 L131 289 L116 289Z"/></clipPath></defs>'+
 '<path d="M78 67 Q70 28 98 18 Q125 10 145 33 Q154 49 148 77 L143 101 Q140 112 133 109 L136 62 Q132 49 123 43 Q105 50 87 43 Q85 59 82 99 Q80 109 73 109 Q68 101 70 90Z" fill="#654746" stroke="#553c3d" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<path d="M82 58 Q82 34 101 27 Q121 21 137 37 Q142 43 143 54 Q130 42 119 41 Q105 42 96 48 Q89 53 82 66Z" fill="#7b5148" stroke="#553c3d" stroke-width="2" stroke-linejoin="round"/>'+
 '<path d="M88 37 Q99 23 114 24 M130 34 Q139 43 140 53 M76 74 Q75 90 74 101 M143 72 Q142 88 140 99" fill="none" stroke="#a36b5d" stroke-width="2" stroke-linecap="round" opacity=".8"/>'+
 '<ellipse cx="110" cy="61" rx="28" ry="34" fill="#f7dfd4" stroke="#64445a" stroke-width="3.3"/>'+
 '<path d="M82 52 Q84 34 99 27 Q118 19 133 31 Q140 36 142 49 Q132 41 120 39 Q106 39 95 46 Q89 50 82 58Z" fill="#654746" stroke="#553c3d" stroke-width="2" stroke-linejoin="round"/>'+
 '<path d="M97 58 Q102 54 107 58 M114 58 Q119 54 124 58" fill="none" stroke="#44343b" stroke-width="2.3" stroke-linecap="round"/>'+
 '<ellipse cx="103" cy="62" rx="3" ry="4" fill="#44343b"/><ellipse cx="118" cy="62" rx="3" ry="4" fill="#44343b"/><circle cx="104" cy="60.5" r="1" fill="#fff"/><circle cx="119" cy="60.5" r="1" fill="#fff"/>'+
 '<path d="M100 54 L97 52 M105 54 L107 52 M115 54 L113 52 M120 54 L123 52" stroke="#44343b" stroke-width="1.4" stroke-linecap="round"/>'+
 '<ellipse cx="92" cy="72" rx="5" ry="2.7" fill="#efa7b2" opacity=".55"/><ellipse cx="128" cy="72" rx="5" ry="2.7" fill="#efa7b2" opacity=".55"/>'+
 '<path d="M109 65 Q107 69 110 70" fill="none" stroke="#d18e86" stroke-width="1.5" stroke-linecap="round"/><path d="M102 77 Q110 85 118 77" fill="none" stroke="#a9566b" stroke-width="2.8" stroke-linecap="round"/>'+
 '<path d="M99 91 L99 110 L121 110 L121 91Z" fill="#f7dfd4" stroke="#64445a" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<path d="M87 111 Q110 101 133 111 L138 179 Q110 187 82 179Z" fill="#e9c7f0" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M87 112 Q75 116 70 132 L60 171 Q58 179 65 181 L79 146 L94 134Z" fill="#e9c7f0" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/><path d="M133 112 Q145 116 150 132 L160 171 Q162 179 155 181 L141 146 L126 134Z" fill="#e9c7f0" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/>'+
 '<path d="M82 179 Q110 190 138 179 L133 289 L115 289 L110 225 L105 289 L87 289Z" fill="#f4d3e0" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M86 289 L104 289 L104 292 Q98 297 82 294 Q82 291 86 289Z M116 289 L134 289 Q140 291 143 294 Q128 298 116 293Z" fill="#fff7fb" stroke="#64445a" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<g clip-path="url(#lmMindClip)"><rect x="78" y="'+(98-74*pctFor("mind")/100)+'" width="64" height="'+(74*pctFor("mind")/100)+'" fill="#c89ad7"/></g>'+
 '<g clip-path="url(#lmSpiritClip)"><rect x="72" y="'+(62-44*pctFor("spirituality")/100)+'" width="78" height="'+(44*pctFor("spirituality")/100)+'" fill="#f2b85b"/></g>'+
 '<g clip-path="url(#lmTorsoClip)"><rect x="74" y="'+(194-85*pctFor("body")/100)+'" width="72" height="'+(85*pctFor("body")/100)+'" fill="#f2ae85"/></g>'+
 '<g clip-path="url(#lmLeftClip)"><rect x="52" y="'+(188-45*pctFor("people")/100)+'" width="42" height="'+(45*pctFor("people")/100)+'" fill="#e98cb0"/></g><g clip-path="url(#lmRightClip)"><rect x="126" y="'+(188-45*pctFor("hobbies")/100)+'" width="42" height="'+(45*pctFor("hobbies")/100)+'" fill="#82c6a4"/></g>'+
 '<g clip-path="url(#lmLegClip)"><rect x="68" y="'+(292-94*pctFor("money")/100)+'" width="84" height="'+(94*pctFor("money")/100)+'" fill="#83b8df"/></g>'+
 '<path d="M96 112 Q110 124 124 112 M103 113 L110 119 L117 113" fill="none" stroke="#755170" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'+
 '<path d="M123 144 Q130 140 134 146 L134 161 Q128 158 123 161Z" fill="#f7e7fb" stroke="#755170" stroke-width="1.8" stroke-linejoin="round"/><circle cx="128" cy="151" r="1.3" fill="#b86c9c"/>'+
 '<path d="M110 190 L110 276 M89 218 L104 218 M116 218 L132 218 M94 229 L101 229 M119 229 L127 229" fill="none" stroke="#76526b" stroke-width="2" stroke-linecap="round"/>'+
 '<path d="M86 196 Q110 201 135 196 M87 285 L105 285 M115 285 L134 285" fill="none" stroke="#76526b" stroke-width="2.4" stroke-linecap="round"/>'+
 '<path d="M90 291 L99 291 M120 291 L130 291 M92 289 L99 294 M124 289 L131 294" fill="none" stroke="#a7748e" stroke-width="1.8" stroke-linecap="round"/>'+
 '<path d="M141 27 Q146 19 151 27 Q157 21 160 28 Q159 36 151 40 Q144 36 141 27Z" fill="#f5c2da" stroke="#79516c" stroke-width="1.5"/><circle cx="151" cy="30" r="2" fill="#fff8de"/>'+
 '<g class="lm-avatar-hit-zones" aria-label="Tap a body area to open its page">'+
 avatarHotspot("mind","Mind & self-care","M83 43 Q81 55 81 68 Q82 93 110 97 Q138 93 139 68 L138 44 Q125 37 110 39 Q96 40 83 43Z")+
 avatarHotspot("spirituality","Spirituality","M73 62 Q70 25 98 18 Q125 11 145 33 Q153 48 147 76 Q140 48 125 40 Q104 34 87 43 Q84 53 78 78Z")+
 avatarHotspot("body","Body, health & safety","M87 110 Q110 101 133 110 L138 179 Q110 187 82 179Z")+
 avatarHotspot("people","Relationships","M81 112 Q66 120 60 143 L53 177 Q54 186 62 188 L78 146 L94 135Z")+
 avatarHotspot("hobbies","Hobbies & projects","M139 112 Q154 120 160 143 L167 177 Q166 186 158 188 L142 146 L126 135Z")+
 avatarHotspot("money","Money & planning","M82 179 Q110 190 138 179 L133 289 L115 289 L110 225 L105 289 L87 289Z")+
 '</g>'+avatarMarks+'</svg>'+
 '<p class="lm-avatar-caption">Tap any part or badge to open that area. Color grows in small steps.</p></div></div></section>'+
 '<section class="lm-lower-grid"><section class="lm-panel"><div class="lm-panel-heading"><div><span class="lm-kicker">TODAY</span><h2>Small steps</h2></div><button type="button" class="lm-text-button" onclick="setView(\'today\')">Full Day Flow ›</button></div>'+taskContent+
 '<details class="lm-care"><summary>Care habits today · '+careDone+' of '+careHabits.length+'</summary><div class="lm-list">'+careRows+'</div></details></section>'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div><div class="lm-room-progress">'+roomProgress+'</div>'+activeRoomPanel+'</section></section>'+
 '<section class="lm-trackers"><div class="lm-tracker-title"><span class="lm-kicker">YOUR TRACKING STAYS HERE</span><h2>All the pieces you already log</h2></div>'+
 '<button type="button" onclick="setView(\'home\')"><span>🥣</span><b>Food</b><small>'+foodCount+' entries today</small></button><button type="button" onclick="setView(\'log\')"><span>☾</span><b>Sleep</b><small>'+(sleepCount?"Logged today":"Open sleep tracking")+'</small></button><button type="button" onclick="setView(\'selfcare\')"><span>💧</span><b>Water</b><small>'+waterCount+' logs today</small></button><button type="button" onclick="setView(\'family\')"><span>♡</span><b>Family</b><small>Time, people & birthdays</small></button><button type="button" onclick="setView(\'inventory\')"><span>▤</span><b>Inventory</b><small>'+itemCount+' saved item records</small></button><button type="button" onclick="setView(\'spirituality\')"><span>☾</span><b>Spirituality</b><small>Readings & rituals</small></button><button type="button" onclick="setView(\'gardenhobbies\')"><span>✿</span><b>Hobbies</b><small>Plants & projects</small></button><button type="button" onclick="setView(\'more\')"><span>✧</span><b>Money</b><small>Bills & plans</small></button></section>'+
 (clothingRows?'<section class="lm-wardrobes"><div><span class="lm-kicker">CLOTHING ON FILE</span><h2>Inventory by person</h2><p>Counts compare assigned saved items with your clothing targets; low counts mean items are not yet recorded to the target.</p></div><div>'+clothingRows+'</div></section>':'<section class="lm-wardrobes lm-wardrobes-empty"><div><span class="lm-kicker">CLOTHING INVENTORY</span><h2>Keep each person’s items together</h2><p>No clothing records with a person assigned are saved yet. Existing inventory is untouched.</p><button type="button" onclick="setView(\'inventory\')">Open inventory ›</button></div></section>')+
 '<p class="lm-disclaimer">This first pass reads your existing records. It does not move, delete, or rewrite your data. Avatar fill currently uses date-specific tasks and self-care logs; spirituality, hobbies, and money each link to their existing trackers.</p></section>';
}
window.lifeMapSelectArea=function(area){const allowed=["mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return;activeArea="";activeRoom=null;if(typeof setView==="function")setView("lifearea-"+area)};
function avatarAreaFromEvent(event){const target=event.target&&event.target.closest?event.target.closest(".lm-avatar-mark[data-life-area],.lm-avatar-hotspot[data-life-area]"):null;if(!target)return;const area=target.getAttribute("data-life-area");if(!area)return;if(event.type==="keydown"&&event.key!=="Enter"&&event.key!==" ")return;if(event.type==="keydown")event.preventDefault();if(typeof window.lifeMapSelectArea==="function")window.lifeMapSelectArea(area)}
document.addEventListener("click",avatarAreaFromEvent);
document.addEventListener("keydown",avatarAreaFromEvent);
window.lifeMapCloseArea=function(){if(typeof setView==="function")setView("lifemap")};
window.lifeMapSelectRoomInline=function(f,id){if(!floorNames.includes(f)||!id)return;activeRoom={floor:f,id:String(id)};activeArea="";if(typeof render==="function")render()};
window.lifeMapCloseRoomInline=function(){activeRoom=null;if(typeof render==="function")render()};
window.lifeMapAreaPage=function(area){const allowed=["mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area)};
window.lifeMapAreaTasksPage=function(area){const allowed=["all","mind","body","people","spirituality","hobbies","money","car","work"];if(!allowed.includes(area))return "";return view(area,true)};
window.lifeMapView=view;
window.lifeMapSetFloor=function(floor){
 if(!floorNames.includes(floor))return;
 try{localStorage.setItem("dailyLifeMapFirstFloor",floor)}catch(_){}
 if(typeof render==="function")render();
};
})();