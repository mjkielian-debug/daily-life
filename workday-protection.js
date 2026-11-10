/* Daily Life · protect workdays and keep Day Flow interactive.
   Workdays reserve the day through school pickup; home tasks start at 3:30 PM. */
(function(){
  "use strict";
  if(typeof itineraryFixedItems!=="function"||typeof itineraryDayItems!=="function")return;
  const homeStart=15*60+30;
  const workWords=/\b(ups|preload|pre-load|ssd|seasonal support driver|delivery route|driver delivery|work shift|workday|route)\b/i;
  const pickupWords=/\b(pick\s*up|pickup|school pickup|drive to school pickup|park\s*\+\s*wait)\b/i;
  const isWorkday=date=>typeof isUsualWorkday==="function"&&isUsualWorkday(date);
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
        detail:"Usual workday protected. Home tasks stay off Day Flow until school pickup; estimated end because today’s shift is not entered.",
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
          item.detail=[item.detail,"Shift end not entered · home tasks remain off the schedule until pickup."].filter(Boolean).join(" · ");
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
    return rows.filter(item=>{
      const start=hmMinutes(item.start);
      if(start===null||start>=homeStart)return true;
      return isWorkItem(item)||isPickupItem(item)||item.source==="event"||item.source==="context"||item.kind==="context"||item.kind==="tentative";
    }).sort((a,b)=>(hmMinutes(a.start)??0)-(hmMinutes(b.start)??0)||(a.kind==="gap"?1:-1));
  };
})();