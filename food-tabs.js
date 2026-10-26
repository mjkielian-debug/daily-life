/* Daily Life — compact Food tabs.
   Loaded after the main app script to replace the long Food/Home stack. */

let foodTab=localStorage.getItem("dailyLifeFoodTab")||"today";

function setFoodTab(tab){
  foodTab=["today","meals","shop","pantry"].includes(tab)?tab:"today";
  localStorage.setItem("dailyLifeFoodTab",foodTab);
  render();
}

function compactFoodTabs(){
  const tabs=[
    ["today","✦","Today"],
    ["meals","🍽","Meals"],
    ["shop","🛒","Shop"],
    ["pantry","◇","Pantry"]
  ];
  return `<div class="food-tabs" role="tablist" aria-label="Food sections">${tabs.map(([key,icon,label])=>`<button type="button" role="tab" aria-selected="${foodTab===key?"true":"false"}" class="${foodTab===key?"active":""}" onclick="setFoodTab('${key}')"><span>${icon}</span><b>${label}</b></button>`).join("")}</div>`;
}

function compactFoodDinnerTonight(){
  const d=ymd(),m=mealForDate(d),status=mealRecipeStatus(m),suggestion=latestMealSuggestion(d);
  let body="";
  if(m?.dish){
    body=`<div><b>${esc(m.dish)}</b><div class="muted small">${m.method?esc(m.method)+" · ":""}${status==="ready"?"recipe ready":status==="waiting"?"recipe needs cloud":"recipe building"}</div></div><button class="btn primary" onclick="openMeal('${d}')">Open dinner</button>`;
  }else if(suggestion){
    body=`<div><b>Dinner suggestion ready</b><div class="muted small">Review the idea chosen from the current kitchen plan.</div></div><button class="btn primary" onclick="openMeal('${d}')">Review</button>`;
  }else{
    body=`<div><b>Dinner is not chosen yet</b><div class="muted small">Choose it now so thawing, prep, and shopping can happen early enough.</div></div><div class="actions"><button class="btn primary" onclick="requestMealSuggestion('${d}')">Suggest</button><button class="btn" onclick="openMeal('${d}')">Choose</button></div>`;
  }
  return `<section class="food-inline-section"><div class="eyebrow">Tonight</div><div class="food-tonight-row">${body}</div></section>`;
}

function compactFoodMealsWeek(){
  const dates=week(),today=ymd(),remainingDates=dates.filter(d=>d>=today),
        remainingMeals=remainingDates.map(d=>state.meals.find(x=>x.date===d&&x.type==="dinner")).filter(Boolean),
        planned=remainingMeals.filter(m=>m.dish).length,
        ready=remainingMeals.filter(m=>m.dish&&mealRecipeStatus(m)==="ready").length,
        choosing=remainingMeals.filter(m=>!m.dish&&m.recipeState==="suggestion-queued").length;
  return `<section class="food-flat-section"><div class="section-title"><div><div class="eyebrow">Meal plan</div><h2>This week</h2><div class="muted small">${planned}/${remainingDates.length} remaining days planned · ${ready} recipes ready${choosing?` · ${choosing} being chosen`:""}</div></div><div class="actions"><button class="btn primary" onclick="requestWeekSuggestions()">Plan week</button><button class="btn" onclick="queueMissingMealRecipes().then(()=>render())">Build recipes</button></div></div>
    ${dates.map(d=>{const m=state.meals.find(x=>x.date===d&&x.type==="dinner"),rs=mealRecipeStatus(m),sg=latestMealSuggestion(d),past=d<today;return `<div class="food-meal-row ${past?"past-row":""}"><button class="food-meal-main" onclick="openMeal('${d}')"><span><b>${dl(d)}</b><small>${m?.method?esc(m.method):past?"Past":""}</small></span><span class="food-meal-dish">${m?.dish?`<span class="food-meal-dish-line">${m.photo?`<img src="${m.photo}" alt="">`:`<i aria-hidden="true">${mealVisualIcon(m.dish)}</i>`}<span>${esc(m.dish)}</span></span>`:past?"No meal logged":sg?"Suggestion ready":m?.recipeState==="suggestion-queued"?"Choosing…":"Not planned"}<small>${m?.dish?(rs==="ready"?"✓ recipe ready":rs==="waiting"?"cloud needed":"✨ building recipe"):""}</small></span></button>${!past&&!m?.dish&&!sg&&m?.recipeState!=="suggestion-queued"?`<button class="btn small" onclick="requestMealSuggestion('${d}')">Suggest</button>`:""}</div>`}).join("")}
  </section>`;
}

function compactFoodMealMemory(){
  const liked=[...new Set((state.mealFeedback||[]).filter(x=>Number(x.score)>0).sort((a,b)=>Number(b.score)-Number(a.score)).map(x=>x.dish))].slice(0,8);
  return `<section class="food-flat-section"><div class="eyebrow">♡ Meal memory</div><h2>What your family likes</h2>${liked.length?liked.map(d=>`<div class="row"><span>${esc(d)}</span><b>${feedbackScoreLabel(dishFeedbackScore(d))}</b></div>`).join(""):`<div class="muted small">Rate meals after dinner and Daily Life will learn what to repeat more often.</div>`}</section>`;
}

