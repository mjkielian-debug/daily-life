/* Sims-inspired interaction HUD, built from existing Daily Life records.
   This file only changes presentation preferences; it never edits household data. */
const LIFE_SIM_ACTIVE_KEY = "dailyLifeActiveSim-v1";
const LIFE_SIM_QUEUE_KEY = "dailyLifeActionQueues-v1";
function lifeSimArg(value) { return esc(JSON.stringify(String(value))); }

function lifeSimRoster() {
  const household = (state.peopleProfiles || []).filter(p =>
    typeof livesWithUser === "function" ? livesWithUser(p) : p?.livesWithUser === true
  );
  const unique = new Map();
  unique.set("self", { id: "self", name: state.profile?.name || "You", relationship: "You" });
  for (const person of household) if (person?.id && !unique.has(String(person.id))) unique.set(String(person.id), person);
  return [...unique.values()];
}

function lifeSimSelectedId(roster = lifeSimRoster()) {
  const saved = localStorage.getItem(LIFE_SIM_ACTIVE_KEY);
  return roster.some(p => String(p.id) === saved) ? saved : "self";
}

function setLifeSim(id) {
  const roster = lifeSimRoster();
  if (!roster.some(p => String(p.id) === String(id))) return;
  localStorage.setItem(LIFE_SIM_ACTIVE_KEY, String(id));
  if (typeof setView === "function") setView("family");
  else render();
}

function openHouseTodayPanel() {
  if (typeof houseOverlayView !== "undefined" && houseOverlayView) { houseOverlayView = ""; closeModal(); render(); }
  const tasks = typeof todayTasks === "function" ? todayTasks() : [];
  const done = tasks.filter(task => task.done).length;
  const active = tasks.filter(task => !task.done);
  const rows = active.length
    ? active.slice(0, 10).map(task => `<div class="house-today-row"><button type="button" class="house-today-open" onclick="closeModal();openTaskDetails(${lifeSimArg(task.id)})"><span><b>${esc(task.title || "Task")}</b><small>${esc([task.child,task.category].filter(Boolean).join(" · ") || "Household")}</small></span><span>›</span></button><button type="button" class="house-today-done" aria-label="Complete ${esc(task.title || "task")}" onclick="closeModal();toggleTask(${lifeSimArg(task.id)},true)">✓</button></div>`).join("")
    : `<div class="notice">Nothing is waiting in today’s task list.</div>`;
  modal("Today in the house",`<div class="house-today-panel"><div class="house-today-summary"><b>${done} done</b><span>${active.length} left</span><button type="button" class="btn small primary" onclick="closeModal();openTask()">＋ Add task</button></div>${rows}${active.length>10?`<button class="btn" onclick="closeModal();setView('today')">Open all ${active.length} tasks</button>`:""}<button class="btn" onclick="closeModal();setView('itinerary')">Open the day schedule</button></div>`,"Close",closeModal);
}

function openHousePeoplePanel() {
  if (typeof houseOverlayView !== "undefined" && houseOverlayView) { houseOverlayView = ""; closeModal(); render(); }
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  const rows = roster.map(person => `<div class="house-people-row"><button type="button" class="house-people-select ${String(person.id)===activeId?"is-active":""}" onclick="closeModal();setLifeSim(${lifeSimArg(person.id)})"><span class="life-sim-avatar">${esc(String(person.name||"?").trim().charAt(0).toUpperCase()||"?")}</span><span><b>${esc(person.name)}</b><small>${String(person.id)===activeId?"Currently selected":"Select this Sim"}</small></span><span>›</span></button>${String(person.id)!=="self"?`<button type="button" class="btn small" onclick="closeModal();openPersonHub(${lifeSimArg(person.id)})">Profile</button>`:""}</div>`).join("");
  modal("People in this house",`<div class="house-people-panel">${rows}<div class="actions"><button class="btn primary" onclick="closeModal();setView('family')">Family routines + calendar</button><button class="btn" onclick="closeModal();openPersonProfile()">＋ Add a person</button></div></div>`,"Close",closeModal);
}

