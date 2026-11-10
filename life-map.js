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
function avatarMark(label,icon,target,x,y,pct,color){
 const alpha=(0.2+Math.max(0,Math.min(100,Number(pct)||0)/125)).toFixed(2);
 return '<a class="lm-avatar-mark" href="#" aria-label="'+h(label)+'" title="'+h(label)+'" onclick="setView(&quot;'+h(target)+'&quot;);return false">'+
 '<circle cx="'+x+'" cy="'+y+'" r="14" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>'+
 '<circle cx="'+x+'" cy="'+y+'" r="10" fill="'+color+'" fill-opacity="'+alpha+'"/>'+
 '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="12" font-weight="900" fill="#48394d">'+icon+'</text></a>';
}
function view(){
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
  people:/dolly|leo|demitri|dimitri|ambrose|tanner|relationship|family|together|read with/i,
  home:/home|house|room|kitchen|bathroom|laundry|dish|trash|declutter|organize|clean/i,
  spirituality:/spiritual|tarot|ritual|meditat|affirmation/i,
  hobbies:/hobby|craft|garden|plant care|project|yoga/i,
  money:/money|budget|bill|bank|account|paycheck|finance|rent|electric/i
 };
 const matches=Object.fromEntries(Object.entries(terms).map(([key,re])=>[key,tasks.filter(t=>re.test(String(t.title||"")+" "+String(t.category||"")+" "+String(t.child||"")))]));
 const pctFor=key=>matches[key].length?Math.round(matches[key].filter(t=>t.done).length/matches[key].length*100):0;
 const avatarMarks=[
  avatarMark("Mind and self-care","✿","selfcare",81,56,carePct,"#c89ad7"),
  avatarMark("Spirituality","☾","spirituality",141,42,pctFor("spirituality"),"#f2b85b"),
  avatarMark("Body and health","♡","log",110,133,pctFor("body"),"#f2ae85"),
  avatarMark("Relationships","♥","family",78,168,pctFor("people"),"#e98cb0"),
  avatarMark("Hobbies and projects","✎","gardenhobbies",166,166,pctFor("hobbies"),"#82c6a4"),
  avatarMark("Money and planning","✧","more",112,266,pctFor("money"),"#83b8df")
 ].join("");
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
 const roomProgress=typeof houseVisualRoomProgressHtml==="function"?houseVisualRoomProgressHtml(floor):'<p class="lm-muted">Room history is loading.</p>';
 const floors=floorNames.map(f=>'<button type="button" class="lm-floor '+(f===floor?"selected":"")+'" aria-pressed="'+(f===floor?"true":"false")+'" onclick="lifeMapSetFloor(\''+f+'\')">'+h(f==="Third floor"?"Attic":f)+'</button>').join("");
 const taskContent=tasks.length?'<div class="lm-list">'+open.map(taskRow).join("")+'</div><details class="lm-completed"><summary>Completed today · '+completed+'</summary><div class="lm-list">'+tasks.filter(t=>t.done).map(taskRow).join("")+'</div></details>':'<p class="lm-muted">No date-specific tasks are on today’s list.</p>';
 return '<section class="life-map-page">'+
 '<header class="lm-welcome"><div><span class="lm-kicker">YOUR LIFE MAP</span><h1>Hi, '+h(name)+'.</h1><p>Your life is made of lots of little things. Each one counts.</p></div><div class="lm-today-progress" aria-label="Today plan '+completed+' of '+tasks.length+' complete"><span>Today’s plan</span><b>'+completed+' <small>of '+tasks.length+'</small></b><i><em style="width:'+taskPct+'%"></em></i></div></header>'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><span class="lm-kicker">LIFE IN PROGRESS</span><h2>Different parts of your life, together</h2><p>Color fills as linked tasks get done. It’s a picture of activity, not a grade.</p></div></div>'+
 '<div class="lm-scene-grid"><div class="lm-avatar-wrap"><svg class="lm-avatar" viewBox="0 0 220 300" role="group" aria-label="A friendly avatar with clickable mind, spirituality, health, relationships, hobbies, and money areas">'+
 '<defs><clipPath id="lmMindClip"><path d="M82 44 Q87 25 110 24 Q133 25 138 44 L139 68 Q138 93 110 97 Q82 93 81 68Z"/></clipPath><clipPath id="lmSpiritClip"><path d="M73 62 Q70 25 98 18 Q125 11 145 33 Q153 48 147 62 Q130 39 110 39 Q91 39 73 62Z"/></clipPath><clipPath id="lmTorsoClip"><path d="M80 109 Q110 96 140 109 L145 181 Q110 194 75 181Z"/></clipPath><clipPath id="lmLeftClip"><path d="M81 114 Q66 120 60 143 L53 177 Q54 185 61 187 L76 151 L92 137Z"/></clipPath><clipPath id="lmRightClip"><path d="M139 114 Q154 120 160 143 L167 177 Q166 185 159 187 L144 151 L128 137Z"/></clipPath><clipPath id="lmLegClip"><path d="M76 179 Q110 194 144 179 L137 219 L122 219 L116 203 L110 219 L104 203 L98 219 L83 219Z M88 218 L103 218 L98 292 L69 292Z M117 218 L132 218 L151 292 L122 292Z"/></clipPath></defs>'+
 '<path d="M73 66 Q69 25 98 18 Q125 11 145 33 Q153 48 147 76 L142 103 Q135 96 136 62 Q127 70 124 73 L125 44 Q105 51 87 41 Q87 72 78 103Z" fill="#654746" stroke="#553c3d" stroke-width="2.5" stroke-linejoin="round"/>'+
 '<ellipse cx="110" cy="60" rx="29" ry="35" fill="#f7dfd4" stroke="#64445a" stroke-width="3.5"/>'+
 '<path d="M83 45 Q89 20 111 20 Q133 21 140 45 Q125 36 110 39 Q96 40 83 45Z" fill="#654746"/>'+
 '<path d="M99 61 Q103 58 107 61 M114 61 Q118 58 122 61" fill="none" stroke="#44343b" stroke-width="2.3" stroke-linecap="round"/><circle cx="103" cy="63" r="1.4" fill="#44343b"/><circle cx="118" cy="63" r="1.4" fill="#44343b"/><path d="M103 77 Q110 83 117 77" fill="none" stroke="#a9566b" stroke-width="2.5" stroke-linecap="round"/>'+
 '<path d="M101 91 L101 109 L119 109 L119 91Z" fill="#f7dfd4"/>'+
 '<path d="M80 111 Q110 97 140 111 L145 181 Q110 194 75 181Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M81 115 Q66 120 60 143 L53 177 Q54 185 61 187 L76 151 L92 137Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/><path d="M139 115 Q154 120 160 143 L167 177 Q166 185 159 187 L144 151 L128 137Z" fill="#f4d7e2" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/>'+
 '<path d="M76 179 Q110 194 144 179 L137 219 L122 219 L116 203 L110 219 L104 203 L98 219 L83 219Z" fill="#df9fbb" stroke="#64445a" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<path d="M88 218 L103 218 L98 292 L69 292Z M117 218 L132 218 L151 292 L122 292Z" fill="#f7dfd4" stroke="#64445a" stroke-width="3" stroke-linejoin="round"/>'+
 '<g clip-path="url(#lmMindClip)"><rect x="78" y="'+(98-74*pctFor("mind")/100)+'" width="64" height="'+(74*pctFor("mind")/100)+'" fill="#c89ad7"/></g>'+
 '<g clip-path="url(#lmSpiritClip)"><rect x="72" y="'+(62-44*pctFor("spirituality")/100)+'" width="78" height="'+(44*pctFor("spirituality")/100)+'" fill="#f2b85b"/></g>'+
 '<g clip-path="url(#lmTorsoClip)"><rect x="74" y="'+(194-85*pctFor("body")/100)+'" width="72" height="'+(85*pctFor("body")/100)+'" fill="#f2ae85"/></g>'+
 '<g clip-path="url(#lmLeftClip)"><rect x="52" y="'+(188-45*pctFor("people")/100)+'" width="42" height="'+(45*pctFor("people")/100)+'" fill="#e98cb0"/></g><g clip-path="url(#lmRightClip)"><rect x="126" y="'+(188-45*pctFor("hobbies")/100)+'" width="42" height="'+(45*pctFor("hobbies")/100)+'" fill="#82c6a4"/></g>'+
 '<g clip-path="url(#lmLegClip)"><rect x="68" y="'+(292-94*pctFor("money")/100)+'" width="84" height="'+(94*pctFor("money")/100)+'" fill="#83b8df"/></g>'+
 '<path d="M94 137 Q110 151 126 137" fill="none" stroke="#64445a" stroke-width="3" stroke-linecap="round"/>'+avatarMarks+'</svg>'+
 '<p class="lm-avatar-caption">A little picture of a life being cared for</p></div>'+
 '<div class="lm-regions" aria-label="Avatar areas"><div class="lm-avatar-zones-heading"><span class="lm-kicker">PARTS OF YOU · TAP TO OPEN</span><b>Each area belongs on your avatar</b></div>'+region("Mind & self-care",careDone+" of "+careHabits.length+" care habits today","✿",carePct,"selfcare")+
 region("Body & health",matches.body.filter(t=>t.done).length+" of "+matches.body.length+" linked tasks today","♡",pctFor("body"),"log")+
 region("Relationships",matches.people.filter(t=>t.done).length+" of "+matches.people.length+" linked tasks today","♥",pctFor("people"),"family")+
 region("Spirituality",matches.spirituality.filter(t=>t.done).length+" of "+matches.spirituality.length+" linked actions today","☾",pctFor("spirituality"),"spirituality")+
 region("Hobbies & projects",matches.hobbies.filter(t=>t.done).length+" of "+matches.hobbies.length+" linked actions today","✿",pctFor("hobbies"),"gardenhobbies")+
 region("Money & planning",matches.money.filter(t=>t.done).length+" of "+matches.money.length+" linked actions today","✧",pctFor("money"),"more")+
 '<p class="lm-footnote">A part stays softly colored when no matching tasks are linked yet. The food, sleep, care, family, and inventory records remain in their existing trackers.</p></div></div></section>'+
 '<section class="lm-lower-grid"><section class="lm-panel"><div class="lm-panel-heading"><div><span class="lm-kicker">TODAY</span><h2>Small steps</h2></div><button type="button" class="lm-text-button" onclick="setView(\'today\')">Full Day Flow ›</button></div>'+taskContent+
 '<details class="lm-care"><summary>Care habits today · '+careDone+' of '+careHabits.length+'</summary><div class="lm-list">'+careRows+'</div></details></section>'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><span class="lm-kicker">YOUR HOME</span><h2>House map</h2></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor and tap a room to see its existing tasks and inventory.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div><div class="lm-room-progress">'+roomProgress+'</div></section></section>'+
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