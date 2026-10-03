/* Daily Life · universal search + always-available capture */
(function(){
  "use strict";

  let lifeSearchRegistry=new Map();

  function ltText(){
    return [...arguments].filter(Boolean).map(x=>String(x)).join(" · ");
  }
  function ltIndex(){
    const rows=[],add=(kind,id,title,detail,search,action)=>rows.push({kind,id:String(id||""),title:String(title||""),detail:String(detail||""),search:String(search||title||"").toLowerCase(),action});

    for(const t of state.tasks||[])add("Task",t.id,t.title,ltText(t.child,t.date,t.category,t.done?"done":"open"),ltText(t.title,t.notes,t.child,t.category),"task");
    for(const p of state.peopleProfiles||[])add("Person",p.id,p.name,ltText(p.relationship,p.birthday),ltText(p.name,p.relationship,p.birthday,p.notes,(p.interests||[]).join(" ")),"person");
    for(const x of state.inventoryItems||[])add("Inventory",x.id,x.name,ltText(x.category,x.status,typeof inventoryLocationLabel==="function"?inventoryLocationLabel(x):""),ltText(x.name,x.category,x.status,x.notes),"inventory");
    for(const r of state.houseRooms||[])add("Room",r.id,r.name,ltText(r.floor,r.notes),ltText(r.name,r.floor,r.notes),"room");
    for(const b of state.bills||[])add("Bill",b.id,b.name,ltText(b.due,b.status,Number.isFinite(Number(b.amount))?money(b.amount):""),ltText(b.name,b.due,b.status,b.frequency,b.paymentSetup),"bill");
    for(const p of state.projects||[])add("Project",p.id,p.title,ltText(p.status,p.due,p.nextAction),ltText(p.title,p.notes,p.nextAction,p.status),"project");
    for(const e of state.events||[])add("Event",e.id,e.title,ltText(e.date,e.startTime?fmtClock(e.startTime):"",e.child,e.location),ltText(e.title,e.child,e.location,e.notes,e.type),"event");
    for(const m of state.meals||[])add("Meal",m.id,m.dish||"Dinner",ltText(m.date,m.method,m.status),ltText(m.dish,m.method,m.notes,m.date),"meal");
    for(const p of state.pets||[])add("Pet",p.id,p.name,ltText(p.species,p.status,p.vet),ltText(p.name,p.species,p.notes,p.personality,p.favorites,p.diet),"pet");
    for(const p of state.plants||[])add("Plant",p.id,p.name,ltText(p.type,p.status,p.location),ltText(p.name,p.type,p.location,p.notes,p.source),"plant");
    for(const a of state.schoolAssignments||[])add("School",a.id,a.title,ltText(a.child,a.course,a.due,a.status),ltText(a.title,a.child,a.course,a.status,a.notes),"school");
    for(const g of state.schoolGrades||[])add("Grade",g.id,g.course||"Grade",ltText(g.child,g.grade,g.term),ltText(g.child,g.course,g.grade,g.term,g.notes),"school");
    for(const d of state.deliveries||[])add("Delivery",d.id,d.sender||d.carrier||"Delivery",ltText(d.status,d.expectedDate,d.carrier),ltText(d.sender,d.carrier,d.status,d.notes),"delivery");
    for(const o of state.orders||[])add("Order",o.id,o.store||"Grocery order",ltText(o.status,o.orderDate,o.deliveryTime),ltText(o.store,o.status,o.notes,(o.items||[]).map(i=>i.item).join(" ")),"order");
    for(const v of state.vehicles||[])add("Vehicle",v.id,[v.year,v.make,v.model].filter(Boolean).join(" ")||"Vehicle",ltText(v.mileage?Number(v.mileage).toLocaleString()+" mi":"",v.registrationDue),ltText(v.year,v.make,v.model,v.notes,v.tireTread),"vehicle");

    return rows;
  }

  function ltOpen(row){
    closeModal();
    if(!row)return;
    const id=row.id;
    if(row.action==="task"&&typeof openTask==="function")return openTask("",id);
    if(row.action==="person"){setView("family");setTimeout(()=>{if(typeof openPersonProfile==="function")openPersonProfile(id)},0);return}
    if(row.action==="inventory"&&typeof openInventoryItem==="function")return openInventoryItem(id);
    if(row.action==="room"&&typeof openInventoryRoom==="function")return openInventoryRoom(id);
    if(row.action==="bill"&&typeof openBill==="function")return openBill(id);
    if(row.action==="project"&&typeof openProject==="function")return openProject(id);
    if(row.action==="event"){
      const e=(state.events||[]).find(x=>String(x.id)===String(id));return typeof openEvent==="function"?openEvent(e?.date||"",id):undefined;
    }
    if(row.action==="meal"){
      const m=(state.meals||[]).find(x=>String(x.id)===String(id));return typeof openMeal==="function"?openMeal(m?.date||ymd()):undefined;
    }
    if(row.action==="pet"){setView("pets");setTimeout(()=>{if(typeof openPetProfile==="function")openPetProfile(id)},0);return}
    if(row.action==="plant"){setView("garden");setTimeout(()=>{if(typeof openPlant==="function")openPlant(id)},0);return}
    if(row.action==="school"){setView("family");return}
    if(row.action==="delivery"&&typeof openDelivery==="function")return openDelivery(id);
    if(row.action==="order"&&typeof openOrder==="function")return openOrder(id);
    if(row.action==="vehicle"){setView("log");setTimeout(()=>{if(typeof openVehicle==="function")openVehicle()},0);return}
  }

  window.lifeSearchOpenResult=function(key){
    const row=lifeSearchRegistry.get(String(key||""));ltOpen(row);
  };

  function ltIcon(kind){
    return ({Task:"✓",Person:"♡",Inventory:"▦",Room:"⌂",Bill:"$",Project:"✦",Event:"◷",Meal:"◇",Pet:"♢",Plant:"⌁",School:"✎",Grade:"A",Delivery:"□",Order:"🛍",Vehicle:"◇"})[kind]||"•";
  }

  window.lifeSearchUpdate=function(value){
    const q=String(value||"").trim().toLowerCase(),box=document.querySelector("#lifeSearchResults");
    if(!box)return;
    if(!q){
      box.innerHTML='<div class="life-search-empty"><b>Search your Daily Life</b><small>Tasks, people, rooms, inventory, bills, projects, events, meals, pets, plants, school, deliveries, and more.</small></div>';
      return;
    }
    const words=q.split(/\s+/).filter(Boolean),indexed=ltIndex(),
      scored=indexed.map(row=>{
        let score=0;
        if(row.title.toLowerCase()===q)score+=100;
        if(row.title.toLowerCase().startsWith(q))score+=60;
        if(row.title.toLowerCase().includes(q))score+=35;
        for(const word of words){
          if(row.title.toLowerCase().includes(word))score+=16;
          if(row.search.includes(word))score+=7;
        }
        return{row,score};
      }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.row.title.localeCompare(b.row.title)).slice(0,30);

    lifeSearchRegistry=new Map();
    box.innerHTML=scored.length?scored.map((x,i)=>{
      const key="r"+i;lifeSearchRegistry.set(key,x.row);
      return '<button class="life-search-result" onclick="lifeSearchOpenResult(\''+key+'\')"><span class="life-search-icon">'+ltIcon(x.row.kind)+'</span><span><b>'+esc(x.row.title)+'</b><small>'+esc(x.row.kind+(x.row.detail?" · "+x.row.detail:""))+'</small></span><span>›</span></button>';
    }).join(""):'<div class="life-search-empty"><b>No matches</b><small>Try fewer words or use Quick Capture to add the thing you are thinking about.</small></div>';
  };

  window.openLifeSearch=function(){
    lifeSearchRegistry=new Map();
    modal("Find anything",'<div class="stack life-search-modal"><label>Search<input id="lifeSearchInput" autocomplete="off" autofocus placeholder="Name, room, bill, school item, task…" oninput="lifeSearchUpdate(this.value)"></label><div id="lifeSearchResults"><div class="life-search-empty"><b>Search your Daily Life</b><small>Tasks, people, rooms, inventory, bills, projects, events, meals, pets, plants, school, deliveries, and more.</small></div></div></div>',"Close",closeModal);
    setTimeout(()=>document.querySelector("#lifeSearchInput")?.focus(),40);
  };

  function ltEnsureFab(){
    let rail=document.querySelector("#lifeToolsFab");
    if(typeof needsSetup==="function"&&needsSetup()){if(rail)rail.remove();return}
    if(rail)return;
    rail=document.createElement("div");rail.id="lifeToolsFab";rail.className="life-tools-fab";
    rail.innerHTML='<button type="button" class="life-fab-search" aria-label="Find anything" onclick="openLifeSearch()">⌕</button><button type="button" class="life-fab-capture" aria-label="Quick capture" onclick="openLifeCapture()">＋</button>';
    document.body.appendChild(rail);
  }

  const baseRender=render;
  render=function(){
    const result=baseRender.apply(this,arguments);
    setTimeout(ltEnsureFab,0);
    return result;
  };

  ltEnsureFab();
})();