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
    const returnAnchor = (typeof itineraryFixedItems === "function" ? itineraryFixedItems(date) : [])
      .filter(x => /kids? home from dad|kids? return home|home from dad/i.test(String(x.title || "")))
      .map(x => hmMinutes(x.start)).filter(x => x !== null).sort((a,b)=>a-b)[0];
    return baseAutoTaskBlocks(date, baseItems).filter(item => {
      const task = item.sourceId && (state.tasks || []).find(t => String(t.id) === String(item.sourceId));
      const category = String(task?.category || "").toLowerCase();
      const titleAndDetail = String(item.title || "") + " " + String(item.detail || "") + " " + String(task?.child || "");
      const isSchool = category === "school" || /homework|reading|practice|school|assignment|math/i.test(titleAndDetail);
      const childMention = /\b(kids?|children|leo|dolly|ambrose|demitri|tree)\b/i.test(titleAndDetail);
      const start = hmMinutes(item.start);
      if(returnAnchor !== undefined && start !== null && start < returnAnchor && childMention) return false;
      return !isSchool || date <= ymd() || !!task?.itineraryStart;
    });
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
    for(const row of rows){
      if(row.templateKey === "bedtime-settle"){
        row.start = "20:10";
        row.end = "20:20";
        row.title = "Pajamas + get settled into bed";
        row.detail = "Finish pajamas and get into bed · 10 minutes before reading.";
      }
    }
    return rows;
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
      const start = Math.max(base.start, 19 * 60 + 30, floor);
      const end = Math.min(base.end, 20 * 60 + 10);
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

})();