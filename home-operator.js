/* Daily Life · house operating layer
   Turns the house map into a practical reset / declutter system. */
(function(){
  "use strict";

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
  function homeFloorNames(){
    const rows=[...new Set((state.houseRooms||[]).map(r=>String(r.floor||"Unassigned").trim()||"Unassigned"))];
    return rows.length?rows:["House"];
  }

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
    if(!rooms.length)return '<div class="card home-operator"><div class="eyebrow">House operating system</div><h2>Build the map once, then use it</h2><div class="muted small">Add rooms to turn House Map into a decluttering, storage, robot-vacuum, and maintenance dashboard.</div><button class="btn primary" onclick="openInventoryRoom()">+ Add room</button></div>';
    return '<div class="card home-operator">'+
      '<div class="section-title"><div><div class="eyebrow">House operating system</div><h2>'+(focus?"Focus room · "+esc(focus.name):"House map")+'</h2><div class="muted small">'+rooms.length+' mapped room'+(rooms.length===1?"":"s")+' · '+resets+' reset'+(resets===1?"":"s")+' logged today · '+openRooms+' room'+(openRooms===1?"":"s")+' with open tasks</div></div>'+
        (focus?'<button class="btn primary" onclick="homeScheduleRoomReset(\''+focus.id+'\',20)">Start 20-min reset</button>':'')+
      '</div>'+
      (focus?'<div class="home-focus-ring" style="--room-tint:'+esc(focus.mapColor||"#bdeccf")+'"><span>FOCUS</span><b>'+esc(focus.name)+'</b><small>'+esc(homeResetLabel(focus))+' · '+homeRoomItemCount(focus.id)+' tracked items</small><div class="actions"><button class="btn small primary" onclick="homeLogRoomReset(\''+focus.id+'\',20)">Mark reset done</button><button class="btn small" onclick="openInventoryRoom(\''+focus.id+'\')">Open room</button></div></div>':'')+
      '<div class="home-floor-pills">'+floors.map(f=>'<span>'+esc(f)+'</span>').join("")+'</div>'+
      '<div class="home-room-grid">'+rooms.slice().sort((a,b)=>String(a.floor||"").localeCompare(String(b.floor||""))||String(a.name).localeCompare(String(b.name))).map(homeRoomBubble).join("")+'</div>'+
      '<div class="muted small home-operator-note">A room reset is intentionally short: one visible zone, obvious put-away, one trash/donate decision, then stop. The app remembers when each room was last touched and brings the stalest room forward.</div>'+
      '</div>';
  }

  const baseInventory=inventoryView;
  inventoryView=function(){
    const html=baseInventory();
    return inventoryTab==="map"?homeResetDashboard()+html:html;
  };

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
  if(typeof render==="function")render();
})();