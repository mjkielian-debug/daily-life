/* Daily Life · reusable visual hubs. All figures are derived from saved records; no records are fabricated. */
function vhLink(label,icon,action){return {label,icon,action}}

function vhProgress(done,total,label){return {done:Math.max(0,Number(done)||0),total:Math.max(0,Number(total)||0),label}}

function visualHubModel(page){
 const s=state,day=ymd(),seven=shiftDateString(day,7),kids=(s.settings?.familyMembers||[]).length;
 const base={page,title:"",subtitle:"",addLabel:"",addAction:"",focusLabel:"DO NEXT",focusTitle:"",focusNote:"",focusAction:"",focusButton:"Open details",focusExtra:null,progress:null,mainValue:null,mainLabel:"",metrics:[],links:[],bottomTitle:"Explore",bottomDetail:"Choose an area to open details.",bars:[],barTitle:""};
 const m=(icon,label,value,action)=>({icon,label,value:String(value),action});
 const b=(date,value,known=true)=>({date,value:Math.max(0,Number(value)||0),known});
 if(page==="family"){
  const chores=(s.chores||[]).filter(x=>x.date===day),done=chores.filter(x=>x.done).length,events=(s.events||[]).filter(x=>x.date>=day&&x.date<=seven&&x.status!=="cancelled");
  const plans=typeof peopleAgendaItems==="function"?peopleAgendaItems().filter(x=>x.date>=day):[];
  const next=plans[0],profiles=s.peopleProfiles||[],family=typeof childProfiles==="function"?childProfiles():[];
  const soonSchool=events.filter(x=>x.date<=shiftDateString(day,2)&&typeof isSchoolEvent==="function"&&isSchoolEvent(x)).length;
  const birthdays=profiles.map(x=>typeof nextBirthdayInfo==="function"?nextBirthdayInfo(x):null).filter(Boolean).sort((a,b)=>a.days-b.days);
  const nextLabel=next?[next.date===day?"Today":next.date===shiftDateString(day,1)?"Tomorrow":typeof dl==="function"?dl(next.date):next.date,next.time&&typeof fmtClock==="function"?fmtClock(next.time):""].filter(Boolean).join(" · "):"";
  Object.assign(base,{title:"People + family",subtitle:"Chores, school and everyone's plans",addLabel:"+ Plan",addAction:"openPeopleHubSection('plans')",
   focusLabel:next?"COMING UP":"FAMILY TODAY",focusTitle:next?.title||"Family routines at a glance",
   focusNote:next?nextLabel:`${done} of ${chores.length} chores marked. Unmarked means not reported.`,
   focusAction:next?"openPeopleHubSection('plans')":"openPeopleHubSection('routines')",progress:vhProgress(done,chores.length,"Chores today"),
   metrics:[m("♡","Kids",family.length,"openPeopleHubSection('kids')"),m("🎒","School",soonSchool?soonSchool+" next 2d":"View","openPeopleHubSection('school')"),m("✦","Next plan",next?next.date.slice(5):"None","openPeopleHubSection('plans')"),m("🎂","Birthday",birthdays.length?birthdays[0].label:"Not set","openPeopleHubSection('birthdays')")],
   links:[vhLink("Kids","♡","openPeopleHubSection('kids')"),vhLink("School","🎒","openPeopleHubSection('school')"),vhLink("Plans","✦","openPeopleHubSection('plans')"),vhLink("Chores","✓","openPeopleHubSection('routines')"),vhLink("Birthdays","🎂","openPeopleHubSection('birthdays')"),vhLink("Activities","◷","openPeopleHubSection('activities')"),vhLink("Kids money","◇","openPeopleHubSection('money')"),vhLink("All people","♡","openPeopleHubSection('profiles')")],
   bottomTitle:"Family rhythm",bottomDetail:next?nextLabel:"Today's family routines",barTitle:"Chores · last 7 days"});
  base.bars=Array.from({length:7},(_,i)=>{const dt=shiftDateString(day,i-6),r=(s.chores||[]).filter(x=>x.date===dt);return b(dt,r.length?Math.round(100*r.filter(x=>x.done).length/r.length):0,r.length>0)});
 }else if(page==="home"){
  const dates=typeof week==="function"?week().filter(d=>d>=day):[day],planned=dates.filter(d=>!!(s.meals||[]).find(x=>x.date===d&&x.type==="dinner"&&x.dish)).length;
  const meal=typeof todayMeal==="function"?todayMeal():null,shop=typeof neededShoppingGroups==="function"?neededShoppingGroups():[],runzas=typeof runzaCookingBatch==="function"?runzaCookingBatch():null;
  const cookAhead=runzas&&String(runzas.status||"").toLowerCase()!=="made",ready=(s.meals||[]).filter(x=>x.date>=day&&x.dish&&typeof mealRecipeStatus==="function"&&mealRecipeStatus(x)==="ready").length;
  Object.assign(base,{title:"Food + kitchen",subtitle:"Dinner, groceries and prep",addLabel:"+ Log food",addAction:"openFood()",focusLabel:"TONIGHT'S DINNER",focusTitle:meal?.dish||"Choose tonight's dinner",
   focusNote:meal?.startBy?"Start by "+fmtClock(meal.startBy):meal?.dish?"See the dinner plan.":"Nothing chosen yet.",
   focusAction:`openMeal('${day}')`,focusExtra:cookAhead?{label:"🥟 Runzas · update cooking status",action:"openRunzaCookingBatch()"}:null,
   progress:vhProgress(planned,dates.length,"Dinners planned"),
   metrics:[m("🛒","Grocery",shop.length+" needed","openFoodHubSection('grocery')"),m("▤","Recipes",ready+" ready","openFoodHubSection('recipes')"),m("◇","Pantry",(s.pantry?.items||[]).length+" items","openFoodHubSection('pantry')"),m("💧","Water",Math.round(typeof water==="function"?water():0)+" / 78 oz","openCareHubSection('water')")],
   links:[vhLink("Week plan","◫","openFoodHubSection('week')"),vhLink("Groceries","🛒","openFoodHubSection('grocery')"),vhLink("Recipes","▤","openFoodHubSection('recipes')"),vhLink("Pantry","◇","openFoodHubSection('pantry')"),vhLink("Intake","＋","openFoodHubSection('intake')"),vhLink("Trends","↗","openFoodHubSection('trends')"),vhLink("Orders","⌂","openFoodHubSection('orders')"),vhLink("Favorites","♡","openFoodHubSection('favorites')")],
   bottomTitle:"Next meals",bottomDetail:`${planned} of ${dates.length} remaining days planned`,barTitle:"Dinner plan · this week"});
  base.bars=dates.map(d=>b(d,mealForDate(d)?.dish?100:0));
 }else if(page==="more"){
  const bills=(s.bills||[]).filter(x=>billForecastIncluded(x)&&x.due>=day&&x.due<=shiftDateString(day,30)),paid=bills.filter(x=>x.status==="paid").length,actions=typeof moneyNextActionSummary==="function"?moneyNextActionSummary():null;
  const urgent=typeof billReadiness==="function"?billReadiness().filter(x=>x.bill?.status!=="paid"&&x.bill?.due>=shiftDateString(day,-7)&&x.bill?.due<=seven&&/Transfer needed|Projected short|Needs account|Balance unavailable|Check bill/.test(x.status)):[],goals=(s.savingsGoals||[]).filter(x=>!x.done).length;
  const outstanding=bills.filter(x=>x.status!=="paid").length;
  Object.assign(base,{title:"Money",subtitle:"Bills, budget and accounts",addLabel:"+ Bill",addAction:"openBill()",focusLabel:"NEXT MONEY MOVE",focusTitle:actions?.title||"Check your bill plan",focusNote:actions?.detail||"Review upcoming payments and account readiness.",
   focusAction:"moneyRunNextAction()",progress:vhProgress(paid,bills.length,"Bills paid"),
   metrics:[m("▤","Bills",outstanding+" unpaid","openMoneyHubSection('bills')"),m("!","Review",urgent.length?urgent.length+" near-term":"See bills","openMoneyHubSection('transfers')"),m("◇","Accounts",(s.accounts||[]).length+" tracked","openMoneyHubSection('accounts')"),m("◇","Chase",typeof chaseBalanceMetric==="function"?chaseBalanceMetric():"Select card","openMoneyHubSection('bills')")],
   links:[vhLink("Bills","▤","openMoneyHubSection('bills')"),vhLink("Budget","◫","openMoneyHubSection('budget')"),vhLink("Transfers","↔","openMoneyHubSection('transfers')"),vhLink("Accounts","◇","openMoneyHubSection('accounts')"),vhLink("Income","↥","openMoneyHubSection('income')"),vhLink("Savings","✦","openMoneyHubSection('savings')"),vhLink("UPS pay","▣","openMoneyHubSection('pay')"),vhLink("Spending","↕","openMoneyHubSection('spending')")],
   bottomTitle:"Bills ahead",bottomDetail:`${paid} of ${bills.length} marked paid in next 30 days`,barTitle:"Bills due · next 7 days"});
  base.bars=Array.from({length:7},(_,i)=>{const dt=shiftDateString(day,i);return b(dt,bills.filter(x=>x.due===dt).length)});
 }else if(page==="log"){
  const oz=Math.round(typeof water==="function"?water():0),self=typeof selfCareTodayStats==="function"?selfCareTodayStats():{done:0,total:0},review=typeof dailyReviewSummary==="function"?dailyReviewSummary(day):{unknown:0},sleep=typeof sleepForDate==="function"?sleepForDate(day):null;
  const hours=typeof sleepHours==="function"?sleepHours(sleep):0,workouts=(s.workouts||[]).filter(x=>x.date>=shiftDateString(day,-6)&&x.date<=day).length;
  Object.assign(base,{title:"My care",subtitle:"Rest, hydration and wellbeing",addLabel:"+ Check-in",addAction:"openWellnessCheckin()",
   focusLabel:"TODAY'S CARE",focusTitle:review.unknown?`${review.unknown} check-ins to review`:"Check in with yourself",
   focusNote:"Unknown entries stay unknown until you review them — never counted as a no.",focusAction:"openDailyReview()",progress:vhProgress(Math.min(78,oz),78,"Water logged · 78 oz goal"),
   metrics:[m("♡","Self care",`${self.done} / ${self.total}`,"openCareHubSection('self')"),m("☾","Sleep",hours?hours.toFixed(1)+" hrs":"Unlogged","openCareHubSection('sleep')"),m("?","Check-ins",review.unknown+" unknown","openCareHubSection('review')"),m("↗","Movement",workouts+" this week","openCareHubSection('movement')")],
   links:[vhLink("Hydration","💧","openCareHubSection('water')"),vhLink("Daily review","?","openCareHubSection('review')"),vhLink("Sleep","☾","openCareHubSection('sleep')"),vhLink("Self care","♡","openCareHubSection('self')"),vhLink("Movement","↗","openCareHubSection('movement')"),vhLink("Work","▣","openCareHubSection('work')"),vhLink("Life admin","⌁","openCareHubSection('life')"),vhLink("Patterns","◫","openCareHubSection('patterns')")],
   bottomTitle:"Water this week",bottomDetail:`${oz} oz logged today. Add water only when you actually drink it.`,barTitle:"Ounces logged · last 7 days"});
  base.bars=Array.from({length:7},(_,i)=>{const dt=shiftDateString(day,i-6);return b(dt,(s.waterLogs||[]).filter(x=>x.date===dt).reduce((n,x)=>n+Number(x.oz||0),0))});
 }else if(page==="reading"){
  const readers=s.settings?.readers||[],todayReads=(s.readingLogs||[]).filter(x=>x.date===day),month=day.slice(0,7),monthLogs=(s.readingLogs||[]).filter(x=>x.date?.startsWith(month)),logged=new Set(todayReads.map(x=>x.reader)).size,pages=todayReads.reduce((n,x)=>n+Number(x.pages||0),0);
  const tickets=typeof monthlyReaderTickets==="function"?monthlyReaderTickets().reduce((n,x)=>n+Number(x.tickets||0),0):0;
  Object.assign(base,{title:"Reading",subtitle:"Books, pages and Reader Wheel",addLabel:"+ Pages",addAction:"openReadingChooser()",
   focusLabel:"READING TODAY",focusTitle:pages?`${pages} pages logged`:"Log today's reading",focusNote:logged?`${logged} of ${readers.length} readers have entries today.`:"No pages recorded yet; this does not mean nobody read.",
   focusAction:"openReadingChooser()",progress:vhProgress(logged,readers.length,"Readers with a log today"),
   metrics:[m("▤","Pages",pages+" today","openReadingHubSection('today')"),m("◌","Wheel",tickets+" tickets","openReadingHubSection('wheel')"),m("◫","Books",new Set(monthLogs.map(x=>String(x.book||"").trim()).filter(Boolean)).size+" this month","openReadingHubSection('books')"),m("♡","Readers",readers.length+" names","openReadingHubSection('readers')")],
   links:[vhLink("Log pages","＋","openReadingHubSection('log')"),vhLink("Reader Wheel","◌","openReadingHubSection('wheel')"),vhLink("Today","☀","openReadingHubSection('today')"),vhLink("This month","◫","openReadingHubSection('month')"),vhLink("Books","▤","openReadingHubSection('books')"),vhLink("Readers","♡","openReadingHubSection('readers')"),vhLink("History","↕","openReadingHubSection('history')"),vhLink("Patterns","↗","openReadingHubSection('patterns')")],
   bottomTitle:"Pages over time",bottomDetail:`${monthLogs.reduce((n,x)=>n+Number(x.pages||0),0)} pages logged this month.`,barTitle:"Pages logged · last 7 days"});
  base.bars=Array.from({length:7},(_,i)=>{const dt=shiftDateString(day,i-6);return b(dt,(s.readingLogs||[]).filter(x=>x.date===dt).reduce((n,x)=>n+Number(x.pages||0),0))});
 }else if(page==="itinerary"){
  const dt=itineraryDate||day,items=typeof itineraryDayItems==="function"?itineraryDayItems(dt):[],active=items.filter(x=>x.kind!=="gap"&&!x.nonBlocking),done=active.filter(x=>x.done).length,loose=typeof itineraryTaskCandidates==="function"?itineraryTaskCandidates(dt).length:0;
  const current=typeof dayFlowCurrentItem==="function"?dayFlowCurrentItem(dt,items):null,conflicts=typeof dayFlowConflictAudit==="function"?dayFlowConflictAudit(dt):{hardCount:0};
  const isCurrent=dt===day;
  Object.assign(base,{title:"Day Flow",subtitle:dt+" · Your day in motion",addLabel:"+ Block",addAction:`openItineraryBlock('${dt}')`,focusLabel:isCurrent?"NOW / NEXT":"DAY FOCUS",focusTitle:current?.title||"Plan an open block",
   focusNote:current?.start?fmtClock(current.start)+(current.end?" – "+fmtClock(current.end):""):"No timed block selected. Open the planner.",
   focusAction:`openDayFlowSection('plan','${dt}')`,progress:vhProgress(done,active.length,"Scheduled blocks checked"),
   metrics:[m("◷","Blocks",active.length+" placed",`openDayFlowSection('plan','${dt}')`),m("?","Loose",loose+" tasks",`openDayFlowSection('unscheduled','${dt}')`),m("!","Conflicts",conflicts.hardCount+" to review",`openDayFlowSection('plan','${dt}')`),m("＋","New","Add block",`openItineraryBlock('${dt}')`)],
   links:[vhLink("Plan day","◷",`openDayFlowSection('plan','${dt}')`),vhLink("Unscheduled","?",`openDayFlowSection('unscheduled','${dt}')`),vhLink("Morning","☀",`openDayFlowSection('morning','${dt}')`),vhLink("Afternoon","✦",`openDayFlowSection('afternoon','${dt}')`),vhLink("Evening","☾",`openDayFlowSection('evening','${dt}')`),vhLink("Add block","＋",`openItineraryBlock('${dt}')`),vhLink("Previous day","←","shiftItineraryDate(-1)"),vhLink("Next day","→","shiftItineraryDate(1)")],
   bottomTitle:"Day scheduling",bottomDetail:`${loose} task${loose===1?"":"s"} may still need a time. ${conflicts.hardCount} potential hard overlap${conflicts.hardCount===1?"":"s"}.`});
 }else if(page==="household"){
  const tasks=(s.tasks||[]).filter(x=>x.date===day&&String(x.category||"").toLowerCase()==="home"),done=tasks.filter(x=>x.done).length,petDue=typeof duePetRoutines==="function"?duePetRoutines():[];
  Object.assign(base,{title:"Home + household",subtitle:"Rooms, resets and pet care",addLabel:"+ Home log",addAction:"openHome()",
   focusLabel:"HOME TODAY",focusTitle:petDue.length?`${petDue.length} pet care routines due`:tasks.length?`${tasks.length-done} home tasks open`:"Choose a quick home reset",
   focusNote:petDue.length?"See which care routines are due.":tasks.length?`${done} of ${tasks.length} home tasks checked.`:"Map your rooms or open cleaning routines.",
   focusAction:petDue.length?"openHouseholdSection('petcare')":"openHouseholdSection('cleaning')",progress:vhProgress(done,tasks.length,"Home tasks marked today"),
   metrics:[m("⌂","Rooms",(s.houseRooms||[]).length+" mapped","openHouseholdSection('rooms')"),m("▦","Inventory",(s.inventoryItems||[]).length+" items","openHouseholdSection('inventory')"),m("♡","Pets",(s.pets||[]).filter(x=>x.status!=="Archived").length+" active","openHouseholdSection('pets')"),m("✓","Resets",(s.homeLogs||[]).filter(x=>x.date===day&&x.status==="done").length+" logged","openHouseholdSection('cleaning')")],
   links:[vhLink("House map","⌂","openHouseholdSection('map')"),vhLink("Cleaning","✓","openHouseholdSection('cleaning')"),vhLink("Inventory","▦","openHouseholdSection('inventory')"),vhLink("Pet care","♡","openHouseholdSection('petcare')"),vhLink("Rooms","◫","openHouseholdSection('rooms')"),vhLink("Supplies","◇","openHouseholdSection('supplies')"),vhLink("Home log","↕","openHouseholdSection('log')"),vhLink("Pets","♢","openHouseholdSection('pets')")],
   bottomTitle:"House at a glance",bottomDetail:`${(s.houseRooms||[]).length} mapped rooms · ${(s.inventoryItems||[]).length} tracked items.`});
 }else if(page==="pets"){
  const pets=(s.pets||[]).filter(x=>x.status!=="Archived"),due=typeof duePetRoutines==="function"?duePetRoutines():[],logs=(s.petLogs||[]).filter(x=>x.date===day),records=(s.petRecords||[]).filter(x=>x.nextDate>=day&&x.nextDate<=shiftDateString(day,14));
  Object.assign(base,{title:"Pets",subtitle:"Health, routines and care logs",addLabel:"+ Care",addAction:"openPetLog()",
   focusLabel:"PET CARE",focusTitle:due.length?`${due.length} care routine${due.length===1?"":"s"} due`:"Check in on your pets",
   focusNote:due.length?`${due[0]?.title||"Care"} is on the due list.`:"Log care when you do it; no routine currently flagged due.",
   focusAction:"openPetsHubSection('overview')",mainValue:String(logs.length),mainLabel:"Care logs today",
   metrics:[m("♡","Pets",pets.length+" active","openPetsHubSection('overview')"),m("!","Due",due.length+" routines","openPetsHubSection('overview')"),m("✚","Health",records.length+" soon","openPetsHubSection('health')"),m("↕","History",(s.petLogs||[]).length+" entries","openPetsHubSection('history')")],
   links:[vhLink("Care routines","✓","openPetsHubSection('overview')"),vhLink("Health","✚","openPetsHubSection('health')"),vhLink("History","↕","openPetsHubSection('history')"),vhLink("Log care","＋","openPetLog()"),vhLink("Litter","◇","openPetLog('','Litter')"),vhLink("Profiles","♡","openPetsHubSection('overview')"),vhLink("Add pet","＋","openPetProfile()"),vhLink("Household","⌂","setView('household')")],
   bottomTitle:"Care is recorded, not assumed",bottomDetail:"A missing log is not proof a routine was skipped."});
 }else if(page==="inventory"){
  const all=s.inventoryItems||[],rooms=s.houseRooms||[],low=all.filter(x=>["Low","Need"].includes(x.status)).length;
  Object.assign(base,{title:"Inventory",subtitle:"Know what you have and where",addLabel:"+ Item",addAction:"openInventoryItem()",
   focusLabel:"STOCK ATTENTION",focusTitle:low?`${low} item${low===1?"":"s"} marked low / needed`:"Find something in your home",
   focusNote:low?"Open the flagged items and restock only what is needed.":"Open tracked items or the room map.",
   focusAction:low?"openInventoryLowStock()":"openInventoryHubSection('items')",mainValue:String(all.length),mainLabel:"Items tracked",
   metrics:[m("!","Low / need",low+" flagged","openInventoryLowStock()"),m("⌂","Rooms",rooms.length+" mapped","openInventoryHubSection('map')"),m("◇","Storage",(s.inventoryLocations||[]).length+" spots","openInventoryHubSection('map')"),m("◫","Categories",new Set(all.map(x=>x.category).filter(Boolean)).size+" used","openInventoryHubSection('items')")],
   links:[vhLink("All items","▦","openInventoryHubSection('items')"),vhLink("House map","⌂","openInventoryHubSection('map')"),vhLink("Low stock","!","openInventoryLowStock()"),vhLink("Add item","＋","openInventoryItem()"),vhLink("Add room","◫","openInventoryRoom()"),vhLink("Location","◇","openInventoryLocation()"),vhLink("Supplies","▤","openHouseholdSection('supplies')"),vhLink("Household","⌂","setView('household')")],
   bottomTitle:"Your mapped home",bottomDetail:`${rooms.length} rooms · ${(s.inventoryLocations||[]).length} storage spots. Open map to find items faster.`});
 }else if(["gardenhobbies","garden","hobbies"].includes(page)){
  const plants=(s.plants||[]).filter(x=>x.status!=="Finished"),due=plants.filter(x=>typeof plantCareState==="function"&&plantCareState(x).due),tasks=s.gardenTasks||[],done=tasks.filter(x=>x.done).length,projects=(s.hobbyProjects||[]).filter(x=>!["Finished","Paused"].includes(x.status)),supplies=(s.shopping||[]).filter(x=>x.status==="needed"&&["garden","hobby"].includes(x.source)).length;
  Object.assign(base,{title:"Garden + hobbies",subtitle:"Grow, make and enjoy",addLabel:"+ Project",addAction:"openHobbyProject()",
   focusLabel:due.length?"PLANTS TO CHECK":"CREATIVE TIME",focusTitle:due.length?due[0].name:projects[0]?.name||"Pick something enjoyable",
   focusNote:due.length?"Plant care is due.":projects[0]?.nextStep||"Hobbies are optional, never another required chore.",
   focusAction:due.length?"openGardenHobbySection('plants')":"openGardenHobbySection('projects')",progress:vhProgress(done,tasks.length,"Garden tasks marked"),
   metrics:[m("❧","Plants",plants.length+" active","openGardenHobbySection('plants')"),m("💧","Care",due.length+" due","openGardenHobbySection('plants')"),m("✂","Projects",projects.length+" active","openGardenHobbySection('projects')"),m("◇","Supplies",supplies+" needed","openGardenHobbySection('shopping')")],
   links:[vhLink("Plants","❧","openGardenHobbySection('plants')"),vhLink("Projects","✂","openGardenHobbySection('projects')"),vhLink("Garden tasks","✓","openGardenHobbySection('tasks')"),vhLink("Seeds","✦","openGardenHobbySection('seeds')"),vhLink("Season","☀","openGardenHobbySection('season')"),vhLink("Journal","▤","openGardenHobbySection('journal')"),vhLink("Supplies","◇","openGardenHobbySection('supplies')"),vhLink("Shopping","🛒","openGardenHobbySection('shopping')")],
   bottomTitle:"Things you're growing",bottomDetail:`${plants.length} plants · ${projects.length} creative projects. Only logged work counts as done.`});
 }else if(page==="vault"){
  return visualVaultHubModel(base);
 }else if(page==="budget"){
  return visualBudgetHubModel(base);
 }else if(page==="settings"){
  return visualSettingsHubModel(base);
 }else if(page==="spirituality"){
  const log=typeof spiritualityLogFor==="function"?spiritualityLogFor()||{}:{},steps=["reading","tarot","stillness","ritual"],done=steps.filter(k=>log[k]).length,revealed=typeof tarotRevealed==="function"?tarotRevealed():false,card=typeof tarotForDate==="function"?tarotForDate():null;
  Object.assign(base,{title:"Spirituality",subtitle:"Tarot, moon and reflection",addLabel:"+ Journal",addAction:"openSpiritualJournal()",
   focusLabel:"TODAY'S REFLECTION",focusTitle:revealed?card?.name||"Explore your card":"Reveal today's tarot card",focusNote:"A space for reflection, not a prediction or an obligation.",
   focusAction:"openSpiritualHubSection('tarot')",progress:vhProgress(done,steps.length,"Practices marked today"),
   metrics:[m("☾","Tarot",revealed?"Revealed":"Face down","openSpiritualHubSection('tarot')"),m("◇","Spread","1 · 3 · 5","openSpiritualHubSection('spread')"),m("▤","Journal",(s.spiritualityJournal||[]).length+" entries","openSpiritualHubSection('journal')"),m("✦","Reading","Daily","openSpiritualHubSection('reading')")],
   links:[vhLink("Daily reading","✦","openSpiritualHubSection('reading')"),vhLink("Tarot","☾","openSpiritualHubSection('tarot')"),vhLink("Card spread","◇","openSpiritualHubSection('spread')"),vhLink("Moon","☾","openSpiritualHubSection('moon')"),vhLink("Rituals","❧","openSpiritualHubSection('rituals')"),vhLink("Practice","○","openSpiritualHubSection('practice')"),vhLink("Journal","▤","openSpiritualHubSection('journal')"),vhLink("History","↕","openSpiritualHubSection('history')")],
   bottomTitle:"Reflection at your pace",bottomDetail:"Explore a card, write a thought, or simply enjoy the Moon reading."});
 }
 return base;
}