function compactFoodShopping(){
  const shop=neededShoppingGroups();
  return `<section class="food-flat-section"><div class="section-title"><div><div class="eyebrow">Shopping list</div><h2>${shop.length} item${shop.length===1?"":"s"} needed</h2><div class="muted small">Recipe ingredients and household needs can feed this list automatically.</div></div><button class="btn primary" onclick="openShopping()">+ Add</button></div>
    ${shop.length?shop.map(g=>`<div class="row grocery-row"><label class="task grow"><input type="checkbox" onchange='buyShoppingGroup(${JSON.stringify(g.ids)})'><span><b>${esc(g.item)}</b>${g.qty.length?" · "+esc([...new Set(g.qty)].join(" + ")):""}${g.meals.size?`<div class="muted small">For ${[...g.meals].map(esc).join(", ")}</div>`:""}${g.stores.size?`<div class="muted small">${[...g.stores].map(esc).join(" · ")}</div>`:""}${g.sources.size?`<div class="muted small">From: ${[...g.sources].map(s=>esc(s==="pet"?"Pets":s==="garden"?"Garden":s==="selfcare"?"Self care":s==="recipe"?"Meal plan":s)).join(" · ")}</div>`:""}</span></label><button class="btn small good" onclick='alreadyHaveShoppingGroup(${JSON.stringify(g.ids)})'>Have it</button></div>`).join(""):`<div class="muted small">Shopping list is clear.</div>`}
  </section>`;
}


