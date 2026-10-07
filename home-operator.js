/* Daily Life · house operating layer
   Turns the house map into a practical reset / declutter system. */
(function(){
  "use strict";
  const HOME_MAP_IMAGE_KEY="dailyLifeLocalHouseMap:firstFloor";
  const HOME_MAP_PREFIX="dailyLifeLocalHouseMap:floor:";
  const HOME_MAP_ACTIVE_KEY="dailyLifeLocalHouseMap:activeFloor";
  const HOME_MAP_DB_PREFIX="house-floor-plan-v2:";
  const homeFloorPlanCache=new Map();
  const homeFloorPlanLoaded=new Set();

  function homeFloorList(){
    const core=["Basement","First floor","Second floor","Third floor"],seen=new Set(core),extras=[];
    for(const r of state.houseRooms||[]){
      const floor=String(r.floor||"").trim()||"Unassigned";
      if(!seen.has(floor)){seen.add(floor);extras.push(floor)}
    }
    const rank=floor=>{
      const x=String(floor||"").toLowerCase();
      if(/garage/.test(x))return 10;
      if(/outside/.test(x))return 11;
      if(/unassigned/.test(x))return 99;
      return 50;
    };
    return [...core,...extras.sort((a,b)=>rank(a)-rank(b)||String(a).localeCompare(String(b)))];
  }
  function homeFloorStorageKey(floor){
    return HOME_MAP_PREFIX+encodeURIComponent(String(floor||"First floor").trim()||"First floor");
  }
  function homeFloorDbKey(floor){
    return HOME_MAP_DB_PREFIX+encodeURIComponent(String(floor||"First floor").trim()||"First floor");
  }
  function homeActiveFloor(){
    const floors=homeFloorList();
    let active="";
    try{active=localStorage.getItem(HOME_MAP_ACTIVE_KEY)||""}catch(e){}
    if(!floors.includes(active))active=floors.includes("First floor")?"First floor":floors[0];
    return active;
  }
  function homeSetActiveFloorValue(floor){
    floor=String(floor||"").trim();
    if(!floor)return;
    try{localStorage.setItem(HOME_MAP_ACTIVE_KEY,floor)}catch(e){}
  }
  function homeLegacyMapImage(floor){
    try{
      const modern=localStorage.getItem(homeFloorStorageKey(floor))||"";
      if(modern)return modern;
      if(String(floor).toLowerCase()==="first floor")return localStorage.getItem(HOME_MAP_IMAGE_KEY)||"";
    }catch(e){}
    return "";
  }
  function homeLocalMapImage(floor=homeActiveFloor()){
    floor=String(floor||"").trim()||"First floor";
    return homeFloorPlanCache.get(floor)||homeLegacyMapImage(floor)||"";
  }
  async function homeLoadFloorPlan(floor){
    floor=String(floor||"").trim()||"First floor";
    if(homeFloorPlanLoaded.has(floor))return homeFloorPlanCache.get(floor)||"";
    homeFloorPlanLoaded.add(floor);
    try{
      const saved=await dbGet(homeFloorDbKey(floor));
      const data=typeof saved==="string"?saved:String(saved?.dataUrl||"");
      if(data.startsWith("data:image/")){homeFloorPlanCache.set(floor,data);return data}
    }catch(e){}
    const legacy=homeLegacyMapImage(floor);
    if(legacy.startsWith("data:image/")){
      homeFloorPlanCache.set(floor,legacy);
      try{
        await dbSet(homeFloorDbKey(floor),{dataUrl:legacy,migratedAt:new Date().toISOString()});
        localStorage.removeItem(homeFloorStorageKey(floor));
        if(floor.toLowerCase()==="first floor")localStorage.removeItem(HOME_MAP_IMAGE_KEY);
      }catch(e){}
    }
    return legacy;
  }
  async function homeLoadFloorPlans(){
    const floors=homeFloorList();
    await Promise.all(floors.map(homeLoadFloorPlan));
    if(typeof render==="function")render();
  }
  function homeImportedMapReference(floor=homeActiveFloor()){
    const needle=String(floor||"").trim().toLowerCase();
    const maps=(state.projects||[]).filter(x=>Array.isArray(x.mapZones)&&Array.isArray(x.referencePhotos)&&x.referencePhotos.length);
    const match=maps.find(m=>(m.mapZones||[]).some(z=>String(z.floor||"").trim().toLowerCase()===needle));
    if(!match)return{src:"",title:""};
    const src=(match.referencePhotos||[]).find(p=>String(p||"").startsWith("data:image/"))||"";
    return{src,title:String(match.title||"Reviewed house map")};
  }
  function homeRefreshMapSurface(){
    if(document.querySelector("#modal")&&typeof openInventoryHubSection==="function"){
      closeModal();openInventoryHubSection("map");return;
    }
    render();
  }
  function homeCompressFloorPlan(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{
        try{
          const max=1800,scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1)),
            width=Math.max(1,Math.round(img.naturalWidth*scale)),height=Math.max(1,Math.round(img.naturalHeight*scale)),
            canvas=document.createElement("canvas");
          canvas.width=width;canvas.height=height;
          const ctx=canvas.getContext("2d");
          ctx.fillStyle="#ffffff";ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
          let data=canvas.toDataURL("image/webp",.9);
          if(!data.startsWith("data:image/webp"))data=canvas.toDataURL("image/jpeg",.9);
          URL.revokeObjectURL(url);resolve({dataUrl:data,width,height});
        }catch(e){URL.revokeObjectURL(url);reject(e)}
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image load failed"))};
      img.src=url;
    });
  }
  window.homeSetMapFloor=function(floor){
    homeSetActiveFloorValue(floor);
    if(!homeFloorPlanLoaded.has(String(floor||"")))homeLoadFloorPlan(floor).then(()=>homeRefreshMapSurface()).catch(()=>{});
    else homeRefreshMapSurface();
  };
  window.homeChooseFloorPlan=function(floor=homeActiveFloor()){
    homeSetActiveFloorValue(floor);
    const input=document.createElement("input");
    input.type="file";
    input.accept="image/jpeg,image/png,image/webp";
    input.onchange=()=>{const file=input.files&&input.files[0];if(file)homeSaveFloorPlan(file,floor)};
    input.click();
  };
  window.homeSaveFloorPlan=async function(file,floor=homeActiveFloor()){
    if(!file||!/^image\/(jpeg|png|webp)$/i.test(String(file.type||""))){alert("Choose a JPG, PNG, or WebP image.");return}
    floor=String(floor||"").trim()||"First floor";
    try{
      const compressed=await homeCompressFloorPlan(file),
        record={...compressed,fileName:String(file.name||"floor-plan"),savedAt:new Date().toISOString()};
      await dbSet(homeFloorDbKey(floor),record);
      homeFloorPlanCache.set(floor,compressed.dataUrl);homeFloorPlanLoaded.add(floor);
      try{
        localStorage.removeItem(homeFloorStorageKey(floor));
        if(floor.toLowerCase()==="first floor")localStorage.removeItem(HOME_MAP_IMAGE_KEY);
      }catch(e){}
      homeSetActiveFloorValue(floor);homeRefreshMapSurface();
    }catch(e){alert("Daily Life could not save that floor-plan image. Try a smaller or cropped screenshot.")}
  };
  window.homeRemoveFloorPlan=async function(floor=homeActiveFloor()){
    if(!confirm("Remove the saved "+floor+" map from this device? Inventory rooms and items will stay."))return;
    floor=String(floor||"").trim()||"First floor";
    try{await dbSet(homeFloorDbKey(floor),null)}catch(e){}
    homeFloorPlanCache.delete(floor);homeFloorPlanLoaded.add(floor);
    try{
      localStorage.removeItem(homeFloorStorageKey(floor));
      if(floor.toLowerCase()==="first floor")localStorage.removeItem(HOME_MAP_IMAGE_KEY);
    }catch(e){}
    homeRefreshMapSurface();
  };

  window.homeAddInventoryItemToRoom=function(roomId){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    closeModal();openInventoryItem();
    setTimeout(()=>{const el=document.querySelector("#invroom");if(el&&!el.value)el.value=room.name||""},0);
  };
  window.homeOpenRoomInventory=function(roomId){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    const locs=(state.inventoryLocations||[]).filter(x=>x.roomId===roomId),
          locIds=new Set(locs.map(x=>x.id)),
          items=(state.inventoryItems||[]).filter(x=>x.roomId===roomId||locIds.has(x.locationId));
    modal("Inventory · "+(room.name||"Room"),`<div class="stack">
      <div class="home-room-modal-head"><span class="home-room-modal-dot" style="background:${esc(room.mapColor||"#bdeccf")}"></span><span><b>${esc(room.name||"Room")}</b><small>${esc(room.floor||"Floor not set")} · ${items.length} item${items.length===1?"":"s"} · ${locs.length} location${locs.length===1?"":"s"}</small></span></div>
      ${locs.length?locs.map(loc=>{const rows=items.filter(x=>x.locationId===loc.id);return `<div class="inventory-location"><div class="row"><span><b>${esc(loc.name)}</b><div class="muted small">${rows.length} item${rows.length===1?"":"s"}${loc.notes?" · "+esc(loc.notes):""}</div></span><button class="btn small" onclick="closeModal();openInventoryLocation('${loc.id}')">Edit</button></div>${rows.slice(0,10).map(x=>`<button class="inventory-mini-item" onclick="closeModal();openInventoryItem('${x.id}')"><span>${esc(x.name)}</span><b>${Number(x.quantity||1)>1?"×"+Number(x.quantity):""}</b></button>`).join("")}${rows.length>10?`<div class="muted small">+${rows.length-10} more</div>`:""}</div>`}).join(""):`<div class="notice">No shelves, drawers, closets, bins, or other storage locations are saved in this room yet.</div>`}
      ${items.filter(x=>!x.locationId).length?`<div class="inventory-location"><div class="mini-heading">Room-level items</div>${items.filter(x=>!x.locationId).map(x=>`<button class="inventory-mini-item" onclick="closeModal();openInventoryItem('${x.id}')"><span>${esc(x.name)}</span></button>`).join("")}</div>`:""}
      <div class="actions"><button class="btn primary" onclick="homeAddInventoryItemToRoom('${room.id}')">+ Item here</button><button class="btn" onclick="closeModal();openInventoryLocation('','${room.id}')">+ Storage location</button><button class="btn" onclick="closeModal();openInventoryRoom('${room.id}')">Edit room</button></div>
    </div>`,"Close",closeModal);
  };
  function homeFloorPlanCard(){
    const floors=homeFloorList(),active=homeActiveFloor(),localSrc=homeLocalMapImage(active),imported=homeImportedMapReference(active),
          importedOnly=!localSrc&&!!imported.src,src=localSrc||imported.src,
          rooms=[...(state.houseRooms||[])].filter(r=>(String(r.floor||"").trim()||"Unassigned")===active&&String(r.name||"").trim()).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
    return `<div class="card home-floor-plan-card"><div class="section-title"><div><div class="eyebrow">⌂ House map · ${importedOnly?"imported reference":"local only"}</div><h2>${esc(active)} layout</h2><div class="muted small">Keep a separate visual floor plan for each level, then use the room links for storage and inventory.</div></div><div class="actions"><button class="btn ${src?"":"primary"}" type="button" onclick='homeChooseFloorPlan(${JSON.stringify(active)})'>${localSrc?"Replace map":importedOnly?"Use different image":"Add map image"}</button>${localSrc?`<button class="btn small" type="button" onclick='homeRemoveFloorPlan(${JSON.stringify(active)})'>Remove</button>`:""}</div></div>
      <div class="home-map-floor-tabs" role="tablist" aria-label="House floors">${floors.map(f=>`<button type="button" role="tab" aria-selected="${f===active?"true":"false"}" class="${f===active?"active":""}" onclick='homeSetMapFloor(${JSON.stringify(f)})'>${esc(f)}</button>`).join("")}</div>
      ${src?`<div class="home-floor-plan-frame"><img src="${esc(src)}" alt="${esc(active)} house layout reference"></div>${importedOnly?`<div class="muted small home-map-source">Using the reviewed map reference from ${esc(imported.title)}.</div>`:""}`:`<div class="notice home-map-empty"><b>Add the ${esc(active)} robot-vacuum or floor-plan screenshot once from this phone.</b><div class="small">Daily Life keeps floor-plan images out of normal cloud snapshots.</div></div>`}
      <div class="home-map-room-links">${rooms.length?rooms.map(r=>`<button type="button" style="--room-tint:${esc(r.mapColor||"#bdeccf")}" onclick="homeOpenRoomInventory('${r.id}')"><i></i><span><b>${esc(r.name)}</b><small>${esc(active)}</small></span><span>›</span></button>`).join(""):`<button type="button" class="home-map-add-room" onclick='openInventoryRoom("",${JSON.stringify(active)})'><span><b>+ Add a room on ${esc(active)}</b><small>Use the labels on this floor plan</small></span><span>›</span></button>`}</div>
      <div class="muted small home-map-privacy">Floor-plan pictures stay on this device and are excluded from normal cloud snapshots. Room names and inventory continue using your normal Daily Life data.</div>
    </div>`;
  }


  function homeEnsure(){
    if(!Array.isArray(state.homeRoomResets))state.homeRoomResets=[];
    return state.homeRoomResets;
  }
  function homeLastReset(roomId){
    return [...homeEnsure()].filter(x=>x.roomId===roomId).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||String(b.time||"").localeCompare(String(a.time||"")))[0]||null;
  }
  function homeDaysSince(date){
    if(!date)return null;
    return Math.max(0,Math.floor((new Date(ymd()+"T12:00:00")-new Date(date+"T12:00:00"))/86400000));
  }
  function homeRoomItemCount(roomId){
    const locIds=new Set((state.inventoryLocations||[]).filter(x=>x.roomId===roomId).map(x=>x.id));
    return (state.inventoryItems||[]).filter(x=>x.roomId===roomId||locIds.has(x.locationId)).length;
  }
  function homeRoomOpenItems(roomId){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId),name=String(room?.name||"").toLowerCase();
    return (state.tasks||[]).filter(t=>!t.done&&(
      t.roomId===roomId||
      (name&&String(t.title||"").toLowerCase().includes(name))||
      (name&&String(t.notes||"").toLowerCase().includes(name))
    ));
  }
  function homeRoomScore(room){
    const last=homeLastReset(room.id),days=last?homeDaysSince(last.date):999,
      open=homeRoomOpenItems(room.id).length,items=homeRoomItemCount(room.id);
    return days+open*12+Math.min(20,items/4);
  }
  function homeFocusRoom(){
    const rooms=(state.houseRooms||[]).filter(r=>String(r.name||"").trim());
    if(!rooms.length)return null;
    return rooms.slice().sort((a,b)=>homeRoomScore(b)-homeRoomScore(a)||String(a.name).localeCompare(String(b.name)))[0];
  }
  function homeResetLabel(room){
    const last=homeLastReset(room.id),days=last?homeDaysSince(last.date):null;
    if(days===null)return"not reset yet";
    if(days===0)return"reset today";
    if(days===1)return"reset yesterday";
    return"last reset "+days+"d ago";
  }
  function homeFloorNames(){return homeFloorList()}

  window.homeLogRoomReset=async function(roomId,minutes){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    homeEnsure().push({id:uid(),roomId,date:ymd(),time:new Date().toTimeString().slice(0,5),minutes:Number(minutes||20),createdAt:new Date().toISOString()});
    const task=(state.tasks||[]).find(t=>!t.done&&t.homeRoomId===roomId&&t.generated==="home-reset");
    if(task)task.done=true;
    await save();render();
  };

  window.homeScheduleRoomReset=function(roomId,minutes=20){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    const existing=(state.tasks||[]).find(t=>!t.done&&t.homeRoomId===roomId&&t.date===ymd());
    if(existing){openItineraryTask(existing.id);return}
    const task={id:uid(),date:ymd(),title:minutes+"-minute "+room.name+" reset",child:"",category:"home",
      notes:"Declutter one visible zone · put away what already has a home · make one donation/trash decision · stop when the timer ends.",
      done:false,order:34,itineraryMinutes:Number(minutes),itineraryPreference:"any",itineraryStart:"",generated:"home-reset",homeRoomId:roomId};
    state.tasks.push(task);
    save().then(()=>{render();openItineraryTask(task.id)});
  };

  window.homeAddRoomTask=function(roomId){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    openTask("","",false);
    setTimeout(()=>{
      const title=document.querySelector("#task"),cat=document.querySelector("#cat"),notes=document.querySelector("#notes");
      if(title&&!title.value)title.value=room.name+" · ";
      if(cat)cat.value="home";
      if(notes&&!notes.value)notes.value="Room: "+room.name;
    },0);
  };

  function homeRoomBubble(room){
    const last=homeLastReset(room.id),open=homeRoomOpenItems(room.id),items=homeRoomItemCount(room.id),
      tint=/^#[0-9a-f]{6}$/i.test(String(room.mapColor||""))?room.mapColor:"#bdeccf";
    return '<div class="home-room-bubble" style="--room-tint:'+esc(tint)+'">'+
      '<button class="home-room-main" onclick="openInventoryRoom(\''+room.id+'\')">'+
        '<span class="home-room-color"></span><b>'+esc(room.name)+'</b><small>'+esc(room.floor||"Unassigned")+'</small>'+
        '<strong>'+items+'</strong><em>tracked items</em>'+
      '</button>'+
      '<div class="home-room-meta"><span>'+esc(homeResetLabel(room))+'</span><span>'+open.length+' open task'+(open.length===1?"":"s")+'</span></div>'+
      '<div class="home-room-actions"><button class="btn small primary" onclick="homeLogRoomReset(\''+room.id+'\',20)">✓ Reset done</button><button class="btn small" onclick="homeScheduleRoomReset(\''+room.id+'\',20)">20 min</button><button class="btn small" onclick="homeAddRoomTask(\''+room.id+'\')">+ Task</button></div>'+
      '</div>';
  }

  function homeResetDashboard(){
    const rooms=(state.houseRooms||[]).filter(r=>String(r.name||"").trim()),focus=homeFocusRoom(),floors=homeFloorNames(),
      resets=homeEnsure().filter(x=>x.date===ymd()).length,openRooms=rooms.filter(r=>homeRoomOpenItems(r.id).length).length;
    if(!rooms.length)return '<details class="card home-operator home-operator-collapsible"><summary><span><span class="eyebrow">House reset tools</span><b>Room reset dashboard</b><small>Add rooms to track resets, storage, and maintenance by area.</small></span><span class="home-operator-summary-count">0 rooms</span></summary><div class="home-operator-body"><button class="btn primary" onclick="openInventoryRoom()">+ Add room</button></div></details>';
    return '<details class="card home-operator home-operator-collapsible">'+
      '<summary><span><span class="eyebrow">House reset tools</span><b>'+(focus?'Focus · '+esc(focus.name):'House reset dashboard')+'</b><small>'+rooms.length+' rooms · '+resets+' reset'+(resets===1?'':'s')+' today · '+openRooms+' with open tasks</small></span><span class="home-operator-summary-count">Open</span></summary>'+
      '<div class="home-operator-body">'+
      (focus?'<div class="home-focus-ring" style="--room-tint:'+esc(focus.mapColor||"#bdeccf")+'"><span>FOCUS</span><b>'+esc(focus.name)+'</b><small>'+esc(homeResetLabel(focus))+' · '+homeRoomItemCount(focus.id)+' items</small><div class="actions"><button class="btn small primary" onclick="homeLogRoomReset(\''+focus.id+'\',20)">Done</button><button class="btn small" onclick="homeScheduleRoomReset(\''+focus.id+'\',20)">20 min</button></div></div>':'')+
      '<div class="home-floor-pills">'+floors.map(f=>'<span>'+esc(f)+'</span>').join("")+'</div>'+
      '<div class="home-room-grid">'+rooms.slice().sort((a,b)=>String(a.floor||"").localeCompare(String(b.floor||""))||String(a.name).localeCompare(String(b.name))).map(homeRoomBubble).join("")+'</div>'+
      '<div class="muted small home-operator-note">Short resets stay intentionally small: one visible zone, obvious put-away, one trash/donate decision, then stop.</div>'+
      '</div></details>';
  }

  window.homeFloorPlanCard=homeFloorPlanCard;
  window.homeResetDashboard=homeResetDashboard;

  if(typeof inventoryDetailedView==="function"){
    const baseInventoryDetailed=inventoryDetailedView;
    inventoryDetailedView=function(){
      const html=baseInventoryDetailed();
      return inventoryTab==="map"?homeFloorPlanCard()+html+homeResetDashboard():html;
    };
  }

  /* Replace the rotating off-day focus with the room that has actually gone longest without a reset. */
  const baseSuggested=itinerarySuggestedBlocks;
  itinerarySuggestedBlocks=function(date){
    const rows=baseSuggested(date),focus=homeFocusRoom(),row=rows.find(x=>x.templateKey==="home-reset");
    if(row&&focus){
      row.title="20-minute "+focus.name+" reset";
      row.detail="Declutter one visible zone in "+focus.name+" · put away what has a home · make one trash/donate decision · stop when the timer ends";
    }
    return rows;
  };

  homeEnsure();
  homeLoadFloorPlans().catch(()=>{});
  if(typeof render==="function")render();
})();