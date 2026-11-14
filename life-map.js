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
function avatarMark(label,icon,x,y,pct,color,area,pending){
 const alpha=(0.2+Math.max(0,Math.min(100,Number(pct)||0)/125)).toFixed(2);
 const count=Math.max(0,Number(pending)||0),accessibleLabel=label+", "+Math.max(0,Math.min(100,Math.round(Number(pct)||0)))+"% complete"+(count?", "+count+" actions left today":"");
 return `<g class="lm-avatar-mark" role="button" tabindex="0" aria-label="${h(accessibleLabel)}" title="${h(accessibleLabel)}" data-life-area="${h(area)}">`+
 '<circle cx="'+x+'" cy="'+y+'" r="21" fill="#fff" stroke="'+color+'" stroke-width="2.5"/>'+
 '<circle cx="'+x+'" cy="'+y+'" r="16" fill="'+color+'" fill-opacity="'+alpha+'"/>'+
 '<text x="'+x+'" y="'+(y-1)+'" text-anchor="middle" font-size="13" font-weight="900" fill="#48394d">'+icon+'</text>'+
 '<text x="'+x+'" y="'+(y+12)+'" text-anchor="middle" font-size="7" font-weight="900" fill="#48394d">'+Math.max(0,Math.min(100,Math.round(Number(pct)||0)))+'% today'+'</text>'+
 (count?'<g class="lm-avatar-review-count" aria-hidden="true"><circle cx="'+(x+15)+'" cy="'+(y-15)+'" r="10" fill="#a9648d" stroke="#fff" stroke-width="2"/><text x="'+(x+15)+'" y="'+(y-11.5)+'" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">'+count+'</text></g>':"")+'</g>';
}
function avatarAreaFill(area,path,cx,cy,maxRadius,pct){
 const progress=Math.max(0,Math.min(100,Number(pct)||0));
 if(!progress)return "";
 const regionId="lmAvatarRegion-"+area,progressId="lmAvatarProgress-"+area;
 const radius=(maxRadius*Math.sqrt(progress/100)).toFixed(2);
 return '<clipPath id="'+regionId+'"><path d="'+path+'"/></clipPath>'+ '<clipPath id="'+progressId+'"><circle class="lm-avatar-progress-circle" cx="'+cx+'" cy="'+cy+'" r="'+radius+'"/></clipPath>';
}
function avatarAreaLayer(area,path,cx,cy,maxRadius,pct){
 const progress=Math.max(0,Math.min(100,Number(pct)||0));
 if(!progress)return "";
 return '<g clip-path="url(#lmAvatarRegion-'+area+')"><g clip-path="url(#lmAvatarProgress-'+area+')">'+
  '<image href="assets/michelle-ssd-avatar.webp?v=20261113-area-fill1" x="22" y="0" width="176" height="510" preserveAspectRatio="none" pointer-events="none" aria-hidden="true"/>'+
  '</g></g>';
}
function lifeMapAreaForTask(task){
 const title=String(task&&task.title||"").toLowerCase();
 const category=String(task&&task.category||"").toLowerCase();
 const text=title+" "+category;
 const child=String(task&&task.child||"").trim();
 // Respect explicit category labels, but keep room-linked chores inside Home.
 const categoryAreas={
  household:"home",cleaning:"home",inventory:"home",house:"home",
  people:"people",family:"people",kids:"people",school:"people",pets:"people",childcare:"people",
  housing:"money",financial:"money",finances:"money",budget:"money",
  plants:"hobbies",garden:"hobbies",reading:"hobbies",library:"hobbies",crafts:"hobbies",
  health:"body",wellness:"body",fitness:"body",selfcare:"body",
  work:"work",career:"work",ups:"work",
  transport:"car",vehicle:"car",driving:"car",auto:"car",
  hobbies:"hobbies",spirituality:"spirituality",mind:"mind",money:"money",car:"car",body:"body",home:"home"
 };
 // Household work belongs to the house map even when a child is responsible for it.
 if(category==="home"||category==="household"||category==="cleaning"||task&&(task.homeMapFloor||task.homeMapZoneId||task.homeRoomId||task.roomId)||/\b(housework|household|chores?|room reset|room cleanup|clean room|cleaning|dishes|dishwashing|laundry|counters?|countertops?|floors?|vacuum|mop|sweep|litter box|trash|garbage|declutter|organize|tidy up|house reset|kitchen|bathroom|playroom|living room|bedroom)\b/i.test(title))return "home";
 if(child&&/water|tooth|teeth|brush|shower|hair|vitamin|medicine|dental|dentist|dentistry|medical|stretch|workout|exercise|sleep|skin/i.test(text))return "people";
 if(category==="library"&&child)return "people";
 if(categoryAreas[category])return categoryAreas[category];
 if(/mind|mental|journal|therapy|rest|breath|quiet/i.test(text)||category==="mind"||category==="self-care")return "mind";
 if(/water|tooth|teeth|brush|shower|hair|vitamin|medicine|dental|dentist|dentistry|medical|stretch|workout|exercise|sleep|skin/i.test(text)||category==="body"||category==="health")return "body";
 if(/spiritual|tarot|ritual|meditat|affirmation/i.test(text)||category==="spirituality")return "spirituality";
 if(/hobby|craft|garden|plant care|project|yoga/i.test(text)||category==="hobbies")return "hobbies";
 if(/wells\s*fargo|money|budget|bill|bank|account|finance|rent|electric|paycheck|credit card|loan|savings/i.test(text)||category==="money")return "money";
 if(category==="car"||/\bcar\b|vehicle|volvo|\bkeys?\b|lock|tire|fuel|oil|driving|driver/i.test(text))return "car";
 if(category==="work"||/\bwork\b|ups|shift|route|preload|delivery|deliver|clock.?in/i.test(text))return "work";
 if(/homework|backpack|school|pediatric|consent|kids?|children|family|relationship|read with|time with|spend time|play with|connect with|hang out with|check.?in with|date night/i.test(text))return "people";
 if(category==="people"||category==="family"||category==="kids"||child)return "people";
 return "";
}
window.lifeMapTaskArea=lifeMapAreaForTask;
function lifeMapAreaForHabitArea(area){
 const map={health:"body",food:"body",family:"people",pets:"people",home:"home",spirituality:"spirituality",growth:"hobbies",reading:"hobbies",money:"money",car:"car",work:"work",other:"mind"};
 return map[String(area||"").toLowerCase()]||"";
}
function lifeMapAreaForReview(item){
 if(!item)return "";
 if(item.kind==="task"){
  const task=list(state&&state.tasks).find(x=>String(x.id)===String(item.key));
  if(task)return lifeMapAreaForTask(task);
 }
 if(item.kind==="chore")return "home";
 if(item.kind==="routine")return "people";
 return lifeMapAreaForTask({title:item.label||"",category:item.group||""});
}

