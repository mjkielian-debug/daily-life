/* Daily Life · protect workdays and keep Day Flow interactive.
   Workdays reserve the day through school pickup; home tasks start at 3:30 PM. */
(function(){
  "use strict";
  if(typeof itineraryFixedItems!=="function"||typeof itineraryDayItems!=="function")return;
  const homeStart=15*60+30;
  const workWords=/\b(ups|preload|pre-load|ssd|seasonal support driver|delivery route|driver delivery|work shift|workday|route)\b/i;
  const pickupWords=/\b(pick\s*up|pickup|school pickup|drive to school pickup|park\s*\+\s*wait)\b/i;
  const isWorkday=date=>typeof isUsualWorkday==="function"&&isUsualWorkday(date);
  const localToday=()=>typeof ymd==="function"?ymd():new Date().toISOString().slice(0,10);
  const homeConfirmed=date=>!!(typeof state!=="undefined"&&state?.settings?.workdayHomeConfirmed?.[String(date)]);
  window.isDailyLifeWorkday=isWorkday;
  window.isDailyLifeHomeConfirmed=homeConfirmed;
  window.confirmDailyLifeHomeArrival=async function(date){
    date=String(date||localToday());
    if(!isWorkday(date)||typeof state==="undefined"||!state)return false;
    state.settings=state.settings||{};
    const previous=state.settings.workdayHomeConfirmed;
    const next=Object.assign({},previous||{});
    next[date]=true;
    state.settings.workdayHomeConfirmed=next;
    try{
      if(typeof save==="function")await save();
      if(typeof render==="function")render();
      return true;
    }catch(error){
      if(previous===undefined)delete state.settings.workdayHomeConfirmed;
      else state.settings.workdayHomeConfirmed=previous;
      if(typeof modal==="function")modal("Could not save home arrival",'<div class="stack"><p>Your schedule was not changed. Try again when the app can save.</p></div>',"Close",closeModal);
      return false;
    }
  };
  const isWorkItem=item=>item&&(item.source==="work"||item.kind==="work"||workWords.test([item.title,item.detail].filter(Boolean).join(" ")));
  const isPickupItem=item=>item&&(item.source==="pickup"||pickupWords.test(String(item.title||"")));
  const isWorkTask=task=>task&&(
    String(task.category||"").toLowerCase()==="work"||
    workWords.test([task.title,task.notes,task.category].filter(Boolean).join(" "))
  );
  const previousFixed=itineraryFixedItems;
  itineraryFixedItems=function(date){
    const rows=previousFixed(date);
    if(!isWorkday(date))return rows;
    const workRows=rows.filter(isWorkItem);
    const pickupStarts=rows.filter(isPickupItem).map(item=>hmMinutes(item.start)).filter(value=>value!==null);
    const inferred=typeof inferredWorkStartForDate==="function"?inferredWorkStartForDate(date):null;
    const fallbackStart=inferred&&Number.isFinite(inferred.minutes)?inferred.minutes:hmMinutes("04:45");
    const safeEnd=start=>{
      const firstPickup=pickupStarts.filter(value=>value>start).sort((a,b)=>a-b)[0];
      return firstPickup!==undefined?firstPickup:15*60;
    };
    if(!workRows.length){
      const end=safeEnd(fallbackStart);
      rows.push({
        id:"workday-protection:"+date,
        start:minutesHm(fallbackStart),end:minutesHm(Math.max(fallbackStart+15,end)),
        title:"UPS work · delivery day",
        detail:"Open-ended UPS delivery work · shift end is unknown. School pickup stays at 2:52 PM; Tanner is the fallback if you are still on route. Home tasks stay hidden until you are home.",
        fixed:true,kind:"work",icon:"📦",source:"work",actor:"me",estimatedEnd:true
      });
    }else{
      workRows.forEach(item=>{
        const start=hmMinutes(item.start);
        if(start===null)return;
        if(!item.end||item.endUnknown){
          item.end=minutesHm(Math.max(start+15,safeEnd(start)));
          item.endUnknown=false;
          item.estimatedEnd=true;
          item.detail=[item.detail,"Shift end not entered · school pickup stays fixed at 2:52 PM; Tanner is the fallback if you are still on route."].filter(Boolean).join(" · ");
        }
      });
    }
    return rows.sort((a,b)=>(hmMinutes(a.start)??0)-(hmMinutes(b.start)??0));
  };
  const previousRange=itineraryTaskPreferredRange;
  if(typeof previousRange==="function"){
    itineraryTaskPreferredRange=function(task,date){
      const range=previousRange(task,date);
      if(!range||!isWorkday(date)||isWorkTask(task))return range;
      const dayEnd=typeof itineraryDayEnd==="function"?itineraryDayEnd(date):range.end;
      const start=Math.max(homeStart,range.start);
      const end=range.end<=homeStart?dayEnd:Math.min(dayEnd,Math.max(range.end,start+itineraryTaskMinutes(task)));
      return start<end?{start,end}:null;
    };
  }
  const previousAuto=itineraryAutoTaskBlocks;
  if(typeof previousAuto==="function"){
    itineraryAutoTaskBlocks=function(date,baseItems){
      if(!isWorkday(date))return previousAuto(date,baseItems);
      const moved=[];
      for(const task of state.tasks||[]){
        const start=hmMinutes(task.itineraryStart);
        if(start!==null&&start<homeStart&&!isWorkTask(task)){
          moved.push([task,task.itineraryStart]);
          task.itineraryStart="";
        }
      }
      try{return previousAuto(date,baseItems)}
      finally{moved.forEach(([task,start])=>{task.itineraryStart=start})}
    };
  }
  const previousWindow=itineraryRoutineWindow;
  if(typeof previousWindow==="function"){
    itineraryRoutineWindow=function(item,date){
      const range=previousWindow(item,date);
      if(!range||!isWorkday(date)||/^work-/.test(String(item?.templateKey||"")))return range;
      const dayEnd=typeof itineraryDayEnd==="function"?itineraryDayEnd(date):range.end;
      return {start:Math.max(homeStart,range.start),end:Math.max(homeStart,Math.min(dayEnd,Math.max(range.end,homeStart+30)))};
    };
  }
  const previousFit=itineraryFitRoutines;
  if(typeof previousFit==="function"){
    itineraryFitRoutines=function(date,blockingItems,routines){
      const rows=previousFit(date,blockingItems,routines);
      if(!isWorkday(date))return rows;
      return rows.filter(item=>/^work-/.test(String(item.templateKey||""))||hmMinutes(item.start)>=homeStart||/^tanner\s*[·:–-]\s*/i.test(String(item.title||"")));
    };
  }
  const previousDayItems=itineraryDayItems;
  itineraryDayItems=function(date){
    const rows=previousDayItems(date);
    if(!isWorkday(date))return rows;
    const currentDay=String(date)===String(localToday());
    const holdHomeTasks=currentDay&&!homeConfirmed(date);
    return rows.filter(item=>{
      const start=hmMinutes(item.start);
      const protectedItem=isWorkItem(item)||isPickupItem(item)||item.source==="event"||item.source==="context"||item.kind==="context"||item.kind==="tentative";
      if(currentDay&&isPickupItem(item)){
        const fallback="2:52 PM stays fixed; if you are still on route, text Tanner to pick up.";
        if(!String(item.detail||"").includes(fallback))item.detail=[item.detail,fallback].filter(Boolean).join(" · ");
      }
      if(start!==null&&start<homeStart&&!protectedItem)return false;
      if(holdHomeTasks&&start!==null&&start>=homeStart&&!protectedItem&&item.kind!=="gap")return false;
      return true;
    }).sort((a,b)=>(hmMinutes(a.start)??0)-(hmMinutes(b.start)??0)||(a.kind==="gap"?1:-1));
  };
})();