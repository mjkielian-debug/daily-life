(function(){
  "use strict";
  const YEAR = "2026";
  const choices = [["undecided","Not decided"],["buy","Buy"],["make","Make"],["both","Buy + make"]];
  const statuses = [["ideas","Need ideas"],["planned","Gift chosen"],["in-progress","Working on it"],["ready","Ready"],["wrapped","Wrapped"],["given","Given"]];
  function keyFor(name){return String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
  function giftStore(){
    if(!state.christmasGifts2026 || typeof state.christmasGifts2026!=="object" || Array.isArray(state.christmasGifts2026)) state.christmasGifts2026={};
    return state.christmasGifts2026;
  }
  function normalizedRelationship(value){
    return String(value||"").trim().toLowerCase().replace(/\u2019/g,"'")
      .replace(/^(?:tanner's|partner's)\s+/,"partner's ").replace(/\s+/g," ");
  }
  function giftHasSavedDetail(g){
    return !!(g&&typeof g==="object"&&(
      String(g.idea||"").trim()||String(g.notes||"").trim()||
      String(g.link||"").trim()||giftItems(g).length||
      ["buy","make","both"].includes(String(g.choice||""))||
      ["planned","in-progress","ready","wrapped","given"].includes(String(g.status||""))||
      money(g.budget)!==null||money(g.spent)!==null
    ));
  }
  function people(){
    if(typeof ensurePeopleProfiles==="function") ensurePeopleProfiles();
    const store=giftStore(),seenIds=new Set(),seenLegacy=new Set(),rosterByPerson=new Map(),out=[];
    for(const p of state.peopleProfiles||[]){
      const name=String(p?.name||"").trim(),legacyKey=keyFor(name),rel=String(p?.relationship||"").trim().toLowerCase();
      if(!name||!legacyKey||rel==="self"||rel==="you")continue;
      const id=p?.id==null?"":String(p.id).trim();
      const key=id?"person-"+encodeURIComponent(id):"name-"+legacyKey;
      if(seenIds.has(key))continue;
      seenIds.add(key);
      const legacyOwner=!seenLegacy.has(legacyKey);
      seenLegacy.add(legacyKey);
      const next={key,legacyKey,legacyOwner,name,relationship:String(p.relationship||"Person")};
      // Only collapse profiles with an identical name AND the same relationship.
      // "partner's brother" and "Tanner's brother" are equivalent here, while
      // two distinct people who happen to share a name remain separate.
      const identity=legacyKey+"|"+normalizedRelationship(next.relationship);
      const previousIndex=rosterByPerson.get(identity);
      if(previousIndex===undefined){rosterByPerson.set(identity,out.length);out.push(next);continue}
      const prior=out[previousIndex];
      const previousSaved=giftHasSavedDetail(store[prior.key]||(prior.legacyOwner?store[prior.legacyKey]:null));
      const nextSaved=giftHasSavedDetail(store[key]);
      if(previousSaved&&nextSaved){
        // Don't silently hide or merge two independently saved gift plans.
        out.push({...next,possibleDuplicate:true});
      }else if(nextSaved&&!previousSaved){
        out[previousIndex]={...next,legacyOwner:prior.legacyOwner};
      }
    }
    return out;
  }
  function giftIdeas(person){
    const who=keyFor(person?.name),rel=normalizedRelationship(person?.relationship);
    const make=(title,choice)=>({title,choice});
    if(who==="leo")return [
      make("Nature or reptile field guide","buy"),make("Tabletop adventure accessories","buy"),
      make("Homemade dice bag or drawstring pouch","make"),make("A book in a favorite series","buy")
    ];
    if(who==="demitri"||who==="tree")return [
      make("Homemade crochet creature","make"),make("Building or science activity kit","buy"),
      make("Personalized story or comic","make"),make("Board or card game","buy")
    ];
    if(who==="dolly")return [
      make("DIY spa-night gift basket","both"),make("Art or bracelet-making kit","buy"),
      make("Handmade colorful plush or hair accessory","make"),make("Doll outfit or play accessory","buy")
    ];
    if(who==="ambrose")return [
      make("Age-appropriate building set","buy"),make("Picture book and cozy blanket","both"),
      make("Handmade soft toy","make"),make("Simple art project kit","buy")
    ];
    if(/niece|nephew|child|son|daughter|grandchild/.test(rel))return [
      make("Age-appropriate book or game","buy"),make("Crocheted animal or soft toy","make"),
      make("Personalized ornament","make"),make("Craft or activity kit","buy")
    ];
    if(/sister|brother|friend|partner|mother|father|parent|aunt|uncle|grand/.test(rel))return [
      make("Punch-needle wall art or handmade coaster","make"),make("Favorite snacks and treats basket","both"),
      make("Personalized photo ornament","make"),make("Cozy self-care or hobby kit","buy")
    ];
    return [
      make("Handmade ornament or crochet gift","make"),make("Book or activity based on their interests","buy"),
      make("Treat basket","both"),make("Personalized photo keepsake","make")
    ];
  }
  window.holidayGiftChooseIdea=function(key,index){
    const person=people().find(p=>p.key===String(key)),idea=person&&giftIdeas(person)[Number(index)];
    if(!idea)return;
    const field=document.getElementById("holiday-gift-idea");
    if(!field)return;
    const current=String(field.value||"").trim();
    if(current&&current!==idea.title&&!window.confirm?.("Replace the gift idea in this editor? Nothing is saved until you tap Save."))return;
    field.value=idea.title;
    const choice=document.getElementById("holiday-gift-choice");
    if(choice)choice.value=idea.choice;
    const status=document.getElementById("holiday-gift-status");
    if(status&&status.value==="ideas")status.value="planned";
    if(typeof field.focus==="function")field.focus();
  };
  function giftFor(person,store=giftStore()){
    return store[person.key]||(person.legacyOwner?store[person.legacyKey]:null)||{};
  }
  function money(value){
    if(value===null||value===undefined||String(value).trim()==="")return null;
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null;
  }
  function dollars(value){
    return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
  }
  function giftItems(g){
    return (Array.isArray(g?.items)?g.items:[]).filter(item=>item&&String(item.title||"").trim()).slice(0,30);
  }
  function giftItemRow(item){
    const id=String(item?.id||"").trim();
    return '<div class="holiday-gift-item-row" data-gift-id="'+esc(id)+'">'+
      '<label>Additional gift<input data-field="title" type="text" maxlength="180" value="'+esc(item?.title||"")+'" placeholder="Gift or homemade project"></label>'+
      '<div class="grid2"><label>Buy or make<select data-field="choice">'+optionHtml(choices,safeChoice(item?.choice))+'</select></label>'+
      '<label>Progress<select data-field="status">'+optionHtml(statuses,safeStatus(item?.status))+'</select></label></div>'+
      '<label>Shopping / instructions link<input data-field="link" type="url" value="'+esc(item?.link||"")+'" placeholder="https://..."></label>'+
      '<label>Supplies or notes<input data-field="notes" type="text" maxlength="500" value="'+esc(item?.notes||"")+'" placeholder="Materials, size, colors"></label>'+
      '<button class="btn small" type="button" onclick="holidayGiftRemoveItem(this)">Remove this extra gift</button>'+
    '</div>';
  }
  window.holidayGiftAddItem=function(){
    const host=document.getElementById("holidayGiftItemRows");
    if(!host||host.children.length>=30)return;
    const id=typeof uid==="function"?uid():"gift-"+Date.now()+"-"+Math.round(Math.random()*100000);
    host.insertAdjacentHTML("beforeend",giftItemRow({id,title:"",choice:"undecided",status:"ideas"}));
  };
  window.holidayGiftRemoveItem=function(button){
    button?.closest?.(".holiday-gift-item-row")?.remove();
  };
  function optionHtml(options,selected){
    return options.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===selected?' selected':'')+'>'+esc(o[1])+'</option>';}).join("");
  }
  function safeStatus(value){return statuses.some(x=>x[0]===value)?value:"ideas";}
  function safeChoice(value){return choices.some(x=>x[0]===value)?value:"undecided";}
  function labelFor(options,value){const item=options.find(x=>x[0]===value);return item?item[1]:"";}
  window.holidayGiftBoard=function(){
    const roster=people(), store=giftStore();
    const planned=roster.filter(p=>!!String(giftFor(p,store).idea||"").trim()||giftItems(giftFor(p,store)).length>0||safeChoice(giftFor(p,store).choice)!=="undecided").length;
    const completed=roster.filter(p=>["ready","wrapped","given"].includes(safeStatus(giftFor(p,store).status))).length;
    const need=roster.length-planned;
    const budgets=roster.map(p=>money(giftFor(p,store).budget)).filter(x=>x!==null);
    const spending=roster.map(p=>money(giftFor(p,store).spent)).filter(x=>x!==null);
    const budgetTotal=Math.round(budgets.reduce((sum,x)=>sum+x,0)*100)/100;
    const spendingTotal=Math.round(spending.reduce((sum,x)=>sum+x,0)*100)/100;
    const rows=roster.map(function(p){
      const g=giftFor(p,store), choice=safeChoice(g.choice), status=safeStatus(g.status);
      const extras=giftItems(g),extraDone=extras.filter(x=>["ready","wrapped","given"].includes(safeStatus(x.status))).length;
      const label=String(g.idea||"").trim()||(extras.length?extras[0].title:"Tap to add an idea");
      const summary=[labelFor(choices,choice),labelFor(statuses,status),extras.length?extraDone+"/"+extras.length+" extra gifts ready":"",money(g.budget)!==null?"Budget "+dollars(money(g.budget)):"",money(g.spent)!==null?"Spent "+dollars(money(g.spent)):""].filter(Boolean).join(" · ");

      return '<button type="button" class="holiday-gift-person" onclick="openHolidayGift('+esc(JSON.stringify(p.key))+')">'
        +'<span class="holiday-person-initial">'+esc(p.name.charAt(0).toUpperCase())+'</span>'
        +'<span class="holiday-gift-main"><b>'+esc(p.name)+'</b><small>'+esc(p.relationship)+' · '+esc(label)+'</small></span>'
        +'<span class="holiday-gift-status">'+esc(summary)+(p.possibleDuplicate?' · Duplicate profile to review':'')+'<span aria-hidden="true"> ›</span></span></button>';
    }).join("");
    const upcoming=(state.tasks||[]).filter(t=>!t.done && t.date>=(typeof ymd==="function"?ymd():"2026-11-14") && /^(Christmas gifts|Tree.s birthday)/i.test(String(t.title||""))).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).slice(0,3);
    return '<section class="card holiday-gifts-card" aria-label="Christmas gift planner">'
      +'<div class="section-title"><div><div class="eyebrow">🎄 Christmas 2026</div><h2>Gifts for your people</h2><div class="muted small">Ideas, buy or make, cost, and progress for each person. Includes nieces and nephews.</div></div></div>'
      +'<div class="holiday-gift-stats"><span><b>'+planned+'/'+roster.length+'</b><small>with a plan</small></span><span><b>'+need+'</b><small>need ideas</small></span><span><b>'+completed+'</b><small>ready or wrapped</small></span></div>'
      +(budgets.length||spending.length?'<div class="notice small holiday-gift-money">'+(budgets.length?'<b>Gift budgets:</b> '+dollars(budgetTotal)+' across '+budgets.length+' people':'')+(budgets.length&&spending.length?' · ':'')+(spending.length?'<b>Actual spending:</b> '+dollars(spendingTotal)+' recorded for '+spending.length+' people':'')+'</div>':'')
      +'<div class="holiday-gift-people">'+(rows||'<div class="notice">Add people to your People profiles to plan their Christmas gifts.</div>')+'</div>'
      +'<div class="notice small holiday-gift-birthday">🎂 Tree’s December 28 birthday gift is <b>separate</b> from Christmas. <button type="button" class="btn small" onclick="openHolidayTreeBirthday()">Open Tree’s birthday plan</button></div>'
      +(upcoming.length?'<div class="holiday-gift-next"><div class="mini-heading">Next gift tasks · Relationships</div>'+upcoming.map(t=>'<div class="row"><span>'+esc(t.title)+'</span><span class="muted small">'+esc(t.date)+'</span></div>').join("")+'</div>':'')
      +'</section>';
  };
  window.openHolidayGift=function(key){
    const p=people().find(x=>x.key===String(key));if(!p)return;
    const g=giftFor(p),suggestions=giftIdeas(p);
    const suggestionButtons=suggestions.map((idea,index)=>'<button type="button" class="holiday-gift-idea-choice" onclick="holidayGiftChooseIdea('+esc(JSON.stringify(p.key))+','+index+')">'+esc(idea.title)+' <small>'+esc(idea.choice==="make"?"Make":idea.choice==="both"?"Buy or make":"Buy")+'</small></button>').join("");
    const body='<div class="stack holiday-gift-editor"><div class="notice small">Keep this Christmas gift separate from birthday gifts. You can leave anything undecided.</div>'
      +'<label>Gift idea / item<textarea id="holiday-gift-idea" rows="3" placeholder="What could I give or make?">'+esc(g.idea||"")+'</textarea></label>'
      +'<div class="holiday-gift-idea-suggestions"><b>Ideas to consider</b><small>Suggestions only. Tap one to fill the editor; nothing saves until you confirm.</small><div class="holiday-gift-idea-options">'+suggestionButtons+'</div></div>'
      +'<div class="grid2"><label>How to get it<select id="holiday-gift-choice">'+optionHtml(choices,safeChoice(g.choice))+'</select></label>'
      +'<label>Progress<select id="holiday-gift-status">'+optionHtml(statuses,safeStatus(g.status))+'</select></label></div>'
      +'<div class="grid2"><label>Budget (optional)<input id="holiday-gift-budget" type="number" step="0.01" min="0" value="'+esc(g.budget??"")+'" placeholder="0.00"></label>'
      +'<label>Actually spent (optional)<input id="holiday-gift-spent" type="number" step="0.01" min="0" value="'+esc(g.spent??"")+'" placeholder="Not entered"></label></div>'
      +'<label>Shopping link (optional)<input id="holiday-gift-link" type="url" value="'+esc(g.link||"")+'" placeholder="https://..."></label>'
      +'<label>Notes / supplies / shop<textarea id="holiday-gift-notes" rows="3" placeholder="Supplies, link, sizes, instructions, or where to buy it">'+esc(g.notes||"")+'</textarea></label>'
      +'<div class="holiday-gift-items"><h3>Additional gifts</h3><p class="muted small">Each extra gift has its own buy-or-make choice and progress. Your overall spending above stays a per-person total, so costs are not counted twice.</p>'
      +'<div id="holidayGiftItemRows">'+giftItems(g).map(giftItemRow).join("")+'</div>'
      +'<button type="button" class="btn small" onclick="holidayGiftAddItem()">＋ Add another gift</button></div></div>';
    modal('🎄 Christmas gift · '+p.name,body,"Save",async function(){
      const idea=document.getElementById("holiday-gift-idea")?.value.trim()||"";
      const choice=safeChoice(document.getElementById("holiday-gift-choice")?.value);
      const status=safeStatus(document.getElementById("holiday-gift-status")?.value);
      const budget=document.getElementById("holiday-gift-budget")?.value.trim()||"";
      const spent=document.getElementById("holiday-gift-spent")?.value.trim()||"";
      const link=document.getElementById("holiday-gift-link")?.value.trim()||"";
      if((budget!==""&&money(budget)===null)||(spent!==""&&money(spent)===null)){
        alert("Enter a valid, non-negative amount for budget and spending.");return;
      }
      if(link&& !/^https?:\/\//i.test(link)){
        alert("Shopping links must begin with https:// or http://");return;
      }
      const notes=document.getElementById("holiday-gift-notes")?.value.trim()||"";
      const rows=Array.from(document.querySelectorAll?.("#holidayGiftItemRows .holiday-gift-item-row")||[]);
      if(rows.length>30){alert("Please keep up to 30 additional gifts for each person.");return}
      const originalItems=new Map(giftItems(g).map(x=>[String(x.id),x])),items=[];
      for(const row of rows){
        const read=field=>String(row.querySelector('[data-field="'+field+'"]')?.value||"").trim();
        const title=read("title"),link=read("link"),itemNotes=read("notes");
        if(!title){
          if(link||itemNotes){alert("Name the additional gift, or remove its incomplete row.");return}
          continue;
        }
        if(link&&!/^https?:\/\//i.test(link)){alert("Extra gift links must begin with https:// or http://");return}
        const id=String(row.getAttribute("data-gift-id")||"").trim()||"gift-"+Date.now()+"-"+items.length;
        items.push({...originalItems.get(id),id,title,choice:safeChoice(read("choice")),status:safeStatus(read("status")),link,notes:itemNotes});
      }
      const store=giftStore(),hadOwn=Object.prototype.hasOwnProperty.call(store,p.key),previous=store[p.key];
      store[p.key]={...g,name:p.name,idea,choice,status,budget,spent,link,notes,items,updatedAt:new Date().toISOString()};
      try{await save()}catch(error){
        if(hadOwn)store[p.key]=previous;else delete store[p.key];
        alert("This gift update could not be saved. Please try again.");
        return;
      }
      closeModal();openPeopleHubSection("birthdays");
    });
  };
  window.openHolidayTreeBirthday=function(){
    const p=(state.peopleProfiles||[]).find(x=>/^demitri$|^tree$/i.test(String(x.name||"").trim()));
    if(!p)return;
    closeModal();
    openBirthdayPlanner(p.id);
  };
})();