function compactFoodCookingAhead(){
  const batch=typeof runzaCookingBatch==="function"?runzaCookingBatch():null;
  if(!batch)return"";
  const baked=String(batch.status||"").toLowerCase()==="made";
  return '<section class="food-inline-section food-cooking-ahead"><div class="food-cook-ring" aria-hidden="true">🥟</div>'+
    '<div class="food-cook-summary"><b>Runzas · cooked separately</b><small>'+ (baked?"Marked baked · serving date is still flexible":"Beef + cabbage filling prepared Oct 13 · bake when convenient")+'</small></div>'+
    '<button class="btn" onclick="openRunzaCookingBatch()">'+(baked?"View recipe":"Recipe + status")+' ›</button></section>';
}
function foodDailyGoal(setting,fallback){
  const configured=state.settings?.nutritionGoals||{},value=Number(configured[setting]??state.settings?.[setting]??fallback);
  return value>0?value:fallback;
}
function foodPantryItems(){
  return [...new Set((Array.isArray(state.pantry?.items)?state.pantry.items:[])
    .map(x=>typeof x==="string"?x.trim():String(x?.name||x?.item||"").trim()).filter(Boolean))];
}
function foodPantryRecommendation(rows,nutrients){
  const pantry=foodPantryItems(),had=name=>rows.some(x=>String(x.name||"").toLowerCase().includes(name.toLowerCase())),
    protein=nutrients.find(x=>x.label==="Protein"),fiber=nutrients.find(x=>x.label==="Fiber");
  if(protein?.known&&protein.value/protein.goal<.6){
    const matches=["P3 Turkey, Ham & Cheddar Protein Snack","Bumble Bee Chicken Salad & Crackers","Great Value Colby & Monterey Jack Snacking Cheese"],
      found=matches.map(key=>pantry.find(x=>x.toLowerCase().includes(key.toLowerCase()))).filter(Boolean).filter(x=>!had(x.split(",")[0])).slice(0,2);
    if(found.length)return "<section class=\"food-recommendation\"><b>Protein is your biggest tracked gap</b><div>From your pantry: "+found.map(esc).join(" <span>or</span> ")+"</div></section>";
  }
  if(fiber?.known&&fiber.value/fiber.goal<.6){
    const matches=["Romaine hearts","Avocados","Tomatoes","Bananas"],
      found=matches.map(key=>pantry.find(x=>x.toLowerCase().includes(key.toLowerCase()))).filter(Boolean).filter(x=>!had(x)).slice(0,2);
    if(found.length)return "<section class=\"food-recommendation\"><b>Fiber is still below its goal</b><div>Your pantry list includes "+found.map(esc).join(" or ")+"</div></section>";
  }
  return "<section class=\"food-recommendation quiet\"><b>Food idea</b><div>As more nutrition is logged, I can suggest an on-hand option for the biggest gap.</div></section>";
}
function foodGoalDashboardCard(){
  const f=foodTotalsForDate(ymd()),waterNow=Number(water())||0,
    configured=state.settings?.nutritionGoals||{},
    goal=(setting,fallback)=>{const n=Number(configured[setting]??state.settings?.[setting]??fallback);return n>0?n:fallback},
    keys={calcium:["calcium","calciumMg"],iron:["iron","ironMg"],potassium:["potassium","potassiumMg"],vitaminD:["vitaminD","vitamin_d","vitaminDMcg"],sodium:["sodium","sodiumMg"],addedSugar:["addedSugar","added_sugar","addedSugars"]},
    norm=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,""),
    itemValue=(row,aliases)=>{
      let raw;
      for(const key of aliases){if(row[key]!==undefined&&row[key]!==null&&String(row[key]).trim()!==""){raw=row[key];break}}
      if(raw===undefined){
        const micros=row.micronutrients&&typeof row.micronutrients==="object"?row.micronutrients:{},
          match=Object.entries(micros).find(([key])=>aliases.some(a=>norm(a)===norm(key)));
        if(match)raw=match[1];
      }
      if(raw===undefined)return{known:false,value:0};
      const value=typeof raw==="object"&&raw!==null?Number(raw.value):Number(raw);
      return Number.isFinite(value)?{known:true,value}:{known:false,value:0};
    },
    microTotal=name=>{
      let value=0,known=false;
      for(const row of f.rows){const found=itemValue(row,keys[name]);if(found.known){value+=found.value*foodQuantity(row);known=true}}
      return{value,known};
    },
    macroKnown=aliases=>f.rows.some(row=>aliases.some(key=>row[key]!==undefined&&row[key]!==null&&String(row[key]).trim()!=="")),
    nutrients=[
      {label:"Calories",value:f.cal,known:macroKnown(["calories","cal"]),goal:goal("calTarget",2100),unit:"cal"},
      {label:"Protein",value:f.protein,known:macroKnown(["protein","proteinG"]),goal:goal("proteinTarget",100),unit:"g"},
      {label:"Carbs",value:f.carbs,known:macroKnown(["carbs","carbohydrates","carbsG"]),goal:goal("carbsTarget",250),unit:"g"},
      {label:"Fat",value:f.fat,known:macroKnown(["fat","fatG"]),goal:goal("fatTarget",70),unit:"g"},
      {label:"Fiber",value:f.fiber,known:macroKnown(["fiber","fiberG"]),goal:goal("fiberTarget",28),unit:"g"},
      {label:"Water",value:waterNow,known:true,goal:goal("waterTarget",78),unit:"oz"},
      {label:"Calcium",...microTotal("calcium"),goal:goal("calciumTarget",1300),unit:"mg"},
      {label:"Iron",...microTotal("iron"),goal:goal("ironTarget",18),unit:"mg"},
      {label:"Potassium",...microTotal("potassium"),goal:goal("potassiumTarget",4700),unit:"mg"},
      {label:"Vitamin D",...microTotal("vitaminD"),goal:goal("vitaminDTarget",20),unit:"mcg"},
      {label:"Sodium",...microTotal("sodium"),goal:goal("sodiumLimit",2300),unit:"mg",limit:true},
      {label:"Added sugar",...microTotal("addedSugar"),goal:goal("addedSugarLimit",50),unit:"g",limit:true}
    ],
    bar=n=>{
      const pct=n.known?Math.max(0,n.value/n.goal*100):null,width=pct===null?0:Math.min(100,pct),
        current=n.known?(Math.round(n.value*10)/10).toLocaleString():"—",
        caption=n.known?current+" / "+n.goal.toLocaleString()+" "+n.unit:n.goal.toLocaleString()+" "+n.unit+" · no data",
        percent=pct===null?"—":Math.round(pct)+"%"+(n.limit?" of limit":""),
        aria=n.known?Math.round(n.value)+" of "+n.goal+" "+n.unit:n.label+" has no recorded value";
      return "<div class=\"food-goal-item\"><div class=\"food-goal-head\"><b>"+esc(n.label)+"</b><strong>"+percent+"</strong></div><div class=\"food-goal-number\">"+esc(caption)+"</div><div class=\"food-goal-meter\" role=\"progressbar\" aria-label=\""+esc(n.label+(n.limit?" daily limit":" daily goal"))+"\" aria-valuemin=\"0\" aria-valuemax=\""+n.goal+"\" "+(pct===null?"aria-valuetext=\""+esc(aria)+"\"":"aria-valuenow=\""+Math.min(n.goal,Math.round(n.value))+"\" aria-valuetext=\""+esc(aria)+"\"")+"><i style=\"width:"+width+"%\"></i></div></div>";
    },
    estimated=f.rows.some(x=>!!x.nutritionEstimated),
    incomplete=f.rows.some(x=>!x.nutritionEstimated&&/not estimated|unknown|not confirmed|not available/i.test(String(x.notes||""))),
    foods=f.rows.slice().reverse().map(x=>"<div class=\"food-eaten-item\"><span>"+esc(x.name||"Food / drink")+"</span><b>"+(foodQuantity(x)>1?"×"+foodQuantity(x):"")+(x.nutritionEstimated?" ≈":"")+"</b></div>").join("");
  return "<div class=\"card food-intake-card\"><div class=\"food-intake-head\"><div><div class=\"eyebrow\">Today’s intake</div><h2>What you’ve had</h2></div><button class=\"btn primary\" onclick=\"openFood()\">+ Log food</button></div>"+
    (foods?"<div class=\"food-eaten-list\">"+foods+"</div>":"<div class=\"muted small\">Nothing logged yet today.</div>")+
    (estimated||incomplete?"<div class=\"food-data-note\">≈ Estimates shown · missing nutrition stays unknown</div>":"")+
    foodPantryRecommendation(f.rows,nutrients)+
    "<section class=\"food-goal-section\"><div class=\"food-goal-section-head\"><h3>Daily goal progress</h3><span>Sodium + added sugar are limits</span></div>"+
    "<div class=\"food-goal-group\"><h4>Calories, macros + water</h4><div class=\"food-goal-grid\">"+nutrients.slice(0,6).map(bar).join("")+"</div></div>"+
    "<details class=\"food-micro-fold\"><summary>Vitamins, minerals + limits <span>Show</span></summary><div class=\"food-goal-grid\">"+nutrients.slice(6).map(bar).join("")+"</div></details></section>"+
    "<div class=\"actions food-intake-actions\"><button class=\"btn\" onclick=\"customWater()\">+ Water</button><button class=\"btn\" onclick=\"openFoodTrendsFromIntake()\">7-day trends</button></div></div>";
}