function lifeSimAvailableTasks(person, activeId = lifeSimSelectedId()) {
  const day = ymd();
  const personName = String(person?.name || "").trim().toLowerCase();
  return (state.tasks || [])
    .filter(task => task.date === day && !task.done && !task.paused && !task.waitingForFunds)
    .filter(task => {
      const assigned = String(task.child || "").trim().toLowerCase();
      return assigned === personName || (activeId === "self" && !assigned);
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function lifeSimSavedQueues() {
  try {
    const queues = JSON.parse(localStorage.getItem(LIFE_SIM_QUEUE_KEY) || "{}");
    return queues && typeof queues === "object" && !Array.isArray(queues) ? queues : {};
  } catch (_) { return {}; }
}

function lifeSimTaskRows(person, activeId) {
  const available = lifeSimAvailableTasks(person, activeId);
  const queues = lifeSimSavedQueues();
  const key = String(activeId);
  const ids = Array.isArray(queues[key]) ? queues[key] : available.slice(0, 3).map(task => String(task.id));
  const byId = new Map(available.map(task => [String(task.id), task]));
  return ids.map(id => byId.get(String(id))).filter(Boolean).slice(0, 8);
}

function lifeSimSaveQueue(activeId, ids) {
  const queues = lifeSimSavedQueues();
  queues[String(activeId)] = [...new Set(ids.map(String))].slice(0, 8);
  try { localStorage.setItem(LIFE_SIM_QUEUE_KEY, JSON.stringify(queues)); } catch (_) {}
}

function lifeSimQueueTask(id) {
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  const active = roster.find(person => String(person.id) === activeId) || roster[0];
  if (!lifeSimAvailableTasks(active, activeId).some(task => String(task.id) === String(id))) return;
  const ids = lifeSimTaskRows(active, activeId).map(task => String(task.id));
  if (!ids.includes(String(id))) ids.push(String(id));
  lifeSimSaveQueue(activeId, ids);
  closeModal();
  render();
}

function lifeSimMoveTask(id, delta) {
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  const active = roster.find(person => String(person.id) === activeId) || roster[0];
  const ids = lifeSimTaskRows(active, activeId).map(task => String(task.id));
  const index = ids.indexOf(String(id)), other = index + Number(delta);
  if (index < 0 || other < 0 || other >= ids.length) return;
  [ids[index], ids[other]] = [ids[other], ids[index]];
  lifeSimSaveQueue(activeId, ids);
  render();
}

function lifeSimRemoveTask(id) {
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  const active = roster.find(person => String(person.id) === activeId) || roster[0];
  const ids = lifeSimTaskRows(active, activeId).map(task => String(task.id)).filter(taskId => taskId !== String(id));
  lifeSimSaveQueue(activeId, ids);
  render();
}

async function lifeSimCompleteTask(id) {
  await toggleTask(id, true);
  const task = (state.tasks || []).find(row => String(row.id) === String(id));
  if (task?.done) lifeSimRemoveTask(id);
}

function lifeSimStatusMarkup(label, value, percent, action) {
  const measured = Number.isFinite(Number(percent));
  return `<button class="life-sim-status" type="button" onclick="${action}">
    <span class="life-sim-status-head"><b>${esc(label)}</b><small>${esc(value)}</small></span>
    ${measured ? `<span class="life-sim-meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Number(percent)))}"><i style="width:${Math.max(0, Math.min(100, Number(percent)))}%"></i></span>` : `<span class="life-sim-meter life-sim-meter-unknown"><i></i></span>`}
  </button>`;
}

function lifeSimOpenNeeds() {
  const care = typeof selfCareTodayStats === "function" ? selfCareTodayStats() : null;
  const mood = typeof wellnessForDate === "function" ? wellnessForDate() : null;
  const waterNow = typeof water === "function" ? Number(water()) : 0;
  const waterGoal = Number(state.settings?.waterTarget || 0);
  const sleep = typeof sleepHours === "function" && typeof sleepForDate === "function" ? sleepHours(sleepForDate()) : 0;
  const careValue = care ? `${care.done} of ${care.total} complete` : "No check-in";
  const moodValue = mood?.mood ? moodLabel(mood.mood) : "No check-in";
  const waterValue = waterGoal ? `${Math.round(waterNow)} of ${waterGoal} oz` : `${Math.round(waterNow)} oz logged`;
  const sleepValue = sleep ? `${sleep.toFixed(1)} hours logged` : "No log";
  const rows = [
    ["♡", "Care", careValue, "setView('log')"],
    ["☼", "Mood", moodValue, "openWellnessCheckin()"],
    ["◉", "Water", waterValue, "openCareHubSection('water')"],
    ["☾", "Sleep", sleepValue, "openSleep()"]
  ];
  modal("Your Sim needs", `<div class="life-sim-needs-panel">${rows.map(([icon,label,value,action]) => `<button type="button" class="life-sim-needs-row" onclick="closeModal();${action}"><span>${icon}</span><b>${label}</b><small>${esc(value)}</small><i>›</i></button>`).join("")}<p class="muted small">Values come from your existing check-ins and logs.</p></div>`, "Close", closeModal);
}

function lifeSimOpenSelectedTasks() {
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  if (activeId === "self") return lifeSimOpenNeeds();
  const active = roster.find(person => String(person.id) === activeId) || roster[0];
  const personName = String(active.name || "").trim().toLowerCase();
  const tasks = (state.tasks || []).filter(task =>
    task.date === ymd() && String(task.child || "").trim().toLowerCase() === personName
  ).sort((a, b) => (a.order || 0) - (b.order || 0));
  const done = tasks.filter(task => task.done).length;
  const remaining = tasks.filter(task => !task.done && !task.paused && !task.waitingForFunds).length;
  const rows = tasks.length
    ? tasks.map(task => {
        const status = task.done ? "Done" : task.paused ? "Paused" : task.waitingForFunds ? "Waiting for funds" : task.category || "Assigned today";
        const complete = !task.done && !task.paused && !task.waitingForFunds
          ? `<button type="button" class="house-today-done" aria-label="Complete ${esc(task.title || "task")}" onclick="closeModal();lifeSimCompleteTask(${lifeSimArg(task.id)})">✓</button>`
          : `<span class="house-today-done" aria-label="${esc(status)}">${task.done ? "✓" : "·"}</span>`;
        return `<div class="house-today-row"><button type="button" class="house-today-open" onclick="closeModal();openTaskDetails(${lifeSimArg(task.id)})"><span><b>${esc(task.title || "Task")}</b><small>${esc(status)}</small></span><span>›</span></button>${complete}</div>`;
      }).join("")
    : `<div class="notice">No tasks are assigned to ${esc(active.name)} today.</div>`;
  modal(`${esc(active.name)} · Today`, `<div class="house-today-panel"><div class="house-today-summary"><b>${done} done</b><span>${remaining} left</span></div>${rows}<button type="button" class="btn small primary" onclick="closeModal();openTask(${lifeSimArg(active.name)})">＋ Add task for ${esc(active.name)}</button><button type="button" class="btn" onclick="closeModal();openPersonHub(${lifeSimArg(active.id)})">Open ${esc(active.name)}'s profile</button></div>`, "Close", closeModal);
}

function lifeSimPageSummaryMarkup(){
  if(view==="family")return "";
  if(view==="home"&&typeof foodProfileQuickProgress==="function")return foodProfileQuickProgress();
  let model=null;
  const modelPage=(view==="today"||view==="itinerary")?"itinerary":view;
  if(typeof visualHubModel==="function")model=visualHubModel(modelPage);
  if(view==="selfcare"){model={title:"Self care",metrics:[]};}
  if(!model||!model.title)return "";
  const configured=state.settings?.nutritionGoals||{},
    waterGoal=Number(configured.waterTarget??state.settings?.waterTarget??78)||78,
    ringData=[],
    stats=(model.metrics||[]).slice(0,3);
  if(view==="log"||view==="selfcare"){
    const care=typeof selfCareTodayStats==="function"?selfCareTodayStats():{done:0,total:0},
      ounces=typeof water==="function"?Number(water())||0:0,
      sleep=typeof sleepHours==="function"&&typeof sleepForDate==="function"?sleepHours(sleepForDate()):0,
      workouts=(state.workouts||[]).filter(x=>x.date>=shiftDateString(ymd(),-6)&&x.date<=ymd()).length;
    if(care.total)ringData.push({label:"Care",value:care.done,goal:care.total,detail:care.done+" / "+care.total});
    ringData.push({label:"Water",value:ounces,goal:waterGoal,detail:Math.round(ounces)+" / "+waterGoal+" oz",water:true});
    stats.length=0;
    if(sleep)stats.push({label:"Sleep",value:sleep.toFixed(1)+" hr"});
    stats.push({label:"Movement",value:workouts+" this week"});
  }else if(view==="inventory"){
    const items=state.inventoryItems||[],rooms=state.houseRooms||[],low=items.filter(x=>["Low","Need"].includes(String(x.status||""))).length;
    stats.length=0;stats.push({label:"Items",value:String(items.length)},{label:"Low / needed",value:String(low)},{label:"Rooms",value:String(rooms.length)});
  }else if(view==="pets"){
    const pets=(state.pets||[]).filter(x=>x.status!=="Archived"),due=typeof duePetRoutines==="function"?duePetRoutines():[],logs=(state.petLogs||[]).filter(x=>x.date===ymd());
    stats.length=0;stats.push({label:"Pets",value:String(pets.length)},{label:"Care due",value:String(due.length)},{label:"Logged today",value:String(logs.length)});
  }else if(view==="household"){
    const tasks=(state.tasks||[]).filter(x=>x.date===ymd()&&String(x.category||"").toLowerCase()==="home"),done=tasks.filter(x=>x.done).length;
    if(tasks.length)ringData.push({label:"Home tasks",value:done,goal:tasks.length,detail:done+" / "+tasks.length});
    stats.length=0;stats.push({label:"Rooms",value:String((state.houseRooms||[]).length)},{label:"Items",value:String((state.inventoryItems||[]).length)});
  }else if(view==="spirituality"||view==="budget"||view==="settings"||view==="vault"){
    if(view==="spirituality")stats=(model.metrics||[]).filter(x=>["Tarot","Journal","Reading"].includes(x.label)).slice(0,3);
  }else if(model.progress&&Number(model.progress.total)>0){
    ringData.push({label:model.progress.label||model.title,value:Number(model.progress.done)||0,goal:Number(model.progress.total),detail:(Number(model.progress.done)||0)+" / "+Number(model.progress.total)});
  }
  const rings=ringData.map(item=>{
    const pct=Math.max(0,Math.round(item.value/item.goal*100)),fill=Math.min(100,pct),shown=pct+"%",
      current=typeof item.detail==="string"?item.detail:item.value+" / "+item.goal,
      color=item.water?"#e1b844":"#b875b4";
    return "<div class=\"life-sim-summary-item\"><div class=\"life-sim-summary-ring\" style=\"--life-pct:"+fill+"%;--life-ring:"+color+"\" role=\"img\" aria-label=\""+esc(item.label)+": "+shown+"\"><span>"+shown+"</span></div><b>"+esc(item.label)+"</b><small>"+esc(current)+"</small></div>";
  }).join(""),
    statMarkup=stats.map(x=>"<div class=\"life-sim-summary-stat\"><small>"+esc(x.label||"")+"</small><b>"+esc(x.value||"—")+"</b></div>").join(""),
    note=view==="spirituality"?"Saved reflection details":"Saved progress";
  return "<section class=\"life-sim-page-summary\" aria-label=\""+esc(model.title)+" summary\"><div class=\"life-sim-summary-head\"><b>"+esc(model.title)+"</b><small>"+note+"</small></div>"+(rings?"<div class=\"life-sim-summary-rings\">"+rings+"</div>":"")+(statMarkup?"<div class=\"life-sim-summary-stats\">"+statMarkup+"</div>":"")+"</section>";
}

function lifeSimHud() {
  if (!state?.profile?.name && typeof stateHasMeaningfulLocalData === "function" && !stateHasMeaningfulLocalData()) return "";
  const roster=lifeSimRoster(),activeId=lifeSimSelectedId(roster),now=new Date(),
    clock=now.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}),
    rosterMarkup=roster.map(person=>{
      const selected=String(person.id)===activeId,initial=String(person.name||"?").trim().charAt(0).toUpperCase()||"?";
      return "<button class=\"life-sim-sim "+(selected?"is-active":"")+"\" type=\"button\" aria-pressed=\""+selected+"\" aria-label=\"Select "+esc(person.name)+"\" onclick=\"setLifeSim("+lifeSimArg(person.id)+")\"><span class=\"life-sim-avatar\">"+esc(initial)+"</span><span>"+esc(person.name)+"</span></button>";
    }).join("");
  return "<section class=\"life-sim-hud life-sim-compact-hud\" aria-label=\"Household profiles\"><div class=\"life-sim-toolbar\"><div class=\"life-sim-roster\" role=\"group\" aria-label=\"Household profiles\">"+rosterMarkup+"</div><div class=\"life-sim-clock\"><i></i><span>LIVE</span><b>"+clock+"</b></div></div>"+lifeSimPageSummaryMarkup()+"</section>";
}