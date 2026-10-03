/* Daily Life — proactive daily coach.
   Extends weather preparation and uses existing local app data for practical next-step advice. */

const dailyCoachBaseAdvice=dailyLifeAdvice;

weatherPrepAdvice=function(){
  const days=weather?.days||[];
  if(!days.length)return[];
  const items=[],today=days[0],future=days.slice(1,5),look=days.slice(0,5);
  const add=(priority,icon,title,detail)=>{
    if(!items.some(x=>x.title===title))items.push({priority,icon,title,detail,category:"weather"});
  };
  const label=d=>weatherForecastDayLabel(d.date);

  const ice=look.find(d=>[56,57,66,67].includes(Number(d.code)));
  if(ice){
    add(112,"◈","Prepare for possible ice "+label(ice),
      "House: put ice melt or traction material where it is easy to reach and keep walkways clear. Car: stage the scraper/de-icer and allow extra braking distance and travel time. Kids: set out shoes or boots with good traction and keep outdoor plans flexible.");
  }

  const hardFreeze=future.find(d=>Number(d.low)<=28);
  const freeze=hardFreeze||future.find(d=>Number(d.low)<=32);
  if(freeze){
    add(hardFreeze?108:102,"❄",(hardFreeze?"A hard freeze":"A freeze")+" is coming "+label(freeze),
      "House: disconnect/protect outdoor hoses and faucets and bring sensitive plants in. Car: check washer fluid, scraper, and tire pressure after the colder air settles in. Kids: stage coats, warm layers, hats, and gloves the night before.");
  }

  const snow=look.find(d=>[71,73,75,77,85,86].includes(Number(d.code)));
  if(snow){
    add(106,"☃","Snow is in the forecast "+label(snow),
      "House: decide who will clear the main path and put shovel/ice supplies where they are reachable. Car: keep the scraper in the vehicle, clear all windows before driving, and build in extra travel time. Kids: stage gloves, hats, boots, and a dry backup pair if needed.");
  }

  const storm=look.find(d=>[95,96,99].includes(Number(d.code)));
  if(storm){
    add(104,"⚡","Thunderstorms are possible "+label(storm),
      "House: charge phones, secure loose outdoor items, and know the safest indoor area. Car: avoid planning around the strongest part of the storm when timing becomes clearer. Kids: keep an indoor backup plan and shoes/essentials easy to grab.");
  }

  const sharpCold=future.find(d=>today&&Number(today.high)-Number(d.high)>=15);
  if(sharpCold){
    add(94,"↘","A sharp temperature drop is coming "+label(sharpCold),
      "House: move coats and cold-weather gear back into easy reach. Car: colder air can lower tire pressure, so recheck PSI after the temperature drops. Kids: adjust layers for the colder morning instead of dressing from today's temperature.");
  }

  const heavyRain=look.find(d=>Number(d.rain)>=75&&[51,53,55,61,63,65,80,81,82].includes(Number(d.code)));
  if(heavyRain){
    add(90,"☂","Plan for heavy rain "+label(heavyRain),
      "House: bring in or cover anything that should stay dry and check that drains/gutters are not obviously blocked. Car: allow extra stopping and travel time. Kids: put umbrellas/rain gear and a dry change of socks or shoes by the door.");
  }

  const wind=look.find(d=>Number(d.wind)>=30);
  if(wind){
    add(92,"≋","Strong wind is expected "+label(wind),
      "House: secure lightweight porch/yard items, bins, and decorations. Car: use extra care on exposed roads and around high-profile vehicles. Kids: keep loose outdoor toys and lightweight gear inside.");
  }

  const extremeHeat=future.find(d=>Number(d.high)>=95);
  const heat=extremeHeat||future.find(d=>Number(d.high)>=90);
  if(heat){
    add(extremeHeat?96:86,"☀",(extremeHeat?"Very hot weather":"Hot weather")+" is coming "+label(heat),
      "House: close blinds on sunny windows early and plan cooling before the hottest part of the day. Car: remove heat-sensitive items and never leave kids or pets in a parked vehicle. Kids: stage water bottles and shift outdoor time toward the cooler morning/evening hours.");
  }

  return items.sort((a,b)=>b.priority-a.priority).slice(0,3);
};

function dailyCoachLatestTire(){
  return [...(state.tireLogs||[])].filter(x=>Number.isFinite(Number(x.psi))&&x.date)
    .sort((a,b)=>(String(b.date||"")+String(b.time||"")).localeCompare(String(a.date||"")+String(a.time||"")))[0]||null;
}

function dailyCoachAdd(items,item){
  if(!item?.title||items.some(x=>x.title===item.title))return;
  items.push(item);
}

