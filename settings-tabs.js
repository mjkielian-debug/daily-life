/* Daily Life — compact Settings tabs.
   Loaded after the main app script so it can safely replace the long Settings view. */

let settingsTab=localStorage.getItem("dailyLifeSettingsTab")||"general";

function setSettingsTab(tab){
  settingsTab=["general","routines","connections","backup"].includes(tab)?tab:"general";
  localStorage.setItem("dailyLifeSettingsTab",settingsTab);
  render();
}

function compactSettingsTabs(){
  const tabs=[
    ["general","✦","General"],
    ["routines","↻","Routines"],
    ["connections","⌁","Connections"],
    ["backup","◇","Backup"]
  ];
  return `<div class="settings-tabs" role="tablist" aria-label="Settings sections">${tabs.map(([key,icon,label])=>`<button type="button" role="tab" aria-selected="${settingsTab===key?"true":"false"}" class="${settingsTab===key?"active":""}" onclick="setSettingsTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join("")}</div>`;
}

function compactSettingsGeneral(){
  return `<div class="settings-tab-panel">
    <div class="settings-row-section"><div><div class="eyebrow">Hobbies + crafts</div><h2>Creative workspace</h2><div class="muted small">Projects, materials, costs, progress photos, and next steps live outside Settings.</div></div><button class="btn primary" onclick="setView('gardenhobbies')">Open</button></div>
    <div class="settings-row-section"><div><div class="eyebrow">Private Vault</div><h2>Secure documents + logins</h2><div class="muted small">Encrypted identity documents, insurance, school paperwork, medical/admin records, and passwords.</div></div><button class="btn primary" onclick="setView('vault')">Open</button></div>
    <div class="settings-row-section"><div><div class="eyebrow">Moon + astrology</div><h2>${esc(state.profile.sunSign||"No sign lens set")}</h2><div class="muted small">Optional spiritual reflection settings.</div></div><button class="btn" onclick="openAstrologySettings()">Edit</button></div>
  </div>`;
}

