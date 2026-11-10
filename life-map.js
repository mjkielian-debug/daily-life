(function(){
"use strict";
const h=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const day=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
const list=value=>Array.isArray(value)?value:[];
const floorNames=["Basement","First floor","Second floor","Third floor"];
function selectedFloor(){try{const value=localStorage.getItem("dailyLifeMapFirstFloor");return floorNames.includes(value)?value:"First floor"}catch(_){return "First floor"}}
function jump(view){if(typeof setView==="function")setView(view)}
function region(name,detail,icon,fill,view){
 const pct=Math.max(0,Math.min(100,Number(fill)||0));
 return '<button class="lm-region lm-region-'+h(name.toLowerCase().replace(/[^a-z0-9]+/g,"-"))+'" type="button" onclick="setView(\''+h(view)+'\')">'+
 '<span class="lm-region-icon" aria-hidden="true">'+icon+'</span><span class="lm-region-copy"><b>'+h(name)+'</b><small>'+h(detail)+'</small></span>'+
 '<span class="lm-region-fill" aria-hidden="true"><i style="width:'+pct+'%"></i></span></button>';
}
function view(){
 const date=day(),profile=(state&&state.profile)||{},name=String(profile.name||"").trim().split(/\s+/)[0]||"Your";
 const tasks=list(state&&state.tasks).filter(t=>String(t.date||"")===date&&!t.paused&&!t.duplicateHidden&&!t.waitingForFunds);
 const completed=tasks.filter(t=>t.done).length,open=tasks.filter(t=>!t.done);
 const careHabits=typeof selfCareHabits==="function"?selfCareHabits():[];
 const careDone=careHabits.filter(x=>typeof selfCareDone==="function"&&selfCareDone(x.key,date)).length;
 const carePct=careHabits.length?Math.round(careDone/careHabits.length*100):0;
 const taskPct=tasks.length?Math.round(completed/tasks.length*100):0;
 const terms={
  mind:/mind|mental|journal|therapy|read|rest|breath|quiet|meditat/i,
  body:/water|tooth|teeth|brush|shower|hair|vitamin|medicine|stretch|workout|exercise|sleep|skin/i,
  people:/dolly|leo|demitri|dimitri|ambrose|tanner|relationship|family|together|read with/i,
  home:/home|house|room|kitchen|bathroom|laundry|dish|trash|declutter|organize|clean/i,
  spirituality:/spiritual|tarot|ritual|meditat|affirmation/i,
  hobbies:/hobby|craft|garden|plant care|project|yoga/i,
  money:/money|budget|bill|bank|account|paycheck|finance|rent|electric/i
 };
 const matches=Object.fromEntries(Object.entries(terms).map(([key,re])=>[key,tasks.filter(t=>re.test(String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"")))]));
 const pctFor=key=>matches[key].length?Math.round(matches[key].filter(t=>t.done).length/matches[key].length*100):0;
 const taskRow=t=>'<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="toggleTask(\''+h(t.id)+'\',this.checked)"><span><b>'+h(t.title||"Task")+'</b>'+(t.child?'<small>'+h(t.child)+'</small>':"")+'</span></label>';
 const careRows=careHabits.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
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
 const clothingRows=clothingOwners.map(owner=>{
  const items=clothing.filter(item=>String(item.inventoryOwner||item.wardrobeOwner||"").trim()===owner);
  const qty=items.reduce((n,item)=>n+Math.max(0,Number(item.quantity??1)||0),0);
  return '<button type="button" onclick="setView(\'inventory\')"><b>'+h(owner)+'</b><span>'+qty+' saved clothing item'+(qty===1?"":"s")+'</span><small>'+h(items.slice(0,3).map(item=>item.name).join(" · "))+(items.length>3?" · +"+(items.length-3)+" more":"")+'</small></button>';
 }).join("");
 const floor=selectedFloor();
 const map=typeof houseVisualMapHtml==="function"?houseVisualMapHtml(floor):'<p class="lm-muted">The saved house map is loading.</p>';
 const floors=floorNames.map(f=>'<button type="button" class="lm-floor '+(f===floor?"selected":"")+'" aria-pressed="'+(f===floor?"true":"false")+'" onclick="lifeMapSetFloor(\''+f+'\')">'+h(f==="Third floor"?"Attic":f)+'</button>').join("");
 const taskContent=tasks.length?'<div class="lm-list">'+open.map(taskRow).join("")+'</div><details class="lm-completed"><summary>Completed today · '+completed+'</summary><div class="lm-list">'+tasks.filter(t=>t.done).map(taskRow).join("")+'</div></details>':'<p class="lm-muted">No date-specific tasks are on today’s list.</p>';
 return '<section class="life-map-page">'+
 '<header class="lm-welcome"><div><span class="lm-kicker">YOUR LIFE MAP</span><h1>Hi, '+h(name)+'.</h1><p>Your life is made of lots of little things. Each one counts.</p></div><div class="lm-today-progress" aria-label="Today plan '+completed+' of '+tasks.length+' complete"><span>Today’s plan</span><b>'+completed+' <small>of '+tasks.length+'</small></b><i><em style="width:'+taskPct+'%"></em></i></div></header>'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><span class="lm-kicker">LIFE IN PROGRESS</span><h2>Different parts of your life, together</h2><p>Color fills as linked tasks get done. It’s a picture of activity, not a grade.</p></div></div>'+
 '<div class="lm-scene-grid"><div class="lm-avatar-wrap"><svg class="lm-avatar" viewBox="0 0 220 300" role="img" aria-label="A friendly person illustration with mind, body, relationships, and home progress areas">'+
 '<defs><clipPath id="lmHeadClip"><circle cx="110" cy="62" r="40"/></clipPath><clipPath id="lmTorsoClip"><path d="M67 115 Q110 96 153 115 L168 232 Q110 252 52 232Z"/></clipPath><clipPath id="lmLeftClip"><path d="M68 119 Q48 127 42 187 L56 190 Q68 154 85 143Z"/></clipPath><clipPath id="lmRightClip"><path d="M152 119 Q172 127 178 187 L164 190 Q152 154 135 143Z"/></clipPath><clipPath id="lmLegClip"><path d="M59 229 Q110 246 161 229 L150 292 L119 292 L109 250 L99 292 L68 292Z"/></clipPath></defs>'+
 '<circle cx="110" cy="62" r="40" fill="#f8e8ef" stroke="#64445a" stroke-width="4"/>'+
 '<path d="M73 51 Q84 19 119 24 Q146 29 150 51 Q132 40 112 44 Q92 48 73 51Z" fill="#71504b"/>'+
 '<circle cx="96" cy="65" r="3" fill="#392f38"/><circle cx="124" cy="65" r="3" fill="#392f38"/><path d="M99 81 Q110 88 121 81" fill="none" stroke="#9d536d" stroke-width="3" stroke-linecap="round"/>'+
 '<path d="M67 115 Q110 96 153 115 L168 232 Q110 252 52 232Z" fill="#f8e8ef" stroke="#64445a" stroke-width="4"/>'+
 '<path d="M68 119 Q48 127 42 187 L56 190 Q68 154 85 143Z" fill="#f8e8ef" stroke="#64445a" stroke-width="4"/><path d="M152 119 Q172 127 178 187 L164 190 Q152 154 135 143Z" fill="#f8e8ef" stroke="#64445a" stroke-width="4"/>'+
 '<path d="M59 229 Q110 246 161 229 L150 292 L119 292 L109 250 L99 292 L68 292Z" fill="#f8e8ef" stroke="#64445a" stroke-width="4"/>'+
 '<g clip-path="url(#lmHeadClip)"><rect x="70" y="'+(102-80*pctFor("mind")/100)+'" width="80" height="'+(80*pctFor("mind")/100)+'" fill="#c89ad7"/></g>'+
 '<g clip-path="url(#lmTorsoClip)"><rect x="45" y="'+(245-130*pctFor("body")/100)+'" width="130" height="'+(130*pctFor("body")/100)+'" fill="#f2ae85"/></g>'+
 '<g clip-path="url(#lmLeftClip)"><rect x="40" y="'+(195-75*pctFor("people")/100)+'" width="50" height="'+(75*pctFor("people")/100)+'" fill="#e98cb0"/></g><g clip-path="url(#lmRightClip)"><rect x="130" y="'+(195-75*pctFor("people")/100)+'" width="55" height="'+(75*pctFor("people")/100)+'" fill="#e98cb0"/></g>'+
 '<g clip-path="url(#lmLegClip)"><rect x="50" y="'+(300-90*pctFor("home")/100)+'" width="120" height="'+(90*pctFor("home")/100)+'" fill="#8fc7b2"/></g>'+
 '<path d="M94 137 Q110 151 126 137" fill="none" stroke="#64445a" stroke-width="3" stroke-linecap="round"/></svg>'+
 '<p class="lm-avatar-caption">A little picture of a life being cared for</p></div>'+
 '<div class="lm-regions">'+region("Mind & self-care",careDone+" of "+careHabits.length+" care habits today","✿",carePct,"selfcare")+
 region("Body & health",matches.body.filter(t=>t.done).length+" of "+matches.body.length+" linked tasks today","♡",pctFor("body"),"log")+
 region("Relationships",matches.people.filter(t=>t.done).length+" of "+matches.people.length+" linked tasks today","♥",pctFor("people"),"family")+
 region("Home & routines",matches.home.filter(t=>t.done).length+" of "+matches.home.length+" linked tasks today","⌂",pctFor("home"),"household")+
 region("Spirituality",matches.spirituality.filter(t=>t.done).length+" of "+matches.spirituality.length+" linked actions today","☾",pctFor("spirituality"),"spirituality")+
 region("Hobbies & projects",matches.hobbies.filter(t=>t.done).length+" of "+matches.hobbies.length+" linked actions today","✿",pctFor("hobbies"),"gardenhobbies")+
 region("Money & planning",matches.money.filter(t=>t.done).length+" of "+matches.money.length+" linked actions today","✧",pctFor("money"),"more")+
 '<p class="lm-footnote">A part stays softly colored when no matching tasks are linked yet. The food, sleep, care, family, and inventory records remain in their existing trackers.</p></div></div></section>'+
 '<section class="lm-lower-grid"><section class="lm-panel"><div class="lm-panel-heading"><div><span class="lm-kicker">TODAY</span><h2>Small steps</h2></div><button type="button" class="lm-text-button" onclick="setView(\'today\')">Full Day Flow ›</button></div>'+taskContent+
 '<details class="lm-care"><summary>Care habits today · '+careDone+' of '+careHabits.length+'</summary><div class="lm-list">'+careRows+'</div></details></section>'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div></section></section>'+
 '<section class="lm-trackers"><div class="lm-tracker-title"><span class="lm-kicker">YOUR TRACKING STAYS HERE</span><h2>All the pieces you already log</h2></div>'+
 '<button type="button" onclick="setView(\'home\')"><span>🥣</span><b>Food</b><small>'+foodCount+' entries today</small></button><button type="button" onclick="setView(\'log\')"><span>☾</span><b>Sleep</b><small>'+(sleepCount?"Logged today":"Open sleep tracking")+'</small></button><button type="button" onclick="setView(\'selfcare\')"><span>💧</span><b>Water</b><small>'+waterCount+' logs today</small></button><button type="button" onclick="setView(\'family\')"><span>♡</span><b>Family</b><small>Time, people & birthdays</small></button><button type="button" onclick="setView(\'inventory\')"><span>▤</span><b>Inventory</b><small>'+itemCount+' saved item records</small></button><button type="button" onclick="setView(\'spirituality\')"><span>☾</span><b>Spirituality</b><small>Readings & rituals</small></button><button type="button" onclick="setView(\'gardenhobbies\')"><span>✿</span><b>Hobbies</b><small>Plants & projects</small></button><button type="button" onclick="setView(\'more\')"><span>✧</span><b>Money</b><small>Bills & plans</small></button></section>'+
 (clothingOwners.length?'<section class="lm-wardrobes"><div><span class="lm-kicker">CLOTHING ON FILE</span><h2>Inventory by person</h2><p>These are saved item counts, not a judgment about what anyone needs.</p></div><div>'+clothingRows+'</div></section>':'<section class="lm-wardrobes lm-wardrobes-empty"><div><span class="lm-kicker">CLOTHING INVENTORY</span><h2>Keep each person’s items together</h2><p>No clothing records with a person assigned are saved yet. Existing inventory is untouched.</p><button type="button" onclick="setView(\'inventory\')">Open inventory ›</button></div></section>')+
 '<p class="lm-disclaimer">This first pass reads your existing records. It does not move, delete, or rewrite your data. Avatar fill currently uses date-specific tasks and self-care logs; spirituality, hobbies, and money each link to their existing trackers.</p></section>';
}
window.lifeMapView=view;
window.lifeMapSetFloor=function(floor){
 if(!floorNames.includes(floor))return;
 try{localStorage.setItem("dailyLifeMapFirstFloor",floor)}catch(_){}
 if(typeof render==="function")render();
};
})();