dailyLifeAdvice=function(){
  const items=[...dailyCoachBaseAdvice()];
  const tomorrow=shiftDateString(ymd(),1);

  const work=workForDate(tomorrow);
  let workStart=hmMinutes(work?.start||work?.scheduled),workLabel=work?.start||work?.scheduled||"";
  if(workStart===null&&state.settings?.itinerary?.inferWorkStartForSleep!==false){
    const inferred=inferredWorkStartForDate(tomorrow);
    if(inferred?.minutes!==null&&inferred?.minutes!==undefined){
      workStart=inferred.minutes;workLabel=minutesHm(inferred.minutes);
    }
  }
  if(workStart!==null&&workStart<7*60){
    dailyCoachAdd(items,{priority:76,icon:"📦",title:"Stage the early work morning tonight",
      detail:`Tomorrow's work start is around ${fmtClock(workLabel)}. Before bed, put clothes, keys, anything you need to take, and an easy drink/snack in one place so the morning uses less decision-making.`,category:"work"});
  }

  const early=(state.events||[]).filter(e=>e.date===tomorrow&&e.status!=="cancelled"&&e.startTime&&hmMinutes(e.startTime)!==null&&hmMinutes(e.startTime)<9*60)
    .sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
  if(early.length){
    const first=early[0];
    dailyCoachAdd(items,{priority:74,icon:"🎒",title:"Pack for tomorrow's early commitment",
      detail:`${first.title||"An early event"} starts around ${fmtClock(first.startTime)}. Put bags, paperwork, clothes, and anything that needs to leave the house together tonight.`,category:"family"});
  }

  const shopping=typeof neededShoppingGroups==="function"?neededShoppingGroups():[];
  if(shopping.length>=7){
    dailyCoachAdd(items,{priority:55,icon:"🛒",title:"Batch the shopping instead of chasing items",
      detail:`There are ${shopping.length} needed shopping items. Group the list by store/aisle and try to cover the highest-priority meal and household needs in one trip or order.`,category:"food"});
  }

  if(typeof budgetCoachSnapshot==="function"){
    const moneyState=budgetCoachSnapshot();
    if(Number(moneyState.safe?.safe||0)<0){
      dailyCoachAdd(items,{priority:97,icon:"$",title:"Protect upcoming bills before optional spending",
        detail:`The entered cash picture is currently short by ${money(Math.abs(Number(moneyState.safe.safe||0)))} after bill reserves and the budget cushion. Check the Money Coach before adding optional spending.`,category:"money"});
    }else if(moneyState.target&&Number(moneyState.movable||0)>=20&&!moneyState.safe?.incomplete){
      dailyCoachAdd(items,{priority:60,icon:"$",title:"Extra checking cash can move to savings",
        detail:`The Money Coach currently sees up to ${money(moneyState.movable)} above the entered 45-day checking needs. Review the transfer breakdown before moving it to ${moneyState.target.name||"preferred savings"}.`,category:"money"});
    }
  }

  const tire=dailyCoachLatestTire(),tireAge=tire?.date?daysSinceDate(tire.date):null;
  if(tire&&tireAge!==null&&tireAge<=3&&Number(tire.psi)<28){
    dailyCoachAdd(items,{priority:101,icon:"🛞",title:"Recheck tire pressure before the next drive",
      detail:`The latest tire log is ${Number(tire.psi).toFixed(1)} PSI from ${dl(tire.date)}. Recheck it before driving and address a continued rapid pressure loss rather than relying on an old reading.`,category:"car"});
  }

  return items.sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)).slice(0,4);
};

/* A complete local-day palette: surfaces change along with the accents. */
const DAILY_GARDEN_PALETTES=[
 ["Rose garden","#10251c","#18382a","#244935","#98dab1","#f2becf","#eed59a"],
 ["Moonlit magnolia","#191c2c","#252b3d","#323b50","#b7c9f0","#e8bfdc","#f1dfac"],
 ["Peach blossom","#28201c","#392c25","#4a3930","#e8bf9b","#f0bac1","#d9e5b0"],
 ["Fern & rain","#10262a","#19383d","#244b50","#93d6d2","#e8c6d7","#e9d8ac"],
 ["Wild lavender","#241d2d","#35283e","#44344e","#d2b7eb","#efc2d3","#c8dfb4"],
 ["Golden meadow","#252515","#353723","#474b30","#c9da9d","#efc4aa","#f0d78c"],
 ["Blush & sage","#271c24","#392a35","#4a3543","#efbace","#b8dac3","#eed7af"]
];
function dailyGardenPalette(date){
 const parts=String(date||ymd()).split("-").map(Number);
 const day=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000);
 return DAILY_GARDEN_PALETTES[((day%DAILY_GARDEN_PALETTES.length)+DAILY_GARDEN_PALETTES.length)%DAILY_GARDEN_PALETTES.length];
}
theme=function(){
 const p=dailyGardenPalette(),root=document.documentElement;
 ["--bg","--panel","--panel2","--primary","--secondary","--accent"].forEach((key,i)=>root.style.setProperty(key,p[i+1]));
 root.style.setProperty("--text","#fff9f5");root.style.setProperty("--muted","#d7d5d1");root.style.setProperty("--cream","#fff5ed");
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",p[1]);
 return p[0];
};
let dailyGardenLastDate="";
function refreshDailyGarden(){const date=ymd();if(date!==dailyGardenLastDate){dailyGardenLastDate=date;theme()}}
refreshDailyGarden();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshDailyGarden()});
setInterval(refreshDailyGarden,60000);
