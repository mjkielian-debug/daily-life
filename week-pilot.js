/* Daily Life · Week Pilot
   A seven-day planning view and a conservative balancer for flexible quick-capture tasks. */
(function(){
  "use strict";

  function wpShift(date,days){return typeof shiftDateString==="function"?shiftDateString(date,days):(function(){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return ymd(d)})()}
  function wpDates(start=ymd()){return Array.from({length:7},(_,i)=>wpShift(start,i))}
  function wpWorkday(date){
    const days=(state.settings?.itinerary?.workWeekdays||[2,3,4,5,6]).map(Number);
    return days.includes(new Date(date+"T12:00:00").getDay());
  }
  function wpMinutes(start,end){
    const s=hmMinutes(start),e=hmMinutes(end);return s!==null&&e!==null&&e>s?e-s:0;
  }
  function wpDayLoad(date){
    const fixed=typeof itineraryFixedItems==="function"?itineraryFixedItems(date):[],
      fixedMinutes=fixed.reduce((n,x)=>n+Math.max(15,wpMinutes(x.start,x.end)||Number(x.estimatedMinutes||15)),0),
      tasks=(state.tasks||[]).filter(t=>!t.done&&t.date===date),
      taskMinutes=tasks.reduce((n,t)=>n+(typeof itineraryTaskMinutes==="function"?itineraryTaskMinutes(t):20),0),
      events=(state.events||[]).filter(e=>e.date===date&&e.status!=="cancelled").length,
      meal=typeof mealForDate==="function"?mealForDate(date):null,
      sleep=typeof itinerarySleepPlan==="function"?itinerarySleepPlan(date):null,
      score=fixedMinutes+taskMinutes;
    return{date,fixed,fixedMinutes,tasks,taskMinutes,events,meal,sleep,score,workday:wpWorkday(date)};
  }
  function wpLoadLabel(x){
    if(x.score>=600)return"Packed";
    if(x.score>=420)return"Full";
    if(x.score>=240)return"Steady";
    return"Light";
  }
  function wpDayName(date){return new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"})}
  function wpDateNum(date){return new Date(date+"T12:00:00").getDate()}

  function wpPrepItems(){
    const today=ymd(),end=wpShift(today,7),items=[];
    for(const b of state.bills||[]){
      if(b.status==="paid"||b.paymentPending||!b.due||b.due<today||b.due>end)continue;
      const setup=typeof recordedBillSetup==="function"?recordedBillSetup(b):String(b.paymentSetup||"Unknown");
      if(["Manual","Unknown"].includes(setup))items.push({kind:"money",title:"Bill needs attention · "+(b.name||"Bill"),detail:"Due "+dl(b.due)+(Number.isFinite(Number(b.amount))?" · "+money(b.amount):""),date:b.due,action:"bill",id:b.id});
    }
    for(const a of state.schoolAssignments||[]){
      if(!["missing","due"].includes(String(a.status||"").toLowerCase())||!a.due||a.due<today||a.due>end)continue;
      items.push({kind:"school",title:(a.child?a.child+" · ":"")+(a.title||"School assignment"),detail:(a.course?a.course+" · ":"")+"Due "+dl(a.due),date:a.due,action:"family",id:a.id});
    }
    for(const date of wpDates(today)){
      const m=typeof mealForDate==="function"?mealForDate(date):null;
      if(!m?.dish&&date>=today)items.push({kind:"food",title:"Dinner open · "+wpDayName(date),detail:"No dinner is planned yet",date,action:"meal",id:date});
    }
    const tomorrow=wpShift(today,1);
    for(const e of (state.events||[]).filter(e=>e.date===tomorrow&&e.status!=="cancelled"&&e.startTime&&e.startTime<"09:00")){
      items.push({kind:"time",title:"Early tomorrow · "+e.title,detail:fmtClock(e.startTime)+(e.child?" · "+e.child:""),date:tomorrow,action:"event",id:e.id});
    }
    return items.sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,10);
  }

  function wpOpenItem(action,id){
    if(action==="bill"&&typeof openBill==="function")return openBill(id);
    if(action==="family"){setView("family");return}
    if(action==="meal"&&typeof openMeal==="function")return openMeal(id);
    if(action==="event"&&typeof openEvent==="function")return openEvent("",id);
  }
  window.weekPilotOpenItem=function(action,id){if(typeof closeModal==="function")closeModal();wpOpenItem(action,id)};

  function wpBalanceSuggestions(){
    const dates=wpDates(),loads=new Map(dates.map(d=>[d,wpDayLoad(d)])),
      candidates=(state.tasks||[]).filter(t=>!t.done&&dates.includes(t.date)&&t.generated==="quick-capture"&&!t.itineraryStart&&["life","home"].includes(String(t.category||"life"))),
      suggestions=[];
    for(const t of candidates){
      const current=loads.get(t.date),mins=typeof itineraryTaskMinutes==="function"?itineraryTaskMinutes(t):20;
      let best={date:t.date,score:current?.score??9999};
      for(const date of dates){
        const load=loads.get(date);if(!load)continue;
        let adjusted=load.score+(date===t.date?0:mins);
        if(!load.workday)adjusted-=45;
        if(adjusted<best.score-30)best={date,score:adjusted};
      }
      if(best.date!==t.date){
        suggestions.push({task:t,from:t.date,to:best.date,minutes:mins,fromLoad:current?.score||0,toLoad:loads.get(best.date)?.score||0});
        loads.get(t.date).score=Math.max(0,loads.get(t.date).score-mins);
        loads.get(best.date).score+=mins;
      }
    }
    return suggestions;
  }

  window.openWeekBalance=function(){
    const suggestions=wpBalanceSuggestions();
    if(!suggestions.length){
      modal("Balance flexible tasks",'<div class="notice"><b>No obvious moves right now.</b><div class="muted small">Week Pilot only moves quick-captured home/life tasks without an exact time. School, bills, appointments, shared commitments, and manually timed tasks stay where you put them.</div></div>',"Close",closeModal);
      return;
    }
    modal("Balance flexible tasks",'<div class="stack"><div class="notice"><b>These are suggestions, not automatic changes.</b><div class="muted small">Only flexible quick-capture home/life tasks are considered.</div></div>'+
      suggestions.map((s,i)=>'<label class="week-move"><input class="weekMove" type="checkbox" value="'+i+'" checked><span><b>'+esc(s.task.title)+'</b><small>'+esc(dl(s.from))+' → '+esc(dl(s.to))+' · '+s.minutes+' min</small></span></label>').join("")+
      '</div>',"Apply selected moves",async()=>{
        const picked=new Set([...document.querySelectorAll(".weekMove:checked")].map(x=>Number(x.value)));
        suggestions.forEach((s,i)=>{if(picked.has(i))s.task.date=s.to});
        await save();closeModal();render();
      });
  };

  window.weekPilotGoDay=function(date){
    if(typeof closeModal==="function")closeModal();
    if(typeof setItineraryDate==="function"){setItineraryDate(date);setView("itinerary");}
  };

  function weekPilotCard(){
    const days=wpDates().map(wpDayLoad),prep=wpPrepItems(),moves=wpBalanceSuggestions();
    return '<div class="card week-pilot">'+
      '<div class="section-title"><div><div class="eyebrow">Week Pilot</div><h2>See the pressure before it becomes today</h2><div class="muted small">Work, fixed commitments, open tasks, dinner, and sleep windows across the next seven days.</div></div><div class="actions"><button class="btn primary" onclick="closeModal();openWeekBalance()">Balance flexible tasks'+(moves.length?" · "+moves.length:"")+'</button></div></div>'+
      '<div class="week-orbits">'+days.map(d=>
        '<button class="week-orbit '+(d.date===ymd()?"is-today":"")+'" onclick="weekPilotGoDay(\''+d.date+'\')">'+
          '<span>'+esc(wpDayName(d.date))+'</span><b>'+wpDateNum(d.date)+'</b><strong>'+esc(wpLoadLabel(d))+'</strong>'+
          '<small>'+(d.workday?"UPS day":"off day")+' · '+d.events+' event'+(d.events===1?"":"s")+'</small>'+
          '<em>'+(d.meal?.dish?"dinner ✓":"dinner ?")+'</em>'+
        '</button>'
      ).join("")+'</div>'+
      (prep.length?'<details class="week-prep"><summary>'+prep.length+' thing'+(prep.length===1?"":"s")+' worth preparing for</summary>'+prep.map(x=>
        '<button onclick="weekPilotOpenItem(\''+x.action+'\',\''+x.id+'\')"><span class="week-prep-dot week-'+esc(x.kind)+'"></span><span><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></span><span>›</span></button>'
      ).join("")+'</details>':'<div class="notice">Nothing obvious needs pre-planning in the next seven days.</div>')+
      '</div>';
  }

  window.openWeekPilot=function(){
    modal("Week Pilot",weekPilotCard(),"Close",closeModal);
  };

  const baseItinerary=itineraryView;
  function legacyWeekPilotItineraryView(){
    return baseItinerary.apply(this,arguments)+weekPilotCard();
  }

  if(typeof render==="function")render();
})();