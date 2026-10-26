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
    try{
      await dbSet(homeFloorDbKey(floor),null);
    }catch(e){
      // Do not hide the saved map or delete its legacy backup when the
      // database write fails; both copies may be needed to recover it.
      alert("Daily Life could not remove this floor plan from device storage. Your saved map has been kept.");
      return;
    }
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
  function homeRoomTaskProgress(room){
    const name=String(room.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const tasks=(state.tasks||[]).filter(t=>{
      if(t.paused||t.duplicateHidden||t.waitingForFunds)return false;
      const assigned=String(t.homeRoomId||t.roomId||"");
      if(assigned)return assigned===String(room.id);
      if(t.homeMapZoneId||t.homeMapFloor)return String(t.homeMapFloor||"")===String(room.floor||"")&&String(t.homeMapRoomName||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()===name;
      const title=String(t.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      return String(t.category||"").toLowerCase()==="home"&&name&&(" "+title+" ").includes(" "+name+" ");
    });
    return {tasks,done:tasks.filter(t=>t.done).length};
  }
  window.homeCompleteRoomTask=async function(taskId,roomId){
    const t=(state.tasks||[]).find(x=>String(x.id)===String(taskId));if(!t||t.done)return;
    await toggleTask(taskId,true);
    window.homeOpenRoomInventory(roomId);
  };
  window.homeOpenRoomInventory=function(roomId){
    const room=(state.houseRooms||[]).find(r=>r.id===roomId);if(!room)return;
    const locs=(state.inventoryLocations||[]).filter(x=>x.roomId===roomId),
          locIds=new Set(locs.map(x=>x.id)),
          items=(state.inventoryItems||[]).filter(x=>x.roomId===roomId||locIds.has(x.locationId));
    const tracked=homeRoomTaskProgress(room),unfinished=tracked.tasks.filter(t=>!t.done),pct=tracked.tasks.length?Math.round(100*tracked.done/tracked.tasks.length):null;
    const taskCard='<div class="hvm-task-progress"><div><b>'+(pct===null?"Not assessed":pct+"%")+'</b><small>'+(pct===null?"No room tasks recorded":tracked.done+" / "+tracked.tasks.length+" tasks completed")+'</small></div>'+
      '<div class="hvm-task-meter"><i style="width:'+(pct||0)+'%"></i></div><small>Tracked tasks only; not an assessment of cleanliness.</small></div>'+
      '<div class="hvm-task-list"><b>What needs doing · '+unfinished.length+'</b>'+
      (unfinished.length?unfinished.map(t=>'<div class="hvm-task-row"><span>'+esc(t.title)+'</span><button class="btn small primary" onclick="homeCompleteRoomTask(&#39;'+esc(t.id)+'&#39;,&#39;'+esc(room.id)+'&#39;)">✓ Done</button></div>').join(""):'<p>No unfinished recorded room tasks.</p>')+'</div>';
    const furniture=String(room.floor||"")==="Second floor"&&/dolly/i.test(String(room.name||""))&&typeof window.dollyRoomSceneHtml==="function"?window.dollyRoomSceneHtml():"";
    modal("Inventory · "+(room.name||"Room"),`<div class="stack">
      ${furniture}
      ${taskCard}
      <div class="home-room-modal-head"><span class="home-room-modal-dot" style="background:${esc(room.mapColor||"#bdeccf")}"></span><span><b>${esc(room.name||"Room")}</b><small>${esc(room.floor||"Floor not set")} · ${items.length} item${items.length===1?"":"s"} · ${locs.length} location${locs.length===1?"":"s"}</small></span></div>
      ${locs.length?locs.map(loc=>{const rows=items.filter(x=>x.locationId===loc.id);return `<div class="inventory-location"><div class="row"><span><b>${esc(loc.name)}</b><div class="muted small">${rows.length} item${rows.length===1?"":"s"}${loc.notes?" · "+esc(loc.notes):""}</div></span><button class="btn small" onclick="closeModal();openInventoryLocation('${loc.id}')">Edit</button></div>${rows.slice(0,10).map(x=>`<button class="inventory-mini-item" onclick="closeModal();openInventoryItem('${x.id}')"><span>${esc(x.name)}</span><b>${Number(x.quantity||1)>1?"×"+Number(x.quantity):""}</b></button>`).join("")}${rows.length>10?`<div class="muted small">+${rows.length-10} more</div>`:""}</div>`}).join(""):`<div class="notice">No shelves, drawers, closets, bins, or other storage locations are saved in this room yet.</div>`}
      ${items.filter(x=>!x.locationId).length?`<div class="inventory-location"><div class="mini-heading">Room-level items</div>${items.filter(x=>!x.locationId).map(x=>`<button class="inventory-mini-item" onclick="closeModal();openInventoryItem('${x.id}')"><span>${esc(x.name)}</span></button>`).join("")}</div>`:""}
      <div class="actions"><button class="btn primary" onclick="homeAddInventoryItemToRoom('${room.id}')">+ Item here</button><button class="btn" onclick="closeModal();openInventoryLocation('','${room.id}')">+ Storage location</button><button class="btn" onclick="closeModal();openInventoryRoom('${room.id}')">Edit room</button></div>
    </div>`,"Close",closeModal);
  };
  window.homeOpenInventorySpot=function(roomId,spotKey){
    const room=(state.houseRooms||[]).find(r=>String(r.id)===String(roomId));if(!room)return;
    const key=String(spotKey||"").toLowerCase();
    const locations=Array.isArray(state.inventoryLocations)?state.inventoryLocations:[];
    const items=Array.isArray(state.inventoryItems)?state.inventoryItems:[];
    const roomLocations=locations.filter(loc=>String(loc.roomId)===String(roomId));
    const locationFor=item=>locations.find(loc=>String(loc.id)===String(item.locationId))||null;
    const locText=loc=>String((loc?.name||"")+" "+(loc?.notes||"")).toLowerCase();
    const title=key==="vanity_items"||key==="personal_care"?"Personal care items":
      key==="dresser_top"?"Items on top of the dresser":
      /dresser|drawer/.test(key)?"Dresser contents":
      key==="vanity"?"Vanity items":"Room items";
    let shown=[],groups=[],emptyText="",locationName="Personal care items";
    if(key==="vanity_items"||key==="personal_care"){
      const bathRoomIds=new Set((state.houseRooms||[]).filter(r=>/bath/i.test(String(r.name||""))).map(r=>String(r.id)));
      const careLocationIds=new Set(locations.filter(loc=>/bath|vanity|personal.?care|beauty|toiletries|skin.?care|hair.?care/i.test(locText(loc))).map(loc=>String(loc.id)));
      const isCare=item=>{
        const category=String(item.category||"").toLowerCase(),name=String(item.name||"").toLowerCase();
        const loc=locationFor(item),inBath=bathRoomIds.has(String(item.roomId||""))||careLocationIds.has(String(item.locationId||""))||/bathroom|upstairs bath|downstairs bath/i.test(locText(loc));
        return inBath||/^(bathroom|personal care|beauty)$/i.test(category)||
          /shower|shampoo|conditioner|body wash|soap|exfoliat|face wash|moisturi[sz]er|skin care|skincare|toiletr|makeup|deodorant|lotion/i.test(name);
      };
      shown=items.filter(isCare);
      groups=[{name:"Saved personal care",items:shown}];
      emptyText="No personal-care products are saved in inventory yet. Add the products you want tracked and they’ll appear here.";
      locationName="Vanity top";
    }else if(key==="dresser_top"){
      const matching=roomLocations.filter(loc=>/dresser.{0,16}top|top.{0,16}dresser/i.test(locText(loc)));
      const ids=new Set(matching.map(loc=>String(loc.id)));
      shown=items.filter(item=>ids.has(String(item.locationId||""))||
        (String(item.roomId)===String(roomId)&&!item.locationId&&/top of dresser|dresser top/i.test(String(item.notes||""))));
      groups=matching.map(loc=>({name:loc.name,items:shown.filter(item=>String(item.locationId)===String(loc.id))}));
      emptyText="Nothing is saved on top of this dresser yet.";
      locationName=matching[0]?.name||"Top of dresser";
    }else if(/dresser|drawer/.test(key)){
      const matching=roomLocations.filter(loc=>/dresser|drawer/i.test(locText(loc))&&!/vanity|dressing table/i.test(locText(loc)));
      const ids=new Set(matching.map(loc=>String(loc.id)));
      shown=items.filter(item=>ids.has(String(item.locationId||""))||
        (String(item.roomId)===String(roomId)&&!item.locationId&&/dresser|drawer/i.test(String(item.storageSpot||"")+" "+String(item.notes||""))));
      groups=matching.map(loc=>({name:loc.name,items:shown.filter(item=>String(item.locationId)===String(loc.id))}));
      emptyText="No contents have been recorded for this dresser yet. Add items and assign them to a named dresser or drawer to have them show up here.";
      locationName="Dresser drawers";
    }else{
      const matching=roomLocations.filter(loc=>/vanity|dressing table/i.test(locText(loc)));
      const ids=new Set(matching.map(loc=>String(loc.id)));
      shown=items.filter(item=>ids.has(String(item.locationId||"")));
      groups=matching.map(loc=>({name:loc.name,items:shown.filter(item=>String(item.locationId)===String(loc.id))}));
      emptyText="No items are saved to this vanity yet.";
      locationName="Vanity top";
    }
    const itemRow=item=>'<button class="inventory-mini-item" type="button" onclick="closeModal();openInventoryItem(&#39;'+esc(item.id)+'&#39;)"><span>'+esc(item.name||"Inventory item")+'</span><b>'+(Number(item.quantity||1)>1?"×"+Number(item.quantity):"")+'</b></button>';
    const locationCards=groups.filter(group=>group.items.length).map(group=>'<div class="inventory-location"><div class="mini-heading">'+esc(group.name)+' · '+group.items.length+'</div>'+group.items.map(itemRow).join("")+'</div>').join("");
    const body=shown.length?locationCards:'<div class="notice">'+esc(emptyText)+' This list only shows items you’ve recorded; nothing is assumed.</div>';
    const roomCaption=(key==="vanity_items"||key==="personal_care")?"Saved across personal-care and bathroom locations.":esc(room.name||"Room")+" · "+esc(room.floor||"");
    modal(title,'<div class="stack"><div class="home-room-modal-head"><span class="home-room-modal-dot" style="background:'+esc(room.mapColor||"#bdeccf")+'"></span><span><b>'+esc(roomCaption)+'</b><small>'+shown.length+' saved item'+(shown.length===1?"":"s")+'</small></span></div>'+body+
      '<div class="actions"><button class="btn primary" type="button" onclick="homeAddInventorySpotItem(&#39;'+esc(room.id)+'&#39;,&#39;'+esc(locationName)+'&#39;,&#39;'+((key==="vanity_items"||key==="personal_care")?"Personal care":/dresser/.test(key)?"Clothing":"Household")+'&#39;)">+ Add item here</button></div></div>',"Close",closeModal);
  };
  window.homeAddInventorySpotItem=function(roomId,locationName,category){
    closeModal();openInventoryItem();
    setTimeout(()=>{
      const room=(state.houseRooms||[]).find(r=>String(r.id)===String(roomId));
      const roomInput=document.querySelector("#invroom"),locationInput=document.querySelector("#invloc"),categoryInput=document.querySelector("#invcat");
      if(roomInput&&room)roomInput.value=room.name||"";
      if(locationInput)locationInput.value=locationName||"";
      if(categoryInput)categoryInput.value=category||"Household";
    },0);
  };
  window.homeEnsureMichelleRoomInventory=async function(which){
    const roomIndex=Number(which)===0?0:1;
    state.houseRooms=Array.isArray(state.houseRooms)?state.houseRooms:[];
    state.inventoryItems=Array.isArray(state.inventoryItems)?state.inventoryItems:[];
    state.inventoryLocations=Array.isArray(state.inventoryLocations)?state.inventoryLocations:[];
    const roomName=roomIndex===0?"Michelle’s room entryway":"Michelle’s bedroom";
    let room=state.houseRooms.find(r=>String(r.floor||"")==="Third floor"&&String(r.name||"").trim().toLowerCase()===roomName.toLowerCase());
    let changed=false;
    if(!room){
      room={id:uid(),name:roomName,floor:"Third floor",mapColor:roomIndex===0?"#c9b7e8":"#f2b8d4",notes:"Linked to Michelle’s third-floor photo tour."};
      state.houseRooms.push(room);changed=true;
    }
    const names=roomIndex===0?["Black beanbag","Chair"]:["Bed","Low dresser","Vanity / dressing table"];
    for(const name of names){
      const exists=state.inventoryItems.some(item=>String(item.roomId||"")===String(room.id)&&String(item.name||"").trim().toLowerCase()===name.toLowerCase());
      if(!exists){
        state.inventoryItems.push({id:uid(),name,category:"Household",quantity:1,status:"Have",roomId:room.id,locationId:"",notes:"Visible in Michelle’s room tour photo or identified by Michelle."});
        changed=true;
      }
    }
    const roomDetails=roomIndex===0?[
      {location:"Black tote",locationNotes:"Extra linens: sheets, blankets, and curtains.",items:[["Extra linens (sheets, blankets, curtains)","Household","Stored together in the black tote."]]},
      {location:"Amazon box",locationNotes:"Shoes not currently in use or missing their match.",items:[["Shoes not currently in use or missing a match","Household","Stored in the Amazon box."]]}
    ]:[
      {location:"Vanity top",locationNotes:"Personal care and supplement items seen on the vanity.",items:[
        ["Clear L-Lysine 500 mg","Supplements","Vitamin/supplement on Michelle’s bedroom vanity."],
        ["Spring Valley L-Lysine 500 mg","Supplements","Vitamin/supplement on Michelle’s bedroom vanity."],
        ["Spring Valley Women’s Multi gummies","Supplements","Vitamin/supplement on Michelle’s bedroom vanity."],
        ["Spring Valley Cranberry","Supplements","Supplement on Michelle’s bedroom vanity."],
        ["Nature’s Bounty Probiotic 10","Supplements","Supplement on Michelle’s bedroom vanity."],
        ["Blissmi D-Mannose & Cranberry gummies","Supplements","Supplement on Michelle’s bedroom vanity."],
        ["Trilogy Vitamin C Booster","Personal care","Vitamin C face-care product on Michelle’s bedroom vanity."],
        ["Force Factor Ultra Berberine","Supplements","Supplement on Michelle’s bedroom vanity."],
        ["Perfect ACAI","Supplements","Supplement on Michelle’s bedroom vanity."],
        ["Skincare, body-care, and makeup items (details not legible)","Personal care","A group of items is visible, but exact contents and counts are unknown."]
      ]}
    ];
    const normalized=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
    for(const detail of roomDetails){
      let location=state.inventoryLocations.find(loc=>String(loc.roomId||"")===String(room.id)&&normalized(loc.name)===normalized(detail.location));
      if(!location){
        location={id:uid(),roomId:room.id,name:detail.location,notes:detail.locationNotes};
        state.inventoryLocations.push(location);changed=true;
      }else if(!location.notes&&detail.locationNotes){
        location.notes=detail.locationNotes;changed=true;
      }
      for(const [name,category,notes] of detail.items){
        const existing=state.inventoryItems.find(item=>
          normalized(item.name)===normalized(name)&&
          (String(item.roomId||"")===String(room.id)||String(item.locationId||"")===String(location.id))
        );
        if(!existing){
          state.inventoryItems.push({id:uid(),name,category,quantity:1,status:"Have",roomId:room.id,locationId:location.id,notes});
          changed=true;
        }else{
          if(String(existing.roomId||"")!==String(room.id)){existing.roomId=room.id;changed=true}
          if(String(existing.locationId||"")!==String(location.id)){existing.locationId=location.id;changed=true}
          if(String(existing.category||"")!==String(category)){existing.category=category;changed=true}
          if(!existing.notes&&notes){existing.notes=notes;changed=true}
        }
      }
    }
    if(changed)await save();
    return room;
  };
  function homeFloorPlanCard(){
    const floors=homeFloorList(),active=homeActiveFloor(),localSrc=homeLocalMapImage(active),imported=homeImportedMapReference(active),
          importedOnly=!localSrc&&!!imported.src,src=localSrc||imported.src,
          rooms=[...(state.houseRooms||[])].filter(r=>(String(r.floor||"").trim()||"Unassigned")===active&&String(r.name||"").trim()).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""))),
          floorHint=active==="First floor"
            ?"Private diagram is based on the robot map; room details load from cloud."
            :active==="Basement"
              ?"Basement stair access is identified; room positions need photos."
              :"Known rooms are listed without guessing their positions.",
          mappedLabel=rooms.length?rooms.length+" room inventory record"+(rooms.length===1?"":"s")+" linked":"Room inventory can be linked as you go";
    return `<div class="card home-floor-plan-card"><div class="section-title"><div><div class="eyebrow">⌂ House map · working sketch</div><h2>${esc(active)} layout</h2><div class="muted small">${esc(mappedLabel)} · ${esc(floorHint)}</div></div><div class="actions"><button class="btn ${src?"":"primary"}" type="button" onclick='homeChooseFloorPlan(${JSON.stringify(active)})'>${localSrc?"Replace local image":importedOnly?"Use local image instead":"Add on-device floor image"}</button>${localSrc?`<button class="btn small" type="button" onclick='homeRemoveFloorPlan(${JSON.stringify(active)})'>Remove</button>`:""}</div></div>
      <div class="home-map-floor-tabs" role="tablist" aria-label="House floors">${floors.map(f=>{const count=(state.houseRooms||[]).filter(r=>(String(r.floor||"").trim()||"Unassigned")===f&&String(r.name||"").trim()).length;return `<button type="button" role="tab" aria-selected="${f===active?"true":"false"}" class="${f===active?"active":""}" onclick='homeSetMapFloor(${JSON.stringify(f)})'><span>${esc(f)}</span><small>${count}</small></button>`}).join("")}</div>
      ${typeof houseVisualMapHtml==="function"?houseVisualMapHtml(active):""}
      <div class="actions"><button class="btn primary" type="button" onclick='openHouseFloorMap(${JSON.stringify(active)})'>📷 Open floor photos + map details</button></div>
      <details class="hvm-reference-disclosure"><summary>View original floor reference or robot screenshot</summary>
      ${src?`<div class="home-floor-plan-frame"><img src="${esc(src)}" alt="${esc(active)} house layout reference"></div>${importedOnly?`<div class="muted small home-map-source">Using the reviewed map reference from ${esc(imported.title)}.</div>`:""}`:`<div class="notice home-map-empty"><b>${esc(floorHint)}</b><div class="small">Floor-plan images stay on this device and are kept out of normal cloud snapshots.</div></div>`}
      </details>
      <div class="home-map-room-links">${rooms.length?rooms.map(r=>`<button type="button" style="--room-tint:${esc(r.mapColor||"#bdeccf")}" onclick="homeOpenRoomInventory('${r.id}')"><i></i><span><b>${esc(r.name)}</b><small>${esc(active)}</small></span><span>›</span></button>`).join(""):`<button type="button" class="home-map-add-room" onclick='openInventoryRoom("",${JSON.stringify(active)})'><span><b>+ Link a room inventory</b><small>Use this to store items by room; it does not change the cloud house diagram.</small></span><span>›</span></button>`}</div>
      <div class="muted small home-map-privacy">Optional floor-plan images stay on this device. Reviewed map details and Photo Inbox references are private in Daily Life cloud; inventory records keep their existing local-first storage.</div>
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
    return (state.tasks||[]).filter(t=>{
      if(t.done||t.paused||t.duplicateHidden||t.waitingForFunds)return false;
      // Explicit room links always win over incidental title/notes matches.
      const assigned=String(t.homeRoomId||t.roomId||"");
      if(assigned)return assigned===String(roomId);
      if(t.homeMapZoneId||t.homeMapFloor)return !!(room&&String(t.homeMapFloor||"")===String(room.floor||"")&&String(t.homeMapRoomName||"").toLowerCase()===name);
      return !!(name&&(
        String(t.title||"").toLowerCase().includes(name)||
        String(t.notes||"").toLowerCase().includes(name)
      ));
    });
  }
  function homeRoomScore(room){
    const last=homeLastReset(room.id),days=last?homeDaysSince(last.date):999,
      open=homeRoomOpenItems(room.id).length,items=homeRoomItemCount(room.id);
    return days+open*12+Math.min(20,items/4);
  }
  function homeFocusRoom(){
    const rooms=(state.houseRooms||[]).filter(r=>String(r.name||"").trim());
    if(!rooms.length)return null;
    // A saved task for today is actionable; inventory counts and absent logs
    // are not evidence that a particular room needs cleaning.
    const withTasks=rooms.filter(r=>homeRoomOpenItems(r.id).some(t=>t.date===ymd()));
    const pool=withTasks.length?withTasks:rooms.filter(r=>homeLastReset(r.id)?.date!==ymd());
    const list=pool.length?pool:rooms;
    return list.slice().sort((a,b)=>{
      if(withTasks.length){
        const aCount=homeRoomOpenItems(a.id).filter(t=>t.date===ymd()).length;
        const bCount=homeRoomOpenItems(b.id).filter(t=>t.date===ymd()).length;
        if(aCount!==bCount)return bCount-aCount;
      }
      const aDate=homeLastReset(a.id)?.date||"",bDate=homeLastReset(b.id)?.date||"";
      return aDate.localeCompare(bDate)||String(a.name).localeCompare(String(b.name));
    })[0];
  }
  window.homeNextResetPlan=function(){
    const room=homeFocusRoom();if(!room)return null;
    const saved=homeRoomOpenItems(room.id).find(t=>t.date===ymd());
    return {roomId:room.id,roomName:room.name,
      title:saved?String(saved.title||"Finish the room task"):"Try a 10-minute "+room.name+" reset",
      detail:saved?"This is a real task saved for today. Open it and confirm progress when finished.":
        "Optional suggestion, not a cleanliness assessment: clear one visible spot, put away what already has a home, then stop.",
      savedTaskId:saved?String(saved.id):""};
  };
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
    const task=(state.tasks||[]).find(t=>!t.done&&!t.paused&&t.date===ymd()&&t.homeRoomId===roomId&&t.generated==="home-reset");
    if(task){
      task.done=true;
      if(typeof dailyReviewSet==="function")dailyReviewSet("task",task.id,task.date,"yes",task.title||"Room reset","Tasks");
    }
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
    openTask("","",false,{roomId:room.id,floor:room.floor||"",roomName:room.name||"Room"});
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
      '<summary><span><span class="eyebrow">House reset tools</span><b>'+(focus?'Suggested spot · '+esc(focus.name):'House reset dashboard')+'</b><small>'+rooms.length+' rooms · '+resets+' reset'+(resets===1?'':'s')+' today · '+openRooms+' with open tasks</small></span><span class="home-operator-summary-count">Open</span></summary>'+
      '<div class="home-operator-body">'+
      (focus?'<div class="home-focus-ring" style="--room-tint:'+esc(focus.mapColor||"#bdeccf")+'"><span>OPTIONAL RESET</span><b>'+esc(focus.name)+'</b><small>'+esc(homeResetLabel(focus))+' · '+homeRoomItemCount(focus.id)+' items</small><div class="actions"><button class="btn small primary" onclick="homeLogRoomReset(\''+focus.id+'\',20)">Done</button><button class="btn small" onclick="homeScheduleRoomReset(\''+focus.id+'\',20)">20 min</button></div></div>':'')+
      '<div class="home-floor-pills">'+floors.map(f=>'<span>'+esc(f)+'</span>').join("")+'</div>'+
      '<div class="home-room-grid">'+rooms.slice().sort((a,b)=>String(a.floor||"").localeCompare(String(b.floor||""))||String(a.name).localeCompare(String(b.name))).map(homeRoomBubble).join("")+'</div>'+
      '<div class="muted small home-operator-note">Suggested rooms are not cleanliness ratings. Start with one visible zone; log a reset only when it happened.</div>'+
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