/* Daily Life · quick workday focus for shifts and delivery days. */
(function(){
  "use strict";
  var workPattern=/\b(ups|preload|pre-load|ssd|seasonal support driver|delivery route|driver delivery|work shift|workday|route)\b/i;
  function today(){return typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10)}
  function clock(x){return typeof fmtClock==="function"?fmtClock(x):String(x||"")}
  function workItems(){
    try{
      var rows=typeof itineraryDayItems==="function"?itineraryDayItems(today()):[];
      return rows.filter(function(x){return workPattern.test([x.title,x.detail,x.kind,x.category].filter(Boolean).join(" "))})
        .sort(function(a,b){return String(a.start||"").localeCompare(String(b.start||""))});
    }catch(e){return []}
  }
  function nextOther(items){
    var now=new Date(),mins=now.getHours()*60+now.getMinutes();
    return items.find(function(x){
      if(workPattern.test([x.title,x.detail,x.kind,x.category].filter(Boolean).join(" "))||!["event","tentative"].includes(String(x.kind||"").toLowerCase()))return false;
      var end=typeof hmMinutes==="function"?hmMinutes(x.end):null,start=typeof hmMinutes==="function"?hmMinutes(x.start):null;
      return (end!==null&&end>mins)||(start!==null&&start>=mins);
    })||null;
  }
  function escapeHtml(value){return typeof esc==="function"?esc(String(value)):String(value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function weekStartDate(){
    const date=today(),weekday=new Date(date+"T12:00:00").getDay();
    return typeof shiftDateString==="function"?shiftDateString(date,-weekday):date;
  }
  function dateName(date){
    return new Date(String(date)+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  }
  window.openWeeklyWorkSchedule=function(){
    const start=weekStartDate(),dates=Array.from({length:7},(_,i)=>shiftDateString(start,i)),
      review=state.settings?.itinerary?.workScheduleReviews?.[start]||{},
      weekday=new Date(today()+"T12:00:00").getDay();
    const rows=dates.map(function(date,i){
      const shift=(state.workShifts||[]).find(function(row){return row.date===date})||{},
        override=state.settings?.itinerary?.workScheduleOverrides?.[date],
        planned=override&&typeof override.workday==="boolean"?override.workday:
          (typeof isUsualWorkday==="function"&&isUsualWorkday(date))||!!(shift.scheduled||shift.start||shift.end);
      return '<article class="card" style="margin:0;padding:12px"><div class="section-title"><b>'+escapeHtml(dateName(date))+'</b>'+
        (shift.start||shift.end?'<small class="muted">Actual punches saved separately</small>':'')+'</div>'+
        '<label class="task"><input type="checkbox" id="weeklyWorkday'+i+'" '+(planned?'checked':'')+'><span>Work shift planned</span></label>'+
        '<label>Scheduled start<input type="time" id="weeklyWorkStart'+i+'" value="'+escapeHtml(shift.scheduled||'')+'"></label></article>';
    }).join("");
    const prompt=weekday===0
      ?'<div class="notice"><b>Sunday schedule check-in</b><div class="muted small">Review the posted schedule and confirm the shifts for this week. Change any day later if UPS updates it.</div></div>'
      :weekday===3
        ?'<div class="notice"><b>Midweek check-in</b><div class="muted small">Are these shifts still accurate? Adjust any changed day, or confirm below.</div><button type="button" class="btn" onclick="markWeeklyScheduleAccurate(\''+start+'\')">✓ Yes, still accurate</button></div>'
        :'<div class="notice"><b>This week · Sunday–Saturday</b><div class="muted small">'+(review.sundayConfirmedAt?'Sunday review saved. Update changed shifts here.':'Review the posted schedule and save the shifts you know.')+' Scheduled starts stay separate from actual punch times.</div></div>';
    const body='<div class="stack weekly-work-schedule">'+prompt+
      '<div class="muted small">Enter scheduled starts from your UPS schedule. Actual punch-in/out, SSD hours, and route miles are kept unchanged.</div>'+rows+'</div>';
    modal("Weekly work schedule",body,"Save shifts",function(){saveWeeklyWorkSchedule(start,dates)});
  };
  window.markWeeklyScheduleAccurate=async function(start){
    const itinerary=state.settings.itinerary=state.settings.itinerary||{},
      reviews=itinerary.workScheduleReviews=itinerary.workScheduleReviews||{},
      row=reviews[start]||{},now=new Date().toISOString();
    reviews[start]=Object.assign({},row,{weekStart:start,midweekConfirmedAt:now,updatedAt:now});
    try{await save();closeModal();render()}
    catch(error){modal("Could not save schedule review",'<div class="stack"><p>Your schedule review was not saved. Try again when the app can save.</p></div>',"Close",closeModal)}
  };
  window.saveWeeklyWorkSchedule=async function(start,dates){
    const now=new Date().toISOString(),itinerary=state.settings.itinerary=state.settings.itinerary||{},
      overrides=itinerary.workScheduleOverrides=Object.assign({},itinerary.workScheduleOverrides||{}),
      reviews=itinerary.workScheduleReviews=itinerary.workScheduleReviews||{},
      weekday=new Date(today()+"T12:00:00").getDay(),review=reviews[start]||{};
    dates.forEach(function(date,i){
      const working=!!document.getElementById("weeklyWorkday"+i)?.checked,
        scheduled=String(document.getElementById("weeklyWorkStart"+i)?.value||""),
        existing=(state.workShifts||[]).find(function(row){return row.date===date});
      overrides[date]={workday:working,updatedAt:now,source:"weekly-review"};
      let shift=existing;
      if(working){
        if(!shift){shift={id:typeof uid==="function"?uid():"schedule-"+date,date:date};state.workShifts.push(shift)}
        if(scheduled)shift.scheduled=scheduled;
        shift.scheduleSource="weekly-review";shift.scheduleUpdatedAt=now;
      }else if(shift&&!workShiftHasActual(shift)){
        shift.scheduled="";shift.scheduleSource="weekly-review";shift.scheduleUpdatedAt=now;
      }
    });
    reviews[start]=Object.assign({},review,{weekStart:start,confirmedAt:now,updatedAt:now,
      ...(weekday===0?{sundayConfirmedAt:now}:{}),...(weekday===3?{midweekConfirmedAt:now}:{})});
    try{await save();closeModal();render()}
    catch(error){modal("Could not save weekly schedule",'<div class="stack"><p>Your changes were not saved. Try again when the app can save.</p></div>',"Close",closeModal)}
  };
  function open(){
    var all=[];
    try{all=typeof itineraryDayItems==="function"?itineraryDayItems(today()):[]}catch(e){}
    var shifts=workItems(),next=nextOther(all);
    var rows=shifts.length?shifts.map(function(x){
      return '<div class="dl-work-focus-row"><span class="dl-work-focus-time">'+escapeHtml(clock(x.start))+(x.end?'–'+escapeHtml(clock(x.end)):'')+'</span><span><span class="dl-work-focus-title">'+escapeHtml(String(x.icon||"↗ ")+" "+String(x.title||"Work"))+'</span>'+(x.detail?'<div class="dl-work-focus-note">'+escapeHtml(x.detail)+'</div>':'')+'</span></div>';
    }).join(""):'<div class="dl-work-focus-note">No UPS or delivery block is on today’s Day Flow. Your other appointments and saved information are unchanged.</div>';
    var nextHtml=next?'<div class="dl-work-focus-row"><span class="dl-work-focus-time">'+escapeHtml(clock(next.start))+'</span><span><span class="dl-work-focus-title">'+escapeHtml(next.title||"Next item")+'</span><div class="dl-work-focus-note">'+escapeHtml(next.detail||"Next scheduled commitment")+'</div></span></div>':'<div class="dl-work-focus-note">No later scheduled commitment is listed today.</div>';
    var homeAction="";
    if(typeof window.isDailyLifeWorkday==="function"&&window.isDailyLifeWorkday(today())){
      homeAction=window.isDailyLifeHomeConfirmed?.(today())
        ?'<div class="dl-work-focus-note">Home arrival is recorded for today; eligible home tasks can appear in Day Flow.</div>'
        :'<div class="dl-work-focus-note">Today’s home tasks stay off Day Flow until you are home.</div><button class="btn primary" type="button" onclick="confirmDailyLifeHomeArrival(\''+escapeHtml(today())+'\')">I’m home · show home tasks</button>';
    }
    var body='<div class="dl-work-focus-content"><button class="btn" type="button" onclick="closeModal();openWeeklyWorkSchedule()">Review this week’s shifts</button><div class="dl-work-focus-section"><b>Work and route</b>'+rows+'</div><div class="dl-work-focus-section"><b>Next important item</b>'+nextHtml+'</div>'+homeAction+'<button class="btn" type="button" onclick="closeModal();setView(\'itinerary\')">Open full Day Flow</button></div>';
    if(typeof modal==="function")modal("Workday focus",body,"Close",closeModal);
  }
  function mount(){
    var header=document.querySelector("#app main.app > header"),tools=header&&header.querySelector(".header-tools");
    if(!tools||tools.querySelector(".dl-work-focus-button"))return;
    var button=document.createElement("button");button.type="button";button.className="btn small dl-work-focus-button";button.textContent="↗";button.title="Workday focus";button.setAttribute("aria-label","Workday focus");button.addEventListener("click",open);
    tools.insertBefore(button,tools.querySelector(".settings-btn")||null);
  }
  var root=document.querySelector("#app");
  if(root)new MutationObserver(mount).observe(root,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();