// Starter suggestions are *not* counted as chores or progress until added.
// They give each category useful next steps without inventing dates or completions.
const lifeMapTaskIdeas={
 home:[["Reset one kitchen counter","home"],["Put away one load of laundry","home"]],
 mind:[["Learn one useful parenting or psychology skill","mind"],["Make time for a short rest break","mind"]],
 body:[["Refill my water bottle before leaving work","body"],["Check whether I took my vitamins","body"]],
 people:[["Review school papers when the kids are home","family"],["Read with the kids for 20 minutes","family"]],
 spirituality:[["Explore today's seasonal spiritual lesson","spirituality"],["Choose one Yule tradition to try with the kids","spirituality"]],
 hobbies:[["Practice Spanish for 15 minutes","hobbies"],["Crochet for 15 minutes","hobbies"]],
 money:[["Review upcoming bills and due dates","money"],["Check savings progress toward buying a home","money"]],
 car:[["Check on the Volvo oil change","car"],["Check tire pressure","car"]],
 work:[["Record my UPS hours and SSD delivery mileage","work"],["Confirm next week's UPS start times","work"]]
};
const taskIdeaKey=title=>String(title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
window.lifeMapAddTaskIdea=async function(area,index){
 const ideas=lifeMapTaskIdeas[area]||[],idea=ideas[Number(index)];
 if(!idea||!state||!Array.isArray(state.tasks))return;
 const found=state.tasks.find(t=>taskIdeaKey(t.title)===taskIdeaKey(idea[0])&&!t.retiredAt);
 if(found){if(typeof openTask==="function")openTask("",found.id);return}
 if(typeof uid!=="function"||typeof save!=="function")return;
 state.tasks.push({id:uid(),title:idea[0],category:idea[1],date:"",child:"",done:false,notes:"Optional task added from "+area+" category",order:100});
 await save();
 if(typeof render==="function")render();
};
window.lifeMapOpenAreaTask=function(area){
 if(!lifeMapTaskIdeas[area]||typeof openTask!=="function")return;
 openTask("", "",false,null,area);
};
function lifeMapTaskIdeasHtml(area){
 const ideas=lifeMapTaskIdeas[area]||[],existing=new Set(list(state&&state.tasks).filter(t=>!t.retiredAt).map(t=>taskIdeaKey(t.title)));
 const available=ideas.map((item,i)=>({item,i})).filter(({item})=>!existing.has(taskIdeaKey(item[0])));
 if(!available.length)return "";
 return '<section class="lm-area-ideas" aria-label="Suggested tasks"><div class="lm-area-section-heading"><b>More ideas for this category</b><small>Optional · not on your list until added</small></div>'+
  available.map(({item,i})=>'<div class="lm-area-idea"><span>✦ <b>'+h(item[0])+'</b></span><button type="button" onclick="lifeMapAddTaskIdea(&#39;'+h(area)+'&#39;,'+i+')">＋ Add</button></div>').join("")+'</section>';
}

function lifeMapNormalizeTaskTitle(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
window.lifeMapTaskLastDoneLabel=function(task){
 if(!task)return "";
 const title=lifeMapNormalizeTaskTitle(task.title||task.chore),child=String(task.child||"").trim().toLowerCase();
 if(!title)return "";
 const valid=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date||""));
 const asOf=valid(task.date)?String(task.date):day();
 const doneRows=(task._lifeChore?list(state&&state.chores):list(state&&state.tasks)).filter(row=>{
  const rowTitle=lifeMapNormalizeTaskTitle(row.title||row.chore);
  return row.done&&rowTitle===title&&String(row.child||"").trim().toLowerCase()===child&&valid(row.date)&&String(row.date)<asOf;
 }).map(row=>String(row.date));
 const currentDone=task.done&&valid(task.date)?[String(task.date)]:[];
 const homeRows=task._lifeChore?[]:list(state&&state.homeLogs).filter(row=>
  row.status==="done"&&lifeMapNormalizeTaskTitle(row.task)===title&&valid(row.date)&&String(row.date)<=asOf
 ).map(row=>String(row.date));
 const priorHomeRows=homeRows.filter(date=>date<asOf);
 const rules=list(state&&state.settings&&state.settings.recurringTasks);
 const configured=rules.some(rule=>rule&&rule.active!==false&&lifeMapNormalizeTaskTitle(rule.title)===title);
 const generated=String(task.generated||"");
 const recurring=!!task.dailyReset||task.repeating===true||task.recurring===true||
  /recurring|daily-basics|rotation/.test(generated)||configured||doneRows.length>0||priorHomeRows.length>0;
 if(!recurring)return "";
 const lastRows=[...doneRows,...homeRows,...currentDone].sort(),last=lastRows[lastRows.length-1];
 if(!last)return "not yet logged";
 return new Date(last+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
};
let reviewSkipDate="",reviewSkipKeys=new Set();
window.lifeMapSkipReview=function(area,key,date){
 const current=String(date||day());
 if(reviewSkipDate!==current){reviewSkipDate=current;reviewSkipKeys=new Set()}
 reviewSkipKeys.add(String(area)+"|"+String(key));
 if(typeof render==="function")render();
};
window.lifeMapShowSkippedReviews=function(area,date){
 const current=String(date||day());
 if(reviewSkipDate!==current){reviewSkipDate=current;reviewSkipKeys=new Set()}
 const prefix=String(area)+"|";
 reviewSkipKeys=new Set([...reviewSkipKeys].filter(key=>!key.startsWith(prefix)));
 if(typeof render==="function")render();
};
window.lifeMapIsReviewSkipped=function(area,key,date){
 return reviewSkipDate===String(date||day())&&reviewSkipKeys.has(String(area)+"|"+String(key));
};
window.lifeMapAnswerReview=async function(kind,key,date,status){
 if(typeof applyDailyReview==="function")await applyDailyReview(kind,key,date,status,false);
};
function lifeMapReviewPanel(area,date){
 if(!area||typeof dailyReviewExpected!=="function")return "";
 const all=dailyReviewExpected(date).filter(item=>lifeMapAreaForReview(item)===area&&item.status==="unknown");
 if(!all.length)return "";
 if(reviewSkipDate!==date){reviewSkipDate=date;reviewSkipKeys=new Set()}
 const item=all.find(row=>!reviewSkipKeys.has(String(area)+"|"+String(row.key)));
 const reviewTask=item.kind==="task"?list(state&&state.tasks).find(row=>String(row.id)===String(item.key)):item.kind==="chore"?list(state&&state.chores).find(row=>String(row.id)===String(item.key)):null;
 const itemLastDone=typeof window.lifeMapTaskLastDoneLabel==="function"?window.lifeMapTaskLastDoneLabel(reviewTask):"";
 let content="";
 if(item){
  content='<div class="lm-review-item"><div class="lm-review-group">'+h(item.group||"Today")+'</div><h3>'+h(item.label||"Check-in")+'</h3>'+
   (item.detail?'<p>'+h(item.detail)+'</p>':'')+(itemLastDone?'<small class="lm-task-last-done">Last done · '+h(itemLastDone)+'</small>':'')+'</div>'+
   '<div class="lm-review-actions">'+
   '<button class="lm-review-yes" type="button" data-life-review-action="answer" data-kind="'+h(item.kind)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'" data-status="yes">✓ Yes</button>'+
   '<button class="lm-review-no" type="button" data-life-review-action="answer" data-kind="'+h(item.kind)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'" data-status="no">✕ No</button>'+
   '<button class="lm-review-na" type="button" data-life-review-action="answer" data-kind="'+h(item.kind)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'" data-status="na">— N/A</button>'+
   '<button class="lm-review-skip" type="button" data-life-review-action="skip" data-area="'+h(area)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'">Skip for now ›</button></div>';
 }else{
  content='<div class="lm-review-item"><h3>That’s all for now</h3><p>'+all.length+' skipped item'+(all.length===1?"":"s")+' remain unknown.</p></div>'+
   '<button type="button" class="lm-review-show-skipped" data-life-review-action="show-skipped" data-area="'+h(area)+'" data-date="'+h(date)+'">Show skipped</button>';
 }
 const backlog=typeof dailyReviewBacklog==="function"?dailyReviewBacklog(7):[];
 const older=backlog.filter(row=>row.date!==date).reduce((n,row)=>n+Number(row.unknown||0),0);
 return '<section class="lm-review-queue" aria-label="Daily check-in"><div class="lm-review-heading"><span>DAILY CHECK-IN</span><b>'+all.length+' still unknown</b></div>'+
  content+(older?'<button class="lm-review-older" type="button" onclick="openDailyReviewCatchup(7)">Earlier check-ins · '+older+' unknown ›</button>':"")+'</section>';
}
document.addEventListener("click",function(event){
 const button=event.target&&event.target.closest?event.target.closest("[data-life-review-action]"):null;
 if(!button)return;
 const action=button.getAttribute("data-life-review-action");
 if(action==="answer")window.lifeMapAnswerReview(button.dataset.kind,button.dataset.key,button.dataset.date,button.dataset.status);
 else if(action==="skip")window.lifeMapSkipReview(button.dataset.area,button.dataset.key,button.dataset.date);
 else if(action==="show-skipped")window.lifeMapShowSkippedReviews(button.dataset.area,button.dataset.date);
});
function lifeMapUniqueTasks(rows){
 const output=[],groups=new Map();
 for(const task of list(rows)){
  const id=String(task&&task.id||"");
  const title=String(task&&task.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const date=String(task&&task.date||"");
  if(!id||!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)){output.push(task);continue}
  const child=String(task&&task.child||"").trim().toLowerCase();
  const slot=["time","startTime","dueTime","occurrence","slot","repeatSlot"].map(k=>String(task&&task[k]||"").trim().toLowerCase()).join("|");
  const groupKey=[date,title,child,slot].join("|");
  if(!groups.has(groupKey)){groups.set(groupKey,{index:output.length,items:[]});output.push(null)}
  groups.get(groupKey).items.push(task);
 }
 for(const group of groups.values()){
  const winner=group.items.slice().sort((a,b)=>Number(lifeMapAreaForTask(b)==="home")-Number(lifeMapAreaForTask(a)==="home")||Number(!!b.done)-Number(!!a.done))[0];
  output[group.index]=Object.assign({},winner,{
   done:group.items.some(t=>!!t.done),
   completedAt:group.items.find(t=>t&&t.done&&t.completedAt)?.completedAt||winner.completedAt||"",
   _lifeMapDuplicateIds:group.items.map(t=>String(t.id)).filter(Boolean)
  });
 }
 return output.filter(Boolean);
}
window.lifeMapUniqueTasks=lifeMapUniqueTasks;
window.lifeMapToggleTaskGroup=async function(encodedIds,done){
 let ids=[];
 try{ids=JSON.parse(decodeURIComponent(String(encodedIds||"")))}catch(_){return}
 for(const id of Array.isArray(ids)?ids:[])await toggleTask(id,!!done);
};
function avatarHotspot(area,label,path){
 return `<path class="lm-avatar-hotspot" d="${path}" fill="transparent" stroke="transparent" stroke-width="12" stroke-linejoin="round" pointer-events="all" role="button" tabindex="0" aria-label="Open ${h(label)}" data-life-area="${h(area)}"/>`;
}

const lifeMapPages={map:"lifemap",today:"today",flow:"itinerary",people:"family",reading:"reading",food:"home",house:"household",money:"more",care:"selfcare",spirituality:"spirituality",hobbies:"gardenhobbies",vault:"vault",settings:"settings",inventory:"inventory",budget:"budget"};
const lifeMapDoors={
 home:[["⌂","House map","house"],["✦","Today","today"],["🍲","Meals & pantry","food"],["▦","Inventory","inventory"],["📖","Reading","reading"],["✿","Garden & hobbies","hobbies"],["▣","Private vault","vault"]],
 mind:[["✦","Today","today"],["◷","Day Flow","flow"],["♡","Self-care","care"],["📖","Reading","reading"],["⚙","Settings","settings"]],
 body:[["♡","Health & care","care"],["✦","Today","today"],["◷","Day Flow","flow"],["🍲","Food & meals","food"]],
 people:[["♥","People & kids","people"],["✉","Texts","texts"],["📖","Reading","reading"],["◷","Family schedule","flow"],["✦","Today","today"]],
 spirituality:[["✧","Spirituality","spirituality"],["📖","Reading","reading"],["◷","Day Flow","flow"]],
 hobbies:[["✿","Garden & hobbies","hobbies"],["📖","Reading","reading"],["✦","Today","today"],["⌂","House projects","house"]],
 money:[["$","Money & bills","money"],["◫","Budget","budget"],["▣","Private vault","vault"],["⚙","Settings","settings"]],
 car:[["◷","Day Flow","flow"],["✦","Today","today"],["♥","People","people"]],
 work:[["◷","Work schedule","flow"],["✦","Today","today"],["$","Money","money"]]
};
window.lifeMapNavigate=function(key){
 if(key==="capture"){if(typeof openLifeCapture==="function")openLifeCapture();return}
 if(key==="search"){if(typeof openLifeSearch==="function")openLifeSearch();return}
 if(key==="version"){if(typeof openAppUpdateTools==="function")openAppUpdateTools();return}
 if(key==="texts"){if(typeof openTextInbox==="function")openTextInbox();return}
 if(lifeMapPages[key]&&typeof setView==="function")setView(lifeMapPages[key]);
};
function lifeMapDoorwaysHtml(area,compact){
 const entries=lifeMapDoors[area]||lifeMapDoors.home;
 const all=entries.concat([["＋","Quick capture","capture"],["⌕","Search everything","search"],["⚙","Settings","settings"],["↻","Check app version","version"]].filter(row=>!entries.some(x=>x[2]===row[2])));
 const links=all.map(([icon,label,key])=>'<button type="button" class="lm-doorway" onclick="lifeMapNavigate(&#39;'+key+'&#39;)"><span aria-hidden="true">'+icon+'</span>'+h(label)+'</button>').join("");
 return compact?'<details class="lm-house-doors"><summary>Explore more through the house</summary><div class="lm-door-grid">'+links+'</div></details>':'<section class="lm-avatar-doors"><div class="lm-area-section-heading"><b>Explore from here</b><small>Everything in one connected life map</small></div><div class="lm-door-grid">'+links+'</div></section>';
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
 const mindCareHabits=careHabits.filter(x=>["outside","quiet_time","journal","meditate"].includes(String(x.key||"")));
 const bodyCareHabits=careHabits.filter(x=>!["outside","quiet_time","journal","meditate"].includes(String(x.key||"")));
 const careTotal=mindCareHabits.length*progressDates.length;
 const careDone=mindCareHabits.reduce((n,x)=>n+progressDates.filter(d=>typeof selfCareDone==="function"&&selfCareDone(x.key,d)).length,0);
 const mindTodayTasks=tasks.filter(t=>lifeMapAreaForTask(t)==="mind"&&!t._lifeMapEvidence);
 const mindTodayDone=mindCareHabits.filter(x=>typeof selfCareDone==="function"&&selfCareDone(x.key,date)).length+mindTodayTasks.filter(t=>t.done).length;
 const mindTodayTotal=mindCareHabits.length+mindTodayTasks.length;
 const mindRemaining=Math.max(0,mindTodayTotal-mindTodayDone);
 const carePct=mindTodayTotal?Math.round(mindTodayDone/mindTodayTotal*100):0;
 const bodyCareTotal=bodyCareHabits.length*progressDates.length;
 const bodyCareDone=bodyCareHabits.reduce((n,x)=>n+progressDates.filter(d=>typeof selfCareDone==="function"&&selfCareDone(x.key,d)).length,0);
 const bodyCarePct=bodyCareTotal?Math.round(bodyCareDone/bodyCareTotal*100):0;
 const waterGoal=Math.max(1,Number(state?.settings?.waterTarget)||78);
 const waterLogsToday=list(state?.waterLogs).filter(x=>String(x?.date||"")===date&&Number(x?.oz)>0);
 const waterOzToday=waterLogsToday.reduce((sum,x)=>sum+Math.max(0,Number(x?.oz)||0),0);
 const waterHasCheckin=waterLogsToday.length>0;
 const waterPctToday=waterHasCheckin?Math.min(100,Math.round(waterOzToday/waterGoal*100)):null;
 const brushCountRaw=typeof selfCareOccurrencesToday==="function"?selfCareOccurrencesToday("brush"):0;
 const brushCount=Math.max(0,Math.min(2,Number(brushCountRaw)||0));
 const brushHasCheckin=brushCount>0;
 const brushPctToday=brushHasCheckin?Math.round(brushCount/2*100):null;
 const taskPct=tasks.length?Math.round(completed/tasks.length*100):0;
 const areaKeys=["mind","body","people","home","spirituality","hobbies","money","car","work"];
 const matches=Object.fromEntries(areaKeys.map(key=>[key,progressTasks.filter(t=>lifeMapAreaForTask(t)===key)]));
 matches.home=progressDates.flatMap(d=>window.lifeMapHouseholdRows(d));
 const habitDays=list(state&&state.habitLogs).filter(log=>log&&progressDates.includes(String(log.localDate||""))&&["done","partial"].includes(String(log.status||"")));
 for(const log of habitDays){
  const habit=list(state&&state.habits).find(item=>String(item.id)===String(log.habitId));
  if(!habit||habit.status==="paused"||habit.status==="archived")continue;
  const area=lifeMapAreaForHabitArea(habit.area);
  if(!areaKeys.includes(area))continue;
  matches[area].push({date:String(log.localDate),title:String(habit.name||"Habit practiced"),category:"habit",done:true,_lifeMapEvidence:true});
 }
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
 const priorityScores=[waterPctToday,brushPctToday].filter(value=>value!==null);
 const priorityHealthPct=priorityScores.length?Math.round(priorityScores.reduce((sum,value)=>sum+value,0)/priorityScores.length):null;
 const bodyProgressPct=Math.max(pctFor("body"),bodyCarePct,priorityHealthPct||0);
 const moneyGoals=list(state&&state.settings&&state.settings.financialRoadmap).filter(g=>g&&Array.isArray(g.steps));
 const moneyGoalSteps=moneyGoals.flatMap(g=>g.steps),moneyGoalDone=moneyGoalSteps.filter(step=>step&&step.done).length,moneyGoalTotal=moneyGoalSteps.length,moneyGoalPct=moneyGoalTotal?Math.round(moneyGoalDone/moneyGoalTotal*100):0;
 const moneyGoalRows=moneyGoals.map(goal=>{const steps=list(goal.steps),done=steps.filter(step=>step&&step.done).length,pct=steps.length?Math.round(done/steps.length*100):0;return '<div class="lm-money-goal"><b>'+h(goal.name||"Money goal")+'</b><small>'+done+" of "+steps.length+" steps · "+pct+"%"+'</small></div>'}).join("");
 const moneyTaskDone=matches.money.filter(t=>t.done).length,moneyProgressTotal=moneyGoalTotal+matches.money.length,moneyProgressDone=moneyGoalDone+moneyTaskDone,moneyFill=moneyProgressTotal?Math.round(moneyProgressDone/moneyProgressTotal*100):0;

 // One daily action source drives both the avatar and the destination lists.
 const dailyAreaRows=Object.fromEntries(areaKeys.map(key=>[key,[]]));
 const addDaily=(area,row)=>{if(dailyAreaRows[area]&&!dailyAreaRows[area].some(x=>x.id===row.id))dailyAreaRows[area].push(row)};
 for(const t of tasks)if(!t._lifeMapEvidence)addDaily(lifeMapAreaForTask(t),{id:"task:"+t.id,kind:"task",key:String(t.id),done:!!t.done,title:t.title,task:t});
 for(const t of window.lifeMapHouseholdRows(date))if(t._lifeChore)addDaily("home",{id:"chore:"+t.id,kind:"chore",key:String(t.id),done:!!t.done,title:t.title,task:t});
 for(const habit of careHabits){const area=mindCareHabits.includes(habit)?"mind":"body";addDaily(area,{id:"care:"+habit.key,kind:"care",key:String(habit.key),title:habit.label||habit.name||habit.key,done:typeof selfCareDone==="function"&&selfCareDone(habit.key,date),habit})}
 for(const item of typeof dailyReviewExpected==="function"?dailyReviewExpected(date):[]){
  const area=lifeMapAreaForReview(item),rows=dailyAreaRows[area];if(!rows)continue;
  const existing=rows.find(x=>x.key===String(item.key));
  if(existing){if(item.status==="na")rows.splice(rows.indexOf(existing),1);continue}
  if(item.status==="na")continue;
  addDaily(area,{id:"review:"+item.kind+":"+item.key,kind:"review",key:String(item.key),title:item.label||"Daily action",done:item.status==="yes",review:item});
 }
 const spiritualLog=typeof spiritualityLogFor==="function"?spiritualityLogFor(date):null;
 addDaily("spirituality",{id:"guided-class",kind:"lesson",title:"Today’s guided spiritual class",done:!!spiritualLog?.guidedPractice});
 const dailyAreaStats=Object.fromEntries(areaKeys.map(area=>{const rows=dailyAreaRows[area],done=rows.filter(x=>x.done).length;return[area,{total:rows.length,done,left:rows.length-done,pct:rows.length?Math.round(done/rows.length*100):0}]}));

 const avatarLifeAreas=[
  {key:"spirituality",path:"M79 2H141L158 35Q138 45 110 43Q82 45 62 35Z",cx:110,cy:22,r:57,pct:pctFor("spirituality")},
  {key:"mind",path:"M75 40H145Q164 60 156 108Q147 137 110 142Q73 137 64 108Q56 60 75 40Z",cx:110,cy:90,r:70,pct:carePct},
  {key:"work",path:"M66 145H98V260H66ZM122 145H154V260H122Z",cx:110,cy:202,r:74,pct:pctFor("work")},
  {key:"people",path:"M96 177Q110 162 124 177Q137 192 110 216Q83 192 96 177Z",cx:110,cy:189,r:40,pct:pctFor("people")},
  {key:"hobbies",path:"M54 150Q70 145 80 162L79 246Q71 270 55 278L43 263Q53 230 45 190Z",cx:62,cy:213,r:73,pct:pctFor("hobbies")},
  {key:"body",path:"M72 258H148V306Q139 312 110 312Q81 312 72 306Z",cx:110,cy:285,r:48,pct:bodyProgressPct},
  {key:"money",path:"M68 318H152L158 463Q137 477 112 468H108Q83 477 62 463Z",cx:110,cy:390,r:105,pct:moneyFill},
  {key:"car",path:"M65 463Q86 475 108 468Q112 468 116 468Q139 476 158 463L163 492Q143 509 111 502Q80 509 59 492Z",cx:110,cy:485,r:61,pct:pctFor("car")}
 ];
 avatarLifeAreas.forEach(area=>{area.pct=dailyAreaStats[area.key].pct});
 const avatarAreaDefs=avatarLifeAreas.map(area=>avatarAreaFill(area.key,area.path,area.cx,area.cy,area.r,area.pct)).join("");
 const avatarAreaLayers=avatarLifeAreas.map(area=>avatarAreaLayer(area.key,area.path,area.cx,area.cy,area.r,area.pct)).join("");
 const avatarReviewCounts={};
 if(typeof dailyReviewExpected==="function")for(const item of dailyReviewExpected(date)){
  if(item.status!=="unknown")continue;
  const area=lifeMapAreaForReview(item);
  if(area)avatarReviewCounts[area]=(avatarReviewCounts[area]||0)+1;
 }
 const avatarMarks=[
  avatarMark("Mind and self-care","✿",47,99,dailyAreaStats.mind.pct,"#c89ad7","mind",dailyAreaStats.mind.left),
  avatarMark("Spirituality","✦",174,78,dailyAreaStats.spirituality.pct,"#f2b85b","spirituality",dailyAreaStats.spirituality.left),
  avatarMark("Body & health","♡",111,205,dailyAreaStats.body.pct,"#f2ae85","body",dailyAreaStats.body.left),
  avatarMark("Family and kids","♥",43,274,dailyAreaStats.people.pct,"#e98cb0","people",dailyAreaStats.people.left),
  avatarMark("Hobbies and projects","✎",177,274,dailyAreaStats.hobbies.pct,"#82c6a4","hobbies",dailyAreaStats.hobbies.left),
  avatarMark("Money and planning","✧",111,372,dailyAreaStats.money.pct,"#83b8df","money",dailyAreaStats.money.left),
  avatarMark("Car & driving","C",47,425,dailyAreaStats.car.pct,"#e98cb0","car",dailyAreaStats.car.left),
  avatarMark("Work","W",175,425,dailyAreaStats.work.pct,"#82c6a4","work",dailyAreaStats.work.left)
 ].join("");
 const waterStatus=waterHasCheckin?Math.round(waterOzToday)+" / "+Math.round(waterGoal)+" oz":"0 / 3";
 const waterMarks=[0,1,2].map(index=>{
  const portion=waterGoal/3,fill=waterHasCheckin?Math.max(0,Math.min(100,Math.round((waterOzToday-portion*index)/portion*100))):0;
  return '<span class="lm-priority-mark lm-priority-water-mark" style="--lm-fill:'+fill+'%"><span aria-hidden="true">💧</span></span>';
 }).join("");
 const teethMarks=[0,1].map(index=>'<span class="lm-priority-mark lm-priority-teeth-mark '+(index<brushCount?"is-filled":"")+'"><span aria-hidden="true">🦷</span></span>').join("");
 const waterHabitPanel='<aside class="lm-priority-habit lm-priority-water" aria-label="Water progress, '+h(waterStatus)+'"><b>WATER</b><small>'+h(waterStatus)+'</small><div class="lm-priority-marks" aria-hidden="true">'+waterMarks+'</div><small>3 bottles</small></aside>';
 const teethStatus=brushHasCheckin?brushCount+" of 2 today":"0 of 2";
 const teethHabitPanel='<aside class="lm-priority-habit lm-priority-teeth" aria-label="Teeth brushing progress, '+h(teethStatus)+'"><b>TEETH</b><small>'+h(teethStatus)+'</small><div class="lm-priority-marks" aria-hidden="true">'+teethMarks+'</div><small>daily goal</small></aside>';
 const bottleSize=Math.max(1,waterGoal/3),waterBottlesDone=Math.min(3,Math.floor(waterOzToday/bottleSize));
 const waterRatio=waterBottlesDone/3,teethRatio=brushCount/2;
 const priorityOpen=waterBottlesDone<3||brushCount<2;
 const reviewNext=typeof dailyReviewExpected==="function"?dailyReviewExpected(date).find(item=>item.status==="unknown"):null;
 const nextReviewTask=reviewNext?(reviewNext.kind==="task"?list(state&&state.tasks).find(task=>String(task.id)===String(reviewNext.key)):reviewNext.kind==="chore"?Object.assign({},list(state&&state.chores).find(task=>String(task.id)===String(reviewNext.key))||{},{title:(list(state&&state.chores).find(task=>String(task.id)===String(reviewNext.key))||{}).chore,_lifeChore:true}):null):null;
 const nextReviewLastDone=nextReviewTask&&typeof window.lifeMapTaskLastDoneLabel==="function"?window.lifeMapTaskLastDoneLabel(nextReviewTask):"";
 let nextCheckinTitle="",nextCheckinQuestion="",nextCheckinArea="",nextCheckinType="";
 if(priorityOpen){
  const chooseWater=waterBottlesDone<3&&(brushCount>=2||waterRatio<=teethRatio);
  nextCheckinType=chooseWater?"Priority habit · water":"Priority habit · teeth";
  nextCheckinTitle=chooseWater?"Water":"Brushing your teeth";
  nextCheckinQuestion=chooseWater?
   "Have you had your "+(["first","second","third"][waterBottlesDone]||"next")+" 26-ounce bottle of water today?":
   (brushCount===0?"Have you brushed your teeth yet today?":"Have you brushed a second time today?");
  nextCheckinArea="body";
 }else if(reviewNext){
  nextCheckinType="Daily Review · "+String(reviewNext.group||"Today");
  nextCheckinTitle=String(reviewNext.label||"Check-in");
  nextCheckinQuestion=String(reviewNext.detail||"Tell me whether this happened today.");
  nextCheckinArea=lifeMapAreaForReview(reviewNext);
 }else{
  nextCheckinType="Today";
  nextCheckinTitle="You’re caught up for today";
  nextCheckinQuestion="Water: "+waterBottlesDone+" of 3 bottles · Teeth: "+brushCount+" of 2 check-ins";
 }
 const nextAreaTitle={body:"Body & health",home:"Home tasks",mind:"Mind & self-care",people:"Family & kids",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning",car:"Car & driving",work:"Work"}[nextCheckinArea]||"Daily Review";
 const nextAction=nextCheckinArea?"lifeMapSelectArea(&#39;"+h(nextCheckinArea)+"&#39;)":"openDailyReview(&#39;"+h(date)+"&#39;)";
 const nextActionButton=priorityOpen||reviewNext?'<button type="button" class="lm-next-checkin-open" onclick="'+nextAction+'">Open '+h(nextAreaTitle)+' ›</button>':"";
 const nextCheckinPanel='<section class="lm-next-checkin" aria-label="Next check-in" aria-live="polite">'+
  '<div class="lm-next-checkin-head"><span>NEXT CHECK-IN</span><b>'+h(nextCheckinType)+'</b></div>'+
  '<div class="lm-next-checkin-question"><strong>'+h(nextCheckinTitle)+'</strong><span>'+h(nextCheckinQuestion)+'</span></div>'+
  (!priorityOpen&&nextReviewLastDone?'<small class="lm-next-checkin-last">Last done · '+h(nextReviewLastDone)+'</small>':"")+
  '<div class="lm-next-checkin-foot"><small>Tell me out loud; I’ll log it and update your progress.</small><div class="lm-next-checkin-progress"><span>💧 '+waterBottlesDone+'/3</span><span>🦷 '+brushCount+'/2</span></div></div>'+
  nextActionButton+'</section>';
 const taskDateLabel=t=>{const value=String(t&&t.date||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return "";const parsed=new Date(value+"T12:00:00");return Number.isNaN(parsed.getTime())?"":parsed.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})};
 const taskRow=t=>{
  if(typeof window.isParentingSkillTask==="function"&&window.isParentingSkillTask(t)){
   return '<div class="lm-task lm-lesson-row '+(t.done?"is-done":"")+'">'+
    '<button class="lm-lesson-launch" type="button" onclick="openParentingSkillLesson(&#39;'+h(t.id)+'&#39;)"><b>'+h(t.title||"Parenting skill")+'</b><small>'+(t.done?"Completed task · open another lesson":"Learn, think & practice · Open lesson ›")+'</small></button>'+
    '<button class="lm-task-edit" type="button" onclick="openTask(&#39;&#39;,&#39;'+h(t.id)+'&#39;)">Edit</button></div>';
  }
  const group=list(t._lifeMapDuplicateIds).length>1,ids=group?encodeURIComponent(JSON.stringify(t._lifeMapDuplicateIds)):String(t.id||"");
  const handler=group?"lifeMapToggleTaskGroup":"toggleTask",lastDone=window.lifeMapTaskLastDoneLabel(t);
  return '<div class="lm-task lm-task-editable '+(t.done?"is-done":"")+'">'+
    '<label class="lm-task-main"><input type="checkbox" '+(t.done?"checked":"")+' onchange="'+handler+'(\''+h(ids)+'\',this.checked)">'+
    '<span><b>'+h(t.title||"Task")+'</b><small>'+[t.child?String(t.child):"",taskDateLabel(t)].filter(Boolean).map(h).join(" · ")+'</small>'+
    (lastDone?'<small class="lm-task-last-done">Last done · '+h(lastDone)+'</small>':"")+'</span></label>'+
    '<button class="lm-task-edit" type="button" aria-label="Edit '+h(t.title||"task")+'" onclick="openTask(&#39;&#39;,&#39;'+h(t.id)+'&#39;)">Edit</button></div>';
 };
 const choreRow=t=>{const lastDone=window.lifeMapTaskLastDoneLabel(Object.assign({},t,{_lifeChore:true}));return '<label class="lm-task '+(t.done?"is-done":"")+'"><input type="checkbox" '+(t.done?"checked":"")+' onchange="toggleChore(\''+h(t.id)+'\',this.checked)"><span><b>'+h(t.title||"Home chore")+'</b><small>'+[t.child?String(t.child):"",taskDateLabel(t)].filter(Boolean).map(h).join(" · ")+'</small>'+(lastDone?'<small class="lm-task-last-done">Last done · '+h(lastDone)+'</small>':'')+'</span></label>'};
 const careRowsFor=rows=>rows.map(item=>'<label class="lm-task '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"is-done":"")+'"><input type="checkbox" '+(typeof selfCareDone==="function"&&selfCareDone(item.key,date)?"checked":"")+' onchange="toggleCare(\''+h(item.key)+'\')"><span><b>'+h(item.label||item.name||item.key)+'</b></span></label>').join("");
 const mindCareRows=careRowsFor(mindCareHabits);
 const areaTitles={home:"Home & household",mind:"Mind & self-care",body:"Body & health",people:"Family & kids",spirituality:"Spirituality",hobbies:"Hobbies & projects",money:"Money & planning",car:"Car & driving",work:"Work"};
 const areaSelection=areaOverride||activeArea;
 const areaHistory=areaKeys.includes(areaSelection)?lifeMapUniqueTasks(list(state&&state.tasks)).filter(t=>t.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&lifeMapAreaForTask(t)===areaSelection).map(t=>({date:String(t.date),title:String(t.title||"Task")})):[];
 const carePageHabits=areaSelection==="mind"?mindCareHabits:areaSelection==="body"?bodyCareHabits:[];
 const careHistory=carePageHabits.length?list(state&&state.selfCare).filter(x=>x.done&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&carePageHabits.some(habit=>habit.key===x.key)).map(x=>({date:String(x.date),title:carePageHabits.find(habit=>habit.key===x.key)?.label||"Self-care"})):[];
 const lastAreaDone=[...areaHistory,...careHistory].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const areaCheckin=areaSelection?lifeMapReviewPanel(areaSelection,date):"";
 const areaReviews=areaSelection&&typeof dailyReviewExpected==="function"?dailyReviewExpected(date).filter(item=>lifeMapAreaForReview(item)===areaSelection):[];
 const areaReviewKeys=new Set(areaReviews.filter(item=>item.status==="unknown").map(item=>String(item.key)));
 const areaNotApplicableKeys=new Set(areaReviews.filter(item=>item.status==="na").map(item=>String(item.key)));
 const homeChores=areaSelection==="home"&&typeof window.lifeMapHouseholdRows==="function"?window.lifeMapHouseholdRows(date).filter(t=>t._lifeChore&&!areaReviewKeys.has(String(t.id||""))&&!areaNotApplicableKeys.has(String(t.id||""))&&!(typeof window.houseVisualTaskHasRoomMatch==="function"&&window.houseVisualTaskHasRoomMatch(t))).map(choreRow).join(""):"";
 const activeAreaRows=areaSelection?((areaSelection==="mind"?mindCareRows:"")+(matches[areaSelection]||[]).filter(t=>!t._lifeMapEvidence&&!areaReviewKeys.has(String(t.id||""))&&!areaNotApplicableKeys.has(String(t.id||""))&&!(areaSelection==="home"&&typeof window.houseVisualTaskHasRoomMatch==="function"&&window.houseVisualTaskHasRoomMatch(t))).map(taskRow).join("")+homeChores):"";
 const moneyGoalPanel=areaSelection==="money"?'<div class="lm-money-goals"><span class="lm-kicker">MONEY GOAL PROGRESS</span><b>'+(moneyGoalTotal?moneyGoalDone+" of "+moneyGoalTotal+" steps · "+moneyGoalPct+"%":"No money-goal steps saved yet")+'</b>'+(moneyGoalRows||'<p class="lm-muted">Add a goal and steps to start tracking progress.</p>')+'<button type="button" class="lm-text-button" onclick="openMoneyHubSection(\'goals\')">Open money goals ›</button></div>':"";
 const mindLessonShortcut=areaSelection==="mind"?'<div class="lm-area-task-group"><div class="lm-area-section-heading"><b>Learn when useful</b><small>Guided parenting & psychology</small></div><button type="button" class="lm-region" onclick="openParentingSkillLesson()">Open a short interactive lesson ›</button></div>':"";
 const areaActivityContent=mindLessonShortcut+(lastAreaDone?'<p class="lm-inline-last"><b>Last done</b> · '+h(lastAreaDone.title)+' · '+h(lastAreaDone.date)+'</p>':"")+(areaCheckin||"")+(activeAreaRows?'<div class="lm-list">'+activeAreaRows+'</div>':"")+moneyGoalPanel;
 const activeAreaPanel=areaSelection&&areaActivityContent?'<section class="lm-inline-panel lm-area-page-content" aria-label="'+h(areaTitles[areaSelection]||"Life area")+' tasks and check-ins">'+areaActivityContent+'</section>':"";
 if(tasksOnly&&areaSelection==="all"){
  const openTasks=tasks.filter(t=>!t.done),doneTasks=tasks.filter(t=>t.done);
  return '<section class="life-map-page lm-area-page lm-area-tasks-page"><header class="lm-area-page-heading"><button class="lm-area-back" type="button" onclick="setView(&#39;lifemap&#39;)">‹ Life Map</button><span class="lm-kicker">TODAY · TASK LIST</span><h1>Today’s tasks</h1><p>All tasks counted in today’s plan are listed here. Open tasks come first.</p></header><section class="lm-inline-panel lm-area-page-content">'+(openTasks.length?'<div class="lm-list">'+openTasks.map(taskRow).join("")+'</div>':'<p class="lm-muted">No open tasks. Everything on today’s list is complete.</p>')+(doneTasks.length?'<details class="lm-completed" '+(openTasks.length?'':'open')+'><summary>Completed today · '+doneTasks.length+'</summary><div class="lm-list">'+doneTasks.map(taskRow).join("")+'</div></details>':'')+'</section></section>';
 }
 if(areaOverride){
  const stats=dailyAreaStats[areaSelection],rows=dailyAreaRows[areaSelection]||[];
  const rowHtml=row=>{
   if(row.kind==="task")return taskRow(row.task);
   if(row.kind==="chore")return choreRow(row.task);
   if(row.kind==="care")return careRowsFor([row.habit]);
   if(row.kind==="lesson")return '<button class="lm-region" type="button" onclick="startSpiritualityPractice()"><b>'+h(row.title)+'</b><small>'+(row.done?'Completed today · revisit':'Learn, listen & practice · Start ›')+'</small></button>';
   const item=row.review;
   return '<div class="lm-task '+(row.done?'is-done':'')+'"><span><b>'+h(row.title)+'</b>'+(item.detail?'<small>'+h(item.detail)+'</small>':'')+'</span><button type="button" class="lm-text-button" data-life-review-action="answer" data-kind="'+h(item.kind)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'" data-status="'+(row.done?'unknown':'yes')+'">'+(row.done?'Undo':'Done')+'</button>'+(!row.done?'<button type="button" class="lm-text-button" data-life-review-action="answer" data-kind="'+h(item.kind)+'" data-key="'+h(item.key)+'" data-date="'+h(date)+'" data-status="na">Not applicable</button>':'')+'</div>';
  };
  const openRows=rows.filter(x=>!x.done).map(rowHtml).join(""),doneRows=rows.filter(x=>x.done).map(rowHtml).join("");
  // Existing tasks retain their real dates. No-date tasks are a visible
  // anytime queue, not silently excluded from the avatar category.
  const areaTaskRows=allTasks.filter(t=>lifeMapAreaForTask(t)===areaSelection);
  const openAreaTasks=areaTaskRows.filter(t=>!t.done);
  const anytimeTasks=openAreaTasks.filter(t=>!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||"")));
  const upcomingTasks=openAreaTasks.filter(t=>/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&String(t.date)>date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const olderTasks=openAreaTasks.filter(t=>/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&String(t.date)<date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const unsorted=areaSelection==="home"?allTasks.filter(t=>!t.done&&!lifeMapAreaForTask(t)):[];
  const taskGroup=(title,items,subtitle)=>items.length?'<section class="lm-area-task-group"><div class="lm-area-section-heading"><b>'+h(title)+'</b><small>'+items.length+' task'+(items.length===1?"":"s")+(subtitle?' · '+h(subtitle):"")+'</small></div><div class="lm-list">'+items.map(taskRow).join("")+'</div></section>':"";
  const historyTaskGroup=(title,items,summary)=>items.length?'<details class="lm-area-task-history"><summary>'+h(title)+' · '+items.length+'</summary>'+(summary?'<p>'+h(summary)+'</p>':"")+'<div class="lm-list">'+items.map(taskRow).join("")+'</div></details>':"";
  const currentOpen=rows.filter(x=>!x.done).length;
  const activeCount=currentOpen+anytimeTasks.length+upcomingTasks.length;
  const trackers={mind:["selfcare","Self-care history"],body:["log","Health logs"],home:["household","House map & rooms"],people:["family","Family details"],spirituality:["spirituality","Spirituality"],hobbies:["gardenhobbies","Projects & interests"],money:["budget","Budget & accounts"],car:["today","Driving schedule"],work:["today","Work schedule"]};
  const tracker=trackers[areaSelection];
  const todayGroup='<section class="lm-area-task-group" aria-label="Today and check-ins">'+
    '<div class="lm-area-section-heading"><b>Today & check-ins</b><small>'+currentOpen+' to do · '+stats.done+' done</small></div>'+
    (openRows?'<div class="lm-list">'+openRows+'</div>':'<p class="lm-area-clear">✓ Nothing waiting for today in this category.</p>')+'</section>';
  const todayCompleted=doneRows?'<details class="lm-area-task-history"><summary>Completed today · '+stats.done+'</summary><div class="lm-list">'+doneRows+'</div></details>':"";
  const detailLink=areaSelection==="spirituality"?
    (typeof spiritualitySourceLink==="function"&&typeof spiritualityCourseLesson==="function"?spiritualitySourceLink(spiritualityCourseLesson(date)):""):
    '<button type="button" class="lm-region" onclick="setView(&#39;'+tracker[0]+'&#39;)">'+h(tracker[1])+' ›</button>';
  return '<section class="life-map-page lm-area-page" data-life-area-page="'+h(areaSelection)+'">'+
   '<header class="lm-area-page-heading"><button type="button" class="lm-area-back" onclick="setView(&#39;lifemap&#39;)">‹ Avatar & house</button>'+
   '<span class="lm-kicker">YOUR CATEGORY TASKS</span><h1>'+h(areaTitles[areaSelection])+'</h1>'+
   '<div class="lm-area-task-lead"><span><strong>'+activeCount+'</strong><small>active today, anytime or upcoming</small></span>'+
   '<button type="button" class="lm-area-add-task" onclick="lifeMapOpenAreaTask(&#39;'+h(areaSelection)+'&#39;)">＋ Add task here</button></div></header>'+
   '<section class="lm-inline-panel lm-area-page-content lm-area-task-workspace" aria-label="'+h(areaTitles[areaSelection])+' task list">'+
   todayGroup+
   lifeMapDoorwaysHtml(areaSelection,false)+
   taskGroup("Anytime · no date",anytimeTasks,"Do these whenever they fit")+
   taskGroup("Coming up",upcomingTasks,"Already scheduled")+
   historyTaskGroup("Older unfinished tasks",olderTasks,"These were saved for earlier dates. They have not been silently rescheduled.")+
   (unsorted.length?historyTaskGroup("Tasks needing a category",unsorted,"Open a task to change its category."):"")+
   todayCompleted+
   (lastAreaDone?'<p class="lm-area-lastdone"><b>Last done</b> · '+h(lastAreaDone.title)+' · '+h(lastAreaDone.date)+'</p>':"")+
   lifeMapTaskIdeasHtml(areaSelection)+
   '<details class="lm-area-shortcuts"><summary>More tools & history</summary>'+detailLink+
   (areaSelection==="money"?moneyGoalPanel:"")+
   (typeof window.lifeMapAreaHabitsHtml==="function"?window.lifeMapAreaHabitsHtml(areaSelection):"")+
   '</details></section></section>';

 }
 const selectedRoomData=activeRoom&&typeof window.houseVisualRoomInlineData==="function"?window.houseVisualRoomInlineData(activeRoom.floor,activeRoom.id):null;
 const activeRoomPanel=selectedRoomData?'<section class="lm-inline-panel lm-inline-room" aria-live="polite"><div class="lm-inline-panel-head"><b>'+h(selectedRoomData.name)+' · room tasks</b><button type="button" class="lm-text-button" onclick="lifeMapCloseRoomInline()">Close</button></div><p class="lm-inline-last"><b>Last done</b> · '+h(selectedRoomData.insights.last)+'</p><p>'+h(selectedRoomData.insights.declutter)+'</p>'+(selectedRoomData.wardrobes||"")+(selectedRoomData.tasks.length?'<div class="lm-list">'+selectedRoomData.tasks.map(task=>task&&task._lifeChore?choreRow(task):taskRow(task)).join("")+'</div>':'<p class="lm-muted">No room-specific tasks are mapped yet.</p>')+'<button type="button" class="hvm-room-declutter-quick" onclick="houseVisualLogDeclutter(\''+h(selectedRoomData.floor)+'\',\''+h(selectedRoomData.id)+'\')">＋ I organized one area</button></section>':"";


 const floor=selectedFloor();
 const map=typeof houseVisualMapHtml==="function"?houseVisualMapHtml(floor):'<p class="lm-muted">The saved house map is loading.</p>';
 const roomProgress=typeof houseVisualRoomProgressHtml==="function"?houseVisualRoomProgressHtml(floor):'<p class="lm-muted">Room history is loading.</p>';
 const floors=floorNames.map(f=>'<button type="button" class="lm-floor '+(f===floor?"selected":"")+'" aria-pressed="'+(f===floor?"true":"false")+'" onclick="lifeMapSetFloor(\''+f+'\')">'+h(f)+'</button>').join("");
 const taskContent=tasks.length?'<div class="lm-list">'+open.map(taskRow).join("")+'</div><details class="lm-completed"><summary>Completed today · '+completed+'</summary><div class="lm-list">'+tasks.filter(t=>t.done).map(taskRow).join("")+'</div></details>':'<p class="lm-muted">No date-specific tasks are on today’s list.</p>';
 return '<section class="life-map-page">'+
 '<section class="lm-scene-card"><div class="lm-scene-heading"><div><h2>Your life map</h2><div class="lm-period" role="group" aria-label="Progress period">'+["today","week"].map(period=>'<button type="button" aria-pressed="'+(period===progressRange)+'" onclick="lifeMapSetProgressRange(&#39;'+period+'&#39;)">'+(period==="today"?"Today":"This week")+'</button>').join("")+'</div></div></div>'+
 '<div class="lm-scene-grid lm-avatar-only"><div class="lm-avatar-wrap"><div class="lm-next-checkin-slot">'+nextCheckinPanel+'</div><div class="lm-avatar-stage lm-avatar-stage-with-habits">'+waterHabitPanel+'<svg class="lm-avatar"'+avatarLookStyle+' viewBox="0 0 220 510" role="group" aria-label="Michelle’s illustrated full-body avatar with clickable life areas">'+
 '<defs>'+avatarAreaDefs+'</defs>'+ '<image href="assets/michelle-ssd-avatar.webp?v=20261113-area-fill1" x="22" y="0" width="176" height="510" preserveAspectRatio="none" style="filter:grayscale(1);opacity:.52" pointer-events="none" aria-hidden="true"/>'+avatarAreaLayers+ '<g class="lm-avatar-hit-zones" aria-label="Tap a body area to open its page">'+ avatarHotspot("mind","Mind & self-care","M57 0 H163 V129 Q151 145 110 146 Q69 145 57 129Z")+ avatarHotspot("spirituality","Spirituality","M48 0 H172 V105 Q150 76 127 56 Q106 43 84 59 Q64 75 48 105Z")+ avatarHotspot("body","Body, health & safety","M57 120 H165 V270 H57Z")+ avatarHotspot("people","Relationships","M52 126 H98 V274 H28Z")+ avatarHotspot("hobbies","Hobbies & projects","M122 126 H168 V274 H194Z")+ avatarHotspot("money","Money & planning","M62 248 H158 V470 H62Z")+ '</g>'+avatarMarks+'</svg>'+teethHabitPanel+'</div>'+
 '<div class="lm-avatar-quick"><button type="button" onclick="lifeMapNavigate(&#39;capture&#39;)">＋ Log</button><button type="button" onclick="lifeMapNavigate(&#39;search&#39;)">⌕ Find</button><button type="button" onclick="lifeMapNavigate(&#39;settings&#39;)">⚙ Settings</button></div><p class="lm-avatar-caption">Tap the avatar to explore your life.</p>'+(typeof window.avatarWardrobePanelHtml==="function"?window.avatarWardrobePanelHtml():"")+'</div></div></section>'+
 '<section class="lm-lower-grid">'+
 '<section class="lm-panel lm-house"><div class="lm-panel-heading"><div><h2>House map</h2><button type="button" class="lm-text-button" onclick="setView(&#39;lifearea-home&#39;)">Whole-house tasks ›</button></div><button type="button" class="lm-text-button" onclick="setView(\'household\')">Open full map ›</button></div><p class="lm-muted">Choose a floor, then tap a room.</p><nav class="lm-floors" aria-label="Choose house floor">'+floors+'</nav><div class="lm-house-map">'+map+'</div>'+lifeMapDoorwaysHtml('home',true)+'<div class="lm-room-progress">'+roomProgress+'</div>'+activeRoomPanel+(typeof window.houseVisualUnassignedTasksHtml==="function"?window.houseVisualUnassignedTasksHtml(floor):"")+'</section></section>'+
 '</section>';
}
window.lifeMapSelectArea=async function(area){
 const allowed=["home","mind","body","people","spirituality","hobbies","money","car","work"];
 if(!allowed.includes(area))return;
 // A deliberate category tap can start one real, undated task if that area
 // has no open saved tasks. Never add it while rendering or after a reload.
 const ideas=lifeMapTaskIdeas[area]||[];
 if(state&&Array.isArray(state.tasks)&&ideas.length&&typeof save==="function"){
  state.settings=state.settings||{};
  const seeded=state.settings.lifeMapAreaStarters||{};
  if(seeded[area]!==true){
   const alreadyOpen=state.tasks.some(t=>!t.done&&!t.retiredAt&&!t.paused&&!t.duplicateHidden&&lifeMapAreaForTask(t)===area);
   const selected=ideas[area==="spirituality"?1:0]||ideas[0];
   const exists=state.tasks.some(t=>taskIdeaKey(t.title)===taskIdeaKey(selected[0])&&!t.retiredAt);
   if(!alreadyOpen&&!exists&&typeof uid==="function"){
    state.tasks.push({id:uid(),title:selected[0],category:selected[1],date:"",child:"",done:false,
     notes:"Undated starter task for "+area+" · change or delete whenever you like",generated:"life-map-area-starter",order:100});
   }
   state.settings.lifeMapAreaStarters={...seeded,[area]:true};
   try{await save()}catch(e){console.warn("Could not save category starter",e)}
  }
 }
 activeArea="";activeRoom=null;
 if(typeof setView==="function")setView("lifearea-"+area);
};
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
// Capture taps before navigation replaces the room or avatar view.
document.addEventListener("click",event=>{
 const control=event.target.closest?.("button,[role=button],input[type=checkbox],summary");
 if(!control || control.matches(":disabled,[aria-disabled=true]") || !control.closest(".life-map-page,.hvm-root,.hvm-zone-detail,.hvm-person-room-home,#familyClosetBody") || window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const box=control.getBoundingClientRect();
 const burst=document.createElement("span");
 burst.className="dl-tap-stars";burst.setAttribute("aria-hidden","true");
 burst.style.left=(event.detail?event.clientX:box.left+box.width/2)+"px";
 burst.style.top=(event.detail?event.clientY:box.top+box.height/2)+"px";
 const colors=["#e8a535","#b65d91","#539785","#906bb0"];
 for(let n=0;n<6;n++){
  const star=document.createElement("i"),angle=n*Math.PI/3-.5;
  star.style.setProperty("--dx",Math.round(Math.cos(angle)*24)+"px");
  star.style.setProperty("--dy",Math.round(Math.sin(angle)*24)+"px");
  star.style.setProperty("--star-color",colors[n%colors.length]);
  burst.appendChild(star);
 }
 document.body.appendChild(burst);
 setTimeout(()=>burst.remove(),500);
},true);
})();