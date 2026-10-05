/* Daily Life · whole-life operating layer
   Turns Day Flow into a usable all-day guide and adds the round visual dashboard.
   This layer is additive and preserves existing IndexedDB/cloud records. */
(function(){
  "use strict";

  function lifePrefs(){
    state.settings=state.settings||{};
    state.settings.itinerary=state.settings.itinerary||{};
    return state.settings.itinerary;
  }

  function lifeEnsureSettings(){
    const p=lifePrefs();
    if(Number(p.workScheduleOffDayFixVersion||0)<3){
      p.workWeekdays=[2,3,4,5,6];
      p.workScheduleConfirmedAt="2026-10-04";
      p.workScheduleLabel="Tuesday–Saturday";
      p.workScheduleOffDayFixVersion=3;
      p.lifeWorkWeekConfirmed=true;
    }
    if(!Array.isArray(p.workWeekdays)||!p.workWeekdays.length)p.workWeekdays=[2,3,4,5,6];
    if(!p.nonWorkDayStart)p.nonWorkDayStart="08:00";
    if(Number(p.mondayStartFixVersion||0)<1){
      p.wakeByWeekday=p.wakeByWeekday||{};
      p.wakeByWeekday[1]="06:15";
      p.mondayStartFixVersion=1;
    }
    if(Number(p.mondayOct5CleanupVersion||0)<1){
      (state.events||[]).forEach(function(e){
        if(e&&e.date==="2026-10-05"&&/vasa\s*gym.*yesi|gym.*yesi/i.test(String(e.title||""))){
          e.status="cancelled";
        }
      });
      p.mondayOct5CleanupVersion=1;
    }
    if(p.sleepTargetHours===undefined)p.sleepTargetHours=8;
    if(!p.personalCareRoutine||Number(p.personalCareRoutine.version||0)<1){
      p.personalCareRoutine={
        version:1,
        enabled:true,
        workdayDurationMinutes:50,
        offdayDurationMinutes:30,
        offdayWindowStart:"14:00",
        offdayWindowEnd:"16:00",
        subtasks:["Drive home","Shower","Wash body","Wash face","Lotion","Deodorant","Put on clean clothes"]
      };
    }
    if(!p.nightRoutine||Number(p.nightRoutine.version||0)<2){
      p.nightRoutine={
        version:2,
        enabled:true,
        durationMinutes:30,
        subtasks:["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Get in bed"]
      };
    }
    if(!p.householdFocus||Number(p.householdFocus.version||0)<1){
      p.householdFocus={
        version:1,
        enabled:true,
        windowStart:"12:00",
        windowEnd:"14:00",
        excludeRegularKidChores:true,
        excludedLabels:["laundry","dishes","counters","spot mop floor","floor spots","start vacuums"]
      };
    }
    if(!p.kidShowerRoutine||Number(p.kidShowerRoutine.version||0)<1){
      p.kidShowerRoutine={
        version:1,
        enabled:true,
        durationMinutes:20,
        maxEveningShowers:2,
        leoMorning:{enabled:true,start:"06:45",weekdays:[1,2,3,4,5]},
        noEveningWeekdays:[2],
        weeklyPlan:{
          "0":[{child:"Ambrose",start:"18:30",note:"Sunday evening shower after dinner"}],
          "1":[{child:"Demitri",start:"18:00",note:"Monday evening shower"},{child:"Dolly",start:"18:20",note:"Monday evening shower"}],
          "3":[{child:"Demitri",start:"17:00",note:"Before Dolly's dance"},{child:"Dolly",start:"19:00",note:"After dance"}],
          "4":[{child:"Ambrose",start:"18:40",note:"After Food Fort; home around 6:30 PM"}]
        }
      };
    }
    if(!p.gymRoutine||Number(p.gymRoutine.version||0)<3){
      p.gymRoutine={
        version:3,
        enabled:true,
        weeklyGoal:2,
        partner:"Yesi",
        place:"VASA Gym",
        windowStart:"11:30",
        windowEnd:"14:00",
        durationMinutes:60,
        preferredWeekdays:[4,6]
      };
    }
    if(!p.workMorningRoutine||Number(p.workMorningRoutine.version||0)<3){
      p.workMorningRoutine={
        version:3,
        leadMinutes:60,
        commuteMinutes:15,
        steps:[
          {key:"dress",from:-60,to:-55,title:"Wake + get dressed + downstairs",detail:"Wake up · Shirt · Pants · Socks · Shoes · Go downstairs",
            subtasks:["Wake up","Shirt","Pants","Socks","Shoes","Go downstairs"],icon:"◷"},
          {key:"hygiene",from:-55,to:-45,title:"Morning hygiene + hair",detail:"Brush teeth · Floss · Mouthwash · Wash face · Do hair · Deodorant · Perfume",
            subtasks:["Brush teeth","Floss","Mouthwash","Wash face","Do hair","Deodorant","Perfume"],icon:"♡"},
          {key:"dayflow",from:-45,to:-30,title:"Check Day Flow",detail:"Review today’s schedule, priorities, travel, meals, and anything that changed overnight",
            subtasks:["Check Day Flow"],icon:"✦"},
          {key:"stretch",from:-30,to:-25,title:"5-minute stretch",detail:"Stretch for 5 minutes",
            subtasks:["Stretch for 5 minutes"],icon:"✦"},
          {key:"gather",from:-25,to:-15,title:"Gather work things + check tire",detail:"Water bottle · Earbuds · Energy drink · Jacket · Bag · Check tire pressure",
            subtasks:["Water bottle","Earbuds","Energy drink","Jacket","Bag","Check tire pressure"],icon:"✓"},
          {key:"commute",from:-15,to:0,title:"Leave for UPS · drive · park · clock in",detail:"Leave at the 15-minute mark · about 12 minutes to UPS plus parking / clock-in buffer",
            subtasks:["Leave for UPS","Drive to work","Park","Clock in"],icon:"🚗"}
        ]
      };
    }
    return p;
  }

  function lifeWeekday(date){
    return new Date(String(date||ymd())+"T12:00:00").getDay();
  }

  function lifeIsWorkday(date){
    lifeEnsureSettings();
    if(typeof isUsualWorkday==="function")return isUsualWorkday(date);
    const p=lifePrefs(),days=p.workWeekdays.map(Number);
    return days.includes(lifeWeekday(date));
  }

  function lifeActualWork(date){
    if(typeof isConfirmedWorkOffDate==="function"&&isConfirmedWorkOffDate(date))return false;
    const w=workForDate(date);
    return !!(w&&w.start);
  }

  function lifeMinutesBetween(start,end){
    let s=hmMinutes(start),e=hmMinutes(end);
    if(s===null||e===null)return null;
    if(e<s)e+=1440;
    const n=e-s;
    return n>=30&&n<=720?n:null;
  }

  function lifeMedian(values){
    const rows=values.filter(Number.isFinite).sort(function(a,b){return a-b});
    if(!rows.length)return null;
    const m=Math.floor(rows.length/2);
    return rows.length%2?rows[m]:Math.round((rows[m-1]+rows[m])/2);
  }

  function lifeEstimatedWorkMinutes(date){
    const wd=lifeWeekday(date),cut=new Date(String(date)+"T12:00:00");
    cut.setDate(cut.getDate()-56);
    const cutoff=ymd(cut);
    const completed=(state.workShifts||[]).filter(function(w){
      return w.date<date&&w.date>=cutoff&&w.start&&w.end;
    }).map(function(w){
      return {weekday:lifeWeekday(w.date),minutes:lifeMinutesBetween(w.start,w.end)};
    }).filter(function(x){return Number.isFinite(x.minutes)});
    const same=completed.filter(function(x){return x.weekday===wd}).map(function(x){return x.minutes});
    let estimate=same.length>=2?lifeMedian(same):lifeMedian(completed.map(function(x){return x.minutes}));
    if(!Number.isFinite(estimate))estimate=240;
    return Math.max(120,Math.min(480,Math.round(estimate/5)*5));
  }

  /* Sunday + Monday are normal non-work days. A real punch-in still counts as an extra shift. */
  const baseDayStart=itineraryDayStart;
  itineraryDayStart=function(date){
    const p=lifeEnsureSettings(),wd=lifeWeekday(date);
    const explicit=hmMinutes(p.wakeByWeekday&&p.wakeByWeekday[wd]);
    if(explicit!==null)return explicit;
    if(!lifeIsWorkday(date)&&!lifeActualWork(date)){
      return hmMinutes(p.nonWorkDayStart)||480;
    }
    return baseDayStart(date);
  };

  /* Unknown scheduled work no longer blocks the entire day.
     Use a visible recent-duration estimate until the real punch-out is known. */
  const baseFixedItems=itineraryFixedItems;
  itineraryFixedItems=function(date){
    const w=workForDate(date),allowed=lifeIsWorkday(date)||lifeActualWork(date),
      confirmedOff=typeof isConfirmedWorkOffDate==="function"&&isConfirmedWorkOffDate(date);
    let rows=baseFixedItems(date).filter(function(x){
      if(x.source==="work"&&!allowed)return false;
      if(date==="2026-10-05"&&x.source==="event"&&/vasa\s*gym.*yesi|gym.*yesi/i.test(String(x.title||"")))return false;
      return true;
    }).map(function(x){
      if(x.source!=="work"||!x.endUnknown)return x;
      const start=hmMinutes(x.start);
      if(start===null)return x;
      const mins=lifeEstimatedWorkMinutes(date),end=Math.min(1439,start+mins);
      return Object.assign({},x,{
        end:minutesHm(end),
        endUnknown:false,
        estimatedEnd:true,
        estimatedMinutes:mins,
        detail:"End estimated around "+fmtClock(minutesHm(end))+" from recent completed shifts until the real punch-out is known."
      });
    });
    if(allowed&&!confirmedOff&&!rows.some(function(x){return x.source==="work"})&&typeof inferredWorkStartForDate==="function"){
      const inferred=inferredWorkStartForDate(date);
      if(inferred&&Number.isFinite(inferred.minutes)){
        const mins=lifeEstimatedWorkMinutes(date),end=Math.min(1439,inferred.minutes+mins);
        rows.push({id:"work-est:"+date,start:minutesHm(inferred.minutes),end:minutesHm(end),title:"UPS expected shift",
          detail:"Start estimated from "+inferred.samples+" "+inferred.source+" shift"+(inferred.samples===1?"":"s")+" until the posted schedule is entered.",
          fixed:true,kind:"work",icon:"📦",source:"work",estimatedEnd:true,estimatedMinutes:mins});
      }
    }
    return rows.sort(function(a,b){return String(a.start).localeCompare(String(b.start))});
  };

  /* Sleep planning uses confirmed Tue-Sat work rhythm and ignores stale off-day schedules. */
  itinerarySleepPlan=function(date){
    const p=lifeEnsureSettings(),target=Math.max(4,Math.min(12,Number(p.sleepTargetHours||8))),
      lead=Math.max(15,Math.min(180,Number(p.morningLeadMinutes||60))),
      preferredStart=hmMinutes(p.preferredBedtimeStart||"20:00")===null?1200:hmMinutes(p.preferredBedtimeStart||"20:00"),
      preferredEnd=hmMinutes(p.preferredBedtimeEnd||"20:30")===null?1230:hmMinutes(p.preferredBedtimeEnd||"20:30"),
      tomorrow=shiftDateString(date,1),candidates=[],tomorrowWd=lifeWeekday(tomorrow);
    const wakeOverride=hmMinutes(p.wakeByWeekday&&p.wakeByWeekday[tomorrowWd]);
    if(wakeOverride!==null)candidates.push({wake:wakeOverride,reason:"your saved wake time",kind:"routine",estimated:false});

    const work=workForDate(tomorrow),allowWork=lifeIsWorkday(tomorrow)||lifeActualWork(tomorrow),
      workStart=allowWork?hmMinutes(work&&(work.start||work.scheduled)):null;
    if(workStart!==null)candidates.push({wake:Math.max(0,workStart-lead),reason:"UPS "+fmtClock(work.start||work.scheduled),kind:"work",estimated:false});
    else if(lifeIsWorkday(tomorrow)&&p.inferWorkStartForSleep!==false){
      const inferred=inferredWorkStartForDate(tomorrow);
      if(inferred&&inferred.minutes!==null&&inferred.minutes!==undefined)candidates.push({
        wake:Math.max(0,inferred.minutes-lead),
        reason:"estimated UPS "+fmtClock(minutesHm(inferred.minutes))+" start from "+inferred.samples+" "+inferred.source+" shift"+(inferred.samples===1?"":"s"),
        kind:"work-pattern",estimated:true
      });
    }

    const earlyEvents=(state.events||[]).filter(function(e){
      return e.date===tomorrow&&e.status!=="cancelled"&&e.startTime;
    }).map(function(e){return Object.assign({},e,{_m:hmMinutes(e.startTime)})}).filter(function(e){
      return e._m!==null&&e._m<600;
    });
    earlyEvents.forEach(function(e){
      candidates.push({wake:Math.max(0,e._m-lead),reason:e.title||"early commitment",kind:"event",estimated:false});
    });

    const earlyBlocks=(state.itineraryBlocks||[]).filter(function(x){
      return x.date===tomorrow&&x.kind==="fixed"&&x.start;
    }).map(function(x){return Object.assign({},x,{_m:hmMinutes(x.start)})}).filter(function(x){
      return x._m!==null&&x._m<600;
    });
    earlyBlocks.forEach(function(x){
      candidates.push({wake:Math.max(0,x._m-lead),reason:x.title||"early fixed block",kind:"block",estimated:false});
    });

    candidates.sort(function(a,b){return a.wake-b.wake});
    const next=candidates[0]||null,sleepMinutes=Math.round(target*60);
    let requiredBedtime=null;
    if(next){
      const raw=(next.wake-sleepMinutes+1440)%1440;
      requiredBedtime=raw<720?raw+1440:raw;
    }
    const configured=hmMinutes(p.dayEnd||"21:30")===null?1290:hmMinutes(p.dayEnd||"21:30"),
      usualLatest=Math.max(preferredStart,preferredEnd);
    let bedtime=usualLatest;
    if(next&&requiredBedtime!==null)bedtime=Math.min(bedtime,requiredBedtime);
    bedtime=Math.min(bedtime,configured);
    bedtime=Math.max(840,Math.min(1439,Math.round(bedtime)));
    const wake=next?next.wake:null,
      protectedHours=wake===null?target:Math.max(0,(wake+1440-bedtime)/60);
    return {date:date,tomorrow:tomorrow,targetHours:target,morningLeadMinutes:lead,preferredStart:preferredStart,preferredEnd:preferredEnd,
      bedtimeMinutes:bedtime,bedtime:minutesHm(bedtime),wakeMinutes:wake,wake:wake===null?"":minutesHm(wake),
      reason:next?next.reason:"",reasonKind:next?next.kind:"",estimated:!!(next&&next.estimated),protectedHours:protectedHours};
  };

  /* Add a usable off-day rhythm and make tomorrow-prep an everyday closeout. */
  if(typeof ITINERARY_ROUTINES!=="undefined"){
    [["morning-start","Morning start + basics"],["home-reset","Home reset / declutter"],["midday-reset","Lunch + midday reset"],["personal-care","Shower + self-care"],["kid-shower-leo","Leo morning shower"],["kid-shower-demitri","Demitri shower"],["kid-shower-dolly","Dolly shower"],["kid-shower-ambrose","Ambrose shower"]].forEach(function(row){
      if(!ITINERARY_ROUTINES.some(function(x){return x[0]===row[0]}))ITINERARY_ROUTINES.push(row);
    });
  }

  const baseRoutineWindow=itineraryRoutineWindow;
  itineraryRoutineWindow=function(x,date){
    const p=lifeEnsureSettings(),dayStart=itineraryDayStart(date),dayEnd=itineraryDayEnd(date);
    if(/^work-(dress|hygiene|dayflow|stretch|gather|commute)$/.test(String(x.templateKey||"")))return {start:dayStart,end:Math.min(dayEnd,hmMinutes((workForDate(date)||{}).start||(workForDate(date)||{}).scheduled)||dayEnd)};
    if(x.templateKey==="gym-vasa-yesi")return {start:11*60+30,end:14*60};
    if(/^kid-shower-/.test(String(x.templateKey||""))){
      const desired=hmMinutes(x.start),end=hmMinutes(x.end);
      if(desired!==null)return {start:desired,end:end!==null&&end>desired?end:desired+20};
    }
    if(x.templateKey==="personal-care"){
      const care=p.personalCareRoutine||{},work=workForDate(date),actualEnd=hmMinutes(work&&work.end),
        workStart=hmMinutes(work&&(work.start||work.scheduled)),
        estimatedEnd=actualEnd!==null?actualEnd:(workStart!==null?workStart+lifeEstimatedWorkMinutes(date):null);
      if((lifeIsWorkday(date)||lifeActualWork(date))&&estimatedEnd!==null){
        return {start:Math.max(dayStart,estimatedEnd),end:Math.min(dayEnd,estimatedEnd+120)};
      }
      return {start:Math.max(dayStart,hmMinutes(care.offdayWindowStart)||14*60),end:Math.min(dayEnd,hmMinutes(care.offdayWindowEnd)||16*60)};
    }
    if(x.templateKey==="morning-start")return {start:dayStart,end:Math.min(dayEnd,dayStart+90)};
    if(x.templateKey==="home-reset")return {start:Math.max(dayStart,12*60),end:Math.min(dayEnd,14*60)};
    if(x.templateKey==="midday-reset")return {start:12*60,end:Math.min(dayEnd,14*60)};
    return baseRoutineWindow(x,date);
  };

  function lifeRoutineApply(date,row,index){
    const wd=lifeWeekday(date),saved=(lifeEnsureSettings().routinePreferences||{})[wd+":"+row.templateKey]||null;
    if(saved&&saved.enabled===false)return null;
    let start=saved&&saved.start?saved.start:row.start;
    const isKidShower=/^kid-shower-/.test(String(row.templateKey||"")),
      isLeoShower=row.templateKey==="kid-shower-leo",
      startMinutes=hmMinutes(start);
    if(isKidShower&&wd>=1&&wd<=5&&startMinutes!==null){
      const schoolHours=startMinutes>=7*60+15&&startMinutes<15*60+30;
      if((!isLeoShower&&schoolHours)||(isLeoShower&&startMinutes>=7*60+15))start=row.start;
    }
    const duration=Number(saved&&saved.durationMinutes||0),
      end=duration>0?minutesHm((hmMinutes(start)||0)+duration):(saved&&saved.end?saved.end:row.end);
    row.start=start;row.end=end;row.detail=saved&&saved.detail?saved.detail:row.detail;
    if(row.templateKey==="wind-down"){
      const night=lifeEnsureSettings().nightRoutine||{};
      row.title="Night routine";
      row.detail="Finish the day and get into bed by the planned bedtime";
      row.subtasks=Array.isArray(night.subtasks)?night.subtasks.slice():["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Get in bed"];
    }
    row.id="suggest:"+date+":"+row.templateKey+":life"+index;
    row.fixed=false;row.kind="routine";row.source="suggested";row.learnedRoutine=!!saved;
    return row;
  }

  function lifeKidShowerRows(date){
    const cfg=lifeEnsureSettings().kidShowerRoutine||{};
    if(cfg.enabled===false)return [];
    const wd=lifeWeekday(date),duration=Math.max(20,Number(cfg.durationMinutes||20)),rows=[],
      leo=cfg.leoMorning||{},leoDays=Array.isArray(leo.weekdays)?leo.weekdays.map(Number):[];
    if(leo.enabled!==false&&leoDays.includes(wd)){
      const start=hmMinutes(leo.start)||405;
      rows.push({templateKey:"kid-shower-leo",start:minutesHm(start),end:minutesHm(start+duration),
        title:"Leo · morning shower",detail:"Leo prefers morning showers · "+duration+" minutes",icon:"♡"});
    }
    if(Array.isArray(cfg.noEveningWeekdays)&&cfg.noEveningWeekdays.map(Number).includes(wd))return rows;
    const plan=cfg.weeklyPlan&&Array.isArray(cfg.weeklyPlan[String(wd)])?cfg.weeklyPlan[String(wd)]:[];
    plan.slice(0,Math.max(1,Number(cfg.maxEveningShowers||2))).forEach(function(item){
      const start=hmMinutes(item.start);
      if(start===null||!item.child)return;
      const key=String(item.child).toLowerCase().replace(/[^a-z0-9]+/g,"-");
      rows.push({templateKey:"kid-shower-"+key,start:minutesHm(start),end:minutesHm(start+duration),
        title:String(item.child)+" · shower",detail:[duration+" minutes",item.note].filter(Boolean).join(" · "),icon:"♡"});
    });
    return rows;
  }

  const baseSuggestedBlocks=itinerarySuggestedBlocks;
  itinerarySuggestedBlocks=function(date){
    const meal=mealForDate(date),flow=Array.isArray(meal&&meal.dayFlowSteps)?meal.dayFlowSteps:[],
      flowStarts=flow.map(function(x){return hmMinutes(x.start)}).filter(Number.isFinite),
      firstMealStart=flowStarts.length?Math.min.apply(null,flowStarts):hmMinutes(meal&&meal.startBy),
      serve=hmMinutes(meal&&meal.serveTime),
      earlyDinner=serve!==null&&serve<=17*60+30,
      busyEvening=(state.events||[]).some(function(e){
        const m=hmMinutes(e.startTime),text=[e.title,e.location,e.notes].filter(Boolean).join(" ");
        return e.date===date&&e.status!=="cancelled"&&m!==null&&m>=17*60+30&&
          (String(e.location||"").trim()||/meeting|conference|appointment|drive|drop off|drop kids/i.test(text));
      }),
      p=lifeEnsureSettings(),base=baseSuggestedBlocks(date).filter(function(x){
      if(x.templateKey==="work-morning")return false;
      if(x.templateKey==="after-work")return false;
      if(x.templateKey==="after-school-launch"&&earlyDinner)return false;
      if(x.templateKey==="homework"&&earlyDinner&&busyEvening)return false;
      return true;
    }).map(function(x){
      if(x.templateKey==="wind-down"){
        const night=p.nightRoutine||{};
        return Object.assign({},x,{
          title:"Night routine",
          detail:"Finish the day and get into bed by the planned bedtime",
          subtasks:Array.isArray(night.subtasks)?night.subtasks.slice():["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Get in bed"]
        });
      }
      if(x.templateKey==="chores"){
        const todays=(state.chores||[]).filter(function(c){return c.date===date&&!c.done}),
          subtasks=todays.map(function(c){return (c.child?c.child+": ":"")+String(c.chore||"Chore")}),
          refs=todays.map(function(c){return c.id});
        if(lifeWeekday(date)===1){
          return Object.assign({},x,{title:"Kids chores",start:"19:00",end:"19:40",
            detail:itineraryRoutineDetail(date,"chores","Family evening reset"),subtasks:subtasks,subtaskRefs:refs});
        }
        return Object.assign({},x,{title:"Kids chores",subtasks:subtasks,subtaskRefs:refs});
      }
      return x;
    });
    const out=base.slice(),keys=new Set(out.map(function(x){return x.templateKey})),
      overrides=new Set(itineraryCustomBlocks(date).map(function(x){return x.templateKey}).filter(Boolean)),
      dayStart=itineraryDayStart(date),dayEnd=itineraryDayEnd(date),offDay=!lifeIsWorkday(date)&&!lifeActualWork(date);
    let index=0;
    function add(row){
      if(keys.has(row.templateKey)||overrides.has(row.templateKey))return;
      const finalRow=lifeRoutineApply(date,row,index++);
      if(finalRow){out.push(finalRow);keys.add(finalRow.templateKey)}
    }

    const workRow=workForDate(date),workStart=hmMinutes(workRow&&(workRow.start||workRow.scheduled)),
      morningRoutine=p.workMorningRoutine&&Array.isArray(p.workMorningRoutine.steps)?p.workMorningRoutine.steps:[];
    if(!offDay&&workStart!==null&&morningRoutine.length){
      morningRoutine.forEach(function(step){
        const start=Math.max(0,workStart+Number(step.from||0)),end=Math.max(start+5,workStart+Number(step.to||0));
        add({templateKey:"work-"+String(step.key||"prep"),start:minutesHm(start),end:minutesHm(end),
          title:String(step.title||"Work prep"),detail:String(step.detail||""),subtasks:Array.isArray(step.subtasks)?step.subtasks.slice():[],icon:String(step.icon||"")});
      });
    }

    const care=p.personalCareRoutine||{},actualWorkEnd=hmMinutes(workRow&&workRow.end),
      estimatedWorkEnd=actualWorkEnd!==null?actualWorkEnd:(workStart!==null?workStart+lifeEstimatedWorkMinutes(date):null);
    if(care.enabled!==false){
      if(!offDay&&estimatedWorkEnd!==null){
        const duration=Math.max(30,Number(care.workdayDurationMinutes||50)),
          start=Math.max(dayStart,estimatedWorkEnd),end=Math.min(dayEnd,start+duration);
        if(end-start>=25)add({templateKey:"personal-care",start:minutesHm(start),end:minutesHm(end),
          title:"Home from UPS · shower + self-care",
          detail:"Go home after work and shower before the rest of the day whenever possible",
          subtasks:Array.isArray(care.subtasks)?care.subtasks.slice():["Drive home","Shower","Wash body","Wash face","Lotion","Deodorant","Put on clean clothes"],icon:"♡"});
      }else if(offDay){
        const start=Math.max(dayStart,hmMinutes(care.offdayWindowStart)||14*60),
          duration=Math.max(20,Number(care.offdayDurationMinutes||30)),end=Math.min(dayEnd,start+duration);
        if(end-start>=20)add({templateKey:"personal-care",start:minutesHm(start),end:minutesHm(end),
          title:"Shower + self-care",detail:"Flexible personal-care reset on a non-work day",
          subtasks:(Array.isArray(care.subtasks)?care.subtasks.slice(1):["Shower","Wash body","Wash face","Lotion","Deodorant","Put on clean clothes"]),icon:"♡"});
      }
    }

    if(offDay){
      add({templateKey:"morning-start",start:minutesHm(dayStart),end:minutesHm(Math.min(dayEnd,dayStart+30)),
        title:"Morning start + basics",detail:"Bathroom · teeth · water · get dressed · quick look at Day Flow",icon:"☀"});
      const focusStart=Math.max(dayStart,12*60);
      if(focusStart+45<=Math.min(dayEnd,14*60))add({templateKey:"home-reset",start:minutesHm(focusStart),end:minutesHm(focusStart+45),
        title:"Home focus · deep clean / declutter",detail:"Use this for a bigger home project: deep cleaning, decluttering, organizing, sorting, or another household project. Do not use this block for the kids’ regular laundry, dishes, counters, or spot-mop chores.",icon:"⌂"});
      const mid=Math.max(focusStart+45,12*60+45);
      if(mid+30<=Math.min(dayEnd,14*60))add({templateKey:"midday-reset",start:minutesHm(mid),end:minutesHm(mid+30),
        title:"Lunch + midday reset",detail:"Eat · drink water · check the next appointment/task before moving on",icon:"◷"});
    }

    lifeKidShowerRows(date).forEach(function(row){add(row)});

    const gym=p.gymRoutine||{},gymAlreadyScheduled=(state.events||[]).some(function(e){
      return e.date===date&&e.status!=="cancelled"&&/vasa\s*gym.*yesi|gym.*yesi/i.test(String(e.title||""));
    });
    if(gym.enabled&&!gymAlreadyScheduled&&Array.isArray(gym.preferredWeekdays)&&gym.preferredWeekdays.includes(lifeWeekday(date))){
      const gStart=hmMinutes(gym.windowStart)||690,gEnd=hmMinutes(gym.windowEnd)||840,dur=Math.max(30,Number(gym.durationMinutes||60));
      if(gStart+dur<=gEnd){
        add({templateKey:"gym-vasa-yesi",start:minutesHm(gStart),end:minutesHm(gStart+dur),
          title:"VASA Gym with Yesi",detail:"Weekly gym goal · at least 2 times this week · keep this between 11:30 AM and 2:00 PM",icon:"✦"});
      }
    }

    if(!keys.has("tomorrow-prep")&&!overrides.has("tomorrow-prep")){
      const tomorrow=shiftDateString(date,1),tomorrowWork=lifeIsWorkday(tomorrow),
        prepEnd=Math.max(dayStart,dayEnd-30),prepStart=Math.max(dayStart,prepEnd-30),
        tm=mealForDate(tomorrow),mealPrep=typeof tomorrowMealPrepOutstanding==="function"?tomorrowMealPrepOutstanding(tm):[],
        details=[];
      if(mealPrep&&mealPrep.length)details.push(mealPrep.join(" · "));
      if(tomorrowWork)details.push("Stage work clothes · keys · drink/snack · anything that must leave with you");
      else details.push("Check tomorrow’s calendar · stage clothes/bags/keys");
      details.push("5-minute kitchen / house close");
      if(prepEnd-prepStart>=15)add({templateKey:"tomorrow-prep",start:minutesHm(prepStart),end:minutesHm(prepEnd),
        title:"Set tomorrow up",detail:details.join(" · "),icon:"✦"});
    }

    return out.sort(function(a,b){return String(a.start).localeCompare(String(b.start))});
  };

  function lifeIsHouseholdFocusTask(task){
    const text=(String(task&&task.title||"")+" "+String(task&&task.notes||"")+" "+String(task&&task.category||"")).toLowerCase(),
      regularKidChore=/\b(laundry|dishes|counters?|spot[ -]?mop|floor spots?)\b/.test(text);
    if(regularKidChore)return false;
    return /deep clean|declutter|organize|organise|sorting|sort |closet|pantry|fridge|refrigerator|basement|garage|storage|household project|home project|clean (the )?(bathroom|bedroom|room|kitchen)/.test(text)||
      (/\b(home|household)\b/.test(text)&&/clean|organ|declutter|sort/.test(text));
  }

  /* Fill open time with named tasks. Larger home projects wait for the noon–2 home-focus window. */
  itineraryRestBlocks=function(items,date){
    const gaps=itineraryOpenGaps(items,date),out=[],
      placed=new Set((items||[]).filter(function(x){return x.source==="task"}).map(function(x){return x.sourceId})),
      seenTitles=new Set(),usedTasks=new Set(),
      priorities=(typeof itineraryTaskCandidates==="function"?itineraryTaskCandidates(date):(state.tasks||[]))
        .filter(function(t){
          if(!t||t.done||placed.has(t.id))return false;
          const title=String(t.title||"").trim(),key=title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
          if(!title||/^(ups shift|ups scheduled start|everyone reading)$/.test(key))return false;
          if(/tire/.test(key)&&(state.events||[]).some(function(e){return e.status!=="cancelled"&&/tire/i.test(String(e.title||""));}))return false;
          if(seenTitles.has(key))return false;
          seenTitles.add(key);
          return true;
        })
        .sort(function(a,b){return Number(a.order||100)-Number(b.order||100)||String(a.date||"").localeCompare(String(b.date||""))}),
      homeStart=12*60,homeEnd=14*60;

    function nextTask(cursor){
      const inHomeWindow=cursor>=homeStart&&cursor<homeEnd;
      let task=priorities.find(function(t){return !usedTasks.has(t.id)&&lifeIsHouseholdFocusTask(t)===inHomeWindow});
      if(!task&&inHomeWindow)task=priorities.find(function(t){return !usedTasks.has(t.id)&&!lifeIsHouseholdFocusTask(t)});
      return task||null;
    }

    gaps.forEach(function(g){
      let cursor=g.start;
      while(g.end-cursor>=15){
        const task=nextTask(cursor);
        if(task){
          const isHome=lifeIsHouseholdFocusTask(task);
          if(isHome&&!(cursor>=homeStart&&cursor<homeEnd)){
            const boundary=cursor<homeStart&&g.end>homeStart?homeStart:null;
            if(boundary!==null&&boundary-cursor>=15){
              const chunk=Math.min(60,boundary-cursor);
              out.push({id:"gap-open:"+date+":"+cursor,start:minutesHm(cursor),end:minutesHm(cursor+chunk),title:"Open time",
                detail:"Nothing specific is assigned here yet.",fixed:false,kind:"gap",icon:"",source:"gap",durationMinutes:chunk});
              cursor+=chunk;continue;
            }
          }else{
            let available=g.end-cursor;
            if(isHome)available=Math.min(available,homeEnd-cursor);
            const chunk=Math.min(Math.max(15,Math.min(60,itineraryTaskMinutes(task))),available);
            if(chunk>=15){
              const end=cursor+chunk;usedTasks.add(task.id);
              out.push({id:"gap-task:"+date+":"+cursor,start:minutesHm(cursor),end:minutesHm(end),title:task.title,
                detail:[task.child,task.notes,isHome?"Noon–2 home focus":""].filter(Boolean).join(" · "),fixed:false,kind:"task",icon:"✓",source:"task",
                sourceId:task.id,durationMinutes:chunk,done:false,autoPlanned:true});
              cursor=end;continue;
            }
          }
        }

        let chunk=Math.min(60,g.end-cursor);
        if(cursor<homeStart&&cursor+chunk>homeStart)chunk=homeStart-cursor;
        if(cursor<homeEnd&&cursor>=homeStart&&cursor+chunk>homeEnd)chunk=homeEnd-cursor;
        if(chunk<15)break;
        out.push({id:"gap-open:"+date+":"+cursor,start:minutesHm(cursor),end:minutesHm(cursor+chunk),title:"Open time",
          detail:"Nothing specific is assigned here yet.",fixed:false,kind:"gap",icon:"",source:"gap",durationMinutes:chunk});
        cursor+=chunk;
      }
    });
    return out;
  };

  const baseFlowCard=itineraryFlowCard;
  itineraryFlowCard=function(date){
    let html=baseFlowCard(date);
    html=html.replace("These routines could not fit around today’s fixed commitments.",
      "These are waiting for a slot after fixed events and sleep are protected. Tap one to move it, shorten it, or turn it off for this day.");
    return html;
  };

  function lifeDoodle(kind){
    const common='<svg viewBox="0 0 32 32" aria-hidden="true">';
    const end='</svg>';
    const art={
      flow:'<circle cx="16" cy="16" r="10"></circle><path d="M16 10v6l4 3"></path><path d="M7 5l2 2M25 5l-2 2"></path>',
      home:'<path d="M5 15L16 6l11 9v11H5z"></path><path d="M12 26v-7h8v7"></path><path d="M9 12V7h4v2"></path>',
      money:'<circle cx="16" cy="16" r="11"></circle><path d="M20 11c-1-1-2.2-1.5-4-1.5-2.5 0-4 1.2-4 3 0 4.5 8 1.8 8 6 0 2-1.8 3.5-4.5 3.5-2 0-3.5-.6-4.5-1.8M16 7v18"></path>',
      food:'<circle cx="18" cy="17" r="8"></circle><path d="M4 7v8M7 7v8M4 11h3M5.5 15v10M27 7c-2 3-2 6 0 9v9"></path>',
      people:'<circle cx="11" cy="12" r="4"></circle><circle cx="22" cy="13" r="3"></circle><path d="M4 26c1-6 4-9 8-9s7 3 8 9M18 20c2-2 6-2 9 3"></path>',
      care:'<path d="M16 27C7 22 5 16 8 11c3-4 7-2 8 1 1-3 5-5 8-1 4 5 1 11-8 16z"></path><path d="M16 12v10M12 17h8"></path>',
      now:'<circle cx="16" cy="16" r="10"></circle><path d="M16 9v7l5 2"></path><circle cx="16" cy="16" r="1"></circle>'
    };
    return common+(art[kind]||art.now)+end;
  }

  function lifeClampScore(n){return Math.max(0,Math.min(100,Math.round(Number(n)||0)))}

  function lifeDomainData(){
    const today=ymd(),now=new Date(),nowM=now.getHours()*60+now.getMinutes(),
      itinerary=itineraryDayItems(today).filter(function(x){return x.kind!=="gap"}),
      completedFlow=itinerary.filter(function(x){
        if(x.done)return true;
        const e=hmMinutes(x.end);
        return e!==null&&e<=nowM;
      }).length,
      flowScore=itinerary.length?lifeClampScore(completedFlow/itinerary.length*100):0;

    const chores=(state.chores||[]).filter(function(x){return x.date===today}),
      homeTasks=(state.tasks||[]).filter(function(t){
        return t.date===today&&/home|house|clean|declutter|laundry|dishes|litter|organ/i.test(String(t.category||"")+" "+String(t.title||""));
      }),
      homeRows=chores.concat(homeTasks),homeDone=homeRows.filter(function(x){return !!x.done}).length,
      homeScore=homeRows.length?lifeClampScore(homeDone/homeRows.length*100):((state.houseRooms||[]).length?55:20);

    const unpaid=(state.bills||[]).filter(function(b){return b.status!=="paid"}),
      overdue=unpaid.filter(function(b){return b.due&&b.due<today}).length,
      moneyScore=lifeClampScore(overdue?100-overdue*25:100);

    const foodLogs=(state.foodLogs||[]).filter(function(x){return x.date===today}),
      dinner=mealForDate(today),foodScore=lifeClampScore((foodLogs.length?50:0)+(dinner&&dinner.dish?50:0));

    const peopleTasks=(state.tasks||[]).filter(function(t){
        return t.date===today&&(t.child||/school|family|kid|birthday|pickup|pick up/i.test(String(t.category||"")+" "+String(t.title||"")));
      }),
      peopleDone=peopleTasks.filter(function(x){return !!x.done}).length,
      peopleScore=peopleTasks.length?lifeClampScore(peopleDone/peopleTasks.length*100):100;

    let careScore=0,careDetail="open Care";
    if(typeof selfCareTodayStats==="function"){
      const s=selfCareTodayStats();
      careScore=s.total?lifeClampScore(s.done/s.total*100):0;
      careDetail=s.done+"/"+s.total+" care items";
    }

    return [
      {key:"flow",label:"Flow",view:"itinerary",score:flowScore,detail:completedFlow+"/"+itinerary.length+" passed / done",color:"#a9e6ed"},
      {key:"home",label:"Home",view:"inventory",score:homeScore,detail:homeRows.length?homeDone+"/"+homeRows.length+" resets done":"map + organize",color:"#bdeccf"},
      {key:"money",label:"Money",view:"more",score:moneyScore,detail:overdue?overdue+" overdue entered bill"+(overdue===1?"":"s"):"no overdue entered bills",color:"#ffe69b"},
      {key:"food",label:"Food",view:"home",score:foodScore,detail:(foodLogs.length?foodLogs.length+" log"+(foodLogs.length===1?"":"s"):"nothing logged")+" · "+(dinner&&dinner.dish?"dinner planned":"dinner open"),color:"#ffc98e"},
      {key:"people",label:"People",view:"family",score:peopleScore,detail:peopleTasks.length?peopleDone+"/"+peopleTasks.length+" today items":"no open today items",color:"#ff9b7b"},
      {key:"care",label:"Care",view:"log",score:careScore,detail:careDetail,color:"#d8c1ff"}
    ];
  }

  function lifePolar(cx,cy,r,angle){
    const a=(angle-90)*Math.PI/180;
    return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};
  }

  function lifeWedgePath(cx,cy,outer,inner,start,end){
    const p1=lifePolar(cx,cy,outer,start),p2=lifePolar(cx,cy,outer,end),
      p3=lifePolar(cx,cy,inner,end),p4=lifePolar(cx,cy,inner,start),
      large=end-start>180?1:0;
    return "M "+p1.x.toFixed(2)+" "+p1.y.toFixed(2)+" A "+outer+" "+outer+" 0 "+large+" 1 "+p2.x.toFixed(2)+" "+p2.y.toFixed(2)+
      " L "+p3.x.toFixed(2)+" "+p3.y.toFixed(2)+" A "+inner+" "+inner+" 0 "+large+" 0 "+p4.x.toFixed(2)+" "+p4.y.toFixed(2)+" Z";
  }

  function lifeSystemDashboardCard(){
    const domains=lifeDomainData(),items=itineraryDayItems(ymd()),status=itineraryStatusForDate(ymd(),items),
      current=status?status.title.replace(/^Right now · /,"").replace(/^Next · /,"Next · "):"Open day",
      detail=status?status.detail:"Tap Day Flow to build today.";
    const wedges=domains.map(function(d,i){
      const start=i*60+2,end=(i+1)*60-2,opacity=(.26+.0064*d.score).toFixed(2),
        labelAngle=i*60+30,pos=lifePolar(160,160,118,labelAngle);
      return '<path class="life-wedge" tabindex="0" role="button" aria-label="'+esc(d.label+" "+d.score+" percent")+
        '" onclick="setView(\''+d.view+'\')" d="'+lifeWedgePath(160,160,145,76,start,end)+'" fill="'+d.color+'" opacity="'+opacity+'"></path>'+
        '<text class="life-wheel-label" x="'+pos.x.toFixed(1)+'" y="'+pos.y.toFixed(1)+'">'+esc(d.label)+'</text>';
    }).join("");
    const orbs=domains.map(function(d){
      return '<button class="life-domain" style="--life-domain-color:'+d.color+'88" onclick="setView(\''+d.view+'\')">'+
        '<span class="life-doodle">'+lifeDoodle(d.key)+'</span><b>'+esc(d.label)+'</b><strong>'+d.score+'%</strong><small>'+esc(d.detail)+'</small></button>';
    }).join("");
    return '<div class="card life-system-card">'+
      '<div class="life-system-head"><div><div class="eyebrow">Your life today</div><h2>One place to see what needs you</h2></div><div class="life-system-note">The fill shows today’s progress / readiness from what Daily Life knows — not a grade.</div></div>'+
      '<div class="life-wheel-wrap"><svg class="life-wheel" viewBox="0 0 320 320" aria-label="Whole life dashboard">'+wedges+
      '<circle class="life-wedge-outline" cx="160" cy="160" r="146"></circle><circle class="life-wedge-outline" cx="160" cy="160" r="75"></circle></svg>'+
      '<div class="life-wheel-center"><small>Right now</small><b>'+esc(current)+'</b><span>'+esc(detail)+'</span></div></div>'+
      '<div class="life-domain-grid">'+orbs+'</div>'+
      '<div class="life-now-strip"><span class="life-doodle">'+lifeDoodle("now")+'</span><span><b>What should I do now?</b><small>'+esc(current+(detail?" · "+detail:""))+'</small></span></div>'+
      '</div>';
  }

  const baseTodayView=todayView;
  todayView=function(){
    return lifeSystemDashboardCard()+baseTodayView.apply(this,arguments);
  };

  /* Deeper one-card tarot meaning, while keeping the compact Today preview short. */
  const tarotDeep={
    "The Fool":["The Fool is the moment before a path is fully mapped. It is less about being reckless than being willing to begin without demanding certainty first. Curiosity, trust, experimentation, and a little humility are the useful parts of this card.","Today, look for one place where you can take a small reversible step instead of waiting until you know everything. Keep enough awareness to notice risk, but do not make perfect certainty the price of moving."],
    "The Magician":["The Magician points to agency: skills, tools, attention, communication, and resources that are already available to you. The question is whether those pieces are being gathered around one clear intention or scattered across too many directions.","Choose one outcome and name the tools you already have for it. Use what is on hand before assuming you need another purchase, plan, or burst of motivation."],
    "The High Priestess":["The High Priestess favors observation before reaction. It can represent information that is still forming, private knowledge, intuition, or the value of leaving a question open long enough to hear what your first impulse was drowning out.","Give one unresolved issue a little quiet. Separate what you know from what you fear or assume, and notice what remains when the noise is reduced."],
    "The Empress":["The Empress is about growth through care: bodies, homes, creativity, food, comfort, relationships, and the conditions that let something living thrive. It asks for tending rather than forcing.","Improve the conditions around one thing you want to grow. Feed it, rest it, organize its environment, give it attention, or make it easier to return to tomorrow."],
    "The Emperor":["The Emperor is structure used well: boundaries, dependable systems, leadership, and decisions that reduce chaos. Its healthiest form creates enough order that you do not have to renegotiate everything every day.","Choose one rule, boundary, or system that would make today simpler. Make it concrete enough that future-you does not have to decide it again."],
    "The Hierophant":["The Hierophant asks what you have inherited from teachers, families, institutions, or traditions. Some structures are useful containers; others deserve questioning. Wisdom can include both learning a system and deciding consciously what to keep.","Notice one rule you follow automatically. Ask whether it still serves your values and circumstances, then either use it deliberately or revise it."],
    "The Lovers":["The Lovers is not only romance. It is alignment, relationship, choice, and the point where values become visible through what you commit to. Connection matters, but so does choosing without abandoning yourself.","Look at one choice through the lens of your values and your relationships. What choice lets you be connected and still honest about what matters to you?"],
    "The Chariot":["The Chariot is directed movement. Competing pulls do not have to disappear before you move; they need a direction and enough self-command to stop them from steering independently.","Pick the destination for today, then let smaller decisions serve it. Momentum is more useful than trying to feel perfectly unified first."],
    "Strength":["Strength is steady courage rather than domination. It is the capacity to stay present with intensity—your own or someone else’s—without letting it dictate every action.","Use gentleness and firmness together. Choose one difficult thing you can approach without either attacking it or avoiding it."],
    "The Hermit":["The Hermit creates enough distance to think clearly. Solitude here is not disappearance; it is intentional space for reflection, learning, and deciding what you actually believe.","Take a short period away from input. Write, walk, read, or sit quietly long enough to hear your own conclusion before collecting more opinions."],
    "Wheel of Fortune":["The Wheel highlights change, cycles, timing, and the fact that not every condition is under your control. Agency still matters, but it works best when it responds to reality instead of pretending the environment is fixed.","Identify what has changed recently. Adjust one plan to the conditions you actually have today rather than the ones you expected to have."],
    "Justice":["Justice asks for clarity about cause and effect, fairness, responsibility, and evidence. It favors a clean accounting of what happened over a story designed only to make one side feel better.","Look at one situation using facts, agreements, and consequences. What would a fair next action look like if you included your own needs too?"],
    "The Hanged Man":["The Hanged Man is a deliberate pause that changes perspective. It can be useful when pushing harder keeps reproducing the same problem and a different angle matters more than more effort.","Do not force one stuck problem for a moment. Ask what becomes visible if you reverse an assumption, wait for information, or stop trying to control the timing."],
    "Death":["Death represents transition, endings, and the space made when something is truly finished. It does not need to mean literal loss; often it asks whether you are spending energy maintaining a version of life that has already changed.","Name one thing that is over, outdated, or no longer worth organizing your life around. Give yourself permission to build for what is true now."],
    "Temperance":["Temperance is integration: combining needs, resources, habits, or perspectives into a sustainable proportion. It favors adjustments you can live with over dramatic swings.","Look for a middle process rather than an all-or-nothing solution. What small change would make the system easier to repeat tomorrow?"],
    "The Devil":["The Devil invites a clear look at attachment, compulsion, avoidance, shame, or bargains that feel impossible to leave. The useful question is where you have more choice than the pattern wants you to believe.","Notice one loop that keeps costing you. Reduce one trigger, add one boundary, or make the easier option a little more supportive."],
    "The Tower":["The Tower is disruption that exposes what was unstable, hidden, or no longer workable. It can feel abrupt, but its practical value is honesty: after the false structure cracks, you can rebuild from better information.","Do not rush to recreate a system just because it was familiar. Stabilize what matters most, then rebuild one piece around what you now know."],
    "The Star":["The Star brings renewal, orientation, and hope that is quiet enough to coexist with reality. It is about finding a direction worth tending after depletion or disruption.","Choose one small act that restores your sense of possibility: care for your body, make something, reach out, or make tomorrow slightly easier."],
    "The Moon":["The Moon deals with uncertainty, emotion, imagination, and incomplete information. Feelings are real data about your experience, but they are not always complete evidence about the outside world.","When something feels confusing, separate facts, interpretations, fears, and possibilities. You do not have to solve what is still unclear tonight."],
    "The Sun":["The Sun emphasizes clarity, vitality, visibility, play, and the relief of things becoming simpler. It can invite you to enjoy what is working instead of immediately turning every success into another task.","Notice what is genuinely good or clear today and use it. Share credit, enjoy progress, and let an easy answer be easy when it really is."],
    "Judgement":["Judgement is review with a purpose: seeing a pattern clearly enough to answer it differently. It is less about condemning the past than deciding what you will do with what you have learned.","Look back only far enough to extract the lesson. Then make one present-day choice that proves you heard it."],
    "The World":["The World marks integration, completion, and a cycle becoming whole enough to close. Finishing creates room; you do not have to keep every project mentally open forever.","Complete, archive, celebrate, or deliberately release one thing. Let finished things become history instead of permanent background pressure."]
  };

  const baseTarotMarkup=tarotCardMarkup;
  tarotCardMarkup=function(date,compact){
    const html=baseTarotMarkup(date,compact);
    if(compact||!tarotRevealed(date||ymd())||html.indexOf("tarot-deeper")>=0)return html;
    const t=tarotForDate(date||ymd()),deep=tarotDeep[t.name]||[
      "Use this card as a symbolic lens rather than an answer. Look for the pattern it names in the choices and circumstances you actually have today.",
      "Take one small action that fits your real life, then notice what changes."
    ];
    const reversed=t.reversed?" Reversed, the same theme may be blocked, overdone, delayed, or asking for a more internal look.":"";
    return html+'<div class="tarot-deeper"><span class="tarot-doodle">✧</span><h3>A fuller look at '+esc(t.name)+'</h3><p>'+esc(deep[0]+reversed)+'</p><h3>How to use it today</h3><p>'+esc(deep[1])+'</p><div class="muted small">Reflection lens, not prediction. Keep what is useful and leave what is not.</div></div>';
  };

  /* Make sure all later renders use the confirmed Tue-Sat schedule. */
  const baseRender=render;
  render=function(){
    lifeEnsureSettings();
    return baseRender.apply(this,arguments);
  };

  lifeEnsureSettings();
  if(typeof render==="function")render();
})();