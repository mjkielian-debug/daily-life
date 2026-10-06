/* Daily Life · orchestration layer
   Pulls important loose ends from across the app into one command center
   and feeds genuinely actionable items into Day Flow. */
(function(){
  "use strict";

  const LIFE_AUTO_DEFAULTS={bills:true,petCare:true,plants:true,groceries:true,projects:true,vehicle:true,school:true};
  function lifeAutoSettings(){
    state.settings=state.settings||{};
    state.settings.lifeAutopilot=Object.assign({},LIFE_AUTO_DEFAULTS,state.settings.lifeAutopilot||{});
    return state.settings.lifeAutopilot;
  }
  function lifeAutoEnabled(key){return lifeAutoSettings()[key]!==false}

  function lifeShift(date,days){
    return typeof shiftDateString==="function"?shiftDateString(date,days):(function(){
      const d=new Date(String(date)+"T12:00:00");d.setDate(d.getDate()+Number(days||0));return ymd(d);
    })();
  }
  function lifeDaysBetween(a,b){
    return Math.round((new Date(String(b)+"T12:00:00")-new Date(String(a)+"T12:00:00"))/86400000);
  }
  function lifeTaskOpen(t){
    return !!(t&&!t.done&&!t.paused&&!t.waitingForFunds&&!t.duplicateHidden);
  }
  function lifeTaskDate(t){return /^\d{4}-\d{2}-\d{2}$/.test(String(t?.date||""))?t.date:ymd()}
  function lifeIsDailyResetTask(t){
    const title=String(t?.title||"").trim().toLowerCase().replace(/\s+/g," ");
    const notes=String(t?.notes||"").trim().toLowerCase();
    if(title==="everyone reading")return true;
    if(/^(?:kids? )?room reset\s*\+\s*homework$/.test(title))return true;
    if(/^school[- ]night reset$/.test(title))return true;
    if(t?.dailyReset===true||t?.routineCarryover===false)return true;
    if(t?.generated==="recurring-task"){
      const rule=(state.settings?.recurringTasks||[]).find(r=>String(r.title||"").trim().toLowerCase()===title);
      if(rule&&Array.isArray(rule.days)&&rule.days.length===7)return true;
    }
    return /daily routine|daily baseline/.test(notes)&&/room|homework|read/.test(title+" "+notes);
  }
  function lifeTaskDisplayKey(t){
    const child=String(t?.child||"").trim().toLowerCase();
    let title=String(t?.title||"").trim().toLowerCase();
    if(/myschoolbucks|(?:school|student).*meal\s+balance/.test(title+" "+String(t?.notes||"").toLowerCase()))title="school meal balance";
    title=title.replace(/\b(?:today|tomorrow)\b/g," ")
      .replace(/\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/g," ")
      .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g," ")
      .replace(/[^a-z0-9]+/g," ").trim();
    return child+"|"+title;
  }
  function lifeDedupeTasks(rows){
    const map=new Map();
    for(const t of rows||[]){
      const key=lifeTaskDisplayKey(t),prev=map.get(key);
      if(!prev){map.set(key,Object.assign({},t,{_duplicateCount:1}));continue}
      const prevDate=lifeTaskDate(prev),nextDate=lifeTaskDate(t),
        prevToday=prevDate===ymd(),nextToday=nextDate===ymd(),
        preferNext=nextToday&&!prevToday||nextToday===prevToday&&(Number(t.order||100)<Number(prev.order||100)||nextDate>prevDate);
      const keep=preferNext?Object.assign({},t):prev;
      keep._duplicateCount=Number(prev._duplicateCount||1)+1;
      map.set(key,keep);
    }
    return [...map.values()];
  }
  function lifeDueLabel(date){
    const today=ymd(),d=lifeDaysBetween(today,date);
    if(d<0)return Math.abs(d)+"d overdue";
    if(d===0)return"today";
    if(d===1)return"tomorrow";
    return"in "+d+" days";
  }
  function lifeInferCategory(text){
    const s=String(text||"").toLowerCase();
    if(/school|teacher|grade|homework|reading|band|dance|club|assignment|parentvue/.test(s))return"school";
    if(/bill|pay |payment|bank|money|budget|account|transfer|insurance/.test(s))return"money";
    if(/car|tire|gas|fuel|oil|vehicle|walmart tire/.test(s))return"car";
    if(/cat|pet|litter|vet|indy|paul/.test(s))return"pets";
    if(/plant|garden|seed|water plant|fertiliz/.test(s))return"garden";
    if(/food|dinner|meal|grocery|fridge|freezer|pantry|cook/.test(s))return"food";
    if(/clean|laundry|dishes|declutter|room|house|vacuum|mop|bathroom|closet|organize/.test(s))return"home";
    if(/call|email|form|appointment|paperwork|order|return|schedule/.test(s))return"life";
    return"life";
  }
  function lifeTaskMinutesFor(title,category){
    if(typeof itineraryTaskMinutes==="function")return itineraryTaskMinutes({title:title,category:category||lifeInferCategory(title)});
    return 20;
  }

  function lifeGeneratedSpecs(){
    const today=ymd(),soon=lifeShift(today,2),specs=[],
      sourceSetting={bill:"bills",petRoutine:"petCare",plantRoutine:"plants",groceryOrder:"groceries",project:"projects",tire:"vehicle",vehicle:"vehicle",schoolAssignment:"school"},
      push=(x)=>{
        const setting=sourceSetting[x.sourceType];
        if(setting&&!lifeAutoEnabled(setting))return;
        specs.push(Object.assign({date:today,category:"life",minutes:15,preference:"any",order:35},x));
      };

    for(const b of state.bills||[]){
      if(b.status==="paid"||b.paymentPending||!b.due||b.due>soon)continue;
      const setup=typeof recordedBillSetup==="function"?recordedBillSetup(b):String(b.paymentSetup||"Unknown");
      if(setup==="Autopay"||setup==="Scheduled")continue;
      push({
        key:"bill:"+b.id,title:"Pay / confirm "+(b.name||"bill"),category:"money",minutes:15,preference:"morning",order:8,
        note:(b.due?"Due "+lifeDueLabel(b.due):"")+(Number.isFinite(Number(b.amount))?" · "+money(b.amount):""),
        sourceType:"bill",sourceId:b.id
      });
    }

    if(typeof duePetRoutines==="function"){
      for(const r of duePetRoutines().slice(0,4)){
        const p=typeof petById==="function"?petById(r.petId):null;
        push({
          key:"pet:"+r.id,title:r.title||"Pet care",category:"pets",minutes:15,preference:"any",order:18,
          note:[p?.name,typeof petRoutineDueState==="function"?petRoutineDueState(r).label:"due"].filter(Boolean).join(" · "),
          sourceType:"petRoutine",sourceId:r.id
        });
      }
    }

    if(typeof duePlantRoutines==="function"){
      for(const r of duePlantRoutines().slice(0,4)){
        const p=typeof plantById==="function"?plantById(r.plantId):null;
        push({
          key:"plant:"+r.id,title:r.title||"Plant care",category:"garden",minutes:15,preference:"any",order:22,
          note:[p?.name,typeof plantRoutineDueState==="function"?plantRoutineDueState(r).label:"due"].filter(Boolean).join(" · "),
          sourceType:"plantRoutine",sourceId:r.id
        });
      }
    }

    for(const o of state.orders||[]){
      if(String(o.status||"").toLowerCase()==="delivered"&&!o.perishablesAway){
        push({key:"groceries:"+o.id,title:"Put grocery perishables away",category:"food",minutes:15,preference:"any",order:5,
          note:o.store||"Delivered grocery order",sourceType:"groceryOrder",sourceId:o.id});
      }
    }

    if(typeof nextLifeAdminAction==="function"){
      const a=nextLifeAdminAction();
      if(a)push({key:"project:"+a.projectId,title:a.title,category:"life",minutes:20,preference:"any",order:26,
        note:a.notes||"Life admin",sourceType:"project",sourceId:a.projectId});
    }

    if(typeof tirePressureStats==="function"){
      const ts=tirePressureStats(),latest=ts.latest;
      if(latest&&Number(latest.psi)>0&&Number(latest.psi)<28){
        push({key:"tire-low",title:"Check / air low tire",category:"car",minutes:15,preference:"morning",order:3,
          note:"Last recorded "+Number(latest.psi).toFixed(1)+" PSI · "+(latest.date?dl(latest.date):"recent reading"),
          sourceType:"tire",sourceId:latest.id||""});
      }
    }

    if(typeof vehicleMaintenanceSnapshot==="function"){
      const m=vehicleMaintenanceSnapshot();
      if(m?.oil?.due)push({key:"vehicle:oil",title:"Plan / handle oil change",category:"car",minutes:20,preference:"any",order:17,
        note:"Vehicle maintenance is due",sourceType:"vehicle",sourceId:"oil"});
      if(m?.rotation?.due)push({key:"vehicle:rotation",title:"Plan / handle tire rotation",category:"car",minutes:20,preference:"any",order:18,
        note:"Vehicle maintenance is due",sourceType:"vehicle",sourceId:"rotation"});
    }

    for(const a of state.schoolAssignments||[]){
      if(!["missing","due"].includes(String(a.status||"").toLowerCase()))continue;
      if(a.due&&a.due>lifeShift(today,2))continue;
      push({
        key:"school:"+a.id,title:(a.child?a.child+" · ":"")+("Check "+(a.title||"school assignment")),category:"school",
        minutes:30,preference:"after-school",order:String(a.status).toLowerCase()==="missing"?4:12,
        note:[a.course,a.due?"due "+lifeDueLabel(a.due):"",a.status].filter(Boolean).join(" · "),
        sourceType:"schoolAssignment",sourceId:a.id
      });
    }
    return specs;
  }

  function lifeSyncGeneratedTasks(){
    state.tasks=state.tasks||[];
    const specs=lifeGeneratedSpecs(),desired=new Map(specs.map(x=>[x.key,x])),today=ymd();
    let changed=false;

    for(const s of specs){
      let t=state.tasks.find(x=>x.generated==="life-orchestrator"&&x.lifeSourceKey===s.key);
      if(!t){
        t={id:uid(),date:s.date,title:s.title,child:"",category:s.category,notes:s.note||"",done:false,order:s.order,
          itineraryMinutes:s.minutes,itineraryPreference:s.preference,itineraryStart:"",generated:"life-orchestrator",
          lifeSourceKey:s.key,lifeSourceType:s.sourceType,lifeSourceId:s.sourceId,createdAt:new Date().toISOString()};
        state.tasks.push(t);changed=true;
      }else if(!t.done){
        const patch={date:s.date,title:s.title,category:s.category,notes:s.note||"",order:s.order,itineraryMinutes:s.minutes,itineraryPreference:s.preference,
          lifeSourceType:s.sourceType,lifeSourceId:s.sourceId};
        for(const [k,v] of Object.entries(patch))if(t[k]!==v){t[k]=v;changed=true}
      }
    }

    const before=state.tasks.length;
    state.tasks=state.tasks.filter(function(t){
      if(t.generated!=="life-orchestrator")return true;
      if(t.done)return true;
      return desired.has(t.lifeSourceKey);
    });
    if(state.tasks.length!==before)changed=true;
    return changed;
  }

  function lifeCompleteRoutine(r,everyField,nextField,lastField){
    if(!r)return;
    const date=ymd();r[lastField]=date;
    const every=Math.max(0,Number(r[everyField]||0));
    r[nextField]=every?lifeShift(date,every):"";
  }

  const baseToggleTask=toggleTask;
  toggleTask=async function(id,d){
    const t=(state.tasks||[]).find(x=>x.id===id);
    if(t&&d&&t.generated==="life-orchestrator"){
      if(t.lifeSourceType==="petRoutine"){
        const r=(state.petCareRoutines||[]).find(x=>x.id===t.lifeSourceId);
        lifeCompleteRoutine(r,"everyDays","nextDate","lastDone");
      }else if(t.lifeSourceType==="plantRoutine"){
        const r=(state.plantCareRoutines||[]).find(x=>x.id===t.lifeSourceId);
        lifeCompleteRoutine(r,"everyDays","nextDate","lastDone");
      }else if(t.lifeSourceType==="groceryOrder"){
        const o=(state.orders||[]).find(x=>x.id===t.lifeSourceId);if(o)o.perishablesAway=true;
      }
    }
    return baseToggleTask(id,d);
  };

  function lifeOpenSource(task){
    if(!task)return;
    const type=task.lifeSourceType,id=task.lifeSourceId;
    if(type==="bill"&&typeof openBill==="function")return openBill(id);
    if(type==="petRoutine"&&typeof openPetRoutine==="function")return openPetRoutine(id);
    if(type==="plantRoutine"&&typeof openPlantRoutine==="function")return openPlantRoutine(id);
    if(type==="groceryOrder"&&typeof openOrder==="function")return openOrder(id);
    if(type==="project"&&typeof openProject==="function")return openProject(id);
    if(type==="schoolAssignment"){setView("family");return}
    if(type==="tire"&&typeof openTire==="function")return openTire();
    if(type==="vehicle"&&typeof openVehicle==="function")return openVehicle();
    if(typeof openTask==="function")return openTask("",task.id);
  }
  window.lifeOpenSource=function(id){
    const t=(state.tasks||[]).find(x=>x.id===id);lifeOpenSource(t);
  };

  window.lifeStartTaskNow=async function(id){
    const t=(state.tasks||[]).find(x=>x.id===id);if(!t||t.done)return;
    const today=ymd(),now=new Date(),nowM=Math.ceil((now.getHours()*60+now.getMinutes())/5)*5,
      mins=typeof itineraryTaskMinutes==="function"?itineraryTaskMinutes(t):20,
      dayEnd=typeof itineraryDayEnd==="function"?itineraryDayEnd(today):21*60+30,
      items=itineraryDayItems(today),
      gaps=items.filter(x=>x.kind==="gap").map(x=>({start:hmMinutes(x.start),end:hmMinutes(x.end)})).filter(x=>x.start!==null&&x.end!==null);
    let start=null;
    const active=gaps.find(g=>g.start<=nowM&&g.end-nowM>=mins);
    if(active)start=nowM;
    if(start===null){
      const next=gaps.find(g=>g.start>=nowM&&g.end-g.start>=mins);
      if(next)start=next.start;
    }
    if(start===null){
      start=Math.min(Math.max(nowM,itineraryDayStart(today)),Math.max(itineraryDayStart(today),dayEnd-mins));
    }
    t.date=today;t.itineraryStart=minutesHm(start);t.itineraryMinutes=mins;
    await save();render();
  };

  function lifeQueue(){
    const today=ymd(),weekEnd=lifeShift(today,7),tasks=(state.tasks||[]).filter(lifeTaskOpen),
      todayRows=lifeDedupeTasks(tasks.filter(t=>{
        const d=lifeTaskDate(t);
        if(d>today)return false;
        if(String(t.title||"").trim().toLowerCase()==="ups shift"&&d<today)return false;
        if(d<today&&lifeIsDailyResetTask(t))return false;
        return true;
      }))
        .sort((a,b)=>Number(a.order||100)-Number(b.order||100)||lifeTaskDate(a).localeCompare(lifeTaskDate(b))),
      soonRows=lifeDedupeTasks(tasks.filter(t=>lifeTaskDate(t)>today&&lifeTaskDate(t)<=weekEnd))
        .sort((a,b)=>lifeTaskDate(a).localeCompare(lifeTaskDate(b))||Number(a.order||100)-Number(b.order||100)),
      waitingProjects=(state.projects||[]).filter(p=>String(p.status||"").toLowerCase()==="waiting"),
      waitingBills=(state.bills||[]).filter(b=>b.paymentPending),
      waitingDeliveries=(state.deliveries||[]).filter(d=>["expected","in transit","out for delivery","delayed"].includes(String(d.status||"").toLowerCase())),
      waitingMeals=(state.meals||[]).filter(m=>["suggestion-queued","waiting_for_cloud","building"].includes(String(m.recipeState||""))),
      events=(typeof upcomingEvents==="function"?upcomingEvents(7):[]),
      waiting=[
        ...waitingProjects.map(p=>({label:p.title||"Project",detail:p.due?"due "+dl(p.due):"waiting",kind:"project",id:p.id})),
        ...waitingBills.map(b=>({label:b.name||"Bill",detail:"payment pending",kind:"bill",id:b.id})),
        ...waitingDeliveries.map(d=>({label:d.sender||d.carrier||"Delivery",detail:d.status+(d.expectedDate?" · "+dl(d.expectedDate):""),kind:"delivery",id:d.id})),
        ...waitingMeals.map(m=>({label:m.dish||"Meal recipe",detail:"recipe / suggestion processing",kind:"meal",id:m.id}))
      ];
    return{todayRows,soonRows,waiting,events};
  }

  function lifeScoreTask(t){
    const today=ymd(),date=lifeTaskDate(t),days=lifeDaysBetween(today,date),
      cat=String(t.category||""),now=new Date(),mins=now.getHours()*60+now.getMinutes();
    let score=100-Number(t.order||100);
    if(days<0)score+=60+Math.min(30,Math.abs(days)*4);
    else if(days===0)score+=45;
    if(t.generated==="life-orchestrator")score+=18;
    if(["money","school","car"].includes(cat))score+=8;
    if(t.itineraryStart){
      const s=hmMinutes(t.itineraryStart);if(s!==null)score+=Math.max(0,30-Math.abs(s-mins)/10);
    }
    return score;
  }

  function lifeNextTask(){
    const q=lifeQueue(),oldest=lifeShift(ymd(),-30),
      usable=q.todayRows.filter(t=>lifeTaskDate(t)>=oldest||t.generated==="life-orchestrator");
    return usable.slice().sort((a,b)=>lifeScoreTask(b)-lifeScoreTask(a))[0]||q.soonRows[0]||null;
  }

  function lifeCurrentGuidance(){
    const items=itineraryDayItems(ymd()),now=new Date(),m=now.getHours()*60+now.getMinutes(),
      active=items.find(x=>{const s=hmMinutes(x.start),e=hmMinutes(x.end);return s!==null&&e!==null&&s<=m&&e>m}),
      next=items.find(x=>{const s=hmMinutes(x.start);return s!==null&&s>=m&&x.kind!=="gap"});
    if(active&&active.kind!=="gap")return{title:active.title,detail:active.detail||("Until "+fmtClock(active.end)),task:active.source==="task"?(state.tasks||[]).find(t=>t.id===active.sourceId):null,mode:"active"};
    const task=lifeNextTask();
    if(active&&active.kind==="gap"&&task)return{title:task.title,detail:(task.notes?task.notes+" · ":"")+"Use this open block for it.",task,mode:"open"};
    if(next)return{title:"Next · "+fmtClock(next.start)+" · "+next.title,detail:next.detail||"",task:next.source==="task"?(state.tasks||[]).find(t=>t.id===next.sourceId):null,mode:"next"};
    if(task)return{title:task.title,detail:task.notes||"This is the highest-priority open item Daily Life can see.",task,mode:"task"};
    return{title:"No urgent loose ends",detail:"Use the open time for recovery, a room reset, or something you actually want to do.",task:null,mode:"clear"};
  }

  window.openLifeCapture=function(){
    const tomorrow=lifeShift(ymd(),1);
    modal("Quick capture",'<div class="stack">'+
      '<div class="notice"><b>Dump it here. Daily Life will sort the basics.</b><div class="muted small">One item per line. Lines beginning with “buy” or “get” can go straight to Shopping.</div></div>'+
      '<label>What is on your mind?<textarea id="lifeCaptureText" rows="7" placeholder="Call school about form\nbuy cat litter\nclean out hallway closet"></textarea></label>'+
      '<div class="grid2"><label>When<select id="lifeCaptureWhen"><option value="'+ymd()+'">Today</option><option value="'+tomorrow+'">Tomorrow</option><option value="'+lifeShift(ymd(),3)+'">In the next few days</option><option value="'+lifeShift(ymd(),7)+'">Next week</option></select></label>'+
      '<label>Route<select id="lifeCaptureRoute"><option value="auto">Auto-sort</option><option value="task">Tasks</option><option value="shopping">Shopping list</option></select></label></div>'+
      '<label>Person (optional)<input id="lifeCapturePerson" list="lifeCapturePeople" placeholder="Leave blank if it is not for one person"><datalist id="lifeCapturePeople">'+(state.peopleProfiles||[]).map(p=>'<option value="'+esc(p.name)+'">').join("")+'</datalist></label>'+
      '</div>',"Add",async()=>{
        const lines=$("#lifeCaptureText").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),date=$("#lifeCaptureWhen").value||ymd(),
          route=$("#lifeCaptureRoute").value,person=$("#lifeCapturePerson").value.trim();
        if(!lines.length)return;
        for(const line of lines){
          const shoppingMatch=line.match(/^(?:buy|get|pick up|pickup)\s+(.+)/i),asShopping=route==="shopping"||(route==="auto"&&shoppingMatch);
          if(asShopping){
            const item=(shoppingMatch?shoppingMatch[1]:line).trim();
            state.shopping=state.shopping||[];
            state.shopping.push({id:uid(),item:item,qty:"",store:"",status:"needed",source:"quick-capture",createdAt:new Date().toISOString()});
          }else{
            const category=lifeInferCategory(line);
            state.tasks.push({id:uid(),date:date,title:line,child:person,category:category,notes:"Quick capture",done:false,order:55,
              itineraryMinutes:lifeTaskMinutesFor(line,category),itineraryPreference:category==="school"?"after-school":"",itineraryStart:"",generated:"quick-capture"});
          }
        }
        await save();closeModal();render();
      });
  };

  function lifeWaitingOpen(row){
    if(row.kind==="project"&&typeof openProject==="function")return openProject(row.id);
    if(row.kind==="bill"&&typeof openBill==="function")return openBill(row.id);
    if(row.kind==="delivery"&&typeof openDelivery==="function")return openDelivery(row.id);
    if(row.kind==="meal"){setView("home");return}
  }
  window.lifeWaitingOpen=function(kind,id){lifeWaitingOpen({kind,id})};

  function lifeCommandCard(){
    const q=lifeQueue(),guide=lifeCurrentGuidance(),
      soonCount=q.soonRows.length,waitingCount=q.waiting.length,eventCount=q.events.length,
      top=q.todayRows.slice().sort((a,b)=>lifeScoreTask(b)-lifeScoreTask(a)).slice(0,5),
      tomorrow=lifeShift(ymd(),1),tomorrowEvents=q.events.filter(e=>e.date===tomorrow),
      tomorrowMeal=typeof mealForDate==="function"?mealForDate(tomorrow):null,
      tomorrowWork=typeof workForDate==="function"?workForDate(tomorrow):null;
    return '<div class="card life-command">'+
      '<div class="life-command-head"><div><div class="eyebrow">Daily Life command center</div><h2>What needs you next</h2></div><div class="actions"><button class="btn primary" onclick="openLifeCapture()">＋ Capture</button><button class="btn" onclick="openTodayDayFlow()">Day Flow</button></div></div>'+
      '<div class="life-next-orb"><div class="life-next-label">DO NEXT</div><b>'+esc(guide.title)+'</b><small>'+esc(guide.detail)+'</small>'+
        (guide.task?'<div class="actions"><button class="btn primary small" onclick="lifeStartTaskNow(\''+guide.task.id+'\')">Start next</button><button class="btn small" onclick="openItineraryTask(\''+guide.task.id+'\')">Choose time</button><button class="btn small" onclick="lifeOpenSource(\''+guide.task.id+'\')">Open</button></div>':'')+
      '</div>'+
      '<div class="life-radar">'+
        '<button onclick="setView(\'itinerary\')"><b>'+q.todayRows.length+'</b><span>Today</span></button>'+
        '<button onclick="setView(\'today\')"><b>'+soonCount+'</b><span>Next 7 days</span></button>'+
        '<button onclick="setView(\'log\')"><b>'+waitingCount+'</b><span>Waiting</span></button>'+
        '<button onclick="setView(\'family\')"><b>'+eventCount+'</b><span>Upcoming</span></button>'+
      '</div>'+
      (top.length?'<div class="life-command-list"><div class="mini-heading">Today’s loose ends</div>'+top.map(t=>
        '<div class="life-command-row"><label class="task grow"><input type="checkbox" onchange="toggleTask(\''+t.id+'\',this.checked)"><span><b>'+esc(t.title)+'</b><small>'+esc([t.child,t.notes,t.date<ymd()?"carried forward":""].filter(Boolean).join(" · "))+'</small></span></label><button class="btn small" onclick="lifeOpenSource(\''+t.id+'\')">Open</button></div>'
      ).join("")+'</div>':'<div class="life-clear"><b>Today’s tracked loose ends are clear.</b><small>Day Flow can stay light instead of inventing work for you.</small></div>')+
      '<details class="life-tomorrow"><summary><span>Tomorrow check</span><b>'+tomorrowEvents.length+' event'+(tomorrowEvents.length===1?"":"s")+' · '+(tomorrowMeal?.dish?"dinner planned":"dinner open")+' · '+(tomorrowWork?.scheduled||tomorrowWork?.start?"work time known":"work time not entered")+'</b></summary>'+
        '<div class="life-tomorrow-body">'+
          (tomorrowEvents.slice(0,4).map(e=>'<div><b>'+esc(e.title)+'</b><small>'+esc((e.startTime?fmtClock(e.startTime)+" · ":"")+(e.child||e.location||""))+'</small></div>').join("")||'<div><b>No captured events tomorrow</b><small>That can be a good thing.</small></div>')+
          '<div><b>'+(tomorrowMeal?.dish?esc(tomorrowMeal.dish):"Dinner is not planned")+'</b><small>'+(tomorrowMeal?.startBy?"Start by "+esc(fmtClock(tomorrowMeal.startBy)):"Open Food to plan or use what is on hand")+'</small></div>'+
        '</div></details>'+
      (q.waiting.length?'<details class="life-waiting"><summary>Waiting on '+q.waiting.length+' thing'+(q.waiting.length===1?"":"s")+'</summary>'+q.waiting.slice(0,6).map(w=>'<button onclick="lifeWaitingOpen(\''+w.kind+'\',\''+w.id+'\')"><b>'+esc(w.label)+'</b><small>'+esc(w.detail||"")+'</small></button>').join("")+'</details>':'')+
      '</div>';
  }

  window.openLifeAutopilotSettings=function(){
    const s=lifeAutoSettings(),rows=[
      ["bills","Manual / unknown bills","Bring bills that need action into Today + Day Flow."],
      ["school","School deadlines","Bring missing / due assignments into the daily plan."],
      ["petCare","Pet care","Bring due recurring pet care into the daily plan."],
      ["plants","Plant care","Bring due recurring plant care into the daily plan."],
      ["groceries","Delivered groceries","Surface perishables that still need to be put away."],
      ["vehicle","Car + tire care","Surface low recorded tire pressure and due maintenance."],
      ["projects","Life-admin projects","Bring the next active life-admin action into Day Flow."]
    ];
    modal("Life Autopilot",'<div class="stack"><div class="notice"><b>Choose what Daily Life may pull forward automatically.</b><div class="muted small">Turning something off does not delete the underlying bill, school item, pet record, plant, vehicle, or project. It only stops unfinished auto-created action tasks for that area.</div></div>'+
      rows.map(r=>'<label class="task life-auto-toggle"><input id="lifeAuto_'+r[0]+'" type="checkbox" '+(s[r[0]]!==false?'checked':'')+'><span><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></span></label>').join("")+
      '</div>',"Save",async()=>{
        const next={};rows.forEach(r=>next[r[0]]=document.querySelector("#lifeAuto_"+r[0])?.checked!==false);
        state.settings.lifeAutopilot=Object.assign({},s,next);
        lifeSyncGeneratedTasks();
        await save();closeModal();render();
      });
  };

  function lifeAutopilotSettingsCard(){
    const s=lifeAutoSettings(),on=Object.values(s).filter(Boolean).length,total=Object.keys(LIFE_AUTO_DEFAULTS).length;
    return '<div class="card"><div class="section-title"><div><div class="eyebrow">Life Autopilot</div><h2>'+on+'/'+total+' areas feeding the daily plan</h2><div class="muted small">Controls which parts of Daily Life may create practical action tasks when something becomes due or needs attention.</div></div><button class="btn" onclick="openLifeAutopilotSettings()">Choose areas</button></div></div>';
  }

  const baseSettingsView=settingsView;
  settingsView=function(){return baseSettingsView()+lifeAutopilotSettingsCard()};

  function lifeTaskCategoryLabel(t){
    const raw=String(t?.category||"life").toLowerCase();
    return ({home:"Home",school:"School",money:"Money",car:"Car",pets:"Pets",garden:"Garden",food:"Food",personal:"Personal",work:"Work",life:"Life"})[raw]||raw.replace(/^./,c=>c.toUpperCase());
  }
  function lifeTaskMeta(t){
    const parts=[];
    if(t.child)parts.push(String(t.child));
    const d=lifeTaskDate(t),today=ymd();
    if(d<today)parts.push("from "+dl(d));
    else if(d>today)parts.push(dl(d));
    // Duplicates are already collapsed in the queue; don't add implementation
    // language to the visible task list.
    return parts.join(" · ");
  }
  function lifeTaskCleanNote(t){
    let note=String(t?.notes||"").trim();
    if(!note)return"";
    note=note.replace(/\s+/g," ")
      .replace(/\s*·\s*Waiting until after payday; school lunches are free and this balance is only for extras\.?/ig,"")
      .replace(/Split from the old combined ['"]?Dishes\s*\+\s*audition practice['"]? review item so each can be tracked separately\.?/ig,"")
      .trim();
    if(/^(quick capture|life autopilot|suggested from (?:your )?task list)$/i.test(note))return"";
    return note;
  }

  window.openTodayTasksHub=function(){
    const q=lifeQueue(),rows=q.todayRows.slice().sort((a,b)=>lifeScoreTask(b)-lifeScoreTask(a)),
      review=typeof dailyReviewSummary==="function"?dailyReviewSummary(ymd()):{unknown:0},
      hidden=(state.tasks||[]).filter(t=>!t.done&&(t.paused||t.waitingForFunds||t.duplicateHidden)).length;
    const categoryOrder=["Personal","Home","School","Car","Money","Food","Pets","Garden","Work","Life"],
      groups=new Map();
    for(const t of rows){
      const cat=lifeTaskCategoryLabel(t);
      if(!groups.has(cat))groups.set(cat,[]);
      groups.get(cat).push(t);
    }
    const groupNames=[...groups.keys()].sort((a,b)=>{
      const ai=categoryOrder.indexOf(a),bi=categoryOrder.indexOf(b);
      return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b);
    });
    const rowHtml=groupNames.map(cat=>{
      const items=groups.get(cat)||[];
      return '<section class="life-task-group"><div class="life-task-group-head"><b>'+esc(cat)+'</b><span>'+items.length+'</span></div>'+
        items.map(t=>{
          const meta=lifeTaskMeta(t),note=lifeTaskCleanNote(t);
          return '<div class="life-task-hub-row">'+
            '<label class="life-task-check"><input type="checkbox" onchange="toggleTask(\''+t.id+'\',this.checked)"><span aria-hidden="true"></span></label>'+
            '<button class="life-task-main" onclick="lifeOpenSource(\''+t.id+'\')">'+
              '<span class="life-task-top"><b>'+esc(t.title)+'</b></span>'+
              (meta?'<small class="life-task-meta">'+esc(meta)+'</small>':'')+
              (note?'<small class="life-task-note">'+esc(note)+'</small>':'')+
            '</button>'+
            '<button class="life-task-open" onclick="lifeOpenSource(\''+t.id+'\')" aria-label="Open '+esc(t.title)+'">›</button>'+
          '</div>';
        }).join("")+'</section>';
    }).join("");
    const statusBits=[
      review.unknown?review.unknown+' unanswered daily check'+(review.unknown===1?'':'s'):'',
      hidden?hidden+' waiting / paused hidden':''
    ].filter(Boolean).join(" · ");
    modal("Today · Tasks",
      '<div class="stack life-task-hub">'+
        '<div class="life-task-hub-head"><div><div class="eyebrow">Today</div><h2>'+rows.length+' open task'+(rows.length===1?'':'s')+'</h2>'+
          (statusBits?'<div class="life-task-hub-status">'+esc(statusBits)+'</div>':'')+
        '</div><div class="life-task-hub-actions"><button class="btn" onclick="closeModal();openDailyReview()">? Review</button><button class="btn primary" onclick="closeModal();openTask()">+ Add</button></div></div>'+
        (rows.length?'<div class="life-task-hub-list">'+rowHtml+'</div>':'<div class="notice"><b>Today’s tracked tasks are clear.</b></div>')+
        '<button class="btn life-task-dayflow" onclick="closeModal();openTodayDayFlow()">Open Day Flow</button>'+
      '</div>',"Close",closeModal);
  };

  window.openHouseholdHub=function(){
    closeModal();
    setView("household");
  };

  window.openGardenHobbiesHub=function(){
    closeModal();
    setView("gardenhobbies");
  };

  function lifeTodayWheel(){
    const q=lifeQueue(),guide=lifeCurrentGuidance(),today=ymd(),now=new Date(),mins=now.getHours()*60+now.getMinutes(),
      agenda=typeof itineraryDayItems==="function"?itineraryDayItems(today):[],
      next=agenda.find(x=>{const m=hmMinutes(x.start);return m!==null&&m>=mins}),
      meal=typeof mealForDate==="function"?mealForDate(today):null,
      care=typeof selfCareTodayStats==="function"?selfCareTodayStats():{done:0,total:0},
      readingPages=(state.readingLogs||[]).filter(x=>x.date===today).reduce((n,x)=>n+Number(x.pages||0),0),
      end=lifeShift(today,7),
      billCount=(state.bills||[]).filter(b=>b.status!=="paid"&&b.due>=today&&b.due<=end).length,
      peopleCount=(state.events||[]).filter(e=>e.date>=today&&e.date<=end&&e.status!=="cancelled"&&String(e.child||"").trim()).length,
      homeCount=(state.houseRooms||[]).length,
      petCount=(state.pets||[]).length,
      openTasks=q.todayRows.length,
      review=typeof dailyReviewSummary==="function"?dailyReviewSummary(today):{unknown:0},
      greeting=now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening",
      centerDetail=String(guide.detail||"").split("·").map(x=>x.trim()).filter(Boolean)[0]||"Tap for Day Flow.",
      segments=[
        {icon:"◷",title:"Day Flow",detail:next?fmtClock(next.start):"Schedule",action:"openTodayDayFlow()"},
        {icon:"✓",title:"Tasks",detail:openTasks?openTasks+" open":"Clear",action:"openTodayTasksHub()"},
        {icon:"◇",title:"Food",detail:meal?.dish?String(meal.dish).split(/[·—–,:]/)[0].trim().slice(0,18):"Dinner open",action:"setView('home')"},
        {icon:"$",title:"Money",detail:billCount?billCount+" bill"+(billCount===1?"":"s")+" soon":"Bills clear",action:"setView('more')"},
        {icon:"♡",title:"Care",detail:care.total?(care.done+" done"+(care.unknown?" · ?"+care.unknown:"")):"Self care",action:"setView('log')"},
        {icon:"♧",title:"People",detail:peopleCount?peopleCount+" upcoming":"Family + kids",action:"setView('family')"},
        {icon:"⌂",title:"Home",detail:[homeCount?homeCount+" rooms":"house",petCount?petCount+" pets":""].filter(Boolean).join(" · "),action:"openHouseholdHub()"},
        {icon:"◫",title:"Reading",detail:readingPages?readingPages+" pages today":"Pages + wheel",action:"setView('reading')"}
      ];
    return '<section class="life-today-one-screen"><div class="life-today-topline"><div><div class="eyebrow">Today at a glance</div><b>'+esc(new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}))+'</b></div><div class="life-today-top-actions"><button class="btn small" onclick="openDailyReview()">? Review'+(review.unknown?' '+review.unknown:'')+'</button><button class="btn small primary" onclick="openLifeCapture()">＋ Capture</button></div></div>'+
      '<div class="life-wheel" role="group" aria-label="Today dashboard">'+
        segments.map((x,i)=>'<button class="life-wheel-segment" style="--i:'+i+';--seg:'+i+'" onclick="'+x.action+'" aria-label="'+esc(x.title)+': '+esc(x.detail)+'"><span><i>'+x.icon+'</i><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></span></button>').join('')+
        '<button type="button" class="life-wheel-center" onclick="event.stopPropagation();openTodayDayFlow();return false;"><span class="eyebrow">NOW / NEXT</span><b>'+esc(greeting)+'</b><strong>'+esc(guide.title||"Today")+'</strong><small>'+esc(centerDetail)+'</small></button>'+
      '</div>'+
      '<div class="life-today-footer"><button onclick="openGardenHobbiesHub()"><span>⌁</span>Garden + Hobbies</button><button onclick="setView(\'spirituality\')"><span>☾</span>Spirituality</button><button onclick="setView(\'vault\')"><span>▣</span>Vault</button></div></section>';
  }

  const baseToday=todayView;
  todayView=function(){
    lifeSyncGeneratedTasks();
    return lifeTodayWheel();
  };

  /* Make the rotating off-day home reset point at a real mapped room when possible. */
  const baseSuggested=itinerarySuggestedBlocks;
  itinerarySuggestedBlocks=function(date){
    const rows=baseSuggested(date),rooms=(state.houseRooms||[]).filter(r=>String(r.name||"").trim());
    if(rooms.length){
      const day=Math.floor(new Date(date+"T12:00:00").getTime()/86400000),
        room=rooms[Math.abs(day)%rooms.length],
        row=rows.find(x=>x.templateKey==="home-reset");
      if(row){
        row.title="20-minute "+room.name+" reset";
        row.detail="Declutter one visible zone in "+room.name+" · put away what already has a home · stop when the block ends";
      }
    }
    return rows;
  };

  const baseFixedFriday=itineraryFixedItems;
  itineraryFixedItems=function(date){
    const rows=baseFixedFriday(date);
    if(date==="2026-10-09"){
      rows.push({id:"focus-1700:"+date,start:"17:00",end:"19:30",title:"Tanner gift · finish anything still incomplete",detail:"Protected Friday work block after the kids go to Dad's · finish the six records, backs/song titles, crate, or whichever pieces are still left.",fixed:true,kind:"plan",icon:"♡",source:"generated"});
      rows.push({id:"focus-2030:"+date,start:"19:30",end:"19:50",title:"Tanner gift · final check + hide supplies",detail:"Check all six records and the crate · fix any obvious unfinished detail · put tools/supplies away and hide the gift before the nighttime routine.",fixed:true,kind:"plan",icon:"♡",source:"generated"});
      rows.sort((a,b)=>String(a.start).localeCompare(String(b.start)));
    }
    return rows;
  };

  /* Keep generated items current without requiring a manual refresh. */
  const baseRender=render;
  let lifeSyncSaveQueued=false;
  render=function(){
    const changed=lifeSyncGeneratedTasks();
    if(changed&&!lifeSyncSaveQueued){
      lifeSyncSaveQueued=true;
      Promise.resolve(save()).catch(()=>{}).finally(()=>{lifeSyncSaveQueued=false});
    }
    return baseRender.apply(this,arguments);
  };

  lifeSyncGeneratedTasks();
  if(typeof render==="function")render();
})();