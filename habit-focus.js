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
  var quickBarOpen=false;

  function correctStarterReminderTimes(s){
    if(!s||!s.settings)return false;
    if(s.settings.habitReminderCorrectionVersion>=1)return false;
    var changed=false;
    var water=s.habits.find(function(h){return h&&h.id==="starter-habit-drink-water"});
    if(water&&water.reminderTime==="07:00"&&water.cue!=="Mid-shift on workdays; keep the bottle within reach on the route."){
      water.cue="Mid-shift on workdays; keep the bottle within reach on the route.";
      water.updatedAt=new Date().toISOString();
      changed=true;
    }
    var teeth=s.habits.find(function(h){return h&&h.id==="starter-habit-brush-teeth"});
    if(teeth&&teeth.reminderTime==="19:30"){
      teeth.reminderEnabled=true;
      teeth.reminderTime="04:00";
      teeth.cue="After I get up and before I leave for work (around 4:00 AM on UPS days).";
      teeth.updatedAt=new Date().toISOString();
      changed=true;
    }
    s.settings.habitReminderCorrectionVersion=1;
    return changed;
  }
  function seedRequestedStarterHabits(){
    var s=appState();
    if(!s)return;
    s.settings=s.settings||{};
    var reminderTimesChanged=correctStarterReminderTimes(s);
    if(reminderTimesChanged&&typeof save==="function")Promise.resolve(save()).catch(function(error){console.error("Could not save corrected starter reminder time.",error)});
    if(s.settings.habitStarterSetVersion>=2)return;
    var createdAt=new Date().toISOString(),added=[],changed=[];
    var starters=[
      {id:"starter-habit-drink-water",area:"health",name:"Drink water",cue:"Mid-shift on workdays; keep the bottle within reach on the route.",minimum:"Take a few sips; filling my 26-oz bottle is a bonus.",status:"active",reminderEnabled:true,reminderTime:"07:00"},
      {id:"starter-habit-brush-teeth",area:"health",name:"Brush my teeth morning and night",cue:"After I get up and before I leave for work (around 4:00 AM on UPS days).",minimum:"Brush once; one brushing still counts on a hard day.",status:"active",reminderEnabled:true,reminderTime:"04:00"}
    ];
    starters.forEach(function(starter){
      var words=starter.id.indexOf("water")>=0?/water|hydration|drink/i:/tooth|teeth|brush/i;
      var existing=s.habits.find(function(h){return h&&words.test(String(h.name||""))});
      if(!existing){
        starter.reminderStartDate=today();starter.reminderEndDate="";
        starter.createdAt=createdAt;starter.updatedAt=createdAt;
        s.habits.push(starter);added.push(starter.id);
      }else{
        changed.push({habit:existing,previous:{reminderEnabled:existing.reminderEnabled,reminderTime:existing.reminderTime,reminderStartDate:existing.reminderStartDate,reminderEndDate:existing.reminderEndDate,cue:existing.cue}});
        existing.reminderEnabled=true;
        if(!existing.reminderTime)existing.reminderTime=starter.reminderTime;
        existing.reminderStartDate=existing.reminderStartDate||today();
        existing.reminderEndDate="";
        if(starter.id.indexOf("brush")>=0&&existing.name===starter.name)existing.cue=starter.cue;
        existing.updatedAt=createdAt;
      }
    });
    s.settings.habitStarterSetVersion=2;
    s.settings.habitStarterSetCreatedAt=s.settings.habitStarterSetCreatedAt||createdAt;
    s.settings.habitReminderSetVersion=1;
    Promise.resolve(typeof save==="function"?save():null).catch(function(error){
      s.habits=s.habits.filter(function(h){return added.indexOf(h.id)<0});
      changed.forEach(function(row){Object.assign(row.habit,row.previous)});
      s.settings.habitStarterSetVersion=1;
      delete s.settings.habitReminderSetVersion;
      console.error("Could not save the requested starter habits and reminders.",error);
    });
  }
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
  function quickBarSignature(){
    var s=appState();if(!s)return "";
    var active=s.habits.filter(function(h){return h&&h.status!=="paused"&&h.status!=="archived"});
    return JSON.stringify({open:quickBarOpen,habits:active.map(function(h){var log=logOn(h.id,today());return [h.id,log?.status||""]})});
  }
  function quickBar(){
    var s=appState();if(!s)return "";
    var active=s.habits.filter(function(h){return h&&h.status!=="paused"&&h.status!=="archived"});
    var completed=active.filter(function(h){var log=logOn(h.id,today());return log&&(log.status==="done"||log.status==="partial")}).length;
    var title=active.length?completed+" of "+active.length+" habits checked in today":"Start with one small habit";
    var rows=active.map(function(h){
      var log=logOn(h.id,today()),status=log?(STATUS[log.status]||"Logged"):"Not checked in";
      return '<div class="hf-quick-row"><span class="hf-quick-name">'+esc(h.name)+'</span><span class="hf-quick-status">'+esc(status)+'</span><div class="hf-quick-actions">'+
        '<button type="button" class="hf-quick-done'+(log&&log.status==="done"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(h.id)+'" data-status="done">✓ Done</button>'+
        '<button type="button" class="hf-quick-partial'+(log&&log.status==="partial"?" selected":"")+'" data-hf-action="log" data-habit-id="'+esc(h.id)+'" data-status="partial">Partly</button></div></div>';
    }).join("");
    return '<section class="hf-quickbar" data-habit-quickbar data-signature="'+esc(quickBarSignature())+'"><div class="hf-quick-head"><span class="hf-quick-sparkle" aria-hidden="true">✦</span><div class="hf-quick-title"><b>Today’s habits</b><span>'+esc(title)+'</span></div>'+
      (active.length?'<button type="button" class="hf-quick-toggle" data-hf-action="quick-toggle">'+(quickBarOpen?"Hide":"Check in")+'</button>':'<button type="button" class="hf-quick-toggle" data-hf-action="add" data-area="health">＋ Start</button>')+
      '</div>'+(active.length?'<div class="hf-quick-track" aria-label="'+completed+' of '+active.length+' habits checked in"><span style="width:'+Math.round(completed/active.length*100)+'%"></span></div>':"")+
      (quickBarOpen&&active.length?'<div class="hf-quick-list">'+rows+'</div>':"")+'</section>';
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
      '<div class="hf-heading-actions">'+
      (area==="all"&&active.some(function(h){return !logOn(h.id,today())})?'<button type="button" class="hf-action hf-resume-checkin" data-hf-action="reopen-checkin">Resume check-in</button>':"")+
      '<button type="button" class="hf-action hf-create" data-hf-action="add" data-area="'+esc(area==="all"?"":area)+'">＋ Add habit</button></div></div>'+
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
      '<label class="hf-reminder-check"><input id="hfRemind" type="checkbox" '+(habit.reminderEnabled===true?'checked':'')+'> Enable daily phone reminders</label>'+
      '<label>Reminder time <input id="hfReminderTime" type="time" value="'+esc(habit.reminderTime||'')+'"></label>'+
      '<div class="hf-form-note">Daily reminders repeat until you turn them off. Enable Daily Life notifications on this device to receive them.</div></div>';
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
    var date=today(),entry=s.habitLogs.find(function(x){return x&&String(x.habitId)===String(id)&&x.localDate===date}),oldStatus=entry?.status||"";
    if(entry){entry.status=status;entry.updatedAt=new Date().toISOString()}
    else {entry={id:(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():"habit-log-"+Date.now(),habitId:id,localDate:date,status:status,createdAt:new Date().toISOString()};s.habitLogs.push(entry)}
    try{
      await save();render();
      if((status==="done"||status==="partial")&&oldStatus!==status&&typeof window.dailyLifeShowCompletionFeedback==="function"){
        var habit=s.habits.find(function(h){return String(h.id)===String(id)}),activeHabits=s.habits.filter(function(h){return h&&h.status!=="paused"&&h.status!=="archived"});
        var practiced=activeHabits.filter(function(h){var log=logOn(h.id,date);return log&&(log.status==="done"||log.status==="partial")}).length;
        if(status==="done"&&activeHabits.length&&practiced===activeHabits.length)window.dailyLifeShowCompletionFeedback("All today’s habits practiced","You showed up for each one. That counts.");
        else window.dailyLifeShowCompletionFeedback(status==="done"?"Habit complete":"Progress logged",status==="done"?(habit?.name||"A small practice"):(habit?.name||"A small practice")+" — the small version counts.");
      }
    }catch(error){
      if(oldStatus){entry.status=oldStatus}else{s.habitLogs=s.habitLogs.filter(function(x){return x!==entry})}
      alert("That habit check-in could not be saved. Please try again.");
      render();
    }
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
    seedRequestedStarterHabits();
    var old=main.querySelector("[data-habit-focus]"),bar=main.querySelector("[data-habit-quickbar]"),header=main.querySelector(":scope > header");
    if(bar)bar.remove();
    if(!area){if(old)old.remove();return}
    if(old&&old.dataset.area===area)return;
    var panelHtml=renderPanel(area);
    if(old)old.outerHTML=panelHtml;
    else if(header)header.insertAdjacentHTML("afterend",panelHtml);
    else main.insertAdjacentHTML("afterbegin",panelHtml);
  }
  function handleClick(event){
    var button=event.target&&event.target.closest?event.target.closest("[data-hf-action]"):null;
    if(!button)return;
    var action=button.dataset.hfAction,id=button.dataset.habitId;
    if(action==="quick-toggle"){quickBarOpen=!quickBarOpen;mount()}
    else if(action==="reopen-checkin"&&typeof window.openDailyHabitCheckin==="function")window.openDailyHabitCheckin()
    else if(action==="add")openCreate(button.dataset.area||"");
    else if(action==="edit")openEdit(id);
    else if(action==="pause")setPaused(id,true);
    else if(action==="resume")setPaused(id,false);
    else if(action==="stop-reminder")setReminder(id,false);
    else if(action==="log")logHabit(id,button.dataset.status);
    else if(action==="preset-water")addWaterPreset()
  }

  var dailyCheckinNode=null,dailyCheckinTimer=null;
  function closeDailyCheckin(markDone){
    if(markDone){
      try{localStorage.setItem("dailyLifeQuickCheckinDone-"+today(),"1")}catch(e){}
    }
    if(dailyCheckinNode){dailyCheckinNode.remove();dailyCheckinNode=null}
  }
  function deferDailyCheckin(){
    var now=new Date(),later=new Date(now);
    later.setHours(20,0,0,0);
    if(later<=now)later=new Date(now.getTime()+60*60*1000);
    var key="dailyLifeQuickCheckinSnooze-"+today(),until=later.getTime();
    try{localStorage.setItem(key,String(until))}catch(e){}
    if(dailyCheckinNode){dailyCheckinNode.remove();dailyCheckinNode=null}
    if(dailyCheckinTimer)clearTimeout(dailyCheckinTimer);
    dailyCheckinTimer=setTimeout(function(){dailyCheckinTimer=null;tryShowDailyCheckin()},Math.max(1000,until-Date.now()));
  }
  function renderDailyCheckin(){
    var s=appState();if(!s||!dailyCheckinNode)return;
    var date=today(),active=s.habits.filter(function(h){return h&&h.status!=="paused"&&h.status!=="archived"});
    var missing=active.filter(function(h){return !logOn(h.id,date)});
    if(!missing.length){closeDailyCheckin(true);return}
    var rows=missing.map(function(h){
      return '<article class="dl-quickcheck-row"><div><strong>'+esc(h.name||"Daily habit")+'</strong>'+(h.minimum?'<small>'+esc(h.minimum)+'</small>':"")+'</div><div class="dl-quickcheck-actions"><button type="button" data-dlc-status="done" data-dlc-id="'+esc(h.id)+'">Yes</button><button type="button" data-dlc-status="skipped" data-dlc-id="'+esc(h.id)+'">No, not today</button><button type="button" data-dlc-later>Not yet</button></div></article>'
    }).join("");
    dailyCheckinNode.innerHTML='<div class="dl-quickcheck-shade"><section class="dl-quickcheck" role="dialog" aria-modal="true" aria-labelledby="dl-quickcheck-title"><button type="button" class="dl-quickcheck-close" data-dlc-later aria-label="Ask me later">×</button><p class="dl-quickcheck-kicker">A quick daily check-in</p><h2 id="dl-quickcheck-title">Did you do these today?</h2><p class="dl-quickcheck-note"><b>'+missing.length+' habit'+(missing.length===1?"":"s")+' left to review.</b> Answers save one at a time; the remaining habits stay here. “Not yet” brings this back at 8 PM, or in an hour if it’s already later.</p>'+rows+'<button type="button" class="dl-quickcheck-skip" data-dlc-close>Skip for today</button></section></div>';
  }
  window.openDailyHabitCheckin=function(){
    var date=today();
    try{
      localStorage.removeItem("dailyLifeQuickCheckinDone-"+date);
      localStorage.removeItem("dailyLifeQuickCheckinSnooze-"+date);
    }catch(e){}
    if(dailyCheckinTimer){clearTimeout(dailyCheckinTimer);dailyCheckinTimer=null}
    tryShowDailyCheckin();
  };
  function tryShowDailyCheckin(){
    if(typeof appStartupReady==="undefined"||!appStartupReady)return;
    var s=appState();if(!s||!Array.isArray(s.habits)||!s.habits.length)return;
    var date=today(),key="dailyLifeQuickCheckinDone-"+date,snoozeKey="dailyLifeQuickCheckinSnooze-"+date;
    try{
      if(localStorage.getItem(key))return;
      var snoozeUntil=Number(localStorage.getItem(snoozeKey)||0);
      if(snoozeUntil>Date.now()){
        if(!dailyCheckinTimer)dailyCheckinTimer=setTimeout(function(){dailyCheckinTimer=null;tryShowDailyCheckin()},Math.max(1000,snoozeUntil-Date.now()));
        return;
      }
    }catch(e){}
    if(dailyCheckinNode&&dailyCheckinNode.isConnected){renderDailyCheckin();return}
    if(!s.habits.some(function(h){return h&&h.status!=="paused"&&h.status!=="archived"&&!logOn(h.id,date)}))return;
    dailyCheckinNode=document.createElement("div");
    dailyCheckinNode.id="dailyLifeQuickCheckin";
    dailyCheckinNode.addEventListener("click",function(event){
      var later=event.target.closest("[data-dlc-later]");
      if(later){deferDailyCheckin();return}
      var close=event.target.closest("[data-dlc-close]");
      if(close){closeDailyCheckin(true);return}
      var button=event.target.closest("[data-dlc-status]");
      if(!button)return;
      var id=button.dataset.dlcId,status=button.dataset.dlcStatus;
      button.disabled=true;
      Promise.resolve(logHabit(id,status)).then(function(){renderDailyCheckin()}).catch(function(error){button.disabled=false;console.error("Could not save daily check-in.",error)});
    });
    document.body.appendChild(dailyCheckinNode);
    renderDailyCheckin();
  }
  if(!document.getElementById("dailyLifeQuickCheckinStyles")){
    var quickStyle=document.createElement("style");quickStyle.id="dailyLifeQuickCheckinStyles";quickStyle.textContent=`
      .dl-quickcheck-shade{position:fixed;inset:0;z-index:2147482000;background:rgba(48,35,59,.42);display:grid;place-items:center;padding:18px}
      .dl-quickcheck{position:relative;width:min(100%,520px);max-height:min(82vh,720px);overflow:auto;border-radius:26px;background:#fffafd;color:#30233b;padding:24px 20px 18px;box-shadow:0 18px 60px rgba(48,35,59,.28)}
      .dl-quickcheck-kicker{margin:0 38px 6px 0;color:#95617f;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .dl-quickcheck h2{margin:0 38px 8px 0;font-size:1.45rem}
      .dl-quickcheck-note{margin:0 0 16px;color:#766b7a;line-height:1.45}
      .dl-quickcheck-close{position:absolute;right:12px;top:10px;width:40px;height:40px;border:0;border-radius:50%;background:#f7eaf2;color:#30233b;font-size:1.55rem}
      .dl-quickcheck-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid #eadde7}
      .dl-quickcheck-row strong{display:block}
      .dl-quickcheck-row small{display:block;margin-top:4px;color:#766b7a;line-height:1.35}
      .dl-quickcheck-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .dl-quickcheck-actions button,.dl-quickcheck-skip{border:1px solid #cbb6c8;border-radius:999px;background:#fff;color:#49384d;padding:9px 13px;font:inherit;font-weight:750}
      .dl-quickcheck-actions button:first-child{background:#dff1e7;border-color:#b9d9c8}
      .dl-quickcheck-skip{display:block;margin:16px auto 0;background:#f7eaf2}
      @media(max-width:440px){.dl-quickcheck-row{grid-template-columns:1fr}.dl-quickcheck-actions{justify-content:flex-start}}
    `;document.head.appendChild(quickStyle);
  }

  function start(){
    var root=document.querySelector("#app");
    if(!root)return;
    root.addEventListener("click",handleClick);
    var observer=new MutationObserver(function(){mount();tryShowDailyCheckin()});
    observer.observe(root,{childList:true,subtree:true});
    mount();tryShowDailyCheckin()
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();