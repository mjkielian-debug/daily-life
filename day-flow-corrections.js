/* Daily Life · Day Flow corrections · 2026-10-25 */
(function(){
  "use strict";
  const baseSuggested = itinerarySuggestedBlocks;
  itinerarySuggestedBlocks = function(date){
    const rows = baseSuggested(date);
    const meal = typeof mealForDate === "function" ? mealForDate(date) : null;
    const weekday = new Date(String(date) + "T12:00:00").getDay();
    for(const r of state.petCareRoutines || []){
      if(r.active === false || String(r.nextDate || "") !== String(date)) continue;
      const pet = r.petId && typeof petById === "function" ? petById(r.petId) : null;
      if(pet?.status === "Archived") continue;
      const title = String(r.title || "Pet care");
      const alreadyTasked = (state.tasks || []).some(t =>
        t.date === date && !t.done &&
        /flea|medicat|preventive care/.test(String(t.title || "") + " " + String(t.notes || "")) &&
        /flea|medicat|preventive care/.test(title.toLowerCase())
      );
      if(alreadyTasked) continue;
      const at = hmMinutes(r.notifyTime || "09:00");
      const start = Math.max(itineraryDayStart(date), at === null ? 9 * 60 : at);
      const end = Math.min(itineraryDayEnd(date), start + 10);
      if(end <= start) continue;
      rows.push({
        templateKey:"pet-care:" + r.id, start:minutesHm(start), end:minutesHm(end),
        title:title, detail:[pet?.name || "Shared pet care", r.notes || "Due today"].filter(Boolean).join(" · "),
        icon:"🐾"
      });
    }
    // When the saved day has a custody return anchor, do not place a child's
    // routines before the children are actually back home.
    const returnAnchor = (typeof itineraryFixedItems === "function" ? itineraryFixedItems(date) : [])
      .filter(x => /kids? home from dad|kids? return home|home from dad/i.test(String(x.title || "")))
      .map(x => hmMinutes(x.start)).filter(x => x !== null).sort((a,b)=>a-b)[0];
    if(returnAnchor !== undefined){
      for(let i=rows.length-1;i>=0;i--){
        const item=rows[i], start=hmMinutes(item.start);
        const childMention=/\b(kids?|children|leo|dolly|ambrose|demitri|tree)\b/i.test(String(item.title||"")+" "+String(item.detail||""));
        if(childMention && start !== null && start < returnAnchor) rows.splice(i,1);
      }
    }
    if(weekday === 0 && !String(meal?.dish || "").trim()){
      const dinnerPlan = rows.find(x => x.templateKey === "sunday-dinner-plan");
      if(dinnerPlan){
        dinnerPlan.title = "Plan Sunday dinner";
        dinnerPlan.detail = "Kids return around 5:30 hungry · choose a meal and timing that fit.";
        dinnerPlan.icon = "🍽️";
      }
    }
    return rows;
  };
  const baseAutoTaskBlocks = itineraryAutoTaskBlocks;
  itineraryAutoTaskBlocks = function(date, baseItems){
    const weekday = new Date(String(date) + "T12:00:00").getDay();
    const backpacks = weekday >= 1 && weekday <= 5
      ? itineraryTaskCandidates(date).filter(task => !task.done && !task.paused && /check kids['’]? backpacks/i.test(String(task.title || "")))
      : [];
    const originalTasks = state.tasks || [];
    const backpackIds = new Set(backpacks.map(task => String(task.id)));
    let backpackChanged = false;
    for(const candidate of backpacks){
      const task = originalTasks.find(row => String(row.id) === String(candidate.id));
      if(!task) continue;
      if(task.itineraryPreference !== "after-school"){ task.itineraryPreference = "after-school"; backpackChanged = true; }
      if(task.itineraryStart !== ""){ task.itineraryStart = ""; backpackChanged = true; }
      if(Number(task.itineraryMinutes) !== 15){ task.itineraryMinutes = 15; backpackChanged = true; }
      const notes = "Check each book bag after the kids get home from school. Do not check backpacks while they are at school.";
      if(task.notes !== notes){ task.notes = notes; backpackChanged = true; }
    }
    const latestPickup = (typeof itineraryFixedItems === "function" ? itineraryFixedItems(date) : [])
      .filter(item => /^pick\s*up\b|^school pickup\b|^kids? (?:return|home from school)\b/i.test(String(item.title || "")))
      .map(item => hmMinutes(item.start)).filter(value => value !== null)
      .reduce((latest, value) => Math.max(latest, value), 0);
    const minimumStart = Math.max(15 * 60 + 15, latestPickup ? latestPickup + 15 : 0);
    const firstAfterPickup = Math.ceil(minimumStart / 5) * 5;
    if(backpackIds.size) state.tasks = originalTasks.filter(task => !backpackIds.has(String(task.id)));
    const returnAnchor = (typeof itineraryFixedItems === "function" ? itineraryFixedItems(date) : [])
      .filter(x => /kids? home from dad|kids? return home|home from dad/i.test(String(x.title || "")))
      .map(x => hmMinutes(x.start)).filter(x => x !== null).sort((a,b)=>a-b)[0];
    let scheduled = baseAutoTaskBlocks(date, baseItems).filter(item => {
      const task = item.sourceId && (state.tasks || []).find(t => String(t.id) === String(item.sourceId));
      const category = String(task?.category || "").toLowerCase();
      const titleAndDetail = String(item.title || "") + " " + String(item.detail || "") + " " + String(task?.child || "");
      const isSchool = category === "school" || /homework|reading|practice|school|assignment|math/i.test(titleAndDetail);
      const childMention = /\b(kids?|children|leo|dolly|ambrose|demitri|tree)\b/i.test(titleAndDetail);
      const start = hmMinutes(item.start);
      if(returnAnchor !== undefined && start !== null && start < returnAnchor && childMention) return false;
      return !isSchool || date <= ymd() || !!task?.itineraryStart;
    });
    if(backpackIds.size) state.tasks = originalTasks;
    for(const candidate of backpacks){
      const task = originalTasks.find(row => String(row.id) === String(candidate.id)) || candidate;
      const minutes = 15;
      let chosen = null;
      for(let start = firstAfterPickup; start + minutes <= 18 * 60 + 30; start += 5){
        const occupied = [...(baseItems || []), ...scheduled].filter(item => !item.nonBlocking && item.kind !== "gap");
        const conflict = occupied.some(item => {
          const s = hmMinutes(item.start);
          if(s === null) return false;
          const end = hmMinutes(item.end);
          const e = end !== null && end > s ? end : s + Math.max(15, Number(item.durationMinutes || 15));
          return start < e && start + minutes > s;
        });
        if(!conflict){ chosen = start; break; }
      }
      if(chosen === null){
        if(task.date === date && task.itineraryStart !== ""){ task.itineraryStart = ""; backpackChanged = true; }
        continue;
      }
      if(task.date === date && task.itineraryStart !== minutesHm(chosen)){ task.itineraryStart = minutesHm(chosen); backpackChanged = true; }
      scheduled.push({
        id:"task:"+String(task.id), start:minutesHm(chosen), end:minutesHm(chosen+minutes),
        title:typeof taskDisplayTitle === "function" ? taskDisplayTitle(task) : String(task.title || "Check kids' backpacks"),
        detail:String(task.notes || "Check backpacks after the kids are home from school."),
        fixed:false, kind:"task", icon:"✓", source:"task", sourceId:task.id,
        durationMinutes:minutes, done:!!task.done, autoPlanned:true, carriedForward:String(task.date || "") < String(date)
      });
    }
    if(backpackChanged && typeof save === "function") Promise.resolve(save()).catch(()=>{});
    return scheduled;
  };
  const baseOverlayFinished = dayFlowOverlayFinished;
  dayFlowOverlayFinished = function(date, rows){
    const result = baseOverlayFinished(date, rows), seen = new Set();
    const unique = result.filter(item => {
      const title = String(item.title || "").toLowerCase().replace(/\b\d+\s*(?:minute|min)\s*/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
      if(!title) return true;
      const task = item.sourceId && (state.tasks || []).find(t => String(t.id) === String(item.sourceId));
      const schoolText = /\b(school|math|homework|assignment|grades?|reading|practice|course)\b/i.test(String(item.title || "") + " " + String(item.detail || ""));
      if(date > ymd() && schoolText && !task?.itineraryStart) return false;
      const key = String(date) + "|" + title;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    rows.splice(0, rows.length, ...unique);
    return rows;
  };
  // Keep the family's evening plan inside the requested 8:30 PM cutoff.
  const baseDayEndForEveningCutoff = itineraryDayEnd;
  itineraryDayEnd = function(date){
    return Math.min(baseDayEndForEveningCutoff(date), 20 * 60 + 35);
  };

  const baseFinalSuggestedBlocks = itinerarySuggestedBlocks;
  itinerarySuggestedBlocks = function(date){
    const rows = baseFinalSuggestedBlocks(date);
    const weekday = new Date(String(date) + "T12:00:00").getDay();
    const prepEnabled = state.settings?.itinerary?.routinePreferences?.[weekday + ":tomorrow-prep"]?.enabled !== false;
    if(weekday !== 5 && weekday !== 6 && prepEnabled && !rows.some(row => row.templateKey === "tomorrow-prep")){
      rows.push({
        templateKey:"tomorrow-prep", start:"19:30", end:"20:00",
        title:"Check tomorrow + stage clothes / bags / keys",
        detail:"Check tomorrow’s calendar · stage clothes/bags/keys · 5-minute kitchen / house close.",
        icon:"✦", id:"suggest:"+date+":tomorrow-prep:daily",
        fixed:false, kind:"routine", source:"suggested", learnedRoutine:false
      });
    }
    for(const row of rows){
      if(row.templateKey === "bedtime-settle"){
        row.start = "20:10";
        row.end = "20:20";
        row.title = "Pajamas + get settled into bed";
        row.detail = "Finish pajamas and get into bed · 10 minutes before reading.";
      }
      if(row.templateKey === "tomorrow-prep"){
        row.start = "19:30";
        row.end = "20:00";
        row.title = "Check tomorrow + stage clothes / bags / keys";
        row.detail = "Check tomorrow’s calendar · stage clothes/bags/keys · 5-minute kitchen / house close.";
      }
    }
    return rows;
  };


  const baseEveningRoutineWindow = itineraryRoutineWindow;
  itineraryRoutineWindow = function(item, date){
    if(item?.templateKey === "tomorrow-prep") return {start:19*60+30, end:20*60};
    if(item?.templateKey === "bedtime-settle") return {start:20*60+10, end:20*60+20};
    return baseEveningRoutineWindow(item, date);
  };

  const baseEveningTaskRange = itineraryTaskPreferredRange;
  itineraryTaskPreferredRange = function(task, date){
    const text = String(task?.title || "") + " " + String(task?.notes || "");
    const normalized = text.toLowerCase();
    const vacuum = /robot\s*vacuum/.test(normalized);
    const bedtimeErrand = /litter|backpack|tomorrow|clothes|bags|keys/.test(normalized);
    const taskMinutes = itineraryTaskMinutes(task);
    const base = baseEveningTaskRange(task, date);
    if(!base) return null;
    if(vacuum){
      const end = Math.min(base.end, 20 * 60 + 35);
      return end - base.start >= taskMinutes ? {start:base.start, end} : null;
    }
    if(bedtimeErrand){
      const now = date === ymd() ? new Date() : null;
      const floor = now ? Math.ceil((now.getHours()*60 + now.getMinutes() + 5)/5)*5 : 0;
      const start = Math.max(base.start, 18 * 60 + 45, floor);
      const end = Math.min(base.end, 19 * 60 + 30);
      return end - start >= taskMinutes ? {start, end} : null;
    }
    const end = Math.min(base.end, 20 * 60 + 30);
    return end - base.start >= taskMinutes ? {start:base.start, end} : null;
  };

  const baseEveningAutoTasks = itineraryAutoTaskBlocks;
  itineraryAutoTaskBlocks = function(date, baseItems){
    let clearedLateStarts = false;
    for(const task of state.tasks || []){
      if(task.date !== date || !task.itineraryStart) continue;
      const start = hmMinutes(task.itineraryStart);
      const minutes = itineraryTaskMinutes(task);
      const vacuum = /robot\s*vacuum/i.test(String(task.title || ""));
      if(start !== null && (vacuum ? start > 20 * 60 + 30 : start + minutes > 20 * 60 + 30)){
        task.itineraryStart = "";
        clearedLateStarts = true;
      }
    }
    if(clearedLateStarts && typeof save === "function") Promise.resolve(save()).catch(()=>{});
    return baseEveningAutoTasks(date, baseItems).filter(item=>{
      const start = hmMinutes(item.start), end = hmMinutes(item.end);
      if(start === null || end === null) return true;
      const vacuum = /robot\s*vacuum/i.test(String(item.title || ""));
      return vacuum ? start <= 20 * 60 + 30 && end <= 20 * 60 + 35 : start < 20 * 60 + 30 && end <= 20 * 60 + 30;
    });
  };


  // The household vacuum runs at bedtime. Ignore flexible-slot placement so
  // stale local task copies cannot put it into the afternoon.
  const baseNightVacuumDayItems = itineraryDayItems;
  itineraryDayItems = function(date){
    let rows = baseNightVacuumDayItems(date);
    const hasPickupPrep = (state.tasks || []).some(task =>
      String(task.date || "") === String(date) &&
      /get ready to pick up demitri/i.test(String(task.title || "")) &&
      !task.done && !task.paused
    );
    if(hasPickupPrep){
      rows = rows.filter(row => !/^pack the next-stop bag$/i.test(String(row.title || "")));
    }
    rows = rows.filter(row => !/robot\s*vacuum/i.test(String(row.title || "")));
    const today = typeof ymd === "function" ? ymd() : "";
    const vacuumTask = (state.tasks || []).filter(task => {
      if(!/robot\s*vacuum/i.test(String(task.title || "")) || task.paused) return false;
      const taskDate = String(task.date || "");
      if(taskDate === String(date)) return !task.done || String(date) > today;
      return !!task.dailyReset && !!today && String(date) > today && taskDate <= today;
    }).sort((a,b) => {
      const aToday = String(a.date || "") === String(date) ? 0 : 1;
      const bToday = String(b.date || "") === String(date) ? 0 : 1;
      return aToday - bToday;
    })[0];
    if(vacuumTask){
      rows.push({
        id:"task:"+String(vacuumTask.id), start:"20:30", end:"20:35",
        title:typeof taskDisplayTitle === "function" ? taskDisplayTitle(vacuumTask) : "Run robot vacuum",
        detail:String(vacuumTask.notes || "Start after everyone is in bed."),
        fixed:false, kind:"task", icon:"✓", source:"task", sourceId:vacuumTask.id,
        durationMinutes:5, done:false, autoPlanned:false, carriedForward:false
      });
    }
    return rows.sort((a,b) => (hmMinutes(a.start) ?? 0) - (hmMinutes(b.start) ?? 0));
  };

  // Keep the family's 7:30–8:00 tomorrow-prep block visible even when the
  // routine fitter drops it while resolving other evening routines.
  const baseEveningDayItems = itineraryDayItems;
  itineraryDayItems = function(date){
    const rows = baseEveningDayItems(date);
    const weekday = new Date(String(date) + "T12:00:00").getDay();
    if(weekday >= 0 && weekday <= 4 && !rows.some(row => row.templateKey === "tomorrow-prep")){
      rows.push({
        id:"daily-evening-prep:"+date,
        templateKey:"tomorrow-prep",
        start:"19:30",
        end:"20:00",
        title:"Check tomorrow + stage clothes / bags / keys",
        detail:"Check tomorrow’s calendar · stage clothes/bags/keys · 5-minute kitchen / house close.",
        icon:"✦", fixed:false, kind:"routine", source:"suggested", learnedRoutine:false
      });
    }
    return rows.sort((a,b)=>String(a.start).localeCompare(String(b.start))||(a.kind==="gap"?1:-1));
  };


  // Keep the nightly vacuum tied to the bedtime boundary even if a stale
  // flexible-task slot would otherwise place it in the afternoon.
  const baseNightVacuumWithEveningEventDayItems = itineraryDayItems;
  itineraryDayItems = function(date){
    let rows = baseNightVacuumWithEveningEventDayItems(date);
    const openEveningFamilyEvent=(state.events||[]).some(event=>{
      const start=hmMinutes(event.startTime),text=[event.type,event.title,event.notes].filter(Boolean).join(" ");
      return event.date===date&&!["cancelled","paused"].includes(String(event.status||"").toLowerCase())&&start!==null&&start>=17*60&&!event.endTime&&/family|community|birthday|trunk-or-treat/i.test(text);
    });
    if(openEveningFamilyEvent)rows=rows.filter(row=>row.templateKey!=="dinner"&&!/^dinner\s*\+\s*kitchen reset$/i.test(String(row.title||"")));
    const hasPickupPrep = (state.tasks || []).some(task =>
      String(task.date || "") === String(date) &&
      /get ready to pick up demitri/i.test(String(task.title || "")) &&
      !task.done && !task.paused
    );
    if(hasPickupPrep){
      rows = rows.filter(row => !/^pack the next-stop bag$/i.test(String(row.title || "")));
    }
    rows = rows.filter(row => !/robot\s*vacuum/i.test(String(row.title || "")));
    const today = typeof ymd === "function" ? ymd() : "";
    const vacuumTask = (state.tasks || []).filter(task => {
      if(!/robot\s*vacuum/i.test(String(task.title || "")) || task.paused) return false;
      const taskDate = String(task.date || "");
      if(taskDate === String(date)) return !task.done || String(date) > today;
      return !!task.dailyReset && !!today && String(date) > today && taskDate <= today;
    }).sort((a,b) => {
      const aToday = String(a.date || "") === String(date) ? 0 : 1;
      const bToday = String(b.date || "") === String(date) ? 0 : 1;
      return aToday - bToday;
    })[0];
    if(vacuumTask){
      rows.push({
        id:"task:"+String(vacuumTask.id),
        start:"20:30", end:"20:35",
        title:typeof taskDisplayTitle === "function" ? taskDisplayTitle(vacuumTask) : "Run robot vacuum",
        detail:String(vacuumTask.notes || "Start after everyone is in bed."),
        fixed:false, kind:"task", icon:"✓", source:"task", sourceId:vacuumTask.id,
        durationMinutes:5, done:false, autoPlanned:false, carriedForward:false
      });
    }
    return rows.sort((a,b) => (hmMinutes(a.start) ?? 0) - (hmMinutes(b.start) ?? 0));
  };
})();

/* Household schedule corrections: prevent stale carryovers and keep Dolly's
   homework in a time when she is home. This runs against the local copy too. */
(function(){
  "use strict";
  function householdScheduleCleanup(){
    if(!state || typeof state!=="object") return false;
    const today=typeof ymd==="function"?ymd():"";
    let changed=false;
    const settings=state.settings||(state.settings={});
    const itinerary=settings.itinerary||(settings.itinerary={});
    if(Number(itinerary.householdScheduleCorrectionsVersion||0)<1){
      const patterns=itinerary.taskPatterns||(itinerary.taskPatterns={});
      patterns["Scoop litter boxes"]={
        days:[1,2,3,4,5,6],
        notes:"Once daily Monday through Saturday; Sunday's litter reset includes scooping.",
        itineraryMinutes:15,
        itineraryPreference:"evening"
      };
      patterns["Sunday litter reset: empty robot + scoop boxes"]={
        days:[0],
        notes:"Weekly Sunday reset only; includes the regular boxes.",
        itineraryMinutes:15,
        itineraryPreference:"morning"
      };
      itinerary.householdScheduleCorrectionsVersion=1;
      changed=true;
    }
    for(const assignment of state.schoolAssignments||[]){
      if(String(assignment.child||"").toLowerCase()!=="dolly") continue;
      if(String(assignment.status||"").toLowerCase()==="completed"||String(assignment.status||"").toLowerCase()==="archived") continue;
      if(assignment.itineraryPreference!=="after-school"){assignment.itineraryPreference="after-school";changed=true}
      if(assignment.itineraryStart!=="15:30"){assignment.itineraryStart="15:30";changed=true}
      if(!Number(assignment.itineraryMinutes)){assignment.itineraryMinutes=20;changed=true}
    }
    const removeFromList=title=>/YMCA Winter Indoor Sports Clinic|Confirm Leo visit and pickup plans with Grandma Kellie/i.test(String(title||""));
    if(Array.isArray(state.tasks)){
      const activeTasks=state.tasks.filter(task=>!removeFromList(task.title));
      if(activeTasks.length!==state.tasks.length){state.tasks=activeTasks;changed=true}
    }
    for(const task of state.tasks||[]){
      const title=String(task.title||"");
      if(/sunday litter reset/i.test(title)&&String(task.date||"")<today&&!task.done&&!task.paused){
        task.paused=true;
        task.carryForward=false;
        changed=true;
      }
      if(/goodie hunt/i.test(title)&&!task.done&&!task.paused){
        task.paused=true;
        task.carryForward=false;
        changed=true;
      }
    }
    for(const event of state.events||[]){
      if(/goodie hunt/i.test(String(event.title||""))&&String(event.date||"")<=today&&String(event.status||"").toLowerCase()!=="archived"){
        event.status="archived";
        changed=true;
      }
    }
    const schedule=state.dailyLifeNotificationSchedule;
    if(Array.isArray(schedule)){
      const cleaned=[];
      for(const item of schedule){
        const title=String(item.title||"");
        const date=String(item.date||"");
        if(/YMCA Winter Indoor Sports Clinic|Confirm Leo visit and pickup plans with Grandma Kellie/i.test(title)){changed=true;continue}
        if(/goodie hunt/i.test(title)){changed=true;continue}
        if(/sunday litter reset/i.test(title)){
          const weekday=date?new Date(date+"T12:00:00").getDay():-1;
          if(weekday!==0){changed=true;continue}
        }
        if(/check kids['’]? backpacks/i.test(title) && date >= today){
          const weekday=date?new Date(date+"T12:00:00").getDay():-1;
          const start=hmMinutes(item.start);
          if(weekday>=1&&weekday<=5&&(start===null||start<15*60+15)){
            item.start="15:15";
            changed=true;
          }
        }
        if(/dolly/i.test(title)&&/math|homework|assignment|practice/i.test(title)){
          const assignment=(state.schoolAssignments||[]).find(a=>
            String(a.child||"").toLowerCase()==="dolly"&&
            title.toLowerCase().includes(String(a.title||"").toLowerCase())
          );
          const due=String(assignment?.due||"");
          if(assignment&&(String(assignment.status||"").toLowerCase()==="archived"||assignment.scheduleExcluded===true)){
            changed=true;continue;
          }
          const start=hmMinutes(item.start);
          if(date&&[1,2,3,4,5].includes(new Date(date+"T12:00:00").getDay())&&start!==null&&start<15*60+15&&item.start!=="15:30"){
            item.start="15:30";
            changed=true;
          }
        }
        cleaned.push(item);
      }
      if(cleaned.length!==schedule.length) state.dailyLifeNotificationSchedule=cleaned;
    }
    return changed;
  }
  const baseHouseholdDayItems=itineraryDayItems;
  itineraryDayItems=function(date){
    householdScheduleCleanup();
    const rows=baseHouseholdDayItems(date);
    const weekday=new Date(String(date)+"T12:00:00").getDay();
    return rows.filter(item=>{
      const title=String(item.title||"");
      if(/goodie hunt/i.test(title)) return false;
      if(/sunday litter reset/i.test(title)&&weekday!==0) return false;
      if(/dolly/i.test(title)&&/math|homework|assignment|practice/i.test(title)){
        const assignment=(state.schoolAssignments||[]).find(a=>
          String(a.child||"").toLowerCase()==="dolly"&&
          title.toLowerCase().includes(String(a.title||"").toLowerCase())
        );
        const due=String(assignment?.due||"");
        if(assignment&&(String(assignment.status||"").toLowerCase()==="archived"||assignment.scheduleExcluded===true)) return false;
        if([1,2,3,4,5].includes(weekday)&&hmMinutes(item.start)!==null&&hmMinutes(item.start)<15*60+15){
          item.start="15:30";
          if(item.end&&hmMinutes(item.end)!==null&&hmMinutes(item.end)<=15*60+15)item.end=minutesHm(15*60+15);
        }
      }
      return true;
    }).sort((a,b)=>(hmMinutes(a.start)??0)-(hmMinutes(b.start)??0));
  };
  const baseHouseholdCleanupRender=render;
  render=function(){
    const changed=householdScheduleCleanup();
    if(changed&&typeof save==="function") Promise.resolve().then(()=>save()).catch(()=>{});
    return baseHouseholdCleanupRender.apply(this,arguments);
  };
})();
