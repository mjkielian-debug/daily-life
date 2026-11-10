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
  money:/money|budget|bill|bank|account|paycheck|finance|rent|electric/i
 };
 const matches=Object.fromEntries(Object.entries(terms).map(([key,re])=>[key,tasks.filter(t=>re.test(String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"")))]));
 const pctFor=key=>matches[key].length?Math.round(matches[key].filter(t=>t.done).length/matches[key].length*100):0;
 const moneyGoals=list(state&&state.settings&&state.settings.financialRoadmap).filter(g=>g&&Array.isArray(g.steps));
 const moneyGoalSteps=moneyGoals.flatMap(g=>g.steps),moneyGoalDone=moneyGoalSteps.filter(step=>step&&step.done).length,moneyGoalTotal=moneyGoalSteps.length,moneyGoalPct=moneyGoalTotal?Math.round(moneyGoalDone/moneyGoalTotal*100):0;
 const moneyGoalRows=moneyGoals.map(goal=>{const steps=list(goal.steps),done=steps.filter(step=>step&&step.done).length,pct=steps.length?Math.round(done/steps.length*100):0;return '<div class="lm-money-goal"><b>'+h(goal.name||"Money goal")+'</b><small>'+done+" of "+steps.length+" steps · "+pct+"%"+'</small></div>'}).join("");
 const moneyTaskDone=matches.money.filter(t=>t.done).length,moneyProgressTotal=moneyGoalTotal+matches.money.length,moneyProgressDone=moneyGoalDone+moneyTaskDone,moneyFill=moneyProgressTotal?Math.round(moneyProgressDone/moneyProgressTotal*100):0;
 const avatarMarks=[
  avatarMark("Mind and self-care","✿",81,56,carePct,"#c89ad7","mind"),
  avatarMark("Spirituality","☾",141,42,pctFor("spirituality"),"#f2b85b","spirituality"),
  avatarMark("Body and health","♡",110,133,pctFor("body"),"#f2ae85","body"),
  avatarMark("Relationships","♥",78,168,pctFor("people"),"#e98cb0","people"),
  avatarMark("Hobbies and projects","✎",166,166,pctFor("hobbies"),"#82c6a4","hobbies"),
  avatarMark("Money and planning","✧",112,266,moneyFill,"#83b8df","money")
 ].join("");
 const taskRow=t=>'<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="toggleTask(\''+h(t.id)+'\',this.checked)"><span><b>'+h(t.title||"Task")+'</b>'+(t.child?'<small>'+h(t.child)+'</small>':"")+'</span></label>';
 const careRows=careHabits.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
 const areaTitles={mind:"Mind & self-care",body:"Body & health",people:"Relationships",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning"};
 const areaSelection=areaOverride||activeArea;
 const areaText=t=>String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"");
 const areaHistory=areaSelection&&terms[areaSelection]?list(state&&state.tasks).filter(t=>t.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&terms[areaSelection].test(areaText(t))).map(t=>({date:String(t.date),title:String(t.title||"Task")})):[];
 const careHistory=areaSelection==="mind"?list(state&&state.selfCare).filter(x=>x.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&careHabits.some(habit=>habit.key===x.key)).map(x=>({date:String(x.date),title:careHabits.find(habit=>habit.key===x.key)?.label||"Self-care"})):[];
 const lastAreaDone=[...areaHistory,...careHistory].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const activeAreaRows=areaSelection?((areaSelection==="mind"?careRows:"")+(matches[areaSelection]||[]).map(taskRow).join("")):"";
 const moneyGoalPanel=areaSelection==="money"?'<div class="lm-money-goals"><span class="lm-kicker">MONEY GOAL PROGRESS</span><b>'+(moneyGoalTotal?moneyGoalDone+" of "+moneyGoalTotal+" steps · "+moneyGoalPct+"%":"No money-goal steps saved yet")+'</b>'+(moneyGoalRows||'<p class="lm-muted">Add a goal and steps to start tracking progress.</p>')+'<button type="button" class="lm-text-button" onclick="openMoneyHubSection(\'goals\')">Open money goals ›</button></div>':"";
 const activeAreaPanel=areaSelection?'<section class="lm-inline-panel" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(areaTitles[areaSelection]||"Life area")+'</b><button type="button" class="lm-text-button" onclick="lifeMapCloseArea()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+(lastAreaDone?h(lastAreaDone.title)+' · '+h(lastAreaDone.date):"No completed item found in saved history")+'</p>'+(activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':'<p class="lm-muted">No matching checkboxes are on today’s list.</p>')+moneyGoalPanel+'</section>':"";
 if(tasksOnly&&areaSelection){
  const taskTitle=(areaTitles[areaSelection]||"Area")+" tasks";
  const taskList=activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':'<p class="lm-muted">No '+h((areaTitles[areaSelection]||"area").toLowerCase())+' tasks are scheduled for today.</p>';
  return '<section class="life-map-page lm-area-page lm-area-tasks-page"><header class="lm-area-page-heading"><button type="button" class="lm-area-back" onclick="setView(&#39;lifearea-'+areaSelection+'&#39;)">‹ '+h(areaTitles[areaSelection]||"Life area")+'</button><span class="lm-kicker">TODAY · AREA TASKS</span><h1>Today’s '+h(taskTitle)+'</h1><p>Only tasks linked to this area appear here.</p></header><section class="lm-inline-panel lm-area-page-content">'+taskList+'</section></section>';
 }
 if(areaOverride){
  const descriptions={mind:"Mental health, self-care, and small practices that help you feel cared for.",body:"Health routines and the everyday care you track for your body.",people:"Family connection and relationship tasks, gathered in one place.",spirituality:"Spiritual practices and reflections linked to this part of your life.",hobbies:"Hobbies, creative projects, and interests you are growing.",money:"Money goals are shown here. Budget setup is still unfinished; use the budget button to add income and funded categories."};
  const trackerViews={mind:"selfcare",body:"log",people:"family",spirituality:"spirituality",hobbies:"gardenhobbies",money:"budget"};
  const trackerLabels={mind:"Self-care",body:"Health logs",people:"Family",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Finish budget setup"};
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
 '<header class="lm-welcome"><div><span class="lm-kicker">YOUR LIFE MAP</span><h1>Hi, '+h(name)+'.</h1><p>Your life is made of lots of little things. Each one counts.</p></div><button type="button" class="lm-today-progress" aria-label="Open today’s tasks: '+completed+' of '+tasks.length+' complete" onclick="setView(\'today\')"><span>Today’s tasks</span><b>'+completed+' <small>of '+tasks.length+' done</small></b><i><em style="width:'+taskPct+'%"></em></i><span class="lm-plan-open">Tap to view the list ›</span></button></header>'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><span class="lm-kicker">LIFE IN PROGRESS</span><h2>Different parts of your life, together</h2><p>Color fills as linked tasks get done. It’s a picture of activity, not a grade.</p></div></div>'+
 '<div class="lm-scene-grid"><div class="lm-avatar-wrap"><svg class="lm-avatar" viewBox="0 0 220 300" role="group" aria-label="A friendly avatar with clickable mind, spirituality, health, relationships, hobbies, and money areas">'+
 '<defs><clipPath id="lmMindClip"><path d="M82 44 Q87 25 110 24 Q133 25 138 44 L139 68 Q138 93 110 97 Q82 93 81 68Z"/></clipPath><clipPath id="lmSpiritClip"><path d="M73 62 Q70 25 98 18 Q125 11 145 33 Q153 48 147 62 Q130 39 110 39 Q91 39 73 62Z"/></clipPath><clipPath id="lmTorsoClip"><path d="M87 111 Q110 101 133 111 L138 179 Q110 187 82 179Z"/></clipPath><clipPath id="lmLeftClip"><path d="M81 114 Q66 120 60 143 L53 177 Q54 185 61 187 L76 151 L92 137Z"/></clipPath><clipPath id="lmRightClip"><path d="M139 114 Q154 120 160 143 L167 177 Q166 185 159 187 L144 151 L128 137Z"/></clipPath><clipPath id="lmLegClip"><path d="M82 179 Q110 190 138 179 L134 218 L86 218Z M89 218 L104 218 L104 289 L89 289Z M116 218 L131 218 L131 289 L116 289Z"/></clipPath></defs>'+
 '<path d="M73 66 Q69 25 98 18 Q125 11 145 33 Q153 48 147 76 L142 103 Q135 96 136 62 Q127 70 124 73 L125 44 Q105 51 87 41 Q87 72 78 103Z" fill="#654746" stroke="#553c3d" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<ellipse cx="110" cy="60" rx="29" ry="35" fill="#f7dfd4" stroke="#64445a" stroke-width="3.5"/>'+
 '<path d="M83 45 Q89 20 111 20 Q133 21 140 45 Q125 36 110 39 Q96 40 83 45Z" fill="#654746"/>'+
 '<path d="M99 61 Q103 58 107 61 M114 61 Q118 58 122 61" fill="none" stroke="#44343b" stroke-width="2.3" stroke-linecap="round"/><circle cx="103" cy="63" r="1.4" fill="#44343b"/><circle cx="118" cy="63" r="1.4" fill="#44343b"/><path d="M103 77 Q110 83 117 77" fill="none" stroke="#a9566b" stroke-width="2.5" stroke-linecap="round"/>'+
 '<path d="M101 91 L101 109 L119 109 L119 91Z" fill="#f7dfd4"/>'+
 '<path d="M87 111 Q110 101 133 111 L138 179 Q110 187 82 179Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M87 112 Q75 116 70 132 L60 171 Q58 179 65 181 L79 146 L94 134Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/><path d="M133 112 Q145 116 150 132 L160 171 Q162 179 155 181 L141 146 L126 134Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/>'+
 '<path d="M82 179 Q110 190 138 179 L133 289 L115 289 L110 225 L105 289 L87 289Z" fill="#f4edf3" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M89 289 L104 289 L104 292 Q98 296 84 294 Q84 291 89 289Z M116 289 L131 289 Q137 291 140 294 Q127 297 116 293Z" fill="#654746" stroke="#553c3d" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<g clip-path="url(#lmMindClip)"><rect x="78" y="'+(98-74*pctFor("mind")/100)+'" width="64" height="'+(74*pctFor("mind")/100)+'" fill="#c89ad7"/></g>'+
 '<g clip-path="url(#lmSpiritClip)"><rect x="72" y="'+(62-44*pctFor("spirituality")/100)+'" width="78" height="'+(44*pctFor("spirituality")/100)+'" fill="#f2b85b"/></g>'+
 '<g clip-path="url(#lmTorsoClip)"><rect x="74" y="'+(194-85*pctFor("body")/100)+'" width="72" height="'+(85*pctFor("body")/100)+'" fill="#f2ae85"/></g>'+
 '<g clip-path="url(#lmLeftClip)"><rect x="52" y="'+(188-45*pctFor("people")/100)+'" width="42" height="'+(45*pctFor("people")/100)+'" fill="#e98cb0"/></g><g clip-path="url(#lmRightClip)"><rect x="126" y="'+(188-45*pctFor("hobbies")/100)+'" width="42" height="'+(45*pctFor("hobbies")/100)+'" fill="#82c6a4"/></g>'+
 '<g clip-path="url(#lmLegClip)"><rect x="68" y="'+(292-94*pctFor("money")/100)+'" width="84" height="'+(94*pctFor("money")/100)+'" fill="#83b8df"/></g>'+
 '<path d="M94 137 Q110 151 126 137" fill="none" stroke="#64445a" stroke-width="3" stroke-linecap="round"/>'+
 '<g class="lm-avatar-hit-zones" aria-label="Tap a body area to open its page">'+
 avatarHotspot("mind","Mind & self-care","M83 43 Q81 55 81 68 Q82 93 110 97 Q138 93 139 68 L138 44 Q125 37 110 39 Q96 40 83 43Z")+
 avatarHotspot("spirituality","Spirituality","M73 62 Q70 25 98 18 Q125 11 145 33 Q153 48 147 76 Q140 48 125 40 Q104 34 87 43 Q84 53 78 78Z")+
 avatarHotspot("body","Body & health","M87 110 Q110 101 133 110 L138 179 Q110 187 82 179Z")+
 avatarHotspot("people","Relationships","M81 112 Q66 120 60 143 L53 177 Q54 186 62 188 L78 146 L94 135Z")+
 avatarHotspot("hobbies","Hobbies & projects","M139 112 Q154 120 160 143 L167 177 Q166 186 158 188 L142 146 L126 135Z")+
 avatarHotspot("money","Money & planning","M82 179 Q110 190 138 179 L133 289 L115 289 L110 225 L105 289 L87 289Z")+
 '</g>'+avatarMarks+'</svg>'+
 '<p class="lm-avatar-caption">Tap a marker to open an area. Money-goal progress fills the pants.</p></div></div></section>'+
 '<section class="lm-lower-grid"><section class="lm-panel"><div class="lm-panel-heading"><div><span class="lm-kicker">TODAY</span><h2>Small steps</h2></div><button type="button" class="lm-text-button" onclick="setView(\'today\')">Full Day Flow ›</button></div>'+taskContent+
 '<details class="lm-care"><summary>Care habits today · '+careDone+' of '+careHabits.length+'</summary><div class="lm-list">'+careRows+'</div></details></section>'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div><div class="lm-room-progress">'+roomProgress+'</div>'+activeRoomPanel+'</section></section>'+
 '<section class="lm-trackers"><div class="lm-tracker-title"><span class="lm-kicker">YOUR TRACKING STAYS HERE</span><h2>All the pieces you already log</h2></div>'+
 '<button type="button" onclick="setView(\'home\')"><span>🥣</span><b>Food</b><small>'+foodCount+' entries today</small></button><button type="button" onclick="setView(\'log\')"><span>☾</span><b>Sleep</b><small>'+(sleepCount?"Logged today":"Open sleep tracking")+'</small></button><button type="button" onclick="setView(\'selfcare\')"><span>💧</span><b>Water</b><small>'+waterCount+' logs today</small></button><button type="button" onclick="setView(\'family\')"><span>♡</span><b>Family</b><small>Time, people & birthdays</small></button><button type="button" onclick="setView(\'inventory\')"><span>▤</span><b>Inventory</b><small>'+itemCount+' saved item records</small></button><button type="button" onclick="setView(\'spirituality\')"><span>☾</span><b>Spirituality</b><small>Readings & rituals</small></button><button type="button" onclick="setView(\'gardenhobbies\')"><span>✿</span><b>Hobbies</b><small>Plants & projects</small></button><button type="button" onclick="setView(\'more\')"><span>✧</span><b>Money</b><small>Bills & plans</small></button></section>'+
 (clothingRows?'<section class="lm-wardrobes"><div><span class="lm-kicker">CLOTHING ON FILE</span><h2>Inventory by person</h2><p>Counts compare assigned saved items with your clothing targets; low counts mean items are not yet recorded to the target.</p></div><div>'+clothingRows+'</div></section>':'<section class="lm-wardrobes lm-wardrobes-empty"><div><span class="lm-kicker">CLOTHING INVENTORY</span><h2>Keep each person’s items together</h2><p>No clothing records with a person assigned are saved yet. Existing inventory is untouched.</p><button type="button" onclick="setView(\'inventory\')">Open inventory ›</button></div></section>')+
 '<p class="lm-disclaimer">This first pass reads your existing records. It does not move, delete, or rewrite your data. Avatar fill currently uses date-specific tasks and self-care logs; spirituality, hobbies, and money each link to their existing trackers.</p></section>';
}
window.lifeMapSelectArea=function(area){const allowed=["mind","body","people","spirituality","hobbies","money"];if(!allowed.includes(area))return;activeArea="";activeRoom=null;if(typeof setView==="function")setView("lifearea-"+area)};
function avatarAreaFromEvent(event){const target=event.target&&event.target.closest?event.target.closest(".lm-avatar-mark[data-life-area],.lm-avatar-hotspot[data-life-area]"):null;if(!target)return;const area=target.getAttribute("data-life-area");if(!area)return;if(event.type==="keydown"&&event.key!=="Enter"&&event.key!==" ")return;if(event.type==="keydown")event.preventDefault();if(typeof window.lifeMapSelectArea==="function")window.lifeMapSelectArea(area)}
document.addEventListener("click",avatarAreaFromEvent);
document.addEventListener("keydown",avatarAreaFromEvent);
window.lifeMapCloseArea=function(){if(typeof setView==="function")setView("lifemap")};
window.lifeMapSelectRoomInline=function(f,id){if(!floorNames.includes(f)||!id)return;activeRoom={floor:f,id:String(id)};activeArea="";if(typeof render==="function")render()};
window.lifeMapCloseRoomInline=function(){activeRoom=null;if(typeof render==="function")render()};
window.lifeMapAreaPage=function(area){const allowed=["mind","body","people","spirituality","hobbies","money"];if(!allowed.includes(area))return "";return view(area)};
window.lifeMapAreaTasksPage=function(area){const allowed=["mind","body","people","spirituality","hobbies","money"];if(!allowed.includes(area))return "";return view(area,true)};
window.lifeMapView=view;
window.lifeMapSetFloor=function(floor){
 if(!floorNames.includes(floor))return;
 try{localStorage.setItem("dailyLifeMapFirstFloor",floor)}catch(_){}
 if(typeof render==="function")render();
};
})();