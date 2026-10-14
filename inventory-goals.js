/* Daily Life · House inventory + declutter goals.
   Progress is confirmed areas reviewed, NOT percent of the house inventoried.
   All quantity limits are optional user choices. Existing inventory is unchanged. */
(function(){
 "use strict";
 const GROUPS=[
  {key:"clothes",label:"Clothes",icon:"👚",hint:"Closets, dressers, outgrown clothes"},
  {key:"toys",label:"Toys",icon:"🧸",hint:"Toy bins, games, craft toys"},
  {key:"food",label:"Food",icon:"🥫",hint:"Pantry, fridge, freezer"},
  {key:"supplies",label:"Supplies",icon:"🧹",hint:"Bathroom, cleaning, tools, household"},
  {key:"other",label:"Everything else",icon:"⌂",hint:"Books, papers, storage and other areas"}
 ];
 function settings(){
  if(!state.settings)state.settings={};
  if(!state.settings.homeOrganizationGoals||typeof state.settings.homeOrganizationGoals!=="object")state.settings.homeOrganizationGoals={};
  const g=state.settings.homeOrganizationGoals;
  if(!g.groups||typeof g.groups!=="object")g.groups={};
  if(!Array.isArray(g.sessions))g.sessions=[];
  if(!Number.isFinite(Number(g.dailyZones))||Number(g.dailyZones)<1)g.dailyZones=1;
  if(!Number.isFinite(Number(g.weeklyZones))||Number(g.weeklyZones)<1)g.weeklyZones=4;
  return g;
 }
 function groupFor(item){
  const c=String(item?.category||"").toLowerCase(),n=String(item?.name||"").toLowerCase();
  if(/clothing|clothes|apparel|wardrobe/.test(c))return "clothes";
  if(/toys?|games?/.test(c)||(/\bkids?\b/.test(c)&&/\b(toy|doll|lego|puzzle|game|stuffed)\b/.test(n)))return "toys";
  if(/food|pantry|grocery|groceries/.test(c))return "food";
  if(/clean|bathroom|household|tools?/.test(c))return "supplies";
  return "other";
 }
 function weekStart(date){
  const d=new Date(String(date)+"T12:00:00");
  d.setDate(d.getDate()-((d.getDay()+6)%7));
  return ymd(d);
 }
 function progress(){
  const prefs=settings(),day=ymd(),week=weekStart(day),counts={},valid=[];
  for(const group of GROUPS){
   const g=prefs.groups[group.key]||{},rows=(state.inventoryItems||[]).filter(x=>groupFor(x)===group.key&&!["gone","donate / sell"].includes(String(x.status||"").toLowerCase())),
     actual=rows.reduce((n,x)=>n+Math.max(0,Number(x.quantity??1)||0),0),
     total=Number(g.areasTotal||0),done=Math.min(total,Math.max(0,Number(g.areasDone||0)));
   if(total>0)valid.push({total,done});
   counts[group.key]={...group,total,done,actual,tracked:rows.length,keepMax:g.keepMax===null||g.keepMax===undefined||g.keepMax===""?null:Number(g.keepMax)};
  }
  const sum=(rows)=>rows.reduce((n,x)=>n+Math.max(0,Number(x.zones)||0),0),
    todayCount=sum(prefs.sessions.filter(x=>x.date===day)),
    weekCount=sum(prefs.sessions.filter(x=>x.date>=week&&x.date<=day)),
    zones=valid.reduce((n,x)=>n+x.total,0),done=valid.reduce((n,x)=>n+x.done,0);
  return {groups:counts,zones,done,percent:zones?Math.round(done*100/zones):null,
    today:todayCount,week:weekCount,dailyGoal:Number(prefs.dailyZones),weeklyGoal:Number(prefs.weeklyZones),
    weekStart:week,configured:valid.length};
 }
 function pct(n,total){return total>0?Math.min(100,Math.round(100*n/total)):0}
 function meter(value,total,label){
  const percent=pct(value,total);
  return '<div class="hg-meter" role="progressbar" aria-label="'+esc(label)+'" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+Math.min(total,value)+'"><span style="width:'+percent+'%"></span></div>';
 }
 function modalHtml(){
  const x=progress(),rows=GROUPS.map(g=>{
   const d=x.groups[g.key],configured=d.total>0,percent=configured?pct(d.done,d.total):0;
   const target=d.keepMax===null?"Set keep limit":d.actual+" entered / "+d.keepMax+" keep limit";
   return '<div class="hg-group"><button class="hg-edit" onclick="openHomeGoalCategory(\''+g.key+'\')">'+
     '<span class="hg-ring" style="--hg-fill:'+percent+'%"><b>'+(configured?percent+"%":"?")+'</b></span>'+
     '<span class="hg-group-text"><b>'+g.icon+' '+esc(g.label)+'</b><small>'+(configured?d.done+' / '+d.total+' areas reviewed':'Set number of areas')+'</small>'+
     '<small>'+esc(target)+' · '+d.tracked+' item types entered</small></span><span aria-hidden="true">›</span></button>'+
     (configured?'<div class="hg-actions"><button type="button" onclick="homeLogOrganizedArea(\''+g.key+'\')">+ 1 area organized</button>'+
       (settings().sessions.some(x=>x.key===g.key&&x.date===ymd())?'<button type="button" onclick="homeUndoOrganizedArea(\''+g.key+'\')">Undo today</button>':'')+'</div>':'')+'</div>';
  }).join("");
  return '<div class="hg-modal">'+
    '<div class="hg-summary"><span class="hg-large-ring" style="--hg-fill:'+(x.percent??0)+'%"><b>'+(x.percent===null?"—":x.percent+"%")+'</b><small>organized</small></span>'+
    '<div><b>'+x.done+' / '+x.zones+' areas confirmed</b><p>Only areas you mark reviewed count. Untracked areas stay unknown.</p></div></div>'+
    '<div class="hg-short-goals">'+
      '<div><b>Today · '+x.today+' / '+x.dailyGoal+'</b>'+meter(x.today,x.dailyGoal,"Organizing areas done today")+'</div>'+
      '<div><b>This week · '+x.week+' / '+x.weeklyGoal+'</b>'+meter(x.week,x.weeklyGoal,"Organizing areas done this week")+'</div>'+
    '</div><div class="hg-actions"><button type="button" onclick="openHomeGoalTargets()">Edit daily + weekly goals</button></div>'+
    '<div class="hg-groups">'+rows+'</div>'+
    '<p class="hg-note">Keep limits are optional, not a rule about how much your family should own. Counts include only the inventory you entered and do not measure how much is in the whole house. For food, pantry scans may have more items than this inventory list.</p></div>';
 }
 window.openHomeGoals=function(){
  modal("Home progress + keep goals",modalHtml(),"Close",closeModal);
 };
 window.openHomeGoalTargets=function(){
  const g=settings();
  modal("Daily + weekly home goals",'<div class="stack"><p class="muted small">Suggested starting point: one small area a day, four a week. Choose what is realistic for you.</p>'+
    '<label>Areas to organize each day<input id="hgDay" type="number" min="1" max="100" step="1" value="'+esc(g.dailyZones)+'"></label>'+
    '<label>Areas to organize each week<input id="hgWeek" type="number" min="1" max="500" step="1" value="'+esc(g.weeklyZones)+'"></label></div>',
   "Save",async()=>{
    const d=Number(document.querySelector("#hgDay")?.value),w=Number(document.querySelector("#hgWeek")?.value);
    if(!Number.isInteger(d)||!Number.isInteger(w)||d<1||w<1||d>100||w>500){alert("Choose whole numbers in the allowed range.");return}
    g.dailyZones=d;g.weeklyZones=w;await save();render();window.openHomeGoals();
   });
 };
 window.openHomeGoalCategory=function(key){
  const cfg=GROUPS.find(x=>x.key===key);if(!cfg)return;
  const g=settings().groups[key]||{},stats=progress().groups[key];
  modal(cfg.label+" · organize",'<div class="stack">'+
    '<p class="muted small">'+esc(cfg.hint)+' · Count small, distinct areas (shelf, drawer, bin), not an entire room unless you want to.</p>'+
    '<label>Areas to work through<input id="hgAreas" type="number" min="0" max="10000" step="1" value="'+esc(g.areasTotal??"")+'" placeholder="Set your own goal"></label>'+
    '<label>Areas already organized<input id="hgDone" type="number" min="0" max="10000" step="1" value="'+esc(g.areasDone??0)+'"></label>'+
    '<label>Maximum quantity you would like to keep (optional)<input id="hgKeep" type="number" min="0" max="100000" step="1" value="'+esc(g.keepMax??"")+'" placeholder="Optional"></label>'+
    '<p class="muted small">'+stats.actual+' units entered across '+stats.tracked+' inventory item types in this category. This is not a complete household count. You can also set an ideal quantity on each individual inventory item.</p></div>',
   "Save",async()=>{
    const total=Number(document.querySelector("#hgAreas")?.value||0),
      done=Number(document.querySelector("#hgDone")?.value||0),
      raw=document.querySelector("#hgKeep")?.value.trim()||"",
      keep=raw===""?null:Number(raw);
    if(!Number.isInteger(total)||!Number.isInteger(done)||done>total||total<0||!Number.isInteger(keep??0)||(keep!==null&&keep<0)){
     alert("Enter whole numbers, with organized areas no greater than total areas.");return
    }
    settings().groups[key]={areasTotal:total,areasDone:done,keepMax:keep};
    await save();render();window.openHomeGoals();
   });
 };
 window.homeLogOrganizedArea=async function(key){
  const g=settings(),x=g.groups[key];
  if(!x||!(Number(x.areasTotal)>Number(x.areasDone||0)))return;
  x.areasDone=Number(x.areasDone||0)+1;
  g.sessions.push({date:ymd(),key,zones:1,id:uid(),createdAt:new Date().toISOString()});
  await save();render();window.openHomeGoals();
 };
 window.homeUndoOrganizedArea=async function(key){
  const g=settings(),x=g.groups[key];if(!x||Number(x.areasDone||0)<=0)return;
  const index=g.sessions.findLastIndex(v=>v.key===key&&v.date===ymd());
  if(index<0)return;
  x.areasDone=Math.max(0,Number(x.areasDone)-1);
  g.sessions.splice(index,1);
  await save();render();window.openHomeGoals();
 };
 window.homeOrganizationSummary=progress;
 window.openDailyWeeklyProgress=function(){
  const p=progress(),date=ymd(),review=typeof dailyReviewExpected==="function"?dailyReviewExpected(date):[],
    chores=review.filter(x=>x.kind==="chore"),tasks=review.filter(x=>x.kind==="task"),
    done=x=>x.filter(v=>v.status==="yes").length,
    waterGoal=Math.max(1,Number(state.settings?.waterTarget||78)),
    water=(state.waterLogs||[]).filter(x=>x.date===date).reduce((n,x)=>n+(Number(x.oz)||0),0),
    groups=[["Kids' chores",done(chores),chores.length],["Tasks",done(tasks),tasks.length],["Water (oz)",Math.round(water),waterGoal],["Organizing today",p.today,p.dailyGoal],["Organizing this week",p.week,p.weeklyGoal]];
  modal("Daily + weekly progress",'<div class="hg-modal"><div class="hg-short-goals">'+
    groups.map(x=>'<div><b>'+esc(x[0])+' · '+x[1]+' / '+x[2]+'</b>'+meter(x[1],x[2],x[0])+'</div>').join("")+
    '</div><p class="hg-note">Progress uses only confirmed checkmarks and logged amounts. Unknown is not a failure. More weekly goals can be added later.</p>'+
    '<div class="hg-actions"><button onclick="openHomeGoals()">House organizing goals ›</button><button onclick="openDailyReview()">Review unknown checkmarks ›</button></div></div>',"Close",closeModal);
 };
})();
