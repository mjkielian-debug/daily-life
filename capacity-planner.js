/* Daily Life · realistic capacity guardrail
   Keeps auto-scheduled flexible work from crowding days that already carry a lot. */
(function(){
  "use strict";

  function cpDuration(start,end){
    let s=hmMinutes(start),e=hmMinutes(end);
    if(s===null||e===null)return 0;
    if(e<s)e+=1440;
    return Math.max(0,e-s);
  }
  function capacitySnapshot(date=ymd()){
    const target=Math.max(4,Math.min(12,Number(state.settings?.itinerary?.sleepTargetHours||8))),
      sleep=typeof sleepForDate==="function"?sleepForDate(date):null,
      slept=sleep&&typeof sleepHours==="function"?sleepHours(sleep):0,
      hasSleep=!!(sleep&&sleep.bedtime&&sleep.wakeTime&&slept>0),
      work=typeof workForDate==="function"?workForDate(date):null,
      workMinutes=work?cpDuration(work.start||work.scheduled,work.end):0,
      fixed=typeof itineraryFixedItems==="function"?itineraryFixedItems(date):[],
      fixedMinutes=fixed.reduce((n,x)=>n+(cpDuration(x.start,x.end)||Math.max(15,Number(x.estimatedMinutes||0))),0),
      fixedNonWork=Math.max(0,fixedMinutes-workMinutes),
      sleepShortfall=hasSleep?Math.max(0,target-slept):0;
    let score=100;
    if(hasSleep)score-=Math.max(0,sleepShortfall-.5)*15;
    score-=Math.max(0,workMinutes/60-5)*5;
    score-=Math.max(0,fixedNonWork/60-3)*5;
    score=Math.max(25,Math.min(100,Math.round(score)));
    const level=score<55?"light":score<75?"moderate":"normal",
      maxAuto=level==="light"?3:level==="moderate"?5:8,
      reasons=[];
    if(hasSleep&&sleepShortfall>=1)reasons.push(slept.toFixed(1)+" h sleep logged vs "+target+" h target");
    if(workMinutes>=360)reasons.push((workMinutes/60).toFixed(1)+" h work block");
    if(fixedNonWork>=240)reasons.push((fixedNonWork/60).toFixed(1)+" h other fixed commitments");
    return{date,target,slept,hasSleep,sleepShortfall,workMinutes,fixedMinutes,fixedNonWork,score,level,maxAuto,reasons};
  }
  window.capacitySnapshot=capacitySnapshot;

  const baseAutoTasks=itineraryAutoTaskBlocks;
  itineraryAutoTaskBlocks=function(date,baseItems){
    const rows=baseAutoTasks(date,baseItems),cap=capacitySnapshot(date),
      explicit=rows.filter(x=>x.autoPlanned===false),
      auto=rows.filter(x=>x.autoPlanned!==false);
    if(cap.maxAuto>=auto.length)return rows;
    return [...explicit,...auto.slice(0,cap.maxAuto)].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  };

  const baseAdvice=dailyLifeAdvice;
  dailyLifeAdvice=function(){
    const rows=baseAdvice(),cap=capacitySnapshot(ymd());
    if(cap.level!=="normal"&&cap.reasons.length){
      rows.push({
        priority:cap.level==="light"?92:70,icon:"♡",
        title:cap.level==="light"?"Keep today deliberately lighter":"Watch today’s load",
        detail:cap.reasons.join(" · ")+" · Day Flow is limiting automatically placed flexible tasks; fixed commitments and things you timed yourself stay put.",
        category:"care"
      });
    }
    return rows.sort((a,b)=>b.priority-a.priority).slice(0,5);
  };

  function capacityCard(date){
    const c=capacitySnapshot(date),label=c.level==="light"?"Lighter plan":c.level==="moderate"?"Moderate plan":"Normal planning room",
      pct=Math.round(c.score);
    return '<div class="card capacity-card capacity-'+c.level+'">'+
      '<div class="capacity-ring" style="--capacity:'+pct+'"><span>'+pct+'</span><small>planning room</small></div>'+
      '<div class="grow"><div class="eyebrow">Capacity guardrail</div><h2>'+esc(label)+'</h2><div class="muted small">'+
        esc(c.reasons.length?c.reasons.join(" · "):"No strong load signal is recorded, so Daily Life is using the normal flexible-task limit.")+
      '</div><div class="capacity-rule">'+(c.level==="normal"?"Up to 8":"Up to "+c.maxAuto)+' automatically placed flexible tasks · manually timed items are never moved by this guardrail.</div></div>'+
      '</div>';
  }

  const baseItinerary=itineraryView;
  itineraryView=function(){
    const date=itineraryDate||ymd();
    return capacityCard(date)+baseItinerary.apply(this,arguments);
  };

  if(typeof render==="function")render();
})();