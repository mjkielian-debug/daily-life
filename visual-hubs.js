/* Daily Life · reusable visual hubs. All figures are derived from saved records; no records are fabricated. */
function vhLink(label,icon,action){return {label,icon,action}}

function vhProgress(done,total,label){return {done:Math.max(0,Number(done)||0),total:Math.max(0,Number(total)||0),label}}

function visualHubModel(page){
 const s=state,day=ymd(),seven=shiftDateString(day,7),kids=(s.settings?.familyMembers||[]).length;
 const base={page,title:"",subtitle:"",addLabel:"",addAction:"",focusLabel:"DO NEXT",focusTitle:"",focusNote:"",focusAction:"",focusButton:"Open details",focusExtra:null,progress:null,mainValue:null,mainLabel:"",metrics:[],links:[],bottomTitle:"Explore",bottomDetail:"Choose an area to open details.",bars:[],barTitle:""};
 const m=(icon,label,value,action)=>({icon,label,value:String(value),action});
 const b=(date,value,known=true)=>({date,value:Math.max(0,Number(value)||0),known});
 if(page==="family"){
  const chores=displayChoresForDate(day),done=chores.filter(x=>x.done).length,events=(typeof dedupeEventList==="function"?dedupeEventList(s.events||[]):(s.events||[])).filter(x=>x.date>=day&&x.date<=seven&&x.status!=="cancelled");
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
  base.bars=Array.from({length:7},(_,i)=>{const dt=shiftDateString(day,i-6),r=displayChoresForDate(dt);return b(dt,r.length?Math.round(100*r.filter(x=>x.done).length/r.length):0,r.length>0)});
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
   metrics:[m("▤","Bills",outstanding+" unpaid","openMoneyHubSection('bills')"),m("!","Review",urgent.length?urgent.length+" near-term":"See bills","openMoneyHubSection('transfers')"),m("◇","Accounts",(s.accounts||[]).length+" tracked","openMoneyHubSection('accounts')"),m("✦","Goals",(s.settings?.financialRoadmap||[]).length+" plans","openMoneyHubSection('goals')")],
   links:[vhLink("Bills","▤","openMoneyHubSection('bills')"),vhLink("Budget","◫","openMoneyHubSection('budget')"),vhLink("Goals","✦","openMoneyHubSection('goals')"),vhLink("Accounts","◇","openMoneyHubSection('accounts')"),vhLink("Transfers","↔","openMoneyHubSection('transfers')"),vhLink("Income","↥","openMoneyHubSection('income')"),vhLink("Savings","♡","openMoneyHubSection('savings')"),vhLink("UPS pay","▣","openMoneyHubSection('pay')"),vhLink("Spending","↕","openMoneyHubSection('spending')")],
   bottomTitle:"Bills ahead",bottomDetail:`${outstanding} unpaid bill${outstanding===1?"":"s"} due within 30 days. Tap Bills for dates and amounts.`,barTitle:"Bills due · next 7 days"});
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
  const dt=itineraryDate||day,items=typeof itineraryDayItems==="function"?itineraryDayItems(dt):[],active=items.filter(x=>x.kind!=="gap"&&!x.nonBlocking&&(x.source==="task"||x.source==="custom")&&!!x.sourceId),done=active.filter(x=>x.done).length,loose=typeof itineraryTaskCandidates==="function"?itineraryTaskCandidates(dt).length:0;
  const current=typeof dayFlowCurrentItem==="function"?dayFlowCurrentItem(dt,items):null,conflicts=typeof dayFlowConflictAudit==="function"?dayFlowConflictAudit(dt):{hardCount:0};
  const isCurrent=dt===day;
  Object.assign(base,{title:"Day Flow",subtitle:dt+" · Your day in motion",addLabel:"+ Block",addAction:`openItineraryBlock('${dt}')`,focusLabel:isCurrent?"NOW / NEXT":"DAY FOCUS",focusTitle:current?.title||"Plan an open block",
   focusNote:current?.start?fmtClock(current.start)+(current.end?" – "+fmtClock(current.end):""):"No timed block selected. Open the planner.",
   focusAction:`openDayFlowSection('plan','${dt}')`,progress:vhProgress(done,active.length,"Trackable blocks checked"),
   metrics:[m("◷","Blocks",active.length+" placed",`openDayFlowSection('plan','${dt}')`),m("?","Loose",loose+" tasks",`openDayFlowSection('unscheduled','${dt}')`),m("!","Conflicts",conflicts.hardCount+" to review",`openDayFlowSection('plan','${dt}')`),m("＋","New","Add block",`openItineraryBlock('${dt}')`)],
   links:[vhLink("Plan day","◷",`openDayFlowSection('plan','${dt}')`),vhLink("Unscheduled","?",`openDayFlowSection('unscheduled','${dt}')`),vhLink("Morning","☀",`openDayFlowSection('morning','${dt}')`),vhLink("Afternoon","✦",`openDayFlowSection('afternoon','${dt}')`),vhLink("Evening","☾",`openDayFlowSection('evening','${dt}')`),vhLink("Add block","＋",`openItineraryBlock('${dt}')`),vhLink("Previous day","←","shiftItineraryDate(-1)"),vhLink("Next day","→","shiftItineraryDate(1)")],
   bottomTitle:"Day scheduling",bottomDetail:`${loose} task${loose===1?"":"s"} may still need a time. ${conflicts.hardCount} potential hard overlap${conflicts.hardCount===1?"":"s"}.`});
 }else if(page==="household"){
  const tasks=(s.tasks||[]).filter(x=>x.date===day&&String(x.category||"").toLowerCase()==="home"),done=tasks.filter(x=>x.done).length,petDue=typeof duePetRoutines==="function"?duePetRoutines():[];
  Object.assign(base,{title:"Home + household",subtitle:"Rooms, resets and pet care",addLabel:"+ Home log",addAction:"openHome()",
   focusLabel:"HOME TODAY",focusTitle:petDue.length?`${petDue.length} pet care routines due`:tasks.length?`${tasks.length-done} home tasks open`:"Choose a quick home reset",
   focusNote:petDue.length?"See which care routines are due.":tasks.length?`${done} of ${tasks.length} home tasks checked.`:"Map your rooms or open cleaning routines.",
   focusAction:petDue.length?"openHouseholdSection('petcare')":"openHouseholdSection('cleaning')",progress:vhProgress(done,tasks.length,"Home tasks marked today"),
   metrics:[m("⌂","House map","View floors","openHouseholdSection('map')"),m("▦","Inventory",(s.inventoryItems||[]).length+" items","openHouseholdSection('inventory')"),m("♡","Pets",(s.pets||[]).filter(x=>x.status!=="Archived").length+" active","openHouseholdSection('pets')"),m("✓","Resets",(s.homeLogs||[]).filter(x=>x.date===day&&x.status==="done").length+" logged","openHouseholdSection('cleaning')")],
   links:[vhLink("House map","⌂","openHouseholdSection('map')"),vhLink("Cleaning","✓","openHouseholdSection('cleaning')"),vhLink("Inventory","▦","openHouseholdSection('inventory')"),vhLink("Pet care","♡","openHouseholdSection('petcare')"),vhLink("Rooms","◫","openHouseholdSection('rooms')"),vhLink("Supplies","◇","openHouseholdSection('supplies')"),vhLink("Home log","↕","openHouseholdSection('log')"),vhLink("Pets","♢","openHouseholdSection('pets')")],
   bottomTitle:"House at a glance",bottomDetail:`Your private floor maps are under House map. ${(s.houseRooms||[]).length} local room inventory list${(s.houseRooms||[]).length===1?"":"s"} · ${(s.inventoryItems||[]).length} locally cataloged item${(s.inventoryItems||[]).length===1?"":"s"}.`});
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
   focusLabel:low?"STOCK ATTENTION":"ORGANIZING START",focusTitle:low?`${low} item${low===1?"":"s"} marked low / needed`:all.length?"Find something in your home":"Sort your first paper stack",
   focusNote:low?"Open the flagged items and restock only what is needed.":"Use Paper Studio to organize and decide what to keep; Art Books preserve children's work.",
   focusAction:low?"openInventoryLowStock()":all.length?"openInventoryHubSection('items')":"openPaperStudio()",focusButton:low?"Review stock":all.length?"View inventory":"Open Paper Studio",mainValue:String(all.length),mainLabel:"Items tracked",
   metrics:[m("!","Low / need",low+" flagged","openInventoryLowStock()"),m("⌂","House map","Open floors","openInventoryHubSection('map')"),m("◇","Storage",(s.inventoryLocations||[]).length+" spots","openInventoryHubSection('map')"),m("◫","Categories",new Set(all.map(x=>x.category).filter(Boolean)).size+" used","openInventoryHubSection('items')")],
   links:[vhLink("Papers","✎","openPaperStudio()"),vhLink("Art Books","🎨","openArtLibrary()"),vhLink("All items","▦","openInventoryHubSection('items')"),vhLink("House map","⌂","openInventoryHubSection('map')"),vhLink("Low stock","!","openInventoryLowStock()"),vhLink("Add item","＋","openInventoryItem()"),vhLink("Add room","◫","openInventoryRoom()"),vhLink("Location","◇","openInventoryLocation()"),vhLink("Supplies","▤","openHouseholdSection('supplies')"),vhLink("Household","⌂","setView('household')")],
   bottomTitle:"House map + inventory",bottomDetail:`Room positions live in your private floor maps. ${rooms.length} room inventory list${rooms.length===1?"":"s"} and ${(s.inventoryLocations||[]).length} local storage spot${(s.inventoryLocations||[]).length===1?"":"s"} so far.`});
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