(function installFoodGoalProgressStyles(){
  if(document.getElementById("foodGoalProgressStyles"))return;
  const style=document.createElement("style");style.id="foodGoalProgressStyles";
  style.textContent=".food-intake-card{padding:12px!important}.food-intake-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.food-intake-head h2{font-size:1.05rem;margin:1px 0}.food-intake-head .btn{white-space:nowrap;padding:8px 10px;font-size:.75rem}.food-eaten-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.food-eaten-item{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:7px 8px;border-radius:10px;background:color-mix(in srgb,var(--primary) 8%,var(--panel));font-size:.72rem;min-width:0}.food-eaten-item span{overflow-wrap:anywhere}.food-eaten-item b{color:var(--secondary);white-space:nowrap}.food-data-note{font-size:.65rem;color:var(--muted);margin:6px 0}.food-recommendation{margin:9px 0;padding:9px 10px;border-left:3px solid var(--secondary);border-radius:9px;background:color-mix(in srgb,var(--secondary) 9%,var(--panel));font-size:.72rem}.food-recommendation b{display:block;margin-bottom:3px}.food-recommendation span{color:var(--muted);font-size:.65rem}.food-recommendation.quiet{color:var(--muted)}.food-goal-section{margin-top:9px}.food-goal-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.food-goal-section-head h3{font-size:.95rem;margin:0}.food-goal-section-head span{font-size:.6rem;color:var(--muted)}.food-goal-group{margin-top:6px}.food-goal-group h4{font-size:.72rem;margin:0 0 5px;color:var(--muted)}.food-goal-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px 12px!important}.food-goal-item{min-width:0;padding:5px 0!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--primary) 13%,var(--border))!important;border-radius:0!important;background:transparent!important}.food-goal-head{display:flex;justify-content:space-between;align-items:center;gap:4px;min-height:0}.food-goal-head b{font-size:.7rem}.food-goal-head strong{font-size:.66rem;color:var(--secondary)}.food-goal-number{font-size:.63rem;color:var(--muted);margin-top:2px}.food-goal-meter{height:6px;margin:4px 0 0;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--text) 13%,transparent)}.food-goal-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--primary),var(--secondary));transition:width .25s ease}.food-micro-fold{margin-top:7px;border-top:1px solid var(--border);padding-top:6px}.food-micro-fold summary{list-style:none;display:flex;justify-content:space-between;cursor:pointer;font-size:.72rem;font-weight:800}.food-micro-fold summary::-webkit-details-marker{display:none}.food-micro-fold summary span{color:var(--secondary);font-size:.67rem}.food-micro-fold[open] summary span{font-size:0}.food-micro-fold[open] summary span:after{content:'Hide';font-size:.67rem}.food-micro-fold>.food-goal-grid{margin-top:5px}.food-intake-actions{margin-top:8px;gap:6px}.food-intake-actions .btn{padding:8px 10px;font-size:.72rem}@media(max-width:380px){.food-goal-grid,.food-eaten-list{grid-template-columns:1fr!important}}";;
  document.head.appendChild(style);
})();