function compactSettingsRoutines(){
  const routines=(state.settings.recurringTasks||[]);
  const meals=(state.settings.mealPatterns||[]);
  return `<div class="settings-tab-panel">
    <section class="settings-flat-section">
      <div class="section-title"><div><div class="eyebrow">Recurring routines</div><h2>${routines.length?routines.length+" recurring task"+(routines.length===1?"":"s"):"No routines yet"}</h2></div><button class="btn primary" onclick="openRoutine()">+ Routine</button></div>
      ${routines.length?routines.map((x,i)=>`<div class="settings-list-row"><span><b>${esc(x.title)}</b><small>${(x.days||[]).map(d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")||"Every day"}${x.notes?" · "+esc(x.notes):""}</small></span><button class="btn small" onclick="removeRoutine(${i})">Remove</button></div>`).join(""):`<div class="muted small">Add the repeating things Daily Life should remember automatically.</div>`}
    </section>
    <section class="settings-flat-section">
      <div class="section-title"><div><div class="eyebrow">Weekly meal patterns</div><h2>${meals.length?meals.length+" meal rule"+(meals.length===1?"":"s"):"No meal patterns yet"}</h2></div><button class="btn" onclick="openMealPattern()">+ Pattern</button></div>
      ${meals.length?meals.map((p,i)=>`<div class="settings-list-row"><span><b>${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][p.weekday]} · ${esc(p.dish)}</b><small>${esc(p.method||"")}${p.notes?" · "+esc(p.notes):""}</small></span><button class="btn small" onclick="removeMealPattern(${i})">Remove</button></div>`).join(""):`<div class="muted small">Meal patterns can automatically shape the weekly food plan.</div>`}
    </section>
  </div>`;
}

function compactSettingsConnections(){
  return `<div class="settings-tab-panel settings-component-stack">
    ${connectionsCard()}
    ${typeof sharingSettingsCard==="function"?sharingSettingsCard():""}
    ${cloudPanel()}
  </div>`;
}

function compactSettingsBackup(){
  return `<div class="settings-tab-panel settings-component-stack">
    ${systemHealthCard()}
    ${backupHealthCard()}
    <section class="settings-flat-section">
      <div class="section-title"><div><div class="eyebrow">Backup + ownership</div><h2>Your data stays yours</h2></div><span class="tag">local-first</span></div>
      <div class="muted small">Keep at least one recovery copy before changing phones or clearing browser data.</div>
      <div class="actions" style="margin-top:10px"><button class="btn primary" onclick="backup()">Export app backup</button><button class="btn" onclick="document.querySelector('#restoreFile').click()">Restore backup</button><button class="btn danger" onclick="erase()">Erase local data</button></div>
    </section>
  </div>`;
}

/* The main app now provides the radial one-screen Settings hub.
   Keep this legacy compact view only as a fallback for older shells. */
if(typeof openSettingsHubSection!=="function"){
  settingsView=function(){
    const body=settingsTab==="routines"?compactSettingsRoutines():
               settingsTab==="connections"?compactSettingsConnections():
               settingsTab==="backup"?compactSettingsBackup():
               compactSettingsGeneral();
    return `<div class="settings-hero"><div class="section-title"><div><div class="eyebrow">⚙ Daily Life</div><h1>Settings</h1><div class="muted small">Setup and maintenance, organized so you do not have to scroll through everything at once.</div></div><button class="btn" onclick="setView('today')">Done</button></div></div>
      ${compactSettingsTabs()}
      ${body}`;
  };
}

(function installCompactSettingsStyles(){
  if(document.getElementById("compactSettingsStyles"))return;
  const style=document.createElement("style");
  style.id="compactSettingsStyles";
  style.textContent=`
    .settings-hero{padding:8px 2px 10px;border-bottom:1px solid color-mix(in srgb,var(--primary) 22%,var(--border))}
    .settings-hero h1{font-family:var(--font-heading);font-size:1.45rem;margin:3px 0;color:var(--cream)}
    .settings-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:9px 0 12px;padding:4px;border:1px solid color-mix(in srgb,var(--secondary) 13%,var(--border));border-radius:16px;background:color-mix(in srgb,var(--panel2) 75%,transparent)}
    .settings-tabs button{display:grid;place-items:center;gap:2px;min-height:47px;border:0;border-radius:12px;background:transparent;color:var(--muted);font:inherit;padding:6px 2px}
    .settings-tabs button span{font-size:.9rem}.settings-tabs button b{font-size:.66rem}
    .settings-tabs button.active{color:var(--cream);background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 14%,transparent),color-mix(in srgb,var(--secondary) 6%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 22%,var(--border))}
    .settings-tab-panel{display:grid;gap:0}
    .settings-row-section{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:15px 2px;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border))}
    .settings-row-section:first-child{border-top:0}
    .settings-row-section>div{min-width:0}.settings-row-section h2{font-size:1.05rem;margin:2px 0}
    .settings-flat-section{padding:13px 2px;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border))}
    .settings-flat-section:first-child{border-top:0}
    .settings-list-row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border)}
    .settings-list-row:first-of-type{border-top:0}
    .settings-list-row span{min-width:0}.settings-list-row small{display:block;color:var(--muted);font-size:.7rem;line-height:1.35;margin-top:2px}
    .settings-component-stack>.card{margin:0;padding:13px 2px;border:0;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border));border-radius:0;background:transparent;box-shadow:none}
    .settings-component-stack>.card:first-child{border-top:0}
    .settings-component-stack .notice{border:0;border-left:3px solid color-mix(in srgb,var(--primary) 50%,var(--border));border-radius:0;background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 6%,transparent),transparent 72%);padding:8px 0 8px 11px}
    @media(max-width:520px){
      .settings-tabs{gap:2px}.settings-tabs button{min-height:44px}
      .settings-row-section{align-items:flex-start}
      .settings-row-section>.btn{flex:0 0 auto}
    }
  `;
  document.head.appendChild(style);
})();
