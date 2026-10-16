/* Sims-inspired interaction HUD, built from existing Daily Life records.
   This file only changes presentation preferences; it never edits household data. */
const LIFE_SIM_ACTIVE_KEY = "dailyLifeActiveSim-v1";

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

function lifeSimTaskRows(person, activeId) {
  const day = ymd();
  const personName = String(person?.name || "").trim().toLowerCase();
  return (state.tasks || [])
    .filter(task => task.date === day && !task.done && !task.paused && !task.waitingForFunds)
    .filter(task => {
      const assigned = String(task.child || "").trim().toLowerCase();
      return !assigned || assigned === personName || (activeId === "self" && assigned === String(state.profile?.name || "").trim().toLowerCase());
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, 3);
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
  const tasks = (state.tasks || []).filter(task => task.date === ymd() && !task.paused && !task.waitingForFunds);
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
    ? queued.map((task, index) => `<div class="life-sim-queue-item"><span class="life-sim-queue-order">${index + 1}</span><span class="life-sim-queue-copy"><b>${esc(task.title)}</b>${task.notes ? `<small>${esc(task.notes)}</small>` : ""}</span><button class="btn small" type="button" onclick="openTaskDetails('${esc(task.id)}')">Open</button></div>`).join("")
    : `<p class="muted small life-sim-empty">No unfinished tasks are queued for ${esc(active.name || "this Sim")} today.</p>`;
  const rosterMarkup = roster.map(person => {
    const selected = String(person.id) === activeId;
    const initial = String(person.name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<button class="life-sim-sim ${selected ? "is-active" : ""}" type="button" aria-pressed="${selected}" aria-label="Select ${esc(person.name)}" onclick="setLifeSim('${esc(person.id)}')"><span class="life-sim-avatar">${esc(initial)}</span><span>${esc(person.name)}</span></button>`;
  }).join("");
  const status = [
    lifeSimStatusMarkup("Household tasks", `${taskDone}/${tasks.length} done`, tasks.length ? taskDone * 100 / tasks.length : NaN, "setView('today')"),
    lifeSimStatusMarkup("Care logged", care ? `${care.done}/${care.total}` : "Not available", care?.total ? care.done * 100 / care.total : NaN, "setView('log')"),
    lifeSimStatusMarkup("Your mood", mood?.mood ? moodLabel(mood.mood) : "No check-in", mood?.mood ? Number(mood.mood) * 20 : NaN, "openWellnessCheckin()"),
    lifeSimStatusMarkup("Your water", waterGoal ? `${Math.round(waterNow)}/${waterGoal} oz` : `${Math.round(waterNow)} oz logged`, waterGoal ? waterNow * 100 / waterGoal : NaN, "openCareHubSection('water')"),
    lifeSimStatusMarkup("Your sleep", sleep ? `${sleep.toFixed(1)} hours logged` : "No sleep log", NaN, "openSleep()")
  ].join("");
  return `<section class="life-sim-hud" aria-label="Household live mode">
    <div class="life-sim-toolbar"><div class="life-sim-roster" role="group" aria-label="Household Sims">${rosterMarkup}</div>
      <details class="life-sim-console"><summary><span class="life-sim-live-indicator">●</span><span><b>Live mode</b><small>${esc(active.name)} · ${clock}</small></span><span class="life-sim-console-arrow">⌄</span></summary>
        <div class="life-sim-console-body">
          <div class="life-sim-section-heading"><div><div class="eyebrow">NEEDS + STATUS</div><b>Household at a glance</b></div><button type="button" class="btn small" onclick="${activeId === "self" ? "setView('settings')" : `openPersonHub('${esc(active.id)}')`}">${activeId === "self" ? "Settings" : "Sim profile"}</button></div>
          <div class="life-sim-status-grid">${status}</div>
          <div class="life-sim-section-heading life-sim-queue-heading"><div><div class="eyebrow">ACTION QUEUE</div><b>Next interactions</b></div><button type="button" class="btn small" onclick="setView('today')">Today</button></div>
          <div class="life-sim-queue">${queueMarkup}</div>
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
  </section>`;
}