// Use the compact goal-bar dashboard in every Food intake entry point, including the Intake modal.
todayNutritionCard=foodGoalDashboardCard;
function openFoodTrendsFromIntake(){
  closeModal();
  requestAnimationFrame(()=>openFoodHubSection("trends"));
}
let foodTrendMetric=localStorage.getItem("dailyLifeFoodTrendMetric")||"calories";
function foodTrendValue(metric,date){
  const totals=foodTotalsForDate(date);
  if(metric==="water"){
    const logs=(state.waterLogs||[]).filter(x=>x.date===date);
    return logs.length?logs.reduce((sum,x)=>sum+Number(x.oz||0),0):null;
  }
  const aliases={calories:["calories","cal"],protein:["protein","proteinG"],carbs:["carbs","carbohydrates","carbsG"],fat:["fat","fatG"],fiber:["fiber","fiberG"]}[metric]||[],
    known=totals.rows.some(row=>aliases.some(key=>row[key]!==undefined&&row[key]!==null&&String(row[key]).trim()!==""));
  return known?Number(totals[metric]||0):null;
}
function setFoodTrendMetric(metric){
  if(!["calories","protein","carbs","fat","fiber","water"].includes(metric))return;
  foodTrendMetric=metric;localStorage.setItem("dailyLifeFoodTrendMetric",metric);
  const root=document.getElementById("foodTrendRoot");
  if(root)root.outerHTML=foodIntakeTrends();else openFoodHubSection("trends");
}
foodIntakeTrends=function(){
  const goals={calories:foodDailyGoal("calTarget",2100),protein:foodDailyGoal("proteinTarget",100),carbs:foodDailyGoal("carbsTarget",250),fat:foodDailyGoal("fatTarget",70),fiber:foodDailyGoal("fiberTarget",28),water:foodDailyGoal("waterTarget",78)},
    units={calories:"cal",protein:"g",carbs:"g",fat:"g",fiber:"g",water:"oz"},
    labels={calories:"Calories",protein:"Protein",carbs:"Carbs",fat:"Fat",fiber:"Fiber",water:"Water"},
    metric=foodTrendMetric in goals?foodTrendMetric:"calories",dates=trendDates(7),
    points=dates.map((date,index)=>({date:date,index:index,value:foodTrendValue(metric,date),label:new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"})})),
    values=points.filter(x=>x.value!==null),average=values.length?values.reduce((sum,x)=>sum+x.value,0)/values.length:null,
    scale=Math.max(goals[metric],1,...values.map(x=>x.value))*1.12,
    xAt=i=>32+i*(296/6),yAt=v=>126-Math.max(0,Math.min(1,v/scale))*100,
    targetY=yAt(goals[metric]),averageY=average===null?null:yAt(average),
    segments=[],active=[];
  for(const point of points){if(point.value===null){if(active.length)segments.push(active);active=[]}else active.push(point)}
  if(active.length)segments.push(active);
  const paths=segments.filter(x=>x.length>1).map(x=>"<polyline points=\""+x.map(p=>xAt(p.index)+","+yAt(p.value)).join(" ")+"\"/>").join(""),
    dots=points.filter(x=>x.value!==null).map(p=>"<g><title>"+esc(p.label)+" · "+(Math.round(p.value*10)/10).toLocaleString()+" "+units[metric]+"</title><circle cx=\""+xAt(p.index)+"\" cy=\""+yAt(p.value)+"\" r=\"4\"/></g>").join(""),
    days=points.map(p=>"<text x=\""+xAt(p.index)+"\" y=\"151\" text-anchor=\"middle\">"+esc(p.label.slice(0,1))+"</text>").join(""),
    controls=Object.keys(goals).map(key=>"<button type=\"button\" class=\"food-trend-chip "+(key===metric?"active":"")+"\" aria-pressed=\""+(key===metric?"true":"false")+"\" onclick=\"setFoodTrendMetric('"+key+"')\">"+labels[key]+"</button>").join(""),
    goalLine="<line class=\"food-goal-line\" x1=\"32\" y1=\""+targetY+"\" x2=\"328\" y2=\""+targetY+"\"/>",
    avgLine=averageY===null?"":"<line class=\"food-average-line\" x1=\"32\" y1=\""+averageY+"\" x2=\"328\" y2=\""+averageY+"\"/>";
  const averageText=average===null?"No logged values yet":"Average "+(Math.round(average*10)/10).toLocaleString()+" "+units[metric]+" across "+values.length+" logged day"+(values.length===1?"":"s"),
    chart=values.length?"<svg class=\"food-line-chart\" viewBox=\"0 0 360 166\" role=\"img\" aria-label=\"Seven-day "+esc(labels[metric].toLowerCase())+" line graph; blank days have no recorded value\"><line class=\"food-chart-axis\" x1=\"32\" y1=\"25\" x2=\"32\" y2=\"126\"/><line class=\"food-chart-axis\" x1=\"32\" y1=\"126\" x2=\"328\" y2=\"126\"/><text x=\"27\" y=\"25\" text-anchor=\"end\">"+Math.round(scale).toLocaleString()+"</text><text x=\"27\" y=\"129\" text-anchor=\"end\">0</text>"+goalLine+avgLine+"<g class=\"food-chart-line\">"+paths+"</g><g class=\"food-chart-dots\">"+dots+"</g><g class=\"food-chart-days\">"+days+"</g></svg>":"<div class=\"food-trend-empty\">Log food or water to start a trend.</div>";
  return "<section class=\"card food-trend-card\" id=\"foodTrendRoot\"><div class=\"eyebrow\">7-day food trend</div><div class=\"food-trend-head\"><h2>"+labels[metric]+"</h2><span>"+values.length+"/7 days logged</span></div><div class=\"food-trend-average\">"+averageText+"</div><div class=\"food-trend-selectors\">"+controls+"</div>"+chart+"<div class=\"food-trend-legend\"><span>Goal line</span>"+(average===null?"":"<span>Average line</span>")+"</div><div class=\"muted small food-trend-note\">Unlogged days stay blank. Average uses only recorded values.</div></section>";
};
(function installFoodTrendStyles(){
  if(document.getElementById("foodTrendStyles"))return;
  const style=document.createElement("style");style.id="foodTrendStyles";
  style.textContent=".food-trend-card{padding:12px!important}.food-trend-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.food-trend-head h2{margin:2px 0;font-size:1rem}.food-trend-head span,.food-trend-average,.food-trend-note{font-size:.68rem;color:var(--muted)}.food-trend-average{margin:3px 0 8px}.food-trend-selectors{display:flex;gap:5px;overflow:auto;padding:2px 0 7px}.food-trend-chip{flex:0 0 auto;border:1px solid var(--border);border-radius:999px;padding:5px 8px;background:transparent;color:var(--muted);font:inherit;font-size:.65rem}.food-trend-chip.active{background:color-mix(in srgb,var(--primary) 20%,var(--panel));border-color:color-mix(in srgb,var(--primary) 48%,var(--border));color:var(--text);font-weight:800}.food-line-chart{display:block;width:100%;height:auto;overflow:visible}.food-line-chart text{font:10px sans-serif;fill:var(--muted)}.food-line-chart .food-chart-axis{stroke:color-mix(in srgb,var(--text) 20%,var(--border));stroke-width:1}.food-line-chart .food-goal-line{stroke:var(--secondary);stroke-width:1.5;stroke-dasharray:4 4}.food-line-chart .food-average-line{stroke:var(--accent);stroke-width:1.4;stroke-dasharray:2 4}.food-line-chart .food-chart-line polyline{fill:none;stroke:var(--primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.food-line-chart .food-chart-dots circle{fill:var(--secondary);stroke:var(--panel);stroke-width:2}.food-trend-empty{padding:25px 8px;text-align:center;color:var(--muted);font-size:.75rem}.food-trend-legend{display:flex;gap:12px;margin-top:3px;font-size:.63rem;color:var(--muted)}.food-trend-note{margin-top:6px}";
  document.head.appendChild(style);
})();
function compactFoodToday(){
  return '<div class="food-tab-panel">'+foodGoalDashboardCard()+compactFoodDinnerTonight()+compactFoodCookingAhead()+'<details class="food-fold"><summary><span><b>7-day trends</b><small>View line graph</small></span><span>View</span></summary><div class="food-fold-body">'+foodIntakeTrends()+'</div></details></div>';
}

function compactFoodMeals(){
  return `<div class="food-tab-panel">${compactFoodMealsWeek()}${compactFoodMealMemory()}</div>`;
}

function compactFoodShop(){
  return `<div class="food-tab-panel">${compactFoodShopping()}${groceryOrdersCard()}</div>`;
}

function compactFoodPantry(){
  return `<div class="food-tab-panel"><div class="food-inline-actions"><button class="btn" onclick="setView('inventory')">Open whole-house inventory</button></div>${pantryCard()}</div>`;
}

function legacyTabbedFoodView(){
  const body=foodTab==="meals"?compactFoodMeals():foodTab==="shop"?compactFoodShop():foodTab==="pantry"?compactFoodPantry():compactFoodToday();
  return `<div class="food-hero"><div class="section-title"><div><div class="eyebrow">🍽 Food</div><h1>Food + kitchen</h1><div class="muted small">Today first; meal planning, shopping, and pantry details one tap away.</div></div><button class="btn" onclick="openFood()">+ Intake</button></div></div>${compactFoodTabs()}${body}`;
};

// The Food landing screen opens on Today's intake; kitchen sections remain one tap away.
homeView=legacyTabbedFoodView;
if(typeof window.__dailyLifeSetViewBeforeFood==="undefined"&&typeof setView==="function"){
  window.__dailyLifeSetViewBeforeFood=setView;
  setView=function(v){
    if(v==="home"){foodTab="today";localStorage.setItem("dailyLifeFoodTab","today")}
    return window.__dailyLifeSetViewBeforeFood.apply(this,arguments);
  };
}
function mealVisualIcon(dish){
  const x=String(dish||"").toLowerCase();
  if(/taco|nacho|burrito|quesadilla/.test(x))return"🌮";
  if(/pizza/.test(x))return"🍕";
  if(/pasta|spaghetti|mac/.test(x))return"🍝";
  if(/soup|chili|stew/.test(x))return"🥣";
  if(/chicken|wing/.test(x))return"🍗";
  if(/burger|sandwich|blt/.test(x))return"🥪";
  if(/salad/.test(x))return"🥗";
  if(/potato|tater/.test(x))return"🥔";
  if(/breakfast|pancake|waffle|egg/.test(x))return"🍳";
  return"🍽";
}

function mealMemoryPhoto(m){
  return m?.photo?`<img class="recipe-photo" src="${m.photo}" alt="${esc((m.dish||"Dinner")+" meal photo")}">`:`<span class="recipe-visual" aria-hidden="true">${mealVisualIcon(m?.dish)}</span>`;
}
function openMealMemory(id){
  const m=(state.meals||[]).find(x=>x.id===id);if(!m)return;
  modal("Meal memory · "+(m.dish||"Dinner"),`<div class="stack">
    <div class="meal-memory-preview">${m.photo?`<img src="${m.photo}" alt="Current meal photo">`:`<span>${mealVisualIcon(m.dish)}</span>`}</div>
    <label>Meal photo<input id="mealMemoryPhoto" type="file" accept="image/*"></label>
    <label>My cooking notes<textarea id="mealCookNotes" rows="5" placeholder="What worked? What would you change next time? Who liked it?">${esc(m.cookNotes||"")}</textarea></label>
    <div class="muted small">Meal photos stay on this device for now so cloud snapshots stay small. Cooking notes sync normally.</div>
    ${m.photo?`<button type="button" class="btn danger" onclick="removeMealMemoryPhoto('${m.id}')">Remove current photo</button>`:""}
  </div>`,"Save memory",async()=>{
    const file=$("#mealMemoryPhoto")?.files?.[0];
    if(file)m.photo=await compressImage(file,1000,.8);
    m.cookNotes=$("#mealCookNotes").value.trim();m.photoLocalOnly=!!m.photo;m.updatedAt=new Date().toISOString();
    await save();closeModal();render();
  });
}
async function removeMealMemoryPhoto(id){
  const m=(state.meals||[]).find(x=>x.id===id);if(!m)return;
  delete m.photo;m.photoLocalOnly=false;await save();closeModal();openMealMemory(id);
}

generatedMealDetails=function(m){
  const ingredients=splitLines(m?.ingredients),directions=splitLines(m?.prepSteps),n=m?.nutritionEstimate&&typeof m.nutritionEstimate==="object"?m.nutritionEstimate:null;
  if(!ingredients.length&&!directions&&!m?.notes){
    return `<div class="recipe-empty">${m?.recipeState==="queued"?"Building the recipe and grocery list automatically…":"Save the meal name and Daily Life will build the ingredients, directions, make-ahead prep, and grocery list for you."}</div>`;
  }
  const tips=m?.notes?`<details class="recipe-extra-tips"><summary><span><b>Extra recipe tips</b><small>Optional notes, substitutions, or useful reminders</small></span><span>Open</span></summary><div class="muted small">${esc(m.notes).replace(/\n/g,"<br>")}</div></details>`:"";
  const yieldText=Number(m?.yieldCount)>0?`Makes about ${Number(m.yieldCount)} ${esc(m.yieldLabel||"servings")}`:"";
  const nutrition=n?`<div class="recipe-section recipe-nutrition">
      <div class="recipe-section-title"><div class="mini-heading">Estimated nutrition</div>${yieldText?`<span class="recipe-yield">${yieldText}</span>`:""}</div>
      <div class="recipe-nutrition-grid">
        <span><b>≈ ${Math.round(Number(n.caloriesPerServing||0))}</b><small>calories / ${esc(n.servingLabel||"serving")}</small></span>
        <span><b>≈ ${Math.round(Number(n.proteinPerServing||0))}g</b><small>protein</small></span>
        <span><b>≈ ${Math.round(Number(n.carbsPerServing||0))}g</b><small>carbs</small></span>
        <span><b>≈ ${Math.round(Number(n.fatPerServing||0))}g</b><small>fat</small></span>
        <span><b>≈ ${Number(n.fiberPerServing||0).toFixed(1)}g</b><small>fiber</small></span>
        <span><b>≈ ${Math.round(Number(n.sodiumPerServing||0))}mg</b><small>sodium</small></span>
      </div>
      ${n.basis?`<div class="recipe-nutrition-note">${esc(n.basis)}</div>`:""}
    </div>`:"";
  return `<section class="recipe-details">
    <div class="recipe-details-head">${mealMemoryPhoto(m)}<span class="grow"><div class="eyebrow">Recipe details</div><b>${esc(m?.dish||"Dinner")}</b><small>${yieldText|| (m?.cookNotes?"Your cooking notes saved":"Add a photo or your own notes")}</small></span><button class="btn small" type="button" onclick="openMealMemory('${m.id}')">Photo + notes</button></div>
    ${m?.cookNotes?`<div class="meal-cook-notes"><div class="mini-heading">My cooking notes</div><div>${esc(m.cookNotes).replace(/\n/g,"<br>")}</div></div>`:""}
    ${ingredients.length?`<div class="recipe-section"><div class="mini-heading">Ingredients</div><div class="recipe-ingredients">${ingredients.map((line,i)=>{const p=ingredientParts(line),refresh=`setIngredientState('${m.id}',${i},'STATE').then(()=>{closeModal();openMeal('${m.date}')})`;return `<div class="ingredient-row compact"><span class="grow">${esc(p.text)}</span><div class="ingredient-actions"><button class="btn small ingredient-have ${p.state==="have"?"selected":""}" onclick="${refresh.replace("STATE","have")}">${p.state==="have"?"✓ ":""}Have</button><button class="btn small ingredient-need ${p.state==="need"?"selected":""}" onclick="${refresh.replace("STATE","need")}">${p.state==="need"?"✓ ":""}Need</button></div></div>`}).join("")}</div></div>`:""}
    ${nutrition}
    ${directions.length?`<div class="recipe-section"><div class="mini-heading">Directions</div><ol class="recipe-directions">${directions.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>`:""}
    ${m?.tomorrowPrep?`<div class="recipe-section recipe-make-ahead"><div class="mini-heading">Make-ahead prep</div><div class="muted small">${esc(m.tomorrowPrep).replace(/\n/g,"<br>")}</div></div>`:""}
    ${tips}
  </section>`;
};

(function installCompactFoodStyles(){
  if(document.getElementById("compactFoodStyles"))return;
  const style=document.createElement("style");
  style.id="compactFoodStyles";
  style.textContent=`
    .food-hero{padding:8px 2px 10px;border-bottom:1px solid color-mix(in srgb,var(--primary) 22%,var(--border))}
    .food-hero h1{font-family:var(--font-heading);font-size:1.45rem;margin:3px 0;color:var(--cream)}
    .food-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:9px 0 12px;padding:4px;border:1px solid color-mix(in srgb,var(--secondary) 13%,var(--border));border-radius:16px;background:color-mix(in srgb,var(--panel2) 75%,transparent)}
    .food-tabs button{display:grid;place-items:center;gap:2px;min-height:47px;border:0;border-radius:12px;background:transparent;color:var(--muted);font:inherit;padding:6px 2px}
    .food-tabs button span{font-size:.9rem}.food-tabs button b{font-size:.66rem}
    .food-tabs button.active{color:var(--cream);background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 14%,transparent),color-mix(in srgb,var(--secondary) 6%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 22%,var(--border))}
    .food-tab-panel{display:grid;gap:0}
    .food-inline-section,.food-flat-section{padding:13px 2px;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border))}
    .food-tab-panel>:first-child{border-top:0}
    .food-tonight-row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:5px}
    .food-tonight-row>div:first-child{min-width:0}
    .food-meal-row{display:flex;align-items:center;gap:8px;border-top:1px solid var(--border)}
    .food-meal-main{flex:1;min-width:0;display:flex;justify-content:space-between;gap:12px;align-items:center;border:0;background:transparent;color:var(--text);padding:10px 0;text-align:left;font:inherit}
    .food-meal-main>span{min-width:0;display:grid;gap:2px}.food-meal-main small{font-size:.68rem;color:var(--muted)}
    .food-meal-dish{text-align:right}.food-meal-dish small{display:block}
    .food-fold{border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border));padding:3px 2px 0}
    .food-fold>summary{list-style:none;display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:50px;cursor:pointer;color:var(--text)}
    .food-fold>summary::-webkit-details-marker{display:none}.food-fold>summary span:first-child{display:grid;gap:2px}.food-fold>summary small{color:var(--muted);font-size:.68rem}.food-fold>summary span:last-child{color:var(--secondary);font-size:.7rem;font-weight:850}
    .food-fold[open]>summary span:last-child{font-size:0}.food-fold[open]>summary span:last-child:after{content:"Close";font-size:.7rem}
    .food-fold-body>.card,.food-tab-panel>.card{margin:0;padding:13px 2px;border:0;border-top:1px solid color-mix(in srgb,var(--secondary) 11%,var(--border));border-radius:0;background:transparent;box-shadow:none}
    .food-fold-body>.card{border-top:0}
    .food-tab-panel>.pantry-card{border-top:0}
    .food-tab-panel .notice{border:0;border-left:3px solid color-mix(in srgb,var(--primary) 50%,var(--border));border-radius:0;background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 6%,transparent),transparent 72%);padding:8px 0 8px 11px}
    .food-inline-actions{display:flex;justify-content:flex-end;padding:2px 0 8px}
    .recipe-details{display:grid;gap:0;margin-top:4px;border-top:1px solid color-mix(in srgb,var(--secondary) 12%,var(--border))}
    .recipe-details-head{display:flex;gap:10px;align-items:center;padding:12px 0}
    .recipe-visual{width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;font-size:1.25rem;background:color-mix(in srgb,var(--primary) 10%,transparent)}
    .recipe-section{padding:11px 0;border-top:1px solid var(--border)}
    .recipe-section .mini-heading{margin:0 0 7px}
    .recipe-directions{margin:0;padding-left:1.35rem;display:grid;gap:8px;color:var(--text)}
    .recipe-directions li{padding-left:3px;line-height:1.45}
    .recipe-make-ahead{border-left:3px solid color-mix(in srgb,var(--accent) 55%,var(--border));padding-left:10px}
    .recipe-extra-tips{border-top:1px solid var(--border);padding:4px 0 0}
    .recipe-extra-tips>summary{list-style:none;display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:48px;cursor:pointer}
    .recipe-extra-tips>summary::-webkit-details-marker{display:none}.recipe-extra-tips>summary>span:first-child{display:grid;gap:2px}.recipe-extra-tips>summary small{font-size:.67rem;color:var(--muted)}
    .recipe-extra-tips>summary>span:last-child{font-size:.7rem;color:var(--secondary);font-weight:850}.recipe-extra-tips[open]>summary>span:last-child{font-size:0}.recipe-extra-tips[open]>summary>span:last-child:after{content:"Close";font-size:.7rem}
    .recipe-empty{padding:10px 0;color:var(--muted);font-size:.78rem;line-height:1.45}
    @media(max-width:520px){
      .food-tabs{gap:2px}.food-tabs button{min-height:44px}
      .food-tonight-row{align-items:flex-start}
      .food-meal-main{align-items:flex-start}.food-meal-dish{max-width:52%}
    }
  `;
  document.head.appendChild(style);
})();
