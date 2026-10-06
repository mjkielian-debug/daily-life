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
    if(Number(p.sleepPlanningVersion||0)<1){
      p.sleepTargetHours=8;
      p.offDayBedtimeGuide="22:00";
      p.napSupport={
        enabled:true,
        durationMinutes:25,
        windowStart:"10:30",
        windowEnd:"16:30",
        suggestBelowHours:7.25,
        earlyWakeBefore:"03:30",
        heavyWeekHours:50
      };
      p.busySeasonSleepNote="UPS hours are expected to rise sharply toward late November, potentially around 70 hours/week. Protect sleep first and use recovery naps when the schedule makes a full night unrealistic.";
      p.sleepPlanningVersion=1;
    }
    if(!p.personalCareRoutine||Number(p.personalCareRoutine.version||0)<3){
      p.personalCareRoutine=Object.assign({},p.personalCareRoutine||{},{
        version:3,
        enabled:true,
        workdayDurationMinutes:Number(p.personalCareRoutine&&p.personalCareRoutine.workdayDurationMinutes||50),
        offdayAutoSchedule:false,
        showerMinutes:25,
        postShowerMinutes:15,
        workdayNote:"On workdays, shower right after getting home from UPS whenever possible.",
        offdayNote:"Do not automatically schedule a shower on non-work days; add one only when it is actually needed.",
        subtasks:["Drive home","Shower","Dry off","Lotion","Face moisturizer","Deodorant","Hair","Put on clean clothes"]
      });
    }
    if(!p.schoolPickupRoutine||Number(p.schoolPickupRoutine.version||0)<2){
      p.schoolPickupRoutine=Object.assign({
        enabled:true,weekdays:[1,2,3,4,5],
        leaveHome:"14:40",park:"14:45",pickup:"14:52",end:"15:00"
      },p.schoolPickupRoutine||{},{
        version:2,
        leoPickupAfterYounger:true,
        leoPickupEnd:(p.schoolPickupRoutine&&p.schoolPickupRoutine.leoPickupEnd)||"15:15",
        skipLeoForAfterSchoolActivity:true
      });
    }
    if(!p.schoolMorningTransport||Number(p.schoolMorningTransport.version||0)<3){
      p.schoolMorningTransport={
        version:3,enabled:true,weekdays:[1,2,3,4,5],
        youngerBus:"07:15",youngerBusEnd:"07:20",
        leoLeave:"07:20",leoDropoffEnd:"07:35",
        leoTimingApproximate:true,
        workdayCaregiver:"Tanner",
        workdayCoverageStart:"06:15",
        workdayCoverageEnd:"08:30",
        note:"Kids eat breakfast at school. On UPS workdays Tanner handles the kids at home from 6:15–8:30 AM, including morning school prep, the bus, and Leo's school departure. On Monday/off days, Michelle handles the normal morning flow."
      };
    }
    if(!p.dollyHairRoutine||Number(p.dollyHairRoutine.version||0)<2){
      p.dollyHairRoutine={
        version:2,enabled:true,durationMinutes:15,
        schoolMorningStart:"06:40",
        nonSchoolMorningStart:"09:00",
        note:"School mornings reserve 6:40–6:55 for Dolly's hair; the hair itself usually takes about 5–10 minutes."
      };
    }
    if(!p.lunchPlanByDate||typeof p.lunchPlanByDate!=="object")p.lunchPlanByDate={};
    if(!p.lunchPlanByDate["2026-10-05"])p.lunchPlanByDate["2026-10-05"]="Leftover roast";
    if(!p.nightRoutine||Number(p.nightRoutine.version||0)<4){
      p.nightRoutine=Object.assign({},p.nightRoutine||{},{
        version:4,
        enabled:true,
        durationMinutes:30,
        electronicsSweepTime:"19:30",
        kidsBedtime:"20:30",
        currentFamilySettlePlan:true,
        familySettleNote:"At 7:30 PM collect all kids' electronics and all four kids brush teeth. Dolly and Ambrose then come upstairs to Mom's room. Leo and Tree also wash faces and put on pajamas from 7:30–7:40, then read from 7:40–8:00. Kids' official bedtime is 8:30 PM.",
        subtasks:["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Electronics sweep at 7:30","Lie down with Dolly + Ambrose · settle"]
      });
    }
    if(!p.olderKidsReading||Number(p.olderKidsReading.version||0)<2){
      p.olderKidsReading={
        version:2,enabled:true,start:"19:40",end:"20:00",
        prepStart:"19:30",prepEnd:"19:40",
        children:["Leo","Demitri"],
        note:"At 7:30 PM electronics are collected and all four kids brush teeth. Dolly and Ambrose go upstairs to Mom's room. Leo and Tree wash faces, put on pajamas, then read from 7:40–8:00 before the 8:30 kids bedtime."
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
    if(!p.kidShowerRoutine||Number(p.kidShowerRoutine.version||0)<3){
      p.kidShowerRoutine={
        version:3,
        enabled:true,
        durationMinutes:20,
        maxEveningShowers:2,
        leoMorning:{enabled:true,start:"06:45",startByWeekday:{"1":"06:30"},weekdays:[1,2,3,4,5]},
        noEveningWeekdays:[2],
        weeklyPlan:{
          "0":[{child:"Ambrose",start:"18:30",note:"Sunday evening shower after dinner"}],
          "1":[{child:"Dolly",start:"18:00",note:"Monday shower first while dinner bakes/cools"},{child:"Demitri",start:"18:45",note:"Monday shower after dinner"}],
          "3":[{child:"Demitri",start:"17:00",note:"Before Dolly's dance"},{child:"Dolly",start:"19:00",note:"After dance"}],
          "4":[{child:"Ambrose",start:"18:40",note:"After Food Fort; home around 6:30 PM"}]
        }
      };
    }
    if(!p.hydrationRoutine||Number(p.hydrationRoutine.version||0)<1){
      p.hydrationRoutine={
        version:1,
        enabled:true,
        targetBottles:3,
        firstAfterWakeMinutes:225,
        secondAfterWakeMinutes:465,
        finalBy:"18:00"
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

  function lifeTannerMorningCoverage(date){
    const cfg=lifeEnsureSettings().schoolMorningTransport||{},workday=lifeIsWorkday(date)||lifeActualWork(date);
    return workday?{
      caregiver:String(cfg.workdayCaregiver||"Tanner"),
      start:hmMinutes(cfg.workdayCoverageStart||"06:15"),
      end:hmMinutes(cfg.workdayCoverageEnd||"08:30")
    }:null;
  }

  function lifeResolvedWorkStartMinutes(date){
    if(typeof isConfirmedWorkOffDate==="function"&&isConfirmedWorkOffDate(date))return null;
    const w=workForDate(date),exact=hmMinutes(w&&(w.start||w.scheduled));
    if(exact!==null)return exact;
    if(lifeIsWorkday(date)&&typeof inferredWorkStartForDate==="function"){
      const inferred=inferredWorkStartForDate(date);
      if(inferred&&Number.isFinite(inferred.minutes))return inferred.minutes;
    }
    return null;
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
      const cover=lifeTannerMorningCoverage(date),rowStart=hmMinutes(x.start),
        kidMorning=cover&&x.source==="event"&&rowStart!==null&&rowStart>=cover.start&&rowStart<cover.end&&
          (/demitri|dolly|ambrose|leo|school|musical|rehearsal|club|activity/i.test(String(x.title||"")+" "+String(x.detail||"")));
      if(kidMorning){
        x=Object.assign({},x,{detail:[cover.caregiver+" handles this morning/transport while you are at UPS",x.detail].filter(Boolean).join(" · "),responsible:cover.caregiver});
      }
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
    const morning=lifeEnsureSettings().schoolMorningTransport||{},wd=lifeWeekday(date),
      morningDays=Array.isArray(morning.weekdays)?morning.weekdays.map(Number):[];
    if(morning.enabled!==false&&morningDays.includes(wd)){
      const bus=hmMinutes(morning.youngerBus||"07:15"),busEnd=hmMinutes(morning.youngerBusEnd||"07:20"),
        leo=hmMinutes(morning.leoLeave||"07:20"),leoEnd=hmMinutes(morning.leoDropoffEnd||"07:35");
      const cover=lifeTannerMorningCoverage(date),caregiver=cover?cover.caregiver:"";
      if(bus!==null&&busEnd!==null)rows.push({id:"school-bus:"+date,start:minutesHm(bus),end:minutesHm(busEnd),
        title:(caregiver?caregiver+" · ":"")+"Bus + final leave-the-house check",
        detail:caregiver
          ?caregiver+" handles: Demitri, Dolly + Ambrose get on the bus · check Leo homework, Chromebook + bookbag · grab keys · head out with Leo"
          :"Demitri, Dolly + Ambrose get on the bus · check Leo homework, Chromebook + bookbag · grab your bag, keys + water bottle · head out",
        subtasks:caregiver
          ?[caregiver+": Demitri, Dolly + Ambrose on bus",caregiver+": Check Leo homework",caregiver+": Check Leo Chromebook",caregiver+": Check Leo bookbag",caregiver+": Grab keys",caregiver+": Head out with Leo"]
          :["Demitri, Dolly + Ambrose on bus","Check Leo homework","Check Leo Chromebook","Check Leo bookbag","Grab your bag","Grab keys","Grab water bottle","Head out the door"],
        fixed:true,kind:"event",icon:"🚌",source:"generated"});
      if(leo!==null&&leoEnd!==null)rows.push({id:"leo-school-dropoff:"+date,start:minutesHm(leo),end:minutesHm(leoEnd),
        title:(caregiver?caregiver+" · ":"")+"Take Leo to school",
        detail:(caregiver?caregiver+" handles Leo's school drop-off while you are at UPS. ":"")+"Leave shortly after the younger kids get on the bus"+(morning.leoTimingApproximate?" · timing approximate until a precise departure is set":""),fixed:true,kind:"event",icon:"🚗",source:"generated"});
    }

    const pickup=lifeEnsureSettings().schoolPickupRoutine||{},
      pickupDays=Array.isArray(pickup.weekdays)?pickup.weekdays.map(Number):[];
    if(pickup.enabled!==false&&pickupDays.includes(wd)){
      const already=(state.events||[]).some(function(e){
        return e.date===date&&e.status!=="cancelled"&&/school.*pick.?up|pick.?up.*school/i.test(String(e.title||""));
      });
      if(!already){
        const leave=hmMinutes(pickup.leaveHome||"14:40"),park=hmMinutes(pickup.park||"14:45"),
          pick=hmMinutes(pickup.pickup||"14:52"),end=hmMinutes(pickup.end||"15:00");
        if(leave!==null&&park!==null)rows.push({id:"school-pickup-drive:"+date,start:minutesHm(leave),end:minutesHm(park),
          title:"Drive to school pickup",detail:"Leave home at "+fmtClock(minutesHm(leave)),fixed:true,kind:"event",icon:"🚗",source:"generated"});
        if(park!==null&&pick!==null)rows.push({id:"school-pickup-wait:"+date,start:minutesHm(park),end:minutesHm(pick),
          title:"Park + wait for younger kids",detail:"Park around "+fmtClock(minutesHm(park))+" · Demitri, Dolly + Ambrose out at "+fmtClock(minutesHm(pick)),fixed:true,kind:"event",icon:"◷",source:"generated"});
        if(pick!==null&&end!==null)rows.push({id:"school-pickup:"+date,start:minutesHm(pick),end:minutesHm(end),
          title:"Pick up Demitri, Dolly + Ambrose",detail:"Younger three out at "+fmtClock(minutesHm(pick)),fixed:true,kind:"event",icon:"🎒",source:"generated"});

        const leoAfterSchool=(state.events||[]).some(function(e){
          if(!e||e.date!==date||["cancelled","paused"].includes(String(e.status||"")))return false;
          const text=[e.child,e.title,e.type,e.notes].filter(Boolean).join(" "),
            start=hmMinutes(e.startTime);
          return /\bleo\b/i.test(text)&&start!==null&&start>=14*60+30&&start<=17*60&&
            /herpetology|dungeons|d\s*&\s*d|club|after[- ]?school|rehearsal|practice|activity/i.test(text);
        });
        if(pickup.leoPickupAfterYounger!==false&&!(pickup.skipLeoForAfterSchoolActivity!==false&&leoAfterSchool)){
          const leoStart=hmMinutes(pickup.leoPickupStart||pickup.end||"15:00"),
            leoEnd=hmMinutes(pickup.leoPickupEnd||"15:15");
          if(leoStart!==null&&leoEnd!==null&&leoEnd>leoStart)rows.push({
            id:"leo-school-pickup:"+date,start:minutesHm(leoStart),end:minutesHm(leoEnd),
            title:"Pick up Leo",
            detail:"After picking up Demitri, Dolly + Ambrose · skipped automatically when Leo has an after-school club/activity",
            fixed:true,kind:"event",icon:"🚗",source:"generated"
          });
        }
      }
    }
    if(wd===1){
      const childKey=c=>String(c.child||"").toLowerCase(),choreKey=c=>String(c.chore||"").toLowerCase(),
        byChild=names=>(state.chores||[]).filter(function(c){return c.date===date&&names.includes(childKey(c));}),
        younger=byChild(["dolly","ambrose"]).sort(function(a,b){return childKey(a).localeCompare(childKey(b))||String(a.chore||"").localeCompare(String(b.chore||""));}),
        older=byChild(["leo","demitri"]).filter(function(c){return !/read\s*20\s*min|reading/.test(choreKey(c));}).sort(function(a,b){return childKey(a).localeCompare(childKey(b))||String(a.chore||"").localeCompare(String(b.chore||""));});
      rows.push({id:"monday-younger-chores:"+date,start:"15:05",end:"16:00",title:"Dolly + Ambrose · chores + homework",
        detail:"After school: clean rooms, homework/reading as needed, then their rotating jobs. Keep Leo + Demitri's activity time separate.",
        subtasks:younger.map(function(c){return c.child+": "+c.chore}),subtaskRefs:younger.map(function(c){return c.id}),
        fixed:false,kind:"routine",icon:"✓",source:"suggested",templateKey:"monday-younger-chores",allowParallel:true});
      rows.push({id:"monday-older-chores:"+date,start:"16:30",end:"17:15",title:"Leo + Demitri · chores + homework",
        detail:"After activities: clean rooms, homework, then their rotating jobs. Their 20-minute reading stays at 7:40 PM.",
        subtasks:older.map(function(c){return c.child+": "+c.chore}),subtaskRefs:older.map(function(c){return c.id}),
        fixed:false,kind:"routine",icon:"✓",source:"suggested",templateKey:"monday-older-chores",allowParallel:true});
      rows.push({id:"monday-dolly-shower:"+date,start:"18:00",end:"18:20",title:"Dolly · shower",
        detail:"20 minutes · Dolly showers first while the Runzas bake/cool",subtasks:["Dolly shower"],
        fixed:false,kind:"routine",icon:"♡",source:"suggested",templateKey:"kid-shower-dolly",allowParallel:true});
      rows.push({id:"monday-demitri-shower:"+date,start:"18:45",end:"19:05",title:"Demitri · shower",
        detail:"20 minutes · after dinner",subtasks:["Demitri shower"],
        fixed:false,kind:"routine",icon:"♡",source:"suggested",templateKey:"kid-shower-demitri",allowParallel:true});
    }

    const evening=lifeEnsureSettings().olderKidsReading||{};
    if(evening.enabled!==false){
      const prepStart=hmMinutes(evening.prepStart||"19:30"),prepEnd=hmMinutes(evening.prepEnd||"19:40"),
        readStart=hmMinutes(evening.start||"19:40"),readEnd=hmMinutes(evening.end||"20:00"),
        readingRows=(state.chores||[]).filter(function(c){
          const child=String(c.child||"").toLowerCase(),chore=String(c.chore||"").toLowerCase();
          return c.date===date&&(child==="leo"||child==="demitri")&&/read\s*20\s*min|reading/.test(chore);
        }).sort(function(a,b){return String(a.child||"").localeCompare(String(b.child||""))});
      if(prepStart!==null&&prepEnd!==null){
        rows.push({id:"kids-night-prep:"+date,start:minutesHm(prepStart),end:minutesHm(prepEnd),
          title:"Electronics sweep + all kids brush teeth",
          detail:"Collect all kids' electronics. All four kids brush teeth. Dolly + Ambrose then come upstairs to Mom's room; Leo + Tree wash faces and put on pajamas.",
          subtasks:["Collect all kids' electronics","Leo: brush teeth","Demitri: brush teeth","Dolly: brush teeth","Ambrose: brush teeth","Leo: wash face + pajamas","Demitri: wash face + pajamas","Dolly + Ambrose: come upstairs"],
          fixed:false,kind:"routine",icon:"♡",source:"suggested",templateKey:"kids-night-prep",sleepCompatible:true,allowParallel:true});
      }
      if(readStart!==null&&readEnd!==null){
        const subtasks=readingRows.length?readingRows.map(function(c){return String(c.child||"Kid")+": Read 20 min"}):["Leo: Read 20 min","Demitri: Read 20 min"],
          refs=readingRows.map(function(c){return c.id});
        rows.push({id:"older-kids-reading:"+date,start:minutesHm(readStart),end:minutesHm(readEnd),
          title:"Leo + Tree · reading time",
          detail:"Quiet reading after nighttime prep · kids' official bedtime is 8:30 PM",
          subtasks:subtasks,subtaskRefs:refs,fixed:false,kind:"routine",icon:"📚",source:"suggested",templateKey:"older-kids-reading",sleepCompatible:true,allowParallel:true});
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
      usualLatest=Math.max(preferredStart,preferredEnd),
      tomorrowWork=lifeIsWorkday(tomorrow)||lifeActualWork(tomorrow),
      offDayGuide=hmMinutes(p.offDayBedtimeGuide||"22:00")===null?1320:hmMinutes(p.offDayBedtimeGuide||"22:00");
    let bedtime;
    if(tomorrowWork){
      bedtime=next&&requiredBedtime!==null?requiredBedtime:usualLatest;
    }else{
      bedtime=next&&requiredBedtime!==null?Math.min(offDayGuide,requiredBedtime):offDayGuide;
    }
    // dayEnd is the end of scheduled tasks, not a forced bedtime. On a night
    // before a non-work morning, allow the learned/off-day bedtime guide to run later.
    if(tomorrowWork)bedtime=Math.min(bedtime,configured);
    bedtime=Math.max(840,Math.min(1439,Math.round(bedtime)));
    const wake=next?next.wake:null,
      protectedHours=wake===null?target:Math.max(0,(wake+1440-bedtime)/60);
    return {date:date,tomorrow:tomorrow,targetHours:target,morningLeadMinutes:lead,preferredStart:preferredStart,preferredEnd:preferredEnd,
      bedtimeMinutes:bedtime,bedtime:minutesHm(bedtime),wakeMinutes:wake,wake:wake===null?"":minutesHm(wake),
      reason:next?next.reason:"",reasonKind:next?next.kind:"",estimated:!!(next&&next.estimated),protectedHours:protectedHours};
  };

  /* Add a usable off-day rhythm and make tomorrow-prep an everyday closeout. */
  if(typeof ITINERARY_ROUTINES!=="undefined"){
    [["morning-start","Bathroom + teeth + water + get dressed"],["monday-kids-ready","Monday · kids up + ready"],["monday-water-school","Monday · water + school setup"],["monday-self-ready","Monday · get yourself ready"],["monday-stretch","Monday · stretch"],["home-reset","Home reset / declutter"],["midday-reset","Lunch + midday reset"],["personal-care","Shower + self-care"],["water-1","Water · bottle 1 of 3"],["water-2","Water · bottle 2 of 3"],["water-3","Water · bottle 3 of 3"],["kid-shower-leo","Leo morning shower"],["kid-shower-demitri","Demitri shower"],["kid-shower-dolly","Dolly shower"],["kid-shower-ambrose","Ambrose shower"],["dolly-hair","Dolly hair"],["kids-night-prep","Kids nighttime prep"],["older-kids-reading","Leo + Tree reading"],["recovery-nap","Recovery nap"]].forEach(function(row){
      if(!ITINERARY_ROUTINES.some(function(x){return x[0]===row[0]}))ITINERARY_ROUTINES.push(row);
    });
  }

  const baseRoutineWindow=itineraryRoutineWindow;
  itineraryRoutineWindow=function(x,date){
    const p=lifeEnsureSettings(),dayStart=itineraryDayStart(date),dayEnd=itineraryDayEnd(date);
    if(/^work-(dress|hygiene|dayflow|stretch|gather|commute)$/.test(String(x.templateKey||""))){
      const resolved=lifeResolvedWorkStartMinutes(date);
      return {start:dayStart,end:Math.min(dayEnd,resolved!==null?resolved:dayEnd)};
    }
    if(x.templateKey==="gym-vasa-yesi")return {start:11*60+30,end:14*60};
    if(/^water-[123]$/.test(String(x.templateKey||""))){
      const desired=hmMinutes(x.start)||dayStart;
      return {start:Math.max(dayStart,desired-45),end:Math.min(dayEnd,desired+60)};
    }
    if(/^kid-shower-/.test(String(x.templateKey||""))){
      const desired=hmMinutes(x.start),end=hmMinutes(x.end);
      if(desired!==null)return {start:desired,end:end!==null&&end>desired?end:desired+20};
    }
    if(x.templateKey==="chores")return {start:15*60,end:18*60+30};
    if(x.templateKey==="dolly-hair"){
      const cfg=p.dollyHairRoutine||{},schoolDay=[1,2,3,4,5].includes(lifeWeekday(date)),
        desired=hmMinutes(schoolDay?(cfg.schoolMorningStart||"07:00"):(cfg.nonSchoolMorningStart||"09:00"));
      return {start:desired===null?7*60:desired,end:(desired===null?7*60:desired)+15};
    }
    if(x.templateKey==="kids-night-prep"){
      const cfg=p.olderKidsReading||{},start=hmMinutes(cfg.prepStart||"19:30"),end=hmMinutes(cfg.prepEnd||"19:40");
      return {start:start===null?19*60+30:start,end:end===null?19*60+40:end};
    }
    if(x.templateKey==="older-kids-reading"){
      const cfg=p.olderKidsReading||{},start=hmMinutes(cfg.start||"19:40"),end=hmMinutes(cfg.end||"20:00");
      return {start:start===null?19*60+40:start,end:end===null?20*60:end};
    }
    if(x.templateKey==="recovery-nap"){
      const cfg=p.napSupport||{},start=hmMinutes(cfg.windowStart||"10:30"),end=hmMinutes(cfg.windowEnd||"16:30");
      return {start:start===null?10*60+30:start,end:end===null?16*60+30:end};
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
    if(/^monday-(kids-ready|water-school|self-ready|stretch)$/.test(String(x.templateKey||""))){
      const desired=hmMinutes(x.start),end=hmMinutes(x.end);
      if(desired!==null)return {start:desired,end:end!==null&&end>desired?end:desired+15};
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
    const cover=lifeTannerMorningCoverage(date),rowStart=hmMinutes(row.start);
    if(cover&&rowStart!==null&&rowStart>=cover.start&&rowStart<cover.end&&row.templateKey==="kid-shower-leo"){
      row.title=cover.caregiver+" · "+String(row.title||"Leo morning shower");
      row.detail=cover.caregiver+" handles Leo's morning shower while you are at UPS"+(row.detail?" · "+row.detail:"");
      row.subtasks=(Array.isArray(row.subtasks)&&row.subtasks.length?row.subtasks:["Leo shower"]).map(function(x){return cover.caregiver+": "+x});
    }
    if(row.templateKey==="wind-down"){
      const night=lifeEnsureSettings().nightRoutine||{},sweep=night.electronicsSweepTime||"19:30";
      row.title="Teeth + face + pajamas + electronics sweep";
      row.detail="Brush teeth · floss · mouthwash · wash face · pajamas · plug in phone + set alarm · at "+fmtClock(sweep)+" collect all kids’ electronics. Dolly + Ambrose come upstairs after brushing teeth; kids’ official bedtime is "+fmtClock(night.kidsBedtime||"20:30")+".";
      row.subtasks=Array.isArray(night.subtasks)?night.subtasks.slice():["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Electronics sweep at 7:30","Lie down with Dolly + Ambrose · read / settle"];
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
      const weekdayStart=leo.startByWeekday&&leo.startByWeekday[String(wd)],
        start=hmMinutes(weekdayStart||leo.start)||405;
      rows.push({templateKey:"kid-shower-leo",start:minutesHm(start),end:minutesHm(start+duration),
        title:"Leo · morning shower",detail:"Preferred shower time · "+duration+" minutes",subtasks:["Leo shower"],icon:"♡"});
    }
    if(Array.isArray(cfg.noEveningWeekdays)&&cfg.noEveningWeekdays.map(Number).includes(wd))return rows;
    const plan=cfg.weeklyPlan&&Array.isArray(cfg.weeklyPlan[String(wd)])?cfg.weeklyPlan[String(wd)]:[];
    plan.slice(0,Math.max(1,Number(cfg.maxEveningShowers||2))).forEach(function(item){
      const start=hmMinutes(item.start);
      if(start===null||!item.child)return;
      const key=String(item.child).toLowerCase().replace(/[^a-z0-9]+/g,"-");
      rows.push({templateKey:"kid-shower-"+key,start:minutesHm(start),end:minutesHm(start+duration),
        title:String(item.child)+" · shower",detail:[duration+" minutes",item.note].filter(Boolean).join(" · "),
        subtasks:[String(item.child)+" shower"],icon:"♡"});
    });
    return rows;
  }

  function lifeRecentWorkHours(date){
    const end=new Date(String(date)+"T12:00:00"),start=new Date(end);start.setDate(end.getDate()-6);
    const from=ymd(start);
    return (state.workShifts||[]).filter(function(w){return w.date>=from&&w.date<=date}).reduce(function(sum,w){
      if(typeof wh==="function")return sum+Number(wh(w)||0);
      const mins=lifeMinutesBetween(w.start,w.end);return sum+(Number.isFinite(mins)?mins/60:0);
    },0);
  }

  function lifeNapSuggestion(date){
    const p=lifeEnsureSettings(),cfg=p.napSupport||{};
    if(cfg.enabled===false)return null;
    const sleep=typeof sleepForDate==="function"?sleepForDate(date):null,
      actual=typeof sleepHours==="function"?Number(sleepHours(sleep)||0):0,
      plan=itinerarySleepPlan(date),
      minSleep=Math.max(5,Number(cfg.suggestBelowHours||7.25)),
      earlyWake=hmMinutes(cfg.earlyWakeBefore||"03:30"),
      heavyHours=Math.max(35,Number(cfg.heavyWeekHours||50)),
      recentHours=lifeRecentWorkHours(date),
      shortNight=actual>0&&actual<minSleep,
      compressedTonight=plan.wakeMinutes!==null&&plan.wakeMinutes!==undefined&&Number(plan.protectedHours||0)<minSleep,
      earlierThanUsual=plan.wakeMinutes!==null&&plan.wakeMinutes!==undefined&&earlyWake!==null&&plan.wakeMinutes<earlyWake,
      heavyWeek=recentHours>=heavyHours;
    if(!shortNight&&!compressedTonight&&!earlierThanUsual&&!heavyWeek)return null;
    const reasons=[];
    if(shortNight)reasons.push("about "+actual.toFixed(1)+" h actual sleep logged");
    if(compressedTonight)reasons.push("only "+Number(plan.protectedHours||0).toFixed(1)+" h fit before tomorrow’s wake");
    if(earlierThanUsual)reasons.push("tomorrow needs an earlier-than-usual wake");
    if(heavyWeek)reasons.push(recentHours.toFixed(1)+" work hours logged in the last 7 days");
    return {reason:reasons.join(" · "),duration:Math.max(20,Math.min(30,Number(cfg.durationMinutes||25)))};
  }

  function lifeLunchChoice(date){
    const p=lifeEnsureSettings(),planned=p.lunchPlanByDate&&String(p.lunchPlanByDate[date]||"").trim();
    if(planned)return planned;
    const meal=(state.meals||[]).find(function(m){return m.date===date&&String(m.type||"").toLowerCase()==="lunch"&&String(m.dish||"").trim()});
    if(meal)return String(meal.dish).trim();
    const names=(state.pantry&&Array.isArray(state.pantry.items)?state.pantry.items:[]).map(function(x){
      return String(typeof x==="string"?x:(x&&x.name)||(x&&x.item)||"").toLowerCase();
    });
    const has=function(re){return names.some(function(n){return re.test(n)})};
    if(has(/meatball/)&&has(/vegetable|vegg|broccoli|green bean|mixed veg/))return"Meatballs + vegetables";
    if(has(/salmon/)&&has(/vegetable|vegg|broccoli|green bean|mixed veg/))return"Salmon + vegetables";
    if(has(/yogurt/)&&has(/granola|fruit|berry/))return"Yogurt bowl";
    return"Choose lunch from verified food on hand";
  }

  const baseSuggestedBlocks=itinerarySuggestedBlocks;
  itinerarySuggestedBlocks=function(date){
    if(typeof ensureFamilyDay==="function")ensureFamilyDay(date);
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
      // Daily clean-room/homework/reading items live inside Kids chores, so do not
      // schedule a second homework or flexible after-school reset ahead of them.
      if(x.templateKey==="after-school-launch")return false;
      if(x.templateKey==="homework")return false;
      if(lifeWeekday(date)===1&&x.templateKey==="chores")return false;
      return true;
    }).map(function(x){
      if(x.templateKey==="wind-down"){
        const night=p.nightRoutine||{},sweep=night.electronicsSweepTime||"19:30";
        return Object.assign({},x,{
          title:"Teeth + face + pajamas + electronics sweep",
          detail:"Your night routine first · at "+fmtClock(sweep)+" collect the kids’ electronics and start their bedtime routine · plug in phone + set alarm · get into bed by the planned bedtime.",
          subtasks:Array.isArray(night.subtasks)?night.subtasks.slice():["Brush teeth","Floss","Mouthwash","Wash face","Put on pajamas","Start vacuums","Plug in phone","Set alarm","Electronics sweep","Get in bed"]
        });
      }
      if(x.templateKey==="chores"){
        const childOrder={leo:0,demitri:1,dolly:2,ambrose:3},
          choreOrder={"clean room":0,"homework":1,"read 20 min":2,"laundry":3,"dishes":3,"counters":3,"floors":3},
          todays=(state.chores||[]).filter(function(c){
            if(c.date!==date)return false;
            const child=String(c.child||"").toLowerCase(),chore=String(c.chore||"").toLowerCase();
            const olderReading=(child==="leo"||child==="demitri")&&/read\s*20\s*min|reading/.test(chore);
            return !olderReading;
          }).slice().sort(function(a,b){
            const ac=childOrder[String(a.child||"").toLowerCase()]??99,
              bc=childOrder[String(b.child||"").toLowerCase()]??99;
            if(ac!==bc)return ac-bc;
            const ao=choreOrder[String(a.chore||"").toLowerCase()]??50,
              bo=choreOrder[String(b.chore||"").toLowerCase()]??50;
            return ao-bo||String(a.chore||"").localeCompare(String(b.chore||""));
          }),
          subtasks=todays.map(function(c){return (c.child?c.child+": ":"")+String(c.chore||"Chore")}),
          refs=todays.map(function(c){return c.id});
        return Object.assign({},x,{
          title:"Kids chores + homework",start:"15:30",end:"16:30",
          detail:"Right after school: clean rooms, homework, and today’s rotating household jobs. Leo + Tree reading is saved for 7:40–8:00 PM after the 7:30 electronics/teeth routine.",
          subtasks:subtasks,subtaskRefs:refs
        });
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

    const workRow=workForDate(date),workStart=lifeResolvedWorkStartMinutes(date),
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
      }else if(offDay&&care.offdayAutoSchedule===true){
        const start=Math.max(dayStart,14*60),duration=Math.max(40,Number(care.offdayDurationMinutes||40)),end=Math.min(dayEnd,start+duration);
        if(end-start>=35)add({templateKey:"personal-care",start:minutesHm(start),end:minutesHm(end),
          title:"Optional off-day shower + self-care",
          detail:"Only scheduled when off-day shower automation is turned on",
          subtasks:["Shower","Dry off","Lotion","Face moisturizer","Deodorant","Hair","Get dressed"],icon:"♡"});
      }
    }

    if(offDay){
      const monday=lifeWeekday(date)===1;
      if(monday){
        add({templateKey:"monday-kids-ready",start:"06:15",end:"06:30",
          title:"Get kids up + ready downstairs",
          detail:"Kids first — you get yourself dressed afterward",
          subtasks:["Wake kids","Kids get dressed","Kids brush teeth","Kids wash faces","Kids go downstairs"],icon:"☀"});
        add({templateKey:"monday-water-school",start:"06:30",end:"06:40",
          title:"Water bottle + school setup",
          detail:"While Leo showers: fill your water bottle and make sure school things are together",
          subtasks:["Fill water bottle","Check school bags / folders","Check jackets / school items"],icon:"💧",allowParallel:true});
        add({templateKey:"monday-self-ready",start:"06:55",end:"07:10",
          title:"Get yourself ready",
          detail:"15-minute ready block after Dolly's hair",
          subtasks:["Get dressed","Brush teeth","Floss","Mouthwash","Wash face","Do hair","Deodorant","Perfume"],icon:"♡"});
        add({templateKey:"monday-stretch",start:"07:10",end:"07:15",
          title:"Stretch while watching for the bus",
          detail:"Five-minute stretch while keeping an eye out for the bus",
          subtasks:["Stretch for 5 minutes","Watch for bus"],icon:"✦"});
      }else{
        add({templateKey:"morning-start",start:minutesHm(dayStart),end:minutesHm(Math.min(dayEnd,dayStart+30)),
          title:"Bathroom + teeth + water + get dressed",
          detail:"Bathroom · brush teeth · fill water bottle · get dressed · quick look at Day Flow",
          subtasks:["Bathroom","Brush teeth","Fill water bottle","Get dressed","Check Day Flow"],icon:"☀"});
      }
      const lunch=lifeLunchChoice(date);
      if(monday){
        add({templateKey:"midday-reset",start:"12:30",end:"12:50",
          title:"Lunch · "+lunch,detail:"Leftover roast + water · then move into the protected birthday-gift project block",icon:"◷"});
      }else{
        const focusStart=Math.max(dayStart,12*60);
        if(focusStart+45<=Math.min(dayEnd,14*60))add({templateKey:"home-reset",start:minutesHm(focusStart),end:minutesHm(focusStart+45),
          title:"Home focus · deep clean / declutter",detail:"Use this for a bigger home project without taking over the kids’ rotating chores.",icon:"⌂"});
        const mid=Math.max(focusStart+45,12*60+45);
        if(mid+30<=Math.min(dayEnd,14*60))add({templateKey:"midday-reset",start:minutesHm(mid),end:minutesHm(mid+30),
          title:"Lunch · "+lunch,detail:"Eat lunch · drink water · check the next commitment before moving on",icon:"◷"});
      }
    }

    const hair=p.dollyHairRoutine||{};
    if(hair.enabled!==false){
      const schoolMorning=[1,2,3,4,5].includes(lifeWeekday(date)),
        start=hmMinutes(schoolMorning?(hair.schoolMorningStart||"07:00"):(hair.nonSchoolMorningStart||"09:00")),
        duration=Math.max(5,Math.min(10,Number(hair.durationMinutes||10)));
      if(start!==null){
        const cover=lifeTannerMorningCoverage(date),covered=cover&&start>=cover.start&&start<cover.end;
        add({templateKey:"dolly-hair",start:minutesHm(start),end:minutesHm(start+duration),
          title:(covered?cover.caregiver+" · ":"")+"Dolly · hair",
          detail:(covered?cover.caregiver+" handles this on UPS work mornings · ":"")+"Reserve 5–10 minutes for Dolly's hair",
          subtasks:[(covered?cover.caregiver+": ":"")+"Do Dolly's hair"],icon:"♡"});
      }
    }

    const hydration=p.hydrationRoutine||{};
    if(hydration.enabled!==false&&Number(hydration.targetBottles||3)>=3){
      const first=Math.min(dayEnd-30,dayStart+Math.max(120,Number(hydration.firstAfterWakeMinutes||225))),
        second=Math.min(dayEnd-30,dayStart+Math.max(240,Number(hydration.secondAfterWakeMinutes||465))),
        configuredFinal=hmMinutes(hydration.finalBy||"18:00"),
        finalTime=Math.max(second+120,Math.min(dayEnd-60,configuredFinal===null?18*60:configuredFinal)),
        waterRows=[
          {templateKey:"water-1",start:minutesHm(first),end:minutesHm(Math.min(dayEnd,first+5)),title:"Water check · 1 of 3 bottles",detail:"By now, aim to have finished bottle 1 of 3.",subtasks:["Finish bottle 1 of 3"],icon:"💧"},
          {templateKey:"water-2",start:minutesHm(second),end:minutesHm(Math.min(dayEnd,second+5)),title:"Water check · 2 of 3 bottles",detail:"By now, aim to have finished bottle 2 of 3.",subtasks:["Finish bottle 2 of 3"],icon:"💧"},
          {templateKey:"water-3",start:minutesHm(finalTime),end:minutesHm(Math.min(dayEnd,finalTime+5)),title:"Water check · 3 of 3 bottles",detail:"Finish bottle 3 so today’s water goal is complete.",subtasks:["Finish bottle 3 of 3"],icon:"💧"}
        ];
      waterRows.forEach(function(row){add(row)});
    }

    const nap=lifeNapSuggestion(date);
    if(nap){
      const cfg=p.napSupport||{},start=hmMinutes(cfg.windowStart||"10:30"),preferred=Math.max(start===null?10*60+30:start,13*60),
        end=preferred+nap.duration;
      add({templateKey:"recovery-nap",start:minutesHm(preferred),end:minutesHm(end),
        title:"Recovery nap · optional",detail:"Sleep support: "+nap.reason,
        subtasks:["Rest / nap for "+nap.duration+" minutes"],icon:"☾"});
    }

    lifeKidShowerRows(date).forEach(function(row){
      if(lifeWeekday(date)===1&&row.templateKey!=="kid-shower-leo")return;
      add(row);
    });

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
        title:tomorrowWork?"Stage work clothes + keys + drink/snack":"Check tomorrow + stage clothes / bags / keys",
        detail:details.join(" · "),icon:"✦"});
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
      now=date===ymd()?new Date():null,
      currentFloor=now?Math.ceil((now.getHours()*60+now.getMinutes()+5)/5)*5:null,
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
      if(!task)task=priorities.find(function(t){return !usedTasks.has(t.id)});
      return task||null;
    }
    function fallbackTask(cursor,minutes){
      // Keep filler blocks concrete enough that the title itself tells you what to do.
      if(cursor<10*60)return {title:"Put away clutter + clear one surface",detail:"Put away visible clutter · refill what you need · clear one small surface"};
      if(cursor<12*60)return {title:"Finish one school / house / account loose end",detail:"Choose one real unfinished form, message, order, school item, account check, or household admin item"};
      if(cursor<15*60)return {title:"Put away out-of-place items + clear one area",detail:"Return items that already have a home · clear one visible area"};
      if(cursor<18*60)return {title:"Pack what you need for the next stop",detail:"Bags · keys · water · papers · clothes · anything that needs to leave with you"};
      return {title:"Kitchen + living-area pickup",detail:"Put away visible items · reset the kitchen/living area · stage the next thing you need"};
    }

    gaps.forEach(function(g){
      let cursor=currentFloor===null?g.start:Math.max(g.start,currentFloor);
      if(g.end-cursor<15)return;
      while(g.end-cursor>=15){
        const task=nextTask(cursor);
        if(task){
          const isHome=lifeIsHouseholdFocusTask(task);
          if(isHome&&!(cursor>=homeStart&&cursor<homeEnd)){
            const boundary=cursor<homeStart&&g.end>homeStart?homeStart:null;
            if(boundary!==null&&boundary-cursor>=15){
              const chunk=Math.min(60,boundary-cursor);
              const fallback=fallbackTask(cursor,chunk);
              out.push({id:"gap-maint:"+date+":"+cursor,start:minutesHm(cursor),end:minutesHm(cursor+chunk),title:fallback.title,
                detail:fallback.detail,fixed:false,kind:"routine",icon:"✓",source:"generated",durationMinutes:chunk});
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
        const fallback=fallbackTask(cursor,chunk);
        out.push({id:"gap-maint:"+date+":"+cursor,start:minutesHm(cursor),end:minutesHm(cursor+chunk),title:fallback.title,
          detail:fallback.detail,fixed:false,kind:"routine",icon:"✓",source:"generated",durationMinutes:chunk});
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