function visualHubView(page){
 const c=visualHubModel(page);if(!c.title)return"";
 const progress=c.progress,usable=!!(progress&&progress.total),percent=usable?Math.min(100,Math.round(100*progress.done/progress.total)):null,main=progress?(usable?percent+"%":"—"):c.mainValue||"—";
 const meterText=progress?(usable?`${progress.done} / ${progress.total} ${page==="more"?"in next 30d":page==="home"?"planned":"marked"}`:"No items tracked yet"):c.mainLabel;
 const meterActions={home:"openFoodHubSection('week')",more:"openMoneyHubSection('bills')",log:"openCareHubSection('water')",reading:"openReadingHubSection('today')",family:"openPeopleHubSection('routines')",household:"openHouseholdSection('cleaning')",pets:"openPetsHubSection('history')",inventory:"openInventoryHubSection('items')",garden:"openGardenHobbySection('tasks')",hobbies:"openGardenHobbySection('tasks')",gardenhobbies:"openGardenHobbySection('tasks')",spirituality:"openSpiritualHubSection('practice')",budget:"openBudgetHubSection('plan')",settings:"openSettingsHubSection('backup')",vault:"openVaultHubSection('all')"};
 const mainAction=page==="itinerary"?"openDayFlowSection('plan','"+(itineraryDate||ymd())+"')":meterActions[page]||c.focusAction;
 const tiles=(c.metrics||[]).map((x,i)=>`<button type="button" class="vh-orb vh-orb-${i+1}" onclick="${x.action}" aria-label="${esc(x.label)}: ${esc(x.value)}"><span class="vh-orb-icon">${x.icon}</span><b>${esc(x.label)}</b><strong>${esc(x.value)}</strong></button>`).join("");
 const displayedLinks=(c.links||[]).slice(0,4),moreLinks=(c.links||[]).slice(4);
 const allLinks=arr=>arr.map(x=>`<button type="button" onclick="${x.action}" class="vh-link"><span>${x.icon}</span><b>${esc(x.label)}</b><span aria-hidden="true">›</span></button>`).join("");
 const bars=c.bars||[],max=Math.max(1,...bars.map(x=>x.value)),graph=bars.length?`<div class="vh-graph" role="img" aria-label="${esc(c.barTitle)}">${bars.map(x=>`<div class="vh-bar-column ${x.known===false?"vh-untracked":""}" title="${esc(x.date)}: ${x.known===false?"no record":x.value+" logged"}"><div class="vh-bar-track"><span style="height:${Math.max(0,Math.min(100,Math.round(100*x.value/max)))}%"></span></div><small>${esc(new Date(x.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"}).slice(0,2))}</small></div>`).join("")}</div>`:"";
 const titleSuffix=page==="budget"?`<div class="vh-day-picker"><button type="button" onclick="changeBudgetMonth(-1)" aria-label="Previous month">←</button><span class="vh-month-label">${esc(new Date(budgetMonth+"-01T12:00:00").toLocaleDateString("en-US",{month:"short",year:"numeric"}))}</span><button type="button" onclick="changeBudgetMonth(1)" aria-label="Next month">→</button></div>`:page==="itinerary"?`<div class="vh-day-picker"><button type="button" onclick="shiftItineraryDate(-1)" aria-label="Previous day">←</button><button type="button" onclick="setItineraryDate(ymd())">Today</button><button type="button" onclick="shiftItineraryDate(1)" aria-label="Next day">→</button></div>`:"";
 return `<section class="visual-hub visual-hub-${esc(page)}" aria-label="${esc(c.title)} dashboard">
  <div class="vh-heading"><div><div class="eyebrow">${esc(c.title.toUpperCase())} AT A GLANCE</div><h1>${esc(c.title)}</h1><p>${esc(c.subtitle)}</p></div><button type="button" class="btn primary vh-add" onclick="${c.addAction}">${esc(c.addLabel)}</button></div>
  ${titleSuffix}
  <div class="vh-focus"><div class="eyebrow">${esc(c.focusLabel)}</div><h2>${esc(c.focusTitle)}</h2><p>${esc(c.focusNote)}</p><div class="vh-focus-actions"><button type="button" class="btn primary" onclick="${c.focusAction}">${esc(c.focusButton)} ›</button>${c.focusExtra?`<button type="button" class="vh-focus-extra" onclick="${c.focusExtra.action}">${esc(c.focusExtra.label)}</button>`:""}</div></div>
  <div class="vh-summary">
   <button type="button" class="vh-main-dial" style="--vh-one:${percent===null?0:Math.round(percent*.38)}%;--vh-two:${percent===null?0:Math.round(percent*.72)}%;--vh-progress:${percent===null?0:percent}%" onclick="${mainAction}" aria-label="${esc(progress?.label||c.mainLabel)}: ${esc(meterText)}">
    <span class="vh-dial-inner"><small>✧</small><strong>${main}</strong><b>${esc(progress?.label||c.mainLabel)}</b><span>${esc(meterText)}</span></span></button>
   <div class="vh-orbs">${tiles}</div>
  </div>
  <div class="vh-lower"><div class="vh-brief"><div class="vh-minor-heading">${esc(graph?c.barTitle:c.bottomTitle)}</div>${graph}<p>${esc(c.bottomDetail)}</p></div><div class="vh-shortcuts"><div class="vh-minor-heading">Open a section</div><div class="vh-links">${allLinks(displayedLinks)}</div></div></div>
  ${moreLinks.length?`<details class="vh-more"><summary>More tools <span>⌄</span></summary><div class="vh-links">${allLinks(moreLinks)}</div></details>`:""}
 </section>`;
}
function visualBudgetHubModel(base){
 const t=budgetTotals(),month=budgetMonth||ymd().slice(0,7),
       monthLabel=new Date(month+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"}),
       categoryCount=BUDGET_CATEGORIES.filter(cat=>budgetCents(t.plan.limits[cat.id])>0).length,
       focusTitle=t.plan.income===null?"Set expected income":t.remaining<0?"Review money shortfall":t.left<0?"Rebalance category limits":"Review spending pace",
       focusNote=t.plan.income===null?"Add income before planning flexible spending.":t.remaining<0?"Your current plan needs attention; check upcoming bills.":t.left<0?"More is assigned than planned.":"See the budget plan and what remains unassigned.",
       focusAction=t.plan.income===null?"openBudgetHubSection('plan')":t.remaining<0?"openBudgetHubSection('bills')":t.left<0?"openBudgetHubSection('categories')":"openBudgetHubSection('activity')";
 Object.assign(base,{title:"Budget",subtitle:monthLabel+" · Plan without the clutter",addLabel:"+ Spending",addAction:"openBudgetSpending()",
 focusLabel:"BUDGET FOCUS",focusTitle,focusNote,focusAction,mainValue:t.plan.income===null?"—":budgetMoney(t.left),mainLabel:"Left to assign",
 metrics:[{icon:"↥",label:"Income",value:t.plan.income===null?"Not set":budgetMoney(t.income),action:"openBudgetHubSection('plan')"},
 {icon:"▤",label:"Bills",value:t.bills.length+" recorded",action:"openBudgetHubSection('bills')"},
 {icon:"◫",label:"Categories",value:categoryCount+" funded",action:"openBudgetHubSection('categories')"},
 {icon:"↕",label:"Activity",value:t.logs.length+" entries",action:"openBudgetHubSection('activity')"}],
 links:[vhLink("Plan","✦","openBudgetHubSection('plan')"),vhLink("Bills","▤","openBudgetHubSection('bills')"),vhLink("Categories","◫","openBudgetHubSection('categories')"),vhLink("Activity","↕","openBudgetHubSection('activity')"),vhLink("Expected income","↥","openBudgetIncome()"),vhLink("Log spending","＋","openBudgetSpending()"),vhLink("Previous month","←","changeBudgetMonth(-1)"),vhLink("Next month","→","changeBudgetMonth(1)")],
 bottomTitle:"Monthly plan",bottomDetail:"Amounts come from your saved budget. Open Plan to review income, benefits and transfers."});
 return base;
}

function visualSettingsHubModel(base){
 const s=state,user=typeof cloudUser==="function"?cloudUser():null,remote=typeof cloudRemoteUpdatedAt!=="undefined"&&!!cloudRemoteUpdatedAt,
 exportAt=localStorage.getItem("dailyLifeLastExportAt"),copies=Number(!!remote)+Number(!!exportAt),
 health=typeof systemHealthChecks==="function"?systemHealthChecks():{issues:[]},
 recurring=(s.settings?.recurringTasks||[]).length,shared=typeof sharingConnected==="function"&&sharingConnected();
 Object.assign(base,{title:"Settings",subtitle:"Make Daily Life work for you",addLabel:"✓ Today",addAction:"setView('today')",
 focusLabel:"DATA SAFETY",focusTitle:health.issues.length?`${health.issues.length} checks worth reviewing`:copies?"Review your recovery options":"Protect your Daily Life data",
 focusNote:copies?`${copies} recorded recovery path${copies===1?"":"s"}; check dates and make a fresh backup when needed.`:"No recorded cloud snapshot or manual backup in the app's current status.",
 focusAction:health.issues.length?"openSettingsHubSection('system')":"openSettingsHubSection('backup')",
 mainValue:String(copies),mainLabel:"Recovery paths",
 metrics:[{icon:"☁",label:"Cloud",value:user?"Signed in":"Not signed in",action:"openSettingsHubSection('cloud')"},
 {icon:"↻",label:"Routines",value:recurring+" recurring",action:"openSettingsHubSection('routines')"},
 {icon:"♡",label:"Sharing",value:shared?"On":"Optional",action:"openSettingsHubSection('sharing')"},
 {icon:"✓",label:"System",value:health.issues.length+" issues",action:"openSettingsHubSection('system')"}],
 links:[vhLink("Routines","↻","openSettingsHubSection('routines')"),vhLink("Preferences","✦","openSettingsHubSection('preferences')"),vhLink("Cloud","☁","openSettingsHubSection('cloud')"),vhLink("Backups","⇩","openSettingsHubSection('backup')"),vhLink("Connections","⌁","openSettingsHubSection('connections')"),vhLink("Sharing","♡","openSettingsHubSection('sharing')"),vhLink("Meal patterns","◇","openSettingsHubSection('meals')"),vhLink("System check","✓","openSettingsHubSection('system')")],
 bottomTitle:"Private data",bottomDetail:"Cloud status and local export history are separate; one does not replace the other."});
 return base;
}

function visualVaultHubModel(base){
 if(typeof vaultUnlocked==="undefined"||!vaultUnlocked)return base;
 if(typeof vaultTouch==="function")vaultTouch();
 const items=Array.isArray(vaultData?.items)?vaultData.items:[],
 count=key=>typeof vaultHubItems==="function"?vaultHubItems(key).length:0,
 cloud=typeof vaultCloudUpdatedAt!=="undefined"&&!!vaultCloudUpdatedAt;
 Object.assign(base,{title:"Private Vault",subtitle:"Encrypted records · you and children",addLabel:"🔒 Lock",addAction:"vaultLock()",
 focusLabel:"PRIVATE + UNLOCKED",focusTitle:`${items.length} encrypted record${items.length===1?"":"s"}`,
 focusNote:"Open your records or add a document. Lock when you're finished.",focusAction:"openVaultHubSection('all')",
 focusButton:"Open records",mainValue:String(items.length),mainLabel:"Records saved",
 metrics:[{icon:"●",label:"Logins",value:count("logins")+" saved",action:"openVaultHubSection('logins')"},
 {icon:"◇",label:"Identity",value:count("identity")+" saved",action:"openVaultHubSection('identity')"},
 {icon:"▤",label:"School",value:count("school")+" saved",action:"openVaultHubSection('school')"},
 {icon:"▣",label:"Documents",value:count("documents")+" files",action:"openVaultHubSection('documents')"}],
 links:[vhLink("All records","▦","openVaultHubSection('all')"),vhLink("Add record","＋","openVaultItem()"),vhLink("Medical","♡","openVaultHubSection('medical')"),vhLink("Insurance","▣","openVaultHubSection('insurance')"),vhLink("Backups","↥","openVaultHubSection('backup')"),vhLink("Security","⌾","openVaultHubSection('security')"),vhLink("Identity","◇","openVaultHubSection('identity')"),vhLink("Lock now","🔒","vaultLock()")],
 bottomTitle:"Encrypted storage",bottomDetail:cloud?"Encrypted cloud backup status is available under Backups.":"Open Backups to review your encrypted copy options."});
 return base;
}

window.visualHubView=visualHubView;
