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



function openReviewedNotesImport(){
 modal("Import reviewed screenshot notes",'<div class="stack"><p>Add reviewed information to Vehicle, Garden, School, House Map, and Projects. Existing records are kept. Reimporting the same note does not duplicate it.</p><label>Reviewed notes file<input id="reviewedNotesFile" type="file" accept="application/json,.json"></label><div id="reviewedNotesPreview" class="notice">Choose the notes file downloaded from this chat.</div><div class="muted small">Identity documents should be added through the encrypted Vault instead.</div></div>',"Review file",async()=>{
 const file=$("#reviewedNotesFile").files[0];if(!file)return;if(file.size>8000000)throw Error("Choose a reviewed notes file smaller than 8 MB.");
 const data=JSON.parse(await file.text());validateReviewedNotes(data);
 closeModal();modal("Review additions",'<div class="stack">'+data.records.map(x=>'<div class="metric"><b>'+esc(x.section)+' · '+esc(x.title)+'</b><p>'+esc(x.note)+'</p></div>').join('')+'</div>',"Add to my app",async()=>{await applyReviewedNotes(data);closeModal();render()});
 });
}
function validateReviewedNotes(data){
 if(data?.format!=="daily-life-reviewed-notes-v1"||!Array.isArray(data.records)||data.records.length>50)throw Error("This is not a reviewed Daily Life notes file.");
 for(const r of data.records){
 if(!["vehicle","garden","project","schoolGrade","schoolAssignment","schoolContacts","houseMap"].includes(r.section)||!/^review-[a-z0-9-]{1,100}$/.test(r.id)||typeof r.title!=="string"||typeof r.note!=="string"||r.note.length>20000)throw Error("Invalid reviewed note.");
 if(r.section==="houseMap"&&(!Array.isArray(r.zones)||r.zones.length>30||r.zones.some(z=>!/^zone-[a-z0-9-]+$/.test(z.key)||typeof z.name!=="string"||typeof z.floor!=="string"||!/^#[0-9a-f]{6}$/i.test(z.color))))throw Error("Invalid house map rooms.");
 if(r.photos&&(!Array.isArray(r.photos)||r.photos.length>8||r.photos.some(p=>typeof p!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)||p.length>1500000)))throw Error("Invalid reference photo.");
 }
}
async function applyReviewedNotes(data){
 validateReviewedNotes(data);const original={vehicles:structuredClone(state.vehicles||[]),gardenJournal:structuredClone(state.gardenJournal||[]),projects:structuredClone(state.projects||[]),schoolGrades:structuredClone(state.schoolGrades||[]),schoolAssignments:structuredClone(state.schoolAssignments||[]),peopleProfiles:structuredClone(state.peopleProfiles||[]),houseRooms:structuredClone(state.houseRooms||[])};
 state.vehicles=state.vehicles||[];state.gardenJournal=state.gardenJournal||[];state.projects=state.projects||[];
 for(const r of data.records){
 if(r.section==="vehicle"){
 let v=state.vehicles.find(v=>String(v.make||"").toLowerCase()===String(r.make||"").toLowerCase()&&String(v.model||"").toLowerCase().includes(String(r.model||"").toLowerCase()));
 if(!v){v={id:r.id,make:String(r.make||""),model:String(r.model||""),year:Number(r.year)||null,primary:state.vehicles.length===0};state.vehicles.push(v)}
 if(!v.year&&r.year)v.year=Number(r.year);v.reviewedSources=v.reviewedSources||[];
 if(!v.reviewedSources.includes(r.id)){v.notes=[v.notes,r.title+": "+r.note].filter(Boolean).join("\n\n");v.reviewedSources.push(r.id);if(r.photos)v.referencePhotos=[...(v.referencePhotos||[]),...r.photos]}
 }else if(r.section==="schoolGrade"||r.section==="schoolAssignment"){
 const key=r.section==="schoolGrade"?"schoolGrades":"schoolAssignments";state[key]=state[key]||[];if(state[key].some(x=>x.id===r.id))continue;
 if(r.section==="schoolGrade")state[key].push({id:r.id,child:String(r.child||""),course:String(r.course||""),grade:String(r.grade||""),percent:Number.isFinite(Number(r.percent))?Number(r.percent):null,term:String(r.term||""),asOf:String(r.asOf||data.reviewedDate),source:"Reviewed screenshot",notes:r.note});
 else state[key].push({id:r.id,child:String(r.child||""),course:String(r.course||""),title:r.title,due:String(r.due||""),status:["missing","due","graded","submitted"].includes(r.status)?r.status:"due",source:"Reviewed screenshot",notes:r.note});
 }else if(r.section==="houseMap"){
 state.houseRooms=state.houseRooms||[];
 if(!state.projects.some(x=>x.id===r.id))state.projects.push({id:r.id,title:r.title,status:"open",tasks:[],notes:r.note,referencePhotos:r.photos||[],mapZones:r.zones});
 for(const z of r.zones){const id=r.id+"-"+z.key;if(!state.houseRooms.some(x=>x.id===id))state.houseRooms.push({id,name:z.name,notes:z.floor+" · Map label: "+String(z.sourceLabel||""),floor:z.floor,mapColor:z.color,mapSource:r.id})}
 }else if(r.section==="schoolContacts"){
 const p=(state.peopleProfiles||[]).find(x=>String(x.name||"").toLowerCase()===String(r.child||"").toLowerCase());
 if(p){p.schoolContacts=p.schoolContacts||[];for(const c of r.contacts||[]){if(p.schoolContacts.some(x=>String(x.name||"").toLowerCase()===String(c.name||"").toLowerCase()&&String(x.role||"")===String(c.role||"")))continue;p.schoolContacts.push({name:String(c.name||""),role:String(c.role||""),email:"",notes:String(c.notes||""),schoolYear:"2026-27",status:"verify",source:"Reviewed ParentVUE screenshot"})}}
 if(!state.projects.some(x=>x.id===r.id))state.projects.push({id:r.id,title:r.title,status:"open",tasks:[],notes:r.note});
 }else{
 const rows=r.section==="garden"?state.gardenJournal:state.projects;if(rows.some(x=>x.id===r.id))continue;
 if(r.section==="garden")rows.push({id:r.id,date:data.reviewedDate,title:r.title,note:r.note,referencePhotos:r.photos||[]});
 else rows.push({id:r.id,title:r.title,status:"open",nextAction:"",tasks:[],notes:r.note,referencePhotos:r.photos||[]});
 }
 }
 try{await save()}catch(error){Object.assign(state,original);throw error}
}
function reviewedPhotoGallery(photos){return(photos||[]).length?'<div style="display:flex;overflow:auto;gap:8px;margin:10px 0">'+photos.map(p=>'<img src="'+esc(p)+'" alt="Imported reference photo" style="width:150px;height:130px;object-fit:contain;border-radius:14px;background:var(--panel2)">').join('')+'</div>':''}
const reviewedVehicleCard=vehicleCard;
vehicleCard=function(){const v=primaryVehicle();return reviewedVehicleCard()+reviewedPhotoGallery(v?.referencePhotos)};
const reviewedGardenJournalCard=gardenJournalCard;
gardenJournalCard=function(){return reviewedGardenJournalCard()+reviewedPhotoGallery((state.gardenJournal||[]).flatMap(x=>x.referencePhotos||[]))};
const reviewedSettingsView=settingsView;
settingsView=function(){return reviewedSettingsView()+'<div class="card"><h2>Reviewed screenshot notes</h2><p class="muted small">Add information reviewed in this chat to the relevant sections.</p><button class="btn" onclick="openReviewedNotesImport()">Import reviewed notes</button>'+(state.projects||[]).filter(x=>x.id?.startsWith("review-")).map(x=>'<details style="margin-top:12px"><summary>'+esc(x.title)+'</summary><p>'+esc(x.notes)+'</p>'+reviewedPhotoGallery(x.referencePhotos)+'</details>').join('')+'</div>'};

function reviewedHouseMapCard(){const maps=(state.projects||[]).filter(x=>Array.isArray(x.mapZones));if(!maps.length)return "";return maps.map(m=>'<div class="card"><h2>'+esc(m.title)+'</h2><p class="muted small">'+esc(m.notes)+'</p>'+(m.referencePhotos||[]).map(p=>'<img src="'+esc(p)+'" alt="House map reference" style="display:block;width:100%;max-height:540px;object-fit:contain;border-radius:16px">').join('')+'<div class="stack">'+(state.houseRooms||[]).filter(r=>r.mapSource===m.id).map(r=>'<button class="btn" onclick="openInventoryRoom(\''+esc(r.id)+'\')"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:'+esc(r.mapColor)+'"></span> '+esc(r.name)+' · '+esc(r.floor)+'</button>').join('')+'</div><p class="muted small">Tap a room to name it and add notes. This reference does not establish measurements or an emergency route.</p></div>').join('')}
const reviewedInventoryView=inventoryView;
inventoryView=function(){return reviewedHouseMapCard()+reviewedInventoryView()};
