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

function lifeSimHud() {
  if (!state?.profile?.name && typeof stateHasMeaningfulLocalData === "function" && !stateHasMeaningfulLocalData()) return "";
  const roster = lifeSimRoster();
  const activeId = lifeSimSelectedId(roster);
  const active = roster.find(p => String(p.id) === activeId) || roster[0];
  const activeName = String(active.name || "").trim().toLowerCase();
  const tasks = (state.tasks || []).filter(task => {
    if (task.date !== ymd() || task.paused || task.waitingForFunds) return false;
    const assigned = String(task.child || "").trim().toLowerCase();
    return assigned === activeName || (activeId === "self" && !assigned);
  });
  const taskDone = tasks.filter(task => task.done).length;
  const care = typeof selfCareTodayStats === "function" ? selfCareTodayStats() : null;
  const mood = typeof wellnessForDate === "function" ? wellnessForDate() : null;
  const waterNow = typeof water === "function" ? Number(water()) : 0;
  const waterGoal = Number(state.settings?.waterTarget || 0);
  const sleep = typeof sleepHours === "function" && typeof sleepForDate === "function" ? sleepHours(sleepForDate()) : 0;
  const queued = lifeSimTaskRows(active, activeId);
  const now = new Date();
  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const current = queued[0];
  const queueMarkup = queued.length > 1
    ? queued.slice(1).map((task, index) => `<div class="life-sim-queue-item"><span class="life-sim-queue-order">${index + 2}</span><span class="life-sim-queue-copy"><b>${esc(task.title)}</b></span><span class="life-sim-queue-controls"><button class="btn small" type="button" aria-label="Move ${esc(task.title)} up" onclick="lifeSimMoveTask(${lifeSimArg(task.id)},-1)">↑</button><button class="btn small" type="button" aria-label="Move ${esc(task.title)} down" onclick="lifeSimMoveTask(${lifeSimArg(task.id)},1)" ${index===queued.length-2?"disabled":""}>↓</button><button class="btn small" type="button" onclick="openTaskDetails(${lifeSimArg(task.id)})">Open</button><button class="btn small" type="button" aria-label="Remove ${esc(task.title)} from queue" onclick="lifeSimRemoveTask(${lifeSimArg(task.id)})">×</button></span></div>`).join("")
    : `<p class="muted small life-sim-empty">No more queued actions.</p>`;
  const rosterMarkup = roster.map(person => {
    const selected = String(person.id) === activeId;
    const initial = String(person.name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<button class="life-sim-sim ${selected ? "is-active" : ""}" type="button" aria-pressed="${selected}" aria-label="Select ${esc(person.name)}" onclick="setLifeSim(${lifeSimArg(person.id)})"><span class="life-sim-avatar">${esc(initial)}</span><span>${esc(person.name)}</span></button>`;
  }).join("");
  if (view !== "household") {
    const needsSummary = activeId === "self"
      ? `<button type="button" class="life-sim-compact-needs" onclick="lifeSimOpenNeeds()">♡ Needs <span>${care ? `${care.done}/${care.total} care` : "care"}</span><span>${waterGoal ? `${Math.round(waterNow)}/${waterGoal} oz` : `${Math.round(waterNow)} oz`}</span></button>`
      : `<button type="button" class="life-sim-compact-needs" onclick="openPersonHub(${lifeSimArg(active.id)})"><span>${esc(active.name)} · ${taskDone}/${tasks.length} tasks today</span><b>Open profile ›</b></button>`;
    return `<section class="life-sim-hud life-sim-compact-hud" aria-label="Live household controls">
      <div class="life-sim-toolbar"><div class="life-sim-roster" role="group" aria-label="Household Sims">${rosterMarkup}</div><div class="life-sim-clock"><i></i><span>LIVE</span><b>${clock}</b></div></div>
      ${view === "reading" ? "" : `<div class="life-sim-compact-bar"><div class="life-sim-compact-context"><span class="life-sim-compact-plumbob" aria-hidden="true">✦</span><span><small>PLAYING AS</small><b>${esc(active.name)}</b></span></div>${needsSummary}${current ? `<button type="button" class="life-sim-compact-action" onclick="openTaskDetails(${lifeSimArg(current.id)})"><span>NOW</span><b>${esc(current.title)}</b></button>` : ""}<button type="button" class="life-sim-compact-house" onclick="setView('household')">⌂ House</button></div>`}
    </section>`;
  }
  if (view === "household") return `<section class="life-sim-hud life-sim-house-map-hud" aria-label="Household live mode">
    <div class="life-sim-toolbar"><div class="life-sim-roster" role="group" aria-label="Household Sims">${rosterMarkup}</div><div class="life-sim-clock"><i></i><span>LIVE</span><b>${clock}</b></div></div>
    <div class="life-sim-house-map-actions"><span>⌂ <b>${esc(active.name)}</b> · House view</span><button type="button" class="life-sim-house-needs" aria-label="${activeId === "self" ? "Open your personal needs" : `Open ${esc(active.name)}'s assigned tasks`}" onclick="${activeId === "self" ? "lifeSimOpenNeeds()" : "lifeSimOpenSelectedTasks()"}">${activeId === "self" ? "♡ Needs" : "✓ Tasks"}</button>${current?`<button type="button" class="life-sim-house-next" onclick="openTaskDetails(${lifeSimArg(current.id)})">Next · ${esc(current.title)} ›</button>`:`<span class="life-sim-house-next">${taskDone} of ${tasks.length} tasks done</span>`}${current?`<button type="button" class="life-sim-house-complete" aria-label="Mark ${esc(current.title)} complete" onclick="lifeSimCompleteTask(${lifeSimArg(current.id)})">✓</button>`:""}</div>
  </section>`;
  const needs = activeId === "self" ? [
    ["♡", "Care", care ? `${care.done}/${care.total}` : "No check-in", care?.total ? care.done * 100 / care.total : NaN, "setView('log')"],
    ["☼", "Mood", mood?.mood ? moodLabel(mood.mood) : "No check-in", mood?.mood ? Number(mood.mood) * 20 : NaN, "openWellnessCheckin()"],
    ["◉", "Water", waterGoal ? `${Math.round(waterNow)}/${waterGoal} oz` : `${Math.round(waterNow)} oz`, waterGoal ? waterNow * 100 / waterGoal : NaN, "openCareHubSection('water')"],
    ["☾", "Sleep", sleep ? `${sleep.toFixed(1)} hr` : "No log", NaN, "openSleep()"]
  ].map(([icon,label,value,percent,action]) => `<button class="life-sim-need" type="button" onclick="${action}"><span class="life-sim-need-icon">${icon}</span><span class="life-sim-need-copy"><b>${label}</b><small>${esc(value)}</small></span><span class="life-sim-meter"><i style="width:${Math.max(0,Math.min(100,Number(percent)||0))}%"></i></span></button>`).join("") : `<div class="life-sim-needs-note"><b>Personal needs are not tracked for ${esc(active.name)}.</b><span>Showing assigned tasks and action progress only.</span></div>`;
  return `<section class="life-sim-hud" aria-label="Household live mode">
    <div class="life-sim-toolbar"><div class="life-sim-roster" role="group" aria-label="Household Sims">${rosterMarkup}</div><div class="life-sim-clock"><i></i><span>LIVE</span><b>${clock}</b></div></div>
    <div class="life-sim-play-panel">
      <div class="life-sim-active-sim"><div class="life-sim-portrait" aria-hidden="true">${esc(String(active.name||"?").trim().charAt(0).toUpperCase()||"?")}</div><div class="life-sim-sim-meta"><span class="eyebrow">ACTIVE SIM</span><h2>${esc(active.name)}</h2><small>${taskDone} of ${tasks.length} tasks done</small><button class="btn small" type="button" onclick="${activeId === "self" ? "setView('settings')" : `openPersonHub(${lifeSimArg(active.id)})`}">${activeId === "self" ? "Your profile" : "Sim profile"} ›</button></div></div>
      <div class="life-sim-needs-block"><div class="life-sim-panel-label">${activeId==="self"?"NEEDS":"TODAY"}</div><div class="life-sim-needs">${needs}</div></div>
      <div class="life-sim-current-block"><div class="life-sim-panel-label">CURRENT ACTION </div>${current?`<div class="life-sim-current-action"><span class="life-sim-plumbob" aria-hidden="true">✦</span><div><b>${esc(current.title)}</b><small>${esc(current.child||current.category||"Ready when you are")}</small></div><button class="btn small" type="button" onclick="openTaskDetails(${lifeSimArg(current.id)})">Open</button><button class="btn small life-sim-done" type="button" onclick="lifeSimCompleteTask(${lifeSimArg(current.id)})" aria-label="Mark ${esc(current.title)} done">✓</button></div>`:`<div class="life-sim-needs-note"><b>No current action</b><span>Choose from ${lifeSimAvailableTasks(active,activeId).length} unfinished tasks.</span></div>`}<div class="life-sim-queue">${queueMarkup}</div></div>
      <div class="life-sim-interactions" role="group" aria-label="Quick interactions"><button type="button" onclick="setView('household')"><span>⌂</span>House</button><button type="button" onclick="setView('family')"><span>♡</span>People</button><button type="button" onclick="setView('home')"><span>◇</span>Food</button><button type="button" onclick="setView('inventory')"><span>▦</span>Inventory</button><button type="button" onclick="setView('itinerary')"><span>◷</span>Plans</button></div>
    </div>
  </section>`;
}
