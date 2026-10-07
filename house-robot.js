/* Daily Life · robot vacuum / house-map companion
   Generic UI only. Household map geometry and names stay in private app state. */
(function(){
  function robotEnsure(){
    state.homeAutomation=state.homeAutomation&&typeof state.homeAutomation==="object"?state.homeAutomation:{};
    const current=state.homeAutomation.robotVacuum&&typeof state.homeAutomation.robotVacuum==="object"?state.homeAutomation.robotVacuum:{};
    state.homeAutomation.robotVacuum={
      deviceName:String(current.deviceName||"Robot vacuum"),
      status:String(current.status||"Unknown"),
      battery:(current.battery===null||current.battery===undefined||current.battery==="")?null:(Number.isFinite(Number(current.battery))?Math.max(0,Math.min(100,Number(current.battery))):null),
      mode:String(current.mode||"Auto"),
      dockState:String(current.dockState||"Unknown"),
      binState:String(current.binState||"Unknown"),
      activeFloor:String(current.activeFloor||""),
      selectedRoomIds:Array.isArray(current.selectedRoomIds)?current.selectedRoomIds:[],
      alerts:Array.isArray(current.alerts)?current.alerts:[],
      cleaningHistory:Array.isArray(current.cleaningHistory)?current.cleaningHistory:[],
      notes:String(current.notes||""),
      updatedAt:String(current.updatedAt||"")
    };
    return state.homeAutomation.robotVacuum;
  }
  function robotFloors(){
    const rooms=state.houseRooms||[],
      core=["Basement","First floor","Second floor","Third floor"],
      found=[...new Set(rooms.map(r=>String(r.floor||"").trim()).filter(Boolean))],
      extras=found.filter(f=>!core.includes(f)).sort((a,b)=>a.localeCompare(b)),
      floors=[...core,...extras];
    if(rooms.some(r=>!String(r.floor||"").trim()))floors.push("Unassigned");
    return floors;
  }
  function robotRoomsForFloor(floor){
    const rooms=state.houseRooms||[];
    if(floor==="House"&&!rooms.some(r=>String(r.floor||"").trim()))return rooms;
    if(floor==="Unassigned")return rooms.filter(r=>!String(r.floor||"").trim());
    return rooms.filter(r=>!floor||String(r.floor||"")===String(floor));
  }
  function robotStatusTone(status){status=String(status||"").toLowerCase();if(/clean|charg|dock/.test(status))return"good";if(/error|stuck|offline/.test(status))return"bad";return"neutral"}
  function robotRelativeTime(value){
    if(!value)return"Not updated yet";const t=new Date(value).getTime();if(!Number.isFinite(t))return"Not updated yet";
    const mins=Math.max(0,Math.round((Date.now()-t)/60000));if(mins<2)return"just now";if(mins<60)return mins+" min ago";const h=Math.round(mins/60);if(h<24)return h+" hr"+(h===1?"":"s")+" ago";return new Date(t).toLocaleDateString();
  }
  function robotSelectedNames(v){
    const ids=new Set(v.selectedRoomIds||[]);return (state.houseRooms||[]).filter(r=>ids.has(r.id)).map(r=>r.name||"Unnamed room");
  }
  function robotAlertRoomLabel(a){return (state.houseRooms||[]).find(r=>r.id===a.roomId)?.name||a.roomLabel||"Map area"}
  function robotMapSummary(){
    const v=robotEnsure(),floors=robotFloors(),selected=new Set(v.selectedRoomIds||[]),activeAlerts=(v.alerts||[]).filter(a=>a.active!==false),alertRooms=new Set(activeAlerts.map(a=>a.roomId).filter(Boolean));
    return `<div class="robot-floor-grid">${floors.map(f=>{const rooms=robotRoomsForFloor(f);return `<div class="robot-floor"><div class="robot-floor-head"><b>${esc(f)}</b><span>${rooms.length} area${rooms.length===1?"":"s"}</span></div><div class="robot-room-pills">${rooms.length?rooms.map(r=>`<button class="robot-room-pill ${selected.has(r.id)?"is-selected":""} ${alertRooms.has(r.id)?"has-alert":""}" type="button" onclick="openInventoryRoom('${r.id}')"><i style="background:${esc(r.mapColor||'var(--primary)')}"></i><span>${esc(r.name||"Unnamed room")}</span>${selected.has(r.id)?'<strong title="Selected for next run">✓</strong>':""}${alertRooms.has(r.id)?'<em title="Sensor warning">!</em>':""}</button>`).join(""):'<span class="muted small">No mapped areas yet.</span>'}</div></div>`}).join("")}</div>`;
  }
  function robotVacuumCard(){
    const v=robotEnsure(),selected=robotSelectedNames(v),alerts=[...(v.alerts||[])].filter(a=>a.active!==false),history=[...(v.cleaningHistory||[])].sort((a,b)=>String(b.finishedAt||b.startedAt||"").localeCompare(String(a.finishedAt||a.startedAt||""))).slice(0,4);
    const battery=v.battery===null?"—":Math.round(v.battery)+"%";
    return `<div class="card robot-card"><div class="section-title"><div><div class="eyebrow">◉ House + robot vacuum</div><h2>${esc(v.deviceName||"Robot vacuum")}</h2><div class="muted small">House-map companion · manual status until a supported device sync is connected</div></div><button class="btn" type="button" onclick="robotOpenStatus()">Update status</button></div>
      <div class="robot-status-grid">
        <button class="robot-status-cell" type="button" onclick="robotOpenStatus()"><span>Battery</span><b>${battery}</b><small>${v.battery===null?"Add a reading":v.battery<=20?"Low battery":"Recorded"}</small></button>
        <button class="robot-status-cell" type="button" onclick="robotOpenStatus()"><span>Status</span><b class="robot-tone-${robotStatusTone(v.status)}">${esc(v.status)}</b><small>${esc(v.mode)} mode</small></button>
        <button class="robot-status-cell" type="button" onclick="robotOpenStatus()"><span>Dock</span><b>${esc(v.dockState)}</b><small>Dock / charge state</small></button>
        <button class="robot-status-cell" type="button" onclick="robotOpenStatus()"><span>Bin</span><b>${esc(v.binState)}</b><small>Dust-bin state</small></button>
      </div>
      ${robotMapSummary()}
      <div class="robot-actions"><button class="btn primary" type="button" onclick="robotPlanClean()">Choose rooms</button><button class="btn" type="button" onclick="robotLogClean()">Log a cleaning</button><button class="btn" type="button" onclick="robotAddAlert()">+ Sensor / cliff note</button></div>
      ${selected.length?`<div class="notice robot-plan"><b>Next room plan</b><div class="small">${esc(selected.join(" · "))}</div></div>`:""}
      ${alerts.length?`<div class="robot-alerts"><div class="mini-heading">Map / sensor warnings</div>${alerts.map(a=>`<div class="robot-alert"><span>!</span><div class="grow"><b>${esc(a.kind||"Sensor note")} · ${esc(robotAlertRoomLabel(a))}</b><small>${esc(a.note||"Review this area before the next run.")}</small></div><button class="btn small" type="button" onclick="robotResolveAlert('${a.id}')">Clear</button></div>`).join("")}</div>`:""}
      ${history.length?`<details class="robot-history"><summary>Recent cleanings (${v.cleaningHistory.length})</summary>${history.map(h=>`<div class="robot-history-row"><div><b>${esc(h.floor||"House")}${(h.roomNames||[]).length?" · "+esc(h.roomNames.join(", ")):""}</b><small>${new Date(h.finishedAt||h.startedAt).toLocaleString()} · ${esc(h.mode||"Auto")}</small></div>${h.note?`<span class="small muted">${esc(h.note)}</span>`:""}</div>`).join("")}</details>`:""}
      <div class="muted small robot-updated">Status updated ${esc(robotRelativeTime(v.updatedAt))}. This panel records and organizes robot-vacuum information; it does not send commands to the vacuum yet.</div>
    </div>`;
  }
  window.robotOpenStatus=function(){
    const v=robotEnsure(),floors=robotFloors();
    modal("Robot vacuum status",`<div class="stack">
      <label>Device name<input id="rvName" maxlength="80" value="${esc(v.deviceName)}"></label>
      <div class="grid2"><label>Battery %<input id="rvBattery" type="number" min="0" max="100" step="1" value="${v.battery===null?"":esc(v.battery)}" placeholder="0–100"></label><label>Status<select id="rvStatus">${["Unknown","Docked","Charging","Idle","Cleaning","Paused","Returning to dock","Stuck / error","Offline"].map(x=>`<option ${v.status===x?"selected":""}>${x}</option>`).join("")}</select></label></div>
      <div class="grid2"><label>Cleaning mode<select id="rvMode">${["Auto","Rooms","Zone","Spot","Edge","Quiet","Max","Unknown"].map(x=>`<option ${v.mode===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Active floor<select id="rvFloor"><option value="">Not set</option>${floors.map(x=>`<option ${v.activeFloor===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label></div>
      <div class="grid2"><label>Dock state<select id="rvDock">${["Unknown","At dock","Charging","Away from dock","Dock not found","Dock needs attention"].map(x=>`<option ${v.dockState===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Bin state<select id="rvBin">${["Unknown","Okay","Nearly full","Full","Emptied","Needs attention"].map(x=>`<option ${v.binState===x?"selected":""}>${x}</option>`).join("")}</select></label></div>
      <label>Notes<textarea id="rvNotes" rows="3" placeholder="Brush, filter, mop pad, odd noises, dock behavior…">${esc(v.notes)}</textarea></label>
    </div>`,"Save status",async()=>{
      const batteryRaw=$("#rvBattery").value.trim(),battery=batteryRaw===""?null:Math.max(0,Math.min(100,Number(batteryRaw)));
      Object.assign(v,{deviceName:$("#rvName").value.trim()||"Robot vacuum",battery:Number.isFinite(battery)?battery:null,status:$("#rvStatus").value,mode:$("#rvMode").value,activeFloor:$("#rvFloor").value,dockState:$("#rvDock").value,binState:$("#rvBin").value,notes:$("#rvNotes").value.trim(),updatedAt:new Date().toISOString()});
      await save();closeModal();render();
    });
  };
  window.robotPlanClean=function(){
    const v=robotEnsure(),floors=robotFloors(),checked=new Set(v.selectedRoomIds||[]);
    modal("Choose rooms for the next run",`<div class="stack"><p class="muted small">This saves a room plan in Daily Life. It does not send the plan to the robot vacuum.</p>${floors.map(f=>`<div><div class="mini-heading">${esc(f)}</div>${robotRoomsForFloor(f).map(r=>`<label class="task"><input class="rvRoom" type="checkbox" value="${esc(r.id)}" ${checked.has(r.id)?"checked":""}><span><i class="robot-dot" style="background:${esc(r.mapColor||'var(--primary)')}"></i>${esc(r.name||"Unnamed room")}</span></label>`).join("")||'<div class="muted small">No mapped rooms.</div>'}</div>`).join("")}</div>`,"Save room plan",async()=>{
      v.selectedRoomIds=[...document.querySelectorAll(".rvRoom:checked")].map(x=>x.value);v.updatedAt=new Date().toISOString();await save();closeModal();render();
    });
  };
  window.robotLogClean=function(){
    const v=robotEnsure(),floors=robotFloors(),pre=new Set(v.selectedRoomIds||[]);
    modal("Log robot cleaning",`<div class="stack"><div class="grid2"><label>Floor<select id="rvLogFloor"><option value="">Whole house / mixed</option>${floors.map(x=>`<option ${v.activeFloor===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label><label>Mode<select id="rvLogMode">${["Auto","Rooms","Zone","Spot","Edge","Quiet","Max","Unknown"].map(x=>`<option ${v.mode===x?"selected":""}>${x}</option>`).join("")}</select></label></div><div><div class="mini-heading">Rooms cleaned</div>${(state.houseRooms||[]).map(r=>`<label class="task"><input class="rvLogRoom" type="checkbox" value="${esc(r.id)}" ${pre.has(r.id)?"checked":""}><span><i class="robot-dot" style="background:${esc(r.mapColor||'var(--primary)')}"></i>${esc(r.name||"Unnamed room")}</span></label>`).join("")||'<div class="muted small">No mapped rooms yet.</div>'}</div><label>Notes<textarea id="rvLogNote" rows="2" placeholder="Anything unusual about this run?"></textarea></label></div>`,"Save cleaning",async()=>{
      const ids=[...document.querySelectorAll(".rvLogRoom:checked")].map(x=>x.value),roomNames=(state.houseRooms||[]).filter(r=>ids.includes(r.id)).map(r=>r.name||"Unnamed room"),now=new Date().toISOString();
      v.cleaningHistory.push({id:uid(),startedAt:now,finishedAt:now,floor:$("#rvLogFloor").value,mode:$("#rvLogMode").value,roomIds:ids,roomNames,note:$("#rvLogNote").value.trim()});v.selectedRoomIds=[];v.status="Docked";v.updatedAt=now;await save();closeModal();render();
    });
  };
  window.robotAddAlert=function(){
    const v=robotEnsure(),rooms=state.houseRooms||[];
    modal("Add map / sensor note",`<div class="stack"><label>Area<select id="rvAlertRoom"><option value="">General / unknown area</option>${rooms.map(r=>`<option value="${esc(r.id)}">${esc(r.floor?`${r.floor} · `:"")}${esc(r.name||"Unnamed room")}</option>`).join("")}</select></label><label>Type<select id="rvAlertKind"><option>Suspected cliff / drop sensor area</option><option>Gets stuck here</option><option>Navigation issue</option><option>Docking issue</option><option>Needs physical check</option><option>Other sensor note</option></select></label><label>Note<textarea id="rvAlertNote" rows="3" placeholder="What did the map or vacuum show?"></textarea></label><div class="muted small">A cliff marker from a device screenshot is treated as a robot/sensor warning only, not as a verified emergency route or measured drop.</div></div>`,"Save note",async()=>{
      const roomId=$("#rvAlertRoom").value,room=(state.houseRooms||[]).find(r=>r.id===roomId);v.alerts.push({id:uid(),roomId,roomLabel:room?.name||"",kind:$("#rvAlertKind").value,note:$("#rvAlertNote").value.trim(),active:true,createdAt:new Date().toISOString()});v.updatedAt=new Date().toISOString();await save();closeModal();render();
    });
  };
  window.robotResolveAlert=async function(id){const v=robotEnsure(),a=v.alerts.find(x=>x.id===id);if(!a)return;a.active=false;a.resolvedAt=new Date().toISOString();v.updatedAt=new Date().toISOString();await save();render();};

  const style=document.createElement("style");style.id="robot-vacuum-styles";style.textContent=`
    .robot-card{overflow:hidden}.robot-status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}.robot-status-cell{border:1px solid var(--border);border-radius:16px;background:color-mix(in srgb,var(--panel) 88%,transparent);color:inherit;text-align:left;padding:11px;min-width:0;cursor:pointer}.robot-status-cell span,.robot-status-cell small{display:block;color:var(--muted);font-size:.72rem}.robot-status-cell b{display:block;margin:4px 0;font-size:1rem;overflow-wrap:anywhere}.robot-tone-good{color:var(--success)}.robot-tone-bad{color:var(--danger)}.robot-floor-grid{display:grid;gap:10px;margin:12px 0}.robot-floor{border:1px solid var(--border);border-radius:16px;padding:11px;background:color-mix(in srgb,var(--primary) 5%,transparent)}.robot-floor-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}.robot-floor-head span{font-size:.74rem;color:var(--muted)}.robot-room-pills{display:flex;flex-wrap:wrap;gap:7px}.robot-room-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:inherit;padding:7px 10px;cursor:pointer}.robot-room-pill i,.robot-dot{display:inline-block;width:11px;height:11px;border-radius:50%;flex:0 0 11px}.robot-room-pill strong{font-size:.72rem;color:var(--success)}.robot-room-pill em{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;font-size:.68rem;font-style:normal;font-weight:900;color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,transparent)}.robot-room-pill.is-selected{border-color:color-mix(in srgb,var(--success) 45%,var(--border));background:color-mix(in srgb,var(--success) 7%,var(--panel))}.robot-room-pill.has-alert{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--danger) 26%,transparent)}.robot-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.robot-plan{margin-top:10px}.robot-alerts{margin-top:14px}.robot-alert{display:flex;align-items:flex-start;gap:9px;border-top:1px solid var(--border);padding:10px 0}.robot-alert>span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:color-mix(in srgb,var(--danger) 14%,transparent);color:var(--danger);font-weight:900}.robot-alert small,.robot-history-row small{display:block;color:var(--muted);margin-top:3px}.robot-history{margin-top:12px;border-top:1px solid var(--border)}.robot-history summary{cursor:pointer;padding:11px 0;font-weight:800}.robot-history-row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--border)}.robot-updated{margin-top:10px}.task .robot-dot{margin-right:7px;vertical-align:-1px}@media(max-width:620px){.robot-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.robot-history-row{display:block}}
  `;document.head.appendChild(style);

  /* Robot-vacuum logging stays available as a companion layer, but it no longer
     inserts a device-status dashboard above Inventory > House map. The house map
     is now the inventory/layout surface. */
  if(typeof render==="function")render();
})();