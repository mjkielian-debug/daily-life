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
  render();
}

function lifeSimAvailableTasks(person, activeId = lifeSimSelectedId()) {
  const day = ymd();
  const personName = String(person?.name || "").trim().toLowerCase();
  return (state.tasks || [])
    .filter(task => task.date === day && !task.done && !task.paused && !task.waitingForFunds)
    .filter(task => {
      const assigned = String(task.child || "").trim().toLowerCase();
      return !assigned || assigned === personName || (activeId === "self" && assigned === String(state.profile?.name || "").trim().toLowerCase());
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

function lifeSimOpenActionPicker() {
  const roster = lifeSimRoster(), activeId = lifeSimSelectedId(roster);
  const active = roster.find(person => String(person.id) === activeId) || roster[0];
  const queued = new Set(lifeSimTaskRows(active, activeId).map(task => String(task.id)));
  const candidates = lifeSimAvailableTasks(active, activeId).filter(task => !queued.has(String(task.id)));
  const rows = candidates.length
    ? candidates.map(task => `<button class="life-sim-picker-row" type="button" onclick="lifeSimQueueTask(${lifeSimArg(task.id)})"><span><b>${esc(task.title)}</b><small>${esc(task.child || task.category || "Household task")}</small></span><span aria-hidden="true">＋</span></button>`).join("")
    : `<p class="muted small">There are no other unfinished tasks available to add for ${esc(active.name)} today.</p>`;
  modal("Add an action", `<div class="stack life-sim-action-picker"><p class="muted small">Choose an existing task for ${esc(active.name)}. This only changes the action queue; it does not edit or complete the task.</p><div class="life-sim-picker-list">${rows}</div></div>`, "Close", closeModal);
}

function lifeSimStatusMarkup(label, value, percent, action) {
  const measured = Number.isFinite(Number(percent));
  return `<button class="life-sim-status" type="button" onclick="${action}">
    <span class="life-sim-status-head"><b>${esc(label)}</b><small>${esc(value)}</small></span>
    ${measured ? `<span class="life-sim-meter" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Number(percent)))}"><i style="width:${Math.max(0, Math.min(100, Number(percent)))}%"></i></span>` : `<span class="life-sim-meter life-sim-meter-unknown"><i></i></span>`}
  </button>`;
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
    return !assigned || assigned === activeName;
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
  const queueMarkup = queued.length
    ? queued.map((task, index) => `<div class="life-sim-queue-item"><span class="life-sim-queue-order">${index + 1}</span><span class="life-sim-queue-copy"><b>${esc(task.title)}</b>${task.notes ? `<small>${esc(task.notes)}</small>` : ""}</span><span class="life-sim-queue-controls"><button class="btn small" type="button" aria-label="Move ${esc(task.title)} up" onclick="lifeSimMoveTask(${lifeSimArg(task.id)},-1)" ${index===0?"disabled":""}>↑</button><button class="btn small" type="button" aria-label="Move ${esc(task.title)} down" onclick="lifeSimMoveTask(${lifeSimArg(task.id)},1)" ${index===queued.length-1?"disabled":""}>↓</button><button class="btn small" type="button" onclick="openTaskDetails(${lifeSimArg(task.id)})">Open</button><button class="btn small" type="button" aria-label="Remove ${esc(task.title)} from queue" onclick="lifeSimRemoveTask(${lifeSimArg(task.id)})">×</button></span></div>`).join("")
    : `<p class="muted small life-sim-empty">No unfinished tasks are queued for ${esc(active.name || "this Sim")} today.</p>`;
  const rosterMarkup = roster.map(person => {
    const selected = String(person.id) === activeId;
    const initial = String(person.name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<button class="life-sim-sim ${selected ? "is-active" : ""}" type="button" aria-pressed="${selected}" aria-label="Select ${esc(person.name)}" onclick="setLifeSim(${lifeSimArg(person.id)})"><span class="life-sim-avatar">${esc(initial)}</span><span>${esc(person.name)}</span></button>`;
  }).join("");
  const status = activeId === "self" ? [
    lifeSimStatusMarkup("Today’s tasks", `${taskDone}/${tasks.length} done`, tasks.length ? taskDone * 100 / tasks.length : NaN, "setView('today')"),
    lifeSimStatusMarkup("Care", care ? `${care.done}/${care.total}` : "Not logged", care?.total ? care.done * 100 / care.total : NaN, "setView('log')"),
    lifeSimStatusMarkup("Mood", mood?.mood ? moodLabel(mood.mood) : "No check-in", mood?.mood ? Number(mood.mood) * 20 : NaN, "openWellnessCheckin()"),
    lifeSimStatusMarkup("Water", waterGoal ? `${Math.round(waterNow)}/${waterGoal} oz` : `${Math.round(waterNow)} oz logged`, waterGoal ? waterNow * 100 / waterGoal : NaN, "openCareHubSection('water')"),
    lifeSimStatusMarkup("Sleep", sleep ? `${sleep.toFixed(1)} hours logged` : "No sleep log", NaN, "openSleep()")
  ].join("") : [
    lifeSimStatusMarkup("Today’s tasks", `${taskDone}/${tasks.length} done`, tasks.length ? taskDone * 100 / tasks.length : NaN, "setView('today')"),
    lifeSimStatusMarkup("Personal needs", "Not tracked for this Sim", NaN, `openPersonHub(${lifeSimArg(active.id)})`)
  ].join("");
  return `<section class="life-sim-hud" aria-label="Household live mode">
    <div class="life-sim-toolbar"><div class="life-sim-roster" role="group" aria-label="Household Sims">${rosterMarkup}</div>
      <details class="life-sim-console"><summary><span class="life-sim-live-indicator">●</span><span><b>Live mode</b><small>${esc(active.name)} · ${clock}</small></span><span class="life-sim-console-arrow">⌄</span></summary>
        <div class="life-sim-console-body">
          <div class="life-sim-section-heading"><div><div class="eyebrow">NEEDS + STATUS</div><b>${activeId === "self" ? "Your Sim needs" : esc(active.name) + " · status"}</b></div><button type="button" class="btn small" onclick="${activeId === "self" ? "setView('settings')" : `openPersonHub(${lifeSimArg(active.id)})`}">${activeId === "self" ? "Settings" : "Sim profile"}</button></div>
          <div class="life-sim-status-grid">${status}</div>
          <div class="life-sim-interactions" role="group" aria-label="Quick interactions">
            <button class="btn small" type="button" onclick="setView('household')">⌂ House</button>
            <button class="btn small" type="button" onclick="setView('family')">♡ People</button>
            <button class="btn small" type="button" onclick="setView('home')">◇ Food</button>
            <button class="btn small" type="button" onclick="setView('inventory')">▦ Inventory</button>
            <button class="btn small" type="button" onclick="setView('itinerary')">◷ Plans</button>
            <button class="btn small" type="button" onclick="openSectionLauncher()">☰ Sections</button>
          </div>
        </div>
      </details>
    </div>
    <section class="life-sim-focus" aria-label="Active Sim and action queue">
      <div class="life-sim-focus-heading"><span class="life-sim-avatar life-sim-focus-avatar">${esc(String(active.name || "?").trim().charAt(0).toUpperCase() || "?")}</span><span class="life-sim-focus-copy"><span class="eyebrow">ACTIVE SIM · LIVE</span><b>${esc(active.name)}</b><small>${clock} · ${queued.length} queued</small></span><button type="button" class="btn small primary" onclick="lifeSimOpenActionPicker()">＋ Action</button></div>
      <div class="life-sim-section-heading life-sim-focus-queue-heading"><div><div class="eyebrow">ACTION QUEUE</div><b>Up next for ${esc(active.name || "this Sim")}</b></div><span class="tag">${queued.length} queued</span></div>
      <div class="life-sim-queue">${queueMarkup}</div>
    </section>
  </section>`;
}
