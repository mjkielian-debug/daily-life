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

function legacyTabbedFoodView(){
  const body=foodTab==="meals"?compactFoodMeals():foodTab==="shop"?compactFoodShop():foodTab==="pantry"?compactFoodPantry():compactFoodToday();
  return `<div class="food-hero"><div class="section-title"><div><div class="eyebrow">🍽 Food</div><h1>Food + kitchen</h1><div class="muted small">Today first; meal planning, shopping, and pantry details one tap away.</div></div><button class="btn" onclick="openFood()">+ Intake</button></div></div>${compactFoodTabs()}${body}`;
};

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
