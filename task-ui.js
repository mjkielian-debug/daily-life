/* Daily Life · clearer task workspace + daily review controls */
(function(){
  "use strict";

  function taskUiEsc(v){return typeof esc==="function"?esc(v):String(v==null?"":v)}
  function taskUiGroup(t){
    const cat=String(t&&t.category||"life").toLowerCase(),child=String(t&&t.child||"").trim();
    if(child||/school|family|kid/.test(cat))return{key:"kids",label:"Kids + school",icon:"♡"};
    if(/home|house|clean|laundry/.test(cat))return{key:"home",label:"Home",icon:"⌂"};
    if(/food|meal|grocery|pet|garden/.test(cat))return{key:"homecare",label:"Home care",icon:"◇"};
    if(/work/.test(cat))return{key:"work",label:"Work",icon:"▣"};
    if(/personal|health|self/.test(cat))return{key:"me",label:"Me",icon:"✦"};
    return{key:"admin",label:"Admin + errands",icon:"✓"};
  }
  function taskUiSort(a,b){
    if(!!a.done!==!!b.done)return a.done?1:-1;
    const at=String(a.itineraryStart||""),bt=String(b.itineraryStart||"");
    if(at&&bt&&at!==bt)return at.localeCompare(bt);
    if(at&&!bt)return-1;
    if(!at&&bt)return 1;
    return Number(a.order||100)-Number(b.order||100)||String(a.title||"").localeCompare(String(b.title||""));
  }
  function taskUiMeta(t){
    const bits=[];
    if(t.itineraryStart)bits.push(typeof fmtClock==="function"?fmtClock(t.itineraryStart):t.itineraryStart);
    if(t.child)bits.push(t.child);
    return bits;
  }
  function taskUiSpecificTitle(t){
    const title=String(t&&t.title||"Task").trim(),key=title.toLowerCase().replace(/\s+/g," ");
    if(typeof window.taskDisplayTitle==="function"){const shared=window.taskDisplayTitle(t);if(shared!==title)return shared}
    if(key==="bedtime wind down")return"Night routine · teeth, pajamas, vacuums + settle";
    if(key==="kids nighttime prep")return"Kids · electronics, teeth, pajamas + reading";
    if(key==="tomorrow prep")return"Set out clothes + pack tomorrow";
    if(key==="homework + reading")return"Homework + read 20 minutes";
    if(key==="morning routine")return"Morning · bathroom, teeth, water + get dressed";
    if(key==="home reset"||key==="home reset / declutter")return"Home reset · clear surfaces + one problem area";
    if(key==="personal care")return"Shower + dry off + lotion / self-care";
    return title;
  }
  function taskUiSpecificNote(t){
    const title=String(t&&t.title||"").trim().toLowerCase().replace(/\s+/g," "),
          note=String(t&&t.notes||"").trim(),
          detail=String(t&&t.detail||"").trim(),
          subtasks=Array.isArray(t&&t.subtasks)?t.subtasks.filter(Boolean).map(String):[];
    if(subtasks.length)return subtasks.slice(0,5).join(" · ")+(subtasks.length>5?" · +"+(subtasks.length-5)+" more":"");
    if(note&&note.toLowerCase()!==title)return note;
    if(detail&&detail.toLowerCase()!==title)return detail;
    if(title==="bedtime wind down")return"7:30 electronics · teeth/floss/mouthwash · wash face · pajamas · start vacuums · plug in phone/set alarm · settle with Dolly + Ambrose";
    if(title==="kids nighttime prep")return"7:30 electronics sweep · all four brush teeth · Leo + Demitri wash faces/pajamas · 7:40 reading";
    if(title==="tomorrow prep")return"Clothes out · bags packed · needed items by the door";
    if(title==="morning routine")return"Bathroom · brush/floss/mouthwash · wash face · hair · deodorant · water · get dressed";
    if(title==="home reset"||title==="home reset / declutter")return"Clear one visible area · put away loose items · trash/recycling · quick floor pickup";
    if(title==="personal care")return"Shower · dry/lotion · hair/skin basics · get dressed";
    return"";
  }
  function taskUiRow(t){
    const meta=taskUiMeta(t),note=taskUiSpecificNote(t),displayTitle=taskUiSpecificTitle(t);
    return '<div class="task-ui-row '+(t.done?'is-done':'')+'">'+
      '<label class="task-ui-check"><input type="checkbox" '+(t.done?'checked':'')+' onchange="toggleTask(\''+taskUiEsc(t.id)+'\',this.checked)"><span aria-hidden="true"></span></label>'+
      '<button class="task-ui-main" type="button" onclick="openTask(\'\',\''+taskUiEsc(t.id)+'\')">'+
        '<b>'+taskUiEsc(displayTitle)+'</b>'+
        (meta.length?'<small>'+meta.map(taskUiEsc).join(' · ')+'</small>':'')+
        (note?'<small class="task-ui-note">'+taskUiEsc(note)+'</small>':'')+
      '</button>'+
      '<button class="task-ui-more" type="button" aria-label="Edit '+taskUiEsc(displayTitle)+'" onclick="openTask(\'\',\''+taskUiEsc(t.id)+'\')">•••</button>'+
    '</div>';
  }
  function taskUiGroups(rows){
    const map=new Map();
    for(const t of rows.slice().sort(taskUiSort)){
      const g=taskUiGroup(t);
      if(!map.has(g.key))map.set(g.key,{info:g,rows:[]});
      map.get(g.key).rows.push(t);
    }
    const order=["work","me","kids","home","homecare","admin"];
    return [...map.values()].sort((a,b)=>order.indexOf(a.info.key)-order.indexOf(b.info.key));
  }
  function taskUiOpenGroups(rows){
    return taskUiGroups(rows).map(g=>{
      const open=g.rows.filter(x=>!x.done);
      if(!open.length)return"";
      return '<section class="task-ui-group">'+
        '<div class="task-ui-group-head"><span><i>'+g.info.icon+'</i><b>'+taskUiEsc(g.info.label)+'</b></span><small>'+open.length+' open</small></div>'+
        open.map(taskUiRow).join("")+
      '</section>';
    }).join("");
  }
  function taskUiCompleted(rows){
    const doneRows=rows.filter(x=>x.done).sort(taskUiSort);
    if(!doneRows.length)return"";
    return '<details class="task-ui-completed"><summary><span>✓ Completed today</span><b>'+doneRows.length+'</b></summary><div>'+doneRows.map(taskUiRow).join("")+'</div></details>';
  }

  function taskUiFamilyRoutines(){
    const rows=(state.chores||[]).filter(x=>x.date===ymd());
    if(!rows.length)return "";
    const preferred=["Leo","Demitri","Dolly","Ambrose"],people=new Map();
    for(const c of rows){
      const name=String(c.child||"Family").trim()||"Family";
      if(!people.has(name))people.set(name,[]);
      people.get(name).push(c);
    }
    const ordered=[...people.entries()].sort((a,b)=>{
      const ai=preferred.indexOf(a[0]),bi=preferred.indexOf(b[0]);
      if(ai>=0||bi>=0)return (ai<0?99:ai)-(bi<0?99:bi);
      return a[0].localeCompare(b[0]);
    });
    const open=rows.filter(x=>!x.done).length;
    return '<section class="task-ui-family">'+
      '<div class="task-ui-group-head"><span><i>⌂</i><b>Kids + house</b></span><small>'+open+' open</small></div>'+
      '<div class="task-ui-kid-grid">'+ordered.map(([name,items])=>{
        const sorted=items.slice().sort((a,b)=>{
          const ag=a.generated==="daily-basics"?0:a.generated==="rotation"?1:2,
                bg=b.generated==="daily-basics"?0:b.generated==="rotation"?1:2;
          return ag-bg||String(a.chore||"").localeCompare(String(b.chore||""));
        }),done=sorted.filter(x=>x.done).length;
        return '<div class="task-ui-kid-card">'+
          '<div class="task-ui-kid-head"><b>'+taskUiEsc(name)+'</b><small>'+done+'/'+sorted.length+'</small></div>'+
          '<div class="task-ui-kid-checks">'+sorted.map(c=>
            '<label class="'+(c.done?'done':'')+'"><input type="checkbox" '+(c.done?'checked':'')+
            ' onchange="toggleChore(\''+taskUiEsc(c.id)+'\',this.checked)"><span>'+taskUiEsc(c.chore||"Routine")+'</span></label>'
          ).join("")+'</div></div>';
      }).join("")+'</div></section>';
  }

  if(typeof todayTasksTrackingDrawer==="function"){
    todayTasksTrackingDrawer=function(tk,done,actual,h,w,f,oz){
      const open=tk.filter(x=>!x.done).length,
        workSummary=actual?h.toFixed(2)+" h":workNeedsPunchOut(w)?"Punch-out needed":w&&w.start&&liveWorkHours(w)>0?liveWorkHours(w).toFixed(2)+" h so far":"No completed hours",
        subtitle=[open?open+" open":"tasks clear",done+" done",Math.round(oz)+" oz water"].join(" · "),
        taskBody=tk.length?(taskUiOpenGroups(tk)+taskUiCompleted(tk)):'<div class="task-ui-empty"><b>Nothing on the task list.</b><small>Add something only if it actually needs your attention today.</small></div>',
        content='<div class="card compact-drawer-card task-ui-card">'+
          '<div class="task-ui-toolbar"><div><div class="eyebrow">Today</div><h2>Tasks</h2><small>'+open+' open · '+done+' done</small></div><div class="task-ui-toolbar-actions"><button class="btn small" onclick="openDailyReview()">Review</button><button class="btn primary small" onclick="openTask()">+ Add</button></div></div>'+
          (tk.length&&typeof todayProgress==="function"?todayProgress(done,tk.length,"Tasks complete"):"")+
          taskBody+taskUiFamilyRoutines()+
        '</div>'+
        '<div class="today-metrics compact-metrics task-ui-metrics">'+
          '<div class="metric"><div class="eyebrow">UPS</div><div class="big">'+taskUiEsc(workSummary)+'</div><div class="muted small">'+taskUiEsc(workStatusText(w))+(actual&&Number(w.rate)>0?' · '+money(h*Number(w.rate))+' est. gross':'')+'</div><button class="btn small" onclick="openWork()">Edit work</button></div>'+
          '<div class="metric"><div class="eyebrow">Food logged</div><div class="big">'+Math.round(f.cal)+' known cal</div>'+todayProgress(f.cal,state.settings.calTarget,"Known calories logged")+'<div class="muted small">'+Math.round(f.protein)+' g known protein</div>'+todayProgress(f.protein,state.settings.proteinTarget,"Known protein logged")+'</div>'+
          '<div class="metric"><div class="eyebrow">Water</div><div class="big">'+oz+' oz</div>'+todayProgress(oz,state.settings.waterTarget,"Water logged")+'<div class="actions"><button class="btn primary small" onclick="addWater(26)">+26 oz</button><button class="btn small" onclick="setWaterGoal()">'+(state.settings.waterTarget?"Edit goal":"Set goal")+'</button></div></div>'+
        '</div>';
      return todayDrawer("tasks-tracking","✓","Tasks + tracking",subtitle,content,false);
    };
  }

  window.taskUiEditReviewItem=function(kind,key,date){
    if(kind==="task"){closeModal();openTask("",key);return}
    if(kind!=="chore")return;
    const c=(state.chores||[]).find(x=>String(x.id)===String(key));if(!c)return;
    modal("Edit routine item",'<div class="stack"><label>Person<input id="reviewChoreChild" value="'+taskUiEsc(c.child||"")+'"></label><label>Routine / chore<input id="reviewChoreText" value="'+taskUiEsc(c.chore||"")+'"></label><div class="muted small">This changes the saved item for '+taskUiEsc(date)+'.</div></div>',"Save",async()=>{
      const child=document.querySelector("#reviewChoreChild").value.trim(),chore=document.querySelector("#reviewChoreText").value.trim();
      if(!child||!chore)return;
      c.child=child;c.chore=chore;
      const review=typeof dailyReviewEntry==="function"?dailyReviewEntry("chore",c.id,date):null;
      if(review)review.label=chore;
      await save();closeModal();render();openDailyReview(date);
    });
  };

  if(typeof openDailyReview==="function"){
    openDailyReview=function(date,cursor){
      date=/^\d{4}-\d{2}-\d{2}$/.test(String(date||""))?date:ymd();
      cursor=Math.max(0,Math.trunc(Number(cursor)||0));
      const all=dailyReviewExpected(date),unknown=all.filter(x=>x.status==="unknown"),summary=dailyReviewSummary(date),
        backlog=dailyReviewBacklog(7),backlogUnknown=backlog.reduce((n,x)=>n+x.unknown,0),
        position=unknown.length?cursor%unknown.length:0,item=unknown[position],
        dateLabel=new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}),
        answered=summary.yes+summary.no+summary.na;

      if(!item){
        modal("Daily Review",'<div class="stack daily-review daily-review-v2">'+
          '<div class="daily-review-complete"><div class="eyebrow">'+taskUiEsc(dateLabel)+'</div><h2>Review complete</h2><div class="muted">Everything for this day is classified. Nothing unentered is being counted as “no.”</div></div>'+
          '<div class="daily-review-summary"><span><b>'+summary.yes+'</b><small>yes</small></span><span><b>'+summary.no+'</b><small>no</small></span><span><b>'+summary.na+'</b><small>N/A</small></span><span><b>0</b><small>unknown</small></span></div>'+
          (backlogUnknown?'<button class="btn daily-review-backlog" onclick="openDailyReviewCatchup(7)">Earlier days · '+backlogUnknown+' unknown</button>':'')+
          '<label>Review another day<input type="date" value="'+taskUiEsc(date)+'" onchange="openDailyReview(this.value)"></label>'+
        '</div>',"Done",closeModal);
        return;
      }

      const canEdit=item.kind==="task"||item.kind==="chore";
      modal("Daily Review",'<div class="stack daily-review daily-review-v2">'+
        '<div class="daily-review-head"><div><div class="eyebrow">'+taskUiEsc(dateLabel)+'</div><h2>'+unknown.length+' left to classify</h2><div class="muted small">'+answered+' answered · unknown stays out of pattern calculations.</div></div><span class="tag">? '+unknown.length+'</span></div>'+
        '<div class="daily-review-question">'+
          '<div class="daily-review-item-top"><span class="daily-review-group">'+taskUiEsc(item.group)+'</span>'+(canEdit?'<button class="daily-review-edit" onclick="taskUiEditReviewItem(\''+taskUiEsc(item.kind)+'\',\''+taskUiEsc(item.key)+'\',\''+taskUiEsc(date)+'\')">Edit</button>':'')+'</div>'+
          '<h2>'+taskUiEsc(item.label)+'</h2>'+
          (item.detail?'<div class="daily-review-detail">'+taskUiEsc(item.detail)+'</div>':'')+
          '<div class="daily-review-actions daily-review-actions-v2">'+
            '<button class="review-yes" onclick="applyDailyReview(\''+taskUiEsc(item.kind)+'\',\''+taskUiEsc(item.key)+'\',\''+taskUiEsc(date)+'\',\'yes\')">✓ Yes</button>'+
            '<button class="review-no" onclick="applyDailyReview(\''+taskUiEsc(item.kind)+'\',\''+taskUiEsc(item.key)+'\',\''+taskUiEsc(date)+'\',\'no\')">✕ No</button>'+
            '<button class="review-na" onclick="applyDailyReview(\''+taskUiEsc(item.kind)+'\',\''+taskUiEsc(item.key)+'\',\''+taskUiEsc(date)+'\',\'na\')">— N/A</button>'+
            '<button class="review-unknown" onclick="openDailyReview(\''+taskUiEsc(date)+'\','+(position+1)+')">? Skip for now</button>'+
          '</div>'+
          '<div class="muted small">Use N/A when the item was not expected that day. Skip keeps it unknown so you can answer later.</div>'+
        '</div>'+
        '<div class="daily-review-summary"><span><b>'+summary.yes+'</b><small>yes</small></span><span><b>'+summary.no+'</b><small>no</small></span><span><b>'+summary.na+'</b><small>N/A</small></span><span><b>'+summary.unknown+'</b><small>unknown</small></span></div>'+
        (backlogUnknown>summary.unknown?'<button class="btn daily-review-backlog" onclick="openDailyReviewCatchup(7)">Earlier days · '+(backlogUnknown-summary.unknown)+' unknown</button>':'')+
        '<label>Review date<input type="date" value="'+taskUiEsc(date)+'" onchange="openDailyReview(this.value)"></label>'+
      '</div>',"Close",closeModal);
    };
  }

  window.taskUiDisplayTitle=taskUiSpecificTitle;
  window.taskUiDisplayNote=taskUiSpecificNote;

  if(!document.getElementById("taskUiStyles")){
    const style=document.createElement("style");
    style.id="taskUiStyles";
    style.textContent=
      '.task-ui-card{padding:12px 2px!important}.task-ui-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:0 2px 10px}.task-ui-toolbar h2{margin:1px 0}.task-ui-toolbar small{color:var(--muted);font-size:.68rem}.task-ui-toolbar-actions{display:flex;gap:6px;flex:0 0 auto}.task-ui-group{padding:8px 0 1px;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border))}.task-ui-group-head{display:flex;justify-content:space-between;align-items:center;padding:2px 3px 5px}.task-ui-group-head span{display:flex;align-items:center;gap:7px}.task-ui-group-head i{font-style:normal;font-size:.78rem}.task-ui-group-head b{font-size:.72rem;letter-spacing:.03em}.task-ui-group-head small{font-size:.62rem;color:var(--muted)}.task-ui-row{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;min-height:48px;border-top:1px solid color-mix(in srgb,var(--secondary) 7%,var(--border));gap:3px}.task-ui-check{display:grid;place-items:center}.task-ui-check input{width:20px;height:20px}.task-ui-main{display:grid;gap:2px;min-width:0;padding:8px 3px;border:0;background:transparent;color:var(--text);text-align:left;font:inherit}.task-ui-main b{font-size:.78rem;line-height:1.25;overflow-wrap:anywhere}.task-ui-main small{font-size:.62rem;color:var(--muted);line-height:1.3}.task-ui-note{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.task-ui-more{width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-weight:900}.task-ui-row.is-done{opacity:.62}.task-ui-row.is-done .task-ui-main b{text-decoration:line-through}.task-ui-completed{border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border));margin-top:7px}.task-ui-completed>summary{min-height:44px;display:flex;align-items:center;justify-content:space-between;list-style:none;cursor:pointer;color:var(--muted);font-size:.7rem;padding:0 3px}.task-ui-completed>summary::-webkit-details-marker{display:none}.task-ui-completed>summary b{font-family:var(--font-heading);color:var(--text)}.task-ui-empty{display:grid;gap:3px;padding:18px 6px;text-align:center}.task-ui-empty small{color:var(--muted)}.task-ui-family{border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border));margin-top:8px;padding-top:7px}.task-ui-kid-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:2px 1px 5px}.task-ui-kid-card{border:1px solid color-mix(in srgb,var(--secondary) 13%,var(--border));border-radius:14px;padding:8px;background:color-mix(in srgb,var(--panel) 96%,var(--secondary) 4%)}.task-ui-kid-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:5px}.task-ui-kid-head b{font-size:.72rem}.task-ui-kid-head small{font-size:.6rem;color:var(--muted)}.task-ui-kid-checks{display:grid;gap:4px}.task-ui-kid-checks label{display:flex;align-items:center;gap:6px;min-height:27px;font-size:.66rem;line-height:1.2}.task-ui-kid-checks input{width:17px;height:17px;flex:0 0 auto}.task-ui-kid-checks label.done span{text-decoration:line-through;opacity:.55}.task-ui-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important}.daily-review-v2 .daily-review-item-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.daily-review-edit{border:0;background:rgba(255,255,255,.55);color:#75536d;border-radius:999px;padding:5px 9px;font:inherit;font-size:.62rem;font-weight:850}.daily-review-detail{color:#685a6c;font-size:.75rem;margin-top:2px}.daily-review-actions-v2{grid-template-columns:1fr 1fr!important}.daily-review-actions-v2 .review-na,.daily-review-actions-v2 .review-unknown{grid-column:auto!important}.daily-review-backlog{width:100%;min-height:42px}.daily-review-v2 label{color:#6c5969!important}@media(max-width:520px){.task-ui-kid-grid{grid-template-columns:1fr 1fr}.task-ui-toolbar{align-items:flex-start}.task-ui-toolbar-actions{flex-direction:column}.task-ui-metrics{grid-template-columns:1fr!important}.daily-review-actions-v2{grid-template-columns:1fr 1fr!important}}';
    document.head.appendChild(style);
  }
})();