function visualPaperArtShortcuts(page){
 if(page!=="inventory"&&page!=="household")return "";
 const papers=state.paperItems||[],art=state.kidArtworks||[];
 const review=papers.filter(x=>x.type==="review").length;
 const books=new Set(art.map(x=>x.child).filter(Boolean)).size;
 const paperDesc=papers.length?papers.length+" saved batch"+(papers.length===1?"":"es")+(review?" · "+review+" to sort":""):"Sort photos + documents";
 const artDesc=art.length?art.length+" saved piece"+(art.length===1?"":"s")+" · "+books+" child book"+(books===1?"":"s"):"4 children’s memory books";
 const importHint=page==="inventory"&&papers.length===0?'<div class="vh-paper-sync"><span>Already sent paper photos in ChatGPT? Import saved paper records to this phone.</span><button type="button" onclick="cloudPullLifeEntries(true)">Pull saved records ↻</button></div>':"";
 return '<section class="vh-paper-art" aria-label="Organize paper and art"><div class="vh-paper-art-heading"><b>Organize + remember</b><small>Papers and art count separately from regular inventory.</small></div><div class="vh-paper-art-links">'+
 '<button type="button" class="vh-paper-card" onclick="openPaperStudio()"><span class="vh-paper-icon">✎</span><span><b>Paper Studio</b><small>'+esc(paperDesc)+'</small></span><span aria-hidden="true">›</span></button>'+
 '<button type="button" class="vh-art-card" onclick="openArtLibrary()"><span class="vh-paper-icon">🎨</span><span><b>Art Books</b><small>'+esc(artDesc)+'</small></span><span aria-hidden="true">›</span></button></div>'+importHint+'</section>';
}


