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
    ${dates.map(d=>{const m=state.meals.find(x=>x.date===d&&x.type==="dinner"),rs=mealRecipeStatus(m),sg=latestMealSuggestion(d),past=d<today;return `<div class="food-meal-row ${past?"past-row":""}"><button class="food-meal-main" onclick="openMeal('${d}')"><span><b>${dl(d)}</b><small>${m?.method?esc(m.method):past?"Past":""}</small></span><span class="food-meal-dish">${m?.dish?esc(m.dish):past?"No meal logged":sg?"Suggestion ready":m?.recipeState==="suggestion-queued"?"Choosing…":"Not planned"}<small>${m?.dish?(rs==="ready"?"✓ recipe ready":rs==="waiting"?"cloud needed":"✨ building recipe"):""}</small></span></button>${!past&&!m?.dish&&!sg&&m?.recipeState!=="suggestion-queued"?`<button class="btn small" onclick="requestMealSuggestion('${d}')">Suggest</button>`:""}</div>`}).join("")}
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

function compactFoodToday(){
  return `<div class="food-tab-panel">${compactFoodDinnerTonight()}${todayNutritionCard()}<details class="food-fold"><summary><span><b>7-day intake patterns</b><small>Calories, protein, water, caffeine, and energy-drink logs</small></span><span>View</span></summary><div class="food-fold-body">${foodIntakeTrends()}</div></details></div>`;
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

homeView=function(){
  const body=foodTab==="meals"?compactFoodMeals():foodTab==="shop"?compactFoodShop():foodTab==="pantry"?compactFoodPantry():compactFoodToday();
  return `<div class="food-hero"><div class="section-title"><div><div class="eyebrow">🍽 Food</div><h1>Food + kitchen</h1><div class="muted small">Today first; meal planning, shopping, and pantry details one tap away.</div></div><button class="btn" onclick="openFood()">+ Intake</button></div></div>${compactFoodTabs()}${body}`;
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
    @media(max-width:520px){
      .food-tabs{gap:2px}.food-tabs button{min-height:44px}
      .food-tonight-row{align-items:flex-start}
      .food-meal-main{align-items:flex-start}.food-meal-dish{max-width:52%}
    }
  `;
  document.head.appendChild(style);
})();
