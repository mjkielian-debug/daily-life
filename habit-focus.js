/* Daily Life · habit-building layer across existing life areas.
   Habit data is additive to the existing local/cloud state snapshot. */
(function(){
  "use strict";

  var AREAS = [
    {id:"health",label:"Health & care",icon:"♡",view:"log"},
    {id:"family",label:"Family",icon:"⌂",view:"family"},
    {id:"home",label:"Home",icon:"⌘",view:"household"},
    {id:"food",label:"Food",icon:"✿",view:"home"},
    {id:"work",label:"Work",icon:"↗",view:"today"},
    {id:"money",label:"Money",icon:"$",view:"more"},
    {id:"pets",label:"Pets",icon:"🐾",view:"pets"},
    {id:"reading",label:"Reading",icon:"▤",view:"reading"},
    {id:"growth",label:"Growth & hobbies",icon:"✦",view:"gardenhobbies"},
    {id:"spirituality",label:"Spirituality",icon:"☾",view:"spirituality"},
    {id:"car",label:"Car",icon:"◉",view:"today"},
    {id:"other",label:"Other",icon:"＋",view:"today"}
  ];
  var PAGE_AREA = {
    today:"all",itinerary:"all",family:"family",home:"food",more:"money",budget:"money",
    log:"health",selfcare:"health",reading:"reading",pets:"pets",household:"home",
    inventory:"home",garden:"growth",hobbies:"growth",gardenhobbies:"growth",
    spirituality:"spirituality"
  };
  var STATUS = {done:"Done",partial:"Partly",skipped:"Skipped",not_applicable:"N/A"};

  function appState(){
    if(typeof state==="undefined"||!state||typeof state!=="object")return null;
    if(!Array.isArray(state.habits))state.habits=[];
    if(!Array.isArray(state.habitLogs))state.habitLogs=[];
    return state;
  }
  function esc(value){
    if(typeof window.esc==="function")return window.esc(String(value==null?"":value));
    return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]});
  }
  function areaLabel(id){var a=AREAS.find(function(x){return x.id===id});return a?a.label:"Other"}
  function iconFor(id){var a=AREAS.find(function(x){return x.id===id});return a?a.icon:"＋"}
  function today(){return typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)}
  function dateShift(date,delta){
    if(typeof shiftDateString==="function")return shiftDateString(date,delta);
    var d=new Date(date+"T12:00:00");d.setDate(d.getDate()+delta);return d.toISOString().slice(0,10)
  }
  function currentArea(){
    var page=typeof view==="undefined"?"":String(view);
    return PAGE_AREA[page]||null
  }
  function habitLogsFor(habitId){
    var s=appState();return s?s.habitLogs.filter(function(x){return x&&String(x.habitId)===String(habitId)}):[]
  }
  function logOn(habitId,date){
    return habitLogsFor(habitId).find(function(x){return x.localDate===date})||null
  }
  function weekLine(habit){
    var end=today(),start=dateShift(end,-6),logs=habitLogsFor(habit.id).filter(function(x){return x.localDate>=start&&x.localDate<=end});
    var done=logs.filter(function(x){return x.status==="done"}).length;
    var partial=logs.filter(function(x){return x.status==="partial"}).length;
    var skipped=logs.filter(function(x){return x.status==="skipped"}).length;
    var na=logs.filter(function(x){return x.status==="not_applicable"}).length;
    var practice=done+partial;
    var summary=logs.length?practice+" practice"+(practice===1?"":"s")+(skipped?" · "+skipped+" skipped":"")+(na?" · "+na+" N/A":""):"No check-ins yet";
    var dots=[];
    for(var i=0;i<7;i++){
      var date=dateShift(start,i),entry=logOn(habit.id,date),day=new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
      var cls=entry&&STATUS[entry.status]?(" "+entry.status):" empty";
      dots.push('<span class="hf-dot'+cls+'" title="'+esc(day+" "+date+": "+(entry?(STATUS[entry.status]||"Logged"):"Not recorded"))+'">'+esc(day.slice(0,1))+'</span>')
    }
    return '<div class="hf-week"><div class="hf-week-dots">'+dots.join("")+'</div><span class="hf-week-summary">'+esc(summary)+' <span class="hf-muted">· unlogged days stay open</span></span></div>'
  }
  function dateLabel(value){
    var d=new Date(String(value||"")+"T12:00:00");
    return isNaN(d.getTime())?String(value||""):d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
  }
  function reminderMarkup(habit){
    if(habit.reminderEnabled!==true)return "";
    var active=habit.reminderEnabled===true;
    var label="Daily reminder · "+String(habit.reminderTime||"");
    return '<div class="hf-reminder"><span>♧ '+esc(label)+'</span><button type="button" class="hf-more" data-hf-action="'+(active?"stop-reminder":"edit")+'" data-habit-id="'+esc(habit.id)+'">'+(active?"Turn off":"Review")+'</button></div>'
  }
  function habitCard(habit){
    var todayLog=logOn(habit.id,today()),status=todayLog?(STATUS[todayLog.status]||"Logged"):"Not logged";
    var cue=String(habit.cue||"").trim(),small=String(habit.minimum||"").trim();
    return '<article class="hf-habit" data-hf-habit="'+esc(habit.id)+'">'+
      '<div class="hf-habit-top"><span class="hf-area-icon" aria-hidden="true">'+esc(iconFor(habit.area))+'</span>'+
      '<div class="hf-habit-copy"><h3>'+esc(habit.name)+'</h3>'+
      (cue?'<p><b>Cue:</b> '+esc(cue)+'</p>':'')+
      (small?'<p><b>Small version:</b> '+esc(small)+'</p>':'')+
      '</div><span class="hf-area-label">'+esc(areaLabel(habit.area))+'</span></div>'+
      weekLine(habit)+reminderMarkup(habit)+
      '<div class="hf-today-label">Today · '+esc(status)+'</div>'+
      '<div class="hf-actions" role="group" aria-label="Log '+esc(habit.name)+' for today">'+
      '<button type="button" class="hf-action hf-done'+(todayLog&&todayLog.status==="done"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(habit.id)+'" data-status="done">Done</button>'+
      '<button type="button" class="hf-action'+(todayLog&&todayLog.status==="partial"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(habit.id)+'" data-status="partial">Partly</button>'+
      '<button type="button" class="hf-action'+(todayLog&&todayLog.status==="skipped"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(habit.id)+'" data-status="skipped">Skipped</button>'+
      '<button type="button" class="hf-action hf-na'+(todayLog&&todayLog.status==="not_applicable"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(habit.id)+'" data-status="not_applicable">N/A</button>'+
      '<button type="button" class="hf-more" data-hf-action="edit" data-habit-id="'+esc(habit.id)+'">Edit</button>'+
      '<button type="button" class="hf-more" data-hf-action="pause" data-habit-id="'+esc(habit.id)+'">Pause</button>'+
      '</div></article>'
  }
  function pausedCard(habit){
    return '<div class="hf-paused-row"><span>'+esc(habit.name)+' <small>· '+esc(areaLabel(habit.area))+'</small></span>'+
      '<button type="button" class="hf-more" data-hf-action="resume" data-habit-id="'+esc(habit.id)+'">Resume</button></div>'
  }
  function healthPreset(){
    var already=(appState()?.habits||[]).some(function(h){return h.area==="health"&&/26.?oz|water bottle/i.test(String(h.name||""))});
    if(already)return "";
    return '<button type="button" class="hf-preset" data-hf-action="preset-water">＋ Add the 26-oz bottle habit we planned</button>'
  }
  function emptyState(area){
    var label=area==="all"?"any area":areaLabel(area);
    return '<div class="hf-empty"><b>No habits started in '+esc(label)+' yet.</b>'+
      '<span>Choose a small action and connect it to something that already happens. You can build habits in as many areas as you want.</span>'+
      (area==="health"?healthPreset():"")+
      '<button type="button" class="hf-action hf-create" data-hf-action="add" data-area="'+esc(area==="all"?"":area)+'">＋ Add a habit</button></div>'
  }
  function addAreaChips(){
    return '<div class="hf-area-chips" aria-label="Start a habit in an area">'+AREAS.filter(function(a){return a.id!=="other"}).map(function(a){
      return '<button type="button" data-hf-action="add" data-area="'+a.id+'"><span>'+esc(a.icon)+'</span>'+esc(a.label)+'</button>'
    }).join("")+'</div>'
  }
  function renderPanel(area){
    var s=appState();if(!s||!area)return "";
    var active=s.habits.filter(function(h){return h&&h.status!=="paused"&&h.status!=="archived"});
    var paused=s.habits.filter(function(h){return h&&h.status==="paused"});
    var current=area==="all"?active:active.filter(function(h){return h.area===area});
    var title=area==="all"?"Habits across your day":"Habits in "+areaLabel(area);
    var subtitle=area==="all"?"Build repeatable routines throughout your life. Open an area to work on its habits.":"Small practices for this part of your life.";
    var body=current.length?current.map(habitCard).join(""):emptyState(area);
    if(area==="all"&&!current.length)body+=addAreaChips();
    var pausedHere=area==="all"?paused:paused.filter(function(h){return h.area===area});
    var pausedHtml=pausedHere.length?'<details class="hf-paused"><summary>Paused habits · '+pausedHere.length+'</summary>'+pausedHere.map(pausedCard).join("")+'</details>':"";
    return '<section class="hf-panel" data-habit-focus data-area="'+esc(area)+'">'+
      '<div class="hf-heading"><div><div class="hf-eyebrow">Habit building · every area</div><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div>'+
      '<button type="button" class="hf-action hf-create" data-hf-action="add" data-area="'+esc(area==="all"?"":area)+'">＋ Add habit</button></div>'+
      '<div class="hf-list">'+body+'</div>'+pausedHtml+
      '<div class="hf-footnote">Habits are practices you choose. Appointments and one-time tasks stay in their existing areas.</div></section>'
  }
  function openCreate(area,preset){
    if(typeof modal!=="function")return;
    var selected=AREAS.some(function(a){return a.id===area})?area:"";
    var p=preset||{};
    var body='<div class="stack hf-form">'+
      '<label>Life area<select id="hfArea"><option value="">Choose an area</option>'+AREAS.map(function(a){return '<option value="'+a.id+'" '+(selected===a.id?"selected":"")+'>'+esc(a.label)+'</option>'}).join("")+'</select></label>'+
      '<label>Habit you want to build<input id="hfName" maxlength="100" value="'+esc(p.name||"")+'" placeholder="A small action you want to repeat"></label>'+
      '<label>What will cue it?<input id="hfCue" maxlength="180" value="'+esc(p.cue||"")+'" placeholder="After I… / Before I… / When…"></label>'+
      '<label>What is the smallest version that counts?<input id="hfMinimum" maxlength="180" value="'+esc(p.minimum||"")+'" placeholder="The easy version for busy days"></label>'+
      '<label class="hf-reminder-check"><input id="hfRemind" type="checkbox" '+(p.reminderEnabled?'checked':'')+'> Enable daily phone reminders</label>'+
      '<label>Reminder time <input id="hfReminderTime" type="time" value="'+esc(p.reminderTime||'')+'"></label>'+
      '<div class="hf-form-note">Daily reminders stay on until you turn them off. Enable Daily Life notifications on this device to receive them; unlogged days stay open.</div></div>';
    modal("Build a habit",body,"Save habit",async function(){
      var areaValue=document.getElementById("hfArea")?.value||"";
      var name=String(document.getElementById("hfName")?.value||"").trim();
      if(!AREAS.some(function(a){return a.id===areaValue})){alert("Choose the life area for this habit.");return}
      if(!name){alert("Give the habit a short name so it is easy to recognize.");return}
      var s=appState();if(!s)return;
      var remind=!!document.getElementById("hfRemind")?.checked,reminderTime=String(document.getElementById("hfReminderTime")?.value||"");
      if(remind&&!reminderTime){alert("Choose a reminder time, or turn off the 14-day reminder trial.");return}
      var id=(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():"habit-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),createdAt=new Date().toISOString();
      s.habits.push({id:id,area:areaValue,name:name,cue:String(document.getElementById("hfCue")?.value||"").trim(),minimum:String(document.getElementById("hfMinimum")?.value||"").trim(),status:"active",reminderEnabled:remind,reminderTime:reminderTime,reminderStartDate:remind?today():"",reminderEndDate:"",createdAt:createdAt,updatedAt:createdAt});
      await save();closeModal();render()
    })
  }
  function openEdit(id){
    var s=appState(),habit=s&&s.habits.find(function(h){return String(h.id)===String(id)});
    if(!habit||typeof modal!=="function")return;
    var body='<div class="stack hf-form">'+
      '<label>Life area<select id="hfArea"><option value="">Choose an area</option>'+AREAS.map(function(a){return '<option value="'+a.id+'" '+(habit.area===a.id?"selected":"")+'>'+esc(a.label)+'</option>'}).join("")+'</select></label>'+
      '<label>Habit<input id="hfName" maxlength="100" value="'+esc(habit.name||"")+'"></label>'+
      '<label>Cue<input id="hfCue" maxlength="180" value="'+esc(habit.cue||"")+'" placeholder="After I… / Before I… / When…"></label>'+
      '<label>Smallest version<input id="hfMinimum" maxlength="180" value="'+esc(habit.minimum||"")+'" placeholder="The easy version for busy days"></label>'+
      '<label class="hf-reminder-check"><input id="hfRemind" type="checkbox" '+(habit.reminderEnabled===true?'checked':'')+'> Try phone reminders for 14 days</label>'+
      '<label>Reminder time <input id="hfReminderTime" type="time" value="'+esc(habit.reminderTime||'')+'"></label>'+
      '<div class="hf-form-note">Daily reminders stay on until you turn them off. Enable Daily Life notifications on this device to receive them.</div></div>';
    modal("Edit habit",body,"Save changes",async function(){
      var areaValue=document.getElementById("hfArea")?.value||"";
      var name=String(document.getElementById("hfName")?.value||"").trim();
      if(!AREAS.some(function(a){return a.id===areaValue})||!name){alert("Choose an area and enter a habit name.");return}
      habit.area=areaValue;habit.name=name;
      habit.cue=String(document.getElementById("hfCue")?.value||"").trim();
      habit.minimum=String(document.getElementById("hfMinimum")?.value||"").trim();
      var remind=!!document.getElementById("hfRemind")?.checked,reminderTime=String(document.getElementById("hfReminderTime")?.value||"");
      if(remind&&!reminderTime){alert("Choose a reminder time, or turn off the 14-day reminder trial.");return}
      var reminderWasOff=habit.reminderEnabled!==true;
      habit.reminderEnabled=remind;habit.reminderTime=reminderTime;
      if(remind&&reminderWasOff)habit.reminderStartDate=today();
      habit.reminderEndDate="";
      habit.updatedAt=new Date().toISOString();
      await save();closeModal();render()
    })
  }
  async function logHabit(id,status){
    if(!STATUS[status])return;
    var s=appState();if(!s)return;
    var date=today(),entry=s.habitLogs.find(function(x){return x&&String(x.habitId)===String(id)&&x.localDate===date});
    if(entry){entry.status=status;entry.updatedAt=new Date().toISOString()}
    else s.habitLogs.push({id:(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():"habit-log-"+Date.now(),habitId:id,localDate:date,status:status,createdAt:new Date().toISOString()});
    await save();render()
  }
  async function setReminder(id,enabled){
    var s=appState(),habit=s&&s.habits.find(function(h){return String(h.id)===String(id)});
    if(!habit)return;
    habit.reminderEnabled=!!enabled;habit.updatedAt=new Date().toISOString();
    await save();render()
  }
  async function setPaused(id,paused){
    var s=appState(),habit=s&&s.habits.find(function(h){return String(h.id)===String(id)});
    if(!habit)return;
    habit.status=paused?"paused":"active";habit.updatedAt=new Date().toISOString();
    await save();render()
  }
  function addWaterPreset(){
    openCreate("health",{name:"Fill my 26-oz water bottle before UPS",cue:"Before leaving for UPS",minimum:"Put the bottle by my work bag"});
  }
  function mount(){
    var root=document.querySelector("#app"),main=root&&root.querySelector("main.app"),area=currentArea();
    if(!root||!main)return;
    if(typeof appStartupReady!=="undefined"&&!appStartupReady)return;
    var old=main.querySelector("[data-habit-focus]");
    if(!area){if(old)old.remove();return}
    if(old&&old.dataset.area===area)return;
    var html=renderPanel(area);
    if(old)old.outerHTML=html;
    else{
      var header=main.querySelector(":scope > header");
      if(header)header.insertAdjacentHTML("afterend",html);
      else main.insertAdjacentHTML("afterbegin",html)
    }
  }
  function handleClick(event){
    var button=event.target&&event.target.closest?event.target.closest("[data-hf-action]"):null;
    if(!button)return;
    var action=button.dataset.hfAction,id=button.dataset.habitId;
    if(action==="add")openCreate(button.dataset.area||"");
    else if(action==="edit")openEdit(id);
    else if(action==="pause")setPaused(id,true);
    else if(action==="resume")setPaused(id,false);
    else if(action==="stop-reminder")setReminder(id,false);
    else if(action==="log")logHabit(id,button.dataset.status);
    else if(action==="preset-water")addWaterPreset()
  }
  function start(){
    var root=document.querySelector("#app");
    if(!root)return;
    root.addEventListener("click",handleClick);
    var observer=new MutationObserver(function(){mount()});
    observer.observe(root,{childList:true,subtree:true});
    mount()
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();