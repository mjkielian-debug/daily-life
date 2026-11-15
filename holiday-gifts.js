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
  function people(){
    if(typeof ensurePeopleProfiles==="function") ensurePeopleProfiles();
    const seen=new Set(), out=[];
    for(const p of state.peopleProfiles||[]){
      const name=String(p?.name||"").trim(), key=keyFor(name), rel=String(p?.relationship||"").trim().toLowerCase();
      if(!name||!key||seen.has(key)||rel==="self"||rel==="you")continue;
      seen.add(key);out.push({key,name,relationship:String(p.relationship||"Person")});
    }
    return out;
  }
  function optionHtml(options,selected){
    return options.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===selected?' selected':'')+'>'+esc(o[1])+'</option>';}).join("");
  }
  function safeStatus(value){return statuses.some(x=>x[0]===value)?value:"ideas";}
  function safeChoice(value){return choices.some(x=>x[0]===value)?value:"undecided";}
  function labelFor(options,value){const item=options.find(x=>x[0]===value);return item?item[1]:"";}
  window.holidayGiftBoard=function(){
    const roster=people(), store=giftStore();
    const planned=roster.filter(p=>!!String(store[p.key]?.idea||"").trim()||safeChoice(store[p.key]?.choice)!=="undecided").length;
    const completed=roster.filter(p=>["ready","wrapped","given"].includes(safeStatus(store[p.key]?.status))).length;
    const need=roster.length-planned;
    const rows=roster.map(function(p){
      const g=store[p.key]||{}, choice=safeChoice(g.choice), status=safeStatus(g.status);
      const label=String(g.idea||"").trim()||"Tap to add an idea";
      const summary=[labelFor(choices,choice),labelFor(statuses,status)].filter(Boolean).join(" · ");
      return '<button type="button" class="holiday-gift-person" onclick="openHolidayGift(\''+p.key+'\')">'
        +'<span class="holiday-person-initial">'+esc(p.name.charAt(0).toUpperCase())+'</span>'
        +'<span class="holiday-gift-main"><b>'+esc(p.name)+'</b><small>'+esc(p.relationship)+' · '+esc(label)+'</small></span>'
        +'<span class="holiday-gift-status">'+esc(summary)+'<span aria-hidden="true"> ›</span></span></button>';
    }).join("");
    const upcoming=(state.tasks||[]).filter(t=>!t.done && t.date>=(typeof ymd==="function"?ymd():"2026-11-14") && /^(Christmas gifts|Tree.s birthday)/i.test(String(t.title||""))).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).slice(0,3);
    return '<section class="card holiday-gifts-card" aria-label="Christmas gift planner">'
      +'<div class="section-title"><div><div class="eyebrow">🎄 Christmas 2026</div><h2>Gifts for your people</h2><div class="muted small">Ideas, buy or make, cost, and progress for each person. Includes nieces and nephews.</div></div></div>'
      +'<div class="holiday-gift-stats"><span><b>'+planned+'/'+roster.length+'</b><small>with a plan</small></span><span><b>'+need+'</b><small>need ideas</small></span><span><b>'+completed+'</b><small>ready or wrapped</small></span></div>'
      +'<div class="holiday-gift-people">'+(rows||'<div class="notice">Add people to your People profiles to plan their Christmas gifts.</div>')+'</div>'
      +'<div class="notice small holiday-gift-birthday">🎂 Tree’s December 28 birthday gift is <b>separate</b> from Christmas. <button type="button" class="btn small" onclick="openHolidayTreeBirthday()">Open Tree’s birthday plan</button></div>'
      +(upcoming.length?'<div class="holiday-gift-next"><div class="mini-heading">Next gift tasks · Relationships</div>'+upcoming.map(t=>'<div class="row"><span>'+esc(t.title)+'</span><span class="muted small">'+esc(t.date)+'</span></div>').join("")+'</div>':'')
      +'</section>';
  };
  window.openHolidayGift=function(key){
    const p=people().find(x=>x.key===String(key));if(!p)return;
    const g=giftStore()[p.key]||{};
    const body='<div class="stack holiday-gift-editor"><div class="notice small">Keep this Christmas gift separate from birthday gifts. You can leave anything undecided.</div>'
      +'<label>Gift idea / item<textarea id="holiday-gift-idea" rows="3" placeholder="What could I give or make?">'+esc(g.idea||"")+'</textarea></label>'
      +'<div class="grid2"><label>How to get it<select id="holiday-gift-choice">'+optionHtml(choices,safeChoice(g.choice))+'</select></label>'
      +'<label>Progress<select id="holiday-gift-status">'+optionHtml(statuses,safeStatus(g.status))+'</select></label></div>'
      +'<label>Budget (optional)<input id="holiday-gift-budget" type="number" step="0.01" min="0" value="'+esc(g.budget??"")+'" placeholder="0.00"></label>'
      +'<label>Notes / supplies / shop<textarea id="holiday-gift-notes" rows="3" placeholder="Supplies, link, sizes, instructions, or where to buy it">'+esc(g.notes||"")+'</textarea></label></div>';
    modal('🎄 Christmas gift · '+p.name,body,"Save",async function(){
      const idea=document.getElementById("holiday-gift-idea")?.value.trim()||"";
      const choice=safeChoice(document.getElementById("holiday-gift-choice")?.value);
      const status=safeStatus(document.getElementById("holiday-gift-status")?.value);
      const budget=document.getElementById("holiday-gift-budget")?.value.trim()||"";
      const notes=document.getElementById("holiday-gift-notes")?.value.trim()||"";
      giftStore()[p.key]={name:p.name,idea,choice,status,budget,notes,updatedAt:new Date().toISOString()};
      await save();
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