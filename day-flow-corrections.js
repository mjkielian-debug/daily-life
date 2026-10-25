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
    return baseAutoTaskBlocks(date, baseItems).filter(item => {
      if(item.source !== "task" || !item.sourceId) return true;
      const task = (state.tasks || []).find(t => String(t.id) === String(item.sourceId));
      const category = String(task?.category || "").toLowerCase();
      const isSchool = category === "school" || /homework|reading|practice|school|assignment|math/i.test(String(task?.title || ""));
      return !isSchool || date <= ymd() || !!task?.itineraryStart;
    });
  };
  const baseOverlayFinished = dayFlowOverlayFinished;
  dayFlowOverlayFinished = function(date, rows){
    const result = baseOverlayFinished(date, rows), seen = new Set();
    const unique = result.filter(item => {
      const title = String(item.title || "").toLowerCase().replace(/\b\d+\\s*(?:minute|min)\\s*/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
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
})();