function dayFlowRangeMode(){try{return localStorage.getItem("dailyLifeDayFlowRange")||"day"}catch(e){return"day"}}
function setDayFlowRange(mode){try{localStorage.setItem("dailyLifeDayFlowRange",mode)}catch(e){}render()}
function dayFlowSelectDate(date){setItineraryDate(date);setDayFlowRange("day")}
function dayFlowDateLabel(date,options={weekday:"long",month:"long",day:"numeric"}){return new Date(date+"T12:00:00").toLocaleDateString(undefined,options)}
function dayFlowRangeMarkup(mode,date){
 const today=ymd(),tomorrow=shiftDateString(today,1),modes=[["day","Today"],["tomorrow","Tomorrow"],["week","This week"],["month","This month"]];
 const buttons=modes.map(([key,label])=>`<button type="button" class="df-range ${((mode==="day"&&date===today)||(mode==="tomorrow"&&date===tomorrow)||mode===key)?"selected":""}" onclick="${key==="day"?`setItineraryDate(ymd());setDayFlowRange('day')`:key==="tomorrow"?`setItineraryDate(shiftDateString(ymd(),1));setDayFlowRange('day')`:`setDayFlowRange('${key}')`}">${label}</button>`).join("");
 return `<div class="df-range-row" role="group" aria-label="Choose day range">${buttons}<label class="df-calendar">⌑ <span>Pick a date</span><input aria-label="Pick a calendar date" type="date" value="${esc(date)}" onchange="dayFlowSelectDate(this.value)"></label></div>`;
}
function dayFlowRoutineStrip(date){
 if(date!==ymd()||typeof selfCareHabits!=="function"||typeof dailyReviewStatus!=="function")return"";
 const habits=selfCareHabits();if(!habits.length)return"";
 const groups=[["morning","Morning"],["anytime","Anytime"],["evening","Evening"]];
 return `<section class="df-routines"><div class="df-section-head"><div><span class="df-kicker">ROUTINES</span><h2>Daily check-ins</h2></div><button type="button" onclick="openCareHubSection('self')">Open routines ›</button></div><div class="df-routine-grid">${groups.map(([key,label])=>{const rows=habits.filter(h=>(h.routine||"anytime")===key),done=rows.filter(h=>dailyReviewStatus("care",h.key,date)==="yes").length,unknown=rows.filter(h=>dailyReviewStatus("care",h.key,date)==="unknown").length,no=rows.filter(h=>dailyReviewStatus("care",h.key,date)==="no").length;return `<button type="button" class="df-routine" onclick="openCareHubSection('self')"><b>${label}</b><strong>${done}/${rows.length}</strong><small>${[unknown?unknown+" unmarked":"",no?no+" marked no":""].filter(Boolean).join(" · ")||"Done"}</small><span class="df-mini-track"><i style="width:${rows.length?Math.round(100*done/rows.length):0}%"></i></span></button>`}).join("")}</div><p>Unmarked check-ins stay unknown; they aren't counted as skipped.</p></section>`;
}
function dayFlowBlockMarkup(item,date,nowMinute){
 const start=hmMinutes(item.start),end=hmMinutes(item.end),active=date===ymd()&&start!==null&&end!==null&&start<=nowMinute&&nowMinute<end;
 const action=typeof dayFlowItemAction==="function"?dayFlowItemAction(item,date):`openDayFlowSection('plan','${date}')`;
 const label=typeof itineraryTypeLabel==="function"?itineraryTypeLabel(item):item.kind||"Block";
 return `<button type="button" class="df-block ${active?"current":""} ${item.kind==="gap"?"open":""} ${item.done?"done":""}" onclick="${action}"><span class="df-block-time">${item.start?fmtClock(item.start):"Flexible"}${item.end?`<small>${fmtClock(item.end)}</small>`:""}</span><span class="df-block-mark"></span><span class="df-block-content"><small>${esc(label)}${item.done?" · Done":""}</small><b>${esc(item.title||item.name||"Open time")}</b>${item.detail?`<span>${esc(item.detail)}</span>`:""}</span><span class="df-block-arrow">›</span></button>`;
}
function dayFlowWeekMonthOverview(mode,date){
 const selected=new Date(date+"T12:00:00"),base=new Date(selected);
 let dates=[];
 if(mode==="week"){
  base.setDate(base.getDate()-base.getDay());dates=Array.from({length:7},(_,i)=>shiftDateString(ymd(base),i));
 }else{
  base.setDate(1);const count=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();dates=Array.from({length:count},(_,i)=>shiftDateString(ymd(base),i));
 }
 const label=mode==="week"?`${dayFlowDateLabel(dates[0],{month:"short",day:"numeric"})} – ${dayFlowDateLabel(dates[6],{month:"short",day:"numeric",year:"numeric"})}`:selected.toLocaleDateString(undefined,{month:"long",year:"numeric"});
 return `<section class="df-range-overview"><div class="df-section-head"><div><span class="df-kicker">${mode==="week"?"WEEK VIEW":"MONTH VIEW"}</span><h2>${esc(label)}</h2></div><button type="button" onclick="setDayFlowRange('day')">Back to day ›</button></div><div class="df-date-grid ${mode==="month"?"month":"week"}">${dates.map(d=>{const items=itineraryDayItems(d),planned=items.filter(x=>x.kind!=="gap"&&!x.nonBlocking),first=planned[0];return `<button type="button" class="df-date-card ${d===date?"selected":""} ${d===ymd()?"today":""}" onclick="dayFlowSelectDate('${d}')"><small>${dayFlowDateLabel(d,{weekday:"short"})}</small><strong>${Number(d.slice(8))}</strong><span>${planned.length?planned.length+" blocks":"Open"}</span>${first?`<em>${esc(first.title||"Scheduled")}</em>`:""}</button>`}).join("")}</div><p>Choose any date to open its Day Flow.</p></section>`;
}
function dayFlowAtAGlance(date){
 if(date!==ymd())return"";
 const meal=typeof todayMeal==="function"?todayMeal():null,oz=typeof water==="function"?Math.round(water()):0;
 return `<section class="df-glance" aria-label="Today at a glance"><button type="button" onclick="openMeal('${date}')"><span>TONIGHT</span><b>${esc(meal?.dish||"Dinner not planned")}</b><small>Meal plan ›</small></button><button type="button" onclick="openCareHubSection('water')"><span>WATER</span><b>${oz} <small>/ 78 oz</small></b><small>Hydration log ›</small></button></section>`;
}
function dayFlowTimeline(date){
 const items=itineraryDayItems(date),now=new Date(),isToday=date===ymd(),nowMinute=isToday?now.getHours()*60+now.getMinutes():-1;
 const earlier=isToday?items.filter(x=>{const e=hmMinutes(x.end);return e!==null&&e<=nowMinute}):[];
 const later=isToday?items.filter(x=>{const s=hmMinutes(x.start),e=hmMinutes(x.end);return e!==null?e>nowMinute:s!==null&&s>=nowMinute}):items;
 const pastEnd=earlier.length?earlier[earlier.length-1].end:"";
 const timeLine=isToday?`<div class="df-now-line"><span class="df-now-dot"></span><b>NOW</b><time>${now.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</time><span class="df-now-rule"></span></div>`:"";
 const earlierBlock=earlier.length?`<details class="df-earlier"><summary>Earlier today · ${earlier.length} ${earlier.length===1?"block":"blocks"}</summary><div class="df-earlier-items">${earlier.map(x=>dayFlowBlockMarkup(x,date,nowMinute)).join("")}</div></details>`:"";
 return `<section class="df-timeline"><div class="df-section-head"><div><span class="df-kicker">${isToday?"LIVE TIMELINE":"DAY FLOW"}</span><h2>${esc(dayFlowDateLabel(date))}</h2></div><button type="button" onclick="openItineraryBlock('${date}')">＋ Add block</button></div>${timeLine}${earlierBlock}<div class="df-block-list">${later.length?later.map(x=>dayFlowBlockMarkup(x,date,nowMinute)).join(""):`<div class="df-open-time"><span>◷</span><div><b>The rest of the day is open</b><small>Add a block when you want to plan it.</small></div><button type="button" onclick="openItineraryBlock('${date}')">＋</button></div>`}</div><div class="df-timeline-footer"><button type="button" onclick="openDayFlowSection('plan','${date}')">Edit day plan ›</button><button type="button" onclick="openDayFlowSection('unscheduled','${date}')">Unscheduled tasks ›</button></div></section>${dayFlowRoutineStrip(date)}`;
}
function visualDayFlowView(){
 if(!window.dayFlowClockInterval)window.dayFlowClockInterval=setInterval(()=>{if(typeof view!=="undefined"&&(view==="today"||view==="itinerary")&&!document.querySelector("#modal")&&document.querySelector(".day-flow-dashboard"))render()},60000);
 const date=itineraryDate||ymd(),mode=dayFlowRangeMode();
 const subtitle=mode==="week"?"Your week, at a glance":mode==="month"?"Your month, at a glance":date===ymd()?"Your day, in motion":date===shiftDateString(ymd(),1)?"Tomorrow’s flow":"Your day, in motion";
 return `<section class="day-flow-dashboard"><style>.day-flow-dashboard{--df-ink:#292432;--df-soft:#756c7b;--df-line:#e9e2eb;--df-violet:#9574ad;--df-pink:#f4dfea;color:var(--df-ink)}.day-flow-dashboard h1,.day-flow-dashboard h2,.day-flow-dashboard p{margin:0}.df-glance{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 12px}.df-glance button{display:grid;gap:4px;text-align:left;background:#fff;border:1px solid var(--df-line);border-radius:15px;padding:11px;color:var(--df-ink)}.df-glance button>span{font-size:.63rem;font-weight:800;letter-spacing:.12em;color:var(--df-violet)}.df-glance button>b{font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.df-glance button>b small{font-size:.68rem;color:var(--df-soft)}.df-glance button>small{font-size:.7rem;color:var(--df-soft)}.df-heading,.df-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.df-heading{margin:10px 0 16px}.df-heading h1{font-size:1.7rem}.df-heading p,.df-section-head button,.df-timeline-footer button{color:var(--df-soft)}.df-kicker{font-size:.68rem;letter-spacing:.16em;font-weight:800;color:var(--df-violet)}.df-add,.df-section-head button,.df-timeline-footer button{border:0;border-radius:999px;padding:9px 13px;background:#f7eff8;font-weight:700}.df-range-row{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}.df-range,.df-calendar{border:1px solid var(--df-line);background:#fff;border-radius:999px;padding:9px 13px;font:inherit;font-size:.82rem;font-weight:700;color:var(--df-ink)}.df-range.selected{background:#30283a;color:white;border-color:#30283a}.df-calendar{position:relative;display:flex;gap:6px;align-items:center}.df-calendar input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.df-timeline,.df-routines,.df-range-overview{background:#fff;border:1px solid var(--df-line);border-radius:20px;padding:16px;margin:12px 0;box-shadow:0 8px 26px #34233b0b}.df-section-head{margin-bottom:13px}.df-section-head h2{font-size:1.05rem;margin-top:3px}.df-now-line{display:flex;align-items:center;gap:8px;margin:6px 0 4px;color:var(--df-violet);font-size:.73rem}.df-now-line time{font-size:.86rem;font-weight:800;color:var(--df-ink)}.df-now-rule{height:1px;background:#d9c5e4;flex:1}.df-now-dot{width:8px;height:8px;background:#a477b9;border-radius:50%;box-shadow:0 0 0 4px #f0e5f4}.df-block-list{position:relative}.df-block-list:before,.df-earlier-items:before{content:"";position:absolute;left:76px;top:8px;bottom:8px;width:1px;background:var(--df-line)}.df-block{position:relative;width:100%;display:grid;grid-template-columns:55px 16px minmax(0,1fr) 14px;gap:8px;align-items:start;text-align:left;padding:11px 0;border:0;border-bottom:1px solid #f1edf2;background:transparent;color:inherit;font:inherit}.df-block-time{font-size:.76rem;font-weight:800;text-align:right}.df-block-time small{display:block;font-size:.67rem;color:var(--df-soft);font-weight:500}.df-block-mark{width:9px;height:9px;margin:4px auto;background:#b5a3c4;border:2px solid #fff;box-shadow:0 0 0 1px #b5a3c4;border-radius:50%;z-index:1}.df-block.current .df-block-mark{background:#8c65a7;box-shadow:0 0 0 4px #f0e5f4}.df-block.open .df-block-mark{background:white;box-shadow:0 0 0 1px #c9c0cc}.df-block-content{display:grid;gap:3px;min-width:0}.df-block-content small{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--df-soft)}.df-block-content b{font-size:.94rem}.df-block-content>span{font-size:.78rem;color:var(--df-soft)}.df-block-arrow{color:#a79daa}.df-block.done .df-block-content b{text-decoration:line-through;opacity:.62}.df-earlier{margin:5px 0 9px;background:#faf8fb;border-radius:12px;padding:9px 11px}.df-earlier summary{color:var(--df-soft);font-size:.8rem;font-weight:700;cursor:pointer}.df-earlier-items{position:relative;margin-top:6px}.df-open-time{display:flex;align-items:center;gap:10px;padding:16px 0;color:var(--df-violet)}.df-open-time div{display:grid;gap:3px;flex:1;color:var(--df-ink)}.df-open-time small,.df-range-overview p,.df-routines>p{color:var(--df-soft);font-size:.78rem}.df-open-time button{width:36px;height:36px;border:0;border-radius:50%;background:var(--df-pink);font-size:1.15rem}.df-timeline-footer{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.df-routine-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.df-routine{display:grid;gap:4px;text-align:left;border:1px solid var(--df-line);border-radius:14px;padding:10px;background:#fff;color:var(--df-ink)}.df-routine b{font-size:.74rem}.df-routine strong{font-size:1.15rem}.df-routine small{font-size:.68rem;color:var(--df-soft)}.df-mini-track{height:5px;border-radius:8px;background:#eee8f0}.df-mini-track i{display:block;height:100%;border-radius:8px;background:#9b79ad}.df-routines>p{margin-top:9px}.df-date-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.df-date-card{min-width:0;min-height:86px;display:grid;align-content:start;justify-items:start;gap:3px;border:1px solid var(--df-line);border-radius:12px;padding:8px 6px;background:#fff;color:var(--df-ink);text-align:left}.df-date-card.today{border-color:#b48bc7}.df-date-card.selected{background:#f4e9f5;border-color:#9474aa}.df-date-card small,.df-date-card span,.df-date-card em{font-size:.62rem;color:var(--df-soft)}.df-date-card strong{font-size:1.05rem}.df-date-card em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.df-date-grid.month{grid-template-columns:repeat(7,minmax(0,1fr))}.df-range-overview>p{margin-top:12px}@media(max-width:450px){.df-date-card{min-height:70px;padding:6px 4px}.df-date-card small{font-size:.58rem}.df-date-card em{display:none}.df-timeline,.df-routines,.df-range-overview{padding:13px}.df-calendar span{display:none}}</style><header class="df-heading"><div><span class="df-kicker">YOUR DAY IN MOTION</span><h1>Day Flow</h1><p>${esc(subtitle)}</p></div><button type="button" class="df-add" onclick="openItineraryBlock('${date}')">＋ Block</button></header>${dayFlowRangeMarkup(mode,date)}${mode==="week"||mode==="month"?dayFlowWeekMonthOverview(mode,date):dayFlowAtAGlance(date)+dayFlowTimeline(date)}</section>`;
}
function visualSpiritualityView(){
 const s=state,today=ymd(),journal=s.spiritualityJournal||[],draws=s.tarotDraws||[],todayDraw=typeof tarotForDate==="function"?tarotForDate():null,revealed=typeof tarotRevealed==="function"&&tarotRevealed(),reading=typeof dailySpiritualReading==="function"?dailySpiritualReading(today):null,moonNow=typeof moon==="function"?moon():null,moonInfo=typeof moonLens==="function"?moonLens(moonNow):null,season=typeof spiritualitySeason==="function"?spiritualitySeason():null;
 const counts=Array.from({length:7},(_,i)=>{const date=shiftDateString(today,i-6);return{date,count:journal.filter(x=>(x.date||x.createdAt?.slice(0,10))===date).length+draws.filter(x=>(x.date||x.drawnAt?.slice(0,10))===date).length}}),max=Math.max(1,...counts.map(x=>x.count));
 return `<section class="spirit-dashboard"><style>.spirit-dashboard{color:#30283a}.spirit-dashboard h1,.spirit-dashboard h2,.spirit-dashboard p{margin:0}.spirit-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 16px}.spirit-heading h1{font-size:1.7rem}.spirit-heading p{color:#756c7b}.spirit-add,.spirit-link{border:0;border-radius:999px;padding:10px 14px;background:#f3e4ef;color:#30283a;font-weight:750}.spirit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.spirit-feature,.spirit-chart{background:#fff;border:1px solid #e8e0e9;border-radius:20px;padding:16px;box-shadow:0 8px 26px #34233b0b}.spirit-feature.primary{grid-column:span 2;background:linear-gradient(120deg,#fbf2f8,#f2e9f7)}.spirit-kicker{font-size:.66rem;letter-spacing:.15em;font-weight:800;color:#9270a6}.spirit-feature h2{font-size:1.12rem;margin:5px 0}.spirit-feature p{font-size:.82rem;color:#756c7b;line-height:1.45;margin-bottom:12px}.spirit-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.spirit-link{display:flex;align-items:center;gap:9px;text-align:left;border-radius:13px;background:#fff;border:1px solid #eee8ef}.spirit-link b{flex:1}.spirit-bars{height:135px;display:grid;grid-template-columns:repeat(7,1fr);align-items:end;gap:9px;margin:16px 0 8px}.spirit-bar{display:grid;justify-items:center;gap:6px;height:100%;align-content:end}.spirit-bar i{width:min(28px,75%);min-height:3px;border-radius:8px 8px 2px 2px;background:linear-gradient(#b78dc7,#e8bfdc)}.spirit-bar small{font-size:.65rem;color:#756c7b}.spirit-chart h2{font-size:1rem}.spirit-empty{color:#756c7b;font-size:.83rem;padding:15px 0}.spirit-trends{grid-column:span 2}@media(max-width:390px){.spirit-grid{grid-template-columns:1fr}.spirit-feature.primary,.spirit-trends{grid-column:auto}.spirit-links{grid-template-columns:1fr}}</style><header class="spirit-heading"><div><span class="spirit-kicker">TAROT · MOON · REFLECTION</span><h1>Spirituality</h1><p>A personal place for your readings, cards and notes.</p></div><button type="button" class="spirit-add" onclick="openSpiritualJournal()">＋ Journal</button></header><div class="spirit-grid"><article class="spirit-feature primary"><span class="spirit-kicker">TODAY’S TAROT</span><h2>${esc(revealed?(todayDraw?.name||"Your card is revealed"):"Today’s card is face down")}</h2><p>${esc(revealed?(todayDraw?.meaning||todayDraw?.prompt||"Return to your saved card reflection."):"Reveal your card when you are ready. It is a reflection prompt, not a prediction.")}</p><button type="button" class="spirit-add" onclick="openSpiritualHubSection('tarot')">${revealed?"Open card":"Explore tarot"} ›</button></article><article class="spirit-feature"><span class="spirit-kicker">DAILY READING</span><h2>${reading?"Today’s reading":"Reading for today"}</h2><p>${esc(reading?.body||"Open the daily reading and its saved history.")}</p><button type="button" class="spirit-add" onclick="openSpiritualHubSection('reading')">Daily reading ›</button></article><article class="spirit-feature"><span class="spirit-kicker">MOON + SEASON</span><h2>${esc(moonInfo?.sign||moonNow?.[0]||"Moon today")}</h2><p>${esc([moonInfo?.element,moonInfo?.phaseAction,season?.title].filter(Boolean).join(" · ")||"Open the current moon and seasonal reflections.")}</p><button type="button" class="spirit-add" onclick="openSpiritualHubSection('moon')">Moon notes ›</button></article><article class="spirit-chart spirit-trends"><span class="spirit-kicker">SAVED ACTIVITY</span><h2>Journal entries + tarot draws · last 7 days</h2><div class="spirit-bars" role="img" aria-label="Saved journal entries and tarot draws over the last seven days">${counts.map(x=>`<div class="spirit-bar" title="${esc(x.date)}: ${x.count} saved"><i style="height:${Math.max(3,Math.round(100*x.count/max))}%"></i><small>${esc(new Date(x.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"}).slice(0,2))}</small></div>`).join("")}</div><p>${journal.length} journal ${journal.length===1?"entry":"entries"} saved · ${draws.length} tarot ${draws.length===1?"draw":"draws"} in history.</p></article></div><nav class="spirit-links" aria-label="Spirituality sections">${[["tarot","☾","Tarot"],["spread","◇","Card spreads"],["journal","▤","Journal"],["history","↕","History"],["moon","◐","Moon"],["rituals","✧","Ritual notes"],["practice","○","Practice log"]].map(([key,icon,label])=>`<button class="spirit-link" type="button" onclick="openSpiritualHubSection('${key}')"><span>${icon}</span><b>${label}</b><span>›</span></button>`).join("")}</nav></section>`;
}

function visualHubView(page){
 if(page==="itinerary")return visualDayFlowView();
 if(page==="spirituality")return visualSpiritualityView();
 const c=visualHubModel(page);if(!c.title)return"";
 if(page==="family"&&typeof peopleProfileHomePage==="function")return peopleProfileHomePage();
 // Inventory should open to the real, usable inventory surface immediately.
 // The generic recommendation card and collapsed detail accordion hid the actual items.
 if(page==="inventory"&&typeof inventoryDetailedView==="function")return inventoryDetailedView();
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
  ${typeof actionFirstMarkup==="function"?actionFirstMarkup(page,c):`<div class="vh-focus"><div class="eyebrow">${esc(c.focusLabel)}</div><h2>${esc(c.focusTitle)}</h2><p>${esc(c.focusNote)}</p><div class="vh-focus-actions"><button type="button" class="btn primary" onclick="${c.focusAction}">${esc(c.focusButton)} ›</button>${c.focusExtra?`<button type="button" class="vh-focus-extra" onclick="${c.focusExtra.action}">${esc(c.focusExtra.label)}</button>`:""}</div></div>`}
  <details class="vh-explore" ${typeof actionFirstOverviewOpen==="function"&&actionFirstOverviewOpen(page)?"open":""} ontoggle="if(typeof actionFirstRememberOverview===\'function\')actionFirstRememberOverview(\'${esc(page)}\',this.open)"><summary>Progress, sections + full details</summary><div class="vh-explore-body">
  ${visualPaperArtShortcuts(page)}
  <div class="vh-summary">
   <button type="button" class="vh-main-dial" style="--vh-one:${percent===null?0:Math.round(percent*.38)}%;--vh-two:${percent===null?0:Math.round(percent*.72)}%;--vh-progress:${percent===null?0:percent}%" onclick="${mainAction}" aria-label="${esc(progress?.label||c.mainLabel)}: ${esc(meterText)}">
    <span class="vh-dial-inner"><small>✧</small><strong>${main}</strong><b>${esc(progress?.label||c.mainLabel)}</b><span>${esc(meterText)}</span></span></button>
   <div class="vh-orbs">${tiles}</div>
  </div>
  <div class="vh-lower"><div class="vh-brief"><div class="vh-minor-heading">${esc(graph?c.barTitle:c.bottomTitle)}</div>${graph}<p>${esc(c.bottomDetail)}</p></div><div class="vh-shortcuts"><div class="vh-minor-heading">Open a section</div><div class="vh-links">${allLinks(displayedLinks)}</div></div></div>
  ${moreLinks.length?`<details class="vh-more"><summary>More tools <span>⌄</span></summary><div class="vh-links">${allLinks(moreLinks)}</div></details>`:""}
  </div></details>
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
