/* Dolly's bedroom: a local-first, tappable furniture model.
   The only confirmed spatial relationship is vanity beneath a window.
   Other positions on this illustrative sketch are NOT verified. */
(function(){
 "use strict";
 const ROOM="Dolly’s bedroom",FLOOR="Second floor",ZONE="dolly";
 const ITEMS={
  bed:{label:"Bed",symbol:"🛏",description:"White sleigh bed beneath Dolly’s Mario poster, beside one window; pale-purple bedding and patterned blankets seen in earlier photos.",location:"Beneath Mario poster · beside window (confirmed)",sections:["Bedding","Pillows","Blankets"]},
  dresser:{label:"Dresser",symbol:"▤",description:"Long brown dresser holding Dolly’s clothes. Moved to the wall that previously held the large Barbie house.",location:"Former Barbie-house wall (confirmed relationship)",sections:[]},
  vanity:{label:"Vanity",symbol:"✧",description:"White vanity stays beneath the other bedroom window.",location:"Under second window (confirmed)",sections:["Vanity top","Other storage"]},
  dollhouse:{label:"Barbie house",symbol:"⌂",description:"Large pink Barbie house beside the closet, with its playable side facing into the bedroom.",location:"Beside closet · playable side faces into room (confirmed)",sections:["Dolls","Doll clothes","Accessories","Mini furniture"]},
  closet:{label:"Closet",symbol:"▥",description:"Closet for less frequently used toys. Shift the Barbie house slightly when access is needed.",location:"Adjacent to Barbie house · access by shifting house slightly (confirmed)",sections:["Less-used toys","Toy rotation","Other stored items"]}
 };
 function html(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
 function encoded(v){return encodeURIComponent(String(v)).replace(/'/g,"%27")}
 function store(){return state.homeFurnitureRecords&&typeof state.homeFurnitureRecords==="object"?state.homeFurnitureRecords:{}}
 function record(key){return store()["dolly."+key]||{}}
 function sections(key){return key==="dresser"?(Array.isArray(record(key).drawers)?record(key).drawers:[]):ITEMS[key].sections}
 function values(key,section){const list=record(key).contents?.[section];return Array.isArray(list)?list:[]}
 function taskList(key){return (state.tasks||[]).filter(x=>x.homeMapFloor===FLOOR&&x.homeMapZoneId===ZONE&&x.homeObjectKey===key&&!x.duplicateHidden&&!x.paused)}
 async function update(key,fn,returnSection){
  const old=state.homeFurnitureRecords;
  const all={...store()};
  const prev=record(key);
  const next={...prev,contents:{...(prev.contents||{})},drawers:[...(prev.drawers||[])]};
  fn(next);all["dolly."+key]=next;state.homeFurnitureRecords=all;
  try{await save()}catch(e){
   if(old===undefined)delete state.homeFurnitureRecords;else state.homeFurnitureRecords=old;
   alert("The change could not be saved on this device. Nothing was recorded.");
   return;
  }
  if(typeof render==="function")render();
  if(returnSection)window.dollyOpenSection(key,returnSection);else window.dollyOpenObject(key);
 }

 function modelObject(key,body){
  const name=ITEMS[key].label;
  const extraHitArea=key==="closet"?'<rect x="514" y="181" width="80" height="140" fill="transparent" pointer-events="all" aria-hidden="true"/>':"";
  return '<g class="dolly-scene-object dolly-svg-'+key+'" role="button" tabindex="0" aria-label="Open Dolly’s '+html(name)+' details"'+
    ' onclick="dollyOpenObject(&#39;'+key+'&#39;)"'+
    ' onkeydown="if(event.key===&#39;Enter&#39;||event.key===&#39; &#39;){event.preventDefault();dollyOpenObject(&#39;'+key+'&#39;)}">'+body+extraHitArea+'</g>';
 }
 // Layered vector furniture with visible tops, fronts, shadows and depth.
 // These are visual approximations, not photographs or measured dimensions.
 function bedDrawing(){
  return '<g class="dolly-drawn-bed">'+
   '<ellipse cx="263" cy="368" rx="131" ry="40" fill="#665671" opacity=".17"/>'+
   // Four short white feet and the near-side frame under the mattress.
   '<path d="M133 302L133 336L143 340L143 300Z" fill="#fafafa" stroke="#a49aab" stroke-width="2"/>'+
   '<path d="M276 360L276 399L287 394L287 358Z" fill="#fcfcff" stroke="#9e96a7" stroke-width="2"/>'+
   '<path d="M360 313L360 350L371 344L371 309Z" fill="#f9f9fe" stroke="#aba4b1" stroke-width="2"/>'+
   '<path d="M119 277L215 230L380 317L283 367Z" fill="#f7f5fb" stroke="#afa7b8" stroke-width="3"/>'+
   '<path d="M283 367L380 317L380 337L283 386Z" fill="#e3dfe9" stroke="#aca4b2" stroke-width="2"/>'+
   '<path d="M119 277L283 367L283 386L119 295Z" fill="#fcfbff" stroke="#aaa4b1" stroke-width="2"/>'+
   // Upright white wooden headboard, raised above the mattress.
   '<path d="M115 273L115 218Q122 215 130 215C159 197 197 189 216 180Q224 176 225 189L221 230Z" fill="url(#dollyWhiteFrame)" stroke="#aca4b0" stroke-width="3"/>'+
   '<path d="M128 232Q168 203 208 196L209 226L128 263Z" fill="#fffefe" stroke="#ded7e3" stroke-width="2"/>'+
   '<path d="M113 218L113 288M222 180L222 244" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'+
   '<path d="M113 218L113 288M222 180L222 244" stroke="#aaa0b0" stroke-width="2" fill="none"/>'+
   // Lavender fitted mattress and a folded, patterned comforter.
   '<path d="M123 275L219 231L370 313L277 358Z" fill="url(#dollyLavenderSheet)" stroke="#e8dff1" stroke-width="2"/>'+
   '<path d="M226 242L305 284L211 331L131 287Z" fill="url(#dollyBlanket)" stroke="#c6b1c5" stroke-width="1.5"/>'+
   '<path d="M148 286Q168 277 184 279T219 272M201 310Q224 294 248 301M223 267Q244 272 258 282" fill="none" stroke="#9d7f9e" stroke-width="4" opacity=".56"/>'+
   '<path d="M183 269L206 258L225 268L203 280Z" fill="#c0b5ce" opacity=".63"/>'+
   '<path d="M242 290L260 286L275 301L258 307Z" fill="#8e9ab9" opacity=".68"/>'+
   '<path d="M194 301L211 292L226 300L207 311Z" fill="#d7a7a8" opacity=".76"/>'+
   // A white pillow, rather than inventing an exact pillow count.
   '<path d="M157 272Q153 261 163 258L199 242Q209 238 215 245L234 256Q238 263 229 267L183 288Q171 292 166 283Z" fill="url(#dollyPillow)" stroke="#d5d0d7" stroke-width="2"/>'+
   '<path d="M164 272L223 251" stroke="#ede9ed" stroke-width="2" opacity=".8"/>'+
   '<path d="M270 358Q307 358 338 334Q362 320 377 314L377 333Q342 362 284 386Z" fill="url(#dollyWhiteFrame)" stroke="#a9a1b3" stroke-width="2.5"/>'+
   '<path d="M276 363Q321 352 368 321" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'+
   '</g>';
 }
 function vanityDrawing(){
  return '<g>'+
   '<ellipse cx="475" cy="296" rx="69" ry="21" fill="#715a79" opacity=".12"/>'+
   '<path d="M443 258L498 231L537 248L482 279Z" fill="#fff5fb" stroke="#a48d9e" stroke-width="2.5"/>'+
   '<path d="M443 258L482 279L482 292L443 272Z" fill="#efd2e6" stroke="#b198a9" stroke-width="2"/>'+
   '<path d="M482 279L537 248L537 260L482 292Z" fill="#dbb5cf" stroke="#aa8b9f" stroke-width="2"/>'+
   '<path d="M448 272L448 309M526 265L526 299" stroke="#fff6fe" stroke-width="8" stroke-linecap="round"/>'+
   '<path d="M455 224C455 202 467 185 481 185C498 185 506 198 506 218L505 248L457 257Z" fill="#fff7fd" stroke="#a389a6" stroke-width="3"/>'+
   '<path d="M462 222C462 205 471 194 482 194C495 194 500 204 500 218L499 244L463 252Z" fill="url(#dollyMirror)" stroke="#d6c1d9" stroke-width="2"/>'+
   '<path d="M458 232L497 213" stroke="#fff" opacity=".65" stroke-width="3"/>'+
   '<path d="M474 263L496 252L508 258L486 269Z" fill="#f4d9e8" stroke="#c5a7ba"/>'+
   '<text x="488" y="323" text-anchor="middle" class="dolly-scene-label">Vanity</text>'+
   '</g>';
 }
 function dresserDrawing(){
  return '<g>'+
   '<ellipse cx="511" cy="375" rx="63" ry="18" fill="#75566f" opacity=".14"/>'+
   '<path d="M445 320L503 294L566 320L507 349Z" fill="#f8e9dd" stroke="#927b75" stroke-width="2.5"/>'+
   '<path d="M445 320L507 349L507 384L445 352Z" fill="#d9b9ae" stroke="#977b77" stroke-width="2.5"/>'+
   '<path d="M507 349L566 320L566 359L507 384Z" fill="url(#dollyDresserWood)" stroke="#a1847b" stroke-width="2.5"/>'+
   '<path d="M512 356L560 333M512 369L560 346" stroke="#ab8a81" stroke-width="1.6"/>'+
   '<path d="M526 351L534 347M526 364L534 360" stroke="#fff8ee" stroke-width="2.8" stroke-linecap="round"/>'+
   '<path d="M456 333L497 353M456 343L497 364" stroke="#b89992" stroke-width="1.5"/>'+
   '<text x="513" y="405" text-anchor="middle" class="dolly-scene-label">Dresser</text>'+
   '</g>';
 }
 function dollhouseDrawing(){
  return '<g>'+
   '<ellipse cx="107" cy="318" rx="54" ry="17" fill="#765671" opacity=".14"/>'+
   '<path d="M69 256L102 208L139 240L140 304L71 321Z" fill="#edc3e1" stroke="#b68faa" stroke-width="2.5"/>'+
   '<path d="M102 208L153 230L173 263L139 240Z" fill="#d88cb5" stroke="#ad6c94" stroke-width="2.5"/>'+
   '<path d="M68 257L102 208L139 240L120 257L103 239L83 270Z" fill="#ee9ac1" stroke="#af7398" stroke-width="2.5"/>'+
   '<path d="M81 268L125 246L130 298L84 315Z" fill="#fff8f9" stroke="#bda3b8" stroke-width="2"/>'+
   '<path d="M83 289L126 266" stroke="#cbb6cd" stroke-width="4"/>'+
   '<path d="M93 276L107 270L108 287L93 294Z" fill="#c8e1fc" stroke="#ae9ab2"/>'+
   '<path d="M99 298L115 291L116 308L99 314Z" fill="#d8c1ee" stroke="#a98eae"/>'+
   '<path d="M138 240L173 263L170 309L140 304Z" fill="#d9b4cb" stroke="#b18ca9" stroke-width="2"/>'+
   '<text x="99" y="342" text-anchor="middle" class="dolly-scene-label">Barbie house</text>'+
   '</g>';
 }
 function windowDrawing(){
  return '<g aria-label="Window above vanity">'+
   '<path d="M407 96L532 152L532 222L407 168Z" fill="#fff" stroke="#b8a1bd" stroke-width="5"/>'+
   '<path d="M417 107L521 157L521 210L417 161Z" fill="url(#dollyWindowGlass)" stroke="#fefeff" stroke-width="2"/>'+
   '<path d="M468 132L468 186M417 135L521 180" stroke="#fff" stroke-width="5"/>'+
   '<path d="M408 169L532 225" stroke="#e5d3e7" stroke-width="7"/>'+
   '</g>';
 }

 function bedWindowDrawing(){
  // Bed is beside this window; angle and wall widths are schematic.
  return '<g aria-label="Window beside bed">'+
   '<path d="M51 175L123 140L123 204L51 240Z" fill="#fff" stroke="#b49cbf" stroke-width="5"/>'+
   '<path d="M59 180L115 153L115 201L59 228Z" fill="url(#dollyWindowGlass)" stroke="#fff" stroke-width="2"/>'+
   '<path d="M87 167L87 215M60 206L115 180" stroke="#fff" stroke-width="4"/>'+
   '<path d="M48 240L127 203" stroke="#eee1f1" stroke-width="6"/>'+
   '</g>';
 }
 function marioPosterDrawing(){
  // Poster placement and Mario motif are confirmed; illustration is simplified.
  return '<g aria-label="Mario poster above sleigh bed">'+
   '<path d="M160 129L241 90L241 171L160 208Z" fill="#fff" stroke="#957e9c" stroke-width="3"/>'+
   '<path d="M166 133L235 99L235 164L166 198Z" fill="#85c8ee"/>'+
   '<path d="M176 145L225 121L225 136L176 161Z" fill="#e94f48"/>'+
   '<path d="M180 165L197 155L210 167L222 163L222 176L200 188L177 183Z" fill="#e94f48"/>'+
   '<path d="M187 160L203 153L205 165L192 173Z" fill="#f3bd8b"/>'+
   '<path d="M201 155L215 150L219 157L208 163Z" fill="#4d3a37"/>'+
   '<text x="201" y="116" text-anchor="middle" font-weight="900" font-size="11" fill="#fff">MARIO</text>'+
   '</g>';
 }
 function closetDrawing(){
  return '<g aria-label="Closet behind large Barbie house">'+
   '<path d="M533 190L579 211L579 302L533 281Z" fill="#f7f0fa" stroke="#9e88a5" stroke-width="3"/>'+
   '<path d="M541 198L570 211L570 291L541 278Z" fill="#e5d8e6" stroke="#b6a4bd" stroke-width="2"/>'+
   '<path d="M555 205L555 285" stroke="#fff" stroke-width="2.5"/>'+
   '<circle cx="560" cy="252" r="2.8" fill="#8d7194"/>'+
   '<path d="M531 189L583 212" stroke="#fff" stroke-width="5"/>'+
   '<path d="M528 291Q538 303 545 305" fill="none" stroke="#9a62bb" stroke-width="2" stroke-dasharray="4 5"/>'+
   '</g>';
 }
 function entryDoorDrawing(){
  // The door exists; its precise position and swing were not surveyed.
  return '<g aria-label="Bedroom entry; exact position on the wall is unverified">'+
   '<path d="M280 438L336 457" stroke="#faf8ff" stroke-width="8" stroke-linecap="round"/>'+
   '<path d="M287 431L287 451Q309 464 338 450" stroke="#9e84a9" stroke-width="2" stroke-dasharray="5 4" fill="none"/>'+
   '<text x="310" y="436" text-anchor="middle" class="dolly-scene-small">Entry*</text></g>';
 }
 window.dollyRoomSceneHtml=function(){
  const assets='<defs>'+
   '<linearGradient id="dollyWallLeft" x2="1" y2="1"><stop stop-color="#fbf5fc"/><stop offset="1" stop-color="#ead9ef"/></linearGradient>'+
   '<linearGradient id="dollyWallRight" x2="1" y2=".7"><stop stop-color="#fff7f6"/><stop offset="1" stop-color="#e3cfe0"/></linearGradient>'+
   '<linearGradient id="dollyWoodFloor" x2=".8" y2="1"><stop stop-color="#f2e4db"/><stop offset="1" stop-color="#d7b5ae"/></linearGradient>'+
   '<linearGradient id="dollyWhiteFrame" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".55" stop-color="#f6f3fb"/><stop offset="1" stop-color="#d8d3e0"/></linearGradient>'+
   '<linearGradient id="dollyLavenderSheet" x2=".9" y2="1"><stop stop-color="#f1e6fc"/><stop offset=".48" stop-color="#cfc2ee"/><stop offset="1" stop-color="#b8acd8"/></linearGradient>'+
   '<linearGradient id="dollyBlanket" x2="1" y2=".75"><stop stop-color="#b5c1d7"/><stop offset=".4" stop-color="#d2a7b4"/><stop offset=".75" stop-color="#aaa0c1"/><stop offset="1" stop-color="#e0c4b6"/></linearGradient>'+
   '<linearGradient id="dollyPillow" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e7e4ed"/></linearGradient>'+
   '<linearGradient id="dollyMirror" x2="1" y2=".5"><stop stop-color="#d5e7f2"/><stop offset="1" stop-color="#fdf7ff"/></linearGradient>'+
   '<linearGradient id="dollyDresserWood" x2="1" y2=".8"><stop stop-color="#a9795f"/><stop offset="1" stop-color="#654337"/></linearGradient>'+
   '<linearGradient id="dollyWindowGlass" x2="1" y2="1"><stop stop-color="#c0e4fa"/><stop offset="1" stop-color="#eaf2ff"/></linearGradient>'+
   '</defs>';
  const room='<rect width="620" height="470" rx="18" fill="#e8dbea"/>'+
   '<path d="M26 183L305 50L305 192L26 320Z" fill="url(#dollyWallLeft)" stroke="#c5b4cb" stroke-width="3"/>'+
   '<path d="M305 50L592 180L592 321L305 192Z" fill="url(#dollyWallRight)" stroke="#c5b4cb" stroke-width="3"/>'+
   '<path d="M26 320L305 192L592 321L314 451Z" fill="url(#dollyWoodFloor)" stroke="#af99a9" stroke-width="3"/>'+
   '<path d="M26 332L314 461L592 332L592 321L314 451L26 320Z" fill="#c8a7ae" opacity=".8"/>'+
   '<path d="M64 324L341 205M123 352L398 235M184 381L456 261M248 413L520 292M320 447L587 323" stroke="#b9979f" stroke-width="2" opacity=".22"/>'+
   '<path d="M26 183L305 50L592 180" fill="none" stroke="#fffafa" stroke-width="9" stroke-linejoin="round"/>'+
   marioPosterDrawing()+bedWindowDrawing()+
   // Both windows are known; exact frame sizes are intentionally not to scale.
   '<g transform="translate(-85 -26)">'+windowDrawing()+'</g>';
  const bed='<g transform="translate(96 104) scale(.65)">'+bedDrawing()+'</g>'+
   '<text x="247" y="388" text-anchor="middle" class="dolly-scene-bed-label">White sleigh bed</text>';
  const dresser='<g transform="translate(-349 65) scale(.98 .8)">'+dresserDrawing()+'</g>';
  const vanity='<g transform="translate(-78 -35) scale(.9)">'+vanityDrawing()+'</g>';
  const barbie='<g transform="translate(380 60) scale(.83)">'+dollhouseDrawing()+'</g>';
  return '<section class="dolly-room-card dolly-room-3d" aria-label="Dolly’s current bedroom arrangement">'+
   '<div class="dolly-room-heading"><div><small>DOLLY’S BEDROOM</small><h3>Her rearranged room</h3></div><span>Tap furniture</span></div>'+
   '<div class="dolly-room-scene dollhouse-view"><svg class="dolly-mini-svg" viewBox="0 0 620 470" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Illustrated miniature: white sleigh bed under Mario poster beside a window; vanity under the second window; brown dresser on former Barbie wall; large pink Barbie house by closet with front facing into room; entry door placement illustrative.">'+
   assets+room+
   modelObject("closet",closetDrawing())+
   modelObject("dresser",dresser)+
   modelObject("vanity",vanity)+
   modelObject("dollhouse",barbie)+
   modelObject("bed",bed)+
   entryDoorDrawing()+
   '</svg></div>'+
   '<p class="dolly-room-caveat"><b>Confirmed arrangement:</b> bed under Mario poster beside one window; white vanity under the other; brown dresser where the Barbie house used to be; large pink Barbie house near the closet, facing into the room. Shift the house slightly to access the closet.</p>'+
   '<p class="dolly-room-caveat">Miniature, not measured geometry. Relative relationships are confirmed; wall lengths, precise doorway position (*) and clearances are not.</p>'+
   '<details class="dolly-hallway-details"><summary>Hallway staging (October 16) · 3 playsets</summary>'+
   '<p>Wooden dollhouse · pink-roof dollhouse · cat-ear pretend kitchen. These are not counted as contents of Dolly’s room.</p></details>'+
   '<div class="dolly-room-helper">Tap furniture or closet to open upkeep, drawers, supplies or stored-toy lists. Dolly’s photographed October 15 clean-room baseline remains valid as a reference; visible belongings do not become unfinished tasks.</div>'+
   '</section>';
 };

 window.dollyOpenObject=function(key){
  const item=ITEMS[key];if(!item)return;
  const d=record(key),opts=sections(key),tasks=taskList(key),done=tasks.filter(t=>t.done).length;
  let controls="";
  if(key==="bed"){
   const history=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))):[];
   const recorded=[...new Set([d.lastBeddingChanged,...history].filter(Boolean))].sort().reverse();
   controls='<div class="dolly-detail-stat"><b>Last bedding change</b><span>'+
    html(recorded[0]||"Not recorded")+'</span></div>'+
    '<button class="btn primary" type="button" onclick="dollyEditBeddingDate()">Record bedding change</button>'+
    '<details class="dolly-bedding-history"><summary>Previous bedding changes ('+recorded.length+')</summary>'+
    (recorded.length?recorded.map(date=>'<p>'+html(date)+'</p>').join(""):'<p>No changes recorded yet.</p>')+'</details>';
  }
  const compartments=opts.map(section=>{
   const count=values(key,section).length;
   return '<button class="dolly-compartment" type="button" onclick="dollyOpenSection(&#39;'+key+'&#39;,&#39;'+encoded(section)+'&#39;)">'+
    '<span><b>'+html(section)+'</b><small>'+(count?count+" recorded entries":"Contents not inventoried")+'</small></span><span aria-hidden="true">›</span></button>';
  }).join("");
  const content='<div class="dolly-detail">'+
   '<div class="dolly-detail-known"><strong>'+html(item.description)+'</strong><small>'+html(item.location)+'</small></div>'+
   controls+
   '<div class="dolly-detail-head"><b>'+ (key==="dresser"?"Clickable dresser drawers":"Inventory compartments")+'</b>'+
   '<span>'+opts.length+' listed</span></div>'+
   (compartments||'<p class="dolly-room-caveat">No drawers identified yet. Add them as you check them; the number and contents are not assumed.</p>')+
   (key==="dresser"?'<button class="btn primary" onclick="dollyAddDrawer()">+ Add a drawer</button>':"")+
   (key==="closet"?'<p class="dolly-closet-access">Access note: the Barbie house can slide slightly when Dolly needs to open the closet. Less-used toys and toy-rotation storage can be recorded here as you check them.</p>':"")+
   '<div class="dolly-detail-head"><b>Related tasks</b><span>'+done+' / '+tasks.length+' done</span></div>'+
   (tasks.length?tasks.slice(0,12).map(t=>'<div class="dolly-task-line"><span>'+html(t.title||"Task")+'</span><small>'+(t.done?"✓ Complete":"Not done")+'</small></div>').join(""):'<p class="dolly-room-caveat">No tasks linked to this furniture yet.</p>')+
   '<button class="btn" type="button" onclick="dollyObjectAddTask(&#39;'+key+'&#39;)">+ Add a task</button>'+
   (key==="bed"?'<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;bedding&#39;)">+ Change bedding task</button>'+
   '<button class="btn" type="button" onclick="dollySuggestBedTask(&#39;frame&#39;)">+ Clean bed frame task</button>':"")+
   '<button class="btn" type="button" onclick="houseVisualOpenZone(&#39;Second floor&#39;,&#39;dolly&#39;)">← Dolly’s room</button>'+
   '</div>';
  modal("Dolly’s "+item.label,content,"Close",closeModal);
 };
 window.dollyEditBeddingDate=function(){
  const old=record("bed").lastBeddingChanged||"";
  modal("Dolly’s bedding",'<div class="dolly-detail"><p>Record the date you actually changed her bedding. Leave blank if unknown.</p>'+
    '<label>Last changed<input id="dollyBeddingDate" type="date" value="'+html(old)+'"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;bed&#39;)">← Bed details</button></div>',
    "Save date",async()=>{
      const date=String(document.getElementById("dollyBeddingDate")?.value||"");
      if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert("Choose a valid date.");return}
      if(date&&typeof ymd==="function"&&date>ymd()){alert("A bedding change date cannot be in the future.");return}
      await update("bed",d=>{
       if(date){
        const previous=Array.isArray(d.beddingHistory)?d.beddingHistory.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x))):[];
        d.beddingHistory=[...new Set([d.lastBeddingChanged,...previous,date].filter(Boolean))].sort();
        d.lastBeddingChanged=d.beddingHistory[d.beddingHistory.length-1];
       }else{
        d.lastBeddingChanged="";
       }
      });
    });
 };
 window.dollyOpenSection=function(key,sectionEncoded){
  if(!ITEMS[key])return;
  const section=decodeURIComponent(sectionEncoded);
  if(!sections(key).includes(section))return;
  const lines=values(key,section);
  modal(ITEMS[key].label+" · "+section,
   '<div class="dolly-detail"><p>Enter only items you have checked. One description per line; leave empty if not inventoried.</p>'+
   '<label>Contents<textarea id="dollySectionContents" rows="7" placeholder="Nothing recorded yet">'+html(lines.join("\n"))+'</textarea></label>'+
   '<small>Entries here describe storage contents; they do not automatically create a new confirmed stock count.</small>'+
   '<button class="btn" onclick="dollyOpenObject(&#39;'+key+'&#39;)">← '+html(ITEMS[key].label)+'</button></div>',
   "Save contents",async()=>{
     const raw=String(document.getElementById("dollySectionContents")?.value||"");
     const list=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
     if(list.length>60||list.some(x=>x.length>150)){alert("Keep each description under 150 characters, up to 60 entries.");return}
     await update(key,d=>{d.contents[section]=list;});
   });
 };
 window.dollyAddDrawer=function(){
  modal("Add dresser drawer",'<div class="dolly-detail"><p>Name a real drawer by its position, such as “top left”. The app will not assume how many drawers the dresser has.</p>'+
    '<label>Drawer label<input id="dollyDrawerLabel" maxlength="80" placeholder="e.g. Top left drawer"></label>'+
    '<button class="btn" onclick="dollyOpenObject(&#39;dresser&#39;)">← Dresser</button></div>',
    "Add drawer",async()=>{
     const label=String(document.getElementById("dollyDrawerLabel")?.value||"").trim();
     if(!label||label.length>80){alert("Give the drawer a short label.");return}
     const d=record("dresser");
     if((d.drawers||[]).some(x=>x.toLowerCase()===label.toLowerCase())){alert("That drawer is already listed.");return}
     if((d.drawers||[]).length>=24){alert("This dresser already has 24 recorded drawer slots.");return}
     await update("dresser",next=>{next.drawers.push(label);});
    });
 };
 window.dollyObjectAddTask=function(key){
  if(!ITEMS[key]||typeof openTask!=="function")return;
  openTask("","",false,{floor:FLOOR,zoneId:ZONE,roomName:ROOM,objectKey:key});
 };
 window.dollySuggestBedTask=function(type){
  if(typeof openTask!=="function")return;
  window.dollyObjectAddTask("bed");
  const title=type==="frame"?"Clean Dolly’s bed frame":"Change Dolly’s bedding";
  // This only PREFILLS an editor. It never creates or marks a task complete.
  setTimeout(()=>{
   const input=document.getElementById("task");
   if(input)input.value=title;
  },0);
 };

})();
